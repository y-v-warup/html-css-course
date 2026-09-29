import os, json, base64
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="LabelGuard AI")
ROOT = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(ROOT, "labelguard")), name="static")

class AnalyzeRequest(BaseModel):
    front_image: str
    back_image: Optional[str] = None
    qr_data: Optional[str] = None

def data_url_ok(s):
    return bool(s and s.startswith("data:image/"))

SCHEMA = {
    "name": "label_compliance_extraction",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "product_name": {"type": "string"},
            "net_quantity": {"type": "string"},
            "mrp": {"type": "string"},
            "manufacturer": {"type": "string"},
            "consumer_care": {"type": "string"},
            "country_of_origin": {"type": "string"},
            "batch_lot": {"type": "string"},
            "manufacturing_date": {"type": "string"},
            "expiry_best_before": {"type": "string"},
            "fssai": {"type": "string"},
            "barcode_or_gtin": {"type": "string"},
            "qr_details": {"type": "string"},
            "notes": {"type": "string"}
        },
        "required": ["product_name","net_quantity","mrp","manufacturer","consumer_care",
                     "country_of_origin","batch_lot","manufacturing_date","expiry_best_before",
                     "fssai","barcode_or_gtin","qr_details","notes"],
        "additionalProperties": False
    }
}

def img_part(data_url):
    return {"type":"image_url","image_url":{"url":data_url,"detail":"high"}}

@app.get("/")
def home():
    return FileResponse(os.path.join(ROOT, "labelguard", "index.html"))

@app.get("/health")
def health():
    return {"ok": True, "openai_configured": bool(os.getenv("OPENAI_API_KEY"))}

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(503, "OPENAI_API_KEY is not configured on the server.")
    if not data_url_ok(req.front_image):
        raise HTTPException(400, "Front image is required.")
    client = OpenAI(api_key=key)

    prompt = """You are the extraction engine for a packaged-product label compliance scanner in India.
Read the supplied package images carefully. Extract only information visibly present in the images or supplied QR payload.
Do not invent missing values. If a field is not visible, return an empty string.
MRP is especially important: recognize MRP, M.R.P, Maximum Retail Price, Rs, INR and ₹ forms, including OCR-like spacing.
Read both front and back images. QR data is authoritative only as supplied; do not claim it was verified against a government database.
Return JSON matching the schema exactly. The system checks declarations only; it does not physically measure quantity or establish legal authenticity."""
    content = [{"type":"text","text":prompt}, img_part(req.front_image)]
    if req.back_image and data_url_ok(req.back_image):
        content.append(img_part(req.back_image))
    if req.qr_data:
        content.append({"type":"text","text":"Decoded QR payload from the package:\n"+req.qr_data[:12000]})

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content":content}],
            response_format={"type":"json_schema","json_schema":SCHEMA},
            temperature=0
        )
        data = json.loads(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(502, "OpenAI analysis failed: " + str(e)[:500])

    fields = ["product_name","net_quantity","mrp","manufacturer","consumer_care",
              "country_of_origin","batch_lot","manufacturing_date","expiry_best_before","fssai","barcode_or_gtin"]
    found = sum(bool(data.get(k,"").strip()) for k in fields)
    coverage = round(found/len(fields)*100)
    if coverage >= 85: status = "DECLARATIONS OK"
    elif coverage >= 50: status = "REVIEW REQUIRED"
    else: status = "NON-COMPLIANT"
    data["coverage"] = coverage
    data["status"] = status
    data["found_fields"] = found
    data["checked_fields"] = len(fields)
    return data

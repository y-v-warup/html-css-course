"""Extraction layer: image → structured label information.

Sources, in order of priority:
  1. Decoded QR payload (machine-generated, used first when present)
  2. AI vision extraction (OpenAI, server-side key only)
  3. Local OCR fallback (Tesseract via pytesseract, when available)

Only information that is actually visible in the supplied image(s) or present
in the QR payload is returned. Anything not found comes back as an empty
value — the rule engine then reports it as "Not detected". Nothing is ever
invented to fill a gap.
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from PIL import Image, ImageEnhance, ImageFilter

from rules import CATEGORIES, FLAT_KEYS

MAX_IMAGE_BYTES = 14_000_000

SYSTEM_PROMPT = """\
You are a label-declaration extraction engine for Indian packaged products.
You will receive one or more photographs of a product label.

Strict rules:
- Extract ONLY information that is actually visible in the image(s).
- Never invent, guess or complete a value. If a field is not visible, use null.
- Return ONE JSON object and nothing else.

Required JSON keys:
{
  "product_name": string|null,
  "net_quantity": string|null,          // e.g. "500 g", "1 L"
  "mrp": string|null,                   // e.g. "₹120"
  "manufacturer": string|null,          // manufacturer/packer/importer name + address as printed
  "consumer_care": string|null,         // customer care phone/email/address as printed
  "country_of_origin": string|null,     // e.g. "India"
  "batch_lot": string|null,
  "manufacturing_date": string|null,    // as printed, e.g. "SEP 2025", "12/2025"
  "expiry_best_before": string|null,    // as printed
  "fssai": string|null,                 // 14-digit FSSAI licence number if visible
  "barcode_or_gtin": string|null,       // digits printed with the barcode
  "product_category": "food"|"cosmetic"|"general"|"other",
  "needs_review": string[],             // field keys that were partially legible or ambiguous
  "notes": string[]                     // max 3 short observations about what you could/could not read
}

MRP handling (critical):
- Accept only Maximum Retail Price variants: "MRP", "M.R.P", "M R P", "Maximum Retail Price",
  "₹", "Rs.", "INR" ONLY when clearly presented as the retail price.
- Do NOT use selling price, discounted price, offer price, deal price or MRP excluding taxes
  if a separate inclusive MRP exists.
- Return it with the ₹ symbol, digits only after it, e.g. "₹120".

Return valid JSON only.
"""


# ---------------------------------------------------------------- data url

def decode_data_url(data_url: Optional[str]) -> Optional[Image.Image]:
    if not data_url:
        return None
    try:
        text = data_url.strip()
        if text.startswith("data:") and "," in text:
            text = text.split(",", 1)[1]
        raw = base64.b64decode(text, validate=False)
        if len(raw) > MAX_IMAGE_BYTES:
            return None
        image = Image.open(io.BytesIO(raw))
        image.load()
        return image.convert("RGB")
    except Exception:
        return None


def _prepare_for_vision(image: Image.Image) -> str:
    """Server-side preprocessing: downscale + light sharpen + contrast."""
    try:
        image = image.copy()
        image.thumbnail((1400, 1400))
        image = image.filter(
            ImageFilter.UnsharpMask(radius=1.4, percent=110, threshold=3)
        )
        image = ImageEnhance.Contrast(image).enhance(1.12)
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85)
        payload = base64.b64encode(buffer.getvalue()).decode("ascii")
        return "data:image/jpeg;base64," + payload
    except Exception:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        payload = base64.b64encode(buffer.getvalue()).decode("ascii")
        return "data:image/jpeg;base64," + payload


# ---------------------------------------------------------------- helpers

def normalise_mrp(value: str) -> str:
    value = " ".join(str(value).split())
    if not value:
        return ""
    match = re.search(r"(\d[\d,]*(?:\.\d{1,2})?)", value)
    if not match:
        return value
    return "₹" + match.group(1)


def _empty_fields() -> Dict[str, str]:
    return {key: "" for key in FLAT_KEYS}


# ---------------------------------------------------------------- OpenAI

def _ai_extract(
    images: List[Image.Image],
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return None, (
            "AI analysis service is not configured — continuing with local "
            "extraction where possible."
        )
    try:
        from openai import OpenAI  # imported lazily; server-side only

        client = OpenAI(api_key=key)
        parts: List[Dict[str, Any]] = []
        for index, image in enumerate(images):
            label = "Label image (front):" if index == 0 else "Additional label image (back/side):"
            parts.append({"type": "text", "text": label})
            parts.append(
                {
                    "type": "image_url",
                    "image_url": {"url": _prepare_for_vision(image)},
                }
            )
        parts.append(
            {
                "type": "text",
                "text": "Extract the label declarations from the image(s) above and return the JSON object.",
            }
        )

        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0,
            response_format={"type": "json_object"},
            timeout=75,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": parts},
            ],
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return _normalise_ai(data), None
    except Exception:
        return None, (
            "AI extraction could not be completed — continued with local "
            "extraction where possible."
        )


def _normalise_ai(data: Dict[str, Any]) -> Dict[str, Any]:
    fields = _empty_fields()
    for key in FLAT_KEYS:
        value = data.get(key)
        if value is None:
            value = ""
        fields[key] = " ".join(str(value).split()).strip()

    fields["mrp"] = normalise_mrp(fields["mrp"])

    category = str(data.get("product_category") or "").lower().strip()
    synonyms = {
        "beverage": "food",
        "drink": "food",
        "dairy": "food",
        "snack": "food",
        "edible": "food",
        "packaged food": "food",
        "food products": "food",
        "personal care": "cosmetic",
        "toiletry": "cosmetic",
        "toiletries": "cosmetic",
        "household": "general",
        "non-food": "general",
    }
    category = synonyms.get(category, category)
    if category not in CATEGORIES:
        category = "general"

    review: Dict[str, str] = {}
    needs = data.get("needs_review") or []
    if isinstance(needs, list):
        for item in needs:
            if item in FLAT_KEYS:
                review[item] = (
                    "Detected but flagged as partially legible — verify the "
                    "value against the printed label."
                )

    notes: List[str] = []
    raw_notes = data.get("notes") or []
    if isinstance(raw_notes, list):
        for item in raw_notes[:3]:
            text = " ".join(str(item).split()).strip()
            if text:
                notes.append(text[:220])

    return {"fields": fields, "category": category, "review": review, "notes": notes}


# ---------------------------------------------------------------- OCR fallback

MRP_RE = re.compile(
    r"(?:m\.?\s*r\.?\s*p\.?|maximum\s+retail\s+price)\s*[:\-]?\s*"
    r"(?:₹|rs\.?\s*|inr\s*)?(\d[\d,]*(?:\.\d{1,2})?)",
    re.I,
)
BARE_PRICE_RE = re.compile(r"(?:₹|rs\.?\s*)(\d[\d,]*(?:\.\d{1,2})?)", re.I)
NET_QTY_RE = re.compile(
    r"(\d[\d,]*(?:\.\d+)?\s?(?:kg|g|gm|gms|grms|ml|ltr|litre|liter|pcs|piece|pieces|pack)s?)\b",
    re.I,
)
FSSAI_RE = re.compile(
    r"(?:fssai|food\s+safety|lic(?:ence|ense)?[\s.]*(?:no|number)?\.?)\s*[:\-]?\s*(\d{14})",
    re.I,
)
FSSAI_BARE_RE = re.compile(r"\b(\d{14})\b")
GTIN_RE = re.compile(r"\b(\d{13})\b")
BATCH_RE = re.compile(
    r"(?:batch|lot|bt\.?)\s*(?:no\.?|number)?\s*[:#\-]?\s*"
    r"([A-Za-z0-9][A-Za-z0-9\-/]{2,24})",
    re.I,
)
MONTHS = (
    r"jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec"
)
MFG_RE = re.compile(
    r"(?:mfg\.?|manufactur\w+|packed|date\s+of\s+packing|pkt\.?)"
    r"\s*(?:on|date)?\s*[:\-]?\s*"
    r"(\d{1,2}\s?(?:%s)[a-z]*[\s/\-]*\d{2,4}"
    r"|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}"
    r"|(?:%s)[a-z]*\s+\d{2,4})" % (MONTHS, MONTHS),
    re.I,
)
EXP_RE = re.compile(r"(?:best\s+before|exp(?:iry|.)?|use\s+by)\s*[:\-]?\s*([^\n]{3,45})", re.I)
COO_RE = re.compile(
    r"(?:made\s+in|country\s+of\s+origin\s*[:\-]?|product\s+of)\s+([A-Za-z][A-Za-z\s.]{1,30})",
    re.I,
)
CARE_RE = re.compile(
    r"(?im)^(.*(?:consumer\s+care|customer\s+care|care\s+centre|care\s+center|"
    r"helpline|contact\s+us|toll[\s-]*free|1800[\s\d-]{6,}).*)$"
)
MANU_RE = re.compile(
    r"(?im)^(.*(?:manufactured\s+by|packed\s+by|marketed\s+by|pvt\.?\s*ltd"
    r"|private\s+limited|llp|industries).*)$"
)


def _ocr_extract(
    images: List[Image.Image],
) -> Tuple[Dict[str, Any], Optional[str]]:
    empty = {
        "fields": _empty_fields(),
        "category": "general",
        "review": {},
        "notes": [],
    }
    try:
        import pytesseract  # optional dependency
    except Exception:
        return empty, (
            "Local OCR (Tesseract) is not available on this server — fields "
            "were not detected from the images."
        )

    try:
        chunks = [pytesseract.image_to_string(image) for image in images]
    except Exception:
        return empty, (
            "Local OCR could not read the captured label — fields were not "
            "detected from the images."
        )

    text = "\n".join(chunks)
    if not text.strip():
        return empty, "No readable text was found in the captured label image(s)."

    fields = _empty_fields()
    review: Dict[str, str] = {}

    mrp_match = MRP_RE.search(text)
    if mrp_match:
        fields["mrp"] = normalise_mrp("₹" + mrp_match.group(1))
    else:
        bare = BARE_PRICE_RE.findall(text)
        if len(bare) == 1:
            fields["mrp"] = "₹" + bare[0]
            review["mrp"] = (
                "MRP inferred from a single price string — verify it is the "
                "printed MRP, not a selling/discount price."
            )

    qty_match = NET_QTY_RE.search(text)
    if qty_match:
        fields["net_quantity"] = " ".join(qty_match.group(1).split()).lower()

    fssai_match = FSSAI_RE.search(text) or FSSAI_BARE_RE.search(text)
    if fssai_match:
        fields["fssai"] = fssai_match.group(1)

    gtin_match = GTIN_RE.search(text)
    if gtin_match:
        fields["barcode_or_gtin"] = gtin_match.group(1)

    batch_match = BATCH_RE.search(text)
    if batch_match:
        fields["batch_lot"] = batch_match.group(1)

    mfg_match = MFG_RE.search(text)
    if mfg_match:
        fields["manufacturing_date"] = " ".join(mfg_match.group(1).split())

    exp_match = EXP_RE.search(text)
    if exp_match:
        fields["expiry_best_before"] = " ".join(exp_match.group(1).split())

    coo_match = COO_RE.search(text)
    if coo_match:
        fields["country_of_origin"] = coo_match.group(1).strip().title()

    care_match = CARE_RE.search(text)
    if care_match:
        fields["consumer_care"] = " ".join(care_match.group(1).split())

    manu_match = MANU_RE.search(text)
    if manu_match:
        fields["manufacturer"] = " ".join(manu_match.group(1).split())

    category = "food" if fields["fssai"] else "general"
    return {
        "fields": fields,
        "category": category,
        "review": review,
        "notes": ["Text read locally with OCR; visual AI extraction was unavailable."],
    }, None


# ---------------------------------------------------------------- QR payload

QR_KEY_MAP = {
    "mrp": "mrp",
    "max_retail_price": "mrp",
    "maximum_retail_price": "mrp",
    "net_quantity": "net_quantity",
    "quantity": "net_quantity",
    "qty": "net_quantity",
    "weight": "net_quantity",
    "product": "product_name",
    "product_name": "product_name",
    "item": "product_name",
    "manufacturer": "manufacturer",
    "mfr": "manufacturer",
    "packer": "manufacturer",
    "importer": "manufacturer",
    "consumer_care": "consumer_care",
    "customer_care": "consumer_care",
    "care": "consumer_care",
    "coo": "country_of_origin",
    "country": "country_of_origin",
    "country_of_origin": "country_of_origin",
    "origin": "country_of_origin",
    "batch": "batch_lot",
    "lot": "batch_lot",
    "batch_no": "batch_lot",
    "batch_lot": "batch_lot",
    "mfg": "manufacturing_date",
    "mfd": "manufacturing_date",
    "pkd": "manufacturing_date",
    "packed": "manufacturing_date",
    "manufacturing_date": "manufacturing_date",
    "exp": "expiry_best_before",
    "expiry": "expiry_best_before",
    "best_before": "expiry_best_before",
    "fssai": "fssai",
    "licence": "fssai",
    "license": "fssai",
    "gtin": "barcode_or_gtin",
    "ean": "barcode_or_gtin",
    "barcode": "barcode_or_gtin",
}


def parse_qr(payload: Optional[str]) -> Dict[str, str]:
    """Best-effort decode of a QR payload into label fields (information only)."""
    out: Dict[str, str] = {}
    text = (payload or "").strip()
    if not text:
        return out

    # 1) JSON payload
    if text.startswith("{") and text.endswith("}"):
        try:
            obj = json.loads(text)
            if isinstance(obj, dict):
                for src, dst in QR_KEY_MAP.items():
                    if src in obj and obj[src] and dst not in out:
                        out[dst] = " ".join(str(obj[src]).split())
        except Exception:
            pass

    # 2) URL query parameters
    if "://" in text or text.startswith("www."):
        try:
            candidate = text if "://" in text else "https://" + text
            query = parse_qs(urlparse(candidate).query)
            flat = {k.lower(): v[0] for k, v in query.items()}
            for src, dst in QR_KEY_MAP.items():
                if src in flat and flat[src] and dst not in out:
                    out[dst] = " ".join(str(flat[src]).split())
        except Exception:
            pass

    # 3) High-signal patterns anywhere in the payload
    mrp_match = MRP_RE.search(text) or BARE_PRICE_RE.search(text)
    if mrp_match and "mrp" not in out:
        out["mrp"] = normalise_mrp("₹" + mrp_match.group(1))
    fssai_match = FSSAI_RE.search(text) or FSSAI_BARE_RE.search(text)
    if fssai_match and not out.get("fssai"):
        out["fssai"] = fssai_match.group(1)
    gtin_match = GTIN_RE.search(text)
    if gtin_match and not out.get("barcode_or_gtin"):
        out["barcode_or_gtin"] = gtin_match.group(1)
    batch_match = BATCH_RE.search(text)
    if batch_match and not out.get("batch_lot"):
        out["batch_lot"] = batch_match.group(1)
    mfg_match = MFG_RE.search(text)
    if mfg_match and not out.get("manufacturing_date"):
        out["manufacturing_date"] = " ".join(mfg_match.group(1).split())
    exp_match = EXP_RE.search(text)
    if exp_match and not out.get("expiry_best_before"):
        out["expiry_best_before"] = " ".join(exp_match.group(1).split())
    coo_match = COO_RE.search(text)
    if coo_match and not out.get("country_of_origin"):
        out["country_of_origin"] = coo_match.group(1).strip().title()

    if out.get("mrp"):
        out["mrp"] = normalise_mrp(out["mrp"])
    return {k: v for k, v in out.items() if v}


# ---------------------------------------------------------------- pipeline

def analyze_extraction(
    front_image: Optional[str] = None,
    back_image: Optional[str] = None,
    qr_data: Optional[str] = None,
    demo_sample: Optional[str] = None,
    category_hint: Optional[str] = None,
) -> Dict[str, Any]:
    """Run the full extraction pipeline and return a structured dict."""
    from demo_samples import get_sample  # local module (runs from backend/)

    if demo_sample:
        sample = get_sample(demo_sample)
        if sample is not None:
            return sample

    notes: List[str] = []
    if demo_sample:
        notes.append("Unknown demo sample id — continuing with supplied data.")

    has_qr = bool(qr_data and qr_data.strip())
    qr_fields = parse_qr(qr_data) if has_qr else {}

    images = [
        image
        for image in (decode_data_url(front_image), decode_data_url(back_image))
        if image is not None
    ]

    ai: Optional[Dict[str, Any]] = None
    if images:
        ai, ai_note = _ai_extract(images)
        if ai_note:
            notes.append(ai_note)
        if ai is None:
            ai, ocr_note = _ocr_extract(images)
            if ocr_note:
                notes.append(ocr_note)
    elif not has_qr:
        notes.append("No label images or QR data were supplied.")

    ai = ai or {
        "fields": _empty_fields(),
        "category": "",
        "review": {},
        "notes": [],
    }

    # QR payload is the first information source; label extraction fills gaps.
    merged = _empty_fields()
    for key in FLAT_KEYS:
        qr_value = str(qr_fields.get(key) or "").strip()
        ai_value = str(ai["fields"].get(key) or "").strip()
        merged[key] = qr_value or ai_value
    if has_qr:
        merged["qr_details"] = qr_data.strip()[:600]

    category = (
        str(ai.get("category") or "")
        or str(category_hint or "")
        or "general"
    ).lower()
    if category not in CATEGORIES:
        category = "general"
    if merged["fssai"] and category == "general":
        category = "food"

    for note in ai.get("notes") or []:
        if note not in notes:
            notes.append(note)

    if has_qr and images:
        source = "QR + label fallback"
    elif has_qr:
        source = "QR"
    elif images:
        source = "Label image"
    else:
        source = "Not analyzed"

    return {
        **merged,
        "product_category": category,
        "_qr_detected": has_qr,
        "_source": source,
        "_mode": "live",
        "_notes": notes,
        "_review": dict(ai.get("review") or {}),
    }

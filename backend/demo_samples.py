"""Clearly-labelled demo datasets.

These are SAMPLE DATA — not the result of scanning a real package. The API
marks every response built from them with ``mode: "demo"`` so the UI can say
so explicitly.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict

_DEMO_NOTE = "Demo dataset — sample data, not a real package scan."

SAMPLES: Dict[str, Dict[str, Any]] = {
    # REVIEW REQUIRED — two applicable declarations not detected
    "biscuits": {
        "product_name": "Golden Harvest Marie Biscuits",
        "net_quantity": "250 g",
        "mrp": "₹50",
        "manufacturer": (
            "Golden Harvest Foods Pvt Ltd, Plot 42, Peenya Industrial Area, "
            "Bengaluru 560058"
        ),
        "consumer_care": "Consumer Care: 1800-425-1100 · care@goldenharvest.in",
        "country_of_origin": "India",
        "batch_lot": "",           # not detected on purpose
        "manufacturing_date": "",  # not detected on purpose
        "expiry_best_before": "Best before 9 months from the date of packaging",
        "fssai": "FSSAI Lic. No. 10012345678901",
        "barcode_or_gtin": "8901234567890",
        "qr_details": "",
        "product_category": "food",
        "_qr_detected": False,
    },
    # DECLARATIONS DETECTED — everything present, QR payload available
    "rice": {
        "product_name": "Aahan Premium Basmati Rice",
        "net_quantity": "5 kg",
        "mrp": "₹720",
        "manufacturer": "Aahan Agro Products Pvt Ltd, Karnal, Haryana 132001",
        "consumer_care": "Helpline 1800-11-2233 · support@aahanfoods.in",
        "country_of_origin": "India",
        "batch_lot": "BAT/KR/24-118",
        "manufacturing_date": "Packed on: 02 Nov 2025",
        "expiry_best_before": "Best before 12 months from packing",
        "fssai": "FSSAI Lic. No. 10098765432109",
        "barcode_or_gtin": "8901234567891",
        "qr_details": (
            "https://trace.aahanfoods.in/verify?lot=BAT%2FKR%2F24-118"
            "&pkd=2025-11-02&mrp=720"
        ),
        "product_category": "food",
        "_qr_detected": True,
    },
    # MISSING DECLARATIONS — core MRP declaration not detected
    "snack": {
        "product_name": "Masala Twist Namkeen",
        "net_quantity": "100 g",
        "mrp": "",  # critical field missing on purpose
        "manufacturer": "Spice Route Foods LLP, Hadapsar, Pune 411013",
        "consumer_care": "Customer care 98765-43210",
        "country_of_origin": "India",
        "batch_lot": "SR-24-907",
        "manufacturing_date": "24/09/2025",
        "expiry_best_before": "Best before 6 months from packaging",
        "fssai": "",  # not detected on purpose
        "barcode_or_gtin": "",
        "qr_details": "",
        "product_category": "food",
        "_qr_detected": False,
    },
}


def get_sample(sample_id: str) -> Dict[str, Any] | None:
    data = SAMPLES.get(sample_id)
    if data is None:
        return None
    result = deepcopy(data)
    result["_notes"] = [_DEMO_NOTE]
    result["_mode"] = "demo"
    result["_source"] = "Demo data"
    result["_review"] = {}
    return result

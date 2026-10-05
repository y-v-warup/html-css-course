"""Deterministic declaration rule engine.

Pipeline:  IMAGE / QR  →  OCR / AI EXTRACTION  →  STRUCTURED JSON  →  RULES
                                                                    ↓
                                                     COMPLIANCE RESULT

The engine never asks an AI model for an opinion. It only checks which
applicable declarations were detected in the structured extraction, using a
fixed category/applicability matrix, and produces:

  * per-field states: detected ✓ / review ⚠ / missing ✕ / not applicable —
  * issues with concrete suggested actions
  * detected declaration coverage (explicitly NOT a legal compliance score)
  * an overall status vocabulary that never claims certification
"""

from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from typing import Any, Dict, List, Set

CATEGORIES = ("food", "cosmetic", "general", "other")

CATEGORY_LABELS = {
    "food": "Food & beverages",
    "cosmetic": "Cosmetic / toiletry",
    "general": "General packaged commodity",
    "other": "Other packaged product",
}

ALL: Set[str] = set(CATEGORIES)
FOOD_ONLY: Set[str] = {"food"}
SHELF_LIFE: Set[str] = {"food", "cosmetic"}

# Order of the flat response keys (spec §25)
FLAT_KEYS = [
    "product_name",
    "net_quantity",
    "mrp",
    "manufacturer",
    "consumer_care",
    "country_of_origin",
    "batch_lot",
    "manufacturing_date",
    "expiry_best_before",
    "fssai",
    "barcode_or_gtin",
    "qr_details",
]

STATUS_DETECTED = "DECLARATIONS DETECTED"
STATUS_REVIEW = "REVIEW REQUIRED"
STATUS_MISSING = "MISSING DECLARATIONS"


@dataclass(frozen=True)
class Rule:
    key: str
    label: str
    group: str
    applies_to: Set[str]
    missing_state: str = "review"  # "review" | "missing"
    informational: bool = False
    message: str = ""
    action: str = ""
    absent_value: str = "— Not applicable / not assessed"
    absent_note: str = "Rule not applied to this product category."


RULES: List[Rule] = [
    Rule(
        "product_name",
        "Product Name",
        "product",
        ALL,
        missing_state="missing",
        message="Product name was not detected.",
        action="Confirm the product name is clearly declared on the principal display panel.",
    ),
    Rule(
        "net_quantity",
        "Net Quantity",
        "product",
        ALL,
        missing_state="missing",
        message="Net quantity declaration was not detected.",
        action="Verify the net quantity declaration (for example “500 g”) is present and legible.",
    ),
    Rule(
        "mrp",
        "MRP",
        "product",
        ALL,
        missing_state="missing",
        message="MRP declaration was not detected.",
        action="Ensure the applicable MRP declaration is clearly visible.",
    ),
    Rule(
        "manufacturer",
        "Manufacturer / Packer / Importer",
        "manufacturer",
        ALL,
        missing_state="missing",
        message="Manufacturer / packer / importer details were not detected.",
        action="Verify that manufacturer / packer / importer details are present where required.",
    ),
    Rule(
        "consumer_care",
        "Consumer Care Details",
        "manufacturer",
        ALL,
        missing_state="review",
        message="Consumer care details were not detected.",
        action="Check that consumer-care contact information is available where applicable.",
    ),
    Rule(
        "country_of_origin",
        "Country of Origin",
        "manufacturer",
        ALL,
        missing_state="review",
        message="Country of origin was not detected.",
        action="Verify the country of origin declaration is present and legible.",
    ),
    Rule(
        "batch_lot",
        "Batch / Lot Number",
        "traceability",
        ALL,
        missing_state="review",
        message="Batch / Lot number was not detected.",
        action="Verify that the applicable batch/lot declaration is present and legible on the package.",
    ),
    Rule(
        "manufacturing_date",
        "Manufacturing / Packing Date",
        "traceability",
        ALL,
        missing_state="review",
        message="Manufacturing date was not detected.",
        action="Check the package for the applicable manufacturing/packing date declaration.",
    ),
    Rule(
        "expiry_best_before",
        "Expiry / Best Before",
        "traceability",
        SHELF_LIFE,
        missing_state="review",
        message="Expiry / Best Before was not detected.",
        action="Verify the expiry / best-before declaration where shelf life applies.",
    ),
    Rule(
        "fssai",
        "FSSAI Number",
        "food",
        FOOD_ONLY,
        missing_state="review",
        message="FSSAI licence number was not detected.",
        action="Confirm the FSSAI licence number is printed for this food product.",
    ),
    Rule(
        "barcode_or_gtin",
        "Barcode / GTIN",
        "identification",
        ALL,
        informational=True,
        absent_value="Not detected (informational)",
        absent_note="Displayed when detected; absence is not automatically classified as a violation.",
    ),
    Rule(
        "qr_details",
        "QR Information",
        "identification",
        ALL,
        informational=True,
        absent_value="No QR data supplied",
        absent_note="QR scanning is optional — absence is not a violation.",
    ),
]

BASE_SUGGESTIONS = [
    "Ensure the applicable MRP declaration is clearly visible.",
    "Verify that manufacturer / packer / importer details are present where required.",
    "Check that consumer-care contact information is available where applicable.",
    "Verify applicable date and batch/lot declarations.",
    "Keep mandatory declarations legible and grouped on the principal display panel.",
]


def _clip(value: str, limit: int = 400) -> str:
    value = " ".join(str(value).split())
    return value if len(value) <= limit else value[: limit - 1] + "…"


def evaluate(extraction: Dict[str, Any]) -> Dict[str, Any]:
    """Run the deterministic checks over a structured extraction dict."""
    category = str(extraction.get("product_category") or "").lower()
    if category not in CATEGORIES:
        category = "general"
    review_flags: Dict[str, str] = dict(extraction.get("_review") or {})
    qr_detected = bool(extraction.get("_qr_detected"))

    fields: List[Dict[str, Any]] = []
    issues: List[Dict[str, Any]] = []
    applicable_total = 0
    applicable_detected = 0

    for rule in RULES:
        raw = str(extraction.get(rule.key) or "").strip()
        detected = bool(raw)
        note: str | None = None

        if rule.informational:
            if detected:
                state = "detected"
                value = _clip(raw)
                note = (
                    "QR payload decoded locally — not verified against any government database."
                    if rule.key == "qr_details"
                    else "Detected identifier (informational)."
                )
            else:
                state = "not_applicable"
                value = rule.absent_value
                note = rule.absent_note
        elif category not in rule.applies_to:
            state = "not_applicable"
            value = rule.absent_value
            note = rule.absent_note
        elif not detected:
            applicable_total += 1
            state = rule.missing_state
            value = "Not detected"
            issues.append(
                {
                    "field": rule.key,
                    "label": rule.label,
                    "message": rule.message,
                    "action": rule.action,
                    "severity": "missing" if rule.missing_state == "missing" else "review",
                }
            )
        else:
            applicable_total += 1
            value = _clip(raw)
            if rule.key in review_flags:
                state = "review"
                note = review_flags[rule.key]
            else:
                state = "detected"
                applicable_detected += 1

        fields.append(
            {
                "key": rule.key,
                "label": rule.label,
                "group": rule.group,
                "state": state,
                "value": value,
                "note": note,
            }
        )

    coverage = (
        round(100.0 * applicable_detected / applicable_total)
        if applicable_total
        else 0
    )

    severities = {issue["severity"] for issue in issues}
    if "missing" in severities:
        status = STATUS_MISSING
    elif issues:
        status = STATUS_REVIEW
    else:
        status = STATUS_DETECTED

    suggestions: List[str] = []
    seen = set()
    for issue in issues:
        action = issue["action"]
        if action not in seen:
            seen.add(action)
            suggestions.append(action)
    if not suggestions:
        suggestions = list(BASE_SUGGESTIONS)
    else:
        for extra in BASE_SUGGESTIONS[-1:]:
            if extra not in seen:
                suggestions.append(extra)
    suggestions = suggestions[:8]

    return {
        "fields": fields,
        "issues": issues,
        "suggestions": suggestions,
        "coverage": coverage,
        "status": status,
        "product_category": category,
        "category_label": CATEGORY_LABELS[category],
        "qr_detected": qr_detected,
    }

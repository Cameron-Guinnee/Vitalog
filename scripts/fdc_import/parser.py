"""parser.py — Parse USDA FoodData Central JSON datasets into food records.

Supported datasets (JSON format, as .zip or .json):
    - Foundation Foods  (FoodData_Central_foundation_food_json_*.zip)
    - SR Legacy         (FoodData_Central_sr_legacy_food_json_*.zip)
    - Branded Foods     (FoodData_Central_branded_food_json_*.zip)

All nutrient values are per 100 g, as FoodData Central publishes them.

Foundation Foods and SR Legacy are small enough to load whole. Branded Foods is
several GB once unzipped, so it is streamed one food at a time.
"""

from __future__ import annotations

import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import IO, Callable, Dict, Iterator, List, Optional, Tuple

import ijson
import orjson

from .nutrients import ENERGY, FALLBACKS, FALLBACK_SOURCE_IDS, LABEL_NUTRIENT_IDS, TARGET_NUTRIENT_IDS

Log = Callable[[str], None]

_DATASET_KEYS = {
    "FoundationFoods": "foundation",
    "SRLegacyFoods": "sr_legacy",
    "BrandedFoods": "branded",
}


@dataclass(frozen=True)
class BrandedOptions:
    """How much of Branded Foods to import.

    slim=True keeps only nutrition-label nutrients, only foods sold in the US,
    and only the newest record for each barcode, to fit a small database.
    """

    slim: bool = False


# ---------------------------------------------------------------------------
# Files
# ---------------------------------------------------------------------------
def _open_json(path: Path) -> IO[bytes]:
    """Open the JSON inside a .zip, or a plain .json file, for reading."""
    if path.suffix.lower() == ".zip":
        zf = zipfile.ZipFile(path)
        names = [n for n in zf.namelist() if n.endswith(".json")]
        if not names:
            raise ValueError(f"No .json file found inside {path.name}")
        return zf.open(names[0])
    return path.open("rb")


def sniff_dataset(path: Path) -> Tuple[str, str]:
    """Return (top-level key, source label) by reading only the start of the file."""
    with _open_json(path) as f:
        head = f.read(4096).decode("utf-8", errors="ignore")
    for key, label in _DATASET_KEYS.items():
        if f'"{key}"' in head:
            return key, label
    raise ValueError(f"{path.name} isn't a Foundation, SR Legacy or Branded Foods JSON file.")


def _load_foods(path: Path, key: str) -> list:
    with _open_json(path) as f:
        return orjson.loads(f.read())[key]


def _stream_foods(path: Path, key: str) -> Iterator[dict]:
    with _open_json(path) as f:
        yield from ijson.items(f, f"{key}.item", use_float=True)


# ---------------------------------------------------------------------------
# Nutrients and servings
# ---------------------------------------------------------------------------
def get_nutrients(food: Optional[dict], keep: frozenset[int] = TARGET_NUTRIENT_IDS) -> Dict[int, float]:
    """Return {nutrient id: amount per 100 g} for the nutrients in `keep`.

    Values the app reads under one ID but a dataset stores under another, such as
    Atwater energy or NLEA sugars, are moved to the ID the app reads.
    """
    if not food:
        return {}
    found: Dict[int, float] = {}
    for n in food.get("foodNutrients") or []:
        nid = (n.get("nutrient") or {}).get("id")
        amount = n.get("amount")
        if nid is not None and amount is not None:
            found[nid] = float(amount)

    result = {nid: v for nid, v in found.items() if nid in keep and nid not in FALLBACK_SOURCE_IDS}
    for target, sources in FALLBACKS.items():
        if target in keep and target not in result:
            for source in sources:
                if source in found:
                    result[target] = found[source]
                    break
    return result


def best_portion(food: dict) -> Tuple[Optional[str], Optional[float]]:
    """Return (label, grams) for the most useful portion, or (None, None)."""
    portions = food.get("foodPortions") or []
    if not portions:
        return None, None

    def unit_name(p: dict) -> str:
        name = ((p.get("measureUnit") or {}).get("name") or "").strip()
        return "" if name.lower() == "undetermined" else name

    chosen = next((p for p in portions if unit_name(p)), portions[0])
    parts = [str(chosen.get("amount", 1)), unit_name(chosen), (chosen.get("modifier") or "").strip()]
    label = " ".join(p for p in parts if p).strip()
    return label or None, chosen.get("gramWeight")


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------
def extract_foundation_sr(food: Optional[dict], source: str, sr_by_ndb: Dict[int, dict]) -> Optional[dict]:
    """A record for a Foundation or SR Legacy food, or None to skip it."""
    if not food or not (food.get("description") or "").strip():
        return None

    nutrients = get_nutrients(food)

    # Foundation foods sometimes lack nutrients; fill gaps from SR Legacy by NDB number.
    if source == "foundation":
        ndb = food.get("ndbNumber")
        if ndb and ndb in sr_by_ndb:
            for nid, value in get_nutrients(sr_by_ndb[ndb]).items():
                nutrients.setdefault(nid, value)

    if ENERGY not in nutrients:
        return None

    label, grams = best_portion(food)
    category = food.get("foodCategory")
    return {
        "fdc_id": food["fdcId"],
        "name": food["description"].strip(),
        "brand": None,
        "source": source,
        "category": category.get("description") if isinstance(category, dict) else None,
        "is_verified": True,
        "serving_size": grams,
        "serving_unit": label,
        "nutrients": nutrients,
    }


def extract_branded(food: dict, options: BrandedOptions = BrandedOptions()) -> Optional[dict]:
    """A record for a Branded Foods entry, or None to skip it."""
    if options.slim and (food.get("marketCountry") or "United States") != "United States":
        return None

    description = (food.get("description") or "").strip()
    if not description:
        return None

    nutrients = get_nutrients(food, LABEL_NUTRIENT_IDS if options.slim else TARGET_NUTRIENT_IDS)
    if ENERGY not in nutrients:
        return None

    household = (food.get("householdServingFullText") or "").strip()
    serving_size = food.get("servingSize")
    serving_unit = (food.get("servingSizeUnit") or "g").strip()

    if household:
        serving_label: Optional[str] = household
    elif serving_size is not None:
        serving_label = f"{serving_size} {serving_unit}".strip()
    else:
        serving_label = None

    try:
        serving_grams = float(serving_size) if serving_size is not None else None
    except (TypeError, ValueError):
        serving_grams = None
    if serving_unit.lower() not in ("g", "grams", "gram"):
        serving_grams = None

    return {
        "fdc_id": food["fdcId"],
        "name": description,
        "brand": (food.get("brandOwner") or food.get("brandName") or "").strip() or None,
        "source": "branded",
        "category": (food.get("brandedFoodCategory") or "").strip() or None,
        "is_verified": False,
        "serving_size": serving_grams,
        "serving_unit": serving_label,
        "nutrients": nutrients,
    }


def newest_per_barcode(foods: Iterator[dict]) -> set[int]:
    """The fdcIds to keep: for each barcode, the most recently published record.

    FoodData Central adds a new record each time a product's label is resubmitted,
    so one product can appear many times. Foods without a barcode are all kept.
    """
    best: Dict[str, Tuple[str, int]] = {}
    keep: set[int] = set()
    for food in foods:
        fdc_id = food.get("fdcId")
        gtin = (food.get("gtinUpc") or "").strip().lstrip("0")
        if fdc_id is None:
            continue
        if not gtin:
            keep.add(fdc_id)
            continue
        published = food.get("publicationDate") or ""
        # Dates are M/D/YYYY in this dataset; compare them as YYYY-MM-DD.
        key = _sortable_date(published)
        if gtin not in best or (key, fdc_id) > best[gtin]:
            best[gtin] = (key, fdc_id)
    keep.update(fdc_id for _, fdc_id in best.values())
    return keep


def _sortable_date(value: str) -> str:
    parts = value.split("/")
    if len(parts) == 3 and all(p.isdigit() for p in parts):
        month, day, year = parts
        return f"{year}-{int(month):02d}-{int(day):02d}"
    return value


# ---------------------------------------------------------------------------
# Public iterator
# ---------------------------------------------------------------------------
def iter_records(paths: List[Path], branded: Optional[BrandedOptions] = None, log: Log = print) -> Iterator[dict]:
    """Yield food records from the given dataset files.

    Foundation Foods come first and take precedence over the SR Legacy entries
    they replace. Branded Foods files are read only when `branded` is given.
    """
    foundation: list = []
    sr_legacy: list = []
    branded_paths: List[Path] = []

    for path in paths:
        key, source = sniff_dataset(path)
        if source == "branded":
            branded_paths.append(path)
        else:
            log(f"Reading {path.name}…")
            if source == "foundation":
                foundation = _load_foods(path, key)
            else:
                sr_legacy = _load_foods(path, key)

    sr_by_ndb = {f["ndbNumber"]: f for f in sr_legacy if f and f.get("ndbNumber")}

    replaced_ndbs: set = set()
    log(f"Foundation Foods: {len(foundation):,} entries")
    for food in foundation:
        rec = extract_foundation_sr(food, "foundation", sr_by_ndb)
        if rec:
            replaced_ndbs.add(food.get("ndbNumber"))
            yield rec

    skipped = 0
    log(f"SR Legacy: {len(sr_legacy):,} entries")
    for food in sr_legacy:
        if food and food.get("ndbNumber") in replaced_ndbs:
            skipped += 1
            continue
        rec = extract_foundation_sr(food, "sr_legacy", sr_by_ndb)
        if rec:
            yield rec
    if skipped:
        log(f"  Skipped {skipped:,} SR Legacy entries that Foundation Foods replace.")

    if branded is None:
        if branded_paths:
            log("Skipping Branded Foods; pass --branded slim or --branded full to include them.")
        return

    for path in branded_paths:
        key, _ = sniff_dataset(path)
        keep: Optional[set[int]] = None
        if branded.slim:
            log(f"Finding the newest record for each barcode in {path.name} (first pass)…")
            keep = newest_per_barcode(_stream_foods(path, key))
        log(f"Reading Branded Foods from {path.name}…")
        count = 0
        for food in _stream_foods(path, key):
            if keep is not None and food.get("fdcId") not in keep:
                continue
            rec = extract_branded(food, branded)
            if rec:
                count += 1
                yield rec
                if count % 50_000 == 0:
                    log(f"  …{count:,} branded foods so far")
        log(f"  {count:,} branded foods.")

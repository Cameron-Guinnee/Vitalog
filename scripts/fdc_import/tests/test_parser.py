import json
import zipfile

from scripts.fdc_import.nutrients import ENERGY, LABEL_NUTRIENT_IDS, SUGARS
from scripts.fdc_import.parser import (
    BrandedOptions,
    best_portion,
    extract_branded,
    extract_foundation_sr,
    get_nutrients,
    iter_records,
    newest_per_barcode,
    sniff_dataset,
)
from scripts.fdc_import.size import FOOD_ROW_BYTES, VALUE_ROW_BYTES, SizeEstimate


def nutrients(**by_id):
    return [{"nutrient": {"id": int(k[1:])}, "amount": v} for k, v in by_id.items()]


def sr_food(fdc_id=1, ndb=100, **n):
    return {"fdcId": fdc_id, "ndbNumber": ndb, "description": " Apples, raw ", "foodCategory": {"description": "Fruits"}, "foodNutrients": nutrients(**n)}


def branded_food(fdc_id=10, **extra):
    food = {
        "fdcId": fdc_id,
        "description": "CRUNCHY GRANOLA",
        "brandOwner": "Acme Foods",
        "brandedFoodCategory": "Cereal",
        "servingSize": 40,
        "servingSizeUnit": "g",
        "householdServingFullText": "1/2 cup",
        "marketCountry": "United States",
        "foodNutrients": nutrients(n1008=450, n1003=10, n2000=12, n1162=1.5),
    }
    food.update(extra)
    return food


def test_energy_falls_back_to_atwater_factors():
    assert get_nutrients({"foodNutrients": nutrients(n2048=95, n2047=90)})[ENERGY] == 90
    assert get_nutrients({"foodNutrients": nutrients(n1008=80, n2047=90)})[ENERGY] == 80


def test_nlea_sugars_are_stored_where_the_app_reads_them():
    n = get_nutrients({"foodNutrients": nutrients(n1008=50, n2000=12)})
    assert n[SUGARS] == 12
    assert 2000 not in n


def test_missing_amounts_are_ignored():
    assert get_nutrients({"foodNutrients": [{"nutrient": {"id": 1003}}, {"nutrient": {}}, {"amount": 3}]}) == {}


def test_sr_record_keeps_category_and_skips_foods_without_energy():
    rec = extract_foundation_sr(sr_food(n1008=52, n1003=0.3), "sr_legacy", {})
    assert rec["name"] == "Apples, raw"
    assert rec["category"] == "Fruits"
    assert rec["is_verified"] is True
    assert extract_foundation_sr(sr_food(n1003=0.3), "sr_legacy", {}) is None


def test_foundation_fills_gaps_from_sr_legacy():
    sr = sr_food(fdc_id=2, ndb=100, n1008=52, n1162=4.6)
    rec = extract_foundation_sr(sr_food(fdc_id=3, ndb=100, n1003=0.2), "foundation", {100: sr})
    assert rec["nutrients"] == {1003: 0.2, ENERGY: 52, 1162: 4.6}


def test_best_portion_prefers_a_named_unit():
    food = {"foodPortions": [{"amount": 1, "measureUnit": {"name": "undetermined"}, "gramWeight": 5}, {"amount": 1, "measureUnit": {"name": "cup"}, "modifier": "sliced", "gramWeight": 110}]}
    assert best_portion(food) == ("1 cup sliced", 110)
    assert best_portion({}) == (None, None)


def test_branded_full_and_slim():
    full = extract_branded(branded_food())
    assert full["brand"] == "Acme Foods"
    assert full["serving_unit"] == "1/2 cup"
    assert full["serving_size"] == 40
    assert full["is_verified"] is False
    assert 1162 in full["nutrients"]

    slim = extract_branded(branded_food(), BrandedOptions(slim=True))
    assert set(slim["nutrients"]) <= LABEL_NUTRIENT_IDS
    assert slim["nutrients"][SUGARS] == 12


def test_slim_branded_skips_foods_sold_outside_the_us():
    assert extract_branded(branded_food(marketCountry="New Zealand"), BrandedOptions(slim=True)) is None
    assert extract_branded(branded_food(marketCountry="New Zealand")) is not None


def test_branded_serving_grams_only_for_gram_servings():
    assert extract_branded(branded_food(servingSizeUnit="ml"))["serving_size"] is None


def test_newest_record_per_barcode_wins():
    foods = [
        {"fdcId": 1, "gtinUpc": "00012345", "publicationDate": "12/1/2023"},
        {"fdcId": 2, "gtinUpc": "12345", "publicationDate": "2/3/2024"},
        {"fdcId": 3, "gtinUpc": "99", "publicationDate": "1/1/2020"},
        {"fdcId": 4, "gtinUpc": ""},
    ]
    assert newest_per_barcode(iter(foods)) == {2, 3, 4}


def write_zip(path, key, foods):
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("data.json", json.dumps({key: foods}))
    return path


def test_iter_records_end_to_end(tmp_path):
    sr = write_zip(tmp_path / "sr.zip", "SRLegacyFoods", [sr_food(fdc_id=1, ndb=100, n1008=52), sr_food(fdc_id=2, ndb=200, n1008=30)])
    fn = write_zip(tmp_path / "fn.zip", "FoundationFoods", [sr_food(fdc_id=3, ndb=100, n2047=55)])
    br = write_zip(
        tmp_path / "br.zip",
        "BrandedFoods",
        [branded_food(10, gtinUpc="1", publicationDate="1/1/2023"), branded_food(11, gtinUpc="1", publicationDate="1/1/2024")],
    )
    assert sniff_dataset(br) == ("BrandedFoods", "branded")

    without = [r["fdc_id"] for r in iter_records([sr, fn, br], None, log=lambda _: None)]
    assert without == [3, 2]  # Foundation replaces SR food 1; branded skipped

    slim = [r["fdc_id"] for r in iter_records([sr, fn, br], BrandedOptions(slim=True), log=lambda _: None)]
    assert slim == [3, 2, 11]


def test_size_estimate():
    est = SizeEstimate()
    est.add({"source": "branded", "nutrients": {1: 1, 2: 2}})
    assert est.total_bytes == FOOD_ROW_BYTES + 2 * VALUE_ROW_BYTES
    assert "branded" in est.report()

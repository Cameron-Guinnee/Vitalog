"""uploader.py — Upsert food records into Supabase.

Writes the nutrients reference table, then foods (matched on fdc_id) and their
food_nutrient_values (matched on food_id + nutrient_id). The food tables are
read-only to app users, so this needs the service role key, which bypasses
row-level security. Keep that key on your machine; never put it in the web app.
"""

from __future__ import annotations

import os
from typing import Callable, Dict, Iterator, List

from supabase import Client, create_client

from .nutrients import NUTRIENT_MAP

Log = Callable[[str], None]

FOOD_COLUMNS = ("fdc_id", "name", "brand", "source", "category", "is_verified", "serving_size", "serving_unit")


def get_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise EnvironmentError("Set SUPABASE_URL and SUPABASE_SERVICE_KEY (the service role key, not the anon key).")
    return create_client(url, key)


def seed_nutrients(client: Client, log: Log = print) -> None:
    """Upsert the nutrient reference table. Safe to run again."""
    rows = [{"id": nid, "name": m.name, "unit": m.unit, "category": m.category} for nid, m in NUTRIENT_MAP.items()]
    client.table("nutrients").upsert(rows, on_conflict="id").execute()
    log(f"  {len(rows)} nutrients in place.")


def _chunks(items: list, size: int) -> Iterator[list]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def food_row(rec: dict) -> dict:
    return {col: rec[col] for col in FOOD_COLUMNS}


def nutrient_rows(rec: dict, food_id: str) -> List[dict]:
    return [{"food_id": food_id, "nutrient_id": nid, "value": value} for nid, value in rec["nutrients"].items()]


def upsert_foods(records: List[dict], client: Client, batch_size: int = 500) -> tuple[int, int]:
    """Upsert records and their nutrient values. Returns (foods, nutrient values) written."""
    foods = 0
    values = 0
    by_fdc: Dict[int, dict] = {rec["fdc_id"]: rec for rec in records}

    for batch in _chunks(list(by_fdc.values()), batch_size):
        # The upsert returns the stored rows, which carry the ids the values need.
        stored = client.table("foods").upsert([food_row(r) for r in batch], on_conflict="fdc_id").execute().data
        foods += len(stored)
        rows = [row for food in stored for row in nutrient_rows(by_fdc[food["fdc_id"]], food["id"])]
        for value_batch in _chunks(rows, batch_size * 10):
            client.table("food_nutrient_values").upsert(value_batch, on_conflict="food_id,nutrient_id").execute()
            values += len(value_batch)

    return foods, values

from scripts.fdc_import.uploader import upsert_foods


class FakeTable:
    def __init__(self, db, name):
        self.db, self.name = db, name

    def upsert(self, rows, on_conflict):
        self.rows, self.on_conflict = rows, on_conflict
        return self

    def execute(self):
        self.db.calls.append((self.name, self.on_conflict, self.rows))
        data = [{**r, "id": f"uuid-{r['fdc_id']}"} for r in self.rows] if self.name == "foods" else self.rows
        return type("Resp", (), {"data": data})()


class FakeClient:
    def __init__(self):
        self.calls = []

    def table(self, name):
        return FakeTable(self, name)


def rec(fdc_id, **nutrients):
    return {"fdc_id": fdc_id, "name": "Food", "brand": None, "source": "sr_legacy", "category": "Fruits", "is_verified": True, "serving_size": None, "serving_unit": None, "nutrients": nutrients}


def test_upserts_foods_with_category_then_their_values():
    client = FakeClient()
    foods, values = upsert_foods([rec(1, **{"1008": 50}), rec(2, **{"1008": 60, "1003": 1})], client, batch_size=500)
    assert (foods, values) == (2, 3)
    (t1, c1, food_rows), (t2, c2, value_rows) = client.calls
    assert (t1, c1) == ("foods", "fdc_id")
    assert food_rows[0]["category"] == "Fruits" and "nutrients" not in food_rows[0]
    assert (t2, c2) == ("food_nutrient_values", "food_id,nutrient_id")
    assert {r["food_id"] for r in value_rows} == {"uuid-1", "uuid-2"}


def test_duplicate_fdc_ids_in_one_batch_are_sent_once():
    # Postgres rejects an upsert that touches the same row twice.
    client = FakeClient()
    foods, _ = upsert_foods([rec(1, **{"1008": 50}), rec(1, **{"1008": 55})], client)
    assert foods == 1

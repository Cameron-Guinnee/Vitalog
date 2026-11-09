"""size.py — Estimate how much database space an import will take.

The per-row costs were measured in Postgres with Vitalog's schema, counting
each table's indexes (the food search indexes are most of a food row's cost).
They're estimates: names with more varied words make the search indexes larger.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

FOOD_ROW_BYTES = 450  # foods row plus its primary key, fdc_id, created_by and two search indexes
VALUE_ROW_BYTES = 111  # food_nutrient_values row plus its primary key
FREE_PLAN_BYTES = 500 * 1024 * 1024  # Supabase free plan database limit


@dataclass
class SizeEstimate:
    foods: Counter = field(default_factory=Counter)
    values: Counter = field(default_factory=Counter)

    def add(self, rec: dict) -> None:
        self.foods[rec["source"]] += 1
        self.values[rec["source"]] += len(rec["nutrients"])

    def bytes_for(self, source: str) -> int:
        return self.foods[source] * FOOD_ROW_BYTES + self.values[source] * VALUE_ROW_BYTES

    @property
    def total_bytes(self) -> int:
        return sum(self.bytes_for(s) for s in self.foods)

    def report(self) -> str:
        mb = lambda b: f"{b / 1024 / 1024:,.0f} MB"  # noqa: E731
        lines = [f"{'Dataset':<12} {'Foods':>10} {'Values':>12} {'Size':>10}"]
        for source in sorted(self.foods):
            lines.append(f"{source:<12} {self.foods[source]:>10,} {self.values[source]:>12,} {mb(self.bytes_for(source)):>10}")
        total_foods = sum(self.foods.values())
        total_values = sum(self.values.values())
        lines.append(f"{'Total':<12} {total_foods:>10,} {total_values:>12,} {mb(self.total_bytes):>10}")
        lines.append("")
        lines.append(
            f"The food tables would take about {mb(self.total_bytes)} of the free plan's {mb(FREE_PLAN_BYTES)}. "
            "The rest of the database (accounts, diaries, Postgres itself) needs room too; "
            "the README shows how to check what it uses now."
        )
        return "\n".join(lines)

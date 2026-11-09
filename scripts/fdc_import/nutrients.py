"""nutrients.py — Full USDA FDC nutrient ID mapping for Vitalog.

Each entry maps a USDA nutrient ID to its display name, unit, and category.
These IDs are stable across all FDC datasets.
"""

from __future__ import annotations
from typing import Dict, NamedTuple


class NutrientMeta(NamedTuple):
    name: str
    unit: str
    category: str


# Full nutrient map: USDA ID -> (name, unit, category)
NUTRIENT_MAP: Dict[int, NutrientMeta] = {
    # ── Macros ──────────────────────────────────────────────────────────────
    1008: NutrientMeta("Energy",                    "kcal", "macro"),
    1003: NutrientMeta("Protein",                   "g",    "macro"),
    1004: NutrientMeta("Total Fat",                 "g",    "macro"),
    1005: NutrientMeta("Carbohydrates",             "g",    "macro"),
    1079: NutrientMeta("Fiber",                     "g",    "macro"),
    1063: NutrientMeta("Sugars",                    "g",    "macro"),
    1235: NutrientMeta("Added Sugars",              "g",    "macro"),
    1257: NutrientMeta("Trans Fat",                 "g",    "macro"),
    1258: NutrientMeta("Saturated Fat",             "g",    "macro"),
    1292: NutrientMeta("Monounsaturated Fat",       "g",    "macro"),
    1293: NutrientMeta("Polyunsaturated Fat",       "g",    "macro"),
    1018: NutrientMeta("Alcohol",                   "g",    "other"),
    1051: NutrientMeta("Water",                     "g",    "macro"),
    1057: NutrientMeta("Caffeine",                  "mg",   "other"),
    2000: NutrientMeta("Total Sugars",              "g",    "macro"),

    # ── Fatty Acids ──────────────────────────────────────────────────────────
    1278: NutrientMeta("ALA (18:3 n-3)",            "g",    "fatty_acid"),
    1279: NutrientMeta("EPA (20:5 n-3)",            "g",    "fatty_acid"),
    1280: NutrientMeta("DHA (22:6 n-3)",            "g",    "fatty_acid"),
    1316: NutrientMeta("LA (18:2 n-6)",             "g",    "fatty_acid"),
    1321: NutrientMeta("AA (20:4 n-6)",             "g",    "fatty_acid"),
    1253: NutrientMeta("Cholesterol",               "mg",   "fatty_acid"),
    1299: NutrientMeta("Omega-3",                   "g",    "fatty_acid"),
    1300: NutrientMeta("Omega-6",                   "g",    "fatty_acid"),

    # ── Vitamins ─────────────────────────────────────────────────────────────
    1106: NutrientMeta("Vitamin A",                 "mcg",  "vitamin"),
    1107: NutrientMeta("Carotene, beta",            "mcg",  "vitamin"),
    1108: NutrientMeta("Carotene, alpha",           "mcg",  "vitamin"),
    1109: NutrientMeta("Vitamin E",                 "mg",   "vitamin"),
    1110: NutrientMeta("Vitamin D (D2+D3)",         "mcg",  "vitamin"),
    1114: NutrientMeta("Vitamin D3",                "mcg",  "vitamin"),
    1120: NutrientMeta("Retinol",                   "mcg",  "vitamin"),
    1122: NutrientMeta("Lycopene",                  "mcg",  "vitamin"),
    1123: NutrientMeta("Lutein + Zeaxanthin",       "mcg",  "vitamin"),
    1162: NutrientMeta("Vitamin C",                 "mg",   "vitamin"),
    1165: NutrientMeta("Vitamin B1 (Thiamine)",     "mg",   "vitamin"),
    1166: NutrientMeta("Vitamin B2 (Riboflavin)",   "mg",   "vitamin"),
    1167: NutrientMeta("Vitamin B3 (Niacin)",       "mg",   "vitamin"),
    1170: NutrientMeta("Vitamin B5 (Pantothenic)",  "mg",   "vitamin"),
    1175: NutrientMeta("Vitamin B6",                "mg",   "vitamin"),
    1176: NutrientMeta("Biotin",                    "mcg",  "vitamin"),
    1177: NutrientMeta("Folate (Total)",            "mcg",  "vitamin"),
    1178: NutrientMeta("Vitamin B12",               "mcg",  "vitamin"),
    1180: NutrientMeta("Choline",                   "mg",   "vitamin"),
    1183: NutrientMeta("Vitamin K1",                "mcg",  "vitamin"),
    1184: NutrientMeta("Vitamin K2",                "mcg",  "vitamin"),
    1185: NutrientMeta("Folate (Food)",             "mcg",  "vitamin"),
    1186: NutrientMeta("Folic Acid",                "mcg",  "vitamin"),
    1187: NutrientMeta("Folate (DFE)",              "mcg",  "vitamin"),

    # ── Minerals ─────────────────────────────────────────────────────────────
    1087: NutrientMeta("Calcium",                   "mg",   "mineral"),
    1088: NutrientMeta("Iron",                      "mg",   "mineral"),
    1089: NutrientMeta("Magnesium",                 "mg",   "mineral"),
    1090: NutrientMeta("Phosphorus",                "mg",   "mineral"),
    1091: NutrientMeta("Potassium",                 "mg",   "mineral"),
    1092: NutrientMeta("Sodium",                    "mg",   "mineral"),
    1093: NutrientMeta("Zinc",                      "mg",   "mineral"),
    1094: NutrientMeta("Copper",                    "mg",   "mineral"),
    1095: NutrientMeta("Manganese",                 "mg",   "mineral"),
    1096: NutrientMeta("Selenium",                  "mcg",  "mineral"),
    1098: NutrientMeta("Chromium",                  "mcg",  "mineral"),
    1100: NutrientMeta("Molybdenum",                "mcg",  "mineral"),
    1101: NutrientMeta("Chlorine",                  "mg",   "mineral"),
    1102: NutrientMeta("Iodine",                    "mcg",  "mineral"),
    1103: NutrientMeta("Fluoride",                  "mcg",  "mineral"),

    # ── Amino Acids ──────────────────────────────────────────────────────────
    1210: NutrientMeta("Tryptophan",                "g",    "amino_acid"),
    1211: NutrientMeta("Threonine",                 "g",    "amino_acid"),
    1212: NutrientMeta("Isoleucine",                "g",    "amino_acid"),
    1213: NutrientMeta("Leucine",                   "g",    "amino_acid"),
    1214: NutrientMeta("Lysine",                    "g",    "amino_acid"),
    1215: NutrientMeta("Methionine",                "g",    "amino_acid"),
    1216: NutrientMeta("Cystine",                   "g",    "amino_acid"),
    1217: NutrientMeta("Phenylalanine",             "g",    "amino_acid"),
    1218: NutrientMeta("Tyrosine",                  "g",    "amino_acid"),
    1219: NutrientMeta("Valine",                    "g",    "amino_acid"),
    1220: NutrientMeta("Arginine",                  "g",    "amino_acid"),
    1221: NutrientMeta("Histidine",                 "g",    "amino_acid"),
    1222: NutrientMeta("Alanine",                   "g",    "amino_acid"),
    1223: NutrientMeta("Aspartic Acid",             "g",    "amino_acid"),
    1224: NutrientMeta("Glutamic Acid",             "g",    "amino_acid"),
    1225: NutrientMeta("Glycine",                   "g",    "amino_acid"),
    1226: NutrientMeta("Proline",                   "g",    "amino_acid"),
    1227: NutrientMeta("Serine",                    "g",    "amino_acid"),
    1228: NutrientMeta("Hydroxyproline",            "g",    "amino_acid"),
}

# Set of all nutrient IDs we track
TARGET_NUTRIENT_IDS: frozenset[int] = frozenset(NUTRIENT_MAP.keys())

ENERGY = 1008
SUGARS = 1063

# Stored under another ID than the app reads, depending on the dataset:
# - Foundation Foods often give energy only as Atwater factors, not as 1008.
# - SR Legacy and Branded Foods give sugars as 2000 ("including NLEA"), not 1063.
# Each target takes the first of its sources that a food has.
FALLBACKS: Dict[int, tuple[int, ...]] = {
    ENERGY: (2047, 2048),  # Atwater general factors, then specific factors
    SUGARS: (2000,),
}
FALLBACK_SOURCE_IDS: frozenset[int] = frozenset(i for ids in FALLBACKS.values() for i in ids)

# What a US nutrition label carries. The slim branded import keeps only these,
# since branded foods rarely have anything else and every value costs space.
LABEL_NUTRIENT_IDS: frozenset[int] = frozenset({
    ENERGY, 1003, 1004, 1005,  # energy, protein, fat, carbohydrates
    1079, SUGARS, 1235,        # fiber, sugars, added sugars
    1258, 1257, 1253,          # saturated fat, trans fat, cholesterol
    1092, 1087, 1088, 1091,    # sodium, calcium, iron, potassium
    1110,                      # vitamin D
})

"""fdc_import — loads USDA FoodData Central foods into Vitalog's database.

Modules:
    nutrients   — the USDA nutrient IDs Vitalog stores
    parser      — reads the FDC JSON datasets into food records
    downloader  — downloads the latest FDC releases
    uploader    — upserts foods and nutrient values into Supabase
    size        — estimates how much database space an import takes
    run         — command-line entry point
"""

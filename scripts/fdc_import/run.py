"""run.py — Import USDA FoodData Central foods into Vitalog's Supabase database.

    python -m scripts.fdc_import.run --dry-run                  # count and estimate size only
    python -m scripts.fdc_import.run                            # Foundation Foods and SR Legacy
    python -m scripts.fdc_import.run --branded slim --dry-run   # what slim branded foods would add
    python -m scripts.fdc_import.run --branded slim             # ...and import them

Run it from the repository root. Settings come from scripts/fdc_import/.env
(copy .env.example); see the README section "Food database" for the details.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

from .downloader import download_datasets
from .parser import BrandedOptions, iter_records
from .size import SizeEstimate

HERE = Path(__file__).resolve().parent
FLUSH_EVERY = 1_000


def _log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="python -m scripts.fdc_import.run", description=__doc__.split("\n\n")[0])
    p.add_argument(
        "--branded",
        choices=["none", "slim", "full"],
        default="none",
        help="Branded Foods: none (default), slim (label nutrients, US products, newest record per barcode) or full",
    )
    p.add_argument("--dry-run", action="store_true", help="read the datasets and estimate the database size; write nothing")
    p.add_argument("--skip-download", action="store_true", help="use the files already in the data folder")
    p.add_argument("--force-download", action="store_true", help="download again even if the files are there")
    p.add_argument("--data-dir", type=Path, default=Path(os.environ.get("FDC_DATA_DIR", "data/fdc")), help="where the datasets are kept (default data/fdc)")
    p.add_argument("--batch-size", type=int, default=int(os.environ.get("FDC_BATCH_SIZE", "500")), help="foods per request (default 500)")
    return p.parse_args(argv)


def _dataset_files(args: argparse.Namespace, include_branded: bool) -> List[Path]:
    if args.skip_download:
        paths = sorted(args.data_dir.glob("*.zip")) + sorted(args.data_dir.glob("*.json"))
        if not paths:
            raise SystemExit(f"No dataset files in {args.data_dir}.")
        return paths
    return download_datasets(args.data_dir, include_branded=include_branded, force=args.force_download, log=_log)


def run(argv: Optional[List[str]] = None) -> int:
    load_dotenv(HERE / ".env")
    args = parse_args(argv)
    branded = None if args.branded == "none" else BrandedOptions(slim=args.branded == "slim")
    start = time.time()

    paths = _dataset_files(args, include_branded=branded is not None)
    _log(f"Datasets: {', '.join(p.name for p in paths)}")

    if args.dry_run:
        estimate = SizeEstimate()
        for rec in iter_records(paths, branded, log=_log):
            estimate.add(rec)
        print()
        print(estimate.report())
        return 0

    # Imported here so a dry run doesn't need the Supabase client or keys.
    from .uploader import get_client, seed_nutrients, upsert_foods

    client = get_client()
    _log("Seeding the nutrients table…")
    seed_nutrients(client, log=_log)

    _log("Uploading foods…")
    foods = values = failed = 0
    buffer: list = []

    def flush() -> None:
        nonlocal foods, values, failed
        if not buffer:
            return
        try:
            f, v = upsert_foods(buffer, client, batch_size=args.batch_size)
            foods += f
            values += v
        except Exception as e:  # keep going; the summary reports what failed
            failed += len(buffer)
            _log(f"  A batch of {len(buffer):,} foods failed: {e}")
        buffer.clear()
        _log(f"  {foods:,} foods and {values:,} nutrient values so far")

    for rec in iter_records(paths, branded, log=_log):
        buffer.append(rec)
        if len(buffer) >= FLUSH_EVERY:
            flush()
    flush()

    _log(f"Done in {time.time() - start:.0f}s: {foods:,} foods and {values:,} nutrient values written.")
    if failed:
        _log(f"{failed:,} foods failed to upload. Run the import again to retry them; it only updates what's there.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run())

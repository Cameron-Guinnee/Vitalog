"""downloader.py — Download the latest FoodData Central datasets.

Finds the newest JSON release of each dataset on the FDC download page and
downloads any that aren't already in the data folder. If the page can't be
read, download the files yourself from https://fdc.nal.usda.gov/download-datasets
into the data folder and run the import with --skip-download.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Dict, List

import requests

Log = Callable[[str], None]

FDC_BASE_URL = "https://fdc.nal.usda.gov"
FDC_DOWNLOADS = f"{FDC_BASE_URL}/download-datasets"

DATASET_SLUGS = {
    "foundation": "FoodData_Central_foundation_food_json",
    "sr_legacy": "FoodData_Central_sr_legacy_food_json",
    "branded": "FoodData_Central_branded_food_json",  # several GB once unzipped
}


def latest_urls(html: str, keys: List[str]) -> Dict[str, str]:
    """Pick the newest .zip link for each dataset key from the download page's HTML."""
    urls: Dict[str, str] = {}
    for key in keys:
        slug = re.escape(DATASET_SLUGS[key])
        matches = re.findall(rf'href="([^"]*{slug}[^"]*\.zip)"', html)
        if not matches:
            continue

        def release_date(url: str) -> str:
            m = re.search(r"(\d{4}-\d{2}-\d{2})", url)
            return m.group(1) if m else "0000-00-00"

        newest = max(matches, key=release_date)
        urls[key] = newest if newest.startswith("http") else f"{FDC_BASE_URL}{newest}"
    return urls


def _download(url: str, dest: Path, log: Log) -> None:
    partial = dest.with_suffix(dest.suffix + ".part")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        done = 0
        last_pct = -10
        with partial.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                done += len(chunk)
                pct = int(done / total * 100) if total else 0
                if total and pct >= last_pct + 10:
                    last_pct = pct
                    log(f"  {dest.name}: {pct}%")
    # Only a finished download gets the real name, so a cut-off one is never mistaken for it.
    partial.replace(dest)


def download_datasets(dest_dir: Path, include_branded: bool, force: bool = False, log: Log = print) -> List[Path]:
    """Download the datasets into dest_dir and return the files to import."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    keys = ["foundation", "sr_legacy"] + (["branded"] if include_branded else [])

    log("Checking FoodData Central for the latest releases…")
    resp = requests.get(FDC_DOWNLOADS, timeout=30)
    resp.raise_for_status()
    urls = latest_urls(resp.text, keys)
    missing = [k for k in keys if k not in urls]
    if missing:
        raise RuntimeError(
            f"Couldn't find download links for: {', '.join(missing)}. Download them from {FDC_DOWNLOADS} "
            f"into {dest_dir} and run again with --skip-download."
        )

    paths: List[Path] = []
    for key in keys:
        dest = dest_dir / urls[key].rsplit("/", 1)[-1]
        if dest.exists() and not force:
            log(f"  {dest.name} is already downloaded.")
        else:
            log(f"  Downloading {dest.name}…")
            _download(urls[key], dest, log)
        paths.append(dest)

    (dest_dir / "manifest.txt").write_text(
        f"Last updated: {datetime.now(timezone.utc).isoformat()}\n" + "".join(f"{p.name}\n" for p in paths)
    )
    return paths

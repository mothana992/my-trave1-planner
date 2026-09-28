"""Build compact, city-scoped, searchable Overture place indexes.

Run on a GitHub Actions runner with the official overturemaps CLI installed.
The raw data stays on the runner; only a compact JSON index is published.
"""
import json
import subprocess
import tempfile
from pathlib import Path

AREAS = {
    "istanbul": (28.65, 40.82, 29.52, 41.32),
    "bursa": (28.45, 39.90, 29.45, 40.45),
}
MAX_SIZE = 45_000_000  # GitHub Pages has a 1 GB site limit; keep each index small.


def compact(feature):
    props = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    coords = geometry.get("coordinates") or []
    names = props.get("names") or {}
    name = names.get("primary")
    if not name or geometry.get("type") != "Point" or len(coords) < 2:
        return None
    lat, lon = float(coords[1]), float(coords[0])
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    if props.get("operating_status") in ("permanently_closed", "closed"):
        return None
    addresses = props.get("addresses") or []
    address = addresses[0] if addresses else {}
    parts = [address.get("freeform"), address.get("locality"), address.get("region")]
    text = ", ".join(dict.fromkeys(x for x in parts if isinstance(x, str) and x.strip()))
    taxonomy = props.get("taxonomy") or {}
    alt = []
    for row in names.get("common") or []:
        value = row.get("value") if isinstance(row, dict) else None
        if value and value != name and value not in alt:
            alt.append(value)
        if len(alt) >= 3:
            break
    return [name, text, round(lat, 6), round(lon, 6), taxonomy.get("primary") or props.get("basic_category") or "", props.get("id") or "", alt]


def build(area, bbox):
    west, south, east, north = bbox
    with tempfile.TemporaryDirectory() as temp:
        raw = Path(temp) / "places.geojsonseq"
        subprocess.run([
            "overturemaps", "download", f"--bbox={west},{south},{east},{north}",
            "--type=place", "-f", "geojsonseq", "-o", str(raw),
        ], check=True, timeout=1800)
        output = Path("data") / f"{area}.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        found = set()
        examples = {term: [] for term in ("boac", "mahal antep", "point hotel", "akgün")}
        count = 0
        with raw.open(encoding="utf-8") as source, output.open("w", encoding="utf-8") as destination:
            destination.write('{"source":"Overture Maps 2026-09-23.1","places":[')
            for line in source:
                try:
                    place = compact(json.loads(line.lstrip("\x1e")))
                except (ValueError, TypeError, KeyError):
                    continue
                if place is None:
                    continue
                key = (place[0].casefold(), round(place[2], 4), round(place[3], 4))
                if key in found:
                    continue
                found.add(key)
                for term, matches in examples.items():
                    if term in place[0].casefold() and len(matches) < 5:
                        matches.append(place[:5])
                if count:
                    destination.write(",")
                destination.write(json.dumps(place, ensure_ascii=False, separators=(",", ":")))
                count += 1
            destination.write("]}")
        size = output.stat().st_size
        print(f"{area}: {count} places, {size / 1_000_000:.2f} MB", flush=True)
        if size > MAX_SIZE:
            output.unlink()
            raise RuntimeError(f"{area} index exceeds size limit")
        if count < 1000:
            output.unlink()
            raise RuntimeError(f"{area} has too few places; aborting publication")
        for term, matches in examples.items():
            print(f"{area}: {term}: {matches or 'not indexed'}", flush=True)


if __name__ == "__main__":
    for city, bounds in AREAS.items():
        build(city, bounds)

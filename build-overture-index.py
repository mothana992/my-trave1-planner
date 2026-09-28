"""Build compact, city-scoped, searchable Overture place indexes.

Run on a GitHub Actions runner with the official overturemaps CLI installed.
The raw data stays on the runner; only a compact JSON index is published.
"""
import json
import duckdb
from pathlib import Path

AREAS = {
    "istanbul": (28.65, 40.82, 29.52, 41.32),
    "bursa": (28.45, 39.90, 29.45, 40.45),
}
MAX_SIZE = 45_000_000  # GitHub Pages has a 1 GB site limit; keep each index small.


def compact(props):
    names = props.get("names") or {}
    name = names.get("primary")
    if not name:
        return None
    lat, lon = float(props["lat"]), float(props["lon"])
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
    connection = duckdb.connect()
    connection.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    source = 's3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*'
    query = """SELECT names, addresses, taxonomy, basic_category, id, operating_status,
                      bbox.xmin AS lon, bbox.ymin AS lat
               FROM read_parquet(?)
               WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ?
                 AND names.primary IS NOT NULL"""
    cursor = connection.execute(query, [source, west, east, south, north])
    keys = [col[0] for col in cursor.description]
    output = Path("data") / f"{area}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    found = set()
    examples = {term: [] for term in ("boac", "mahal antep", "point hotel", "akgün")}
    count = 0
    with output.open("w", encoding="utf-8") as destination:
        destination.write('{"source":"Overture Maps 2026-09-23.1","places":[')
        while rows := cursor.fetchmany(1000):
            for row in rows:
                try:
                    place = compact(dict(zip(keys, row)))
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

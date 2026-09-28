"""Build compact, city-scoped, searchable Overture place indexes.

Run on a GitHub Actions runner with the official overturemaps CLI installed.
The raw data stays on the runner; only a compact JSON index is published.
"""
import json
import duckdb
import unicodedata
from pathlib import Path

AREAS = {
    "istanbul": (28.65, 40.82, 29.52, 41.32),
    "bursa": (28.45, 39.90, 29.45, 40.45),
}
MAX_SHARD_SIZE = 12_000_000


def bucket(name):
    folded = name.lower().translate(str.maketrans({"ı": "i", "ğ": "g", "ş": "s", "ç": "c", "ö": "o", "ü": "u"}))
    folded = "".join(c for c in unicodedata.normalize("NFKD", folded) if not unicodedata.combining(c))
    for word in folded.split():
        if word in {"the", "a", "an", "hotel", "otel", "restaurant", "restoran", "فندق", "مطعم"}:
            continue
        first = word[0]
        return first if first in "abcdefghijklmnopqrstuvwxyz" else "other"
    return "other"


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
    return [name, text, round(lat, 6), round(lon, 6), taxonomy.get("primary") or props.get("basic_category") or "", str(props.get("id") or "")[:12], alt]


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
    output = Path("data") / area
    output.mkdir(parents=True, exist_ok=True)
    writers = {}
    counts = {}
    found = set()
    examples = {term: [] for term in ("boac", "mahal antep", "point hotel", "akgün")}
    count = 0
    try:
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
                shard = bucket(place[0])
                if shard not in writers:
                    writers[shard] = (output / f"{shard}.json").open("w", encoding="utf-8")
                    writers[shard].write('{"source":"Overture Maps 2026-09-23.1","places":[')
                    counts[shard] = 0
                destination = writers[shard]
                if counts[shard]:
                    destination.write(",")
                destination.write(json.dumps(place, ensure_ascii=False, separators=(",", ":")))
                counts[shard] += 1
                count += 1
    finally:
        for writer in writers.values():
            writer.write("]}")
            writer.close()
    size = sum(file.stat().st_size for file in output.glob("*.json"))
    print(f"{area}: {count} places, {size / 1_000_000:.2f} MB across {len(writers)} shards", flush=True)
    for term, matches in examples.items():
        print(f"{area}: {term}: {matches or 'not indexed'}", flush=True)
    if any(file.stat().st_size > MAX_SHARD_SIZE for file in output.glob("*.json")):
        raise RuntimeError(f"{area} has a shard exceeding its size limit")
    if count < 1000:
        raise RuntimeError(f"{area} has too few places; aborting publication")


if __name__ == "__main__":
    for city, bounds in AREAS.items():
        build(city, bounds)

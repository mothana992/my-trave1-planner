# Rahlati / رحلتي

Arabic and English trip planner for mobile and desktop. Start typing to select places and store their coordinates, pick a base hotel, assign stops to dates or preview an automatic area-based plan, view numbered stops and open day routes directly in Google Maps, save comments and photos, store bookings, split expenses in JOD, and export/import JSON backups or a KML map.

## Hosting

GitHub Pages publishes the repository root at https://mothana992.github.io/my-trave1-planner/ . The Android APK is a WebView shell pointing to this URL, so it picks up published updates and can cache the app after it is first opened online.

## Place search and Google Maps

As-you-type suggestions use the public Photon demo search service, backed by OpenStreetMap data. Requests are debounced. Arabic and Latin input can be mixed in a query; frequent Arabic spellings of Turkish names and generic hotel/restaurant words are normalized before search. When a city-bounded search has few matches, the app retries across the trip country and tries a simplified spelling, then ranks places near the selected city. The separate **Wider search** button makes a single explicit request to Nominatim for harder names; it is never used as an autocomplete service. This public endpoint is intended for moderate use and has no uptime guarantee. Google Maps directions open directly in Google Maps (or a browser). You can also paste a Google Maps share link; when it contains both a map center and a place pin, the place pin takes precedence. Direct Google Places autocomplete and an embedded Google map require a Google Cloud project with its APIs enabled, billing, and a properly restricted key. The app opens Google Maps externally for places and road routes; it does not embed a map. The public photo suggestions come from Wikimedia Commons search and require you to verify that each suggested file shows your place. Selected Commons photos display their author, license, and source link; they load online. Google Maps photos open at Google Maps and are not imported. Comments in the planner are your own notes, not Google reviews.

The Google Maps export downloads a KML file for regular trips with verified coordinates. The bundled Istanbul plan exports a CSV of all places, including those without coordinates, for **Google My Maps** import using its Location column; verify ambiguous search results. It does not silently write to your saved Google Maps lists, which requires a separate authenticated Google integration. My Maps import is done through a browser. On Android, open the website in Chrome if your WebView does not download files.

## Data

Trip data and compressed uploaded photos are stored on the device. The website and APK have separate browser storage; export and import a backup to transfer a trip. Clearing browser or app data will erase local trips unless backed up. Shared multi-device synchronization requires a backend and account system. Shared snapshots are JSON files; they do not update collaborators automatically. Attachments count toward limited browser storage.

The app does not load Leaflet. Google Maps provides road routes and navigation after you open a day route or place. The daily plan clusters selected places by geographic proximity and orders stops from the hotel. Preview it before applying it; the old day assignments are overwritten for geocoded places, and you can undo the last grouping. You can assign suggested times to a day, keep manually selected times, and mark stops visited. Google Maps links include at most 3 intermediate waypoints per segment for mobile compatibility.

### Confirming a place in Turkey

If a business is missing from OpenStreetMap search, choose **Add manually**, enter its name and address, then verify it in Google Maps before saving. Saved coordinates, when available, are used for directions and the KML export. The hotel has the same **Add manually** option. Check the address and pin before following directions; similar hotel names can refer to different properties. This does not provide a complete business autocomplete directory.

### Turkey place search (Istanbul and Bursa)

As-you-type search uses a compact, city-specific index built from Overture Maps Places release 2026-09-23.1. The index is divided by the first letter of the place name, and the app downloads only the needed letter for a selected trip city. Photon/OpenStreetMap remains a live fallback. Turkish letters and common Arabic city/place spellings are normalized, and suggestions retain exact coordinates for map pins and directions. The independent `Build free Istanbul and Bursa place index` GitHub workflow rebuilds the snapshots; update its release path when Overture publishes a new release. Overture place coverage and exact business naming vary; verify the displayed address and map pin before relying on directions. Data © Overture Maps Foundation; individual features have their source license recorded upstream.

## Istanbul itinerary

Open `?plan=istanbul-preview` on the published site to import the nine-day Istanbul plan. It contains 128 unique places from the shared Wanderlog list (two duplicate entries removed), with scheduled stops, nearby extras and an optional final day. Existing two-day imports receive the remaining days without replacing edits to the first two days. Day routes open in Google Maps in mobile-compatible segments. Place ratings shown for a subset are a dated snapshot from Wanderlog, not a live Google Places feed; other places link to Google Maps for verification. Places without verified coordinates still open by name and area in Google Maps; My Maps will geocode them during CSV import, so check ambiguous names.

## Companion workspace (v41)

The responsive workspace includes a desktop sidebar, mobile navigation, trip overview,
per-day cards, main/extra stop separation, saved-place text/category/date/status search,
quick day moves, daily notes, family packing templates, category spending breakdowns,
a manual exchange-rate calculator, and a print-friendly itinerary (browser Print → PDF).
The settings screen exports all trips in one backup; importing that backup creates copies
and does not replace trips already on the device. There is no automatic cross-device sync.

Day checks flag overlapping visit/transfer times, missing coordinates, and busy days.
Transfers use straight-line distance with a 1.3 multiplier and a mode-dependent speed;
unknown locations use a 20-minute placeholder. These are not live road/transit durations.
Scheduling starts at 10:00 by default, permits rest buffers, preserves existing times when
selected, excludes extras, refuses schedules that exceed midnight, and supports undo.
Nearest-stop ordering starts at the hotel and requires coordinates; review the proposed
order before applying, then review existing reservation times. Venue hours are not verified.

The old destructive one-time reset has been removed. Offline cache URLs match the plan
loader, and visited place-index shards are cached. Browser storage still needs regular
exported backups, especially when storing photos or booking attachments.

Run regression checks with `node --test planner-core.test.cjs app-smoke.test.cjs`.

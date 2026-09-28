# Rahlati / رحلتي

Arabic and English trip planner for mobile and desktop. Start typing to select places and store their coordinates, pick a base hotel, assign stops to dates or preview an automatic area-based plan, view numbered stops on the interactive map, open directions in Google Maps, save comments and photos, store bookings, split expenses in JOD, and export/import JSON backups or a KML map.

## Hosting

GitHub Pages publishes the repository root at https://mothana992.github.io/my-trave1-planner/ . The Android APK is a WebView shell pointing to this URL, so it picks up published updates and can cache the app after it is first opened online.

## Place search and Google Maps

As-you-type suggestions use the public Photon demo search service, backed by OpenStreetMap data. Requests are debounced. The separate **Wider search** button makes a single explicit request to Nominatim for harder names; it is never used as an autocomplete service. This public endpoint is intended for moderate use and has no uptime guarantee. Google Maps directions open directly in Google Maps (or a browser). You can also paste a Google Maps share link. Direct Google Places autocomplete and an embedded Google map require a Google Cloud project with its APIs enabled, billing, and a properly restricted key. The built-in map uses Leaflet and OpenStreetMap tiles. The public photo suggestions come from Wikimedia Commons search and require you to verify that each suggested file shows your place. Selected Commons photos display their author, license, and source link; they load online. Google Maps photos open at Google Maps and are not imported. Comments in the planner are your own notes, not Google reviews.

The Google Maps export downloads a KML file with a folder for each dated day, numbered stops, and a separate hotel folder for **Google My Maps** import. It does not silently write to your saved Google Maps lists, which requires a separate authenticated Google integration. My Maps import is done through a browser. On Android, open the website in Chrome if your WebView does not download files.

## Data

Trip data and compressed uploaded photos are stored on the device. The website and APK have separate browser storage; export and import a backup to transfer a trip. Clearing browser or app data will erase local trips unless backed up. Shared multi-device synchronization requires a backend and account system. Shared snapshots are JSON files; they do not update collaborators automatically. Attachments count toward limited browser storage.

The map uses Leaflet 1.9.4 and OpenStreetMap tiles. The displayed line and distance estimates are straight-line approximations, not live routing or traffic. The daily plan clusters selected places by geographic proximity and orders stops from the hotel. Preview it before applying it; the old day assignments are overwritten for geocoded places, and you can undo the last grouping. You can assign suggested times to a day, keep manually selected times, and mark stops visited. Google Maps links include at most 3 intermediate waypoints per segment for mobile compatibility.

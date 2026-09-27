# Rahlati / رحلتي

Arabic and English trip planner for mobile and desktop. Create trips and place lists, search places by name, assign stops to dates, reorder stops, see an interactive map, estimate straight-line distances, open individual or full-day directions in Google Maps, save your own comments and photos, store bookings with small attachments, split expenses in Jordanian dinars, maintain a checklist and notes, and export/import JSON backups.

## Hosting

GitHub Pages publishes the repository root at https://mothana992.github.io/my-trave1-planner/ . The Android APK is a WebView shell pointing to this URL, so it picks up published updates and can cache the app after it is first opened online.

## Place search and Google Maps

The in-app place search uses OpenStreetMap Nominatim after the user presses Search. The public search endpoint requires an internet connection and has a usage limit. Google Maps links and directions open directly in Google Maps (or a browser). You can also paste a Google Maps share link when adding a place. Direct Google Places autocomplete, reviews, and photos require a Google Cloud project with Places API enabled, billing, a restricted key, and an appropriate integration. This project does not claim to provide those Google services without a key. Comments in the planner are the user's own notes, not Google reviews.

## Data

Trip data and compressed uploaded photos are stored on the device. The website and APK have separate browser storage; export and import a backup to transfer a trip. Clearing browser or app data will erase local trips unless backed up. Shared multi-device synchronization requires a backend and account system. Shared snapshots are JSON files; they do not update collaborators automatically. Attachments count toward limited browser storage.

The map uses Leaflet 1.9.4 and OpenStreetMap tiles. The distance display uses straight-line coordinates and speed assumptions, not live routing or traffic. The day-order suggestion uses a nearest-neighbor calculation and can be undone.

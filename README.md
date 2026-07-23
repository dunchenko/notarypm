https://dunchenko.github.io/notarypm/

Notary Services — Local preview

How to enable Google Maps iframe embed

- Open `Notary PM/config.js` and set your Google Maps Embed API key:

```js
window.GOOGLE_MAPS_API_KEY = 'YOUR_KEY_HERE';
```

- Reload the page. When a key is present, the site will use the Google Maps Embed API iframe for the selected address. Without a key, the site tries to use Leaflet + OpenStreetMap tiles (requires external CDN access). If external scripts are blocked in your preview, a fallback link will open the address in Google Maps.

Notes

- For production, restrict your Google API key in the Google Cloud console (HTTP referrers) and enable the Maps Embed API.
- If you want fully offline Leaflet, copy `leaflet.js` and `leaflet.css` into `Notary PM/assets/leaflet/` and update `index.html` to load those files locally.

Running maps without Google Cloud (Leaflet + OpenStreetMap)

You can run full interactive maps without Google Cloud APIs by using Leaflet and OpenStreetMap tiles. This avoids API keys entirely.

Quick steps:
1. Download the Leaflet distribution files (or copy from node_modules if you have it):
	- `leaflet.js` and `leaflet.css` (and the `images/` folder with marker icons).
2. Place them in `Notary PM/assets/leaflet/` so the paths are:
	- `Notary PM/assets/leaflet/leaflet.js`
	- `Notary PM/assets/leaflet/leaflet.css`
	- `Notary PM/assets/leaflet/images/*` (marker icons)
3. In `Notary PM/config.js` set `window.FORCE_LEAFLET = true;` to prefer Leaflet over Google iframe.
4. Optionally, if you need geocoding (address → coordinates), install or point to a geocoding service:
	- For quick testing we use Nominatim (`nominatim.openstreetmap.org/search`) — fine for development but not for high-traffic production (read Nominatim usage policy).
	- For production, use a commercial geocoding service or host your own.

Notes and limits
- OpenStreetMap tile servers are public; heavy traffic requires using a third-party tile provider or hosting tiles yourself. Consider providers like Maptiler, Carto, or using Mapbox (requires an API key).
- Nominatim usage policy forbids heavy automated use — consider paid geocoding or caching results on your server.
- This approach completely avoids Google Cloud Console and API keys.

How to make Notary Services a satellite of hannadunchenko.com

- Provide shared settings in `Notary PM/config.js`:
	- `window.SHARED_SETTINGS.mainDomain` — primary domain.
	- `analyticsId` — e.g., `G-XXXXXX` or `UA-XXXXX-Y` to load Google Analytics automatically.
	- `gtmId` — Google Tag Manager container ID if used.
- If you want `notarypm.com` pages to be canonical to the main site, add a canonical link in the head (commented in `index.html`). Note: canonicalization can affect SEO; confirm desired behavior before enabling.
- To share visual assets (logo, fonts, CSS), place them in a shared path or copy them into `Notary PM/assets/`.

Security notes

- Do not paste private API keys into public repos. Use environment variables or server-side injection in production.
- Prefer creating a dedicated API key for `notarypm.com` and restrict by HTTP referrer to the domain(s) you serve.

Restricting your Google Maps API key by HTTP referrer (recommended)

1. Open the Google Cloud Console: https://console.cloud.google.com
2. Navigate to `APIs & Services` → `Credentials` and find the API key you want to restrict.
3. Click the key name to edit its settings.
4. Under "Application restrictions" choose `HTTP referrers (web sites)`.
5. Add the following referrer patterns (example):
	- `http://127.0.0.1:3000/*`  — allows local preview on your machine
	- `http://localhost:3000/*`  — optional alternative for local servers
	- `https://notarypm.com/*`   — your production domain (replace with actual)
	- `https://hannadunchenko.com/*` — if you want the main site to also use the key
6. Under "API restrictions" select `Restrict key` and choose only the APIs you need, e.g. `Maps Embed API` (and/or `Maps JavaScript API`).
7. Save the changes. Changes may take a few minutes to propagate.

Notes
- Make sure billing is enabled for the project that owns the key. Without billing, the map may not render.
- Restricting by referrer prevents the key from being used on other domains, improving security.
- For production, prefer server-side usage or environment-based injection rather than committing the key to source control.

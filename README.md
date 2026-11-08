# NASA Space Explorer

**[Explore the live app](https://squirreler.github.io/07-nasa-space-explorer/)**

A responsive, vanilla JavaScript explorer for NASA’s Astronomy Picture of the Day (APOD). Choose a date and discover nine consecutive days of images, videos, and astronomy explanations.

## Features

- Nine real APOD entries on load; changing either date keeps a nine-day window.
- A three-column gallery on desktop, two columns on tablets, and one on phones. Each entry has its image, title, date, and media type.
- Full-resolution images, full explanations, and image credits in an accessible native dialog. Close with the button, Escape, or the backdrop. Use Previous/Next or the left/right arrow keys to navigate.
- Video entries with YouTube embeds and original video links; other providers receive a clear external watch link.
- A visible loading message and placeholders, request timeouts, retry controls, and useful error messages. Failed requests preserve the previous gallery.
- Random “Did You Know?” facts on load, an additional fact button, and smooth image zoom on hover. Reduced-motion preferences are respected.
- NASA-inspired red, blue, black, and white styling with locally hosted Inter, Public Sans, and DM Mono fonts.

## Run locally

No build step or runtime dependencies are needed:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173`. An internet connection is required for live NASA data and gallery media.

All custom application JavaScript is in [`js/script.js`](js/script.js). The provided [`js/dateRange.js`](js/dateRange.js) is unchanged. The app adds nine-day synchronization and uses US Eastern time for the latest APOD publishing date, avoiding a request for tomorrow when UTC has already crossed midnight.

## API and key

NASA migrated APOD to a new feed in September 2026. The app uses the [current official API](https://science.nasa.gov/wp-json/wp/v2/apod-basic), which does **not** require a key:

```text
https://science.nasa.gov/wp-json/wp/v2/apod-basic?date_from=251001&date_to=251009&per_page=9
```

`date_from` and `date_to` use `YYMMDD`. Returned dates use `YYYY-MM-DD`. The app validates every date, sorts newest first, reads images from `hdurl`, converts HTML metadata to safe plain text, and identifies video URLs in migrated entries. Gallery previews request smaller images while modal links retain the full-resolution source.

The original assignment endpoint remains a fallback, with NASA’s valid public `DEMO_KEY` and `thumbs=true`:

```text
https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&start_date=2025-10-01&end_date=2025-10-09&thumbs=true
```

The legacy service has returned generic “NASA Science” records during live testing, so responses are validated before display. NASA has announced its retirement on December 1, 2026. The primary feed allows the app to continue without relying on that service. A private API key is unnecessary and is not committed to this repository.

NASA may temporarily omit an entry or host unavailable media. Incomplete date ranges display an error instead of quietly presenting fewer than nine discoveries. An unavailable image gets a readable fallback while its explanation and source link remain accessible. YouTube embeds depend on the video owner allowing embedding; the original video link is always available.

## Verify

```sh
npm ci
npx playwright install chromium
npm run check
npm test
```

The ten browser tests use controlled API responses and cover loading, request parameters, nine distinct dates, leap-day and archive boundaries, modal content and keyboard focus, video providers, fallback authentication, retries, incomplete results, invalid dates, facts, and mobile layout. They do not consume NASA’s quota. For an existing local Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path.

Live checks also cover NASA’s actual latest nine-day response, image loading, the October 1–9, 2025 range containing “The Rotating Moon,” and desktop/mobile layouts.

## GitHub Pages

Published from the root of `main` in [squirreler/07-nasa-space-explorer](https://github.com/squirreler/07-nasa-space-explorer). `.nojekyll` keeps deployment as a plain static website. Pushes to `main` automatically rebuild Pages.

## Assignment reflections

See [`REFLECTIONS.md`](REFLECTIONS.md) for API and debugging reflections plus a LinkedIn post draft describing this AI-assisted implementation.

## Sources and credits

- [NASA APOD Feed and API User Guide](https://api.nasa.gov/assets/files/apod/APOD-APIs-and-RSS-info.pdf)
- [NASA’s legacy APOD API and migration announcement](https://github.com/nasa/apod-api)
- [NASA brand guidelines](https://www.nasa.gov/nasa-brand-center/brand-guidelines/), including the recommended digital font families
- Hero: [“Cosmic Cliffs” in the Carina Nebula, NIRCam](https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-image/), NASA, ESA, CSA, STScI. The local copy is resized for the web.
- Gallery media and explanations come from NASA APOD. Individual creator credits are shown in the detail view; rights remain with their respective owners.
- Facts link to their NASA Science sources. Font licenses are included in `fonts/`.
- Starter files: [GCA-Classroom/07-nasa-space-explorer](https://github.com/GCA-Classroom/07-nasa-space-explorer).

This is an independent educational student project, not an official NASA website or a NASA-endorsed product.

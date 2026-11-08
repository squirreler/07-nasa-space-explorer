# NASA Space Explorer

[Live app](https://squirreler.github.io/07-nasa-space-explorer/)

Choose a nine-day date range and click **Get Space Images**. Each gallery item shows its image, title, and date. Select it to open a larger image and NASA’s explanation. Close the modal with ×, Escape, or the backdrop. Video entries offer a source link.

The app includes loading and error messages and NASA-inspired blue, red, and Helvetica styling. All custom JavaScript is in `js/script.js`; the provided `js/dateRange.js` is unchanged.

## Run

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. No installation or build is needed.

## API

NASA’s [current APOD API](https://api.nasa.gov/assets/files/apod/APOD-APIs-and-RSS-info.pdf) requires no key and uses `date_from` / `date_to` in `YYMMDD` format. The app reads images from `hdurl` and validates nine consecutive dates. The [legacy endpoint](https://github.com/nasa/apod-api) remains a fallback using the valid public `DEMO_KEY`. NASA has announced its retirement on December 1, 2026.

Missing NASA entries produce an error; unavailable images show a fallback. No private key is required.

## Submission

- [Source repository](https://github.com/squirreler/07-nasa-space-explorer)
- [Reflections and LinkedIn draft](REFLECTIONS.md)
- GitHub Pages publishes the root of `main`.

Styling references [NASA’s brand guidelines](https://www.nasa.gov/nasa-brand-center/brand-guidelines/). Gallery credits appear in the modal. This is an independent educational project, not an official NASA website.

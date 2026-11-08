# NASA Space Explorer

[Live app](https://squirreler.github.io/07-nasa-space-explorer/)

This is my NASA API class project, built with HTML, CSS, and JavaScript.

Choose a date range and click **Get Space Images** to see nine days of pictures. Click a picture to see a larger version, its date, and NASA’s explanation. Close it with × or Escape. Video entries have a link to watch them.

The page includes a loading message, error handling, and NASA-inspired colors. The custom JavaScript is in `js/script.js`.

## Run

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. No installation or build is needed.

## API

The app uses [NASA’s APOD API](https://api.nasa.gov/assets/files/apod/APOD-APIs-and-RSS-info.pdf). The current API does not need a key. The original endpoint is a fallback using NASA’s public `DEMO_KEY`.

## Reflections

[API reflection, debugging reflection, and LinkedIn post draft](REFLECTIONS.md)

Hosted on GitHub Pages from the root of `main`.

Styling references [NASA’s brand guidelines](https://www.nasa.gov/nasa-brand-center/brand-guidelines/). Gallery credits appear in the modal. This is an independent educational project, not an official NASA website.

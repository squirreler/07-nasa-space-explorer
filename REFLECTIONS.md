# Project reflections

These responses describe the work completed in this AI-assisted project. The LinkedIn text is a draft, not a published post.

## Working with APIs

Connecting this app to APOD involved more than putting a URL into `fetch()`. The selected dates must be formatted for the endpoint, the response must be checked, and each entry must be mapped to the gallery. Because both endpoints include the start and end dates, a nine-day window ends eight days after it starts. The app verifies all nine distinct dates before replacing the gallery, rather than assuming that a successful HTTP response contains the expected data.

The API documentation was especially important because NASA changed its APOD service in September 2026. The current feed uses `date_from` and `date_to` in `YYMMDD` format and does not require an API key. It also returns HTML in some text fields and uses `url` for the article rather than the image. The implementation uses `hdurl` for images, extracts readable text safely, and retains the original endpoint with the public `DEMO_KEY` as a fallback. This project demonstrates why understanding the response structure matters as much as making the request.

Real APIs also need a useful loading state and a recovery path. While a request runs, the app displays a loading message and disables duplicate requests. If the connection fails, the request times out, or an entry is missing, it explains the problem and offers a retry. A previously loaded collection remains available. These details turn a basic API exercise into an app someone can actually use.

## Debugging

One significant issue was that the older APOD endpoint returned a successful response with nine entries, but their titles were all “NASA Science.” Checking only the HTTP status or array length would have missed the problem. Comparing the actual JSON with NASA’s current documentation exposed the migration. The solution was to use the current official feed and validate the contents of either endpoint before rendering them.

Another issue involved dates. Late in the evening in the United States, UTC can already be the following day, while NASA has not published that day’s APOD. The app calculates the latest archive date using US Eastern time and keeps all date arithmetic at UTC midnight to avoid daylight-saving offsets. It also handles the beginning of the archive and leap days while preserving the nine-day requirement. The starter date-range file was left unchanged; these adjustments are in `script.js`.

Live checks also revealed migrated image URLs containing `w=0&h=0`. The app removes those invalid size hints and requests smaller gallery previews while preserving full-resolution images for the modal. Automated browser tests check loading, date selection, modal content, keyboard navigation and focus restoration, video entries, retry behavior, invalid and incomplete responses, and mobile layout. Live browser checks then verify that real NASA data and media work, since controlled tests alone cannot reveal upstream data changes.

The main debugging takeaway is to inspect the data and test the interaction where the problem appears. A green network status does not guarantee correct content, and a good-looking desktop page does not establish that keyboard controls or mobile layouts work.

## LinkedIn post draft

Built an AI-assisted Space Explorer using HTML, CSS, JavaScript, and NASA’s Astronomy Picture of the Day archive. 🚀

The app explores nine consecutive days of images and videos. Each discovery opens a detailed view with a larger image, its date, and NASA’s explanation. It also includes random space facts, responsive layouts, loading feedback, and keyboard-accessible controls.

The most interesting challenge was adapting to a real API change: NASA recently migrated APOD to a new endpoint. The project handles the new response format, validates the selected dates, and provides error recovery when data is unavailable. It was a practical example of why API integration includes reading documentation and checking actual responses, not just making a request.

Explore it: https://squirreler.github.io/07-nasa-space-explorer/

Source: https://github.com/squirreler/07-nasa-space-explorer

#WebDevelopment #JavaScript #APIs #NASA #BuildInPublic

# Project reflections

These responses describe this AI-assisted implementation. The LinkedIn text is a draft.

## Working with APIs

The app sends the selected dates to NASA, reads the JSON response, and turns each entry into a gallery item. A nine-day range ends eight days after its starting date because both dates are included. The response is checked for all nine consecutive dates before updating the gallery.

NASA’s APOD API recently changed. Its current endpoint needs no key and uses different date parameters. It also returns HTML in some fields, so the app converts that content to readable text and uses `hdurl` for images. The original endpoint remains a fallback with NASA’s public `DEMO_KEY`. This illustrates why reading documentation and examining the actual response are necessary parts of working with APIs.

Loading and error messages also matter. Visitors should know when a request is running and what to do when it fails. The app restores its controls after either success or failure so they can try again.

## Debugging

The older endpoint returned HTTP 200 but used “NASA Science” as every title. Inspecting the returned objects revealed that the request had succeeded without providing useful gallery data. Comparing the response with NASA’s updated documentation led to using the current feed and validating its dates and titles.

Date handling needed attention too. UTC can already be tomorrow while NASA is still publishing for today in the United States. The app uses Eastern time for the latest APOD date and UTC midnight for date arithmetic. Changing either date preserves nine days, including around leap days and the archive’s beginning. The provided date-range file remains unchanged.

Some migrated image URLs contained invalid zero-width or zero-height parameters. Removing those parameters repaired the affected images. Browser checks covered real NASA responses, gallery updates, modal content and closing, video links, loading, failed requests, and mobile layout. The key takeaway is to verify the actual data and user interaction instead of treating a successful network status as proof that everything works.

## LinkedIn post draft

Built an AI-assisted NASA Space Explorer with HTML, CSS, and JavaScript. 🚀

Choose nine consecutive days from NASA’s Astronomy Picture of the Day archive, browse the gallery, and open any entry to see a larger image and read its explanation. The app includes NASA-inspired styling, loading feedback, error handling, and links for video entries.

An interesting challenge was adapting to NASA’s updated APOD API. Checking the response format and validating the dates mattered just as much as making the request.

Live app: https://squirreler.github.io/07-nasa-space-explorer/

Source: https://github.com/squirreler/07-nasa-space-explorer

#JavaScript #WebDevelopment #APIs

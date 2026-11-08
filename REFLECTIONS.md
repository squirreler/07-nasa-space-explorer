# Project reflections

## Working with APIs

This project uses `fetch()` to send the selected dates to NASA and read the JSON response. Each object becomes a gallery item with an image, title, and date. Clicking an item shows its explanation in a modal. A nine-day range ends eight days after the starting date because both dates count.

NASA’s API has changed, so checking the documentation was important. The current endpoint does not need a key, and some fields contain HTML that needs to be converted to text. The images come from `hdurl`. I used AI to help with the API connection and debugging.

The loading message lets the user know the request is running. If it fails, an error message appears and the button becomes available again so the user can retry.

## Debugging

One problem was that the older endpoint returned a successful response but used “NASA Science” as every title. Looking at the actual response showed that the data was wrong even though the request had worked. Using the current endpoint fixed this. The app also checks that the response includes all nine selected dates.

Dates were another issue. UTC can already be tomorrow before NASA posts the next picture, so the latest date uses Eastern time. Changing either input keeps the range at nine days. Some image URLs also had zero-width or zero-height parameters that needed to be removed.

The gallery, modal, loading message, error handling, and mobile layout were checked in a browser. The main takeaway is to inspect the data and test what the user actually sees instead of only checking for an error in the console.

## LinkedIn post draft

Finished my NASA Space Explorer class project using HTML, CSS, and JavaScript!

It lets you choose nine days from NASA’s Astronomy Picture of the Day archive and open each picture to read more about it. It also handles loading, errors, and video entries.

The biggest challenge was working with NASA’s updated API and making sure the selected dates returned the right data. I used AI for help with the API connection and debugging.

Live app: https://squirreler.github.io/07-nasa-space-explorer/

Source: https://github.com/squirreler/07-nasa-space-explorer

#JavaScript #WebDevelopment #APIs

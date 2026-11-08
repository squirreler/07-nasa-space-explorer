// All app behavior lives here. The starter's dateRange.js stays unchanged.
const startInput = document.getElementById("startDate");
const endInput = document.getElementById("endDate");
const form = document.getElementById("dateForm");
const gallery = document.getElementById("gallery");
const statusMessage = document.getElementById("status");
const errorMessage = document.getElementById("errorMessage");
const fetchButton = document.getElementById("fetchButton");
const latestButton = document.getElementById("latestButton");
const modal = document.getElementById("imageModal");
const modalMedia = document.getElementById("modalMedia");
const DAY = 24 * 60 * 60 * 1000;
const API_KEY = "DEMO_KEY"; // NASA's valid public key, used by the legacy endpoint.
const rangeCache = new Map();
let discoveries = [];
let activeIndex = 0;
let lastFocusedCard = null;
let isLoading = false;

setupDateInputs(startInput, endInput);

// APOD publishes on US Eastern time. UTC can already be tomorrow in the evening.
const archiveToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
startInput.max = archiveToday;
endInput.max = archiveToday;

function addDays(date, days) {
  return new Date(Date.parse(date + "T00:00:00Z") + days * DAY)
    .toISOString()
    .slice(0, 10);
}

function setLatestDates() {
  endInput.value = archiveToday;
  startInput.value = addDays(archiveToday, -8);
}

setLatestDates();

// Keep every trip at nine days, including near the edges of the archive.
function syncDates(changedInput) {
  if (!changedInput.value || !changedInput.validity.valid) return;
  if (changedInput === startInput) {
    const latestStart = addDays(archiveToday, -8);
    if (startInput.value > latestStart) startInput.value = latestStart;
    endInput.value = addDays(startInput.value, 8);
  } else {
    const earliestEnd = addDays(earliestDate, 8);
    if (endInput.value < earliestEnd) endInput.value = earliestEnd;
    startInput.value = addDays(endInput.value, -8);
  }
}

// Stop the starter's change handler from trying to calculate an empty/invalid date.
startInput.addEventListener(
  "change",
  (event) => {
    if (!startInput.value || !startInput.validity.valid)
      event.stopImmediatePropagation();
  },
  true,
);
startInput.addEventListener("change", () => syncDates(startInput));
endInput.addEventListener("change", () => syncDates(endInput));

function formatDate(date, long = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: long ? "long" : "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}

// NASA's new feed contains HTML. Read its text in a detached document; never
// insert API HTML into our page. This also decodes entities such as &amp;.
function plainText(value) {
  const document = new DOMParser().parseFromString(
    String(value || ""),
    "text/html",
  );
  document
    .querySelectorAll("br")
    .forEach((lineBreak) => lineBreak.replaceWith("\n"));
  document
    .querySelectorAll("p")
    .forEach((paragraph) => paragraph.append("\n\n"));
  return (document.body.textContent || "").trim();
}

// Only allow web URLs in images, iframes, and links.
function safeURL(value) {
  if (!value) return "";
  try {
    const url = new URL(value, "https://science.nasa.gov/");
    if (!["https:", "http:"].includes(url.protocol)) return "";
    url.protocol = "https:";
    return url.href;
  } catch {
    return "";
  }
}

function getYouTubeID(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(url.hostname)
    ) {
      return (
        url.searchParams.get("v") ||
        url.pathname.split("/embed/")[1]?.split("/")[0] ||
        ""
      );
    }
  } catch {
    /* A non-YouTube entry still gets a working NASA source link. */
  }
  return "";
}

function imageURL(value, preview = false) {
  const safe = safeURL(value);
  if (!safe) return "";
  const url = new URL(safe);
  if (url.hostname === "assets.science.nasa.gov") {
    // Some migrated images have w=0&h=0. Remove those broken size hints.
    for (const size of ["w", "h"]) {
      if (Number(url.searchParams.get(size)) === 0)
        url.searchParams.delete(size);
    }
    if (preview) {
      url.searchParams.set("w", "900");
      url.searchParams.delete("h");
    }
  }
  return url.href;
}

function normalizeEntry(item) {
  const isVideo = ["video", "iframe"].includes(item.media_type);
  const source =
    safeURL(item.permalink) ||
    "https://apod.nasa.gov/apod/ap" +
      item.date.slice(2).replaceAll("-", "") +
      ".html";
  const image = imageURL(item.hdurl || (isVideo ? "" : item.url));
  let video = isVideo ? safeURL(item.url) : "";
  if (isVideo && item.basic_html) {
    const html = new DOMParser().parseFromString(item.basic_html, "text/html");
    video =
      safeURL(
        html.querySelector("iframe, video, source")?.getAttribute("src"),
      ) || video;
  }
  const youtubeID = getYouTubeID(video);
  // IDs are validated before using them in a different origin's URL.
  const validID = /^[a-zA-Z0-9_-]{11}$/.test(youtubeID) ? youtubeID : "";
  return {
    date: item.date,
    title: plainText(item.title),
    explanation: plainText(item.explanation),
    credit: plainText(item.credit || item.copyright),
    isVideo,
    image,
    thumbnail: isVideo
      ? safeURL(item.thumbnail_url) ||
        (validID ? "https://i.ytimg.com/vi/" + validID + "/hqdefault.jpg" : "")
      : imageURL(image, true),
    youtubeID: validID,
    video,
    source,
  };
}

async function fetchJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      if (response.status === 429)
        throw new Error(
          "NASA is receiving too many requests. Please wait a moment and try again.",
        );
      throw new Error(
        "NASA’s archive returned an error (" +
          response.status +
          "). Please try again.",
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function validateEntries(data, start, end) {
  if (!Array.isArray(data))
    throw new Error("NASA returned an unexpected response. Please try again.");
  const unique = new Map();
  data
    .filter((item) => item.date >= start && item.date <= end)
    .forEach((item) => {
      unique.set(item.date, normalizeEntry(item));
    });
  const entries = [...unique.values()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  // Verify the actual dates, not just the number of records.
  const missing = Array.from({ length: 9 }, (_, index) =>
    addDays(start, index),
  ).filter((date) => !unique.has(date));
  if (missing.length) {
    throw new Error(
      "NASA has not returned all nine days in this window. Try an earlier date range. Missing: " +
        missing.map((date) => formatDate(date)).join(", ") +
        ".",
    );
  }
  if (
    entries.length !== 9 ||
    entries.some(
      (item) =>
        !item.title ||
        item.title === "NASA Science" ||
        (!item.isVideo && !item.image),
    )
  ) {
    throw new Error(
      "NASA’s response is incomplete. Please try another date range.",
    );
  }
  return entries;
}

async function fetchDiscoveries(start, end) {
  const cacheKey = start + "/" + end;
  if (rangeCache.has(cacheKey)) return rangeCache.get(cacheKey);
  // NASA migrated APOD to this key-free feed in September 2026.
  // It uses YYMMDD filters, and defaults to 25 results unless per_page is set.
  const currentURL = new URL(
    "https://science.nasa.gov/wp-json/wp/v2/apod-basic",
  );
  currentURL.search = new URLSearchParams({
    date_from: start.slice(2).replaceAll("-", ""),
    date_to: end.slice(2).replaceAll("-", ""),
    per_page: "9",
  });
  let entries;
  try {
    entries = validateEntries(await fetchJSON(currentURL), start, end);
  } catch (currentError) {
    // Keep support for the original assignment endpoint and its public API key.
    const legacyURL = new URL("https://api.nasa.gov/planetary/apod");
    legacyURL.search = new URLSearchParams({
      api_key: API_KEY,
      start_date: start,
      end_date: end,
      thumbs: "true",
    });
    try {
      entries = validateEntries(await fetchJSON(legacyURL), start, end);
    } catch {
      throw currentError;
    }
  }
  rangeCache.set(cacheKey, entries);
  return entries;
}

function makePlaceholder(video = false) {
  const placeholder = document.createElement("span");
  placeholder.className = video ? "video-placeholder" : "image-fallback";
  const icon = document.createElement("span");
  icon.textContent = video ? "▷" : "◎";
  icon.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = video
    ? "A universe in motion"
    : "Preview unavailable · open for details";
  placeholder.append(icon, label);
  return placeholder;
}

function makeImage(url, title, lazy = true) {
  const image = document.createElement("img");
  image.src = url;
  image.alt = title;
  image.loading = lazy ? "lazy" : "eager";
  image.decoding = "async";
  image.addEventListener("error", () => image.replaceWith(makePlaceholder()), {
    once: true,
  });
  return image;
}

function renderGallery(entries) {
  const fragment = document.createDocumentFragment();
  entries.forEach((item, index) => {
    // A real button makes every card work with Enter, Space, and touch.
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gallery-item";
    card.setAttribute("aria-haspopup", "dialog");
    card.setAttribute(
      "aria-label",
      item.title + ", " + formatDate(item.date) + ". Open details.",
    );
    const media = document.createElement("span");
    media.className = "card-media";
    media.append(
      item.thumbnail
        ? makeImage(item.thumbnail, item.title, index > 2)
        : makePlaceholder(item.isVideo),
    );
    const badge = document.createElement("span");
    badge.className = "card-badge";
    badge.textContent = item.isVideo ? "▷ Video" : "Image";
    const arrow = document.createElement("span");
    arrow.className = "card-open";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    media.append(badge, arrow);
    const metadata = document.createElement("span");
    metadata.className = "card-meta";
    const date = document.createElement("time");
    date.dateTime = item.date;
    date.textContent = formatDate(item.date);
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0") + " / 09";
    metadata.append(date, number);
    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = item.title;
    card.append(media, metadata, title);
    card.addEventListener("click", () => {
      lastFocusedCard = card;
      showDetails(index);
    });
    fragment.append(card);
  });
  gallery.replaceChildren(fragment);
}

function setLoading(loading) {
  isLoading = loading;
  fetchButton.disabled = loading;
  latestButton.disabled = loading;
  startInput.disabled = loading;
  endInput.disabled = loading;
  document.getElementById("retryButton").disabled = loading;
  gallery.setAttribute("aria-busy", String(loading));
  statusMessage.classList.toggle("is-loading", loading);
  fetchButton.firstElementChild.textContent = loading
    ? "Exploring…"
    : "Get Space Images";
}

async function loadGallery() {
  if (isLoading || !form.reportValidity()) return;
  // Recheck on submission in case values were entered without a change event.
  const start = startInput.value;
  const end = endInput.value;
  if (Date.parse(end) - Date.parse(start) !== 8 * DAY) {
    document.getElementById("errorText").textContent =
      "Choose nine consecutive days. Changing either date will adjust the other.";
    errorMessage.hidden = false;
    return;
  }
  errorMessage.hidden = true;
  setLoading(true);
  statusMessage.textContent = "Loading nine days of discoveries from NASA…";
  if (!discoveries.length) {
    gallery.replaceChildren(
      ...Array.from({ length: 9 }, () => {
        const skeleton = document.createElement("div");
        skeleton.className = "skeleton";
        skeleton.setAttribute("aria-hidden", "true");
        return skeleton;
      }),
    );
  }
  try {
    const entries = await fetchDiscoveries(start, end);
    discoveries = entries;
    renderGallery(entries);
    document.getElementById("galleryTitle").textContent =
      end === archiveToday
        ? "The latest discoveries"
        : "Nine days of discovery";
    const videos = entries.filter((item) => item.isVideo).length;
    document.getElementById("resultCount").textContent =
      "9 discoveries · " + formatDate(start) + " — " + formatDate(end);
    statusMessage.textContent =
      "9 discoveries loaded" +
      (videos
        ? ", including " + videos + (videos === 1 ? " video." : " videos.")
        : ".");
    // Keep the completion message available to screen readers, without an extra visual row.
    statusMessage.classList.add("sr-only");
  } catch (error) {
    statusMessage.textContent = "";
    document.getElementById("errorText").textContent =
      error.name === "AbortError"
        ? "NASA is taking longer than expected. Please try again in a moment."
        : error instanceof TypeError
          ? "We couldn’t reach NASA. Check your connection and try again."
          : error.message;
    errorMessage.hidden = false;
    if (!discoveries.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.textContent =
        "The universe is still out there. Try loading the archive again.";
      gallery.replaceChildren(placeholder);
    }
  } finally {
    setLoading(false);
  }
}

function showDetails(index) {
  activeIndex = (index + discoveries.length) % discoveries.length;
  const item = discoveries[activeIndex];
  modalMedia.replaceChildren();
  if (item.isVideo && item.youtubeID) {
    const iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + item.youtubeID;
    iframe.title = item.title;
    iframe.allow = "fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    modalMedia.append(iframe);
  } else if (item.isVideo) {
    const placeholder = makePlaceholder(true);
    const link = document.createElement("a");
    link.href = item.video || item.source;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Watch this video ↗";
    placeholder.append(link);
    modalMedia.append(placeholder);
  } else {
    modalMedia.append(makeImage(item.image, item.title, false));
  }
  document.getElementById("modalIndex").textContent =
    String(activeIndex + 1).padStart(2, "0") + " of 09";
  document.getElementById("modalDate").textContent =
    formatDate(item.date, true) +
    " / " +
    (item.isVideo ? "Video" : "Astronomy Picture of the Day");
  document.getElementById("modalTitle").textContent = item.title;
  document.getElementById("modalExplanation").textContent =
    item.explanation || "Visit the NASA source for more about this discovery.";
  document.getElementById("modalCredit").textContent = item.credit
    ? "Credit: " + item.credit
    : "Source: NASA Astronomy Picture of the Day";
  const original = document.getElementById("originalLink");
  original.href = item.isVideo ? item.video || item.source : item.image;
  original.firstChild.textContent = item.isVideo
    ? "Watch original video "
    : "Open full-resolution image ";
  if (!modal.open) {
    modal.showModal();
    document.body.classList.add("modal-open");
    document.getElementById("closeModal").focus();
  }
  modal.scrollTop = 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  statusMessage.classList.remove("sr-only");
  loadGallery();
});
latestButton.addEventListener("click", () => {
  setLatestDates();
  statusMessage.classList.remove("sr-only");
  loadGallery();
});
document.getElementById("retryButton").addEventListener("click", () => {
  statusMessage.classList.remove("sr-only");
  loadGallery();
});
document
  .getElementById("closeModal")
  .addEventListener("click", () => modal.close());
// Native dialog provides Escape closing, focus trapping, and an inert background.
modal.addEventListener("click", (event) => {
  if (event.target !== modal) return;
  const bounds = modal.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    modal.close();
});
modal.addEventListener("close", () => {
  modalMedia.replaceChildren(); // Stops any playing video.
  document.body.classList.remove("modal-open");
  lastFocusedCard?.focus({ preventScroll: true });
});
document
  .getElementById("previousItem")
  .addEventListener("click", () => showDetails(activeIndex - 1));
document
  .getElementById("nextItem")
  .addEventListener("click", () => showDetails(activeIndex + 1));
modal.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showDetails(activeIndex - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showDetails(activeIndex + 1);
  }
});

// Facts are local, so this bonus feature works even while NASA is unavailable.
const facts = [
  {
    text: "Sunlight takes about eight minutes to reach Earth.",
    source: "https://science.nasa.gov/sun/facts/",
  },
  {
    text: "A day on Venus lasts longer than a year on Venus.",
    source: "https://science.nasa.gov/venus/facts/",
  },
  {
    text: "The Moon moves about 1.5 inches farther from Earth each year.",
    source: "https://science.nasa.gov/moon/facts/",
  },
  {
    text: "Saturn’s average density is lower than water’s.",
    source: "https://science.nasa.gov/saturn/facts/",
  },
  {
    text: "Mars is home to Olympus Mons, the largest volcano in the solar system.",
    source: "https://science.nasa.gov/mars/facts/",
  },
  {
    text: "The Sun contains about 99.8 percent of our solar system’s mass.",
    source: "https://science.nasa.gov/sun/facts/",
  },
];
let factIndex = -1;
function showFact() {
  // Pick a random fact on load, then avoid repeating the current one.
  const offset =
    factIndex < 0
      ? Math.floor(Math.random() * facts.length)
      : 1 + Math.floor(Math.random() * (facts.length - 1));
  factIndex = factIndex < 0 ? offset : (factIndex + offset) % facts.length;
  document.getElementById("spaceFact").textContent = facts[factIndex].text;
  document.getElementById("factSource").href = facts[factIndex].source;
}
document.getElementById("factButton").addEventListener("click", showFact);
showFact();
loadGallery();

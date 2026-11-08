const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const form = document.getElementById('dateForm');
const gallery = document.getElementById('gallery');
const statusMessage = document.getElementById('status');
const modal = document.getElementById('imageModal');
const modalMedia = document.getElementById('modalMedia');
const API_KEY = 'DEMO_KEY';

setupDateInputs(startInput, endInput);

const latestDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

function addDays(date, days) {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}

startInput.max = endInput.max = latestDate;
endInput.value = latestDate;
startInput.value = addDays(latestDate, -8);

function syncDates(input) {
  if (!input.value || !input.validity.valid) return;
  if (input === startInput) {
    if (startInput.value > addDays(latestDate, -8)) startInput.value = addDays(latestDate, -8);
    endInput.value = addDays(startInput.value, 8);
  } else {
    if (endInput.value < addDays(earliestDate, 8)) endInput.value = addDays(earliestDate, 8);
    startInput.value = addDays(endInput.value, -8);
  }
}

startInput.addEventListener('change', event => {
  if (!startInput.value || !startInput.validity.valid) event.stopImmediatePropagation();
}, true);
startInput.addEventListener('change', () => syncDates(startInput));
endInput.addEventListener('change', () => syncDates(endInput));

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(date + 'T00:00:00Z'));
}

function plainText(value) {
  const parsed = new DOMParser().parseFromString(String(value || ''), 'text/html');
  parsed.querySelectorAll('br').forEach(element => element.replaceWith('\n'));
  return (parsed.body.textContent || '').trim();
}

function safeURL(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.protocol = 'https:';
    return url.href;
  } catch { return ''; }
}

function imageURL(value, preview = false) {
  const safe = safeURL(value);
  if (!safe) return '';
  const url = new URL(safe);
  if (url.hostname === 'assets.science.nasa.gov') {
    for (const size of ['w', 'h']) {
      if (url.searchParams.get(size) === '0') url.searchParams.delete(size);
    }
    if (preview) { url.searchParams.set('w', '800'); url.searchParams.delete('h'); }
  }
  return url.href;
}

async function requestEntries(url, start, end) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('NASA is unavailable right now. Please try again.');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('NASA returned an unexpected response. Please try again.');
  const entries = data.filter(item => item.date >= start && item.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const complete = entries.length === 9 && entries.every((item, index) =>
    item.date === addDays(start, index) && item.title && item.title !== 'NASA Science');
  if (!complete) throw new Error('NASA did not return all nine days. Please try an earlier date range.');
  return entries;
}

async function fetchEntries(start, end) {
  const params = new URLSearchParams({
    date_from: start.slice(2).replaceAll('-', ''),
    date_to: end.slice(2).replaceAll('-', ''),
    per_page: '9'
  });
  try {
    return await requestEntries('https://science.nasa.gov/wp-json/wp/v2/apod-basic?' + params, start, end);
  } catch (error) {
    const legacy = new URLSearchParams({ api_key: API_KEY, start_date: start, end_date: end, thumbs: 'true' });
    try {
      return await requestEntries('https://api.nasa.gov/planetary/apod?' + legacy, start, end);
    } catch { throw error; }
  }
}

function isVideo(item) {
  return item.media_type === 'video' || item.media_type === 'iframe';
}

function makeImage(url, title) {
  const image = document.createElement('img');
  image.src = url;
  image.alt = title;
  image.addEventListener('error', () => {
    const fallback = document.createElement('span');
    fallback.className = 'media-placeholder';
    fallback.textContent = 'Image unavailable';
    image.replaceWith(fallback);
  }, { once: true });
  return image;
}

function showDetails(item) {
  const title = plainText(item.title);
  modalMedia.replaceChildren();
  if (isVideo(item)) {
    const link = document.createElement('a');
    link.href = safeURL(item.permalink || item.url) || 'https://science.nasa.gov/apod/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Watch this video on its source site ↗';
    modalMedia.append(link);
  } else {
    modalMedia.append(makeImage(imageURL(item.hdurl || item.url), title));
  }
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDate').textContent = formatDate(item.date);
  document.getElementById('modalExplanation').textContent = plainText(item.explanation);
  document.getElementById('modalCredit').textContent = plainText(item.credit || item.copyright);
  modal.showModal();
  document.body.classList.add('modal-open');
  modal.scrollTop = 0;
  document.getElementById('closeModal').focus();
}

function renderGallery(entries) {
  const cards = entries.map(item => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gallery-item';
    card.setAttribute('aria-haspopup', 'dialog');
    const title = document.createElement('h3');
    title.textContent = plainText(item.title);
    const date = document.createElement('time');
    date.dateTime = item.date;
    date.textContent = formatDate(item.date);
    if (isVideo(item)) {
      const preview = document.createElement('span');
      preview.className = 'media-placeholder';
      preview.textContent = '▶ Video · Open to watch';
      card.append(preview);
    } else {
      const image = makeImage(imageURL(item.hdurl || item.url, true), title.textContent);
      image.loading = 'lazy';
      card.append(image);
    }
    card.append(title, date);
    card.addEventListener('click', () => showDetails(item));
    return card;
  });
  gallery.replaceChildren(...cards);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const start = startInput.value;
  const end = endInput.value;
  if (Date.parse(end) - Date.parse(start) !== 8 * 86400000) {
    statusMessage.textContent = 'Please choose nine consecutive days.';
    return;
  }
  const controls = form.querySelectorAll('input, button');
  controls.forEach(control => control.disabled = true);
  gallery.setAttribute('aria-busy', 'true');
  statusMessage.textContent = 'Loading space images…';
  try {
    renderGallery(await fetchEntries(start, end));
    statusMessage.textContent = '';
  } catch (error) {
    statusMessage.textContent = error.name === 'TimeoutError'
      ? 'NASA took too long to respond. Please try again.'
      : error instanceof TypeError
        ? 'Could not connect to NASA. Check your connection and try again.'
        : error.message;
  } finally {
    controls.forEach(control => control.disabled = false);
    gallery.setAttribute('aria-busy', 'false');
  }
});

document.getElementById('closeModal').addEventListener('click', () => modal.close());
modal.addEventListener('click', event => {
  const bounds = modal.getBoundingClientRect();
  if (event.target === modal && (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom)) modal.close();
});
modal.addEventListener('close', () => document.body.classList.remove('modal-open'));

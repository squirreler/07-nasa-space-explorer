const { test, expect } = require("@playwright/test");

const pixel =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#0b3d91"/></svg>';

function entriesFor(url) {
  const code = new URL(url).searchParams.get("date_from");
  const year =
    (Number(code.slice(0, 2)) >= 95 ? "19" : "20") + code.slice(0, 2);
  const start = new Date(
    year + "-" + code.slice(2, 4) + "-" + code.slice(4, 6) + "T00:00:00Z",
  );
  return Array.from({ length: 9 }, (_, index) => ({
    date: new Date(start.getTime() + index * 86400000)
      .toISOString()
      .slice(0, 10),
    title: "Discovery &amp; wonder " + (index + 1),
    explanation:
      '<strong>Explanation:</strong> A real story about our universe. <img src=x onerror="window.injected=true">',
    hdurl: "https://example.test/space-" + index + ".jpg",
    media_type: index === 0 ? "video" : "image",
    permalink: "https://science.nasa.gov/example-" + index + "/",
    credit: '<a href="https://example.test">An astronomer</a>',
    basic_html:
      index === 0
        ? '<iframe src="//www.youtube.com/embed/sNUNB6CMnE8"></iframe>'
        : "",
  }));
}

async function mockNASA(page, handler) {
  await page.route("https://example.test/**", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: pixel }),
  );
  await page.route("https://i.ytimg.com/**", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: pixel }),
  );
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>Video player</p>" }),
  );
  await page.route("https://api.nasa.gov/**", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page.route(
    "https://science.nasa.gov/wp-json/wp/v2/apod-basic?*",
    async (route) => {
      const entries = entriesFor(route.request().url());
      if (handler) return handler(route, entries);
      return route.fulfill({ json: entries });
    },
  );
}

async function openGallery(page) {
  await page.goto("/");
  await expect(page.locator(".gallery-item")).toHaveCount(9);
}

test("requests exactly nine selected days, announces loading, and replaces the placeholder", async ({
  page,
}) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let requestURL;
  await mockNASA(page, async (route, entries) => {
    requestURL = new URL(route.request().url());
    await gate;
    await route.fulfill({ json: entries });
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Loading nine days");
  await expect(page.locator("#fetchButton")).toBeDisabled();
  await expect(page.locator("#gallery")).toHaveAttribute("aria-busy", "true");
  release();
  await expect(page.locator(".gallery-item")).toHaveCount(9);
  expect(requestURL.searchParams.get("per_page")).toBe("9");
  const start = await page.locator("#startDate").inputValue();
  const end = await page.locator("#endDate").inputValue();
  expect(requestURL.searchParams.get("date_from")).toBe(
    start.slice(2).replaceAll("-", ""),
  );
  expect(requestURL.searchParams.get("date_to")).toBe(
    end.slice(2).replaceAll("-", ""),
  );
  expect(Date.parse(end) - Date.parse(start)).toBe(8 * 86400000);
  await expect(page.locator("#gallery")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#status")).not.toHaveClass(/is-loading/);
  await expect(page.locator("#fetchButton")).toBeEnabled();
  await expect(page.locator(".placeholder")).toHaveCount(0);
  await expect(page.locator(".card-title").first()).toHaveText(
    "Discovery & wonder 9",
  );
  await expect(page.locator(".card-meta time")).toHaveCount(9);
  await expect(
    page.locator(".gallery-item").first().locator("img"),
  ).toBeVisible();
});

test("synchronizes either date across leap days and archive boundaries without fetching on change", async ({
  page,
}) => {
  let requests = 0;
  await mockNASA(page, async (route, entries) => {
    requests++;
    await route.fulfill({ json: entries });
  });
  await openGallery(page);
  await page.locator("#startDate").fill("2024-02-25");
  await page.locator("#startDate").dispatchEvent("change");
  await expect(page.locator("#endDate")).toHaveValue("2024-03-04");
  expect(requests).toBe(1);
  await page.locator("#fetchButton").click();
  await expect(page.locator(".card-meta time").first()).toHaveAttribute(
    "datetime",
    "2024-03-04",
  );
  await expect(page.locator(".card-meta time").last()).toHaveAttribute(
    "datetime",
    "2024-02-25",
  );
  await page.locator("#endDate").fill("1995-06-16");
  await page.locator("#endDate").dispatchEvent("change");
  await expect(page.locator("#startDate")).toHaveValue("1995-06-16");
  await expect(page.locator("#endDate")).toHaveValue("1995-06-24");
  const max = await page.locator("#startDate").getAttribute("max");
  await page.locator("#startDate").fill(max);
  await page.locator("#startDate").dispatchEvent("change");
  await expect(page.locator("#endDate")).toHaveValue(max);
  const first = await page.locator("#startDate").inputValue();
  expect(Date.parse(max) - Date.parse(first)).toBe(8 * 86400000);
});

test("opens image details by keyboard, navigates, closes with Escape, and restores focus", async ({
  page,
}) => {
  await mockNASA(page);
  await openGallery(page);
  const card = page.locator(".gallery-item").first();
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#modalTitle")).toHaveText("Discovery & wonder 9");
  await expect(page.locator("#modalDate")).not.toBeEmpty();
  await expect(page.locator("#modalExplanation")).toContainText(
    "A real story about our universe.",
  );
  await expect(page.locator("#modalMedia img")).toHaveAttribute(
    "src",
    "https://example.test/space-8.jpg",
  );
  await expect(page.locator("#originalLink")).toHaveAttribute(
    "href",
    "https://example.test/space-8.jpg",
  );
  await expect(page.locator("#modalCredit")).toContainText("An astronomer");
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#modalTitle")).toHaveText("Discovery & wonder 8");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(card).toBeFocused();
  await card.click();
  await page.locator("#closeModal").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await card.click();
  await page.mouse.click(2, 2);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("recognizes a migrated YouTube entry and supplies an embed and original video link", async ({
  page,
}) => {
  await mockNASA(page);
  await openGallery(page);
  const video = page.locator(".gallery-item").filter({ hasText: "Video" });
  await expect(video).toHaveCount(1);
  await video.click();
  await expect(page.locator("#modalMedia iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/sNUNB6CMnE8",
  );
  await expect(page.locator("#originalLink")).toHaveAttribute(
    "href",
    "https://www.youtube.com/embed/sNUNB6CMnE8",
  );
  await page.locator("#closeModal").click();
  await expect(page.locator("#modalMedia iframe")).toHaveCount(0);
});

test("provides a working external link for other video providers", async ({
  page,
}) => {
  await mockNASA(page, async (route, entries) => {
    entries[0].media_type = "iframe";
    entries[0].basic_html =
      '<iframe src="https://player.vimeo.com/video/123456789"></iframe>';
    await route.fulfill({ json: entries });
  });
  await openGallery(page);
  await page.locator(".gallery-item").filter({ hasText: "Video" }).click();
  await expect(
    page.getByRole("link", { name: "Watch this video" }),
  ).toHaveAttribute("href", "https://player.vimeo.com/video/123456789");
});

test("shows a recoverable error and successfully retries", async ({ page }) => {
  let failing = true;
  await mockNASA(page, async (route, entries) =>
    failing
      ? route.fulfill({ status: 503, body: "{}" })
      : route.fulfill({ json: entries }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "NASA’s archive returned an error (503)",
  );
  await expect(page.locator("#fetchButton")).toBeEnabled();
  await expect(page.locator(".skeleton")).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".gallery-item")).toHaveCount(9);
  await expect(page.getByRole("alert")).not.toBeVisible();
});

test("uses the valid DEMO_KEY fallback when the current feed is unavailable", async ({
  page,
}) => {
  let fallback;
  await mockNASA(page, (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.route("https://api.nasa.gov/**", async (route) => {
    fallback = new URL(route.request().url());
    const start = fallback.searchParams.get("start_date");
    const url =
      "https://example.test/?date_from=" + start.slice(2).replaceAll("-", "");
    await route.fulfill({ json: entriesFor(url) });
  });
  await openGallery(page);
  expect(fallback.searchParams.get("api_key")).toBe("DEMO_KEY");
  expect(fallback.searchParams.get("thumbs")).toBe("true");
});

test("rejects incomplete results while preserving the previously loaded collection", async ({
  page,
}) => {
  let incomplete = false;
  await mockNASA(page, (route, entries) =>
    route.fulfill({ json: incomplete ? entries.slice(1) : entries }),
  );
  await openGallery(page);
  const firstDate = await page
    .locator(".card-meta time")
    .first()
    .getAttribute("datetime");
  incomplete = true;
  await page.locator("#startDate").fill("2024-01-01");
  await page.locator("#startDate").dispatchEvent("change");
  await page.locator("#fetchButton").click();
  await expect(page.getByRole("alert")).toContainText(
    "not returned all nine days",
  );
  await expect(page.locator(".gallery-item")).toHaveCount(9);
  await expect(page.locator(".card-meta time").first()).toHaveAttribute(
    "datetime",
    firstDate,
  );
});

test("handles cleared dates without errors, and rejects future and pre-archive dates", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockNASA(page);
  await openGallery(page);
  await page.locator("#startDate").fill("");
  await page.locator("#startDate").dispatchEvent("change");
  await page.locator("#fetchButton").click();
  expect(
    await page
      .locator("#startDate")
      .evaluate((input) => input.validity.valueMissing),
  ).toBe(true);
  await page.locator("#startDate").fill("1995-06-15");
  expect(
    await page
      .locator("#startDate")
      .evaluate((input) => input.validity.rangeUnderflow),
  ).toBe(true);
  await page.locator("#endDate").fill("2099-01-01");
  expect(
    await page
      .locator("#endDate")
      .evaluate((input) => input.validity.rangeOverflow),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("loads a random fact, changes it, and fits narrow screens with a working modal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockNASA(page);
  await openGallery(page);
  const fact = await page.locator("#spaceFact").textContent();
  expect(fact.length).toBeGreaterThan(20);
  await page.getByRole("button", { name: "Show another space fact" }).click();
  await expect(page.locator("#spaceFact")).not.toHaveText(fact);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".gallery-item").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#closeModal").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

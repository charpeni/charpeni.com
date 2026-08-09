/**
 * Headless-browser verification of the Astro rewrite: server-rendered
 * terminal desktop (default), window adoption, partial-fetch windows,
 * keyboard nav, reader mode, legacy params, and the AI-indexing surface.
 *
 * Usage: node scripts/verifySite.mjs [baseUrl]   (default astro dev :4321)
 * On hosts without Chromium's system libraries/fonts, point
 * LD_LIBRARY_PATH / FONTCONFIG_FILE at locally extracted copies.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const results = [];

function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition) });
  console.log(
    `${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`,
  );
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1400, height: 900 },
});
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
// The archive-agent intro plays once per browser; pre-seed the seen key so
// the flow checks below exercise the settled terminal. The intro itself has
// a dedicated fresh-context check at the end of the suite.
await context.addInitScript(() => {
  localStorage.setItem('retro-terminal-agent-intro-seen:v1', '1');
});
const page = await context.newPage();
page.setDefaultTimeout(90_000);

// --- Crawler parity: raw HTML is the full terminal desktop + article ---
const raw = await (
  await page.request.get(`${BASE}/blog/graphql-enums-are-unsafe`)
).text();
check(
  'raw post HTML: terminal desktop + show window + article server-rendered',
  raw.includes('retro-terminal-shell') &&
    raw.includes('retro-terminal-show-title') &&
    raw.includes('retro-terminal-row') &&
    !/<html[^>]*data-reader/.test(raw),
);
check(
  'raw post HTML: 4 JSON-LD blocks, canonical, markdown alternate',
  (raw.match(/application\/ld\+json/g) ?? []).length === 4 &&
    raw.includes(
      '<link rel="canonical" href="https://charpeni.com/blog/graphql-enums-are-unsafe">',
    ) &&
    raw.includes('type="text/markdown"'),
);
const rawHome = await (await page.request.get(`${BASE}/`)).text();
check(
  // Regression guard for the FCP fix: only page 1's card group may ship in
  // the homepage document; the rest are /partials/home-posts fragments.
  // \d-valued only: the inline pagination script contains the selector
  // template `[data-page="${p}"]`, which a bare prefix match would count.
  'raw homepage HTML: exactly one pagination group inlined',
  (rawHome.match(/data-page="\d+"/g) ?? []).length === 1 &&
    rawHome.includes('data-page-groups'),
);

// --- Desktop home: term window, adoption, keyboard ---
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__osReady === true);
check(
  'window manager ready; term window adopted with px geometry',
  await page.evaluate(() => {
    const term = document.querySelector(
      '[data-retro-window-id="term"]',
    );
    return (
      term !== null &&
      !term.classList.contains('retro-terminal-window--ssr') &&
      term.style.left.endsWith('px') &&
      term.classList.contains('retro-terminal-window--active')
    );
  }),
);
check(
  'term log lists all 36 posts with graph svg + hashes',
  (await page.locator('[data-log-index]').count()) === 36 &&
    (await page.locator('.retro-terminal-graph').count()) === 36 &&
    (await page.locator('.retro-terminal-hash').count()) === 36,
);

// Adoption probe: a JS property on the adopted node survives interactions.
await page.evaluate(() => {
  document.querySelector('[data-retro-window-id="term"]').__adopted = 'yes';
});

// Drag the term window by its titlebar.
const before = await page.evaluate(() => {
  const el = document.querySelector('[data-retro-window-id="term"]');
  return { x: parseInt(el.style.left), y: parseInt(el.style.top) };
});
const bar = await page
  .locator('[data-retro-window-id="term"] .retro-terminal-titlebar')
  .boundingBox();
await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
await page.mouse.down();
await page.mouse.move(bar.x + bar.width / 2 + 80, bar.y + bar.height / 2 + 50, {
  steps: 4,
});
await page.mouse.up();
check(
  'term window drags via adopted-node style writes',
  await page.evaluate(
    ({ x, y }) => {
      const el = document.querySelector('[data-retro-window-id="term"]');
      return (
        parseInt(el.style.left) === x + 80 &&
        parseInt(el.style.top) === y + 50 &&
        el.__adopted === 'yes'
      );
    },
    before,
  ),
);

// Keyboard: ArrowDown then Enter opens the second post as a window.
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForSelector('[data-retro-window-id^="show:"]');
await page.waitForFunction(() =>
  document.querySelector('[data-retro-window-id^="show:"] .prose'),
);
check(
  'Enter opened a show window; partial content adopted; URL pushed',
  await page.evaluate(() => {
    const win = document.querySelector('[data-retro-window-id^="show:"]');
    const slug = win.dataset.retroWindowId.slice(5);
    return (
      location.pathname === `/blog/${slug}` &&
      win.querySelector('.retro-terminal-show-title') !== null &&
      document.querySelector('[data-retro-window-id="term"]').__adopted ===
        'yes'
    );
  }),
);
check(
  'show window stacked above term via z-index (stable DOM order)',
  await page.evaluate(() => {
    const term = document.querySelector('[data-retro-window-id="term"]');
    const show = document.querySelector('[data-retro-window-id^="show:"]');
    return (
      Number(show.style.zIndex) > Number(term.style.zIndex) &&
      term.compareDocumentPosition(show) &
        Node.DOCUMENT_POSITION_FOLLOWING
    );
  }),
);
check(
  'client-opened post window is scrollable (not stuck until refresh)',
  await page.evaluate(async () => {
    const scroll = document.querySelector(
      '[data-retro-window-id^="show:"] .retro-terminal-show-scroll',
    );
    if (!scroll || scroll.scrollHeight <= scroll.clientHeight) return false;
    scroll.scrollTop = 250;
    await new Promise((r) => requestAnimationFrame(r));
    return scroll.scrollTop === 250;
  }),
);
check(
  'terminal-opened window: copy buttons injected + Giscus embed added',
  await page.evaluate(() => {
    const win = document.querySelector('[data-retro-window-id^="show:"]');
    return (
      win.querySelectorAll('.copy-code-button').length > 0 &&
      win.querySelector('.giscus-host[data-giscus-init]') !== null
    );
  }),
);
await page.screenshot({ path: 'docs/desktop-post-window.png' });

// --- Accessibility: dialog semantics + F6 window cycling ---
check(
  'windows expose a labelled role (term=region, others=dialog)',
  await page.evaluate(() => {
    const wins = [...document.querySelectorAll('.retro-terminal-window')];
    if (wins.length < 2) return false;
    const term = document.querySelector('[data-retro-window-id="term"]');
    const show = document.querySelector('[data-retro-window-id^="show:"]');
    return (
      term.getAttribute('role') === 'region' &&
      show.getAttribute('role') === 'dialog' &&
      wins.every((w) => {
        const id = w.getAttribute('aria-labelledby');
        return Boolean(id && document.getElementById(id)?.textContent);
      })
    );
  }),
);
check(
  'F6 cycles focus to another window; Shift+F6 returns',
  await (async () => {
    const first = await page.evaluate(
      () => document.activeElement?.dataset?.retroWindowId,
    );
    await page.keyboard.press('F6');
    const second = await page.evaluate(
      () => document.activeElement?.dataset?.retroWindowId,
    );
    await page.keyboard.press('Shift+F6');
    const third = await page.evaluate(
      () => document.activeElement?.dataset?.retroWindowId,
    );
    return first && second && first !== second && third === first;
  })(),
);
// After Shift+F6 focus is back on the show window (third === first).

// Escape closes the show window; term refocuses; URL returns to '/'.
await page.keyboard.press('Escape');
await page.waitForFunction(
  () => !document.querySelector('[data-retro-window-id^="show:"]'),
);
check(
  'Escape closed the window; term refocused; URL back to /',
  await page.evaluate(
    () =>
      location.pathname === '/' &&
      document
        .querySelector('[data-retro-window-id="term"]')
        .classList.contains('retro-terminal-window--active'),
  ),
);
await page.screenshot({ path: 'docs/desktop-home.png' });

// --- Tier 4: soft term-close (minimize + launcher, no reload) ---
await page.evaluate(() => {
  window.__probe = 'alive';
});
await page.click('[data-retro-window-id="term"] .retro-terminal-close');
check(
  'closing the term minimizes it (no reload) and shows the launcher',
  await page.evaluate(() => {
    const term = document.querySelector('[data-retro-window-id="term"]');
    return (
      window.__probe === 'alive' &&
      term !== null &&
      term.classList.contains('retro-terminal-window--minimized') &&
      document.querySelector('.retro-terminal-launcher') !== null
    );
  }),
);
await page.click('.retro-terminal-launcher');
check(
  'the launcher restores the term without a reload',
  await page.evaluate(() => {
    const term = document.querySelector('[data-retro-window-id="term"]');
    return (
      window.__probe === 'alive' &&
      !term.classList.contains('retro-terminal-window--minimized') &&
      document.querySelector('.retro-terminal-launcher') === null
    );
  }),
);

// --- Deep link: server-rendered show window ---
const page2 = await context.newPage();
page2.setDefaultTimeout(90_000);
await page2.goto(`${BASE}/blog/be-careful-with-javascript-default-parameters`, {
  waitUntil: 'networkidle',
});
await page2.waitForFunction(() => window.__osReady === true);
check(
  'deep link: show window server-rendered, active, with twoslash content',
  await page2.evaluate(() => {
    const win = document.querySelector(
      '[data-retro-window-id="show:be-careful-with-javascript-default-parameters"]',
    );
    return (
      win !== null &&
      win.classList.contains('retro-terminal-window--active') &&
      win.querySelector('.shiki') !== null
    );
  }),
);
check(
  'copy buttons injected into article code blocks',
  (await page2.locator('.code-block .copy-code-button').count()) > 0,
);
await page2.close();

// --- Sandpack: mounts on deep-link AND in a terminal-opened window ---
const sp = await context.newPage();
sp.setDefaultTimeout(90_000);
await sp.goto(`${BASE}/blog/dont-blindly-use-usetransition-everywhere`, {
  waitUntil: 'networkidle',
});
/**
 * Scroll whichever container actually scrolls. In terminal mode the desktop
 * is `position:fixed; overflow:hidden`, so the article scrolls inside
 * `.retro-terminal-show-scroll`, not the window.
 */
const scrollThrough = (tab) =>
  tab.evaluate(async () => {
    const box = document.querySelector('.retro-terminal-show-scroll');
    const target = box ?? document.scrollingElement;
    const height = box ? box.scrollHeight : document.body.scrollHeight;
    for (let y = 0; y <= height; y += 400) {
      target.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  });

// The editors are lazy by design: SandpackReact gates the ~270KB CodeMirror
// import on an IntersectionObserver so it stays out of the critical path.
// All four sit below the fold, so none should have mounted on arrival.
check(
  'deep link: Sandpack defers the below-fold editors',
  (await sp.locator('.sp-wrapper').count()) === 0,
);
await scrollThrough(sp);
await sp.waitForFunction(
  () => document.querySelectorAll('.sp-wrapper').length >= 4,
  undefined,
  { timeout: 60_000 },
);
check(
  'deep link: every Sandpack editor mounts once scrolled to (React root)',
  (await sp.locator('.sp-wrapper').count()) >= 4,
);
await sp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await sp.waitForFunction(() => window.__osReady === true);
await sp.evaluate(() => {
  const row = [...document.querySelectorAll('[data-log-slug]')].find(
    (x) => x.dataset.logSlug === 'dont-blindly-use-usetransition-everywhere',
  );
  row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
});
// Same lazy contract inside a terminal-opened window, where the scroll
// container is the window body rather than the document.
await sp.waitForSelector('[data-retro-window-id^="show:"] .sandpackContainer');
await scrollThrough(sp);
await sp.waitForFunction(
  () =>
    document.querySelectorAll('[data-retro-window-id^="show:"] .sp-wrapper')
      .length >= 4,
  undefined,
  { timeout: 60_000 },
);
check(
  'terminal-opened window: Sandpack editors mount on scroll too',
  (await sp
    .locator('[data-retro-window-id^="show:"] .sp-wrapper')
    .count()) >= 4,
);
await sp.close();

// --- Reader mode ---
const readerContext = await browser.newContext({
  viewport: { width: 1400, height: 900 },
});
await readerContext.addCookies([
  { name: 'retro-os', value: '0', url: BASE },
]);
const reader = await readerContext.newPage();
reader.setDefaultTimeout(90_000);
await reader.goto(`${BASE}/blog/graphql-enums-are-unsafe`, {
  waitUntil: 'networkidle',
});
check(
  'reader mode: data-reader pre-paint, terminal chrome hidden, article flows',
  await reader.evaluate(() => {
    const titlebar = document.querySelector('.retro-terminal-titlebar');
    const nav = document.querySelector('nav.reader-only');
    return (
      document.documentElement.dataset.reader === 'true' &&
      getComputedStyle(titlebar).display === 'none' &&
      getComputedStyle(nav).display !== 'none' &&
      getComputedStyle(document.querySelector('.retro-terminal-crt'))
        .display === 'none'
    );
  }),
);
await reader.screenshot({ path: 'docs/reader-post.png' });
// Reader homepage: the classic hero + git-graph post list (not the terminal).
await reader.goto(`${BASE}/`, { waitUntil: 'networkidle' });
check(
  // 8 VISIBLE cards, not a total-count assertion: the served document inlines
  // only page 1 (raw-HTML check above), but by networkidle the idle prefetch
  // may have adopted page 2's hidden group already. Full-archive discovery is
  // the term log's job (checked above), plus sitemap/RSS/llms.txt.
  'reader homepage: hero + branches legend + 8 visible page-1 cards',
  await reader.evaluate(() => {
    const hero = [...document.querySelectorAll('h1')].some((h) =>
      h.textContent?.includes("Hi, I'm Nicolas Charpentier"),
    );
    const branches = document.querySelectorAll(
      '[aria-label="Branches"] a',
    ).length;
    const visibleCards = document.querySelectorAll(
      '[data-page]:not([hidden]) [data-post-card]',
    ).length;
    return hero && branches === 6 && visibleCards === 8;
  }),
);
await reader.hover('[data-post-card]');
check(
  'reader homepage: hovering a post highlights its branch thread',
  (await reader.evaluate(() => document.querySelectorAll('.rail-hl').length)) >
    0,
);
await reader.screenshot({ path: 'docs/reader-home.png' });
check(
  'reader homepage: 8 posts per page, defaults to page 1',
  await reader.evaluate(() => {
    const visible = [...document.querySelectorAll('[data-page]')].filter(
      (g) => !g.hidden,
    );
    return (
      visible.length === 1 &&
      Number(visible[0].dataset.page) === 1 &&
      visible[0].querySelectorAll('[data-post-card]').length === 8 &&
      document.querySelector('[data-page-prev]').disabled === true
    );
  }),
);
await reader.click('[data-page-next]');
// Page 2 is fetched from /partials/home-posts/2 on first show — wait for the
// adopted group rather than asserting synchronously after the click.
await reader.waitForFunction(
  () =>
    [...document.querySelectorAll('[data-page]')].some(
      (g) => Number(g.dataset.page) === 2 && !g.hidden,
    ),
  undefined,
  { timeout: 15_000 },
);
check(
  'reader homepage: "older" fetches page 2 and navigates (?page=2)',
  await reader.evaluate(() => {
    const visible = [...document.querySelectorAll('[data-page]')].filter(
      (g) => !g.hidden,
    );
    return (
      new URL(location.href).searchParams.get('page') === '2' &&
      visible.length === 1 &&
      Number(visible[0].dataset.page) === 2 &&
      visible[0].querySelectorAll('[data-post-card]').length === 8 &&
      document.querySelector('[data-page-prev]').disabled === false
    );
  }),
);
check(
  'reader homepage: fetched page-2 cards get the hover lane-highlight too',
  await reader.evaluate(() => {
    document.querySelectorAll('.rail-hl').forEach((s) =>
      s.classList.remove('rail-hl'),
    );
    const card = [
      ...document.querySelectorAll('[data-page="2"] [data-post-card]'),
    ][0];
    card.dispatchEvent(new MouseEvent('mouseenter'));
    return document.querySelectorAll('.rail-hl').length > 0;
  }),
);
await reader.close();

// Deep link straight to a non-inlined page: the script must fetch the group
// before anything is usable.
const deepReader = await readerContext.newPage();
deepReader.setDefaultTimeout(90_000);
await deepReader.goto(`${BASE}/?page=3`, { waitUntil: 'networkidle' });
await deepReader.waitForFunction(
  () =>
    [...document.querySelectorAll('[data-page]')].some(
      (g) => Number(g.dataset.page) === 3 && !g.hidden,
    ),
  undefined,
  { timeout: 15_000 },
);
check(
  'reader homepage: deep link ?page=3 fetches and shows that page',
  await deepReader.evaluate(() => {
    const visible = [...document.querySelectorAll('[data-page]')].filter(
      (g) => !g.hidden,
    );
    return (
      visible.length === 1 &&
      Number(visible[0].dataset.page) === 3 &&
      visible[0].querySelectorAll('[data-post-card]').length === 8
    );
  }),
);
await deepReader.close();

// --- Legacy ?retro=1 clears reader cookie ---
const legacyContext = await browser.newContext();
await legacyContext.addCookies([
  { name: 'retro-os', value: '0', url: BASE },
]);
const legacy = await legacyContext.newPage();
legacy.setDefaultTimeout(90_000);
await legacy.goto(`${BASE}/?retro=1`, { waitUntil: 'domcontentloaded' });
check(
  'legacy ?retro=1 restores terminal mode and strips the param',
  (await legacy.evaluate(
    () => document.documentElement.dataset.reader,
  )) === undefined &&
    !legacy.url().includes('retro=') &&
    (await legacyContext.cookies()).some(
      (c) => c.name === 'retro-os' && c.value === '1',
    ),
);
await legacy.close();

// --- AI-indexing surface ---
const md = await page.request.get(
  `${BASE}/blog/graphql-enums-are-unsafe.md`,
);
const mdLegacy = await page.request.get(
  `${BASE}/api/blog/graphql-enums-are-unsafe.md`,
);
check(
  'markdown endpoints live at both namespaces with identical bytes',
  md.status() === 200 &&
    mdLegacy.status() === 200 &&
    (await md.text()) === (await mdLegacy.text()),
);
const llms = await page.request.get(`${BASE}/llms.txt`);
const llmsFull = await page.request.get(`${BASE}/llms-full.txt`);
const rss = await page.request.get(`${BASE}/blog/rss.xml`);
check(
  'llms.txt (36 posts), llms-full.txt, and RSS served',
  llms.status() === 200 &&
    ((await llms.text()).match(/^### /gm) ?? []).length === 36 &&
    llmsFull.status() === 200 &&
    rss.status() === 200 &&
    (await rss.text()).includes('<rss version="2.0"'),
);

// --- Archive-agent intro (fresh context: no seen key) ---
const introContext = await browser.newContext({
  viewport: { width: 1400, height: 900 },
});
const intro = await introContext.newPage();
intro.setDefaultTimeout(90_000);
await intro.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await intro.waitForFunction(() => window.__osReady === true);
const introPlaying = await intro.evaluate(
  () => !!document.querySelector('.retro-terminal-content--loading'),
);
await intro.keyboard.press('Enter');
await intro.waitForTimeout(400);
check(
  'archive-agent intro plays in a fresh browser; Enter skips without opening',
  introPlaying &&
    (await intro.evaluate(
      () =>
        !document.querySelector('.retro-terminal-content--loading') &&
        !document.querySelector('[data-retro-window-id^="show:"]') &&
        document.querySelectorAll('.retro-terminal-row').length === 36 &&
        localStorage.getItem('retro-terminal-agent-intro-seen:v1') === '1',
    )),
);
await introContext.close();

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`,
);
process.exit(failed.length > 0 ? 1 : 0);

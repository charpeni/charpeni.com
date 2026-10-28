import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'astro';
import { chromium } from 'playwright';

/**
 * Browser coverage for <LockfileVisibility /> (the figure in "The Bun
 * Dependabot Gap"). Its toggle is two visually hidden radios inside the
 * terminal window's scroller. Clicking a tab focuses its radio, and the
 * browser scrolls that radio into view: if the radio's containing block is
 * the window instead of the tab, that scrolls the overflow-hidden window
 * itself and the figure jumps out of sight, so the click seems to do nothing.
 *
 * Builds the site and serves dist/client, so it runs the real markup, CSS and
 * desktop manager. Skipped when no Chromium can launch: install Playwright's
 * (`pnpm exec playwright install --with-deps chromium`), or point CHROME_PATH
 * at a local Chrome.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLIENT_DIR = join(ROOT, 'dist/client');
const POST = '/blog/the-bun-dependabot-gap-dependabot-alerts-dont-see-bun-lock';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function serveClientDir() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://x').pathname,
    );
    let file = normalize(join(CLIENT_DIR, pathname));
    if (!file.startsWith(CLIENT_DIR)) {
      response.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      file = join(file, 'index.html');
    }
    if (!existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    });
    response.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('picking bun.lock reveals the transitive rows and keeps the figure in view', async (t) => {
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH,
    });
  } catch (error) {
    t.skip(`no Chromium could launch: ${error.message.split('\n')[0]}`);
    return;
  }
  t.after(() => browser.close());
  await build({ root: ROOT, logLevel: 'error' });
  const server = await serveClientDir();
  t.after(() => server.close());

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(`http://127.0.0.1:${server.address().port}${POST}`, {
    waitUntil: 'networkidle',
  });

  const figure = page.locator('.lockfile-vis');
  await figure.scrollIntoViewIfNeeded();
  const before = await figure.boundingBox();

  await figure.getByText('what Bun installs').click();

  assert.equal(
    await figure.locator('input[value="bun-lock"]').isChecked(),
    true,
  );
  const after = await figure.boundingBox();
  assert.equal(
    Math.round(after.y),
    Math.round(before.y),
    'the figure moved when its tab was clicked',
  );
  await figure
    .locator('.lv-row[data-kind="transitive"] .lv-name', { hasText: 'uuid' })
    .waitFor({ state: 'visible' });
});

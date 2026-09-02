import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Regression guard for the first-load window jump. The pre-hydration
 * `.retro-terminal-window--ssr` geometry once lived in DesktopShell.astro's
 * scoped <style>; Astro scoped it to the shell's data-astro-cid attribute,
 * which the Window.astro element never carries, so the rules never matched
 * and every window painted at 0,0 content-sized until the manager ran.
 * The rules must stay in the global sheet (retro.css).
 */
const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('pre-hydration --ssr geometry is defined in the global retro.css', () => {
  const css = read('src/styles/retro.css');
  assert.match(css, /\.retro-terminal-window--ssr\s*\{/);
  // Centring must not rely on `transform`: the spawn animation owns it.
  const rule = css.match(/\.retro-terminal-window--ssr\s*\{([^}]*)\}/)[1];
  assert.doesNotMatch(rule, /transform/);
});

test('no component-scoped <style> targets --ssr windows', () => {
  for (const path of [
    'src/components/desktop/DesktopShell.astro',
    'src/components/desktop/Window.astro',
  ]) {
    const source = read(path);
    const scoped =
      source.match(/<style(?![^>]*is:global)[^>]*>([\s\S]*?)<\/style>/g) ?? [];
    for (const block of scoped) {
      assert.doesNotMatch(
        block,
        /--ssr/,
        `${path}: --ssr rules in a scoped <style> never match the window`,
      );
    }
  }
});

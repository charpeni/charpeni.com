import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampCursor,
  clampMove,
  clampResize,
  clampWinToViewport,
  graphWidth,
  legalGeom,
  maxWindowHeight,
  notFoundGeom,
  prsGeom,
  showGeom,
  termVerticalGeom,
} from '../src/utils/windowGeometry.ts';

test('clampCursor stays within [0, length-1]', () => {
  assert.equal(clampCursor(5, 36), 5);
  assert.equal(clampCursor(-1, 36), 0);
  assert.equal(clampCursor(40, 36), 35);
  assert.equal(clampCursor(0, 0), 0, 'empty list clamps to 0');
});

test('maxWindowHeight is 80% of viewport, floored', () => {
  assert.equal(maxWindowHeight(900), 720);
  assert.equal(maxWindowHeight(1000), 800);
});

test('graphWidth = 14 + 18 per lane', () => {
  assert.equal(graphWidth(0), 14);
  assert.equal(graphWidth(6), 122);
});

test('clampMove keeps a window from leaving the viewport', () => {
  const origin = { x: 100, y: 100, w: 200, h: 200 };
  assert.deepEqual(clampMove(origin, 50, 50, 1400, 900), { x: 150, y: 150 });
  // Dragged far past top-left → pinned to 0,0.
  assert.deepEqual(clampMove(origin, -500, -500, 1400, 900), { x: 0, y: 0 });
  // Dragged far past bottom-right → at most vw-40 / vh-24 stays on screen.
  assert.deepEqual(clampMove(origin, 5000, 5000, 1400, 900), {
    x: 1360,
    y: 876,
  });
});

test('clampResize honours min sizes and viewport', () => {
  const origin = { x: 100, y: 100, w: 300, h: 300 };
  assert.deepEqual(clampResize(origin, 50, 50, 1400, 900, 'show:x'), {
    w: 350,
    h: 350,
  });
  // Shrunk below minimums → clamped to MIN_W (240) / MIN_H (140).
  assert.deepEqual(clampResize(origin, -500, -500, 1400, 900, 'show:x'), {
    w: 240,
    h: 140,
  });
});

test('clampResize caps the PRS window at its own max height', () => {
  const origin = { x: 0, y: 0, w: 900, h: 900 };
  // maxWindowHeight(900)=720 and the PRS cap 720 both bound it.
  assert.equal(clampResize(origin, 0, 1000, 1400, 900, 'latest-prs').h, 720);
});

test('geometry presets are centred and viewport-fitted', () => {
  assert.deepEqual(showGeom(1400, 900), { x: 243, y: 90, w: 914, h: 720 });
  assert.equal(prsGeom(1400, 900).w, 920);
  assert.equal(legalGeom(1400, 900).w, 740);
  assert.equal(notFoundGeom(1400, 900).w, 620);
  // Narrow viewport shrinks widths to fit.
  assert.equal(showGeom(400, 900).w, 400 - 48);
});

test('the home window never opens over the profile card', () => {
  // Desktop bands: the card ends at 185px, the footer starts 90px from the
  // bottom, and each keeps a 16px gap (DEFAULT_TERM_INSETS).
  for (const vh of [520, 600, 690, 720, 768, 800, 900, 1000, 1080, 1440]) {
    const { y, h } = termVerticalGeom(vh);
    assert.ok(y >= 201, `${vh}: starts below the card (y=${y})`);
    assert.ok(y + h <= vh - 20, `${vh}: stays inside the viewport (${y + h})`);
  }
});

test('the home window clears the footer from 720px of height up', () => {
  for (const vh of [720, 768, 800, 900, 1000, 1080, 1440]) {
    const { y, h } = termVerticalGeom(vh);
    assert.ok(y + h <= vh - 106, `${vh}: ends above the footer (${y + h})`);
  }
  // Tucked under the card, filling the band.
  assert.deepEqual(termVerticalGeom(720), { y: 201, h: 413 });
  assert.deepEqual(termVerticalGeom(900), { y: 201, h: 593 });
  // Tall viewports: full height and centred, as before.
  assert.deepEqual(termVerticalGeom(1080), { y: 230, h: 620 });
  assert.deepEqual(termVerticalGeom(1440), { y: 410, h: 620 });
});

test('on short viewports the home window keeps a usable height', () => {
  // The band alone would leave 383px and 293px: the 400px floor takes over
  // and the window extends over the footer, never past 20px from the edge.
  assert.deepEqual(termVerticalGeom(690), { y: 201, h: 400 });
  assert.deepEqual(termVerticalGeom(600), { y: 201, h: 379 });
});

test('the home window follows measured bands (a taller, wrapped card)', () => {
  assert.deepEqual(termVerticalGeom(900, { top: 240, bottom: 94 }), {
    y: 240,
    h: 566,
  });
  // No card or footer to avoid: back to a centred 620px window.
  assert.deepEqual(termVerticalGeom(900, { top: 20, bottom: 20 }), {
    y: 140,
    h: 620,
  });
});

test('clampWinToViewport re-fits a show window that shrank below 640', () => {
  const win = { id: 'show:x', z: 1, x: 20, y: 20, w: 500, h: 400 };
  const fitted = clampWinToViewport(win, 1400, 900);
  assert.deepEqual(
    { x: fitted.x, y: fitted.y, w: fitted.w, h: fitted.h },
    showGeom(1400, 900),
    'a sub-640 show window snaps back to the article width',
  );
});

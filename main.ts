// THE TUESDAY GLOBE — "Sum up 24 November's world news in one image"
// makefun anchor 060c1144aa4422e64455ff8fbc9f638be3e88fb4 round 34225146
// A newspaper front page for Tuesday 24 November 2026, drawn entirely in
// code: own rasteriser, own 5x7 bitmap font, own PNG encoder. No network,
// no randomness at run time — two runs write byte-identical files.
// Every story below happened or was first reported on 24 November 2026;
// stories that fail the date check are named in the DATE CHECK box instead.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------- palette ----------
const PAPER: RGB = [250, 243, 228];
const PAPER2: RGB = [242, 233, 211];
const INK: RGB = [26, 22, 18];
const INK2: RGB = [74, 68, 58];
const RED: RGB = [176, 42, 34];
const BLUE: RGB = [36, 82, 138];
const TEAL: RGB = [24, 108, 100];
const GOLD: RGB = [178, 132, 38];
const GREY: RGB = [150, 143, 128];
const SKY: RGB = [168, 196, 216];
const SEA: RGB = [52, 110, 150];
const GREEN: RGB = [74, 122, 62];
const CREAM: RGB = [255, 250, 238];

type RGB = [number, number, number];

// ---------- frame buffer ----------
const buf = Buffer.alloc(W * H * 3);
function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  if (w <= 0 || h <= 0) return;
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; i += 3;
    }
  }
}
function hline(x: number, y: number, w: number, c: RGB): void { rect(x, y, w, 1, c); }
function vline(x: number, y: number, h: number, c: RGB): void { rect(x, y, 1, h, c); }
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let s = 0; s <= n; s++) px(Math.round(x0 + (dx * s) / n), Math.round(y0 + (dy * s) / n), c);
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) px(cx + x, cy + y, c);
  }
}
function ring(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    px(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
    const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
    const g = 1 - a - b;
    if (a >= 0 && b >= 0 && g >= 0) px(x, y, c);
  }
}
function poly(pts: Array<[number, number]>, c: RGB): void {
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) px(x, y, c);
  }
}
// Deterministic pseudo-random (fixed seed per call site) for grain/texture.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function speckle(x: number, y: number, w: number, h: number, seed: number, c: RGB, n: number): void {
  const r = rng(seed);
  for (let i = 0; i < n; i++) px(x + Math.floor(r() * w), y + Math.floor(r() * h), c);
}
function box(x: number, y: number, w: number, h: number, c: RGB): void {
  hline(x, y, w, c); hline(x, y + h - 1, w, c); vline(x, y, h, c); vline(x + w - 1, y, h, c);
}
function sun(cx: number, cy: number, r: number, c: RGB): void {
  disc(cx, cy, r, c);
  for (let a = 0; a < 12; a++) {
    const t = (a * Math.PI) / 6;
    line(Math.round(cx + (r + 2) * Math.cos(t)), Math.round(cy + (r + 2) * Math.sin(t)),
      Math.round(cx + (r + 7) * Math.cos(t)), Math.round(cy + (r + 7) * Math.sin(t)), c);
  }
}
function cloud(cx: number, cy: number, s: number, c: RGB): void {
  disc(cx, cy, 8 * s, c); disc(cx + 9 * s, cy + 2 * s, 7 * s, c);
  disc(cx - 9 * s, cy + 3 * s, 6 * s, c); disc(cx + 2 * s, cy - 5 * s, 6 * s, c);
}
function person(cx: number, y: number, h: number, c: RGB): void {
  disc(cx, y + Math.round(h * 0.12), Math.max(2, Math.round(h * 0.11)), c);
  rect(cx - Math.max(1, Math.round(h * 0.07)), y + Math.round(h * 0.24), Math.max(3, Math.round(h * 0.14)), Math.round(h * 0.42), c);
  line(cx, y + Math.round(h * 0.62), cx - Math.round(h * 0.12), y + h, c);
  line(cx, y + Math.round(h * 0.62), cx + Math.round(h * 0.12), y + h, c);
}
function building(x: number, y: number, w: number, h: number, c: RGB, win: RGB): void {
  rect(x, y, w, h, c);
  for (let wy = y + 5; wy < y + h - 4; wy += 9)
    for (let wx = x + 4; wx < x + w - 4; wx += 9) rect(wx, wy, 4, 5, win);
}
function waves(x: number, y: number, w: number, c: RGB): void {
  for (let k = 0; k < 3; k++) {
    const yy = y + k * 6;
    for (let xx = x; xx < x + w; xx += 14) {
      line(xx, yy, xx + 5, yy - 3, c); line(xx + 5, yy - 3, xx + 10, yy, c);
    }
  }
}
function smoke(x: number, y: number, h: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < h; i += 4) {
    const wob = Math.round(Math.sin(i / 6) * 4);
    disc(x + wob + Math.round(r() * 4 - 2), y - i, 5 + Math.round(i / 8), [120, 116, 108]);
  }
}
function burst(cx: number, cy: number, r: number, c1: RGB, c2: RGB): void {
  for (let a = 0; a < 12; a++) {
    const t = (a * Math.PI) / 6;
    line(cx, cy, Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c1);
  }
  disc(cx, cy, Math.max(2, Math.round(r / 3)), c2);
}

// ---------- 5x7 bitmap font (own design) ----------
// Each glyph: 7 rows, 5 bits each, bit 4 = leftmost column.
const GLYPHS: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x16, 0x13],
  "$": [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "\u2022": [0, 0, 0x0e, 0x0e, 0x0e, 0, 0],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "[": [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  "]": [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
};
function normChar(ch: string): string {
  if (ch === "\u2019" || ch === "\u2018") return "'";
  if (ch === "\u201c" || ch === "\u201d") return '"';
  if (ch === "\u2014" || ch === "\u2013") return "-";
  return ch.toUpperCase();
}
function textWidth(s: string, sc: number): number {
  let w = 0;
  for (const ch of s) w += 6 * sc;
  return w > 0 ? w - sc : 0;
}
function drawText(x: number, y: number, s: string, sc: number, c: RGB): void {
  let cx = x;
  for (const raw of s) {
    const g = GLYPHS[normChar(raw)] ?? GLYPHS["?"];
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row & (1 << (4 - col))) rect(cx + col * sc, y + r * sc, sc, sc, c);
      }
    }
    cx += 6 * sc;
  }
}
function drawTextC(x: number, y: number, w: number, s: string, sc: number, c: RGB): void {
  drawText(x + Math.max(0, Math.floor((w - textWidth(s, sc)) / 2)), y, s, sc, c);
}
function wrapText(s: string, maxW: number, sc: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const wd of words) {
    const test = cur ? cur + " " + wd : wd;
    if (textWidth(test, sc) <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = wd; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function para(x: number, y: number, w: number, s: string, sc: number, c: RGB, lh: number, maxLines: number): number {
  const lines = wrapText(s, w, sc).slice(0, maxLines);
  lines.forEach((ln, i) => drawText(x, y + i * lh, ln, sc, c));
  return y + lines.length * lh;
}
function tag(x: number, y: number, s: string, c: RGB): void {
  const w = textWidth(s, 1) + 8;
  rect(x, y, w, 12, c);
  drawText(x + 4, y + 2, s, 1, CREAM);
}
function sourceLine(x: number, y: number, src: string): void {
  drawText(x, y, "SOURCE: " + src, 1, INK2);
}

// ---------- drawn scenes (one per illustrated story) ----------
// Each scene paints inside the rectangle (x, y, w, h) and nowhere else.
type Scene = (x: number, y: number, w: number, h: number) => void;

function sceneLead(x: number, y: number, w: number, h: number): void {
  // War map: dark night sky over a jagged landmass, red strike bursts.
  rect(x, y, w, h, [30, 44, 66]);
  poly([[x + 8, y + h - 14], [x + w * 0.28, y + 30], [x + w * 0.55, y + 14], [x + w * 0.8, y + 44], [x + w - 10, y + 26], [x + w - 6, y + h - 10], [x + 10, y + h - 8]], [58, 84, 96]);
  poly([[x + w * 0.2, y + h * 0.55], [x + w * 0.45, y + h * 0.4], [x + w * 0.62, y + h * 0.62], [x + w * 0.38, y + h * 0.8]], [38, 62, 80]);
  disc(x + w * 0.42, y + h * 0.52, 5, GOLD);
  drawText(x + w * 0.42 + 8, y + h * 0.52 - 4, "KYIV", 1, CREAM);
  burst(x + w * 0.3, y + h * 0.3, 16, RED, GOLD);
  burst(x + w * 0.66, y + h * 0.62, 13, RED, GOLD);
  burst(x + w * 0.8, y + h * 0.28, 10, RED, GOLD);
  line(x + w * 0.3, y + h * 0.3, x + w * 0.66, y + h * 0.62, [220, 120, 90]);
  line(x + w * 0.66, y + h * 0.62, x + w * 0.8, y + h * 0.28, [220, 120, 90]);
  disc(x + w * 0.16, y + h * 0.72, 3, CREAM); disc(x + w * 0.55, y + h * 0.18, 3, CREAM);
  disc(x + w * 0.88, y + h * 0.7, 3, CREAM);
  drawText(x + 8, y + h - 16, "AIR DEFENCE ON ALERT", 1, CREAM);
  speckle(x, y, w, h, 101, [200, 210, 220], 60);
}
function sceneCapitol(x: number, y: number, w: number, h: number): void {
  // US Capitol dome, sized by scene height, red banner along the base.
  rect(x, y, w, h, SKY);
  rect(x, y + h - 10, w, 10, [120, 150, 110]);
  const cx = x + w / 2;
  const domeR = Math.max(10, Math.round(h * 0.3));
  disc(cx, y + Math.round(h * 0.52), domeR, CREAM);
  rect(cx - Math.round(w * 0.22), y + Math.round(h * 0.52), Math.round(w * 0.44), Math.round(h * 0.3), CREAM);
  for (let i = -3; i <= 3; i++) rect(cx + i * Math.round(w * 0.055) - 2, y + Math.round(h * 0.58), 4, Math.round(h * 0.22), [200, 196, 182]);
  rect(cx - 1, y + Math.round(h * 0.2), 3, Math.round(h * 0.32), INK);
  disc(cx, y + Math.round(h * 0.18), 3, INK);
  rect(x, y + h - 12, w, 12, RED);
  drawTextC(x, y + h - 10, w, "RESIGNS", 1, CREAM);
  sun(x + w - 16, y + 12, 6, GOLD);
}
function sceneStorm(x: number, y: number, w: number, h: number): void {
  // Thanksgiving storm: dark clouds, rain, a plane, lightning.
  rect(x, y, w, h, [96, 104, 116]);
  cloud(x + w * 0.25, y + 18, 2, [70, 76, 88]);
  cloud(x + w * 0.7, y + 30, 2, [70, 76, 88]);
  cloud(x + w * 0.5, y + 12, 1, [88, 94, 106]);
  poly([[x + w * 0.62, y + 34], [x + w * 0.55, y + 52], [x + w * 0.62, y + 52], [x + w * 0.52, y + 74], [x + w * 0.64, y + 74]], GOLD);
  const r = rng(202);
  for (let i = 0; i < 40; i++) {
    const rx = x + Math.floor(r() * w), ry = y + 30 + Math.floor(r() * (h - 40));
    line(rx, ry, rx - 3, ry + 9, [190, 200, 214]);
  }
  rect(x + w * 0.18, y + h * 0.62, Math.round(w * 0.24), 8, CREAM);
  tri(x + w * 0.42, y + h * 0.62, x + w * 0.42, y + h * 0.62 + 8, x + w * 0.5, y + h * 0.62 + 4, CREAM);
  rect(x + w * 0.2, y + h * 0.62 - 8, 14, 8, CREAM);
  line(x + w * 0.18, y + h * 0.62 + 4, x + w * 0.1, y + h * 0.62 - 6, CREAM);
  rect(x, y + h - 10, w, 10, [70, 96, 110]);
}
function sceneSudan(x: number, y: number, w: number, h: number): void {
  // Desert, UN-blue building, smoke, a drone overhead.
  rect(x, y, w, h, [226, 198, 140]);
  rect(x, y + h - 12, w, 12, [190, 150, 96]);
  rect(x + w * 0.12, y + h * 0.45, Math.round(w * 0.3), Math.round(h * 0.4), BLUE);
  rect(x + w * 0.12, y + h * 0.38, Math.round(w * 0.3), 8, BLUE);
  for (let i = 0; i < 3; i++) rect(x + w * 0.16 + i * 12, y + h * 0.52, 7, 9, CREAM);
  drawText(x + w * 0.16, y + h * 0.42 - 8, "UN", 1, CREAM);
  smoke(x + w * 0.68, y + h * 0.5, Math.round(h * 0.45), 301);
  smoke(x + w * 0.85, y + h * 0.55, Math.round(h * 0.4), 302);
  rect(x + w * 0.52, y + h * 0.62, 14, 6, INK);
  line(x + w * 0.52, y + h * 0.65, x + w * 0.52 - 6, y + h * 0.6, INK);
  line(x + w * 0.52 + 14, y + h * 0.65, x + w * 0.52 + 20, y + h * 0.6, INK);
  disc(x + w * 0.5, y + h * 0.2, 4, INK);
  sun(x + w - 18, y + 14, 7, GOLD);
}
function sceneAI(x: number, y: number, w: number, h: number): void {
  // Campus building with a giant chip marked AI.
  rect(x, y, w, h, SKY);
  rect(x, y + h - 10, w, 10, GREEN);
  building(x + w * 0.1, y + h * 0.3, Math.round(w * 0.34), Math.round(h * 0.55), [200, 190, 170], BLUE);
  rect(x + w * 0.56, y + h * 0.22, Math.round(w * 0.32), Math.round(h * 0.32), INK);
  for (let i = -2; i <= 2; i++) {
    line(x + w * 0.72, y + h * 0.22 + i * 6, x + w * 0.72, y + h * 0.22 + i * 6 - 6, GOLD);
  }
  drawText(x + w * 0.63, y + h * 0.32, "AI", 2, GOLD);
  person(x + w * 0.2, y + h * 0.72, 14, RED); person(x + w * 0.3, y + h * 0.72, 14, BLUE);
  person(x + w * 0.4, y + h * 0.72, 14, TEAL);
  tri(x + w * 0.5, y + h * 0.3, x + w * 0.56, y + h * 0.3, x + w * 0.53, y + h * 0.18, [240, 120, 60]);
}
function sceneTalks(x: number, y: number, w: number, h: number): void {
  // Two flags over a table, mountains behind.
  rect(x, y, w, h, SKY);
  poly([[x, y + h * 0.5], [x + w * 0.3, y + 6], [x + w * 0.55, y + h * 0.5]], [120, 140, 150]);
  poly([[x + w * 0.4, y + h * 0.5], [x + w * 0.7, y + 2], [x + w, y + h * 0.5]], [96, 118, 132]);
  rect(x + w * 0.18, y + h * 0.12, 26, 16, [220, 90, 50]);
  rect(x + w * 0.18, y + h * 0.12 + 5, 26, 6, CREAM);
  disc(x + w * 0.18 + 13, y + h * 0.12 + 8, 3, BLUE);
  rect(x + w * 0.68, y + h * 0.12, 26, 16, RED);
  for (let i = 0; i < 5; i++) rect(x + w * 0.68 + 2, y + h * 0.12 + 2 + i * 3, 22, 1, GOLD);
  rect(x + w * 0.2, y + h * 0.62, Math.round(w * 0.6), 8, [120, 84, 52]);
  rect(x + w * 0.24, y + h * 0.62 + 8, 5, Math.round(h * 0.2), [120, 84, 52]);
  rect(x + w * 0.72, y + h * 0.62 + 8, 5, Math.round(h * 0.2), [120, 84, 52]);
  person(x + w * 0.32, y + h * 0.42, 14, INK); person(x + w * 0.62, y + h * 0.42, 14, INK);
}
function sceneShip(x: number, y: number, w: number, h: number): void {
  // Cargo ship ablaze on a grey sea.
  rect(x, y, w, h, [120, 138, 150]);
  rect(x, y + h * 0.55, w, Math.round(h * 0.45), SEA);
  waves(x + 4, y + h * 0.62, w - 8, CREAM);
  waves(x + 4, y + h * 0.82, w - 8, CREAM);
  poly([[x + w * 0.15, y + h * 0.5], [x + w * 0.85, y + h * 0.5], [x + w * 0.78, y + h * 0.38], [x + w * 0.22, y + h * 0.38]], [150, 60, 50]);
  rect(x + w * 0.3, y + h * 0.26, 10, Math.round(h * 0.14), [220, 210, 190]);
  rect(x + w * 0.55, y + h * 0.3, 12, Math.round(h * 0.1), [220, 210, 190]);
  burst(x + w * 0.6, y + h * 0.3, 12, [230, 120, 40], GOLD);
  smoke(x + w * 0.62, y + h * 0.28, Math.round(h * 0.3), 401);
  disc(x + w * 0.8, y + h * 0.18, 3, INK);
}
function sceneFactory(x: number, y: number, w: number, h: number): void {
  // Factory with chimneys, smoke, rescue helmets below.
  rect(x, y, w, h, [210, 200, 180]);
  rect(x + w * 0.08, y + h * 0.4, Math.round(w * 0.5), Math.round(h * 0.45), [140, 90, 70]);
  rect(x + w * 0.08, y + h * 0.32, 8, Math.round(h * 0.53), [120, 76, 60]);
  rect(x + w * 0.24, y + h * 0.28, 8, Math.round(h * 0.57), [120, 76, 60]);
  smoke(x + w * 0.12, y + h * 0.32, Math.round(h * 0.3), 501);
  rect(x + w * 0.14, y + h * 0.5, 8, 8, GOLD); rect(x + w * 0.3, y + h * 0.5, 8, 8, GOLD);
  rect(x + w * 0.14, y + h * 0.68, 8, 8, GOLD); rect(x + w * 0.3, y + h * 0.68, 8, 8, GOLD);
  disc(x + w * 0.72, y + h * 0.78, 6, GOLD); disc(x + w * 0.86, y + h * 0.78, 6, RED);
  rect(x + w * 0.66, y + h * 0.78, 14, 3, GOLD); rect(x + w * 0.8, y + h * 0.78, 14, 3, RED);
}
function sceneLego(x: number, y: number, w: number, h: number): void {
  // Stacked toy bricks in bright colours.
  rect(x, y, w, h, PAPER2);
  const cols: RGB[] = [RED, BLUE, GOLD, TEAL, GREEN];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const bx = x + 8 + c * Math.round(w * 0.22), by = y + h - 14 - r * 14;
    rect(bx, by, Math.round(w * 0.2), 12, cols[(r + c) % 5]);
    rect(bx + 4, by - 4, 6, 4, cols[(r + c) % 5]); rect(bx + Math.round(w * 0.2) - 10, by - 4, 6, 4, cols[(r + c) % 5]);
  }
  rect(x + w * 0.62, y + 8, Math.round(w * 0.3), Math.round(h * 0.3), [200, 196, 182]);
  for (let i = 0; i < 3; i++) rect(x + w * 0.65 + i * 8, y + 12, 5, 6, BLUE);
  sun(x + 20, y + 14, 7, GOLD);
}
function sceneWHO(x: number, y: number, w: number, h: number): void {
  // Hospital cross and a map with virus dots.
  rect(x, y, w, h, [190, 210, 200]);
  rect(x + w * 0.1, y + h * 0.3, Math.round(w * 0.36), Math.round(h * 0.55), CREAM);
  rect(x + w * 0.1, y + h * 0.3, Math.round(w * 0.36), 8, RED);
  rect(x + w * 0.24, y + h * 0.42, 6, 18, RED); rect(x + w * 0.19, y + h * 0.47, 16, 6, RED);
  poly([[x + w * 0.55, y + h * 0.2], [x + w * 0.75, y + h * 0.12], [x + w * 0.9, y + h * 0.3], [x + w * 0.82, y + h * 0.62], [x + w * 0.6, y + h * 0.55]], [110, 150, 110]);
  disc(x + w * 0.7, y + h * 0.35, 4, RED); disc(x + w * 0.78, y + h * 0.5, 3, RED);
  disc(x + w * 0.64, y + h * 0.45, 3, RED);
  person(x + w * 0.52, y + h * 0.72, 14, INK);
}
function sceneCard(x: number, y: number, w: number, h: number): void {
  // A credit card stamped 10% beside a small capitol.
  rect(x, y, w, h, SKY);
  rect(x + w * 0.08, y + h * 0.2, Math.round(w * 0.55), Math.round(h * 0.5), BLUE);
  rect(x + w * 0.08, y + h * 0.2, Math.round(w * 0.55), 8, GOLD);
  drawText(x + w * 0.14, y + h * 0.4, "10%", 2, CREAM);
  rect(x + w * 0.72, y + h * 0.45, Math.round(w * 0.2), Math.round(h * 0.4), CREAM);
  disc(x + w * 0.82, y + h * 0.45, 8, CREAM);
  for (let i = -1; i <= 1; i++) rect(x + w * 0.82 + i * 6 - 1, y + h * 0.52, 3, Math.round(h * 0.3), [200, 196, 182]);
  disc(x + w * 0.2, y + h * 0.82, 4, RED); disc(x + w * 0.34, y + h * 0.82, 4, TEAL);
}
function sceneFlags(x: number, y: number, w: number, h: number): void {
  // Two flags, a warning triangle between them.
  rect(x, y, w, h, PAPER2);
  rect(x + w * 0.08, y + h * 0.18, 30, 18, RED);
  rect(x + w * 0.08 + 8, y + h * 0.18, 14, 18, CREAM);
  disc(x + w * 0.08 + 15, y + h * 0.18 + 9, 4, RED);
  rect(x + w * 0.62, y + h * 0.18, 30, 18, RED);
  rect(x + w * 0.62 + 10, y + h * 0.18, 10, 18, CREAM);
  tri(x + w * 0.5, y + h * 0.5, x + w * 0.38, y + h * 0.82, x + w * 0.62, y + h * 0.82, GOLD);
  drawText(x + w * 0.5 - 3, y + h * 0.6, "!", 1, INK);
  line(x + w * 0.08, y + h * 0.18 + 18, x + w * 0.08, y + h * 0.85, INK);
  line(x + w * 0.62, y + h * 0.18 + 18, x + w * 0.62, y + h * 0.85, INK);
}
function sceneBottle(x: number, y: number, w: number, h: number): void {
  // Bottles and a warning sign outside village huts.
  rect(x, y, w, h, [220, 200, 170]);
  tri(x + w * 0.1, y + h * 0.5, x + w * 0.26, y + h * 0.5, x + w * 0.18, y + h * 0.3, [150, 100, 60]);
  tri(x + w * 0.3, y + h * 0.5, x + w * 0.46, y + h * 0.5, x + w * 0.38, y + h * 0.3, [150, 100, 60]);
  rect(x + w * 0.58, y + h * 0.35, 10, Math.round(h * 0.45), [90, 130, 80]);
  rect(x + w * 0.6, y + h * 0.28, 6, 8, [90, 130, 80]);
  rect(x + w * 0.76, y + h * 0.4, 8, Math.round(h * 0.4), [110, 90, 60]);
  disc(x + w * 0.86, y + h * 0.3, 12, GOLD); ring(x + w * 0.86, y + h * 0.3, 12, INK);
  drawText(x + w * 0.86 - 3, y + h * 0.3 - 4, "!", 1, INK);
  rect(x, y + h - 8, w, 8, GREEN);
}
function sceneMissile(x: number, y: number, w: number, h: number): void {
  // City skyline at dusk, missile trails, one explosion.
  rect(x, y, w, h, [60, 52, 66]);
  const r = rng(901);
  for (let i = 0; i < 12; i++) disc(x + Math.floor(r() * w), y + Math.floor(r() * h * 0.4), 1, CREAM);
  for (let i = 0; i < 5; i++) {
    const bx = x + 6 + i * Math.round(w * 0.19);
    const bh = Math.round(h * (0.3 + r() * 0.25));
    rect(bx, y + h - bh - 6, Math.round(w * 0.15), bh, [40, 36, 40]);
    for (let wy = y + h - bh + 4; wy < y + h - 10; wy += 8) rect(bx + 3, wy, 3, 4, GOLD);
  }
  line(x + w * 0.2, y + 6, x + w * 0.45, y + h * 0.5, [240, 200, 120]);
  line(x + w * 0.85, y + 4, x + w * 0.6, y + h * 0.45, [240, 200, 120]);
  burst(x + w * 0.6, y + h * 0.45, 11, [230, 120, 40], GOLD);
  rect(x, y + h - 6, w, 6, [30, 28, 30]);
}
function sceneQuake(x: number, y: number, w: number, h: number): void {
  // Cracked ground, tilted buildings, seismograph line.
  rect(x, y, w, h, [210, 196, 170]);
  poly([[x + w * 0.1, y + h * 0.4], [x + w * 0.3, y + h * 0.34], [x + w * 0.34, y + h * 0.6], [x + w * 0.12, y + h * 0.66]], [150, 140, 120]);
  poly([[x + w * 0.55, y + h * 0.36], [x + w * 0.78, y + h * 0.3], [x + w * 0.84, y + h * 0.62], [x + w * 0.6, y + h * 0.66]], [130, 120, 100]);
  line(x + w * 0.34, y + h * 0.6, x + w * 0.5, y + h * 0.8, INK);
  line(x + w * 0.5, y + h * 0.8, x + w * 0.62, y + h * 0.72, INK);
  line(x + w * 0.62, y + h * 0.72, x + w * 0.8, y + h * 0.88, INK);
  rect(x, y + 6, w, 10, CREAM);
  const sx = x + 4;
  line(sx, y + 11, sx + 14, y + 11, RED); line(sx + 14, y + 11, sx + 20, y + 7, RED);
  line(sx + 20, y + 7, sx + 26, y + 15, RED); line(sx + 26, y + 15, sx + 34, y + 11, RED);
  line(sx + 34, y + 11, sx + 48, y + 11, RED);
  person(x + w * 0.42, y + h * 0.66, 13, RED); person(x + w * 0.88, y + h * 0.7, 13, BLUE);
}
function sceneJewel(x: number, y: number, w: number, h: number): void {
  // Necklace arc and a cut diamond on velvet.
  rect(x, y, w, h, [66, 40, 66]);
  for (let a = 0; a <= 20; a++) {
    const t = (a / 20) * Math.PI;
    const dx = x + w * 0.5 + Math.cos(t) * w * 0.36;
    const dy = y + h * 0.18 + Math.sin(t) * h * 0.55;
    disc(Math.round(dx), Math.round(dy), 3, GOLD);
  }
  poly([[x + w * 0.5, y + h * 0.3], [x + w * 0.62, y + h * 0.45], [x + w * 0.5, y + h * 0.62], [x + w * 0.38, y + h * 0.45]], [190, 220, 235]);
  line(x + w * 0.5, y + h * 0.3, x + w * 0.5, y + h * 0.62, CREAM);
  line(x + w * 0.38, y + h * 0.45, x + w * 0.62, y + h * 0.45, CREAM);
  drawText(x + w * 0.08, y + h - 14, "89", 1, CREAM);
  drawText(x + w * 0.78, y + h - 14, "89", 1, CREAM);
}
function sceneMaths(x: number, y: number, w: number, h: number): void {
  // Chalkboard of equations and a glowing bulb.
  rect(x, y, w, h, [52, 74, 66]);
  rect(x + 6, y + 6, Math.round(w * 0.62), Math.round(h * 0.7), [38, 56, 50]);
  box(x + 6, y + 6, Math.round(w * 0.62), Math.round(h * 0.7), [150, 130, 90]);
  drawText(x + 12, y + 12, "E=mc2", 1, CREAM);
  drawText(x + 12, y + 24, "PI=3.14", 1, CREAM);
  drawText(x + 12, y + 36, "X+Y=Z", 1, CREAM);
  disc(x + w * 0.82, y + h * 0.32, 9, GOLD);
  burst(x + w * 0.82, y + h * 0.32, 14, GOLD, GOLD);
  rect(x + w * 0.8, y + h * 0.32 + 9, 5, 6, INK);
  person(x + w * 0.8, y + h * 0.62, 14, CREAM);
}
function sceneDoc(x: number, y: number, w: number, h: number): void {
  // Sealed document and capitol columns.
  rect(x, y, w, h, PAPER2);
  rect(x + w * 0.12, y + h * 0.14, Math.round(w * 0.5), Math.round(h * 0.7), CREAM);
  box(x + w * 0.12, y + h * 0.14, Math.round(w * 0.5), Math.round(h * 0.7), INK);
  for (let i = 0; i < 4; i++) line(x + w * 0.18, y + h * 0.26 + i * 9, x + w * 0.52, y + h * 0.26 + i * 9, INK2);
  disc(x + w * 0.52, y + h * 0.68, 7, RED);
  for (let i = -1; i <= 1; i++) rect(x + w * 0.72 + i * 8, y + h * 0.3, 4, Math.round(h * 0.5), [200, 196, 182]);
  rect(x + w * 0.62, y + h * 0.24, Math.round(w * 0.3), 6, [200, 196, 182]);
  rect(x + w * 0.62, y + h * 0.8, Math.round(w * 0.3), 6, [200, 196, 182]);
}
function sceneBen(x: number, y: number, w: number, h: number): void {
  // Clock tower, circle of stars, an arrow pointing on.
  rect(x, y, w, h, SKY);
  rect(x + w * 0.14, y + h * 0.2, Math.round(w * 0.18), Math.round(h * 0.65), [180, 160, 120]);
  tri(x + w * 0.12, y + h * 0.2, x + w * 0.34, y + h * 0.2, x + w * 0.23, y + h * 0.06, [150, 130, 95]);
  disc(x + w * 0.23, y + h * 0.38, 8, CREAM); ring(x + w * 0.23, y + h * 0.38, 8, INK);
  line(x + w * 0.23, y + h * 0.38, x + w * 0.23, y + h * 0.38 - 5, INK);
  line(x + w * 0.23, y + h * 0.38, x + w * 0.23 + 4, y + h * 0.38, INK);
  for (let a = 0; a < 8; a++) {
    const t = (a * Math.PI) / 4;
    disc(Math.round(x + w * 0.68 + 16 * Math.cos(t)), Math.round(y + h * 0.42 + 16 * Math.sin(t)), 2, GOLD);
  }
  line(x + w * 0.55, y + h * 0.75, x + w * 0.9, y + h * 0.75, RED);
  tri(x + w * 0.9, y + h * 0.75, x + w * 0.9, y + h * 0.75, x + w * 0.98, y + h * 0.75 - 4, RED);
  tri(x + w * 0.9, y + h * 0.75, x + w * 0.9, y + h * 0.75, x + w * 0.98, y + h * 0.75 + 4, RED);
}
function sceneFactory2(x: number, y: number, w: number, h: number): void {
  // Factory chimneys, a tractor and a red star flag.
  rect(x, y, w, h, [200, 190, 160]);
  rect(x + w * 0.08, y + h * 0.45, Math.round(w * 0.55), Math.round(h * 0.4), [140, 110, 80]);
  tri(x + w * 0.12, y + h * 0.45, x + w * 0.2, y + h * 0.45, x + w * 0.16, y + h * 0.2, [120, 95, 70]);
  tri(x + w * 0.26, y + h * 0.45, x + w * 0.34, y + h * 0.45, x + w * 0.3, y + h * 0.2, [120, 95, 70]);
  smoke(x + w * 0.16, y + h * 0.2, Math.round(h * 0.2), 601);
  rect(x + w * 0.68, y + h * 0.62, 22, 10, RED);
  disc(x + w * 0.72, y + h * 0.72, 5, INK); disc(x + w * 0.86, y + h * 0.72, 5, INK);
  rect(x + w * 0.78, y + h * 0.14, 22, 13, RED);
  disc(x + w * 0.89, y + h * 0.14 + 6, 3, GOLD);
  sun(x + 18, y + 14, 7, GOLD);
}
function scenePentagon(x: number, y: number, w: number, h: number): void {
  // Pentagon outline, a maple leaf, a fence line.
  rect(x, y, w, h, SKY);
  poly([[x + w * 0.3, y + h * 0.12], [x + w * 0.62, y + h * 0.12], [x + w * 0.72, y + h * 0.45], [x + w * 0.46, y + h * 0.82], [x + w * 0.18, y + h * 0.45]], [150, 160, 170]);
  poly([[x + w * 0.38, y + h * 0.3], [x + w * 0.54, y + h * 0.3], [x + w * 0.6, y + h * 0.5], [x + w * 0.46, y + h * 0.66], [x + w * 0.32, y + h * 0.5]], [200, 205, 210]);
  disc(x + w * 0.82, y + h * 0.3, 8, RED);
  tri(x + w * 0.82, y + h * 0.3 - 8, x + w * 0.82 - 5, y + h * 0.3 + 6, x + w * 0.82 + 5, y + h * 0.3 + 6, RED);
  hline(x + 6, y + h - 8, 44, INK);
  for (let i = 0; i < 5; i++) vline(x + 8 + i * 10, y + h - 12, 5, INK);
}
function sceneChip(x: number, y: number, w: number, h: number): void {
  // A computer chip under a magnifier, chart falling.
  rect(x, y, w, h, [40, 48, 58]);
  rect(x + w * 0.14, y + h * 0.22, Math.round(w * 0.34), Math.round(h * 0.5), [20, 160, 90]);
  for (let i = 0; i < 4; i++) {
    line(x + w * 0.14 + i * 8, y + h * 0.22, x + w * 0.14 + i * 8, y + h * 0.16, GOLD);
    line(x + w * 0.14 + i * 8, y + h * 0.72, x + w * 0.14 + i * 8, y + h * 0.78, GOLD);
  }
  drawText(x + w * 0.2, y + h * 0.4, "NV", 1, CREAM);
  ring(x + w * 0.72, y + h * 0.35, 12, CREAM);
  line(x + w * 0.72 + 9, y + h * 0.35 + 9, x + w * 0.72 + 18, y + h * 0.35 + 18, CREAM);
  line(x + w * 0.6, y + h * 0.7, x + w * 0.7, y + h * 0.78, RED);
  line(x + w * 0.7, y + h * 0.78, x + w * 0.8, y + h * 0.62, RED);
  line(x + w * 0.8, y + h * 0.62, x + w * 0.9, y + h * 0.8, RED);
}
function scenePodium(x: number, y: number, w: number, h: number): void {
  // Podium, microphone, chip and two figures shaking hands.
  rect(x, y, w, h, [190, 200, 210]);
  rect(x + w * 0.3, y + h * 0.55, Math.round(w * 0.4), Math.round(h * 0.3), [90, 70, 50]);
  rect(x + w * 0.3, y + h * 0.5, Math.round(w * 0.4), 6, [120, 95, 70]);
  disc(x + w * 0.5, y + h * 0.38, 4, INK);
  line(x + w * 0.5, y + h * 0.38, x + w * 0.5, y + h * 0.5, INK);
  person(x + w * 0.18, y + h * 0.5, 16, BLUE); person(x + w * 0.82, y + h * 0.5, 16, RED);
  line(x + w * 0.22, y + h * 0.58, x + w * 0.78, y + h * 0.58, INK);
  rect(x + w * 0.62, y + h * 0.12, 16, 12, [20, 160, 90]);
  disc(x + w * 0.2, y + h * 0.2, 6, GOLD);
}

// ---------- stories: all dated 24 November 2026 ----------
// Lead + 2 features + 20 grid + 12 brief = 35 dated stories, 7 regions.
interface Story { h: string; s: string; src: string; scene: Scene; }

const LEAD: Story = {
  h: "ZELENSKY WARNS OF NEW RUSSIAN STRIKES",
  s: "Ukraine's president says intelligence shows Russia is preparing fresh attacks, and urges the US and allies to speed up air defences as nightly barrages go on.",
  src: "Arab News / Reuters",
  scene: sceneLead,
};

const FEATURES: Story[] = [
  {
    h: "CONGRESSMAN GOMEZ TO QUIT AFTER ETHICS FINDING",
    s: "Democrat Jimmy Gomez of California will resign from Congress on 1 December after the House Ethics panel found evidence of sexual misconduct.",
    src: "Associated Press",
    scene: sceneCapitol,
  },
  {
    h: "STORMS THREATEN MESSY THANKSGIVING TRAVEL",
    s: "Heavy rain, high winds and airline glitches are set to snarl the busiest travel week of the year across the United States.",
    src: "Associated Press",
    scene: sceneStorm,
  },
];

const GRID: Story[] = [
  { h: "DRONES HIT HOMES, UN BUILDING IN SUDAN", s: "Drone strikes hit homes and a UN building in Khartoum.", src: "Agence France-Presse", scene: sceneSudan },
  { h: "MODI OPENS AI CENTRE AT IIT PATNA", s: "India's PM opens an AI centre and a research park in Bihar.", src: "Times of India", scene: sceneAI },
  { h: "INDIA, CHINA GENERALS MEET IN ARUNACHAL", s: "Generals meet to ease border tensions in the Himalayas.", src: "Times of India", scene: sceneTalks },
  { h: "RUSSIAN SHIP ABLAZE AFTER DRONE HIT", s: "Cargo ship Sparta II ablaze in the Gulf of Finland.", src: "Times of India", scene: sceneShip },
  { h: "MORE BODIES FOUND IN INDONESIA FACTORY", s: "More victims found in factory blaze; dozens missing.", src: "Associated Press", scene: sceneFactory },
  { h: "LEGO PICKS PORTUGAL FOR 8TH FACTORY", s: "Toymaker chooses Portugal for its eighth plant worldwide.", src: "Associated Press", scene: sceneLego },
  { h: "WHO CHIEF PLEADS FOR PEACE IN EBOLA AREA", s: "Health chief urges calm in DR Congo's Ebola-hit east.", src: "Associated Press", scene: sceneWHO },
  { h: "TRUMP VOWS 10% CREDIT-CARD CAP", s: "President vows to cap card interest rates at 10%.", src: "Associated Press", scene: sceneCard },
  { h: "TAIWAN WARNS CANADA OVER CHINA TIES", s: "Taipei cautions Ottawa over deeper ties with Beijing.", src: "Associated Press", scene: sceneFlags },
  { h: "11 DEAD AFTER TAINTED ALCOHOL IN MANIPUR", s: "Eleven die in Manipur after drinking tainted liquor.", src: "Associated Press", scene: sceneBottle },
  { h: "HOUTHIS STRIKE SAUDI CAPITAL", s: "Houthis launch revenge strikes on Riyadh.", src: "Associated Press", scene: sceneMissile },
  { h: "6.7 QUAKE HITS PERU, NO DEATHS REPORTED", s: "Strong quake shakes Peru; no deaths reported.", src: "Associated Press", scene: sceneQuake },
  { h: "JEWELLER PAOLO BULGARI DIES AT 89", s: "Italian jeweller who built a global luxury brand dies.", src: "Associated Press", scene: sceneJewel },
  { h: "AI SOLVED A MATHS HOLY GRAIL, WORKER SAYS", s: "Anthropic worker claims AI cracked a maths problem.", src: "Associated Press", scene: sceneMaths },
  { h: "TRUMP ORDERS CONTRACTORS TO CHECK FIRST", s: "Contractors must clear Congress replies with White House.", src: "Associated Press", scene: sceneDoc },
  { h: "EX-UK PM: MOVE ON FROM BREXIT", s: "Ex-PM tells his successor: time to move on from Brexit.", src: "Associated Press", scene: sceneBen },
  { h: "KIM VISITS FACTORIES AFTER TRUMP SNUB", s: "Kim tours factories as US outreach goes unanswered.", src: "Associated Press", scene: sceneFactory2 },
  { h: "PENTAGON TO CURB US-CANADA DEFENCE TIES", s: "Pentagon moves to restrict defence ties with Canada.", src: "Associated Press", scene: scenePentagon },
  { h: "NVIDIA FACES US ACCOUNTING PROBE", s: "Nvidia faces a US accounting probe, media report.", src: "Associated Press", scene: sceneChip },
  { h: "VANCE TAPPED AS TRUMP ENVOY TO NVIDIA", s: "Vance named Trump's emissary to Nvidia's board.", src: "Associated Press", scene: scenePodium },
];

const BRIEF: string[] = [
  "1. INDIA-NZ FIRST TEST DRAWN AT WELLINGTON - Times of India",
  "2. GUKESH DEFENDS CHESS CROWN VS SINDAROV IN GENEVA - Times of India",
  "3. BAY AREA FLOOD WATCH: KING TIDES, EL NINO - Associated Press",
  "4. CONCORDIA FAMILIES SLAM SCHETTINO EARLY RELEASE - Associated Press",
  "5. TINUBU ADMITS VILLA HIT BY POWER, WATER CUTS - Associated Press",
  "6. TRUMP SIGNALS HEALTHCARE DEAL WITH DEMOCRATS - Associated Press",
  "7. ROCKY MOUNTAIN NUTRITION RECALLS WORKOUT POWDERS - Associated Press",
  "8. UN CHIEF: AI RISK FRAMEWORK WITHIN A YEAR - Associated Press",
  "9. NEPAL PM IN INDIA FOR ECONOMY, ENERGY TALKS - Associated Press",
  "10. THAI COURT UPHOLDS VERDICT ON OPPOSITION MP - Associated Press",
  "11. THOUSANDS PROTEST TURKEY MEDIA CLOSURES - Associated Press",
  "12. MACRON EYES CONSTITUTION CHANGE TO CURB SPENDING - Associated Press",
];

// Big stories deliberately LEFT OUT: they are NOT 24 November news.
const DATECHECK: string[] = [
  "COP31 CLIMATE TALKS COLLAPSE - 22 NOV",
  "NVIDIA REINSTATES HUANG AS CEO - 23 NOV",
  "KYIV REGION STRIKES KILL 14 - 23 NOV",
  "GROK LAWSUITS FILED IN VIRGINIA, OREGON - 23 NOV",
  "CROWDSTRIKE BUYS ZSCALER, $44BN - 23 NOV",
  "US-SYRIA TRAINING TALKS REPORTED - 23 NOV",
  "RUSSIAN CORVETTE 'SUNK' OFF LIBYA - 23 NOV",
  "ALCARAZ WINS MAIDEN ATP FINALS - 22 NOV",
  "BEPICOLOMBO ENTERS MERCURY ORBIT - 22 NOV",
  "NIGERIA BOAT ACCIDENT KILLS 24 - 23 NOV",
  "HANSON FACES TEST IN VICTORIA VOTE - 23 NOV",
  "INDONESIA FACTORY FIRE FIRST TOLL 24 - 23 NOV",
  "DEMOCRATS' NORTH CAROLINA WIN - 23 NOV",
  "MILEY CYRUS WEDS MAXX MORANDO - 23 NOV",
  "EU REJECTS COP31 DEAL - 22 NOV",
];

const REGIONS = "NORTH AMERICA  \u2022  EUROPE  \u2022  MIDDLE EAST  \u2022  AFRICA  \u2022  SOUTH ASIA  \u2022  EAST ASIA & PACIFIC  \u2022  LATIN AMERICA";
const TOTAL = 1 + FEATURES.length + GRID.length + BRIEF.length; // 35

// ---------- page layout ----------
function drawPage(): void {
  rect(0, 0, W, H, PAPER);
  speckle(0, 0, W, H, 7, [228, 218, 196], 2600);
  // Top rules and masthead.
  rect(0, 0, W, 6, INK);
  drawTextC(0, 14, W, "THE TUESDAY GLOBE", 4, INK);
  hline(16, 44, W - 32, INK);
  drawTextC(0, 50, W, "TUESDAY, 24 NOVEMBER 2026", 2, RED);
  drawTextC(0, 72, W, TOTAL + " DATED STORIES  -  7 REGIONS  -  EVERY STORY BELOW HAPPENED OR WAS FIRST REPORTED TODAY", 1, INK);
  rect(0, 88, W, 3, INK);
  rect(16, 94, W - 32, 20, INK);
  drawTextC(16, 99, W - 32, REGIONS, 1, CREAM);
  hline(16, 118, W - 32, INK);

  // Lead story.
  const ly = 124, lh = 196;
  box(16, ly, W - 32, lh, INK);
  tag(24, ly + 8, "LEAD", RED);
  LEAD.scene(24, ly + 26, 300, lh - 34);
  box(24, ly + 26, 300, lh - 34, INK);
  const tx = 340;
  para(tx, ly + 12, W - 32 - tx + 8, LEAD.h, 2, INK, 18, 3);
  hline(tx, ly + 72, W - 32 - tx, RED);
  para(tx, ly + 82, W - 32 - tx + 8, LEAD.s, 1, INK2, 10, 8);
  drawText(tx, ly + lh - 22, "EUROPE  -  UKRAINE WAR", 1, TEAL);
  sourceLine(tx, ly + lh - 12, LEAD.src);

  // Feature band: two stories side by side.
  const fy = 328, fh = 164, fw = (W - 32 - 12) / 2;
  FEATURES.forEach((f, i) => {
    const fx = 16 + i * (fw + 12);
    box(fx, fy, fw, fh, INK);
    tag(fx + 8, fy + 6, "FEATURE " + (i + 1), BLUE);
    f.scene(fx + 8, fy + 22, fw - 16, 76);
    box(fx + 8, fy + 22, fw - 16, 76, INK);
    para(fx + 8, fy + 104, fw - 16, f.h, 1, INK, 9, 2);
    para(fx + 8, fy + 124, fw - 16, f.s, 1, INK2, 9, 2);
    sourceLine(fx + 8, fy + fh - 10, f.src);
  });

  // Grid: 20 illustrated stories, 5 columns x 4 rows. Every card inside bounds.
  const gy = 500, gh = 82, gw = 193, gap = 6;
  const gx0 = 16;
  GRID.forEach((g, i) => {
    const col = i % 5, row = Math.floor(i / 5);
    const cx = gx0 + col * (gw + gap);
    const cy = gy + row * (gh + 2);
    box(cx, cy, gw, gh, INK);
    g.scene(cx + 1, cy + 1, gw - 2, 32);
    hline(cx, cy + 33, gw, INK);
    para(cx + 4, cy + 37, gw - 8, g.h, 1, INK, 9, 2);
    para(cx + 4, cy + 57, gw - 8, g.s, 1, INK2, 9, 2);
    drawText(cx + 4, cy + gh - 8, g.src.toUpperCase(), 1, TEAL);
  });

  // The Day in Brief: 12 numbered one-liners, 2 columns.
  const by = 838;
  rect(16, by, W - 32, 92, PAPER2);
  box(16, by, W - 32, 92, INK);
  drawText(24, by + 6, "THE DAY IN BRIEF  -  12 MORE STORIES, ALL DATED 24 NOVEMBER 2026", 1, RED);
  hline(24, by + 18, W - 48, INK);
  BRIEF.forEach((b, i) => {
    const col = Math.floor(i / 6), row = i % 6;
    drawText(24 + col * 492, by + 24 + row * 11, b, 1, INK);
  });

  // DATE CHECK box: stories left out because they are NOT 24 November news.
  const dy = 936;
  rect(16, dy, W - 32, 72, [246, 232, 214]);
  box(16, dy, W - 32, 72, RED);
  drawText(24, dy + 5, "DATE CHECK  -  NOT TODAY, SO NOT HERE: BIG STORIES LEFT OUT ON PURPOSE", 1, RED);
  hline(24, dy + 17, W - 48, RED);
  DATECHECK.forEach((d, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    drawText(24 + col * 330, dy + 23 + row * 9, "\u2022 " + d, 1, INK2);
  });

  // Footer.
  drawTextC(0, 1012, W, "ALL STORIES DATED 24 NOVEMBER 2026  -  SOURCES NAMED IN TEXT  -  THE TUESDAY GLOBE", 1, INK2);
}

// ---------- PNG encoder ----------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- main ----------
function main(): void {
  drawPage();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const png = encodePNG();
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
  console.log("wrote entry.png " + png.length + " bytes, " + TOTAL + " stories");
}
main();

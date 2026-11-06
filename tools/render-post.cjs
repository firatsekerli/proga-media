#!/usr/bin/env node
/*
 * Renders a PROGA social post image from a template in templates/.
 *
 *   NODE_PATH=$(npm root -g) node tools/render-post.cjs <template> <data.json> <out.jpg>
 *
 * Templates (approved designs, 06.11.2026):
 *   gbp        1600x760   Google Business Profile post (guides and articles; never listings)
 *              data: eyebrow, headline, line, photo
 *   listing-1  1080x1350  Instagram listing carousel, slide 1 (the listing's cover photo)
 *              data: photo, tag ("SATILIK" / "KİRALIK"), eyebrow ("ÇANKAYA · AYRANCI"),
 *                    headline, facts [{value, label}] (exactly 4), price, listing_no
 *   listing-2  1080x1350  slide 2, details
 *              data: photo, rows [{label, value}] (6 or 8)
 *   listing-3  1080x1350  slide 3, slogan and contact
 *              data: photo, listing_no
 *
 * "headline": wrap the ONE word to show in bold italic in asterisks, e.g. "Elçi Caddesi'nde *3+1* daire".
 * "photo": a local file path (JPG or PNG). Every listing slide uses the same 640 px photo height,
 * anchored bottom right so the PROGA watermark on listing photos is never trimmed.
 * Prints OK and the output size. Needs Playwright with Chromium (pre-installed in agent sessions).
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const [tpl, dataPath, outPath] = process.argv.slice(2);
if (!tpl || !dataPath || !outPath) {
  console.error('usage: render-post.cjs <template> <data.json> <out.jpg>');
  process.exit(2);
}
const dir = path.join(__dirname, '..', 'templates');
const tplFile = path.join(dir, tpl + '.html');
if (!fs.existsSync(tplFile)) { console.error('unknown template: ' + tpl); process.exit(2); }
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const em = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

const vals = {};
for (const [k, v] of Object.entries(data)) {
  if (k === 'photo') {
    const p = path.resolve(path.dirname(dataPath), v);
    if (!fs.existsSync(p)) { console.error('photo not found: ' + p); process.exit(1); }
    vals.photo = pathToFileURL(p).href;
  } else if (k === 'headline') {
    vals.headline = em(v);
  } else if (k === 'facts') {
    if (!Array.isArray(v) || v.length !== 4) { console.error('facts must have exactly 4 items'); process.exit(1); }
    vals.facts = v.map((f) => `<div><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join('');
  } else if (k === 'rows') {
    vals.rows = v.map((r) => `<div><span>${esc(r.label)}</span>${esc(r.value)}</div>`).join('');
  } else {
    vals[k] = esc(v);
  }
}
let html = fs.readFileSync(tplFile, 'utf8');
const missing = [];
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (vals[k] === undefined) { missing.push(k); return ''; }
  return vals[k];
});
if (missing.length) { console.error('missing data: ' + [...new Set(missing)].join(', ')); process.exit(1); }

const tmp = path.join(dir, `.render-${process.pid}.html`);
fs.writeFileSync(tmp, html);
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1700, height: 1500 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src));
    if (broken.length) throw new Error('image did not load: ' + broken.join(', '));
    const el = await page.$('#post');
    await el.screenshot({ path: outPath, type: 'jpeg', quality: 90 });
    const box = await el.boundingBox();
    console.log(`OK ${outPath} ${Math.round(box.width)}x${Math.round(box.height)}`);
  } finally {
    await browser.close();
    fs.unlinkSync(tmp);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });

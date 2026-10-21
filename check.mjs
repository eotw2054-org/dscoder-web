#!/usr/bin/env node
// Screenshot every page at every width, and fail if any of them overflows
// sideways. This is not a build step -- the site is the files you see, and
// nothing here runs before it is served. It exists because the one bug this
// layout actually has is horizontal overflow at 390, and that bug is
// invisible in the markup: scrollWidth === clientWidth is the only way to
// know. A person still has to look at the pictures for everything else.
//
//   node check.mjs                 shots into ./_shots, exits non-zero on overflow
//   node check.mjs --out DIR       put the PNGs somewhere else
//   node check.mjs --root DIR      check a different directory of pages
//
// Nothing is installed: a static server from node:http, and Chrome over CDP
// with node's own fetch and WebSocket -- the same approach as dscoder's own
// desktop/_cdp.mjs.

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGES = ['index.html', 'download.html'];
const WIDTHS = [1360, 390];

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const OUT = resolve(arg('--out', join(HERE, '_shots')));
const ROOT = resolve(arg('--root', HERE));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
};

function serve(root) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    const file = join(root, path === '/' ? '/index.html' : path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

function chrome() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('no Chrome found; edit the candidates list in check.mjs');
  return found;
}

async function cdp(port) {
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      // type === 'page' matters: an installed extension's background page is
      // also in this list and also has a debugger URL, and attaching to that
      // one gets you a connection that accepts every command and answers
      // none of them.
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch { /* not up yet */ }
    if (!target) await new Promise((r) => setTimeout(r, 200));
  }
  if (!target) throw new Error(`no debugger target on ${port}`);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, no) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => no(new Error('debugger refused')), { once: true });
  });
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) {
      const { ok, no } = waiting.get(m.id);
      waiting.delete(m.id);
      m.error ? no(new Error(m.error.message)) : ok(m.result);
    }
  });
  const send = (method, params = {}) => new Promise((ok, no) => {
    const n = ++id;
    waiting.set(n, { ok, no });
    ws.send(JSON.stringify({ id: n, method, params }));
    setTimeout(() => { if (waiting.delete(n)) no(new Error(method + ' timed out')); }, 30000);
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { send, evaluate, close: () => ws.close() };
}

const server = await serve(ROOT);
const origin = `http://127.0.0.1:${server.address().port}`;
await mkdir(OUT, { recursive: true });

const port = 9400 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), 'dscoder-web-shots-' + process.pid);
const browser = spawn(chrome(), [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank',
], { stdio: 'ignore' });

const failures = [];
try {
  const page = await cdp(port);
  await page.send('Page.enable');
  for (const file of PAGES) {
    for (const width of WIDTHS) {
      const mobile = width < 700;
      const fold = mobile ? 844 : 900;   // the window, so "above the fold" means something
      await page.send('Emulation.setDeviceMetricsOverride', {
        width, height: fold, deviceScaleFactor: 1, mobile,
      });
      await page.send('Page.navigate', { url: `${origin}/${file}` });
      // Fonts first: the whole point of self-hosting them is that the layout
      // gets measured with the letterfit people will actually get.
      for (let i = 0; i < 60; i++) {
        const ready = await page.evaluate(
          'document.readyState === "complete" && document.fonts.status === "loaded"',
        ).catch(() => false);
        if (ready) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 250));

      const probe = await page.evaluate(`JSON.stringify({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        wide: [...document.querySelectorAll('body *')]
          .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 8)
          .map(el => el.tagName.toLowerCase()
                     + (el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : '')
                     + ' right=' + Math.round(el.getBoundingClientRect().right)),
        fonts: document.fonts.status,
      })`);
      const { scrollWidth, clientWidth, scrollHeight, wide, fonts } = JSON.parse(probe);
      const ok = scrollWidth === clientWidth;
      const stem = `_${file.replace('.html', '')}-${width}`;

      // The window as a reader gets it. What is above this line is the whole
      // argument for most people, so it is worth a picture of its own.
      const first = await page.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(OUT, `${stem}-fold.png`), Buffer.from(first.data, 'base64'));

      // Then the whole page. Growing the viewport to the page height is slower
      // than captureBeyondViewport but it does not hang, which that does here.
      await page.send('Emulation.setDeviceMetricsOverride', {
        width, height: Math.min(scrollHeight, 20000), deviceScaleFactor: 1, mobile,
      });
      await new Promise((r) => setTimeout(r, 200));
      const whole = await page.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(OUT, `${stem}.png`), Buffer.from(whole.data, 'base64'));

      console.log(`${ok ? 'ok  ' : 'WIDE'} ${stem}  scrollWidth=${scrollWidth} clientWidth=${clientWidth} height=${scrollHeight} fonts=${fonts}`);
      if (!ok) {
        failures.push(`${file} @ ${width}: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`);
        wide.forEach((w) => console.log('       ' + w));
      }
    }
  }
  page.close();
} finally {
  browser.kill();
  server.close();
}

console.log('');
console.log(failures.length ? failures.join('\n') : 'no page overflows sideways');
process.exit(failures.length ? 1 : 0);

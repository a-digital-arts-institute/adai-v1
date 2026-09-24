// Real Chromium, deterministic in-memory HTTP responses, no external requests.
// Run: npm run test:browser (requires playwright install chromium).
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { fetchPage, newPolicy, closeBrowser } from '../dist/browser.js';

const requests = [];
const originalLookup = dns.lookup;
const originalRequest = http.request;
dns.lookup = async host => [{
  address: host === 'private.example' ? '10.0.0.1' : '93.184.216.34', family: 4,
}];
http.request = (url, options, callback) => {
  requests.push(url.href);
  const req = new EventEmitter();
  req.end = () => {
    const res = new PassThrough();
    res.statusCode = 200;
    res.headers = { 'content-type': 'text/html' };
    let body = '';
    if (url.pathname === '/robots.txt') {
      res.headers = { 'content-type': 'text/plain' };
    } else if (url.pathname === '/start') {
      res.statusCode = 302;
      res.headers = { location: '/works/', 'set-cookie': ['warm=1; Path=/; HttpOnly'] };
    } else if (url.pathname === '/works/') {
      assert.match(options.headers.cookie, /warm=1/);
      body = `<html><head><title>Smoke</title></head><body><main>
        <h1>Initial</h1><p>${'A real artwork description. '.repeat(12)}</p>
        <script src="script.js"></script>
        <script src="http://private.example/pwn"></script>
        <a href="detail">Detail</a></main></body></html>`;
    } else if (url.pathname === '/artists') {
      // Fellowship's shape: a styled <div> heading (no heading tag), a real
      // <h2>, names in a grid of divs, then a list with estates.
      body = `<html><head><title>Artists</title><style>body{font-size:16px}.big{font-size:28px;font-weight:600}</style></head><body><main>
        <h1>Artists</h1>
        <div class="big">Fellowship Artists</div>
        <div class="grid"><div><a href="/a/chung">Sougwen Chung</a></div><div><a href="/a/gerrard">John Gerrard</a></div></div>
        <h2>Exhibited Artists</h2>
        <ul><li>August Sander (Estate)</li><li>Guy Bourdin (Estate)</li><li>Vera Molnár</li></ul>
        <h2>All Artists</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr"><a href="/a/1">Mika Ben Amar</a><a href="/a/2">Chia Amisola</a><a href="/a/3">Kim Asendorf</a></div>
        <p>${'Our roster spans the field. '.repeat(10)}</p></main></body></html>`;
    } else if (url.pathname === '/works/script.js') {
      res.headers = { 'content-type': 'application/javascript' };
      body = 'document.querySelector("h1").textContent="JavaScript rendered";';
    } else {
      res.statusCode = 404;
    }
    callback(res);
    res.end(body);
  };
  return req;
};

try {
  const root = 'http://public.example/start';
  const page = await fetchPage(root, newPolicy(root, { maxPages: 5 }));
  assert.equal(page.via, 'browser');
  assert.equal(page.final_url, 'http://public.example/works/');
  assert.match(page.text, /JavaScript rendered/);
  assert.ok(page.links.some(link => link.href === 'http://public.example/works/detail'));
  assert.ok(!requests.some(url => url.includes('private.example')));
  console.log('PASS: Chromium redirect, cookie, JavaScript, relative links, and private subresource blocking');

  // Structure survives: headings (tagged or only styled) and list items.
  const roster = await fetchPage('http://public.example/artists', newPolicy(root, { maxPages: 5 }));
  assert.match(roster.text, /^#{1,3} Fellowship Artists$/m, roster.text);
  assert.match(roster.text, /^## Exhibited Artists$/m, roster.text);
  assert.match(roster.text, /^- August Sander \(Estate\)$/m, roster.text);
  const fellows = roster.text.slice(roster.text.indexOf("Fellowship Artists"), roster.text.indexOf("Exhibited Artists"));
  assert.match(fellows, /Sougwen Chung[\s\S]*John Gerrard/);
  assert.doesNotMatch(fellows, /August Sander/);
  // a grid of links: one name per line, never "Mika Ben AmarChia Amisola"
  assert.match(roster.text, /^Mika Ben Amar$/m, roster.text);
  assert.match(roster.text, /^Chia Amisola$/m);
  console.log('PASS: headings (tagged and styled) and list items survive into the page text');

  const viewed = await fetchPage('http://public.example/artists', newPolicy(root, { maxPages: 5 }), { view: true });
  const jpeg = Buffer.from(viewed.screenshot ?? '', 'base64');
  assert.ok(jpeg.length > 1000 && jpeg[0] === 0xff && jpeg[1] === 0xd8, 'a JPEG screenshot');
  assert.equal(roster.screenshot, undefined, 'no screenshot unless asked');
  console.log(`PASS: view:true returns a ${Math.round(jpeg.length / 1024)} KiB screenshot`);
} finally {
  await closeBrowser();
  dns.lookup = originalLookup;
  http.request = originalRequest;
}

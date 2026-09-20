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
} finally {
  await closeBrowser();
  dns.lookup = originalLookup;
  http.request = originalRequest;
}

import { it } from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { guardBrowserRoute, siteOutline, isPrivateIp } from '../src/browser.js';
import { systemPrompt } from '../src/prompt.js';
import { readFileSync } from 'node:fs';

it('embeds the complete canonical editorial context and current surface adapter', () => {
  const prompt = systemPrompt();
  for (const name of ['relational-intelligence-protocol.md', 'gatherer.md']) {
    assert.ok(prompt.includes(readFileSync(new URL('../../claude/skills/' + name, import.meta.url), 'utf8')));
  }
  assert.match(prompt, /URL INTAKE ADAPTER/);
});

it('blocks private DNS subresources, mapped literals and robots redirects before connection', async (t) => {
  const requests: string[] = [];
  t.mock.method(dns, 'lookup', async (host: string) => [{ address: host === 'private.example' ? '10.0.0.1' : '93.184.216.34', family: 4 }]);
  t.mock.method(http, 'request', (url: URL, _options: any, callback: any) => {
    requests.push(url.href);
    const req = new EventEmitter() as any;
    req.end = () => {
      const res = new PassThrough() as any;
      res.statusCode = 302; res.headers = { location: 'http://[::ffff:7f00:1]/secret' };
      callback(res); res.end();
    };
    return req;
  });
  const route = (url: string) => ({
    request: () => ({ url: () => url, resourceType: () => 'script', method: () => 'GET', postDataBuffer: () => null, allHeaders: async () => ({}), frame: () => ({ page: () => ({ context: () => ({ cookies: async () => [], addCookies: async () => {} }) }) }) }),
    abort: async () => { aborted++; },
    fulfill: async () => { assert.fail('unsafe response was fulfilled'); },
  }) as any;
  let aborted = 0;
  await guardBrowserRoute(route('http://private.example/script.js'));
  await guardBrowserRoute(route('http://[::ffff:127.0.0.1]/'));
  await guardBrowserRoute(route('http://public.example/redirect'));
  assert.equal(aborted, 3);
  assert.deepEqual(requests, ['http://public.example/redirect']);
  assert.equal(await siteOutline('http://public.example/'), null);
  assert.ok(requests.some(u => u.endsWith('/robots.txt')));
  assert.ok(requests.every(u => new URL(u).hostname === 'public.example'));
  assert.equal(isPrivateIp('::ffff:a9fe:a9fe'), true);
});

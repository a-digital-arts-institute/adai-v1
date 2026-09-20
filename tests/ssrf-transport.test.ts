import { it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { safeFetch, checkUrlSyntax, isPrivateIp } from '../src/utils/ssrf.js';

it('blocks canonical and expanded IPv4-mapped private addresses', async () => {
  for (const ip of ['::ffff:127.0.0.1', '::ffff:7f00:1', '0:0:0:0:0:ffff:a9fe:a9fe']) {
    assert.equal(isPrivateIp(ip), true);
    assert.throws(() => checkUrlSyntax(`http://[${ip}]/`));
    await assert.rejects(safeFetch(`http://[${ip}]/`), (e: any) => e.code === 'private_host');
  }
  assert.equal(isPrivateIp('::ffff:808:808'), false);
});

it('pins DNS, validates redirects before connection and caps streamed bodies', async (t) => {
  const requests: string[] = [];
  let response: { statusCode: number; headers: Record<string, string>; body: string } = {
    statusCode: 302, headers: { location: 'http://[::ffff:127.0.0.1]/secret' }, body: '',
  };
  t.mock.method(http, 'request', (url: URL, options: any, callback: any) => {
    requests.push(url.href);
    options.lookup(url.hostname, { all: true }, (err: any, addresses: any) => {
      assert.equal(err, null);
      assert.deepEqual(addresses, [{ address: '93.184.216.34', family: 4 }]);
    });
    const req = new EventEmitter() as any;
    req.end = () => {
      const res = new PassThrough() as any;
      res.statusCode = response.statusCode; res.headers = response.headers;
      callback(res); res.end(response.body);
    };
    return req;
  });
  let lookups = 0;
  const lookup = (async () => { lookups++; return [{ address: '93.184.216.34', family: 4 }]; }) as any;
  await assert.rejects(safeFetch('http://public.example/', { lookup }), (e: any) => e.code === 'private_host');
  assert.deepEqual(requests, ['http://public.example/']);
  assert.equal(lookups, 1);
  response = { statusCode: 200, headers: { 'content-type': 'text/plain' }, body: 'too much' };
  await assert.rejects(safeFetch('http://public.example/', { lookup, maxBytes: 3 }), (e: any) => e.code === 'too_large');
  const ok = await safeFetch('http://public.example/', { lookup });
  assert.equal(ok.bytes.toString(), 'too much');
  assert.equal(ok.content_type, 'text/plain');
});

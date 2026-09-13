// The one SSRF guard (docs/URL-INTAKE-SPEC.md §15) — private ranges,
// schemes, blocked hostnames, DNS resolution to private, image sniffing.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPrivateIp, checkUrlSyntax, assertPublicHost, sniffImageMime, SsrfError } from "../src/utils/ssrf.js";

describe("ssrf guard", () => {
  it("classifies private and public IPs", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.9", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::ffff:127.0.0.1", "fd00::1", "fe80::1"]) {
      assert.equal(isPrivateIp(ip), true, ip);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"]) {
      assert.equal(isPrivateIp(ip), false, ip);
    }
    assert.equal(isPrivateIp("garbage"), true);
  });

  it("rejects bad schemes, credentials, blocked hostnames, literal private hosts", () => {
    for (const u of ["file:///etc/passwd", "ftp://x.example/", "javascript:alert(1)", "http://user:pw@x.example/", "http://localhost/", "http://foo.localhost/", "http://adai-basel.internal/", "http://metadata.google.internal/", "http://169.254.169.254/latest", "http://[::1]/", "not a url"]) {
      assert.throws(() => checkUrlSyntax(u), SsrfError, u);
    }
    assert.equal(checkUrlSyntax("https://Example.org/a?b#c").hostname, "example.org");
  });

  it("refuses hosts that resolve to private addresses (any address)", async () => {
    const lookupPrivate = (async () => [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.5", family: 4 }]) as any;
    await assert.rejects(assertPublicHost(new URL("https://mixed.example/"), lookupPrivate), (e: any) => e.code === "private_host");
    const lookupPublic = (async () => [{ address: "93.184.216.34", family: 4 }]) as any;
    await assertPublicHost(new URL("https://ok.example/"), lookupPublic);
    const lookupFail = (async () => { throw new Error("ENOTFOUND"); }) as any;
    await assert.rejects(assertPublicHost(new URL("https://nope.example/"), lookupFail), (e: any) => e.code === "dns_failed");
  });

  it("sniffs image magic bytes", () => {
    assert.equal(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), "image/jpeg");
    assert.equal(sniffImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), "image/png");
    assert.equal(sniffImageMime(Buffer.from("GIF89a" + "\0".repeat(8))), "image/gif");
    assert.equal(sniffImageMime(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
    assert.equal(sniffImageMime(Buffer.from("<html><body>hi</body></html>")), null);
    assert.equal(sniffImageMime(Buffer.from([1, 2, 3])), null);
  });
});

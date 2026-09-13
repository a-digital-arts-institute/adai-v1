// Pure helpers of the page fetcher: SSRF classification, same-site policy,
// the plain-HTML text fallback. No Chromium.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPrivateIp, checkUrl, registrable, sameSite, htmlToText, FetchRefused } from "../src/browser.js";

describe("worker ssrf", () => {
  it("private ranges", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.5.5", "192.168.0.1", "169.254.169.254", "100.64.1.1", "::1", "fd12::1", "fe80::1", "::ffff:10.0.0.1"]) assert.equal(isPrivateIp(ip), true, ip);
    for (const ip of ["8.8.8.8", "93.184.216.34", "2606:4700::1"]) assert.equal(isPrivateIp(ip), false, ip);
  });
  it("checkUrl refuses schemes, creds, local names, literal private hosts", () => {
    for (const u of ["file:///x", "http://localhost/", "http://a.internal/", "http://u:p@x.example/", "http://10.1.1.1/", "http://[::1]/"]) assert.throws(() => checkUrl(u), FetchRefused, u);
    assert.equal(checkUrl("https://Reas.com/works").hostname, "reas.com");
  });
});

describe("same-site policy", () => {
  it("registrable domain, www stripped, co.uk aware", () => {
    assert.equal(registrable("www.reas.com"), "reas.com");
    assert.equal(registrable("shop.reas.com"), "reas.com");
    assert.equal(registrable("gallery.example.co.uk"), "example.co.uk");
    assert.equal(sameSite("https://www.reas.com/a", "https://reas.com/"), true);
    assert.equal(sameSite("https://instagram.com/reas", "https://reas.com/"), false);
  });
});

describe("htmlToText", () => {
  it("strips scripts/styles, keeps text, lists links and images", () => {
    const html = `<html><head><title> My  Site </title><style>p{}</style></head><body><script>alert(1)</script>
      <h1>Works</h1><p>Process 4, 2005 &amp; software.</p>
      <a href="/works/p4">Process 4</a> <a href="#top">top</a>
      <img src="/img/p4.jpg" alt="Process 4" width="1200" height="800">
      <img data-src="/img/lazy.png"></body></html>`;
    const x = htmlToText(html);
    assert.equal(x.title, "My Site");
    assert.match(x.text, /Works/);
    assert.match(x.text, /Process 4, 2005 & software\./);
    assert.doesNotMatch(x.text, /alert/);
    assert.deepEqual(x.links, [{ href: "/works/p4", text: "Process 4" }]);
    assert.equal(x.images.length, 2);
    assert.deepEqual(x.images[0], { src: "/img/p4.jpg", alt: "Process 4", w: 1200, h: 800 });
  });
});

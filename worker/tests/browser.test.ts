// Pure helpers of the page fetcher: SSRF classification, same-site policy,
// the plain-HTML text fallback. No Chromium.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPrivateIp, checkUrl, registrable, sameSite, htmlToText, checkPolicy, newPolicy, FetchRefused, chromeUa, looksBlocked, outlineFromUrls } from "../src/browser.js";

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

describe("fetch policy (no network)", () => {
  it("same-site always allowed (subdomains too), page cap enforced", () => {
    const p = newPolicy("https://artist.example/", { maxPages: 2 });
    assert.deepEqual(checkPolicy(new URL("https://work.artist.example/x"), p), { offsite: false });
    p.pagesFetched = 2;
    assert.throws(() => checkPolicy(new URL("https://artist.example/y"), p), (e: any) => e.code === "page_cap");
  });
  it("off-site only when the site linked to it, one hop, own cap", () => {
    const p = newPolicy("https://artist.example/", { maxPages: 10, maxOffsite: 1 });
    assert.throws(() => checkPolicy(new URL("https://objkt.com/tokens/1"), p), (e: any) => e.code === "off_site");
    p.offsiteAllowed.add("https://objkt.com/tokens/1");
    assert.deepEqual(checkPolicy(new URL("https://objkt.com/tokens/1#foo"), p), { offsite: true });
    p.offsiteFetched = 1;
    assert.throws(() => checkPolicy(new URL("https://objkt.com/tokens/1"), p), (e: any) => e.code === "offsite_cap");
  });
});

describe("reading as a browser", () => {
  it("the UA is a plain Chrome for the platform we run on — no bot token, no HeadlessChrome", () => {
    const ua = chromeUa("153.0.8010.12", "linux");
    assert.equal(ua, "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36");
    assert.match(chromeUa("153.0.1.2", "darwin"), /Macintosh/);
    assert.doesNotMatch(ua, /headless|adai|bot|compatible/i);
  });
  it("a refusal or an interstitial is never page content", () => {
    assert.equal(looksBlocked(403, "403 - Forbidden", "Access to this page is forbidden."), true);
    assert.equal(looksBlocked(429, null, ""), true);
    assert.equal(looksBlocked(200, "Just a moment...", "Checking your browser before accessing the site."), true);
    assert.equal(looksBlocked(200, "Artists", "Harm van den Dorpel\nVera Molnar"), false);
    assert.equal(looksBlocked(404, "Not found", "Nothing here."), false);
    // a long real page that merely mentions a captcha is content
    assert.equal(looksBlocked(200, "Essay", "captcha ".padEnd(4000, "x")), false);
  });
});

describe("site outline", () => {
  it("groups sitemap URLs by section, keeps top-level index pages, drops other sites", () => {
    const root = "https://interfacegallery.io/";
    const urls = [
      ...Array.from({ length: 20 }, (_, i) => `https://www.interfacegallery.io/artist/a-${i}/`),
      ...Array.from({ length: 6 }, (_, i) => `https://www.interfacegallery.io/exposition/e-${i}/`),
      "https://www.interfacegallery.io/artists/",
      "https://www.interfacegallery.io/expositions/",
      "https://www.interfacegallery.io/about/",
      "https://www.interfacegallery.io/artists", // duplicate of /artists/
      "https://elsewhere.example/artist/x/",
    ];
    const o = outlineFromUrls(urls, root)!;
    assert.match(o, /urls="29"/);
    assert.match(o, /www\.interfacegallery\.io\/artist\/ — 20 pages/);
    assert.match(o, /www\.interfacegallery\.io\/exposition\/ — 6 pages/);
    assert.match(o, /https:\/\/www\.interfacegallery\.io\/expositions\//);
    assert.doesNotMatch(o, /elsewhere/);
    assert.ok(o.indexOf("/artist/ —") < o.indexOf("/exposition/ —"));
  });
  it("nothing useful → null", () => {
    assert.equal(outlineFromUrls([], "https://a.example/"), null);
    assert.equal(outlineFromUrls(["https://a.example/", "https://a.example/about"], "https://a.example/"), null);
  });
});

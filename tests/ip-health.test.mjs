import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../.worker-test/index.js";

const request = (query = "", headers = {}) =>
  new Request(`https://example.com/api/ip/health${query}`, { headers });

function assertSummaryFields(data) {
  assert.deepEqual(
    Object.keys(data).sort(),
    [
      "ip",
      "checked_at",
      "score",
      "status",
      "country",
      "country_code",
      "region",
      "city",
      "isp",
      "asn",
      "location",
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(data.location).sort(),
    ["country", "country_code", "region", "city", "isp"].sort(),
  );
  for (const [key, value] of Object.entries(data.location))
    assert.equal(data[key], value);
}

test("health API returns only the requested summary fields as uncached JSON", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "https://ip.net.coffee/api/ip/lookup/1.1.1.1");
    return Response.json({ ip: "1.1.1.1", trust_score: 75, is_vpn: false });
  });
  const response = await worker.fetch(
    request("", { "CF-Connecting-IP": "1.1.1.1" }),
    {},
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const data = await response.json();
  assert.equal(data.score, 75);
  assert.equal(data.status, "good");
  assertSummaryFields(data);
});

test("health score boundaries and unknown values match the UI", async (t) => {
  let score;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ ip: "1.1.1.1", trust_score: score }),
  );
  for (const [value, status] of [
    [0, "poor"],
    [44, "poor"],
    [45, "moderate"],
    [74, "moderate"],
    [75, "good"],
    [100, "good"],
    [null, "unknown"],
    [-1, "unknown"],
    [101, "unknown"],
    ["90", "unknown"],
    [undefined, "unknown"],
  ]) {
    score = value;
    const response = await worker.fetch(request("?ip=1.1.1.1"), {});
    const data = await response.json();
    assert.equal(data.status, status);
    assert.equal(data.score, status === "unknown" ? null : value);
  }
});

test("health text handles IPv6 and strips terminal control characters", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.match(url, /2606%3A4700%3A4700%3A%3A1111$/);
    return Response.json({
      ip: "2606:4700:4700:0:0:0:0:1111",
      isp: "Example\u001b[31m\nInjected",
      trust_score: 90,
    });
  });
  const response = await worker.fetch(
    request("?ip=2606:4700:4700::1111&format=text"),
    { LOCAL_DEV: "true" },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type"), /text\/plain/);
  const body = await response.text();
  assert.match(body, /score: 90\nstatus: good/);
  assert.ok(!body.includes("source: Net.Coffee"));
  assert.ok(!body.includes("\u001b"));
  assert.ok(!body.includes("\nInjected"));
});

test("health rejects invalid targets, local caller detection and rate limits before fetching", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not fetch");
  });
  for (const query of [
    "?ip=",
    "?ip=127.0.0.1",
    "?ip=https://example.com",
    "?ip=1.1.1.1&format=html",
  ])
    assert.equal((await worker.fetch(request(query), {})).status, 400);
  assert.equal((await worker.fetch(request(), {})).status, 503);
  assert.equal(
    (
      await worker.fetch(request("", { "CF-Connecting-IP": "1.1.1.1" }), {
        LOCAL_DEV: "true",
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await worker.fetch(request("?ip=1.1.1.1"), {
        API_LIMITER: { limit: async () => ({ success: false }) },
      })
    ).status,
    429,
  );
});

test("health reports mismatched, malformed and failed upstream responses", async (t) => {
  let response;
  t.mock.method(globalThis, "fetch", async () => response);
  for (const data of [{ ip: "8.8.8.8" }, {}, null]) {
    response = Response.json(data);
    assert.equal((await worker.fetch(request("?ip=1.1.1.1"), {})).status, 502);
  }
  response = new Response("private upstream body", { status: 429 });
  const result = await worker.fetch(request("?ip=1.1.1.1"), {});
  assert.equal(result.status, 429);
  assert.ok(!(await result.text()).includes("private upstream body"));
});

test("curl root returns caller location and honest unknown reputation when the provider rejects Workers", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    calls++;
    assert.equal(url, "https://ip.net.coffee/api/ip/lookup/1.1.1.1");
    return new Response("private rejection body", { status: 403 });
  });
  const req = new Request("https://example.com/", {
    headers: { "User-Agent": "curl/8.7.1", "CF-Connecting-IP": "1.1.1.1" },
  });
  Object.defineProperty(req, "cf", {
    value: {
      country: "AU",
      region: "Queensland",
      city: "Brisbane",
      asn: 13335,
      asOrganization: "Cloudflare",
    },
  });
  const response = await worker.fetch(req, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.text();
  assert.ok(body.endsWith("\n"));
  assert.ok(!body.includes("private rejection body"));
  const data = JSON.parse(body);
  assert.equal(data.ip, "1.1.1.1");
  assert.equal(data.location.country_code, "AU");
  assert.equal(data.location.region, "Queensland");
  assert.equal(data.asn, 13335);
  assert.equal(data.score, null);
  assert.equal(data.status, "unknown");
  assertSummaryFields(data);
  assert.equal(calls, 1);
});

test("explicit IP fallback uses its own geolocation and never the visitor metadata", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url === "https://ipwho.is/8.8.8.8")
      return Response.json({
        success: true,
        ip: "8.8.8.8",
        country: "United States",
        country_code: "US",
        region: "California",
        city: "Mountain View",
        connection: { isp: "Google", asn: 15169 },
      });
    assert.ok(
      [
        "https://ip.net.coffee/api/ip/lookup/8.8.8.8",
        "https://api.ip.sb/geoip/8.8.8.8",
      ].includes(url),
    );
    return new Response("blocked", { status: 403 });
  });
  const req = request("?ip=8.8.8.8", { "CF-Connecting-IP": "1.1.1.1" });
  Object.defineProperty(req, "cf", { value: { country: "AU", asn: 13335 } });
  const response = await worker.fetch(req, {});
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ip, "8.8.8.8");
  assert.equal(data.location.country_code, "US");
  assert.equal(data.asn, 15169);
  assert.equal(data.score, null);
  assert.equal(data.status, "unknown");
  assertSummaryFields(data);
});

test("fallback rejects mismatched addresses and ignores local Cloudflare placeholders", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.startsWith("https://ip.net.coffee/"))
      return new Response("blocked", { status: 403 });
    return Response.json({
      success: true,
      ip: "8.8.8.8",
      country: "wrong target",
    });
  });
  const req = request("?ip=1.1.1.1", { "CF-Connecting-IP": "1.1.1.1" });
  Object.defineProperty(req, "cf", { value: { country: "US", asn: 15169 } });
  const response = await worker.fetch(req, { LOCAL_DEV: "true" });
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("wrong target"));
});

test("browsers keep the page and JSON root requests retain rate limiting", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not fetch");
  });
  const browser = new Request("https://example.com/", {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  const page = await worker.fetch(browser, {
    ASSETS: { fetch: async () => new Response("SPA page") },
  });
  assert.equal(await page.text(), "SPA page");
  const cli = new Request("https://example.com/", {
    headers: { Accept: "application/json", "CF-Connecting-IP": "1.1.1.1" },
  });
  const denied = await worker.fetch(cli, {
    API_LIMITER: { limit: async () => ({ success: false }) },
  });
  assert.equal(denied.status, 429);
});

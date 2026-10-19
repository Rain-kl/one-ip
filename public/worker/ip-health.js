import { cfGeo, lookupGeo } from "./geo.js";
import { HttpError, publicIp, upstream } from "./http.js";

async function fallbackLocation(ip, request, env) {
  if (env.LOCAL_DEV !== "true") {
    const visitor = cfGeo(request);
    try {
      if (
        publicIp(visitor.ip) === ip &&
        [
          visitor.country,
          visitor.region,
          visitor.city,
          visitor.isp,
          visitor.asn,
        ].some((value) => value !== undefined && value !== null && value !== "")
      )
        return visitor;
    } catch {
      // Only use Cloudflare metadata when it belongs to the requested IP.
    }
  }
  try {
    const { sources } = await lookupGeo(ip);
    return sources.find((geo) => {
      try {
        return publicIp(geo.ip) === ip;
      } catch {
        return false;
      }
    });
  } catch {
    return undefined;
  }
}

export async function ipHealth(request, env) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  if (!["json", "text"].includes(format))
    throw new HttpError(400, "format 仅支持 json 或 text");
  const target = url.searchParams.get("ip");
  if (
    target === null &&
    (env.LOCAL_DEV === "true" || !request.headers.get("CF-Connecting-IP"))
  )
    throw new HttpError(
      503,
      "无法获取真实访客 IP，请指定 ip 参数或部署 Worker 后检测",
    );
  const ip = publicIp(target ?? request.headers.get("CF-Connecting-IP"));
  let data;
  try {
    data = await upstream(
      `https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(ip)}`,
      { redirect: "manual", headers: { Accept: "application/json" } },
    );
  } catch (error) {
    const geo = await fallbackLocation(ip, request, env);
    if (!geo) throw error;
    data = {
      ip,
      country: geo.country,
      countryCode: geo.country_code,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,
      asn: geo.asn,
    };
  }
  let returnedIp;
  try {
    returnedIp = publicIp(data?.ip);
  } catch {
    throw new HttpError(502, "IP 数据源返回的地址无效");
  }
  if (returnedIp !== ip) throw new HttpError(502, "IP 数据源返回的地址不匹配");
  const score =
    typeof data.trust_score === "number" &&
    Number.isFinite(data.trust_score) &&
    data.trust_score >= 0 &&
    data.trust_score <= 100
      ? data.trust_score
      : null;
  const reputationStatus =
    score === null
      ? "unknown"
      : score >= 75
        ? "good"
        : score >= 45
          ? "moderate"
          : "poor";
  const string = (value) => (typeof value === "string" ? value : null);
  const integer = (value) => (Number.isInteger(value) ? value : null);
  const location = {
    country: string(data.country),
    country_code: string(data.countryCode),
    region: string(data.region),
    city: string(data.city),
    isp: string(data.isp),
  };
  const asn = integer(data.asn);
  const result = {
    ip,
    checked_at: new Date().toISOString(),
    score,
    status: reputationStatus,
    ...location,
    asn,
    location,
  };
  if (format === "json") {
    return new Response(`${JSON.stringify(result, null, 2)}\n`, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  // Strip control characters from provider text before displaying it in a terminal.
  const display = (value) =>
    // eslint-disable-next-line no-control-regex -- Prevent terminal escape sequences in upstream values.
    String(value ?? "unknown").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
  const lines = [
    ["ip", result.ip],
    ["checked_at", result.checked_at],
    ["country", result.country],
    ["country_code", result.country_code],
    ["region", result.region],
    ["city", result.city],
    ["isp", result.isp],
    ["score", result.score],
    ["status", result.status],
    ["asn", result.asn],
  ].map(([key, value]) => `${key}: ${display(value)}`);
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

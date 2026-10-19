import { HttpError, json, publicIp, upstream } from "./http.js";

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
  const data = await upstream(
    `https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(ip)}`,
    { redirect: "manual" },
  );
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
  const flag = (value) => (typeof value === "boolean" ? value : null);
  const string = (value) => (typeof value === "string" ? value : null);
  const integer = (value) => (Number.isInteger(value) ? value : null);
  const flags = {
    residential: flag(data.isResidential),
    datacenter: flag(data.is_datacenter),
    mobile: flag(data.is_mobile),
    vpn: flag(data.is_vpn),
    proxy: flag(data.is_proxy),
    tor: flag(data.is_tor),
    crawler: flag(data.is_crawler),
    abuser: flag(data.is_abuser),
    bogon: flag(data.is_bogon),
  };
  const typeConflict = flags.residential === true && flags.datacenter === true;
  const classification =
    data.is_public_service === true
      ? "public_service"
      : typeConflict
        ? "conflicting"
        : flags.mobile
          ? "mobile"
          : flags.residential
            ? "residential"
            : flags.datacenter
              ? "datacenter"
              : "unknown";
  const registeredCountryCode = string(data.registered_country_code);
  const countryCode = string(data.countryCode);
  const threats = Array.isArray(data.intelligence?.threats)
    ? data.intelligence.threats.flatMap((threat) => {
        if (typeof threat === "string")
          return threat.trim()
            ? [{ label: threat.trim(), severity: null }]
            : [];
        if (threat && typeof threat.label === "string" && threat.label.trim())
          return [
            {
              label: threat.label.trim(),
              severity: string(threat.severity),
            },
          ];
        return [];
      })
    : [];
  const location = {
    country: string(data.country),
    country_code: countryCode,
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
    reputation: {
      score,
      status: reputationStatus,
      abuser_score: string(data.abuser_score),
    },
    ip_profile: {
      classification,
      registration: {
        country: string(data.registered_country),
        country_code: registeredCountryCode,
        location_matches_registration:
          data.is_public_service === true ||
          !countryCode ||
          !registeredCountryCode
            ? null
            : countryCode.toUpperCase() === registeredCountryCode.toUpperCase(),
      },
      public_service: flag(data.is_public_service),
      company: {
        name: string(data.company_name),
        type: string(data.company_type),
      },
      datacenter_name: string(data.datacenter_name),
      cidr: string(data.cidr),
      reverse_dns: string(data.rdns),
      threats,
      flags,
    },
    asn_details: {
      number: asn,
      organization: string(data.asOrganization),
      name: string(data.asname),
      kind: string(data.asn_kind),
      rpki_status: string(data.rpki_status),
      ipv4_count: integer(data.asn_ipv4_count),
      allocated: string(data.asn_allocated),
      estimated_capacity: string(data.asn_tbps),
    },
    flags,
  };
  if (format === "json") return json(result);
  // Strip control characters from provider text before displaying it in a terminal.
  const display = (value) =>
    // eslint-disable-next-line no-control-regex -- Prevent terminal escape sequences in upstream values.
    String(value ?? "unknown").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
  const lines = [
    ["ip", result.ip],
    ["checked_at", result.checked_at],
    ["country", result.country],
    ["country_code", result.location.country_code],
    ["region", result.region],
    ["city", result.city],
    ["isp", result.isp],
    ["score", result.score],
    ["status", result.status],
    ["classification", result.ip_profile.classification],
    ["registered_country", result.ip_profile.registration.country],
    ["registered_country_code", result.ip_profile.registration.country_code],
    ["cidr", result.ip_profile.cidr],
    ["reverse_dns", result.ip_profile.reverse_dns],
    ["asn", result.asn],
    ["asn_organization", result.asn_details.organization],
    ...Object.entries(result.flags),
  ].map(([key, value]) => `${key}: ${display(value)}`);
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

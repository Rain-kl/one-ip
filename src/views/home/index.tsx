import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { SiteLogo } from "@/components/site-logo";
import {
  ActionButton,
  IpText,
  Pending,
  PrivacyToggle,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UnderlineHover } from "@/components/underline-hover";
import { useAvailableTools } from "@/hooks/use-available-tools";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { t } from "@/i18n";
import { toolGroups } from "@/layout/routes";
import { companyTypeColors } from "@/lib/ip-badge-colors";
import { ipScoreColor } from "@/lib/ip-score";
import { BrowserSummary } from "@/views/browser/summary";
import { lookupIp } from "@/views/ip/api";
import { testConnectivity, type ProbeResult } from "@/views/link/api";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  Fingerprint,
  Network,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { getGeo, getBrowserIp, getDomesticIp } from "./api";
import "./home.css";
import { PlatformSummary } from "./platform-summary";
import { SplitResults } from "./split-results";

export function HomePage() {
  const mobile = useIsMobile();
  const browserTools = useAvailableTools("browser");
  const navigationGroups = [
    { label: t("网络检测"), icon: Network, tools: toolGroups.network },
    { label: t("浏览器检测"), icon: Fingerprint, tools: browserTools },
    { label: t("AI 检测"), icon: Sparkles, tools: toolGroups.ai },
    {
      label: t("服务状态"),
      icon: Activity,
      tools: [
        { path: "/status/", label: t("全部服务") },
        { path: "/status/openai", label: "OpenAI" },
        { path: "/status/claude", label: "Claude" },
      ],
    },
  ];
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    const filters = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        [
          "home-domestic-ip",
          "browser-ip",
          "split",
          "geoip",
          "lookup-ip-coffee",
          "connectivity",
          "connectivity-progress",
          "ai-preview",
          "service-status",
          "home-dns",
          "home-webrtc",
          "webrtc-diagnostic",
          "home-browser-fingerprint",
        ].includes(String(query.queryKey[0])),
    };
    try {
      await client.cancelQueries(filters);
      await client.resetQueries(filters);
    } finally {
      setRefreshing(false);
    }
  };
  const connectivity = useQueries({
    queries: homeTargets.map((target) => ({
      queryKey: ["connectivity", target.url, 0],
      enabled: false,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        testConnectivity(target.url, signal, (result) =>
          client.setQueryData(["connectivity-progress", target.url, 0], result),
        ),
      retry: false,
      staleTime: 60_000,
    })),
  });
  const orderedTargets = homeTargets.map((target, index) => ({
    target,
    query: connectivity[index],
  }));
  if (
    connectivity.every(
      (query) => !query.isFetching && (query.isSuccess || query.isError),
    )
  ) {
    orderedTargets.sort((a, b) => {
      const left =
        (a.query.data as ProbeResult | undefined)?.median ?? Infinity;
      const right =
        (b.query.data as ProbeResult | undefined)?.median ?? Infinity;
      return left - right;
    });
  }

  const connectivityRef = useSortAnimation(
    `${mobile}-${orderedTargets.map(({ target }) => target.name).join("|")}`,
  );
  useEffect(() => {
    document.title = "One Ping";
  }, []);
  const probes = useQueries({
    queries: [
      {
        queryKey: ["home-domestic-ip", 3],
        retry: false,
        queryFn: ({ signal }: { signal: AbortSignal }) => getDomesticIp(signal),
      },
      {
        queryKey: ["browser-ip", 4],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getBrowserIp(4, signal),
      },
    ].map((probe) => ({ retry: false, staleTime: 60_000, ...probe })),
  });
  const cards = probes.map((query, index) => ({
    query,
    data: query.data && !query.data.ip.includes(":") ? query.data : undefined,
    version: 4,
    kind: index === 0 ? "domestic" : "external",
    label: index === 0 ? t("IPv4 · 国内探测") : t("IPv4 · 外部探测"),
  }));
  const ips = [
    ...new Set(cards.flatMap(({ data }) => (data ? [data.ip] : []))),
  ];
  const geoQueries = useQueries({
    queries: ips.map((ip) => ({
      queryKey: ["geoip", ip],
      queryFn: ({ signal }: { signal: AbortSignal }) => getGeo(ip, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const geoByIp = new Map(ips.map((ip, index) => [ip, geoQueries[index]]));
  const typeQueries = useQueries({
    queries: ips.map((ip) => ({
      queryKey: ["lookup-ip-coffee", ip],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        lookupIp(ip, AbortSignal.any([signal, AbortSignal.timeout(3000)])),
      staleTime: 3600_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const typeByIp = new Map(ips.map((ip, index) => [ip, typeQueries[index]]));
  const resolvedIps = cards.flatMap(({ data }) => (data ? [data.ip] : []));
  const routesMatch =
    resolvedIps.length === 2 && resolvedIps[0] === resolvedIps[1];
  const routeStatus = probes.some((query) => query.isPending)
    ? t("正在检测两条出口路径…")
    : routesMatch
      ? t("国内与外部探测使用同一出口")
      : t("已识别 {0} 个出口", [new Set(resolvedIps).size]);
  return (
    <div className="home-page">
      <section className="home-command-bar">
        <div className="home-command-copy">
          <h1>{t("分流总览")}</h1>
          <p>{t("正在从多个网络路径核对当前出口、归属地与运营商。")}</p>
        </div>
        <ActionButton
          size="sm"
          variant="outline"
          busy={refreshing}
          onClick={refresh}
          aria-label={refreshing ? t("检测中...") : t("重新检测")}
          className="home-refresh-action"
        >
          <RefreshCw
            className={refreshing ? "animate-spin" : ""}
            aria-hidden="true"
          />
          <span>{refreshing ? t("检测中...") : t("重新检测")}</span>
        </ActionButton>
        <PrivacyToggle iconOnly />
      </section>
      <section className="home-signal-grid" aria-label={t("当前出口对照")}>
        <Card className="home-route-stage">
          <CardHeader className="route-stage-header">
            <div>
              <CardTitle as="h2">
                <Radar aria-hidden="true" />
                {t("当前出口对照")}
              </CardTitle>
              <p>{routeStatus}</p>
            </div>
          </CardHeader>
          <CardContent className="route-stage-grid">
            {cards.map(({ query, data, version, kind, label }) => {
              const pending = !data && query.isPending;
              const classification = data ? typeByIp.get(data.ip) : undefined;
              const geo = data
                ? {
                    ...data,
                    ...classification?.data?.geo,
                    ...geoByIp.get(data.ip)?.data,
                  }
                : undefined;
              const company = classification?.isSuccess
                ? classification.data.coffee
                : undefined;
              const score = company?.trust_score;
              const hasScore =
                typeof score === "number" &&
                Number.isFinite(score) &&
                score >= 0 &&
                score <= 100;
              const typeLabels = company
                ? [
                    company.company_type
                      ? {
                          label: company.company_type,
                          color:
                            companyTypeColors[
                              company.company_type.toLowerCase()
                            ] ?? "bg-primary/5 text-primary dark:bg-primary/10",
                        }
                      : null,
                    company.is_public_service === true
                      ? {
                          label: t("公共服务"),
                          color:
                            "bg-primary/15 text-primary dark:bg-primary/20",
                        }
                      : null,
                    company.isResidential === true && !company.is_public_service
                      ? {
                          label: t("家庭住宅 IP"),
                          color:
                            "bg-primary/25 text-primary dark:bg-primary/30",
                        }
                      : null,
                    company.is_datacenter === true && !company.is_public_service
                      ? {
                          label: t("机房 IP"),
                          color: "bg-primary/5 text-primary dark:bg-primary/10",
                        }
                      : null,
                    company.is_mobile === true
                      ? {
                          label: t("移动网络"),
                          color:
                            "bg-primary/15 text-primary dark:bg-primary/20",
                        }
                      : null,
                    company.is_proxy === true ||
                    company.is_vpn === true ||
                    company.is_tor === true
                      ? {
                          label: t("代理 / VPN / Tor"),
                          color:
                            "bg-primary/10 text-primary dark:bg-primary/15",
                        }
                      : null,
                  ]
                    .filter((item) => item !== null)
                    .slice(0, 2)
                : [];
              const loading =
                pending ||
                Boolean(
                  data &&
                  !geo?.country &&
                  !geo?.city &&
                  !geo?.isp &&
                  (geoByIp.get(data.ip)?.isPending ||
                    classification?.isPending),
                );
              return (
                <article
                  key={kind}
                  data-exit={kind}
                  className="home-route-lane"
                >
                  {data && (
                    <Link
                      to={`/network/ip/${encodeURIComponent(data.ip)}`}
                      aria-label={`${label} · ${t("IP 信息查询")}`}
                      className="route-lane-link"
                    />
                  )}
                  <div className="route-lane-content">
                    <div className="route-lane-heading">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{label}</span>
                        {typeLabels.map((type) => (
                          <Badge
                            key={type.label}
                            variant="secondary"
                            className={`route-type-badge h-4 px-1.5 text-[10px] font-medium tracking-normal ${type.color}`}
                          >
                            {type.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="route-address-row">
                      <div className="ip-value">
                        {pending ? (
                          <Pending>{t("加载中...")}</Pending>
                        ) : geo ? (
                          <>
                            <CountryFlag code={geo.country_code} />
                            <IpText ip={geo.ip} link={false} />
                          </>
                        ) : (
                          <span className="muted">
                            {t("未获取到 IPv")}
                            {version}
                          </span>
                        )}
                      </div>
                      {hasScore && (
                        <div
                          className="route-score"
                          style={{ color: ipScoreColor(score) }}
                        >
                          <span>{t("IP 信誉分")}</span>
                          <strong>
                            <NumberTicker value={score} />
                            <small>/100</small>
                          </strong>
                        </div>
                      )}
                    </div>
                    <div className="route-lane-meta">
                      {loading ? (
                        <Pending>{t("正在查询归属信息…")}</Pending>
                      ) : geo?.country || geo?.city || geo?.isp ? (
                        <>
                          <p>
                            {[geo.country, geo.region, geo.city]
                              .filter(Boolean)
                              .filter((item, i, all) => all.indexOf(item) === i)
                              .join(" · ")}
                          </p>
                          <p className="mt-1 text-xs">
                            {[geo.isp, geo.asn ? `AS${geo.asn}` : undefined]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </>
                      ) : data ? (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span>{t("归属信息暂不可用")}</span>
                          <button
                            type="button"
                            className="relative z-20 shrink-0 text-primary"
                            onClick={() => geoByIp.get(data.ip)?.refetch()}
                          >
                            {t("重试")}
                          </button>
                        </div>
                      ) : (
                        <span>{t("该探测路径暂不可用")}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            <span className="route-observer" aria-hidden="true">
              <span className="route-observer-frame">
                <img
                  src="/route-observer-cat.png"
                  width="64"
                  height="64"
                  alt=""
                />
              </span>
              <span className="route-observer-direction">
                <ArrowLeftRight />
              </span>
            </span>
          </CardContent>
        </Card>
        <Card className="home-connectivity-card">
          <CardHeader>
            <div className="row-between">
              <CardTitle as="h2">{t("网络连通性")}</CardTitle>
              <UnderlineHover asChild>
                <Link className="small muted" to="/network/connectivity/">
                  {t("查看更多 ›")}
                </Link>
              </UnderlineHover>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={connectivityRef}>
              <div className="ping-grid">
                {orderedTargets.map(({ target }) => (
                  <ConnectivityTile target={target} key={target.name} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <div className="home-dashboard-grid">
        <div className="home-split-panel">
          <SplitResults summary />
        </div>
        <PlatformSummary />
        <div className="home-browser-panel">
          <BrowserSummary />
        </div>
        <Card className="home-shortcuts">
          <CardHeader>
            <CardTitle as="h2">{t("热门功能")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/ai/claude" className="shortcut-feature">
              <span className="shortcut-icon">
                <SiteLogo website="https://claude.ai" />
              </span>
              <span className="shortcut-label">
                <strong>{t("Claude 中国用户检测")}</strong>
                <span className="shortcut-description">
                  {t("检查语言、时区与设备信号，了解浏览器暴露的环境特征。")}
                </span>
              </span>
              <ArrowRight className="shortcut-arrow" aria-hidden="true" />
            </Link>
            <div className="shortcut-grid">
              {[
                {
                  path: "/ai/gpt",
                  label: t("ChatGPT 检测"),
                  description: t("检查 AI 服务响应与访问出口"),
                  icon: () => <SiteLogo website="https://chatgpt.com" />,
                },
                {
                  path: "/network/connectivity",
                  label: t("网站连通与出口"),
                  description: t("核对网站连通性、响应延迟和实际出口"),
                  icon: Network,
                },
                {
                  path: "/browser/consistency",
                  label: t("环境一致性"),
                  description: t("核对浏览器环境与设备信号"),
                  icon: Search,
                },
                {
                  path: "/status/",
                  label: t("服务状态"),
                  description: t("查看平台故障与服务动态"),
                  icon: Activity,
                },
              ].map((tool) => (
                <Link key={tool.path} to={tool.path}>
                  <span className="shortcut-icon">
                    <tool.icon aria-hidden="true" />
                  </span>
                  <span className="shortcut-label">
                    <strong>{tool.label}</strong>
                    <span className="shortcut-description">
                      {tool.description}
                    </span>
                  </span>
                  <ArrowRight className="shortcut-arrow" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <details className="home-tool-directory">
        <summary>
          <span>
            <strong id="home-tool-directory-title">{t("全部功能")}</strong>
            <small>{t("网络、AI、浏览器与服务状态工具")}</small>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="home-tool-directory-content">
          <nav
            aria-labelledby="home-tool-directory-title"
            className="tool-directory-groups"
          >
            {navigationGroups.map((group) => (
              <section className="tool-directory-group" key={group.label}>
                <h3 className="tool-directory-heading">
                  <group.icon aria-hidden="true" />
                  {group.label}
                </h3>
                <ul className="tool-directory-links">
                  {group.tools.map((tool) => (
                    <li key={tool.path}>
                      <Link to={tool.path}>{tool.label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
          <UnderlineHover asChild>
            <Link className="home-api-link" to="/docs/api">
              {t("查看 API 文档")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </UnderlineHover>
        </div>
      </details>
    </div>
  );
}
export default HomePage;

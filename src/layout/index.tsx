import { Suspense, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AmbientStarfield } from "@/components/ambient-starfield";
import { BuildInfo } from "@/components/build-info";
import { LanguageSelect } from "@/components/language-select";
import { AppUpdateChecker } from "@/components/providers/app-update-checker";
import { ShareSite } from "@/components/share-site";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { Pending } from "@/components/toolkit";
import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { UnderlineHover } from "@/components/underline-hover";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
import {
  LayoutDashboard,
  ScanSearch,
  Globe,
  Cable,
  Activity,
  Sparkles,
} from "lucide-react";
import { Tabs } from "radix-ui";
import { Toaster } from "sonner";
import { RouteErrorBoundary } from "./route-error-boundary";
import { activeNavigationRoute, navigationRoutes } from "./routes";

const menuIcons = {
  "/": LayoutDashboard,
  "/network/ip": ScanSearch,
  "/browser/": Globe,
  "/network/": Cable,
  "/ai/": Sparkles,
  "/status/": Activity,
};

const options = navigationRoutes.map((route) => {
  const Icon = menuIcons[route.value];
  return {
    value: route.value,
    label: (
      <>
        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        <span className="nav-full">{route.label}</span>
        <span className="nav-short">{route.short}</span>
      </>
    ),
  };
});

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" data-compact={compact || undefined}>
      <span className="brand-mark">
        <img src="/icon.svg" width="42" height="42" alt="" />
      </span>
      <span className="brand-copy">
        <strong>One Ping</strong>
      </span>
    </span>
  );
}

export function AppLayout() {
  const { resolvedTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const activeRoute = activeNavigationRoute(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    const viewport = navRef.current?.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    const trigger = navRef.current?.querySelector<HTMLElement>(
      "[role=tab][data-state=active]",
    );
    if (!viewport || !trigger) return;
    const parent = viewport.getBoundingClientRect();
    const child = trigger.getBoundingClientRect();
    const offset =
      child.left < parent.left
        ? child.left - parent.left - 8
        : child.right > parent.right
          ? child.right - parent.right + 8
          : 0;
    if (offset)
      viewport.scrollBy({
        left: offset,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [pathname]);

  return (
    <>
      <AmbientStarfield />
      <div className="app-container" data-home={pathname === "/" || undefined}>
        <header className="mobile-site-header">
          <Link
            to="/"
            className="mobile-brand-link"
            aria-label={t("IP 网络工具概览")}
          >
            <BrandLockup compact />
          </Link>
          <div className="flex items-center gap-1">
            <ShareSite />
            <LanguageSelect />
            <ThemeToggleButton className="size-8 rounded-full text-muted-foreground" />
          </div>
        </header>
        <AnimatedSegmentedTabs
          label={t("网络诊断工具")}
          options={options}
          value={activeRoute}
          onValueChange={(value) => {
            if (value !== activeRoute) navigate(value);
          }}
          activationMode="manual"
          className="min-w-0"
          listClassName="h-9 w-max justify-start gap-0.5 bg-transparent p-0"
          highlightClassName="rounded-lg bg-primary/10 shadow-none ring-0"
          triggerClassName="h-9 flex-none rounded-lg border-0 px-2 text-[13px] text-muted-foreground hover:bg-accent/50 data-[state=active]:font-semibold data-[state=active]:text-primary"
          renderList={(list) => (
            <nav ref={navRef} className="app-nav" aria-label={t("主导航")}>
              <Link
                to="/"
                aria-label={t("IP 网络工具概览")}
                className="site-home-link focus-visible:outline-2 focus-visible:outline-ring"
              >
                <BrandLockup />
              </Link>
              <ScrollArea className="nav-tabs-scroll">
                {list}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <div className="desktop-preferences flex items-center gap-1">
                <ShareSite />
                <LanguageSelect />
                <ThemeToggleButton className="size-9 shrink-0 rounded-lg text-muted-foreground" />
              </div>
            </nav>
          )}
        >
          <Tabs.Content value={activeRoute} asChild>
            <main key={pathname} className="app-main outline-none">
              <RouteErrorBoundary key={activeRoute}>
                <Suspense
                  fallback={
                    <p className="status-line">
                      <Pending>{t("正在加载页面…")}</Pending>
                    </p>
                  }
                >
                  <Outlet />
                </Suspense>
              </RouteErrorBoundary>
            </main>
          </Tabs.Content>
        </AnimatedSegmentedTabs>
        <footer className="app-footer">
          © {new Date().getFullYear()} One Ping ·{" "}
          <UnderlineHover asChild>
            <a
              href="https://github.com/zhihui-hu/one-ip"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("上游项目")}
            </a>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/terms">{t("使用条款")}</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/privacy">{t("隐私政策")}</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <a
              href="https://github.com/cshaizhihao/one-ip"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 align-middle"
            >
              {t("本站源码")}
            </a>
          </UnderlineHover>{" "}
        </footer>
      </div>
      <aside aria-label={t("站点通知")} className="update-notices">
        <AppUpdateChecker />
      </aside>
      <BuildInfo />
      <Toaster richColors theme={resolvedTheme} position="top-right" />
    </>
  );
}

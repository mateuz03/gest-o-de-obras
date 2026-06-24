import { Outlet, useLocation } from "react-router-dom";

import { GlobalHeader } from "@/components/shell/GlobalHeader";

function shouldHideGlobalHeader(pathname: string) {
  const hiddenPrefixes = [
    "/share/",
    "/nova-analise",
    "/analise/",
    "/notas-fiscais",
    "/painel-loja",
  ];

  return hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function AppShell() {
  const location = useLocation();
  const hideHeader = shouldHideGlobalHeader(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {hideHeader ? null : <GlobalHeader />}
      <div className={hideHeader ? undefined : "pt-16"}>
        <Outlet />
      </div>
    </div>
  );
}

import { Outlet, useLocation, useMatches } from "react-router-dom";
import { BackToTop } from "@/shared/components/BackToTop/BackToTop";
import { DocumentTitleReset } from "@/shared/components/DocumentTitle/DocumentTitleReset";
import { ToastViewport } from "@/shared/components/ui";
import { isAppRouteHandle } from "@/shared/types/route-handle.types";
import { Navbar, SiteMapHost } from "@/modules/landing";
import { SelectionLookupProvider } from "@/modules/vocabulary";

export const RootLayout = () => {
  const location = useLocation();
  const matches = useMatches();
  const isAdminRoute =
    location.pathname.startsWith("/admin") && location.pathname !== "/admin/login";
  const isTeacherRoute = location.pathname.startsWith("/teacher");
  const isBare = matches.some(
    (match) => isAppRouteHandle(match.handle) && match.handle.chrome === "bare",
  );

  return (
    // "Bôi đen để tra" is site-wide for learners; the CMS keeps plain text selection.
    <SelectionLookupProvider disabled={isAdminRoute || isTeacherRoute}>
      {/* Before Outlet: resets the tab title first, then the routed page can set its own. */}
      <DocumentTitleReset />
      {!isAdminRoute && !isTeacherRoute && !isBare && <Navbar />}
      <Outlet />
      {!isBare && <BackToTop />}
      {/* "Bản đồ": opened from the navbar, the practice space and the home page. */}
      <SiteMapHost />
      <ToastViewport />
    </SelectionLookupProvider>
  );
};

import { Outlet, useLocation, useMatches } from "react-router-dom";
import { BackToTop } from "@/shared/components/BackToTop/BackToTop";
import { isAppRouteHandle } from "@/shared/types/route-handle.types";
import { Navbar } from "@/modules/landing";
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
      {!isAdminRoute && !isTeacherRoute && !isBare && <Navbar />}
      <Outlet />
      {!isBare && <BackToTop />}
    </SelectionLookupProvider>
  );
};

import { Outlet, useLocation } from "react-router-dom";
import { BackToTop } from "@/shared/components/BackToTop/BackToTop";
import { Navbar } from "@/modules/landing";

export const RootLayout = () => {
  const location = useLocation();
  const isAdminRoute =
    location.pathname.startsWith("/admin") && location.pathname !== "/admin/login";
  const isTeacherRoute = location.pathname.startsWith("/teacher");

  return (
    <>
      {!isAdminRoute && !isTeacherRoute && <Navbar />}
      <Outlet />
      <BackToTop />
    </>
  );
};

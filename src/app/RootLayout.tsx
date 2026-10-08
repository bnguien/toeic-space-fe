import { Outlet } from "react-router-dom";
import { BackToTop } from "@/shared/components/BackToTop/BackToTop";

export const RootLayout = () => {
  return (
    <>
      <Outlet />
      <BackToTop />
    </>
  );
};

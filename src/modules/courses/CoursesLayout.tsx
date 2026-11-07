import { Outlet } from "react-router-dom";
import { Footer } from "@/modules/landing";

export function CoursesLayout() {
  return (
    <>
      <Outlet />
      <Footer />
    </>
  );
}

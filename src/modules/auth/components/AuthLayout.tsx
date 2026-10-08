import { Outlet } from "react-router-dom";
import { Footer, Navbar } from "@/modules/landing";
import styles from "./AuthLayout.module.css";

export const AuthLayout = () => {
  return (
    <div className={styles.layout}>
      <Navbar />
      <div className={styles.content}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

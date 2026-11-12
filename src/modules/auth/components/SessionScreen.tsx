import deniedMascot from "@/assets/mascot/oy2-denied.png";
import waitingMascot from "@/assets/mascot/oy2-waiting.png";

import { useLogout } from "../hooks/useAuth";
import styles from "./AuthScreen.module.css";

export function SessionScreen({ variant }: { variant: "loading" | "forbidden" }) {
  const logout = useLogout();
  const loading = variant === "loading";

  return (
    <main className={styles.screen}>
      <section
        className={`${styles.card} ${styles.statusCard}`}
        role={loading ? "status" : "alert"}
      >
        <img
          className={styles.mascot}
          src={loading ? waitingMascot : deniedMascot}
          alt=""
          width="112"
          height="112"
        />
        <h1>{loading ? "Đang kiểm tra phiên đăng nhập" : "Không có quyền truy cập"}</h1>
        <p>
          {loading
            ? "Vui lòng đợi trong giây lát."
            : "Khu vực này chỉ dành cho quản trị viên và giáo viên."}
        </p>
        {!loading && (
          <button
            type="button"
            className={styles.submit}
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            {logout.isPending ? "Đang đăng xuất..." : "Đăng nhập tài khoản khác"}
          </button>
        )}
      </section>
    </main>
  );
}

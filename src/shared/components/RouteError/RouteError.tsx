import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

import errorMascot from "@/assets/mascot/oy2-error.png";
import notFoundMascot from "@/assets/mascot/oy2-404.png";

import styles from "./RouteError.module.css";

/**
 * Shown instead of React Router's default screen when a page fails to render.
 * Error details stay in the console; users only see a short message.
 */
export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  if (import.meta.env.DEV) {
    console.error(error);
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card} role="alert">
        <img
          className={styles.mascot}
          src={notFound ? notFoundMascot : errorMascot}
          alt=""
          width="120"
          height="120"
        />
        <h1>{notFound ? "Không tìm thấy trang" : "Trang gặp sự cố"}</h1>
        <p>
          {notFound
            ? "Đường dẫn không tồn tại hoặc đã được thay đổi."
            : "Đã có lỗi khi hiển thị trang này. Vui lòng tải lại hoặc quay về trang quản trị."}
        </p>
        <div className={styles.actions}>
          {!notFound && (
            <button type="button" onClick={() => window.location.reload()}>
              Tải lại trang
            </button>
          )}
          <Link to="/admin">Về trang quản trị</Link>
        </div>
      </section>
    </main>
  );
}

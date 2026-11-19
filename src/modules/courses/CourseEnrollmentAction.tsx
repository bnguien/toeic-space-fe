import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { useCurrentUser, useSessionStatus } from "@/modules/auth";
import type { PublicCourseDetail } from "./courseCatalog";
import { useEnrollment, useRefreshEnrollment } from "./purchaseHooks";
import { purchaseApi, money } from "./purchaseApi";
import { purchaseError } from "./purchaseError";
import styles from "./courseCatalog.module.css";

export function CourseEnrollmentAction({ course }: { course: PublicCourseDetail }) {
  const user = useCurrentUser();
  const client = useQueryClient();
  const status = useSessionStatus();
  const location = useLocation();
  const enrollment = useEnrollment(course.id);
  const refresh = useRefreshEnrollment(course.id);
  const [full, setFull] = useState(false);
  const fullyBooked = course.capacity !== null && course.remainingSeats === 0;
  const enroll = useMutation({
    mutationFn: () => purchaseApi.enroll(course.id),
    onSuccess: refresh,
    onError: (error) => {
      if (
        (error as { response?: { data?: { code?: string } } }).response?.data?.code ===
        "course_full"
      )
        setFull(true);
      if (
        (error as { response?: { data?: { code?: string } } }).response?.data?.code ===
        "already_enrolled"
      )
        void refresh();
    },
  });
  const recheck = () => {
    setFull(false);
    enroll.reset();
    void enrollment.refetch();
    void client.invalidateQueries({ queryKey: ["public-course", course.id] });
  };
  const firstLesson = course.modules.flatMap((module) => module.lessons)[0];
  const learningPath = firstLesson
    ? `/my-courses/${course.id}/lessons/${firstLesson.id}`
    : `/my-courses/${course.id}`;
  const login = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <section className={styles.coursePrice} aria-label="Học phí và đăng ký khóa học">
      <div>
        <span className={styles.priceLabel}>Học phí</span>
        {course.promotion && <s>{money(course.price)}</s>}
        <strong>{money(course.promotion?.sellingPrice ?? course.price)}</strong>
        {course.promotion && (
          <small>
            Ưu đãi {course.promotion.name}: giảm {money(course.promotion.discountAmount)} đến{" "}
            {new Date(course.promotion.expiresAt).toLocaleString("vi-VN")}
          </small>
        )}
        {course.capacity !== null && (
          <small>
            {course.remainingSeats === null
              ? `Sức chứa tối đa ${course.capacity} học viên.`
              : course.remainingSeats === 0
                ? "Hiện đã hết chỗ."
                : `Còn ${course.remainingSeats} chỗ tại thời điểm kiểm tra.`}
          </small>
        )}
      </div>
      <div className={styles.coursePriceAction}>
        {status === "idle" || status === "restoring" ? (
          <small role="status">Đang kiểm tra tài khoản…</small>
        ) : user?.role === "User" && enrollment.isPending ? (
          <small role="status">Đang kiểm tra quyền học…</small>
        ) : user?.role === "User" && enrollment.isError ? (
          <>
            <small role="alert">{purchaseError(enrollment.error)}</small>
            <button type="button" onClick={() => void enrollment.refetch()}>
              Thử lại
            </button>
          </>
        ) : enrollment.data ? (
          <Link to={learningPath}>Tiếp tục học</Link>
        ) : full || fullyBooked ? (
          <>
            <button type="button" disabled>
              Hết chỗ
            </button>
            <small role="status">
              Số chỗ có thể thay đổi.{" "}
              <button type="button" className={styles.priceRetry} onClick={recheck}>
                Kiểm tra lại
              </button>
            </small>
          </>
        ) : !user ? (
          <Link to={login}>
            {course.price === 0 ? "Đăng nhập để đăng ký miễn phí" : "Đăng nhập để mua khóa học"}
          </Link>
        ) : user.role !== "User" ? (
          <small>Chỉ tài khoản học viên có thể đăng ký khóa học.</small>
        ) : course.price === 0 ? (
          <button type="button" disabled={enroll.isPending} onClick={() => enroll.mutate()}>
            {enroll.isPending ? "Đang đăng ký…" : "Đăng ký miễn phí"}
          </button>
        ) : (
          <Link to={`/courses/${course.id}/checkout`}>Mua khóa học</Link>
        )}
        {enroll.isError && !enrollment.data && !full && !fullyBooked && (
          <small role="alert">{purchaseError(enroll.error)}</small>
        )}
        {enrollment.data && (
          <small>
            Quyền truy cập đã được xác nhận.{" "}
            <Link className={styles.priceTextLink} to="/my-courses">
              Khóa học của tôi
            </Link>
          </small>
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import { Wallet } from "lucide-react";

import { Button, Modal } from "./ui";
import { CourseCouponsSection } from "./CourseCouponsSection";
import { CoursePricingForm } from "./CoursePricingForm";
import { CoursePromotionsSection } from "./CoursePromotionsSection";
import { useCoursePromotions } from "../hooks/useCoursePromotions";
import { useCourseActions } from "../hooks/useCourses";
import type { CourseItem } from "../types/course.types";
import { money, vnd } from "../../courses/purchaseApi";
import { formatDate, promotionDiscount, promotionStatus } from "../utils/promotion";
import styles from "../pages/CoursesPage.module.css";

export function CoursePricingPanel({ course }: { course: CourseItem }) {
  const actions = useCourseActions();
  const promotions = useCoursePromotions(course.id);
  const [priceOpen, setPriceOpen] = useState(false);
  const [now] = useState(() => Date.now());

  const running = (promotions.data ?? [])
    .filter(
      ({ promotion, usedCount, reservedCount }) =>
        promotionStatus(promotion, now) === "running" &&
        (promotion.usageLimit === null || usedCount + reservedCount < promotion.usageLimit),
    )
    .sort((a, b) => Date.parse(a.promotion.expiresAt) - Date.parse(b.promotion.expiresAt));
  const best = running[0];
  const discount = best ? promotionDiscount(best.promotion, course.price) : 0;

  return (
    <section className={styles.pricingPanel} aria-label="Học phí và khuyến mãi">
      <div className={styles.pricingSummary}>
        <article className={styles.priceCard}>
          <span>Học phí niêm yết</span>
          <strong>{money(course.price)}</strong>
          <small>
            {course.capacity === null
              ? "Không giới hạn sức chứa"
              : `Sức chứa tối đa ${course.capacity} học viên`}
          </small>
        </article>
        <article className={styles.priceCard} data-tone="promo">
          <span>Giá khuyến mãi tự động</span>
          <strong>
            {promotions.isPending
              ? "Đang tải…"
              : promotions.isError
                ? "—"
                : discount > 0
                  ? money(course.price - discount)
                  : "Chưa có"}
          </strong>
          <small>
            {promotions.isError
              ? "Không tải được thông tin khuyến mãi."
              : best
                ? `Tự động giảm ${vnd(discount)} · đến ${formatDate(best.promotion.expiresAt)}`
                : "Chưa có khuyến mãi đang chạy cho khóa học."}
          </small>
        </article>
      </div>

      <div className={styles.pricingActions}>
        <Button variant="primary" icon={<Wallet size={16} />} onClick={() => setPriceOpen(true)}>
          Cập nhật học phí
        </Button>
      </div>

      <CoursePromotionsSection course={course} promotions={promotions} />
      <CourseCouponsSection course={course} />

      <Modal
        open={priceOpen}
        title="Cập nhật học phí"
        description={`Thiết lập giá niêm yết và sức chứa cho khóa học ${course.title}.`}
        busy={actions.pricing.isPending}
        onClose={() => setPriceOpen(false)}
      >
        <CoursePricingForm
          key={`${course.id}-${course.updatedAt}`}
          course={course}
          pending={actions.pricing.isPending}
          embedded
          onCancel={() => setPriceOpen(false)}
          onSave={async (price, capacity) => {
            await actions.pricing.mutateAsync({ id: course.id, price, capacity });
            setPriceOpen(false);
          }}
        />
      </Modal>
    </section>
  );
}

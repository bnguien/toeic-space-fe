import { useEffect, useId, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Eye, MoreVertical, Pencil, Plus, Power, Trash2 } from "lucide-react";

import { Badge, Button, ConfirmDialog, EmptyState, Modal } from "./ui";
import { PromotionForm } from "./PromotionForm";
import { promotionsApi, type Promotion, type PromotionView } from "../api/promotions.api";
import type { CourseItem } from "../types/course.types";
import { money, vnd } from "../../courses/purchaseApi";
import { purchaseError } from "../../courses/purchaseError";
import {
  formatDate,
  promotionSellingPrice,
  promotionStatus,
  promotionStatusLabel,
} from "../utils/promotion";
import styles from "../pages/CoursesPage.module.css";

const discountLabel = (promotion: Promotion) =>
  promotion.discountType === "Percentage"
    ? `${promotion.discountValue}%`
    : vnd(promotion.discountValue);

const scopeLabel = (promotion: Promotion) =>
  promotion.courseIds.length === 1
    ? "Khóa học này"
    : `Khóa học này + ${promotion.courseIds.length - 1} khác`;

function PromotionCard({
  course,
  view,
  now,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: {
  course: CourseItem;
  view: PromotionView;
  now: number;
  onView: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { promotion } = view;
  const status = promotionStatus(promotion, now);
  const exhausted =
    promotion.usageLimit !== null && view.usedCount + view.reservedCount >= promotion.usageLimit;
  const badgeLabel = status === "running" && exhausted ? "Hết lượt" : promotionStatusLabel(status);
  const badgeTone =
    status === "running" && !exhausted ? "green" : status === "scheduled" ? "blue" : "neutral";
  const action = (callback: () => void) => () => {
    setMenuOpen(false);
    callback();
  };
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);
  return (
    <article
      className={styles.promotionCard}
      data-status={status}
      data-type={promotion.discountType}
    >
      <div className={styles.promotionCardBody}>
        <div className={styles.promotionValueStub}>
          <strong>-{discountLabel(promotion)}</strong>
          <span>{promotion.discountType === "Percentage" ? "phần trăm" : "số tiền"}</span>
        </div>

        <div className={styles.promotionCardContent}>
          <div className={styles.promotionCardTop}>
            <h4 className={styles.promotionName} title={promotion.name}>
              {promotion.name}
            </h4>
            <div className={styles.promotionCardTools}>
              <Badge tone={badgeTone} dot>
                {badgeLabel}
              </Badge>
              <details
                ref={menuRef}
                className={styles.cardMenu}
                open={menuOpen}
                onToggle={(event) => setMenuOpen(event.currentTarget.open)}
              >
                <summary aria-label={`Thao tác khuyến mãi ${promotion.name}`}>
                  <MoreVertical size={16} />
                </summary>
                <div className={styles.cardMenuPanel} role="menu">
                  <button type="button" role="menuitem" onClick={action(onView)}>
                    <Eye size={15} /> Xem chi tiết
                  </button>
                  <button type="button" role="menuitem" onClick={action(onEdit)}>
                    <Pencil size={15} /> Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={promotion.isActive ? styles.menuDanger : styles.menuPrimary}
                    onClick={action(onToggle)}
                  >
                    <Power size={15} /> {promotion.isActive ? "Tắt khuyến mãi" : "Bật lại"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuDanger}
                    onClick={action(onDelete)}
                  >
                    <Trash2 size={15} /> Xóa khuyến mãi
                  </button>
                </div>
              </details>
            </div>
          </div>

          <div className={styles.promotionPriceRow}>
            <span className={styles.promotionPrice}>
              {money(promotionSellingPrice(promotion, course.price))}
            </span>
            <span className={styles.promotionPriceSub}>sau khuyến mãi</span>
          </div>

          <p className={styles.promotionMeta}>
            <CalendarDays size={13} />
            <span>
              {formatDate(promotion.startAt)} – {formatDate(promotion.expiresAt)}
            </span>
          </p>

          <div className={styles.promotionCardFooter}>
            <span>
              {view.usedCount + view.reservedCount}/
              {promotion.usageLimit === null ? "∞" : promotion.usageLimit} lượt
            </span>
            <span className={styles.promotionScopeTag}>{scopeLabel(promotion)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CoursePromotionsSection({
  course,
  promotions,
}: {
  course: CourseItem;
  promotions: UseQueryResult<PromotionView[]>;
}) {
  const client = useQueryClient();
  const formId = useId();
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);
  const [viewing, setViewing] = useState<PromotionView | null>(null);
  const [deactivating, setDeactivating] = useState<PromotionView | null>(null);
  const [deleting, setDeleting] = useState<PromotionView | null>(null);
  const [actionError, setActionError] = useState("");
  const [now] = useState(() => Date.now());

  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["course-promotions", course.id] }),
      client.invalidateQueries({ queryKey: ["admin-promotions"] }),
    ]);

  const save = useMutation({
    mutationFn: promotionsApi.save,
    onSuccess: async () => {
      setEditing(null);
      await refresh();
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      promotionsApi.active(id, active),
    onSuccess: async () => {
      setDeactivating(null);
      await refresh();
    },
    onError: (cause) => setActionError(purchaseError(cause)),
  });
  const remove = useMutation({
    mutationFn: promotionsApi.delete,
    onSuccess: async () => {
      setActionError("");
      setDeleting(null);
      await refresh();
    },
    onError: (cause) => setActionError(purchaseError(cause)),
  });

  const openEdit = (promotion: Promotion) => {
    setActionError("");
    setViewing(null);
    setEditing(promotion);
  };
  const openCreate = () => {
    setActionError("");
    setViewing(null);
    setEditing("new");
  };
  const askDeactivate = (view: PromotionView) => {
    setActionError("");
    setDeleting(null);
    setDeactivating(view);
  };
  const askDelete = (view: PromotionView) => {
    setActionError("");
    setDeactivating(null);
    setViewing(null);
    setDeleting(view);
  };
  const togglePromotion = (view: PromotionView) => {
    setActionError("");
    setViewing(null);
    if (view.promotion.isActive) askDeactivate(view);
    else toggle.mutate({ id: view.promotion.id, active: true });
  };

  const activeCount = (promotions.data ?? []).filter(
    ({ promotion, usedCount, reservedCount }) =>
      promotionStatus(promotion, now) === "running" &&
      (promotion.usageLimit === null || usedCount + reservedCount < promotion.usageLimit),
  ).length;

  return (
    <section className={styles.promotionSection} aria-label="Khuyến mãi khóa học">
      <div className={styles.pricingSectionHeader}>
        <div>
          <h3>Khuyến mãi khóa học</h3>
          <p className={styles.sectionDescription}>
            Khuyến mãi được áp dụng tự động khi học viên thanh toán, không cần nhập mã. Có thể Tắt
            để ngừng áp dụng hoặc Xóa nếu khuyến mãi chưa có lượt sử dụng.
          </p>
        </div>
        <div className={styles.sectionHeaderActions}>
          <span>{activeCount} đang chạy</span>
          <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={openCreate}>
            Tạo khuyến mãi
          </Button>
        </div>
      </div>

      {actionError && (
        <p className={styles.pricingError} role="alert">
          {actionError}
        </p>
      )}

      {promotions.isPending ? (
        <p role="status">Đang tải khuyến mãi…</p>
      ) : promotions.isError ? (
        <p role="alert" className={styles.pricingError}>
          Không tải được khuyến mãi.{" "}
          <Button size="sm" onClick={() => void promotions.refetch()}>
            Thử lại
          </Button>
        </p>
      ) : !promotions.data.length ? (
        <EmptyState
          title="Chưa có khuyến mãi cho khóa học"
          description="Tạo khuyến mãi để giảm giá tự động cho khóa học này. Mỗi khóa học chỉ có một khuyến mãi đang chạy tại một thời điểm."
          action={
            <Button variant="primary" onClick={openCreate}>
              Tạo khuyến mãi
            </Button>
          }
        />
      ) : (
        <div className={styles.promotionGrid}>
          {promotions.data.map((view) => (
            <PromotionCard
              key={view.promotion.id}
              course={course}
              view={view}
              now={now}
              onView={() => setViewing(view)}
              onEdit={() => openEdit(view.promotion)}
              onToggle={() => togglePromotion(view)}
              onDelete={() => askDelete(view)}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing === "new" ? "Tạo khuyến mãi" : "Chỉnh sửa khuyến mãi"}
        description={
          editing === "new"
            ? "Thiết lập mức giảm tự động cho khóa học đang xem."
            : "Cập nhật thông tin, thời gian và giới hạn của khuyến mãi."
        }
        wide
        busy={save.isPending}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button onClick={() => setEditing(null)} disabled={save.isPending}>
              Hủy
            </Button>
            <Button type="submit" form={formId} variant="primary" disabled={save.isPending}>
              {save.isPending ? "Đang lưu…" : "Lưu khuyến mãi"}
            </Button>
          </>
        }
      >
        {editing && (
          <PromotionForm
            key={editing === "new" ? "new" : editing.id}
            formId={formId}
            course={course}
            initial={editing === "new" ? undefined : editing}
            pending={save.isPending}
            onSave={(value) => save.mutateAsync(value).then(() => undefined)}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(viewing)}
        title={viewing?.promotion.name ?? "Chi tiết khuyến mãi"}
        description={`Giá sau khuyến mãi tính cho khóa học ${course.title}.`}
        onClose={() => setViewing(null)}
        footer={
          viewing && (
            <>
              <Button onClick={() => setViewing(null)}>Đóng</Button>
              <Button
                variant={viewing.promotion.isActive ? "danger-outline" : "primary"}
                onClick={() => togglePromotion(viewing)}
              >
                {viewing.promotion.isActive ? "Tắt khuyến mãi" : "Bật lại"}
              </Button>
              <Button
                variant="danger-outline"
                icon={<Trash2 size={15} />}
                onClick={() => askDelete(viewing)}
              >
                Xóa
              </Button>
              <Button
                variant="primary"
                icon={<Pencil size={15} />}
                onClick={() => openEdit(viewing.promotion)}
              >
                Chỉnh sửa
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <div className={styles.promotionDetail}>
            <div className={styles.promotionDetailValue}>
              <span>Giảm giá</span>
              <strong>-{discountLabel(viewing.promotion)}</strong>
              <small>
                {money(promotionSellingPrice(viewing.promotion, course.price))} sau khuyến mãi
              </small>
            </div>
            <dl className={styles.promotionDetailList}>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <Badge
                    tone={
                      promotionStatus(viewing.promotion, now) === "running"
                        ? "green"
                        : promotionStatus(viewing.promotion, now) === "scheduled"
                          ? "blue"
                          : "neutral"
                    }
                    dot
                  >
                    {promotionStatusLabel(promotionStatus(viewing.promotion, now))}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Loại giảm</dt>
                <dd>
                  {viewing.promotion.discountType === "Percentage"
                    ? "Phần trăm"
                    : "Số tiền cố định"}
                </dd>
              </div>
              <div>
                <dt>Giảm tối đa</dt>
                <dd>
                  {viewing.promotion.maximumDiscountAmount === null
                    ? "Không giới hạn"
                    : money(viewing.promotion.maximumDiscountAmount)}
                </dd>
              </div>
              <div>
                <dt>Thời gian</dt>
                <dd>
                  {formatDate(viewing.promotion.startAt)} –{" "}
                  {formatDate(viewing.promotion.expiresAt)}
                </dd>
              </div>
              <div>
                <dt>Lượt sử dụng</dt>
                <dd>
                  {viewing.usedCount} đã dùng · {viewing.reservedCount} đang giữ ·{" "}
                  {viewing.promotion.usageLimit === null
                    ? "không giới hạn"
                    : `${viewing.promotion.usageLimit} lượt`}
                </dd>
              </div>
              <div>
                <dt>Phạm vi</dt>
                <dd>{scopeLabel(viewing.promotion)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivating)}
        title="Tắt khuyến mãi?"
        description={`Khuyến mãi ${deactivating?.promotion.name ?? ""} sẽ không được áp dụng cho đơn mới.`}
        confirmLabel="Tắt khuyến mãi"
        pending={toggle.isPending}
        error={actionError || undefined}
        onClose={() => setDeactivating(null)}
        onConfirm={() =>
          deactivating && toggle.mutate({ id: deactivating.promotion.id, active: false })
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa khuyến mãi?"
        description={`Xóa vĩnh viễn khuyến mãi ${deleting?.promotion.name ?? ""}? Chỉ xóa được khi khuyến mãi chưa có lượt sử dụng hoặc giữ chỗ. Thao tác không thể hoàn tác.`}
        confirmLabel="Xóa khuyến mãi"
        pending={remove.isPending}
        error={actionError || undefined}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.promotion.id)}
      />
    </section>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Eye, MoreVertical, Pencil, Plus, Power, Trash2 } from "lucide-react";

import { Badge, Button, ConfirmDialog, EmptyState, Modal } from "./ui";
import { CouponForm } from "./CouponForm";
import { couponPayload, couponsApi, type Coupon, type CouponPayload } from "../api/coupons.api";
import type { CourseItem } from "../types/course.types";
import { money, vnd } from "../../courses/purchaseApi";
import { purchaseError } from "../../courses/purchaseError";
import { formatDate, promotionStatus, promotionStatusLabel } from "../utils/promotion";
import styles from "../pages/CoursesPage.module.css";

const discountLabel = (coupon: Coupon) =>
  coupon.discountType === "Percentage" ? `${coupon.discountValue}%` : vnd(coupon.discountValue);

function useCourseCoupons(courseId: string) {
  return useQuery({
    queryKey: ["course-coupons", courseId],
    queryFn: async ({ signal }) => {
      const first = await couponsApi.list({ page: 1, pageSize: 100 }, signal);
      const items = [...first.items];
      const pages = Math.ceil(first.totalCount / first.pageSize);
      for (let page = 2; page <= pages; page += 1) {
        const next = await couponsApi.list({ page, pageSize: 100 }, signal);
        items.push(...next.items);
      }
      return items
        .filter(
          (coupon) =>
            coupon.applicableCourseIds.length === 0 ||
            coupon.applicableCourseIds.includes(courseId),
        )
        .sort(
          (a, b) =>
            Number(b.isActive) - Number(a.isActive) ||
            Date.parse(a.expiresAt) - Date.parse(b.expiresAt),
        );
    },
    retry: false,
  });
}

function CouponCard({
  course,
  coupon,
  now,
  onView,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  course: CourseItem;
  coupon: Coupon;
  now: number;
  onView: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const status = promotionStatus(coupon, now);
  const exhausted = coupon.remainingUses === 0;
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
  const scopeText =
    coupon.applicableCourseIds.length === 0
      ? "Tất cả khóa học"
      : coupon.applicableCourseIds.length === 1 && coupon.applicableCourseIds[0] === course.id
        ? "Khóa học này"
        : `${coupon.applicableCourseIds.length} khóa học`;

  return (
    <article className={styles.couponCard} data-status={status}>
      <div className={styles.promotionCardBody}>
        <div className={styles.couponValueStub}>
          <strong>-{discountLabel(coupon)}</strong>
          <span>{coupon.discountType === "Percentage" ? "phần trăm" : "số tiền"}</span>
        </div>

        <div className={styles.promotionCardContent}>
          <div className={styles.couponTop}>
            <strong className={styles.couponCode}>{coupon.code}</strong>
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
                <summary aria-label={`Thao tác mã giảm giá ${coupon.code}`}>
                  <MoreVertical size={16} />
                </summary>
                <div className={styles.cardMenuPanel} role="menu">
                  <button type="button" role="menuitem" onClick={action(onView)}>
                    <Eye size={15} /> Xem chi tiết
                  </button>
                  <button type="button" role="menuitem" onClick={action(onEdit)}>
                    <Pencil size={15} /> Chỉnh sửa
                  </button>
                  {coupon.isActive && (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.menuDanger}
                      onClick={action(onDeactivate)}
                    >
                      <Power size={15} /> Tắt mã
                    </button>
                  )}
                  {!coupon.isActive && (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.menuPrimary}
                      onClick={action(onActivate)}
                    >
                      <Power size={15} /> Bật lại
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuDanger}
                    onClick={action(onDelete)}
                  >
                    <Trash2 size={15} /> Xóa mã
                  </button>
                </div>
              </details>
            </div>
          </div>

          {coupon.description && <p className={styles.couponDesc}>{coupon.description}</p>}

          <p className={styles.couponConditions}>
            Đơn tối thiểu {vnd(coupon.minimumOrderAmount)}
            {coupon.maximumDiscountAmount !== null &&
              ` · Giảm tối đa ${money(coupon.maximumDiscountAmount)}`}
          </p>

          <p className={styles.promotionMeta}>
            <CalendarDays size={13} />
            <span>
              {formatDate(coupon.startAt)} – {formatDate(coupon.expiresAt)}
            </span>
          </p>

          <div className={styles.couponCardFooter}>
            <span>
              Đã dùng <strong>{coupon.usedCount}</strong> · Giữ{" "}
              <strong>{coupon.reservedCount}</strong>
              {coupon.remainingUses !== null && ` · Còn ${coupon.remainingUses} lượt`}
            </span>
            <span className={styles.promotionScopeTag}>{scopeText}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CourseCouponsSection({ course }: { course: CourseItem }) {
  const client = useQueryClient();
  const formId = useId();
  const coupons = useCourseCoupons(course.id);
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [viewing, setViewing] = useState<Coupon | null>(null);
  const [deactivating, setDeactivating] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [actionError, setActionError] = useState("");
  const [now] = useState(() => Date.now());

  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["course-coupons", course.id] }),
      client.invalidateQueries({ queryKey: ["admin-coupons"] }),
    ]);

  const save = useMutation({
    mutationFn: ({ value, id }: { value: CouponPayload; id?: string }) =>
      id ? couponsApi.update(id, value) : couponsApi.create(value),
    onSuccess: refresh,
  });
  const activate = useMutation({
    mutationFn: (coupon: Coupon) => couponsApi.update(coupon.id, couponPayload(coupon, true)),
    onSuccess: async () => {
      setViewing(null);
      setActionError("");
      await refresh();
    },
    onError: (cause) => setActionError(purchaseError(cause)),
  });
  const deactivate = useMutation({
    mutationFn: couponsApi.deactivate,
    onSuccess: async () => {
      setDeactivating(null);
      setViewing(null);
      await refresh();
    },
    onError: (cause) => setActionError(purchaseError(cause)),
  });
  const remove = useMutation({
    mutationFn: couponsApi.delete,
    onSuccess: async () => {
      setActionError("");
      setDeleting(null);
      await refresh();
    },
    onError: (cause) => setActionError(purchaseError(cause)),
  });

  const openEdit = (coupon: Coupon) => {
    setActionError("");
    setViewing(null);
    setEditing(coupon);
  };
  const openCreate = () => {
    setActionError("");
    setViewing(null);
    setEditing("new");
  };
  const askDeactivate = (coupon: Coupon) => {
    setActionError("");
    setDeleting(null);
    setDeactivating(coupon);
  };
  const askDelete = (coupon: Coupon) => {
    setActionError("");
    setDeactivating(null);
    setViewing(null);
    setDeleting(coupon);
  };

  const activeCount = (coupons.data ?? []).filter(
    (coupon) =>
      promotionStatus(coupon, now) === "running" &&
      (coupon.remainingUses === null || coupon.remainingUses > 0),
  ).length;

  return (
    <section className={styles.couponSection} aria-label="Mã giảm giá">
      <div className={styles.pricingSectionHeader}>
        <div>
          <h3>Mã giảm giá</h3>
          <p className={styles.sectionDescription}>
            Học viên nhập mã khi thanh toán. Có thể áp dụng cho khóa học này hoặc toàn hệ thống. Có
            thể Tắt để ngừng áp dụng hoặc Xóa nếu mã chưa có lượt sử dụng.
          </p>
        </div>
        <div className={styles.sectionHeaderActions}>
          <span>{activeCount} đang hoạt động</span>
          <Button size="sm" icon={<Plus size={15} />} onClick={openCreate}>
            Tạo mã giảm giá
          </Button>
        </div>
      </div>

      {actionError && (
        <p className={styles.pricingError} role="alert">
          {actionError}
        </p>
      )}

      {coupons.isPending ? (
        <p role="status">Đang tải mã giảm giá…</p>
      ) : coupons.isError ? (
        <p role="alert" className={styles.pricingError}>
          Không tải được mã giảm giá.{" "}
          <Button size="sm" onClick={() => void coupons.refetch()}>
            Thử lại
          </Button>
        </p>
      ) : !coupons.data.length ? (
        <EmptyState
          title="Chưa có mã giảm giá"
          description="Tạo mã giảm giá nếu muốn học viên chủ động nhập mã khi thanh toán."
          action={
            <Button variant="primary" onClick={openCreate}>
              Tạo mã giảm giá
            </Button>
          }
        />
      ) : (
        <div className={styles.couponGrid}>
          {coupons.data.map((coupon) => (
            <CouponCard
              key={coupon.id}
              course={course}
              coupon={coupon}
              now={now}
              onView={() => setViewing(coupon)}
              onEdit={() => openEdit(coupon)}
              onActivate={() => activate.mutate(coupon)}
              onDeactivate={() => askDeactivate(coupon)}
              onDelete={() => askDelete(coupon)}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing === "new" ? "Tạo mã giảm giá" : `Sửa mã ${editing?.code ?? ""}`}
        description={
          editing === "new"
            ? "Mã giảm giá sẽ được gắn với khóa học đang xem."
            : "Cập nhật điều kiện, thời gian và giới hạn của mã giảm giá."
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
              {save.isPending ? "Đang lưu…" : "Lưu mã giảm giá"}
            </Button>
          </>
        }
      >
        {editing && (
          <CouponForm
            key={editing === "new" ? "new" : editing.id}
            formId={formId}
            initial={editing === "new" ? undefined : editing}
            course={editing === "new" ? { id: course.id, title: course.title } : undefined}
            embedded
            busy={save.isPending}
            save={(value) =>
              save
                .mutateAsync({
                  value,
                  id: editing === "new" ? undefined : editing.id,
                })
                .then(() => undefined)
            }
            close={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(viewing)}
        title={viewing ? `Mã ${viewing.code}` : "Chi tiết mã giảm giá"}
        description={`Thông tin mã giảm giá áp dụng cho ${course.title}.`}
        onClose={() => setViewing(null)}
        footer={
          viewing && (
            <>
              <Button onClick={() => setViewing(null)}>Đóng</Button>
              {viewing.isActive && (
                <Button variant="danger-outline" onClick={() => askDeactivate(viewing)}>
                  Tắt mã
                </Button>
              )}
              {!viewing.isActive && (
                <Button
                  variant="primary"
                  icon={<Power size={15} />}
                  disabled={activate.isPending}
                  onClick={() => activate.mutate(viewing)}
                >
                  Bật lại
                </Button>
              )}
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
                onClick={() => openEdit(viewing)}
              >
                Chỉnh sửa
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <div className={styles.couponDetail}>
            <div className={styles.couponDetailValue}>
              <span>Mức giảm</span>
              <strong>{discountLabel(viewing)}</strong>
              <small>
                Đơn tối thiểu {vnd(viewing.minimumOrderAmount)}
                {viewing.maximumDiscountAmount !== null &&
                  ` · tối đa ${money(viewing.maximumDiscountAmount)}`}
              </small>
            </div>
            <dl className={styles.promotionDetailList}>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <Badge
                    tone={
                      promotionStatus(viewing, now) === "running"
                        ? "green"
                        : promotionStatus(viewing, now) === "scheduled"
                          ? "blue"
                          : "neutral"
                    }
                    dot
                  >
                    {promotionStatusLabel(promotionStatus(viewing, now))}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Mô tả</dt>
                <dd>{viewing.description || "Không có"}</dd>
              </div>
              <div>
                <dt>Thời gian</dt>
                <dd>
                  {formatDate(viewing.startAt)} – {formatDate(viewing.expiresAt)}
                </dd>
              </div>
              <div>
                <dt>Lượt sử dụng</dt>
                <dd>
                  {viewing.usedCount} đã dùng · {viewing.reservedCount} đang giữ · còn lại{" "}
                  {viewing.remainingUses === null ? "không giới hạn" : viewing.remainingUses}
                </dd>
              </div>
              <div>
                <dt>Giới hạn</dt>
                <dd>
                  Toàn hệ thống{" "}
                  {viewing.usageLimit === null ? "không giới hạn" : viewing.usageLimit} · mỗi học
                  viên {viewing.perUserLimit === null ? "không giới hạn" : viewing.perUserLimit}
                </dd>
              </div>
              <div>
                <dt>Phạm vi</dt>
                <dd>
                  {viewing.applicableCourseIds.length === 0
                    ? "Tất cả khóa học"
                    : viewing.applicableCourseIds.includes(course.id)
                      ? "Có áp dụng cho khóa học này"
                      : `${viewing.applicableCourseIds.length} khóa học`}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivating)}
        title="Tắt mã giảm giá?"
        description={`Mã ${deactivating?.code ?? ""} sẽ không thể dùng cho đơn mới.`}
        confirmLabel="Tắt mã"
        pending={deactivate.isPending}
        error={actionError || undefined}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && deactivate.mutate(deactivating.id)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa mã giảm giá?"
        description={`Xóa vĩnh viễn mã ${deleting?.code ?? ""}? Chỉ xóa được khi mã chưa có lượt sử dụng hoặc giữ chỗ. Thao tác không thể hoàn tác.`}
        confirmLabel="Xóa mã"
        pending={remove.isPending}
        error={actionError || undefined}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </section>
  );
}

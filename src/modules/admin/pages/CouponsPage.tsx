import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Eye, MoreVertical, Power, Trash2 } from "lucide-react";
import {
  AdminPage,
  Badge,
  Button,
  ConfirmDialog,
  DataToolbar,
  EmptyState,
  Modal,
  Pagination,
} from "../components/ui";
import { couponPayload, couponsApi, type Coupon, type CouponPayload } from "../api/coupons.api";
import { CouponForm } from "../components/CouponForm";
import { Select } from "@/shared/components/Select";
import { purchaseError } from "../../courses/purchaseError";
import purchaseStyles from "../../courses/purchase.module.css";
import styles from "./CoursesPage.module.css";
import { formatDate, promotionStatus, promotionStatusLabel } from "../utils/promotion";
import toolbarStyles from "./CouponsPage.module.css";

const limit = (value: number | null) => (value === null ? "Không giới hạn" : String(value));

export function CouponsPage() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [actionCoupon, setActionCoupon] = useState<Coupon | null>(null);
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [activationError, setActivationError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pageSize = 12;
  const [now] = useState(() => Date.now());
  const isActive = filter === "all" ? undefined : filter === "active";
  const list = useQuery({
    queryKey: ["admin-coupons", page, search, isActive],
    queryFn: ({ signal }) =>
      couponsApi.list({ search: search || undefined, isActive, page, pageSize }, signal),
    retry: false,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin-coupons"] });
  const update = useMutation({
    mutationFn: ({ value, id }: { value: CouponPayload; id?: string }) =>
      id ? couponsApi.update(id, value) : couponsApi.create(value),
    onSuccess: refresh,
  });
  const activate = useMutation({
    mutationFn: (coupon: Coupon) => couponsApi.update(coupon.id, couponPayload(coupon, true)),
    onSuccess: async () => {
      setActivationError("");
      await refresh();
    },
    onError: (cause) => setActivationError(purchaseError(cause)),
  });
  const deactivate = useMutation({
    mutationFn: couponsApi.deactivate,
    onSuccess: async () => {
      setActionCoupon(null);
      setConfirmAction(null);
      setError("");
      await refresh();
    },
    onError: (cause) => setError(purchaseError(cause)),
  });
  const remove = useMutation({
    mutationFn: couponsApi.delete,
    onSuccess: async () => {
      setActionCoupon(null);
      setConfirmAction(null);
      setError("");
      await refresh();
    },
    onError: (cause) => setError(purchaseError(cause)),
  });
  return (
    <AdminPage
      theme="rose"
      eyebrow="Quản trị nội dung / Khóa học"
      title="Mã giảm giá"
      description="Tạo coupon áp dụng cho nhiều khóa học hoặc toàn hệ thống; học viên nhập mã khi thanh toán."
      actions={
        <Button
          variant="primary"
          onClick={() => {
            setEditing("new");
            setError("");
          }}
        >
          + Tạo mã giảm giá
        </Button>
      }
    >
      <main
        className={`${purchaseStyles.page} ${purchaseStyles.adminPage} ${toolbarStyles.couponPage}`}
      >
        <DataToolbar
          className={toolbarStyles.filterToolbar}
          search={search}
          onSearch={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Tìm mã giảm giá..."
          trailing={
            <div className={toolbarStyles.filterSelect}>
              <Select
                aria-label="Lọc theo trạng thái"
                value={filter}
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "active", label: "Đang hoạt động" },
                  { value: "inactive", label: "Đã tắt" },
                ]}
                onChange={(value) => {
                  setFilter(value);
                  setPage(1);
                }}
              />
            </div>
          }
        />
        {activationError && <p role="alert">{activationError}</p>}
        {list.isPending ? (
          <p role="status">Đang tải mã giảm giá…</p>
        ) : list.isError ? (
          <EmptyState
            title="Không tải được mã giảm giá"
            action={<Button onClick={() => void list.refetch()}>Thử lại</Button>}
          />
        ) : !list.data.items.length ? (
          <EmptyState title="Không có mã giảm giá phù hợp" />
        ) : (
          <>
            <div className={styles.couponGrid}>
              {list.data.items.map((item) => {
                const status = promotionStatus(item, now);
                return (
                  <article
                    className={styles.couponCard}
                    data-status={status}
                    data-type={item.discountType}
                    key={item.id}
                  >
                    <div className={styles.promotionCardBody}>
                      <div className={styles.couponValueStub}>
                        <strong>
                          {item.discountType === "Percentage"
                            ? `-${item.discountValue}%`
                            : `-${new Intl.NumberFormat("vi-VN").format(item.discountValue)}₫`}
                        </strong>
                        <span>{item.discountType === "Percentage" ? "Phần trăm" : "Số tiền"}</span>
                      </div>
                      <div className={styles.promotionCardContent}>
                        <div className={styles.couponTop}>
                          <strong className={styles.couponCode}>{item.code}</strong>
                          <div className={styles.promotionCardTools}>
                            <Badge
                              tone={
                                status === "running"
                                  ? "green"
                                  : status === "scheduled"
                                    ? "blue"
                                    : "neutral"
                              }
                              dot
                            >
                              {promotionStatusLabel(status)}
                            </Badge>
                            <details
                              className={styles.cardMenu}
                              open={openMenu === item.id}
                              onToggle={(event) =>
                                setOpenMenu(event.currentTarget.open ? item.id : null)
                              }
                            >
                              <summary aria-label={`Thao tác mã giảm giá ${item.code}`}>
                                <MoreVertical size={17} />
                              </summary>
                              <div className={styles.cardMenuPanel} role="menu">
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setEditing(item);
                                    setOpenMenu(null);
                                  }}
                                >
                                  <Eye size={15} /> Chỉnh sửa
                                </button>
                                {item.isActive && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={styles.menuDanger}
                                    onClick={() => {
                                      setError("");
                                      setActionCoupon(item);
                                      setConfirmAction("deactivate");
                                      setOpenMenu(null);
                                    }}
                                  >
                                    <Power size={15} /> Tắt mã
                                  </button>
                                )}
                                {!item.isActive && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={styles.menuPrimary}
                                    disabled={activate.isPending}
                                    onClick={() => {
                                      setActivationError("");
                                      setOpenMenu(null);
                                      activate.mutate(item);
                                    }}
                                  >
                                    <Power size={15} /> Bật lại mã
                                  </button>
                                )}
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={styles.menuDanger}
                                  onClick={() => {
                                    setError("");
                                    setActionCoupon(item);
                                    setConfirmAction("delete");
                                    setOpenMenu(null);
                                  }}
                                >
                                  <Trash2 size={15} /> Xóa mã
                                </button>
                              </div>
                            </details>
                          </div>
                        </div>
                        {item.description && (
                          <p className={styles.couponDesc}>{item.description}</p>
                        )}
                        <p className={styles.promotionMeta}>
                          <CalendarDays size={14} />
                          {formatDate(item.startAt)} – {formatDate(item.expiresAt)}
                        </p>
                        <p className={styles.couponConditions}>
                          Đơn tối thiểu{" "}
                          {new Intl.NumberFormat("vi-VN").format(item.minimumOrderAmount)} ₫ · Đã
                          dùng {item.usedCount} · Đang giữ {item.reservedCount}
                        </p>
                        <div className={styles.couponCardFooter}>
                          <span>Còn lại {limit(item.remainingUses)}</span>
                          <span className={styles.promotionScopeTag}>
                            {item.applicableCourseIds.length
                              ? `${item.applicableCourseIds.length} khóa học`
                              : "Tất cả khóa học"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <Pagination
              page={list.data.page}
              pages={Math.ceil(list.data.totalCount / list.data.pageSize)}
              pageSize={list.data.pageSize}
              total={list.data.totalCount}
              onChange={setPage}
            />
          </>
        )}

        <Modal
          open={Boolean(editing)}
          title={editing === "new" ? "Tạo mã giảm giá" : `Sửa mã ${editing?.code ?? ""}`}
          description="Chọn một hoặc nhiều khóa học, hoặc để trống phạm vi để áp dụng toàn hệ thống."
          wide
          busy={update.isPending}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button onClick={() => setEditing(null)} disabled={update.isPending}>
                Hủy
              </Button>
              <Button
                type="submit"
                form="admin-coupon-form"
                variant="primary"
                disabled={update.isPending}
              >
                {update.isPending ? "Đang lưu…" : "Lưu mã giảm giá"}
              </Button>
            </>
          }
        >
          {editing && (
            <CouponForm
              key={editing === "new" ? "new" : editing.id}
              formId="admin-coupon-form"
              embedded
              initial={editing === "new" ? undefined : editing}
              busy={update.isPending}
              save={async (value) => {
                await update.mutateAsync({ value, id: editing === "new" ? undefined : editing.id });
                setEditing(null);
              }}
              close={() => setEditing(null)}
            />
          )}
        </Modal>
        <ConfirmDialog
          open={Boolean(actionCoupon)}
          title={confirmAction === "deactivate" ? "Tắt mã giảm giá?" : "Xóa mã giảm giá?"}
          description={
            confirmAction === "deactivate"
              ? `Mã ${actionCoupon?.code ?? ""} sẽ không thể dùng cho đơn mới.`
              : `Xóa vĩnh viễn mã ${actionCoupon?.code ?? ""}? Chỉ xóa được khi chưa có lượt sử dụng hoặc giữ chỗ. Thao tác không thể hoàn tác.`
          }
          confirmLabel={confirmAction === "deactivate" ? "Tắt mã" : "Xóa mã"}
          tone={confirmAction === "deactivate" ? "default" : "danger"}
          pending={confirmAction === "deactivate" ? deactivate.isPending : remove.isPending}
          error={error || undefined}
          onClose={() => {
            setActionCoupon(null);
            setConfirmAction(null);
            setError("");
          }}
          onConfirm={() => {
            if (!actionCoupon) return;
            if (confirmAction === "deactivate") deactivate.mutate(actionCoupon.id);
            else remove.mutate(actionCoupon.id);
          }}
        />
      </main>
    </AdminPage>
  );
}

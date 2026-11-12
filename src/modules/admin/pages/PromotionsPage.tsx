import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, EmptyState } from "../components/ui";
import { CouponCourses } from "../components/CouponCourses";
import { DateTimePicker } from "@/shared/components/DatePicker";
import { promotionsApi, type Promotion } from "../api/promotions.api";
import { purchaseError } from "../../courses/purchaseError";
import styles from "../../courses/purchase.module.css";

const blank = (): Promotion => ({
  id: "",
  name: "",
  discountType: "Percentage",
  discountValue: 10,
  maximumDiscountAmount: null,
  startAt: "",
  expiresAt: "",
  isActive: true,
  usageLimit: null,
  courseIds: [],
});
const local = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

export function PromotionsPage() {
  const client = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: ({ signal }) => promotionsApi.list(signal),
    retry: false,
  });
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: promotionsApi.save,
    onSuccess: () => {
      setEditing(null);
      setError("");
      void client.invalidateQueries({ queryKey: ["admin-promotions"] });
    },
    onError: (cause) => setError(purchaseError(cause)),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      promotionsApi.active(id, active),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["admin-promotions"] }),
    onError: (cause) => setError(purchaseError(cause)),
  });
  const preview = useMutation({
    mutationFn: ({ id, value }: { id: string; value: Promotion }) =>
      promotionsApi.preview(id, value),
    onError: (cause) => setError(purchaseError(cause)),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !editing.courseIds.length) {
      setError("Chọn ít nhất một khóa học.");
      return;
    }
    save.mutate({
      ...editing,
      startAt: new Date(editing.startAt).toISOString(),
      expiresAt: new Date(editing.expiresAt).toISOString(),
    });
  };
  const set = (patch: Partial<Promotion>) =>
    setEditing((previous) => (previous ? { ...previous, ...patch } : null));
  return (
    <main className={`${styles.page} ${styles.adminPage}`}>
      <h1>Khuyến mãi khóa học</h1>
      <Button
        variant="primary"
        onClick={() => {
          setError("");
          preview.reset();
          setEditing(blank());
        }}
      >
        Tạo khuyến mãi
      </Button>
      {error && <p role="alert">{error}</p>}
      {list.isPending ? (
        <p role="status">Đang tải khuyến mãi…</p>
      ) : list.isError ? (
        <EmptyState
          title="Không tải được khuyến mãi"
          action={<Button onClick={() => void list.refetch()}>Thử lại</Button>}
        />
      ) : (
        <div className={styles.grid}>
          {list.data.map(({ promotion: p, usedCount, reservedCount }) => (
            <article className={styles.panel} key={p.id}>
              <h2>{p.name}</h2>
              <p>
                {p.discountType === "Percentage" ? `${p.discountValue}%` : vnd(p.discountValue)} ·{" "}
                {p.isActive ? "Đang bật" : "Đã tắt"}
              </p>
              <p>
                {new Date(p.startAt).toLocaleString("vi-VN")} –{" "}
                {new Date(p.expiresAt).toLocaleString("vi-VN")}
              </p>
              <p>
                Đã dùng: {usedCount} · Đang giữ: {reservedCount} · Giới hạn:{" "}
                {p.usageLimit ?? "Không giới hạn"}
              </p>
              <div className={styles.row}>
                <Button
                  onClick={() => {
                    setError("");
                    preview.reset();
                    setEditing({ ...p, startAt: local(p.startAt), expiresAt: local(p.expiresAt) });
                  }}
                >
                  Sửa
                </Button>
                <Button
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: p.id, active: !p.isActive })}
                >
                  {p.isActive ? "Tắt" : "Bật"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <form className={styles.panel} onSubmit={submit}>
          <h2>{editing.id ? "Chỉnh sửa" : "Tạo khuyến mãi"}</h2>
          <label>
            Tên{" "}
            <input
              required
              maxLength={160}
              value={editing.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <label>
            Loại giảm{" "}
            <select
              value={editing.discountType}
              onChange={(e) => set({ discountType: e.target.value as Promotion["discountType"] })}
            >
              <option value="Percentage">Phần trăm</option>
              <option value="FixedAmount">Số tiền</option>
            </select>
          </label>
          <label>
            Giá trị{" "}
            <input
              type="number"
              required
              min={editing.discountType === "Percentage" ? 0.01 : 1}
              max={editing.discountType === "Percentage" ? 100 : undefined}
              step={editing.discountType === "Percentage" ? 0.01 : 1}
              value={editing.discountValue}
              onChange={(e) => set({ discountValue: Number(e.target.value) })}
            />
          </label>
          <label>
            Giảm tối đa (để trống nếu không giới hạn){" "}
            <input
              type="number"
              min={1}
              step={1}
              value={editing.maximumDiscountAmount ?? ""}
              onChange={(e) =>
                set({ maximumDiscountAmount: e.target.value ? Number(e.target.value) : null })
              }
            />
          </label>
          <label>
            Bắt đầu{" "}
            <DateTimePicker
              value={editing.startAt ? new Date(editing.startAt).toISOString() : ""}
              onChange={(value) => set({ startAt: local(value) })}
            />
          </label>
          <label>
            Kết thúc{" "}
            <DateTimePicker
              value={editing.expiresAt ? new Date(editing.expiresAt).toISOString() : ""}
              onChange={(value) => set({ expiresAt: local(value) })}
            />
          </label>
          <label>
            Giới hạn lượt dùng{" "}
            <input
              type="number"
              min={1}
              step={1}
              value={editing.usageLimit ?? ""}
              onChange={(e) => set({ usageLimit: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={editing.isActive}
              onChange={(e) => set({ isActive: e.target.checked })}
            />{" "}
            Kích hoạt
          </label>
          <CouponCourses
            requireSelection
            ids={editing.courseIds}
            onChange={(courseIds) => set({ courseIds })}
          />
          {editing.courseIds.length > 0 && (
            <Button
              type="button"
              disabled={
                !editing.startAt || !editing.expiresAt || !editing.name || preview.isPending
              }
              onClick={() =>
                preview.mutate({
                  id: editing.courseIds[0],
                  value: {
                    ...editing,
                    startAt: new Date(editing.startAt).toISOString(),
                    expiresAt: new Date(editing.expiresAt).toISOString(),
                  },
                })
              }
            >
              Xem trước giá khóa đầu tiên
            </Button>
          )}
          {preview.data && (
            <p>
              Giá gốc: {vnd(preview.data.originalPrice)} · Giảm: {vnd(preview.data.discountAmount)}{" "}
              · Giá bán: {vnd(preview.data.sellingPrice)}
            </p>
          )}
          <div className={styles.row}>
            <Button type="submit" disabled={save.isPending}>
              Lưu
            </Button>
            <Button type="button" onClick={() => setEditing(null)}>
              Đóng
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}

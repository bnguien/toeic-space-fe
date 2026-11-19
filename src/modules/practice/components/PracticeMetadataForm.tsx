import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Select } from "@/shared/components/Select";
import { Button, ConfirmDialog } from "@/modules/admin";
import type { PracticeSetDetail } from "../api/practice-sets.api";
import { practiceKinds } from "../api/practice-sets.api";
import { practiceSetSchema, type PracticeSetFormValues } from "../schemas/practice-set.schema";
import { kindLabels, partLabel, parts } from "../utils/practice";
import styles from "./Practice.module.css";

export function PracticeMetadataForm({
  set,
  busy,
  onSave,
  onDirtyChange,
  children,
  publishBlocked = true,
}: {
  set?: PracticeSetDetail;
  busy: boolean;
  onSave: (
    values: PracticeSetFormValues & { expectedUpdatedAt?: string },
    publish: boolean,
  ) => Promise<PracticeSetDetail>;
  onDirtyChange: (dirty: boolean) => void;
  children?: (part: PracticeSetFormValues["part"]) => ReactNode;
  publishBlocked?: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<PracticeSetFormValues>({
    resolver: zodResolver(practiceSetSchema),
    defaultValues: set
      ? { ...set, part: set.part as PracticeSetFormValues["part"] }
      : {
          code: "",
          title: "",
          description: "",
          kind: "Topic",
          part: "Part5",
          level: null,
          targetScore: null,
          durationMinutes: 30,
          orderIndex: 0,
        },
  });
  const [baseline, setBaseline] = useState(set);
  const [reloading, setReloading] = useState(false);
  // Match MySQL datetime(6) precision when a save response precedes the refetch.
  const revision = (value?: PracticeSetDetail) =>
    (value?.updatedAt ?? value?.createdAt)?.replace(/(\.\d{6})\d+/, "$1");
  const changed = Boolean(set && baseline && revision(set) !== revision(baseline));
  useEffect(() => {
    if (set && !isDirty && revision(set) !== revision(baseline)) {
      reset({ ...set, part: set.part as PracticeSetFormValues["part"] });
      // Synchronize RHF's external server baseline only when its revision changes and the form is clean.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaseline(set);
    }
  }, [set, baseline, isDirty, reset]);
  const kind = useWatch({ control, name: "kind" });
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  const selectedLevel = useWatch({ control, name: "level" });
  const selectedPart = useWatch({ control, name: "part" });
  const optionalNumber = (value: string) => (value === "" || value == null ? null : Number(value));
  return (
    <form
      className={styles.panel}
      onSubmit={handleSubmit(async (values, event) => {
        try {
          if (changed) return;
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)?.submitter;
          const publish = submitter instanceof HTMLButtonElement && submitter.value === "publish";
          const saved = await onSave({ ...values, expectedUpdatedAt: revision(baseline) }, publish);
          setBaseline(saved);
          reset({ ...saved, part: saved.part as PracticeSetFormValues["part"] });
        } catch {
          // Keep unsaved values; the page displays the API error.
        }
      })}
    >
      {changed && (
        <div role="alert">
          <p>Thông tin trên máy chủ đã thay đổi. Tải lại trước khi lưu để tránh ghi đè.</p>
          <Button onClick={() => setReloading(true)}>Tải lại thông tin</Button>
        </div>
      )}
      <ConfirmDialog
        pending={busy}
        open={reloading}
        title="Bỏ thay đổi và tải lại thông tin?"
        description="Thông tin chưa lưu sẽ bị bỏ."
        confirmLabel="Tải lại"
        onClose={() => setReloading(false)}
        onConfirm={() => {
          if (set) {
            reset({ ...set, part: set.part as PracticeSetFormValues["part"] });
            setBaseline(set);
          }
          setReloading(false);
        }}
      />
      <fieldset disabled={busy} className={styles.fields}>
        <legend>Thông tin bộ luyện tập</legend>
        <label>
          Mã bộ
          <input {...register("code")} maxLength={100} required />
        </label>
        <label>
          Tên bộ
          <input {...register("title")} maxLength={255} required />
        </label>
        <label className={styles.full}>
          Mô tả
          <textarea {...register("description")} maxLength={2000} rows={3} />
        </label>
        <label>
          TOEIC Part
          <input type="hidden" {...register("part")} />
          <Select
            aria-label="TOEIC Part"
            value={selectedPart}
            disabled={busy || Boolean(set?.items.length)}
            options={parts.map((part) => ({ value: part, label: partLabel(part) }))}
            onChange={(value) =>
              setValue("part", value as PracticeSetFormValues["part"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </label>
        <label>
          Loại bộ
          <Select
            aria-label="Loại bộ"
            value={kind}
            disabled={busy}
            options={practiceKinds.map((value) => ({ value, label: kindLabels[value] }))}
            onChange={(value) => {
              setValue("kind", value as PracticeSetFormValues["kind"], {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("level", value === "Level" ? 1 : null, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          />
        </label>
        {kind === "Level" && (
          <label>
            Cấp độ
            <Select
              aria-label="Cấp độ"
              value={String(selectedLevel ?? 1)}
              disabled={busy}
              options={[1, 2, 3, 4, 5].map((value) => ({
                value: String(value),
                label: String(value),
              }))}
              onChange={(value) =>
                setValue("level", Number(value), { shouldDirty: true, shouldValidate: true })
              }
            />
          </label>
        )}
        <label>
          Thời lượng (phút)
          <input
            type="number"
            min={1}
            max={1000}
            {...register("durationMinutes", { valueAsNumber: true })}
            required
          />
        </label>
        <label>
          Điểm mục tiêu (tùy chọn)
          <input
            type="number"
            min={10}
            max={990}
            {...register("targetScore", { setValueAs: optionalNumber })}
          />
        </label>
      </fieldset>
      {set?.items.length ? <p>Xóa toàn bộ câu hỏi và lưu trước khi đổi Part.</p> : null}
      {Object.entries(errors).map(([field, error]) => (
        <p key={field} role="alert">
          {error.message}
        </p>
      ))}
      {children?.(selectedPart)}
      <Button
        type="submit"
        variant="primary"
        disabled={busy || changed || Boolean(set && !isDirty)}
      >
        {busy ? "Đang lưu..." : set ? "Lưu thông tin" : "Lưu"}
      </Button>
      {!set && (
        <Button type="submit" value="publish" disabled={busy || publishBlocked}>
          Xuất bản
        </Button>
      )}
      {!set && <p>Bộ luyện tập chỉ được tạo khi bạn bấm Lưu hoặc Xuất bản.</p>}
      {isDirty && set && <p>Thông tin đang sửa chưa được lưu. Xuất bản sử dụng dữ liệu đã lưu.</p>}
    </form>
  );
}

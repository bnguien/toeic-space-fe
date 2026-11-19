import { practiceKinds, practiceStatuses } from "../api/practice-sets.api";
import { kindLabels, parts, partLabel, statusLabels, type FilterValues } from "../utils/practice";
import { Select } from "@/shared/components/Select";
import styles from "./Practice.module.css";

export function PracticeFilters({
  value,
  onChange,
  management = false,
}: {
  value: FilterValues;
  onChange: (value: FilterValues) => void;
  management?: boolean;
}) {
  const change = (key: keyof FilterValues, next: string) =>
    onChange({ ...value, [key]: next, ...(key === "kind" ? { level: "" } : {}) });
  return (
    <div className={styles.filters}>
      <label>
        Tìm kiếm
        <input
          value={value.search}
          maxLength={200}
          placeholder="Tên bộ luyện tập"
          onChange={(e) => change("search", e.target.value)}
        />
      </label>
      <label>
        TOEIC Part
        <Select
          aria-label="TOEIC Part"
          value={value.part}
          onChange={(value) => change("part", value)}
          options={[
            { value: "", label: "Tất cả Part" },
            ...parts.map((p) => ({ value: p, label: partLabel(p) })),
          ]}
        />
      </label>
      <label>
        Loại bộ
        <Select
          aria-label="Loại bộ"
          value={value.kind}
          onChange={(value) => change("kind", value)}
          options={[
            { value: "", label: "Tất cả loại" },
            ...practiceKinds.map((k) => ({ value: k, label: kindLabels[k] })),
          ]}
        />
      </label>
      {value.kind === "Level" && (
        <label>
          Cấp độ
          <Select
            aria-label="Cấp độ"
            value={value.level}
            onChange={(value) => change("level", value)}
            options={[
              { value: "", label: "Tất cả cấp độ" },
              ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
            ]}
          />
        </label>
      )}
      {management && (
        <label>
          Trạng thái
          <Select
            aria-label="Trạng thái"
            value={value.status}
            onChange={(value) => change("status", value)}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              ...practiceStatuses.map((s) => ({ value: s, label: statusLabels[s] })),
            ]}
          />
        </label>
      )}
    </div>
  );
}

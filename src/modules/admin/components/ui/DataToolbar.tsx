import type { ReactNode } from "react";

import { Segmented as SharedSegmented } from "@/shared/components/ui";

/** The list toolbar now lives in the shared kit; admin keeps importing it from here. */
export { DataToolbar, type FilterField, type ToolbarAction } from "@/shared/components/ui";

/** Admin list tabs: the shared Segmented in its subtle look. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; count?: number; icon?: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <SharedSegmented
      variant="subtle"
      label={label}
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}

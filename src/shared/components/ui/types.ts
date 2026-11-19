export type Tone =
  "blue" | "rose" | "green" | "pearl" | "neutral" | "mark" | "outline" | "pink" | "tone";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "danger" | "mark" | "ink" | "outline" | "tone";

export type ControlSize = "sm" | "md" | "lg";

/** Joins class names, skipping empty values. */
export const cx = (...names: Array<string | false | null | undefined>): string =>
  names.filter(Boolean).join(" ");

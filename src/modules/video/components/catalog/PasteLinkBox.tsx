import { ArrowRight, Link2 } from "lucide-react";

import type { DuplicateShareNote } from "../../types/video-catalog.types";
import { EXAMPLE_VIDEO_URL } from "./catalog-format";
import styles from "./PasteLinkBox.module.css";

export interface PasteLinkBoxProps {
  /** `hero` = desktop hero card, `mobile` = the collapse under "Tạo video song ngữ". */
  variant: "hero" | "mobile";
  url: string;
  onUrlChange: (url: string) => void;
  /** Enter or the button; the page decides between opening and sending guests to login. */
  onSubmit: () => void;
  isOpening: boolean;
  isGuest: boolean;
  /** Resolve error; hidden for guests (not signed in is not a wrong link). */
  error?: string;
  /** "Video này đã được … chia sẻ trước" after a public toggle hit a duplicate. */
  duplicate?: DuplicateShareNote | null;
  onDismissDuplicate?: () => void;
}

/** Paste-URL input with its submit button, error line, duplicate note and example link. */
export function PasteLinkBox({
  variant,
  url,
  onUrlChange,
  onSubmit,
  isOpening,
  isGuest,
  error,
  duplicate,
  onDismissDuplicate,
}: PasteLinkBoxProps) {
  const isHero = variant === "hero";
  const label = isOpening
    ? isHero
      ? "Đang mở..."
      : "Đang tạo..."
    : isGuest
      ? "Đăng nhập để học"
      : isHero
        ? "Học ngay"
        : "Xác nhận";

  const input = (
    <input
      type="text"
      className={styles.urlInput}
      value={url}
      onChange={(event) => onUrlChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSubmit();
      }}
      placeholder={
        isHero
          ? "Dán link YouTube vào đây..."
          : "Dán link YouTube vào đây (https://www.youtube.com/watch?v=...)..."
      }
      autoFocus={!isHero}
    />
  );

  const button = (
    <button
      type="button"
      className={isHero ? styles.submitHero : styles.submitMobile}
      onClick={onSubmit}
      disabled={isOpening}
    >
      {label}
      <ArrowRight size={16} />
    </button>
  );

  const box = isHero ? (
    <div className={styles.searchBarWrap}>
      <div className={styles.inputBox}>
        <Link2 className={styles.linkIcon} size={18} />
        {input}
        {button}
      </div>
    </div>
  ) : (
    <div className={styles.inputBox}>
      <div className={styles.inputWrap}>
        <Link2 className={styles.linkIcon} size={18} />
        {input}
      </div>
      {button}
    </div>
  );

  return (
    <>
      {box}

      {error && !isGuest && <div className={styles.error}>{error}</div>}

      {duplicate && (
        <div className={styles.note}>
          <span>
            Video này đã được <b>{duplicate.name}</b> chia sẻ trước
            {duplicate.count > 2 ? ` (${duplicate.count} người cùng chia sẻ)` : ""}. Mục tham khảo
            chỉ hiện một thẻ chung.
          </span>
          <button type="button" onClick={onDismissDuplicate} aria-label="Đóng">
            ✕
          </button>
        </div>
      )}

      <div className={styles.example}>
        <span>Ví dụ: </span>
        <button
          type="button"
          className={styles.exampleLink}
          onClick={() => onUrlChange(EXAMPLE_VIDEO_URL)}
        >
          {EXAMPLE_VIDEO_URL}
        </button>
      </div>
    </>
  );
}

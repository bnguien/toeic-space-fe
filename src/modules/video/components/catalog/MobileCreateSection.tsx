import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cx } from "@/shared/components/ui";

import { PasteLinkBox, type PasteLinkBoxProps } from "./PasteLinkBox";
import styles from "./MobileCreateSection.module.css";

export type MobileCreateSectionProps = Omit<PasteLinkBoxProps, "variant">;

const YOUTUBE_PATH =
  "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z";

/** Mobile "Tạo video song ngữ": gradient button that expands into the paste-URL box. */
export function MobileCreateSection(props: MobileCreateSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={cx(styles.createButton, open && styles.isOpen)}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className={styles.watermark} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d={YOUTUBE_PATH} />
          </svg>
        </span>

        <div className={styles.badge}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff" aria-hidden="true">
            <path d={YOUTUBE_PATH} />
          </svg>
        </div>

        <div className={styles.content}>
          <span className={styles.text}>Tạo video song ngữ</span>
          <span className={styles.sub}>
            Dán link YouTube để tạo video luyện nghe phụ đề song ngữ &amp; tra từ thông minh
          </span>
        </div>

        <div className={styles.arrowWrap}>
          <ChevronDown className={cx(styles.arrow, open && styles.arrowOpen)} size={20} />
        </div>
      </button>

      {open && (
        <div className={styles.collapse}>
          <PasteLinkBox variant="mobile" {...props} />
        </div>
      )}
    </section>
  );
}

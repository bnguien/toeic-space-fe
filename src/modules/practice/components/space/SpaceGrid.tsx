import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, History, LogIn } from "lucide-react";

import { Button, ButtonLink, IconButton, Modal } from "@/shared/components/ui";

import styles from "./SpaceGrid.module.css";

interface GridBarProps {
  title: string;
  count: string;
  style?: CSSProperties;
  onBack: () => void;
  onStats: () => void;
  signedIn: boolean;
}

/** Top bar of a card grid: back to the overview · title · count · shortcuts. */
export function GridBar({ title, count, style, onBack, onStats, signedIn }: GridBarProps) {
  return (
    <div className={styles.bar} style={style}>
      <IconButton label="Về Tổng quan" variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft size={16} />
      </IconButton>
      <h1 className={styles.title}>{title}</h1>
      <span className={styles.count}>{count}</span>
      <span className={styles.hub}>
        <button type="button" className={styles.hubItem} onClick={onStats}>
          <BarChart3 size={16} aria-hidden="true" /> Phân tích
        </button>
        {signedIn && (
          <Link to="/practice/history" className={styles.hubItem}>
            <History size={16} aria-hidden="true" /> Lịch sử
          </Link>
        )}
      </span>
    </div>
  );
}

export function GridSection({
  title,
  note,
  children,
  variant = "cards",
}: {
  title?: string;
  note?: ReactNode;
  children: ReactNode;
  variant?: "cards" | "listen" | "mini";
}) {
  return (
    <section className={styles.section}>
      {(title || note) && (
        <header className={styles.sectionHead}>
          {title && <h2 className={styles.sectionTitle}>{title}</h2>}
          {note && <p className={styles.note}>{note}</p>}
        </header>
      )}
      <div className={styles.grid} data-variant={variant}>
        {children}
      </div>
    </section>
  );
}

export function GridSubhead({ children }: { children: ReactNode }) {
  return <h3 className={styles.subhead}>{children}</h3>;
}

/**
 * Asked when a guest (or a staff account) opens an item: StudyChill's login prompt, here as a
 * small dialog leading to the TOEIC Space sign-in page with `next`.
 */
export function SignInPrompt({
  open,
  reason,
  next,
  staff,
  onClose,
}: {
  open: boolean;
  reason: string;
  next: string;
  staff: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={staff ? "Chỉ dành cho học viên" : "Đăng nhập để luyện tập"}
      description={
        staff
          ? "Tài khoản quản trị và giáo viên không làm bài. Đăng nhập bằng tài khoản học viên để luyện đề và lưu điểm."
          : reason
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Để sau
          </Button>
          {!staff && (
            <ButtonLink
              to={`/login?next=${encodeURIComponent(next)}`}
              variant="primary"
              icon={<LogIn size={16} />}
            >
              Đăng nhập
            </ButtonLink>
          )}
        </>
      }
    />
  );
}

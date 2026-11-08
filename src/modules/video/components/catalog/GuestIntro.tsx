import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bookmark, Clapperboard, Link2, Lock } from "lucide-react";

import { videoLoginUrl } from "../../utils/video-paths";
import styles from "./GuestIntro.module.css";

interface GuestStep {
  icon: ReactNode;
  title: string;
  description: string;
}

const GUEST_STEPS: GuestStep[] = [
  {
    icon: <Link2 size={18} />,
    title: "Dán link YouTube",
    description: "Video nào có phụ đề tiếng Anh cũng học được.",
  },
  {
    icon: <Clapperboard size={18} />,
    title: "Xem phụ đề song ngữ",
    description: "Anh – Việt chạy theo lời, bấm vào từ để tra nghĩa.",
  },
  {
    icon: <Bookmark size={18} />,
    title: "Lưu từ, ôn lại",
    description: "Từ đã lưu vào sổ từ vựng, ôn bằng thẻ ghi nhớ.",
  },
];

export interface GuestIntroProps {
  /** Pasted link kept through login so the page opens it afterwards (`?v=`). */
  linkVideo?: string;
}

/**
 * One block for guests in place of "Video của tôi" / "Video tham khảo": three steps and the
 * login / register buttons (login returns to this page, with the pasted link when there is one).
 */
export function GuestIntro({ linkVideo }: GuestIntroProps) {
  const navigate = useNavigate();
  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>
          <Lock size={13} /> Dành cho thành viên
        </span>
        <h2 className={styles.title}>Đăng nhập để bắt đầu học với video</h2>
        <p className={styles.subtitle}>
          Video bạn mở, từ đã lưu và tiến độ ôn tập đều gắn với tài khoản — lần sau quay lại là thấy
          ngay, không phải dán link lại.
        </p>
      </div>

      <ol className={styles.steps}>
        {GUEST_STEPS.map(({ icon, title, description }, index) => (
          <li key={title} className={styles.step}>
            <span className={styles.stepIcon}>{icon}</span>
            <span className={styles.stepNumber}>Bước {index + 1}</span>
            <strong>{title}</strong>
            <p>{description}</p>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => navigate(videoLoginUrl(linkVideo || undefined))}
        >
          Đăng nhập <ArrowRight size={15} />
        </button>
        <button type="button" className={styles.ghost} onClick={() => navigate("/register")}>
          Tạo tài khoản miễn phí
        </button>
      </div>
    </section>
  );
}

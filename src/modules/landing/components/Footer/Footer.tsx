import { Link, useNavigate } from "react-router-dom";
import mascotLogo from "@/assets/mascot/oy2-hello.png";
import styles from "./Footer.module.css";

const PRACTICE_LINKS = [
  { to: "/practice/exam", label: "Luyện đề – thi thử 200 câu" },
  { to: "/practice/listening?part=1", label: "Part 1 – Mô tả tranh" },
  { to: "/practice/listening?part=2", label: "Part 2 – Hỏi & đáp" },
  { to: "/practice/listening?part=3", label: "Part 3 – Đoạn hội thoại" },
  { to: "/practice/listening?part=4", label: "Part 4 – Bài nói ngắn" },
  { to: "/practice/reading?part=5", label: "Part 5 – Hoàn thành câu" },
  { to: "/practice/reading?part=6", label: "Part 6 – Hoàn thành đoạn" },
  { to: "/practice/reading?part=7", label: "Part 7 – Đọc hiểu đơn & kép" },
];

interface FooterProps {
  onNavClick?: (targetId: string) => void;
}

export const Footer = ({ onNavClick }: FooterProps) => {
  const navigate = useNavigate();

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (onNavClick) {
      onNavClick(id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate(id === "hero" ? "/" : `/#${id}`);
      }
    }
  };

  return (
    <footer id="about" className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.topGrid}>
          {/* Brand Column */}
          <div className={styles.brandCol}>
            <a
              href="#hero"
              className={styles.brandLink}
              onClick={(e) => handleScroll(e, "hero")}
              aria-label="Về đầu trang TOEICSpace"
            >
              <img src={mascotLogo} alt="TOEICSpace Mascot" className={styles.brandMascotImg} />
              <span className={styles.brandText}>TOEICSpace</span>
            </a>

            <p className={styles.brandDesc}>
              Không gian luyện thi TOEIC yên tĩnh, thông minh và cá nhân hoá lộ trình theo năng lực
              từng học viên.
            </p>

            <div className={styles.socialRow}>
              <a href="#facebook" className={styles.socialBtn} aria-label="Facebook">
                f
              </a>
              <a href="#youtube" className={styles.socialBtn} aria-label="YouTube">
                ▶
              </a>
              <a href="#tiktok" className={styles.socialBtn} aria-label="TikTok">
                ♪
              </a>
            </div>
          </div>

          {/* Links Column 1: Luyện thi */}
          <div className={styles.linksCol}>
            <h4>Luyện thi TOEIC</h4>
            <ul className={styles.linksList}>
              {PRACTICE_LINKS.map((link) => (
                <li key={link.to} className={styles.linkItem}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2: Khóa học & lộ trình */}
          <div className={styles.linksCol}>
            <h4>Khóa học & Lộ trình</h4>
            <ul className={styles.linksList}>
              <li className={styles.linkItem}>
                <a href="/#ngu-phap" onClick={(e) => handleScroll(e, "ngu-phap")}>
                  Lộ trình ngữ pháp
                </a>
              </li>
              <li className={styles.linkItem}>
                <Link to="/courses">Khoá học TOEIC</Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/vocabulary">Lộ trình từ vựng</Link>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Về chúng tôi */}
          <div className={styles.linksCol}>
            <h4>Về TOEICSpace</h4>
            <ul className={styles.linksList}>
              <li className={styles.linkItem}>
                <a href="/#ban-do" onClick={(e) => handleScroll(e, "ban-do")}>
                  Bản đồ TOEICSpace
                </a>
              </li>
              <li className={styles.linkItem}>
                <Link to="/games/news">Đọc báo song ngữ</Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/games/video">Video song ngữ</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomRow}>
          <div className={styles.copyright}>
            © 2026 TOEICSpace. Hệ thống Ôn luyện & Khảo thí TOEIC tích hợp LMS Quản lý Trung tâm.
          </div>

          <div className={styles.legalLinks}>
            <a href="#terms" className={styles.legalLink}>
              Điều khoản dịch vụ
            </a>
            <a href="#privacy" className={styles.legalLink}>
              Chính sách bảo mật
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

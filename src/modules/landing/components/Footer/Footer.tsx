import { useNavigate } from "react-router-dom";
import mascotLogo from "@/assets/mascot/oy2-hello.png";
import styles from "./Footer.module.css";

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
              <li className={styles.linkItem}>
                <a href="#listening" onClick={(e) => handleScroll(e, "listening")}>
                  Part 1 – Mô tả tranh
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#listening" onClick={(e) => handleScroll(e, "listening")}>
                  Part 2 – Hỏi & đáp
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#listening" onClick={(e) => handleScroll(e, "listening")}>
                  Part 3 – Đoạn hội thoại
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#listening" onClick={(e) => handleScroll(e, "listening")}>
                  Part 4 – Bài nói ngắn
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#reading" onClick={(e) => handleScroll(e, "reading")}>
                  Part 5 – Hoàn thành câu
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#reading" onClick={(e) => handleScroll(e, "reading")}>
                  Part 6 – Hoàn thành đoạn
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#reading" onClick={(e) => handleScroll(e, "reading")}>
                  Part 7 – Đọc hiểu đơn & kép
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Khóa học */}
          <div className={styles.linksCol}>
            <h4>Khóa học & Lộ trình</h4>
            <ul className={styles.linksList}>
              <li className={styles.linkItem}>
                <a href="#courses" onClick={(e) => handleScroll(e, "courses")}>
                  TOEIC Khởi động 450+
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#courses" onClick={(e) => handleScroll(e, "courses")}>
                  TOEIC Đột phá 650+
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#courses" onClick={(e) => handleScroll(e, "courses")}>
                  TOEIC Chinh phục 800+
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#roadmap" onClick={(e) => handleScroll(e, "roadmap")}>
                  Lộ trình cá nhân hoá
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#vocabulary" onClick={(e) => handleScroll(e, "vocabulary")}>
                  Kho từ vựng thông minh AI
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Về chúng tôi */}
          <div className={styles.linksCol}>
            <h4>Về TOEICSpace</h4>
            <ul className={styles.linksList}>
              <li className={styles.linkItem}>
                <a href="#about" onClick={(e) => handleScroll(e, "about")}>
                  Giới thiệu dự án PBL6
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#ecosystem" onClick={(e) => handleScroll(e, "ecosystem")}>
                  Đối tác trường học
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="#faq">Câu hỏi thường gặp</a>
              </li>
              <li className={styles.linkItem}>
                <a href="#contact">Liên hệ hỗ trợ</a>
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

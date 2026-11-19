import { Construction } from "lucide-react";
import focusMascot from "@/assets/mascot/oy2-focus.png";
import helloMascot from "@/assets/mascot/oy2-hello.png";
import joyMascot from "@/assets/mascot/oy2-joy.png";
import lockedMascot from "@/assets/mascot/oy2-locked.png";
import readingMascot from "@/assets/mascot/oy2-reading.png";
import { AdminPage, ListHero } from "@/modules/admin";
import styles from "./TeacherMockPage.module.css";

interface MockBanner {
  eyebrow: string;
  description: string;
  mascot: string;
}

const banners: Record<string, MockBanner> = {
  "Khóa học": {
    eyebrow: "Khóa học & học liệu",
    description: "Tổ chức học liệu, bài giảng và nội dung giảng dạy cho từng khóa học.",
    mascot: readingMascot,
  },
  "Bài tập": {
    eyebrow: "Giao bài & chấm điểm",
    description: "Giao bài, theo dõi bài nộp và phản hồi kết quả học tập của học viên.",
    mascot: focusMascot,
  },
  "Tin nhắn": {
    eyebrow: "Trao đổi lớp học",
    description: "Trao đổi nhanh với học viên và phụ huynh về tiến độ học tập.",
    mascot: joyMascot,
  },
  "Bảo mật": {
    eyebrow: "Tài khoản giảng viên",
    description: "Quản lý mật khẩu, phiên đăng nhập và bảo vệ tài khoản giảng dạy của bạn.",
    mascot: lockedMascot,
  },
};

const fallbackBanner: MockBanner = {
  eyebrow: "Cổng giáo viên",
  description: "Khu vực dành riêng cho công việc giảng dạy của bạn tại TOEICSpace.",
  mascot: helloMascot,
};

export function TeacherMockPage({ title }: { title: string }) {
  const banner = banners[title] ?? fallbackBanner;

  return (
    <AdminPage
      theme="rose"
      hero={
        <ListHero
          eyebrow={banner.eyebrow}
          icon={<Construction size={14} />}
          title={title}
          description={banner.description}
          mascot={banner.mascot}
          items={[
            { key: "state", label: "Trạng thái", value: "Sắp có" },
            { key: "data", label: "Dữ liệu", value: "Minh họa" },
            { key: "area", label: "Khu vực", value: "Giảng viên" },
          ]}
        />
      }
    >
      <div className={styles.wrapper}>
        <section className={styles.page}>
          <Construction size={34} />
          <span>LMS GIẢNG VIÊN TOEICSPACE</span>
          <h2>Khu vực đang được hoàn thiện</h2>
          <p>
            Giao diện đã sẵn sàng. Dữ liệu nghiệp vụ cho khu vực này đang được mô phỏng cho đến khi
            API tương ứng được triển khai.
          </p>
        </section>
      </div>
    </AdminPage>
  );
}

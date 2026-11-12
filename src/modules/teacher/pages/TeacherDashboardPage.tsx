import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  ListTodo,
  MessageCircle,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTeacherClasses } from "../hooks/useTeacherClasses";
import styles from "./TeacherDashboardPage.module.css";

const todos = [
  ["Chuẩn bị audio Listening và phiếu trả lời Part 1–4", "08:30", false],
  ["Kiểm tra tháng: xác định mục tiêu 650+ giữa khóa", "13:00", false],
  ["Cập nhật slide Skimming & Scanning và bài tập Part 7", "10:50", false],
  ["Chấm Quiz 5: Mệnh đề quan hệ & các thì", "Đã xong", true],
] as const;
const activities = [
  [
    "Học viên hoàn thành bài tập",
    "Nguyễn Minh Anh đã nộp bài chuyên đề Thì & Mệnh đề quan hệ với điểm 92/100.",
    "5 phút trước",
  ],
  [
    "Điểm danh lớp hoàn tất",
    "Lớp TOEIC 650+ vừa hoàn thành điểm danh trực tuyến hôm nay.",
    "25 phút trước",
  ],
  [
    "Câu hỏi mới trong diễn đàn",
    "Trần Tuấn Kiệt hỏi về cách phân biệt regret to do và regret doing.",
    "1 giờ trước",
  ],
];

export function TeacherDashboardPage() {
  const classes = useTeacherClasses();
  const activeClasses = classes.data?.items.filter((item) => item.status === "Active") ?? [];
  return (
    <div className={styles.page}>
      <section className={styles.stats}>
        <article>
          <GraduationCap />
          <span>Lớp đang phụ trách</span>
          <strong>{classes.isPending ? "—" : activeClasses.length}</strong>
          <small>Đồng bộ từ hệ thống lớp học</small>
        </article>
        <article>
          <ClipboardCheck />
          <span>Bài cần chấm</span>
          <strong>18</strong>
          <small>Dữ liệu minh họa · chờ API bài tập</small>
        </article>
        <article>
          <Clock3 />
          <span>Buổi dạy sắp tới</span>
          <strong>02</strong>
          <small>Dữ liệu minh họa · chờ API lịch học</small>
        </article>
        <article>
          <MessageCircle />
          <span>Tin nhắn chưa đọc</span>
          <strong>04</strong>
          <small>Dữ liệu minh họa · chờ API tin nhắn</small>
        </article>
      </section>
      <section className={styles.grid}>
        <article className={styles.schedule}>
          <div className={styles.cardHeader}>
            <div>
              <span>LỊCH GIẢNG DẠY</span>
              <h2>Tuần này</h2>
            </div>
            <button>
              <CalendarDays size={15} /> Xem lịch
            </button>
          </div>
          <div className={styles.days}>
            {["T3", "T4", "T5", "T6"].map((day, index) => (
              <div key={day} className={index === 1 ? styles.today : ""}>
                <b>{day}</b>
                <small>{10 + index}</small>
                {index !== 3 && (
                  <article className={styles.session}>
                    <strong>
                      {index === 0
                        ? "Luyện đề TOEIC"
                        : index === 1
                          ? "TOEIC nền tảng"
                          : "TOEIC nâng cao"}
                    </strong>
                    <span>{index === 1 ? "10:00 – 11:15" : "08:00 – 10:00"}</span>
                  </article>
                )}
              </div>
            ))}
          </div>
          <p className={styles.mockHint}>Lịch minh họa — API lịch học chưa được triển khai.</p>
        </article>
        <article className={styles.todo}>
          <div className={styles.cardHeader}>
            <div>
              <span>VIỆC CẦN LÀM</span>
              <h2>Hôm nay</h2>
            </div>
            <button className={styles.add}>
              <Plus size={16} />
            </button>
          </div>
          <div>
            {todos.map(([title, time, done]) => (
              <label key={title}>
                <input type="checkbox" defaultChecked={done} />
                <i>
                  <CheckCircle2 size={15} />
                </i>
                <span className={done ? styles.done : ""}>
                  {title}
                  <small>{time}</small>
                </span>
              </label>
            ))}
          </div>
        </article>
        <article className={styles.classes}>
          <div className={styles.cardHeader}>
            <div>
              <span>LỚP HỌC</span>
              <h2>Được phân công</h2>
            </div>
            <Link to="/teacher/classes">Tất cả</Link>
          </div>
          {classes.isPending ? (
            <p>Đang đồng bộ các lớp của bạn...</p>
          ) : classes.isError ? (
            <p>Không thể tải lớp học. Vui lòng thử lại.</p>
          ) : (
            classes.data?.items.slice(0, 3).map((item) => (
              <Link key={item.id} to={`/teacher/classes?class=${item.id}`}>
                <span>{item.code.slice(0, 2)}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.startDate || "Chưa có ngày bắt đầu"} ·{" "}
                    {item.status === "Active" ? "Đang hoạt động" : item.status}
                  </small>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))
          )}
        </article>
        <article className={styles.activity}>
          <div className={styles.cardHeader}>
            <div>
              <span>HOẠT ĐỘNG GẦN ĐÂY</span>
              <h2>Cập nhật cho bạn</h2>
            </div>
          </div>
          {activities.map(([title, description, time]) => (
            <div key={title}>
              <i>
                <ListTodo size={15} />
              </i>
              <p>
                <strong>{title}</strong>
                {description}
                <small>{time}</small>
              </p>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}

import { useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Filter, Search, Users, X } from "lucide-react";
import styles from "./TeacherSchedulePage.module.css";

type Session = {
  day: number;
  hour: number;
  title: string;
  time: string;
  tone: "mint" | "blue" | "peach" | "gold";
  students: number;
};
const days = ["CN 21", "T2 22", "T3 23", "T4 24", "T5 25", "T6 26", "T7 27"];
const sessions: Session[] = [
  {
    day: 1,
    hour: 2,
    title: "TOEIC 650+ · Luyện đề",
    time: "09:00 – 10:00",
    tone: "mint",
    students: 32,
  },
  {
    day: 1,
    hour: 4,
    title: "TOEIC 500+ · Nền tảng",
    time: "11:00 – 12:00",
    tone: "blue",
    students: 28,
  },
  {
    day: 2,
    hour: 2.4,
    title: "TOEIC 800+ · Part 7",
    time: "09:30 – 10:30",
    tone: "blue",
    students: 18,
  },
  {
    day: 2,
    hour: 3.8,
    title: "Chữa bài · TOEIC 650+",
    time: "10:50 – 11:50",
    tone: "peach",
    students: 32,
  },
  {
    day: 3,
    hour: 1.1,
    title: "TOEIC 500+ · Listening",
    time: "08:00 – 09:00",
    tone: "mint",
    students: 28,
  },
  {
    day: 3,
    hour: 2.8,
    title: "TOEIC 650+ · Ngữ pháp",
    time: "09:40 – 10:40",
    tone: "blue",
    students: 32,
  },
  {
    day: 4,
    hour: 2.3,
    title: "TOEIC 800+ · Đọc hiểu",
    time: "09:20 – 10:20",
    tone: "gold",
    students: 18,
  },
  {
    day: 4,
    hour: 6.1,
    title: "TOEIC 650+ · Chữa đề",
    time: "13:10 – 14:10",
    tone: "mint",
    students: 32,
  },
  {
    day: 5,
    hour: 1.2,
    title: "TOEIC 500+ · Phản xạ",
    time: "08:10 – 09:10",
    tone: "blue",
    students: 28,
  },
];

export function TeacherSchedulePage() {
  const [selected, setSelected] = useState<Session | null>(sessions[6]);
  const selectedToday = sessions.filter((session) => session.day === 4);
  return (
    <div className={styles.layout}>
      <section className={styles.calendarCard}>
        <header className={styles.toolbar}>
          <div>
            <button>
              <ChevronLeft size={17} />
            </button>
            <button>
              <ChevronRight size={17} />
            </button>
            <b>24 tháng 11</b>
          </div>
          <nav>
            <button>Ngày</button>
            <button className={styles.active}>Tuần</button>
            <button>Tháng</button>
          </nav>
          <div className={styles.search}>
            <Search size={16} />
            <input placeholder="Tìm buổi dạy..." />
            <button>
              <Filter size={15} /> Lọc
            </button>
          </div>
        </header>
        <div className={styles.calendar}>
          <div className={styles.days}>
            <span>GMT+07:00</span>
            {days.map((day, index) => (
              <div className={index === 4 ? styles.today : ""} key={day}>
                <small>{day.slice(0, 2)}</small>
                <b>{day.slice(3)}</b>
              </div>
            ))}
          </div>
          <div className={styles.body}>
            <div className={styles.times}>
              {Array.from({ length: 10 }, (_, index) => (
                <span key={index}>{String(index + 7).padStart(2, "0")}:00</span>
              ))}
            </div>
            {days.map((day) => (
              <div className={styles.column} key={day}>
                {Array.from({ length: 10 }, (_, index) => (
                  <i key={index} />
                ))}
              </div>
            ))}
            {sessions.map((session, index) => (
              <button
                key={index}
                className={`${styles.event} ${styles[session.tone]}`}
                style={{ gridColumn: session.day + 2, top: `${session.hour * 74}px` }}
                onClick={() => setSelected(session)}
              >
                <strong>{session.title}</strong>
                <span>{session.time}</span>
              </button>
            ))}
            {selected && (
              <article className={styles.popup}>
                <button onClick={() => setSelected(null)} aria-label="Đóng">
                  <X size={15} />
                </button>
                <h2>{selected.title}</h2>
                <p>Thứ Năm, 25 tháng 11 · {selected.time}</p>
                <span>
                  <Users size={14} /> {selected.students} học viên
                </span>
                <span>
                  <Bell size={14} /> Nhắc trước 15 phút
                </span>
              </article>
            )}
          </div>
        </div>
      </section>
      <aside className={styles.timeline}>
        <header>
          <h1>Tiến trình</h1>
          <button>
            <Filter size={15} /> Lọc
          </button>
        </header>
        <section className={styles.todayList}>
          <div>
            <button>
              <ChevronLeft size={16} />
            </button>
            <b>Hôm nay, 25 tháng 11</b>
            <button>
              <ChevronRight size={16} />
            </button>
          </div>
          {selectedToday.map((session, index) => (
            <button
              key={index}
              className={styles[session.tone]}
              onClick={() => setSelected(session)}
            >
              <strong>{session.title}</strong>
              <span>{session.time}</span>
            </button>
          ))}
        </section>
        <section className={styles.upcoming}>
          <header>
            <h2>Sự kiện sắp tới</h2>
            <button>+ Thêm sự kiện</button>
          </header>
          {sessions.slice(0, 3).map((session, index) => (
            <article key={index}>
              <i className={styles[`dot${session.tone}`]} />
              <div>
                <b>{session.time}</b>
                <p>{session.title}</p>
              </div>
              <button>•••</button>
            </article>
          ))}
        </section>
      </aside>
    </div>
  );
}

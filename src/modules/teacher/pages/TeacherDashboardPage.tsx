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
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import dashboardMascot from "@/assets/mascot/oy2-hello.png";
import { AdminPage, OverviewHero, sessionsApi } from "@/modules/admin";
import {
  addWallDays,
  formatIctTime,
  ictDateIndex,
  ictTodayKey,
  ictWeekdayIndex,
  startOfIctWeek,
  wallDateKey,
  wallToIso,
} from "../components/calendar/calendarTime";
import { useTeacherClasses } from "../hooks/useTeacherClasses";
import styles from "./TeacherDashboardPage.module.css";

const MINI_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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
  const weekStart = startOfIctWeek();
  const weekFrom = wallToIso(weekStart);
  const weekTo = wallToIso(addWallDays(weekStart, 7));
  const schedule = useQuery({
    queryKey: ["calendar", "class-sessions", "teacher", weekFrom, weekTo],
    queryFn: ({ signal }) =>
      sessionsApi.list({ from: weekFrom, to: weekTo, page: 1, pageSize: 100 }, signal),
    staleTime: 60_000,
    retry: false,
  });
  const [now] = useState(() => Date.now());
  const upcomingSessions =
    now === null
      ? []
      : (schedule.data?.items.filter((session) => Date.parse(session.endAt) >= now) ?? []);
  const todayKey = ictTodayKey();
  const firstPreviewDay = Math.min(ictWeekdayIndex(), 3);
  const previewDayIndexes = Array.from({ length: 4 }, (_, offset) => firstPreviewDay + offset);
  return (
    <AdminPage
      theme="blue"
      hero={
        <OverviewHero
          eyebrow="Tổng quan giảng dạy"
          icon={<GraduationCap size={14} />}
          title="Mọi thứ cho ngày dạy"
          highlight="của bạn"
          description="Theo dõi lớp học, lịch giảng dạy và những công việc cần xử lý trong cùng một không gian."
          watermark="TEACH"
          mascot={dashboardMascot}
          panelLabel="Hôm nay"
          panelTitle="Lịch dạy và việc cần làm"
          stats={[
            {
              key: "classes",
              label: "Lớp đang phụ trách",
              value: classes.isPending ? undefined : activeClasses.length,
            },
            { key: "grading", label: "Bài cần chấm", value: 18, highlight: true },
            {
              key: "sessions",
              label: "Buổi dạy sắp tới",
              value: schedule.isPending || schedule.isError ? undefined : upcomingSessions.length,
            },
          ]}
          pastel
        />
      }
    >
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
            <strong>
              {schedule.isPending || schedule.isError
                ? "—"
                : String(upcomingSessions.length).padStart(2, "0")}
            </strong>
            <small>{schedule.isError ? "Không thể tải lịch" : "Trong tuần này"}</small>
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
              <Link to="/teacher/schedule">
                <CalendarDays size={15} /> Xem lịch
              </Link>
            </div>
            <div className={styles.days}>
              {schedule.isPending ? (
                <p className={styles.scheduleState}>Đang tải lịch tuần này...</p>
              ) : schedule.isError ? (
                <p className={styles.scheduleState} role="alert">
                  Không thể tải lịch giảng dạy tuần này.
                </p>
              ) : (
                previewDayIndexes.map((dayIndex) => {
                  const day = addWallDays(weekStart, dayIndex);
                  const daySessions = schedule.data.items
                    .filter((session) => ictDateIndex(session.startAt, weekStart) === dayIndex)
                    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
                  const dateKey = wallDateKey(day);
                  return (
                    <div key={dateKey} className={dateKey === todayKey ? styles.today : ""}>
                      <b>{MINI_WEEKDAYS[dayIndex]}</b>
                      <small>{day.getUTCDate()}</small>
                      {daySessions.length ? (
                        <div className={styles.sessionsForDay}>
                          {daySessions.slice(0, 2).map((session) => (
                            <article className={styles.session} key={session.id}>
                              <strong>{session.title}</strong>
                              <span>
                                {formatIctTime(session.startAt)} – {formatIctTime(session.endAt)}
                              </span>
                            </article>
                          ))}
                          {daySessions.length > 2 && (
                            <small className={styles.moreSessions}>
                              +{daySessions.length - 2} buổi
                            </small>
                          )}
                        </div>
                      ) : (
                        <span className={styles.noSession}>Không có buổi</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {!schedule.isError && !schedule.isPending && (
              <p className={styles.scheduleHint}>
                {upcomingSessions.length} buổi dạy sắp tới trong tuần này.
              </p>
            )}
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
    </AdminPage>
  );
}

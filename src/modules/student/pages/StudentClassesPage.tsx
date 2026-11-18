import { useMemo, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { ChevronLeft, ChevronRight, GraduationCap, Search } from "lucide-react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import teamMascot from "@/assets/mascot/oy2-teamwork.png";
import { AdminPage, ButtonLink, ListHero } from "@/modules/admin";
import { Footer } from "@/modules/landing";
import { Select } from "@/shared/components/Select";
import { ClassScheduleCalendar } from "@/modules/teacher";
import { useStudentClassDetail, useStudentClasses } from "../hooks/useStudentClasses";
import type { StudentClass, StudentClassStatus } from "../types/student-class.types";
import { StudentClassSessions } from "../components/StudentClassSessions";
import { StudentAttendanceHistory } from "../components/StudentAttendanceHistory";
import styles from "./StudentClassesPage.module.css";

const PAGE_SIZE = 20;
type StudentTab = "calendar" | "classes" | "attendance";
const studentTabs: { id: StudentTab; label: string }[] = [
  { id: "calendar", label: "Lịch học" },
  { id: "classes", label: "Lớp học của tôi" },
  { id: "attendance", label: "Lịch sử điểm danh" },
];
const labels: Record<StudentClassStatus, string> = {
  Draft: "Bản nháp",
  Active: "Đang hoạt động",
  Completed: "Đã hoàn thành",
  Archived: "Đã lưu trữ",
};
const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  ...Object.entries(labels).map(([value, label]) => ({ value, label })),
];

const dateText = (date: string | null) =>
  date ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${date}T00:00:00`)) : "Chưa thiết lập";
const teacherText = (item: StudentClass) =>
  item.teacherName?.trim() || (item.teacherId ? "Chưa có thông tin giáo viên" : "Chưa phân công");

function errorMessage(error: unknown, detail = false) {
  if (!isAxiosError(error)) return "Không thể tải dữ liệu. Vui lòng thử lại.";
  if (!error.response) return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
  if (error.response.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  if (error.response.status === 403) return "Tài khoản của bạn không có quyền xem lớp học.";
  if (error.response.status === 404)
    return detail
      ? "Không tìm thấy lớp học hoặc bạn không còn quyền truy cập lớp này."
      : "Không tìm thấy danh sách lớp học.";
  return "Không thể tải lớp học. Vui lòng thử lại sau.";
}

export function StudentClassesPage() {
  const { id } = useParams();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const detail = useStudentClassDetail(id);
  const requestedTab = params.get("tab");
  const activeTab: StudentTab = studentTabs.some((tab) => tab.id === requestedTab)
    ? (requestedTab as StudentTab)
    : "calendar";
  const setTab = (tab: StudentTab) => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next);
  };

  return (
    <>
      <main className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Đường dẫn trang">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={15} />
          {id ? (
            <>
              <Link to={`/my-classes${location.search}`}>Lớp học của tôi</Link>
              <ChevronRight size={15} />
              <span>Chi tiết lớp</span>
            </>
          ) : (
            <span>Lớp học của tôi</span>
          )}
        </nav>
        {id ? (
          <AdminPage
            theme="blue"
            hero={
              <ListHero
                eyebrow="Lớp học của tôi"
                title={detail.data?.class.name ?? "Chi tiết lớp học"}
                highlight={detail.data?.class.code}
                description={
                  detail.data?.class.description || "Theo dõi thông tin và lịch học của lớp."
                }
                mascot={teamMascot}
                actions={
                  <ButtonLink to={`/my-classes${location.search}`} variant="default">
                    ← Quay lại danh sách
                  </ButtonLink>
                }
              />
            }
          >
            {detail.isPending ? (
              <p className={styles.notice} role="status">
                Đang tải chi tiết lớp...
              </p>
            ) : detail.isError ? (
              <div className={styles.notice} role="alert">
                <p>{errorMessage(detail.error, true)}</p>
                <button onClick={() => void detail.refetch()}>Thử lại</button>
              </div>
            ) : (
              <>
                <article className={styles.detail}>
                  <div className={styles.detailHeading}>
                    <span className={styles.code}>{detail.data.class.code}</span>
                    <h2>{detail.data.class.name}</h2>
                    <span className={styles.badge} data-status={detail.data.class.status}>
                      {labels[detail.data.class.status]}
                    </span>
                  </div>
                  <p className={styles.description}>
                    {detail.data.class.description || "Lớp học chưa có mô tả."}
                  </p>
                  <dl className={styles.facts}>
                    <div>
                      <dt>Giáo viên phụ trách</dt>
                      <dd>{teacherText(detail.data.class)}</dd>
                    </div>
                    <div>
                      <dt>Ngày bắt đầu</dt>
                      <dd>{dateText(detail.data.class.startDate)}</dd>
                    </div>
                    <div>
                      <dt>Ngày kết thúc</dt>
                      <dd>{dateText(detail.data.class.endDate)}</dd>
                    </div>
                  </dl>
                  {(detail.data.class.status === "Archived" ||
                    detail.data.class.status === "Completed") && (
                    <p className={styles.readOnly}>
                      Lớp đã {detail.data.class.status === "Archived" ? "lưu trữ" : "hoàn thành"}.
                      Thông tin chỉ có thể xem.
                    </p>
                  )}
                </article>
                <StudentClassSessions
                  classId={detail.data.class.id}
                  teacherId={detail.data.class.teacherId}
                  teacherName={detail.data.class.teacherName}
                />
              </>
            )}
          </AdminPage>
        ) : (
          <AdminPage
            theme="blue"
            hero={
              <ListHero
                eyebrow="Không gian học tập"
                icon={<GraduationCap size={14} />}
                title="Lớp học"
                highlight="của tôi"
                description="Quản lý lớp học, lịch học và điểm danh."
                mascot={teamMascot}
              />
            }
          >
            <div className={styles.tabs} role="tablist" aria-label="Nội dung lớp học">
              {studentTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`student-tab-${tab.id}`}
                  aria-controls="student-tab-panel"
                  aria-selected={activeTab === tab.id}
                  data-active={activeTab === tab.id || undefined}
                  onClick={() => setTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              className={styles.tabPanel}
              role="tabpanel"
              id="student-tab-panel"
              aria-labelledby={`student-tab-${activeTab}`}
            >
              {activeTab === "calendar" ? (
                <StudentCalendarSection />
              ) : activeTab === "classes" ? (
                <StudentClassesListTab />
              ) : (
                <StudentAttendanceHistory />
              )}
            </div>
          </AdminPage>
        )}
      </main>
      <Footer />
    </>
  );
}

function StudentClassesListTab() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const statusParam = params.get("status") ?? "";
  const status = Object.hasOwn(labels, statusParam) ? (statusParam as StudentClassStatus) : "";
  const parsedPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const list = useStudentClasses({
    search: search || undefined,
    status: status || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const setFilter = (key: "search" | "status", value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilter("search", String(new FormData(event.currentTarget).get("search") ?? "").trim());
  };
  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setParams(next);
  };

  return (
    <>
      <div className={styles.controls}>
        <form onSubmit={submitSearch} role="search" className={styles.search}>
          <Search size={17} />
          <input
            type="search"
            name="search"
            key={search}
            defaultValue={search}
            aria-label="Tìm lớp học"
            placeholder="Tìm mã hoặc tên lớp..."
            maxLength={100}
          />
          <button type="submit">Tìm kiếm</button>
        </form>
        <Select
          aria-label="Lọc trạng thái lớp"
          className={styles.statusFilter}
          value={status}
          options={statusOptions}
          onChange={(value) => setFilter("status", value)}
        />
      </div>
      {list.isError ? (
        <div className={styles.notice} role="alert">
          <p>{errorMessage(list.error)}</p>
          <button onClick={() => void list.refetch()}>Thử lại</button>
        </div>
      ) : list.isPending ? (
        <p className={styles.notice} role="status">
          Đang tải danh sách lớp học...
        </p>
      ) : !list.data.items.length ? (
        <div className={styles.notice}>
          <h2>Chưa có lớp học phù hợp</h2>
          <p>
            {search || status
              ? "Thử từ khóa hoặc trạng thái khác."
              : "Các lớp đang tham gia sẽ xuất hiện tại đây."}
          </p>
        </div>
      ) : (
        <section className={styles.results} aria-label="Danh sách lớp học">
          <p className={styles.count} role="status">
            {list.data.totalCount} lớp học{list.isFetching ? " · Đang cập nhật..." : ""}
          </p>
          <div className={styles.classGrid}>
            {list.data.items.map((item) => (
              <Link
                key={item.id}
                className={styles.classCard}
                to={`/my-classes/${item.id}${location.search}`}
                aria-label={`Xem chi tiết lớp ${item.name}`}
              >
                <div className={styles.classCardRow}>
                  <strong className={`${styles.classCardValue} ${styles.classCardName}`}>
                    {item.name}
                  </strong>
                </div>
                <div className={styles.classCardRow}>
                  <span className={styles.classCardLabel}>Giáo viên</span>
                  <span className={styles.classCardValue}>{teacherText(item)}</span>
                </div>
                <div className={styles.classCardRow}>
                  <span className={styles.classCardLabel}>Thời gian</span>
                  <span className={styles.classCardValue}>
                    {dateText(item.startDate)} – {dateText(item.endDate)}
                  </span>
                </div>
                <div className={`${styles.classCardRow} ${styles.classCardStatus}`}>
                  <span className={styles.classCardValue}>
                    <span
                      className={styles.badge}
                      data-status={item.status}
                      aria-label={`Trạng thái: ${labels[item.status]}`}
                    >
                      {labels[item.status]}
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {list.data.totalCount > PAGE_SIZE && (
            <nav className={styles.pagination} aria-label="Phân trang lớp học">
              <button
                disabled={page === 1 || list.isFetching}
                onClick={() => setPage(page - 1)}
                aria-label="Trang trước"
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                Trang {page} / {Math.ceil(list.data.totalCount / list.data.pageSize)}
              </span>
              <button
                disabled={page * list.data.pageSize >= list.data.totalCount || list.isFetching}
                onClick={() => setPage(page + 1)}
                aria-label="Trang sau"
              >
                <ChevronRight size={17} />
              </button>
            </nav>
          )}
        </section>
      )}
    </>
  );
}

function StudentCalendarSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const classes = useStudentClasses({ page: 1, pageSize: 100 });
  const classNames = useMemo(
    () => new Map((classes.data?.items ?? []).map((item) => [item.id, item.name])),
    [classes.data],
  );
  const classTeacherNames = useMemo(
    () => new Map((classes.data?.items ?? []).map((item) => [item.id, item.teacherName])),
    [classes.data],
  );

  return (
    <div className={styles.calendarSection}>
      <h2>Lịch học theo tuần</h2>
      <ClassScheduleCalendar
        role="student"
        classNames={classNames}
        classTeacherNames={classTeacherNames}
        onManageClass={(session) => navigate(`/my-classes/${session.classId}${location.search}`)}
      />
    </div>
  );
}

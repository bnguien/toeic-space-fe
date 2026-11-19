import { useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import teamMascot from "@/assets/mascot/oy2-teamwork.png";
import { AdminPage, ListHero } from "@/modules/admin";
import { useTeacherClassDetail, useTeacherClasses } from "../hooks/useTeacherClasses";
import type { TeacherClass, TeacherClassDetail, TeacherClassStatus } from "../types/teacher.types";
import { TeacherClassSessions } from "../components/TeacherClassSessions";
import styles from "./TeacherClassesPage.module.css";

const labels: Record<TeacherClassStatus, string> = {
  Draft: "Bản nháp",
  Active: "Đang hoạt động",
  Completed: "Đã hoàn thành",
  Archived: "Đã lưu trữ",
};
const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)) : "Chưa thiết lập";
const updated = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));

function ClassSummary({ detail }: { detail: TeacherClassDetail }) {
  const item = detail.class;
  return (
    <header className={styles.classHeader}>
      <div className={styles.titleLine}>
        <span className={styles.classCode}>{item.code}</span>
        <h2>{item.name}</h2>
        <i data-status={item.status}>{labels[item.status]}</i>
      </div>
      <div className={styles.classMeta}>
        <span>
          <CalendarDays size={15} /> {date(item.startDate)} – {date(item.endDate)}
        </span>
        <span>
          <RefreshCw size={15} /> Cập nhật {updated(item.updatedAt)}
        </span>
      </div>
      {item.description && <p className={styles.description}>{item.description}</p>}
    </header>
  );
}

export function TeacherClassesPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const classes = useTeacherClasses(page);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("class"));
  const visible =
    classes.data?.items.filter((item) =>
      `${item.code} ${item.name}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const activeClassCount =
    classes.data?.items.filter((item) => item.status === "Active").length ?? 0;
  const activeId = selectedId ?? visible[0]?.id ?? null;
  const detail = useTeacherClassDetail(activeId);
  const select = (item: TeacherClass) => {
    setSelectedId(item.id);
    setParams({ class: item.id });
  };
  return (
    <AdminPage
      theme="blue"
      hero={
        <ListHero
          eyebrow="Lớp học được phân công"
          icon={<CalendarCheck size={14} />}
          title="Lớp học"
          highlight="của bạn"
          description="Quản lý buổi học, điểm danh và theo dõi tiến độ của từng lớp bạn đang phụ trách."
          mascot={teamMascot}
          items={[
            { key: "all", label: "Tổng lớp", value: classes.data?.totalCount },
            {
              key: "active",
              label: "Đang hoạt động",
              value: classes.isPending ? undefined : activeClassCount,
            },
            {
              key: "visible",
              label: "Đang hiển thị",
              value: classes.isPending ? undefined : visible.length,
            },
          ]}
        />
      }
    >
      <div className={styles.page}>
        <div className={styles.workspace}>
          <aside className={styles.list}>
            <div className={styles.search}>
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm lớp học..."
              />
            </div>
            <p>
              {classes.data
                ? `${classes.data.totalCount} lớp được phân công`
                : "Đang tải lớp học..."}
            </p>
            {classes.isError ? (
              <div className={styles.notice}>
                Không thể tải lớp học.{" "}
                <button onClick={() => void classes.refetch()}>Thử lại</button>
              </div>
            ) : classes.isPending ? (
              <div className={styles.notice}>Đang đồng bộ lớp học...</div>
            ) : (
              <div className={styles.items}>
                {visible.map((item) => (
                  <button
                    className={activeId === item.id ? styles.selected : ""}
                    key={item.id}
                    onClick={() => select(item)}
                  >
                    <div>
                      <span>{item.code}</span>
                      <i data-status={item.status}>{labels[item.status]}</i>
                    </div>
                    <strong>{item.name}</strong>
                    <small>
                      <CalendarDays size={13} /> {date(item.startDate)} — {date(item.endDate)}
                    </small>
                  </button>
                ))}
              </div>
            )}
            {(classes.data?.totalCount ?? 0) > 20 && (
              <nav>
                <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <span>Trang {page}</span>
                <button
                  disabled={
                    !classes.data || page * classes.data.pageSize >= classes.data.totalCount
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </aside>
          {!activeId ? (
            classes.isPending ? (
              <div className={styles.statePanel}>Đang tải lớp học...</div>
            ) : (
              <div className={styles.empty}>
                <img src={teamMascot} alt="" />
                <h2>Chọn một lớp học</h2>
                <p>Thông tin lớp được phân công sẽ hiển thị ở đây.</p>
              </div>
            )
          ) : detail.isPending ? (
            <div className={styles.statePanel}>Đang tải chi tiết lớp...</div>
          ) : detail.isError || !detail.data ? (
            <div className={styles.empty}>
              <img src={teamMascot} alt="" />
              <h2>Chưa thể tải lớp học</h2>
              <p>Vui lòng thử lại hoặc chọn một lớp học khác.</p>
            </div>
          ) : (
            <TeacherClassSessions
              key={detail.data.class.id}
              classId={detail.data.class.id}
              classStatus={detail.data.class.status}
              defaultRoomId={detail.data.class.defaultRoomId ?? null}
              header={<ClassSummary detail={detail.data} />}
            />
          )}
        </div>
      </div>
    </AdminPage>
  );
}

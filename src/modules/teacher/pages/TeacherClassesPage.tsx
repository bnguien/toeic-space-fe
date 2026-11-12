import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CircleUserRound, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import teamMascot from "@/assets/mascot/oy2-teamwork.png";
import { useTeacherClassDetail, useTeacherClasses } from "../hooks/useTeacherClasses";
import type { TeacherClass, TeacherClassStatus } from "../types/teacher.types";
import styles from "./TeacherClassesPage.module.css";

const labels: Record<TeacherClassStatus, string> = {
  Draft: "Bản nháp",
  Active: "Đang hoạt động",
  Completed: "Đã hoàn thành",
  Archived: "Đã lưu trữ",
};
const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)) : "Chưa thiết lập";

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
  const activeId = selectedId ?? visible[0]?.id ?? null;
  const detail = useTeacherClassDetail(activeId);
  const select = (item: TeacherClass) => {
    setSelectedId(item.id);
    setParams({ class: item.id });
  };
  return (
    <div className={styles.page}>
      <header>
        <div>
          <span>HỆ THỐNG LỚP HỌC</span>
          <h1>Lớp học của tôi</h1>
          <p>Các lớp đang được phân công được đồng bộ trực tiếp từ hệ thống lớp học.</p>
        </div>
        <img src={teamMascot} alt="" />
      </header>
      <section className={styles.workspace}>
        <div className={styles.list}>
          <div className={styles.search}>
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm lớp học..."
            />
          </div>
          <p>
            {classes.data ? `${classes.data.totalCount} lớp được phân công` : "Đang tải lớp học..."}
          </p>
          {classes.isError ? (
            <div className={styles.notice}>
              Không thể tải lớp học. <button onClick={() => void classes.refetch()}>Thử lại</button>
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
                disabled={!classes.data || page * classes.data.pageSize >= classes.data.totalCount}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </div>
        <article className={styles.detail}>
          {detail.isPending ? (
            <div className={styles.notice}>Đang tải chi tiết lớp...</div>
          ) : detail.isError || !detail.data ? (
            <div className={styles.empty}>
              <img src={teamMascot} alt="" />
              <h2>Chọn một lớp học</h2>
              <p>Thông tin lớp được phân công sẽ hiển thị ở đây.</p>
            </div>
          ) : (
            <>
              <div className={styles.detailTitle}>
                <div>
                  <span>{detail.data.class.code}</span>
                  <h2>{detail.data.class.name}</h2>
                  <i data-status={detail.data.class.status}>{labels[detail.data.class.status]}</i>
                </div>
                <CircleUserRound size={23} />
              </div>
              <p className={styles.description}>
                {detail.data.class.description || "Lớp học chưa có mô tả."}
              </p>
              <div className={styles.data}>
                <div>
                  <span>Ngày bắt đầu</span>
                  <b>{date(detail.data.class.startDate)}</b>
                </div>
                <div>
                  <span>Ngày kết thúc</span>
                  <b>{date(detail.data.class.endDate)}</b>
                </div>
                <div>
                  <span>Cập nhật lần cuối</span>
                  <b>
                    {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                      new Date(detail.data.class.updatedAt),
                    )}
                  </b>
                </div>
              </div>
              <section className={styles.scope}>
                <h3>Không gian giảng dạy</h3>
                <p>
                  Danh sách học viên, điểm danh, bài tập và lịch giảng sẽ được kết nối khi các API
                  nghiệp vụ tương ứng sẵn sàng.
                </p>
                <div>
                  <span>
                    Học viên <b>Chờ API</b>
                  </span>
                  <span>
                    Điểm danh <b>Chờ API</b>
                  </span>
                  <span>
                    Bài tập <b>Chờ API</b>
                  </span>
                </div>
              </section>
            </>
          )}
        </article>
      </section>
    </div>
  );
}

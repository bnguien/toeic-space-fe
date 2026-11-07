import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";

import { Select } from "@/shared/components/Select";
import { useStudentClassDetail, useStudentClasses } from "../hooks/useStudentClasses";
import type { StudentClass, StudentClassStatus } from "../types/student-class.types";
import styles from "./StudentClassesPage.module.css";

const PAGE_SIZE = 20;
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
  const detail = useStudentClassDetail(id);

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
        <>
          <header className={styles.heading}>
            <h1>Chi tiết lớp học</h1>
            <Link to={`/my-classes${location.search}`}>← Quay lại danh sách</Link>
          </header>
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
                  Lớp đã {detail.data.class.status === "Archived" ? "lưu trữ" : "hoàn thành"}. Thông
                  tin chỉ có thể xem.
                </p>
              )}
            </article>
          )}
        </>
      ) : (
        <>
          <header className={styles.heading}>
            <h1>Lớp học của tôi</h1>
            <p>Xem các lớp bạn đang tham gia và thông tin giáo viên phụ trách.</p>
          </header>
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
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Mã lớp</th>
                      <th scope="col">Tên lớp</th>
                      <th scope="col">Giáo viên</th>
                      <th scope="col">Bắt đầu</th>
                      <th scope="col">Kết thúc</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map((item) => (
                      <tr key={item.id}>
                        <td className={styles.code}>
                          <span>{item.code}</span>
                        </td>
                        <td>
                          <Link to={`/my-classes/${item.id}${location.search}`}>{item.name}</Link>
                        </td>
                        <td>
                          <span>{teacherText(item)}</span>
                        </td>
                        <td>{dateText(item.startDate)}</td>
                        <td>{dateText(item.endDate)}</td>
                        <td>
                          <span className={styles.badge} data-status={item.status}>
                            {labels[item.status]}
                          </span>
                        </td>
                        <td>
                          <Link to={`/my-classes/${item.id}${location.search}`}>Xem chi tiết</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      )}
    </main>
  );
}

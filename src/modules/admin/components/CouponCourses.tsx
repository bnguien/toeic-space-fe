import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Pagination } from "./ui";
import { coursesApi } from "../api/courses.api";
import styles from "./CouponCourses.module.css";

export function CouponCourses({
  ids,
  onChange,
  requireSelection = false,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  requireSelection?: boolean;
}) {
  const [courseSearch, setCourseSearch] = useState("");
  const [coursePage, setCoursePage] = useState(1);
  const [selectingAll, setSelectingAll] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const courses = useQuery({
    queryKey: ["coupon-courses", courseSearch, coursePage],
    queryFn: ({ signal }) =>
      coursesApi.list({ page: coursePage, pageSize: 20, search: courseSearch }, signal),
    retry: false,
  });
  const selectAllCourses = async () => {
    if (selectingAll) return;
    setSelectingAll(true);
    setSelectionError("");
    try {
      const pageSize = 100;
      const firstPage = await coursesApi.list({ page: 1, pageSize });
      const pageCount = Math.ceil(firstPage.totalCount / pageSize);
      const allIds = firstPage.items.map((course) => course.id);
      for (let page = 2; page <= pageCount; page += 1) {
        const result = await coursesApi.list({ page, pageSize });
        allIds.push(...result.items.map((course) => course.id));
      }
      onChange([...new Set([...ids, ...allIds])]);
    } catch {
      setSelectionError("Không thể chọn tất cả khóa học. Vui lòng thử lại.");
    } finally {
      setSelectingAll(false);
    }
  };
  return (
    <div className={styles.courses}>
      <h3>Khóa học áp dụng</h3>
      <p className={styles.status}>
        {ids.length === 0
          ? requireSelection
            ? "Chọn ít nhất một khóa học"
            : "Tất cả khóa học"
          : `${ids.length} khóa học đã chọn`}
      </p>
      {!requireSelection && (
        <div className={styles.bulkActions}>
          <Button size="sm" disabled={selectingAll} onClick={() => void selectAllCourses()}>
            {selectingAll ? "Đang chọn…" : "Chọn tất cả"}
          </Button>
          <Button size="sm" disabled={!ids.length} onClick={() => onChange([])}>
            Bỏ chọn tất cả
          </Button>
        </div>
      )}
      {selectionError && (
        <p className={styles.error} role="alert">
          {selectionError}
        </p>
      )}
      <label className={styles.search}>
        Tìm khóa học
        <input
          value={courseSearch}
          onChange={(event) => {
            setCourseSearch(event.target.value);
            setCoursePage(1);
          }}
        />
      </label>
      {courses.isPending ? (
        <p role="status">Đang tải khóa học…</p>
      ) : courses.isError ? (
        <p role="alert">
          Không tải được khóa học. <Button onClick={() => void courses.refetch()}>Thử lại</Button>
        </p>
      ) : (
        <>
          <ul className={styles.list}>
            {courses.data.items.map((course) => (
              <li key={course.id}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={ids.includes(course.id)}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...ids, course.id]
                          : ids.filter((id) => id !== course.id),
                      )
                    }
                  />
                  {course.title}
                </label>
              </li>
            ))}
          </ul>
          <Pagination
            page={courses.data.page}
            pages={Math.ceil(courses.data.totalCount / courses.data.pageSize)}
            pageSize={courses.data.pageSize}
            total={courses.data.totalCount}
            onChange={setCoursePage}
          />
        </>
      )}
      {ids.length > 0 && (
        <ul className={styles.selected}>
          {ids.map((id) => (
            <li key={id}>
              <span>{courses.data?.items.find((item) => item.id === id)?.title ?? id}</span>
              <Button size="sm" onClick={() => onChange(ids.filter((value) => value !== id))}>
                Bỏ
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

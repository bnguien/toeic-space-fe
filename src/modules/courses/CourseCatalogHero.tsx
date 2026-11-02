import type { FormEvent } from "react";
import { CourseHero } from "./CourseHero";
import styles from "./courseCatalog.module.css";

export function CourseCatalogHero({
  search,
  onSearchChange,
  onSearch,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
}) {
  return (
    <CourseHero
      eyebrow={
        <>
          TRANG CHỦ <span aria-hidden="true">›</span> KHÓA HỌC
        </>
      }
      title={
        <>
          Khám phá <span className={styles.titleKeepTogether}>khóa học</span>
        </>
      }
      description="Chọn lộ trình phù hợp và tiến gần hơn đến mục tiêu TOEIC của bạn."
    >
      <form className={styles.heroSearch} onSubmit={onSearch} role="search">
        <label className={styles.srOnly} htmlFor="course-search">
          Tìm khóa học
        </label>
        <input
          id="course-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Bạn muốn học gì?"
        />
        <button type="submit">Tìm kiếm</button>
      </form>
    </CourseHero>
  );
}

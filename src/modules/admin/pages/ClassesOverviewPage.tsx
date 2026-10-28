import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

import classMascot from "@/assets/mascot/oy2-teamwork.png";
import { Select } from "@/shared/components/Select";
import { AdminPage, ButtonLink, OverviewHero } from "../components/ui";
import { ClassOverviewMetrics } from "../components/ClassOverviewMetrics";
import { useClasses } from "../hooks/useClasses";
import type { ClassStatus } from "../types/class.types";
import { AttendanceChart, EnrollmentChart } from "../components/ClassesOverviewCharts";
import { sampleIssues, sampleMonths, samplePrograms } from "../data/classOverviewSample";
import { exportClassOverview } from "../utils/exportClassOverview";
import styles from "./ClassesOverviewPage.module.css";

const statuses: { status: ClassStatus; label: string; path: string; color: string }[] = [
  {
    status: "Active",
    label: "Đang hoạt động",
    path: "/admin/classes/list?status=Active",
    color: "#365e82",
  },
  {
    status: "Draft",
    label: "Bản nháp",
    path: "/admin/classes/list?status=Draft",
    color: "#aab6c2",
  },
  {
    status: "Completed",
    label: "Đã hoàn thành",
    path: "/admin/classes/list?status=Completed",
    color: "#728e9f",
  },
  { status: "Archived", label: "Đã lưu trữ", path: "/admin/classes/lifecycle", color: "#ca9aa9" },
];

export function ClassesOverviewPage() {
  const [month, setMonth] = useState("2");
  const [facility, setFacility] = useState("all");
  const [program, setProgram] = useState("all");
  const sample = sampleMonths[Number(month)];
  const programs = samplePrograms.filter((item) => program === "all" || item.name === program);
  const facilityScale = facility === "all" ? 1 : facility === "a" ? 0.55 : 0.45;
  const students = Math.round(
    programs.reduce((sum, item) => sum + item.students, 0) * facilityScale,
  );
  const capacity = Math.round(
    programs.reduce((sum, item) => sum + item.students / (item.fill / 100), 0) * facilityScale,
  );
  const fill = capacity ? Math.round((students / capacity) * 100) : 0;
  const active = useClasses({ status: "Active", page: 1, pageSize: 1 }, false);
  const draft = useClasses({ status: "Draft", page: 1, pageSize: 1 }, false);
  const completed = useClasses({ status: "Completed", page: 1, pageSize: 1 }, false);
  const archived = useClasses({ status: "Archived", page: 1, pageSize: 1 }, false);
  const queries = [active, draft, completed, archived];
  const counts = queries.map((query) => query.data?.totalCount ?? 0);
  const total = queries.every((query) => query.isSuccess)
    ? counts.reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <AdminPage
      theme="blue"
      hero={
        <OverviewHero
          eyebrow="Quản trị đào tạo / Lớp học"
          icon={<GraduationCap size={15} />}
          title="Tổng quan"
          highlight="lớp học"
          description="Theo dõi tình trạng và quản lý các lớp học."
          watermark="CLASSES"
          mascot={classMascot}
          actions={
            <>
              <ButtonLink to="/admin/classes/list?create=1" variant="primary">
                Tạo lớp học
              </ButtonLink>
              <ButtonLink to="/admin/classes/list">Danh sách lớp</ButtonLink>
            </>
          }
          panelLabel="Lớp học"
          panelTitle="Tình trạng lớp học"
          stats={statuses.map((item, index) => ({
            key: item.status,
            label: item.label,
            value: queries[index].isError ? "—" : queries[index].data?.totalCount,
            to: item.path,
          }))}
        />
      }
    >
      <div className={styles.overview}>
        <div className={styles.filters}>
          <Select
            className={styles.filterSelect}
            aria-label="Kỳ (dữ liệu mẫu)"
            value={month}
            onChange={setMonth}
            options={sampleMonths.map((item, index) => ({
              value: String(index),
              label: `Kỳ: ${item.label}`,
            }))}
          />
          <Select
            className={styles.filterSelect}
            aria-label="Cơ sở (dữ liệu mẫu)"
            value={facility}
            onChange={setFacility}
            options={[
              { value: "all", label: "Cơ sở: Tất cả" },
              { value: "a", label: "Cơ sở A" },
              { value: "b", label: "Cơ sở B" },
            ]}
          />
          <Select
            className={styles.filterSelect}
            aria-label="Chương trình (dữ liệu mẫu)"
            value={program}
            onChange={setProgram}
            options={[
              { value: "all", label: "Chương trình: Tất cả" },
              ...samplePrograms.map((item) => ({ value: item.name, label: item.name })),
            ]}
          />
          <button
            type="button"
            className={styles.exportButton}
            onClick={() =>
              exportClassOverview(
                active.data?.totalCount,
                students,
                fill,
                sample.attendance.at(-1)!,
              )
            }
          >
            Xuất báo cáo
          </button>
        </div>
        <p className={styles.sampleNote}>
          Dữ liệu mẫu: bộ lọc và các chỉ số học viên, ghi danh, chuyên cần, chương trình. Số lớp
          theo trạng thái lấy từ API.
        </p>

        <ClassOverviewMetrics
          activeCount={active.isError ? "—" : active.data?.totalCount}
          students={students}
          attendance={sample.attendance.at(-1)!}
        />

        <div className={styles.dashboardGrid}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>Ghi danh mới theo tháng</h2>
              <Link to="/admin/students/list">Xem học viên mới</Link>
            </div>
            <EnrollmentChart values={sample.enrollments} />
            <p className={`${styles.caption} ${styles.chartCaption}`}>
              Tháng gần nhất có {sample.enrollments.at(-1)} học viên mới trong dữ liệu mẫu.
            </p>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>Lớp cần chú ý</h2>
              <Link to="/admin/classes/list">Xem danh sách lớp</Link>
            </div>
            <ul className={styles.issues}>
              {sampleIssues.map((issue) => (
                <li key={issue.title}>
                  <strong>{issue.count}</strong>
                  <div>
                    <b>{issue.title}</b>
                    <small>{issue.description}</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>Chuyên cần theo tuần</h2>
              <Link to="/admin/classes/list">Xem danh sách lớp</Link>
            </div>
            <AttendanceChart values={sample.attendance} />
            <p className={styles.caption}>
              Chuyên cần tuần gần nhất: {sample.attendance.at(-1)}% (dữ liệu mẫu).
            </p>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>Trạng thái lớp</h2>
              <Link to="/admin/classes/list">Xem danh sách lớp</Link>
            </div>
            {queries.some((query) => query.isError) && (
              <p className={styles.queryError}>
                Không tải được một số trạng thái.{" "}
                <button
                  onClick={() =>
                    void Promise.all(
                      queries.filter((query) => query.isError).map((query) => query.refetch()),
                    )
                  }
                >
                  Thử lại
                </button>
              </p>
            )}
            <div className={styles.statusBar} aria-label="Tỷ lệ lớp theo trạng thái">
              {statuses.map((item, index) => (
                <span
                  key={item.status}
                  style={{
                    width: `${total ? (counts[index] / total) * 100 : 0}%`,
                    background: item.color,
                  }}
                />
              ))}
            </div>
            <div className={styles.statusRows}>
              {statuses.map((item, index) => (
                <Link key={item.status} to={item.path}>
                  <span className={styles.statusName}>
                    <i style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <strong>
                    {queries[index].isError ? "—" : (queries[index].data?.totalCount ?? "…")}
                  </strong>
                  <small>
                    {total && queries[index].data
                      ? `${Math.round((counts[index] / total) * 100)}%`
                      : "—"}
                  </small>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>Theo chương trình</h2>
            <Link to="/admin/classes/list">Xem danh sách lớp</Link>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.programTable}>
              <thead>
                <tr>
                  <th>Chương trình</th>
                  <th>Học viên</th>
                  <th>Lấp đầy</th>
                  <th>Chuyên cần</th>
                  <th>Ghi danh mới</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.name}>
                    <th>{program.name}</th>
                    <td>{Math.round(program.students * facilityScale)}</td>
                    <td>
                      {program.fill}%{" "}
                      <span className={styles.progress}>
                        <span style={{ width: `${program.fill}%` }} />
                      </span>
                    </td>
                    <td>{program.attendance}%</td>
                    <td>+{program.enrollments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.caption}>
            Dữ liệu minh họa, chưa được liên kết với lớp học thực tế.
          </p>
        </section>
      </div>
    </AdminPage>
  );
}

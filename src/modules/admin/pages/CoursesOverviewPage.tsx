import { CheckCircle, FileText, Layers } from "lucide-react";
import courseMascot from "@/assets/mascot/oy2-reading.png";
import { AdminPage, ButtonLink, OverviewHero } from "../components/ui";
import { useCourses } from "../hooks/useCourses";
import type { CourseStatus } from "../types/course.types";
import styles from "./ClassesOverviewPage.module.css";

const statuses: { status: CourseStatus; label: string; path: string }[] = [
  { status: "Published", label: "Đã xuất bản", path: "/admin/courses/list?status=Published" },
  { status: "Draft", label: "Bản nháp", path: "/admin/courses/list?status=Draft" },
  { status: "Archived", label: "Đã lưu trữ", path: "/admin/courses/lifecycle" },
];

export function CoursesOverviewPage() {
  const allCourses = useCourses({ page: 1, pageSize: 1 });
  const publishedCourses = useCourses({ status: "Published", page: 1, pageSize: 1 });
  const draftCourses = useCourses({ status: "Draft", page: 1, pageSize: 1 });
  const archivedCourses = useCourses({ status: "Archived", page: 1, pageSize: 1 });
  const statusQueries = [publishedCourses, draftCourses, archivedCourses];

  // Breakdown by Exam Type
  const lrCourses = useCourses({ examType: "ListeningReading", page: 1, pageSize: 1 });
  const swCourses = useCourses({ examType: "SpeakingWriting", page: 1, pageSize: 1 });
  const fourSkillsCourses = useCourses({ examType: "FourSkills", page: 1, pageSize: 1 });

  // Breakdown by Level
  const beginnerCourses = useCourses({ level: "Beginner", page: 1, pageSize: 1 });
  const intermediateCourses = useCourses({ level: "Intermediate", page: 1, pageSize: 1 });
  const advancedCourses = useCourses({ level: "Advanced", page: 1, pageSize: 1 });

  return (
    <AdminPage
      theme="blue"
      hero={
        <OverviewHero
          eyebrow="Quản trị nội dung / Khóa học"
          icon={<Layers size={15} />}
          title="Tổng quan"
          highlight="khóa học"
          description="Theo dõi tình trạng xuất bản, chương trình và quản lý các khóa học trong hệ thống ToeicSpace."
          watermark="COURSES"
          mascot={courseMascot}
          actions={
            <>
              <ButtonLink to="/admin/courses/list?create=1" variant="primary">
                Tạo khóa học
              </ButtonLink>
              <ButtonLink to="/admin/courses/list">Danh sách khóa học</ButtonLink>
            </>
          }
          panelLabel="Khóa học"
          panelTitle="Tình trạng khóa học"
          stats={[
            {
              key: "all",
              label: "Tổng khóa học",
              value: allCourses.isError ? "—" : allCourses.data?.totalCount,
              to: "/admin/courses/list",
            },
            ...statuses.map((item, index) => ({
              key: item.status,
              label: item.label,
              value: statusQueries[index].isError ? "—" : statusQueries[index].data?.totalCount,
              to: item.path,
            })),
          ]}
        />
      }
    >
      <div className={styles.overview}>
        {/* Metric cards for Exam Types and Levels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {/* Card: Phân bố theo hình thức thi */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #d8e5ee",
              borderRadius: "8px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={18} color="#365e82" />
              <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#2d4358", fontWeight: 700 }}>
                Phân bố theo hình thức thi
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.8rem",
                  background: "#f7fafc",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: "#455a6f" }}>Listening & Reading (Nghe & Đọc)</span>
                <strong style={{ color: "#284a68", fontSize: "0.95rem" }}>
                  {lrCourses.isError ? "—" : (lrCourses.data?.totalCount ?? "...")}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.8rem",
                  background: "#f7fafc",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: "#455a6f" }}>Speaking & Writing (Nói & Viết)</span>
                <strong style={{ color: "#284a68", fontSize: "0.95rem" }}>
                  {swCourses.isError ? "—" : (swCourses.data?.totalCount ?? "...")}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.8rem",
                  background: "#f7fafc",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: "#455a6f" }}>4 Kỹ năng (Full 4 Skills)</span>
                <strong style={{ color: "#284a68", fontSize: "0.95rem" }}>
                  {fourSkillsCourses.isError ? "—" : (fourSkillsCourses.data?.totalCount ?? "...")}
                </strong>
              </div>
            </div>
          </div>

          {/* Card: Phân bố theo trình độ */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #d8e5ee",
              borderRadius: "8px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle size={18} color="#2b7a54" />
              <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#2d4358", fontWeight: 700 }}>
                Phân bố theo trình độ học viên
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.8rem",
                  background: "#f7fafc",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: "#455a6f" }}>Cơ bản (Beginner)</span>
                <strong style={{ color: "#284a68", fontSize: "0.95rem" }}>
                  {beginnerCourses.isError ? "—" : (beginnerCourses.data?.totalCount ?? "...")}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.8rem",
                  background: "#f7fafc",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: "#455a6f" }}>Trung cấp (Intermediate)</span>
                <strong style={{ color: "#284a68", fontSize: "0.95rem" }}>
                  {intermediateCourses.isError
                    ? "—"
                    : (intermediateCourses.data?.totalCount ?? "...")}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.8rem",
                  background: "#f7fafc",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: "#455a6f" }}>Nâng cao (Advanced)</span>
                <strong style={{ color: "#284a68", fontSize: "0.95rem" }}>
                  {advancedCourses.isError ? "—" : (advancedCourses.data?.totalCount ?? "...")}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Hướng dẫn xuất bản khóa học */}
        <div
          style={{
            marginTop: "1.25rem",
            background: "#fff",
            border: "1px solid #d8e5ee",
            borderRadius: "8px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={18} color="#4b6b8b" />
            <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#2d4358", fontWeight: 700 }}>
              Tiêu chuẩn chất lượng xuất bản khóa học
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#54687d", lineHeight: 1.6 }}>
            Khóa học ở trạng thái <strong>Bản nháp (Draft)</strong> cần hoàn thiện các thông tin
            trước khi chuyển sang trạng thái <strong>Đã xuất bản (Published)</strong>:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.25rem",
              fontSize: "0.82rem",
              color: "#475c70",
              lineHeight: 1.6,
            }}
          >
            <li>
              Có đầy đủ mô tả tóm tắt (Short Description) và mô tả chương trình chi tiết
              (Description).
            </li>
            <li>Có ít nhất một kỹ năng trọng tâm (Skill) và một mục tiêu đầu ra (Objective).</li>
            <li>Ảnh đại diện (Thumbnail) được tải lên và xác nhận hợp lệ qua Cloudflare R2.</li>
          </ul>
        </div>
      </div>
    </AdminPage>
  );
}

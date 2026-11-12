import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Archive,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Globe,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import courseMascot from "@/assets/mascot/oy2-reading.png";
import { AdminPage, Button, ListHero } from "../components/ui";

import { Select } from "@/shared/components/Select";
import {
  CourseActionDialog,
  type CourseActionConfirmation,
} from "../components/CourseActionDialog";
import { CourseFormModal } from "../components/CourseFormModal";
import { CourseListTable } from "../components/CourseListTable";
import { CourseModulesPanel } from "../components/CourseModulesPanel";
import { CoursePricingPanel } from "../components/CoursePricingPanel";
import { useCourseActions, useCourseDetail, useCourses } from "../hooks/useCourses";
import type {
  CourseExamType,
  CourseItem,
  CourseLevel,
  CourseStatus,
  CreateCoursePayload,
  UpdateCoursePayload,
} from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import {
  courseExamTypeLabels,
  courseExamTypeOptions,
  courseLevelLabels,
  courseLevelOptions,
  courseStatusLabels,
  courseStatusOptions,
  resolveThumbnailUrl,
} from "../utils/courseHelpers";
import styles from "./ClassesPage.module.css";
import courseStyles from "./CoursesPage.module.css";

const formatDate = (dateStr?: string | null) =>
  dateStr
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(dateStr))
    : "Chưa thiết lập";

export function CoursesPage({ archived = false }: { archived?: boolean }) {
  const { id: selectedId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const listPath = archived ? "/admin/courses/lifecycle" : "/admin/courses/list";

  const [search, setSearch] = useState("");
  const statusParam = searchParams.get("status") as CourseStatus | null;
  const levelParam = searchParams.get("level") as CourseLevel | null;
  const examTypeParam = searchParams.get("examType") as CourseExamType | null;

  const status: CourseStatus | "" =
    statusParam && statusParam in courseStatusLabels ? statusParam : "";
  const level: CourseLevel | "" = levelParam && levelParam in courseLevelLabels ? levelParam : "";
  const examType: CourseExamType | "" =
    examTypeParam && examTypeParam in courseExamTypeLabels ? examTypeParam : "";

  const [page, setPage] = useState(1);
  const [formCourse, setFormCourse] = useState<CourseItem | "new" | null>(() =>
    searchParams.get("create") === "1" ? "new" : null,
  );
  const [confirmation, setConfirmation] = useState<CourseActionConfirmation | null>(null);
  const [actionError, setActionError] = useState("");

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: archived ? ("Archived" as const) : status || undefined,
      level: level || undefined,
      examType: examType || undefined,
      page,
      pageSize: 20,
    }),
    [search, status, level, examType, page, archived],
  );

  const coursesQuery = useCourses(filters);
  const selectedQuery = useCourseDetail(selectedId ?? null);
  const selectedCourse = selectedQuery.data;
  const showListBanner = !archived && !selectedId;
  const publishedCount = useCourses({ status: "Published", page: 1, pageSize: 1 }, showListBanner);
  const draftCount = useCourses({ status: "Draft", page: 1, pageSize: 1 }, showListBanner);
  const archivedCount = useCourses({ status: "Archived", page: 1, pageSize: 1 }, showListBanner);
  const modulesTab = searchParams.get("tab") === "modules";
  const pricingTab = searchParams.get("tab") === "pricing";

  const actions = useCourseActions();
  const busy =
    actions.create.isPending ||
    actions.update.isPending ||
    actions.publish.isPending ||
    actions.archive.isPending ||
    actions.restore.isPending;

  const submitCourse = async (payload: CreateCoursePayload | UpdateCoursePayload) => {
    if (formCourse === "new") {
      await actions.create.mutateAsync(payload as CreateCoursePayload);
    } else if (formCourse) {
      await actions.update.mutateAsync({
        id: formCourse.id,
        payload: payload as UpdateCoursePayload,
      });
    }
  };

  const runOperation = async (operation: () => Promise<unknown>) => {
    setActionError("");
    try {
      await operation();
    } catch (error) {
      setActionError(courseErrorMessage(error));
    }
  };

  const handlePublish = (course: CourseItem) => {
    setConfirmation({
      title: "Xuất bản khóa học?",
      message: `Khóa học "${course.title}" sẽ được công khai và hiển thị cho học viên trên hệ thống.`,
      confirmLabel: "Xuất bản ngay",
      variant: "primary",
      onConfirm: async () => {
        await actions.publish.mutateAsync(course.id);
      },
    });
  };

  const handleArchive = (course: CourseItem) => {
    setConfirmation({
      title: "Lưu trữ khóa học?",
      message: `Khóa học "${course.title}" sẽ ngừng hiển thị công khai và chuyển vào mục Lưu trữ.`,
      confirmLabel: "Lưu trữ",
      variant: "archive",
      onConfirm: async () => {
        await actions.archive.mutateAsync(course.id);
        navigate(listPath);
      },
    });
  };

  const handleRestore = (course: CourseItem) => {
    setConfirmation({
      title: "Khôi phục khóa học?",
      message: `Khóa học "${course.title}" sẽ được khôi phục về trạng thái Bản nháp để có thể chỉnh sửa và xuất bản lại.`,
      confirmLabel: "Khôi phục về Bản nháp",
      variant: "primary",
      onConfirm: async () => {
        await actions.restore.mutateAsync(course.id);
        navigate("/admin/courses/list");
      },
    });
  };

  const confirmAction = async () => {
    if (!confirmation) return;
    const op = confirmation.onConfirm;
    setConfirmation(null);
    await runOperation(op);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const updateFilters = (newParams: Record<string, string | null>) => {
    const updated = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(newParams)) {
      if (val) updated.set(key, val);
      else updated.delete(key);
    }
    setSearchParams(updated);
    setPage(1);
  };

  const thumbnailSrc = selectedCourse ? resolveThumbnailUrl(selectedCourse.thumbnailKey) : null;
  const navigateBackToList = () => {
    const query = searchParams.toString();
    navigate(query ? `${listPath}?${query}` : listPath);
  };

  return (
    <>
      {selectedId && (
        <div className={styles.backTop}>
          <button className={styles.backButton} onClick={navigateBackToList}>
            ← Quay lại danh sách
          </button>
        </div>
      )}
      <AdminPage
        theme={archived ? "amber" : "blue"}
        hero={
          !showListBanner ? (
            <></>
          ) : (
            <ListHero
              eyebrow="Quản trị nội dung / Khóa học"
              icon={<BookOpen size={15} />}
              title="Danh sách"
              highlight="khóa học"
              description="Quản lý chương trình đào tạo, xuất bản và cập nhật thông tin khóa học."
              mascot={courseMascot}
              actions={
                <Button variant="primary" onClick={() => setFormCourse("new")}>
                  <Plus size={16} /> Tạo khóa học
                </Button>
              }
              items={[
                {
                  key: "published",
                  label: "Đã xuất bản",
                  value: publishedCount.isError ? "—" : publishedCount.data?.totalCount,
                },
                {
                  key: "draft",
                  label: "Bản nháp",
                  value: draftCount.isError ? "—" : draftCount.data?.totalCount,
                },
                {
                  key: "archived",
                  label: "Đã lưu trữ",
                  value: archivedCount.isError ? "—" : archivedCount.data?.totalCount,
                },
              ]}
            />
          )
        }
      >
        <div className={styles.page}>
          {archived && (
            <header className={styles.listHeader}>
              <div>
                <h1>Khóa học đã lưu trữ</h1>
                <p>Xem chi tiết hoặc khôi phục các khóa học đã ngừng hoạt động.</p>
              </div>
            </header>
          )}
          {actionError && (
            <p className={styles.actionError} role="alert">
              {actionError}
            </p>
          )}

          <section className={styles.workspaceSingle}>
            {!selectedId && (
              <div className={styles.listPanel}>
                <form className={styles.toolbar} onSubmit={submitSearch}>
                  <div className={styles.search}>
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm mã, tiêu đề khóa học..."
                      aria-label="Tìm mã hoặc tiêu đề khóa học"
                    />
                    <button aria-label="Tìm kiếm" disabled={coursesQuery.isFetching}>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {!archived && (
                    <Select
                      value={status}
                      onChange={(val) => updateFilters({ status: val || null })}
                      options={courseStatusOptions}
                      aria-label="Lọc theo trạng thái"
                      className={styles.toolbarSelect}
                    />
                  )}

                  <Select
                    value={examType}
                    onChange={(val) => updateFilters({ examType: val || null })}
                    options={courseExamTypeOptions}
                    aria-label="Lọc theo hình thức thi"
                    className={styles.toolbarSelect}
                  />

                  <Select
                    value={level}
                    onChange={(val) => updateFilters({ level: val || null })}
                    options={courseLevelOptions}
                    aria-label="Lọc theo trình độ"
                    className={styles.toolbarSelect}
                  />
                </form>

                <div className={styles.resultLabel} role="status">
                  {coursesQuery.isFetching
                    ? "Đang cập nhật danh sách..."
                    : coursesQuery.data
                      ? `${coursesQuery.data.totalCount} khóa học`
                      : "Danh sách khóa học"}
                </div>

                {coursesQuery.isError ? (
                  <p className={styles.notice}>
                    Không tải được danh sách khóa học.{" "}
                    <button onClick={() => void coursesQuery.refetch()}>Thử lại</button>
                  </p>
                ) : coursesQuery.isPending ? (
                  <p className={styles.notice} role="status">
                    Đang tải danh sách khóa học...
                  </p>
                ) : !coursesQuery.data?.items.length ? (
                  <div className={styles.emptyState}>
                    <strong>
                      {search || status || level || examType
                        ? "Không tìm thấy khóa học phù hợp"
                        : archived
                          ? "Chưa có khóa học đã lưu trữ"
                          : "Chưa có khóa học nào"}
                    </strong>
                    <p>
                      {search || status || level || examType
                        ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
                        : archived
                          ? "Các khóa học sau khi lưu trữ sẽ xuất hiện tại đây."
                          : "Tạo khóa học đầu tiên để bắt đầu xây dựng chương trình giảng dạy."}
                    </p>
                    {!archived && !search && !status && !level && !examType && (
                      <button className={styles.primaryButton} onClick={() => setFormCourse("new")}>
                        Tạo khóa học
                      </button>
                    )}
                  </div>
                ) : (
                  <CourseListTable
                    items={coursesQuery.data.items}
                    basePath={listPath}
                    status={archived ? "Archived" : status}
                    level={level}
                    examType={examType}
                  />
                )}

                {(coursesQuery.data?.totalCount ?? 0) > 20 && (
                  <div className={styles.pagination}>
                    <button
                      aria-label="Trang trước"
                      disabled={page === 1 || coursesQuery.isFetching}
                      onClick={() => setPage((val) => val - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>Trang {page}</span>
                    <button
                      aria-label="Trang sau"
                      disabled={
                        coursesQuery.isFetching ||
                        !coursesQuery.data ||
                        page * coursesQuery.data.pageSize >= coursesQuery.data.totalCount
                      }
                      onClick={() => setPage((val) => val + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedId && (
              <aside className={styles.detailPanel}>
                {selectedQuery.isPending ? (
                  <p className={styles.notice} role="status">
                    Đang tải chi tiết khóa học...
                  </p>
                ) : selectedQuery.isError || !selectedCourse ? (
                  <p className={styles.notice}>
                    Không tải được thông tin khóa học.{" "}
                    <button onClick={() => void selectedQuery.refetch()}>Thử lại</button>
                  </p>
                ) : (
                  <>
                    <nav className={courseStyles.detailTabs} aria-label="Chi tiết khóa học">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={!modulesTab && !pricingTab}
                        className={!modulesTab && !pricingTab ? courseStyles.detailTabActive : ""}
                        onClick={() => updateFilters({ tab: null })}
                      >
                        Thông tin khóa học
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={pricingTab}
                        className={pricingTab ? courseStyles.detailTabActive : ""}
                        onClick={() => updateFilters({ tab: "pricing" })}
                      >
                        Học phí & khuyến mãi
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={modulesTab}
                        className={modulesTab ? courseStyles.detailTabActive : ""}
                        onClick={() => updateFilters({ tab: "modules" })}
                      >
                        Nội dung khóa học ({selectedCourse.modules?.length ?? 0})
                      </button>
                    </nav>
                    {pricingTab ? (
                      <CoursePricingPanel course={selectedCourse} />
                    ) : modulesTab ? (
                      <CourseModulesPanel
                        courseId={selectedCourse.id}
                        courseStatus={selectedCourse.status}
                      />
                    ) : (
                      <>
                        <div className={courseStyles.courseDetailHeader}>
                          <div className={courseStyles.courseDetailTitleWrap}>
                            <span className={styles.code}>{selectedCourse.code}</span>
                            <h2>{selectedCourse.title}</h2>
                            <div className={courseStyles.badgesRow}>
                              <span
                                className={`${styles.badge} ${
                                  selectedCourse.status === "Published"
                                    ? styles.statusActive
                                    : selectedCourse.status === "Archived"
                                      ? styles.statusArchived
                                      : styles.statusDraft
                                }`}
                              >
                                {courseStatusLabels[selectedCourse.status]}
                              </span>
                              <span className={courseStyles.examTypeBadge}>
                                {courseExamTypeLabels[selectedCourse.examType]}
                              </span>
                              <span className={courseStyles.levelBadge}>
                                {courseLevelLabels[selectedCourse.level]}
                              </span>
                              {selectedCourse.targetScore !== null &&
                                selectedCourse.targetScore !== undefined && (
                                  <span className={courseStyles.targetScoreBadge}>
                                    Mục tiêu {selectedCourse.targetScore}+
                                  </span>
                                )}
                            </div>
                          </div>

                          <button
                            className={styles.iconButton}
                            aria-label="Chỉnh sửa khóa học"
                            title="Chỉnh sửa khóa học"
                            onClick={() => setFormCourse(selectedCourse)}
                          >
                            <Edit3 size={17} />
                          </button>
                        </div>

                        {thumbnailSrc && (
                          <div className={courseStyles.thumbnailCard}>
                            <img
                              src={thumbnailSrc}
                              alt={selectedCourse.title}
                              className={courseStyles.thumbnailImage}
                            />
                          </div>
                        )}

                        {selectedCourse.shortDescription && (
                          <p className={styles.description}>{selectedCourse.shortDescription}</p>
                        )}

                        <dl className={styles.meta}>
                          <div>
                            <dt>Học phí</dt>
                            <dd>
                              {selectedCourse.price === 0
                                ? "Miễn phí"
                                : `${new Intl.NumberFormat("vi-VN").format(selectedCourse.price)} ₫`}
                            </dd>
                          </div>
                          <div>
                            <dt>Sức chứa</dt>
                            <dd>
                              {selectedCourse.capacity === null
                                ? "Không giới hạn"
                                : `${selectedCourse.capacity} học viên (tối đa)`}
                            </dd>
                          </div>
                          <div>
                            <dt>Đường dẫn tĩnh (Slug)</dt>
                            <dd>{selectedCourse.slug}</dd>
                          </div>
                          <div>
                            <dt>Hình thức thi</dt>
                            <dd>{courseExamTypeLabels[selectedCourse.examType]}</dd>
                          </div>
                          <div>
                            <dt>Trình độ</dt>
                            <dd>{courseLevelLabels[selectedCourse.level]}</dd>
                          </div>
                          <div>
                            <dt>Điểm mục tiêu</dt>
                            <dd>
                              {selectedCourse.targetScore !== null &&
                              selectedCourse.targetScore !== undefined
                                ? `${selectedCourse.targetScore} điểm`
                                : "Chưa thiết lập"}
                            </dd>
                          </div>
                          <div>
                            <dt>Ngày tạo</dt>
                            <dd>{formatDate(selectedCourse.createdAt)}</dd>
                          </div>
                          <div>
                            <dt>Cập nhật lần cuối</dt>
                            <dd>{formatDate(selectedCourse.updatedAt)}</dd>
                          </div>
                          <div>
                            <dt>Ngày xuất bản</dt>
                            <dd>{formatDate(selectedCourse.publishedAt)}</dd>
                          </div>
                        </dl>

                        {selectedCourse.description && (
                          <section className={courseStyles.detailSection}>
                            <h3>Mô tả chi tiết</h3>
                            <div className={courseStyles.detailDescription}>
                              {selectedCourse.description}
                            </div>
                          </section>
                        )}

                        {selectedCourse.skills.length > 0 && (
                          <section className={courseStyles.detailSection}>
                            <h3>Kỹ năng phát triển ({selectedCourse.skills.length})</h3>
                            <div className={courseStyles.chipsWrapper}>
                              {selectedCourse.skills.map((skill, index) => (
                                <span key={index} className={courseStyles.skillChip}>
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {selectedCourse.objectives.length > 0 && (
                          <section className={courseStyles.detailSection}>
                            <h3>Mục tiêu đào tạo ({selectedCourse.objectives.length})</h3>
                            <ul className={courseStyles.bulletsList}>
                              {selectedCourse.objectives.map((obj, index) => (
                                <li key={index}>{obj}</li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {selectedCourse.prerequisites.length > 0 && (
                          <section className={courseStyles.detailSection}>
                            <h3>Điều kiện tiên quyết ({selectedCourse.prerequisites.length})</h3>
                            <ul className={courseStyles.bulletsList}>
                              {selectedCourse.prerequisites.map((pre, index) => (
                                <li key={index}>{pre}</li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {/* Vòng đời khóa học */}
                        <section className={styles.lifecycle} style={{ marginTop: "2rem" }}>
                          <span className={styles.eyebrow}>VÒNG ĐỜI KHÓA HỌC</span>
                          <div>
                            {selectedCourse.status === "Draft" && (
                              <button
                                className={styles.primaryButton}
                                disabled={busy}
                                onClick={() => handlePublish(selectedCourse)}
                              >
                                <Globe size={15} /> Xuất bản khóa học
                              </button>
                            )}

                            {selectedCourse.status === "Published" && (
                              <button
                                className={styles.archiveButton}
                                disabled={busy}
                                onClick={() => handleArchive(selectedCourse)}
                              >
                                <Archive size={15} /> Lưu trữ khóa học
                              </button>
                            )}

                            {selectedCourse.status === "Archived" && (
                              <button
                                className={styles.secondaryButton}
                                disabled={busy}
                                onClick={() => handleRestore(selectedCourse)}
                              >
                                <RotateCcw size={15} /> Khôi phục về Bản nháp
                              </button>
                            )}
                          </div>
                        </section>
                      </>
                    )}
                  </>
                )}
              </aside>
            )}
          </section>

          {formCourse && (
            <CourseFormModal
              initial={formCourse === "new" ? undefined : formCourse}
              pending={actions.create.isPending || actions.update.isPending}
              onSubmit={submitCourse}
              onClose={() => {
                setFormCourse(null);
                if (searchParams.has("create")) setSearchParams({}, { replace: true });
              }}
            />
          )}

          {confirmation && (
            <CourseActionDialog
              confirmation={confirmation}
              pending={busy}
              onClose={() => setConfirmation(null)}
              onConfirm={() => void confirmAction()}
            />
          )}
        </div>
      </AdminPage>
    </>
  );
}

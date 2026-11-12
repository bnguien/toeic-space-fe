import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, BookOpen, LockKeyhole, ArrowLeft, X } from "lucide-react";
import type { PublicModule } from "../courseCatalog";
import { durationLabel } from "../courseCatalog";
import styles from "./LessonCurriculumSidebar.module.css";

interface LessonCurriculumSidebarProps {
  modules: PublicModule[];
  currentLessonId?: string;
  courseId: string;
  courseTitle?: string;
  basePath?: string;
  isEnrolled?: boolean;
  previewQuery?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  completedLessonIds?: string[];
}

export function LessonCurriculumSidebar({
  modules,
  currentLessonId,
  courseId,
  courseTitle,
  basePath = `/my-courses/${courseId}/lessons`,
  isEnrolled = true,
  previewQuery = "",
  isOpenMobile = false,
  onCloseMobile,
  completedLessonIds = [],
}: LessonCurriculumSidebarProps) {
  // Store user toggle override for each module by ID
  const [userToggledModules, setUserToggledModules] = useState<Record<string, boolean>>({});

  const activeModuleId = modules.find((m) => m.lessons.some((l) => l.id === currentLessonId))?.id;

  const isModuleOpen = (moduleId: string, modIdx: number) => {
    if (moduleId in userToggledModules) {
      return userToggledModules[moduleId];
    }
    return moduleId === activeModuleId || (!activeModuleId && modIdx === 0);
  };

  const toggleModule = (moduleId: string, modIdx: number) => {
    setUserToggledModules((prev) => ({
      ...prev,
      [moduleId]: !isModuleOpen(moduleId, modIdx),
    }));
  };

  // Stats calculation
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = completedLessonIds.length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const getLessonLink = (lessonId: string) => {
    if (isEnrolled) {
      return `${basePath}/${lessonId}`;
    }
    return `/courses/${courseId}/lessons/${lessonId}/preview${previewQuery}`;
  };

  const sidebarContent = (
    <aside
      className={`${styles.sidebar} ${isOpenMobile ? styles.sidebarMobileDrawer : ""}`}
      aria-label="Lộ trình khóa học"
    >
      {/* Back to course overview */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link
          to={`/courses/${courseId}${previewQuery}`}
          className={styles.backLink}
          title="Về trang chi tiết khóa học"
        >
          <ArrowLeft size={14} /> {courseTitle || "Chi tiết khóa học"}
        </Link>
        {isOpenMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            style={{ background: "none", border: 0, cursor: "pointer", padding: "4px" }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Roadmap Stats (Đã học · Bài học · Tiến độ) */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            <i className={`${styles.dot} ${styles.dotLearned}`} />
            Đã học
          </span>
          <strong>{completedCount}</strong>
          <small>bài học</small>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            <i className={`${styles.dot} ${styles.dotTotal}`} />
            Tổng bài
          </span>
          <strong>{totalLessons}</strong>
          <small>bài học</small>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            <i className={`${styles.dot} ${styles.dotProgress}`} />
            Tiến độ
          </span>
          <strong>{progressPct}%</strong>
          <span className={styles.progressBar}>
            <span style={{ width: `${progressPct}%` }} />
          </span>
        </div>
      </div>

      {/* Curriculum Section Head */}
      <div className={styles.sectionHead}>
        <h3>Lộ trình khóa học</h3>
        <span>{totalLessons} bài học</span>
      </div>

      {/* Modules List Timeline (TopicItem style) */}
      <ol className={styles.moduleList}>
        {modules.map((module, modIdx) => {
          const isOpen = isModuleOpen(module.id, modIdx);
          return (
            <li
              key={module.id}
              className={`${styles.moduleItem} ${isOpen ? styles.moduleOpen : ""}`}
            >
              <button
                type="button"
                className={styles.moduleHeader}
                onClick={() => toggleModule(module.id, modIdx)}
                aria-expanded={isOpen}
              >
                <span className={styles.stepNumber}>{modIdx + 1}</span>
                <span className={styles.moduleTitle}>
                  {modIdx + 1}. {module.title}
                </span>
                <span className={styles.moduleCount}>{module.lessons.length} mục</span>
                <ChevronDown
                  size={15}
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                />
              </button>

              {isOpen && (
                <ul className={styles.lessonList}>
                  {module.lessons.map((lesson, lessonIdx) => {
                    const isActive = lesson.id === currentLessonId;
                    const isAccessible = isEnrolled || lesson.isFreePreview;
                    const LessonIcon = BookOpen;

                    const lessonRow = (
                      <>
                        <LessonIcon size={14} className={styles.lessonIcon} />
                        <span className={styles.lessonTitle}>
                          {modIdx + 1}.{lessonIdx + 1} {lesson.title}
                        </span>
                        {lesson.durationSeconds ? (
                          <span className={styles.lessonDuration}>
                            {durationLabel(lesson.durationSeconds)}
                          </span>
                        ) : null}
                        {!isEnrolled && lesson.isFreePreview && (
                          <span className={styles.previewBadge}>Học thử</span>
                        )}
                        {!isAccessible && (
                          <LockKeyhole
                            size={13}
                            className={styles.lockIcon}
                            aria-label="Cần đăng ký"
                          />
                        )}
                      </>
                    );

                    return (
                      <li key={lesson.id}>
                        {isAccessible ? (
                          <Link
                            to={getLessonLink(lesson.id)}
                            className={`${styles.lessonLink} ${isActive ? styles.isOn : ""}`}
                            onClick={onCloseMobile}
                          >
                            {lessonRow}
                          </Link>
                        ) : (
                          <div
                            className={styles.lessonLink}
                            style={{ opacity: 0.6, cursor: "not-allowed" }}
                            title="Bạn cần mua khóa học để học bài này"
                          >
                            {lessonRow}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );

  return (
    <>
      {isOpenMobile && (
        <div className={styles.drawerBackdrop} onClick={onCloseMobile} aria-hidden="true" />
      )}
      {sidebarContent}
    </>
  );
}

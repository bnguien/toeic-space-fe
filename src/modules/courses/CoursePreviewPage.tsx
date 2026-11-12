import { useState, useRef, useMemo } from "react";
import { isAxiosError } from "axios";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  List,
  Video as VideoIcon,
} from "lucide-react";
import { Button, EmptyState } from "@/modules/admin";
import { CourseLessonBanner } from "./components/CourseLessonBanner";
import { pad2, extractVideoChapters } from "./components/lessonContentHelpers";
import { usePublicCourse, usePublicPreview, durationLabel } from "./courseCatalog";
import { LessonVideoPlayer, type LessonVideoPlayerHandle } from "./components/LessonVideoPlayer";
import { LessonTextbookContent } from "./components/LessonTextbookContent";
import { LessonCurriculumSidebar } from "./components/LessonCurriculumSidebar";
import { LessonAttachments } from "./components/LessonAttachments";
import { LessonNavigation } from "./components/LessonNavigation";
import styles from "./LearningPage.module.css";

export function CoursePreviewPage() {
  const { courseId = "", lessonId } = useParams();
  const [params] = useSearchParams();
  const course = usePublicCourse(courseId);
  const query = usePublicPreview(courseId, lessonId);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userSelectedTab, setUserSelectedTab] = useState<{
    lessonId?: string;
    tab: "content" | "attachments";
  } | null>(null);
  const [userSelectedVideo, setUserSelectedVideo] = useState<{
    lessonId?: string;
    idx: number;
  } | null>(null);

  // Active tab and video automatically default to content & 0 when lessonId changes
  const activeTab =
    userSelectedTab && userSelectedTab.lessonId === lessonId ? userSelectedTab.tab : "content";
  const activeVideoIdx =
    userSelectedVideo && userSelectedVideo.lessonId === lessonId ? userSelectedVideo.idx : 0;
  const setActiveTab = (tab: "content" | "attachments") => setUserSelectedTab({ lessonId, tab });
  const setActiveVideoIdx = (idx: number) => setUserSelectedVideo({ lessonId, idx });

  const videoPlayerRef = useRef<LessonVideoPlayerHandle>(null);

  const courseModules = course.data?.modules;
  const modules = useMemo(() => {
    if (!courseModules) return [];
    return courseModules
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((mod) => ({
        ...mod,
        lessons: mod.lessons.slice().sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  }, [courseModules]);

  const allLessons = useMemo(() => {
    return modules.flatMap((mod) =>
      mod.lessons.map((l) => ({
        ...l,
        moduleId: mod.id,
        moduleTitle: mod.title,
      })),
    );
  }, [modules]);

  const currentLessonMeta = useMemo(() => {
    return allLessons.find((l) => l.id === lessonId);
  }, [allLessons, lessonId]);

  const currentIndex = useMemo(() => {
    return allLessons.findIndex((l) => l.id === lessonId);
  }, [allLessons, lessonId]);

  const currentModule = useMemo(() => {
    if (!currentLessonMeta) return null;
    return modules.find((m) => m.id === currentLessonMeta.moduleId) || null;
  }, [modules, currentLessonMeta]);

  const currentModuleIndex = useMemo(() => {
    if (!currentModule) return 0;
    return modules.findIndex((m) => m.id === currentModule.id);
  }, [modules, currentModule]);

  const prevLesson =
    currentIndex > 0 && allLessons[currentIndex - 1].isFreePreview
      ? allLessons[currentIndex - 1]
      : null;
  const nextLesson =
    currentIndex >= 0 &&
    currentIndex < allLessons.length - 1 &&
    allLessons[currentIndex + 1].isFreePreview
      ? allLessons[currentIndex + 1]
      : null;

  const retry = () => {
    void query.refetch();
  };

  const previewTextContent = query.data?.textContent;
  const chapters = useMemo(() => {
    return extractVideoChapters(previewTextContent || "");
  }, [previewTextContent]);

  const handleSeekToTime = (seconds: number) => {
    videoPlayerRef.current?.seekTo(seconds);
  };

  const totalLessons = allLessons.length;
  const previewQuery = params.size ? `?${params}` : "";
  const lessonData = query.data;
  const videos = lessonData?.videos || [];
  const currentVideo = videos[activeVideoIdx] || videos[0] || null;
  const hasAttachments = Boolean(lessonData?.attachments && lessonData.attachments.length > 0);
  const effectiveTab = activeTab === "attachments" && !hasAttachments ? "content" : activeTab;

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} ${isSidebarCollapsed ? styles.sideCollapsed : ""}`}>
        {/* Left Column: Curriculum Roadmap Sidebar */}
        <div className={styles.side}>
          <LessonCurriculumSidebar
            modules={modules}
            currentLessonId={lessonId}
            courseId={courseId}
            courseTitle={course.data?.title}
            isEnrolled={false}
            previewQuery={previewQuery}
            completedLessonIds={[]}
          />
        </div>

        {/* Divider with collapse button */}
        <div className={styles.split} role="separator">
          <button
            type="button"
            className={styles.splitBtn}
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? "Mở rộng danh sách" : "Thu gọn danh sách"}
            title={isSidebarCollapsed ? "Mở rộng danh sách" : "Thu gọn danh sách"}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Right Column: Main Lesson Content */}
        <main className={styles.main}>
          {/* Mobile bar to open drawer */}
          <div className={styles.mobileBar}>
            <button
              type="button"
              className={styles.mobileSidebarBtn}
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <List size={16} /> Danh sách bài học
            </button>
            <span style={{ fontSize: "12px", color: "var(--gp-muted)" }}>
              {currentIndex >= 0 ? `Bài ${currentIndex + 1} / ${totalLessons}` : ""}
            </span>
          </div>

          <div className={styles.mainInner}>
            {query.isPending ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gp-muted)" }}>
                Đang tải bài học xem trước…
              </div>
            ) : query.isError ? (
              <EmptyState
                title={
                  isAxiosError(query.error) && query.error.response?.status === 404
                    ? "Bài học không có quyền xem trước"
                    : "Không tải được bài học"
                }
                description="Nội dung có thể đã thay đổi hoặc bài học cần đăng ký khóa học."
                action={
                  <div style={{ display: "flex", gap: "12px" }}>
                    <Button onClick={retry}>Thử lại</Button>
                    <Link to={`/courses/${courseId}`} style={{ textDecoration: "none" }}>
                      <Button>Xem khóa học</Button>
                    </Link>
                  </div>
                }
              />
            ) : !lessonData ? (
              <EmptyState title="Bài học chưa có nội dung xem trước" />
            ) : (
              <>
                {/* 1. Cover Banner (Matching Grammar LessonBanner) */}
                <CourseLessonBanner
                  kicker={`HỌC THỬ MIỄN PHÍ · CHƯƠNG ${pad2(currentModuleIndex + 1)} · ${currentModule?.title?.toUpperCase() || "TỔNG QUAN"}`}
                  title="HỌC THỬ"
                  pill={`BÀI ${pad2(currentIndex + 1)}`}
                  sub={lessonData.title}
                  small={`BÀI ${currentIndex + 1} / ${totalLessons}${currentLessonMeta?.durationSeconds ? ` · ${durationLabel(currentLessonMeta.durationSeconds)}` : ""}`}
                />

                {/* 2. Parts Bar (Tabs) */}
                <nav className={styles.tabs} aria-label="Phần của bài học">
                  <button
                    type="button"
                    className={`${styles.tab} ${effectiveTab === "content" ? styles.isOn : ""}`}
                    onClick={() => setActiveTab("content")}
                  >
                    <BookOpen size={16} /> Kiến thức & Bài giảng
                  </button>
                  {hasAttachments && (
                    <button
                      type="button"
                      className={`${styles.tab} ${effectiveTab === "attachments" ? styles.isOn : ""}`}
                      onClick={() => setActiveTab("attachments")}
                    >
                      <Paperclip size={16} /> Tài liệu ({lessonData.attachments.length})
                    </button>
                  )}
                </nav>

                {/* 3. Tab: Kiến thức & Bài giảng */}
                {effectiveTab === "content" && (
                  <div>
                    {/* Video Player if lesson has videos */}
                    {videos.length > 0 && currentVideo && (
                      <div className={styles.videoSection}>
                        <LessonVideoPlayer
                          ref={videoPlayerRef}
                          src={currentVideo.url}
                          title={currentVideo.fileName}
                          chapters={chapters}
                          onReload={retry}
                        />

                        {/* Switch video if multiple videos */}
                        {videos.length > 1 && (
                          <div className={styles.videoSelector}>
                            {videos.map((vid, idx) => (
                              <button
                                key={vid.id}
                                type="button"
                                className={`${styles.videoTabBtn} ${idx === activeVideoIdx ? styles.videoTabBtnActive : ""}`}
                                onClick={() => setActiveVideoIdx(idx)}
                              >
                                <VideoIcon size={14} /> Video {idx + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Goals Box: "Học done bài này, bạn sẽ" */}
                    <div className={styles.goals}>
                      <div className={styles.goalsT}>Học done bài này, bạn sẽ</div>
                      <ul>
                        <li>
                          Nắm vững các kiến thức trọng tâm và cấu trúc trong bài {lessonData.title}.
                        </li>
                        <li>
                          Làm quen với phương pháp giảng dạy và hệ thống bài tập thực chiến của khóa
                          học.
                        </li>
                        <li>Tự tin thực hành và nâng cao phản xạ cho các phần thi TOEIC.</li>
                      </ul>
                    </div>

                    {/* Textbook Content */}
                    {lessonData.textContent ? (
                      <LessonTextbookContent
                        content={lessonData.textContent}
                        onSeek={handleSeekToTime}
                      />
                    ) : (
                      !videos.length && (
                        <p style={{ color: "var(--gp-muted)", padding: "20px 0" }}>
                          Bài học này hiện chưa có nội dung văn bản.
                        </p>
                      )
                    )}
                  </div>
                )}

                {/* 4. Tab: Tài liệu đính kèm */}
                {effectiveTab === "attachments" && lessonData.attachments && (
                  <LessonAttachments attachments={lessonData.attachments} onRefresh={retry} />
                )}

                {/* 5. Previous / Next Lesson Navigation (TopicPager style) */}
                <LessonNavigation
                  prevLesson={prevLesson}
                  nextLesson={nextLesson}
                  basePath={`/my-courses/${courseId}/lessons`}
                  query={previewQuery}
                  isEnrolled={false}
                />
              </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <LessonCurriculumSidebar
        modules={modules}
        currentLessonId={lessonId}
        courseId={courseId}
        courseTitle={course.data?.title}
        isEnrolled={false}
        previewQuery={previewQuery}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        completedLessonIds={[]}
      />
    </div>
  );
}

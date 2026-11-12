import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
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
import { useEnrollment } from "./purchaseHooks";
import { purchaseApi } from "./purchaseApi";
import { usePublicCourse, durationLabel, type PublicPreview } from "./courseCatalog";
import { purchaseError } from "./purchaseError";
import { LessonVideoPlayer, type LessonVideoPlayerHandle } from "./components/LessonVideoPlayer";
import { LessonTextbookContent } from "./components/LessonTextbookContent";
import { LessonCurriculumSidebar } from "./components/LessonCurriculumSidebar";
import { LessonAttachments } from "./components/LessonAttachments";
import { LessonNavigation } from "./components/LessonNavigation";
import styles from "./LearningPage.module.css";

export function LearningPage() {
  const { courseId = "", lessonId } = useParams();
  const course = usePublicCourse(courseId);
  const enrollment = useEnrollment(courseId);

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

  // Flatten and sort all lessons across modules in proper curriculum order
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

  // Determine current lesson
  const currentLessonMeta = useMemo(() => {
    return allLessons.find((l) => l.id === lessonId);
  }, [allLessons, lessonId]);

  const currentLessonIndex = useMemo(() => {
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

  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
      ? allLessons[currentLessonIndex + 1]
      : null;

  // Fetch student lesson detail with signed media URLs
  const lessonQuery = useQuery({
    queryKey: ["courses", "studentLesson", courseId, lessonId],
    queryFn: async () => {
      if (!courseId || !lessonId) return null;
      return purchaseApi.lesson(courseId, lessonId);
    },
    enabled: Boolean(courseId && lessonId && enrollment.data?.enrolledAt),
    staleTime: 5 * 60 * 1000,
  });

  const lesson = lessonQuery.data;
  const videos: PublicPreview["videos"] = lesson?.videos ?? [];
  const currentVideo = videos[activeVideoIdx] ?? videos[0] ?? null;

  // Extract chapters from text content
  const textContent = lesson?.textContent;
  const chapters = useMemo(() => {
    if (!textContent) return [];
    return extractVideoChapters(textContent);
  }, [textContent]);

  const handleSeek = (seconds: number) => {
    videoPlayerRef.current?.seekTo(seconds);
  };

  const isEnrolled = enrollment.data?.enrolledAt;
  const totalLessons = allLessons.length;
  const hasAttachments = Boolean(lesson?.attachments && lesson.attachments.length > 0);
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
            isEnrolled={Boolean(isEnrolled)}
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
              {currentLessonIndex >= 0 ? `Bài ${currentLessonIndex + 1} / ${totalLessons}` : ""}
            </span>
          </div>

          <div className={styles.mainInner}>
            {enrollment.isPending || course.isPending ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gp-muted)" }}>
                Đang tải thông tin bài học…
              </div>
            ) : !isEnrolled ? (
              <EmptyState
                title="Chưa mở khóa khóa học"
                description="Bạn cần đăng ký hoặc hoàn tất thanh toán khóa học để xem nội dung bài giảng này."
                action={
                  <Link to={`/courses/${courseId}`} style={{ textDecoration: "none" }}>
                    <Button>Xem thông tin khóa học</Button>
                  </Link>
                }
              />
            ) : lessonQuery.isPending ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gp-muted)" }}>
                Đang chuẩn bị nội dung bài học…
              </div>
            ) : lessonQuery.isError ? (
              <EmptyState
                title="Không thể tải bài học"
                description={purchaseError(lessonQuery.error)}
                action={<Button onClick={() => void lessonQuery.refetch()}>Thử lại</Button>}
              />
            ) : !lesson ? (
              <EmptyState
                title="Không tìm thấy bài học"
                description="Bài học có thể đã bị xóa hoặc không còn khả dụng."
              />
            ) : (
              <>
                {/* 1. Cover Banner (Matching Grammar LessonBanner) */}
                <CourseLessonBanner
                  kicker={`CHƯƠNG ${pad2(currentModuleIndex + 1)} · ${currentModule?.title?.toUpperCase() || "TỔNG QUAN"}`}
                  title="BÀI HỌC"
                  pill={`BÀI ${pad2(currentLessonIndex + 1)}`}
                  sub={lesson.title}
                  small={`BÀI ${currentLessonIndex + 1} / ${totalLessons}${currentLessonMeta?.durationSeconds ? ` · ${durationLabel(currentLessonMeta.durationSeconds)}` : ""}`}
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
                      <Paperclip size={16} /> Tài liệu ({lesson.attachments.length})
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
                          onReload={() => {
                            void lessonQuery.refetch();
                          }}
                        />

                        {/* Switch video if lesson has multiple video parts */}
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
                          Nắm vững các kiến thức trọng tâm và cấu trúc trong bài {lesson.title}.
                        </li>
                        <li>
                          Nhận diện dấu hiệu và phản xạ nhanh các dạng bài thi TOEIC liên quan.
                        </li>
                        <li>Tránh các bẫy thường gặp và củng cố phương pháp làm bài hiệu quả.</li>
                      </ul>
                    </div>

                    {/* Textbook Content */}
                    {lesson.textContent ? (
                      <LessonTextbookContent content={lesson.textContent} onSeek={handleSeek} />
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
                {effectiveTab === "attachments" && lesson.attachments && (
                  <LessonAttachments
                    attachments={lesson.attachments}
                    onRefresh={() => void lessonQuery.refetch()}
                  />
                )}

                {/* 5. Previous / Next Lesson Navigation (TopicPager style) */}
                <LessonNavigation
                  prevLesson={prevLesson}
                  nextLesson={nextLesson}
                  basePath={`/my-courses/${courseId}/lessons`}
                  isEnrolled={true}
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
        isEnrolled={Boolean(isEnrolled)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        completedLessonIds={[]}
      />
    </div>
  );
}

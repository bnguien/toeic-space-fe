import { useState, type ChangeEvent, type FormEvent } from "react";
import { Image as ImageIcon, Upload } from "lucide-react";
import { Select } from "@/shared/components/Select";
import { Button, Modal } from "./ui";
import { useCourseThumbnailUpload } from "../hooks/useCourses";
import { CourseTagInput } from "./CourseTagInput";
import type {
  CourseExamType,
  CourseItem,
  CourseLevel,
  CreateCoursePayload,
  UpdateCoursePayload,
} from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import {
  courseExamTypeFormOptions,
  courseLevelFormOptions,
  resolveThumbnailUrl,
  slugify,
  validateTargetScore,
} from "../utils/courseHelpers";
import formStyles from "./CourseFormModal.module.css";
import styles from "../pages/ClassesPage.module.css";

interface CourseFormModalProps {
  initial?: CourseItem;
  onSubmit: (payload: CreateCoursePayload | UpdateCoursePayload) => Promise<void>;
  onClose: () => void;
  pending: boolean;
}

export function CourseFormModal({ initial, onSubmit, onClose, pending }: CourseFormModalProps) {
  const isNew = !initial;
  const [errorMessage, setErrorMessage] = useState("");

  // Inline field errors (shown on blur)
  const [codeError, setCodeError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [slugError, setSlugError] = useState("");

  // Form field states
  const [code, setCode] = useState(initial?.code ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [examType, setExamType] = useState<CourseExamType>(initial?.examType ?? "ListeningReading");
  const [level, setLevel] = useState<CourseLevel>(initial?.level ?? "Intermediate");
  const [targetScore, setTargetScore] = useState<string>(
    initial?.targetScore !== null && initial?.targetScore !== undefined
      ? String(initial.targetScore)
      : "",
  );
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  // Dynamic tags
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [objectives, setObjectives] = useState<string[]>(initial?.objectives ?? []);
  const [prerequisites, setPrerequisites] = useState<string[]>(initial?.prerequisites ?? []);

  // Thumbnail upload
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(initial?.thumbnailKey ?? null);
  const { uploadThumbnail, isUploading, uploadError, previewUrl, clearUpload } =
    useCourseThumbnailUpload();

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    setTitle(val);
    if (titleError) setTitleError("");
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    setSlug(slugify(event.target.value));
    if (slugError) setSlugError("");
  };

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const handleCodeBlur = () => {
    setCodeError(code.trim() ? "" : "Mã khóa học không được để trống.");
  };

  const handleTitleBlur = () => {
    setTitleError(title.trim() ? "" : "Tên khóa học không được để trống.");
  };

  const handleSlugBlur = () => {
    if (!slug.trim()) {
      setSlugError("Đường dẫn (slug) không được để trống.");
    } else if (!slugRegex.test(slug.trim())) {
      setSlugError("Slug chỉ gồm chữ cái thường, số và dấu gạch ngang (VD: toeic-750-cap-toc).");
    } else {
      setSlugError("");
    }
  };

  const handleThumbnailFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const key = await uploadThumbnail(file);
      setThumbnailKey(key);
      setErrorMessage("");
    } catch {
      // Handled by hook error state
    }
  };

  const removeThumbnail = () => {
    setThumbnailKey(null);
    clearUpload();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    const scoreNum = targetScore.trim() ? Number(targetScore.trim()) : null;
    const scoreError = validateTargetScore(scoreNum, examType);
    if (scoreError) {
      setErrorMessage(scoreError);
      return;
    }

    // Validate required fields inline before submit
    let hasInlineError = false;
    if (!code.trim()) {
      setCodeError("Mã khóa học không được để trống.");
      hasInlineError = true;
    }
    if (!title.trim()) {
      setTitleError("Tên khóa học không được để trống.");
      hasInlineError = true;
    }
    if (!slug.trim()) {
      setSlugError("Đường dẫn (slug) không được để trống.");
      hasInlineError = true;
    } else if (!slugRegex.test(slug.trim())) {
      setSlugError("Slug chỉ gồm chữ cái thường, số và dấu gạch ngang (VD: toeic-750-cap-toc).");
      hasInlineError = true;
    }
    if (hasInlineError) return;

    try {
      if (isNew) {
        const payload: CreateCoursePayload = {
          code: code.trim(),
          title: title.trim(),
          slug: slug.trim(),
          examType,
          level,
          targetScore: scoreNum,
          shortDescription: shortDescription.trim() || null,
          description: description.trim() || null,
          thumbnailKey: thumbnailKey || null,
          skills,
          objectives,
          prerequisites,
        };
        await onSubmit(payload);
      } else {
        const payload: UpdateCoursePayload = {
          code: code.trim() || undefined,
          title: title.trim(),
          slug: slug.trim(),
          examType,
          level,
          targetScore: scoreNum,
          shortDescription: shortDescription.trim() || null,
          description: description.trim() || null,
          thumbnailKey: thumbnailKey || null,
          skills,
          objectives,
          prerequisites,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (error) {
      setErrorMessage(courseErrorMessage(error));
    }
  };

  const currentThumbnailSrc = previewUrl || resolveThumbnailUrl(thumbnailKey);

  return (
    <Modal
      open
      wide
      title={isNew ? "Tạo khóa học" : initial.title}
      description={isNew ? "Thiết lập khóa học mới" : "Cập nhật khóa học"}
      busy={pending || isUploading}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={pending || isUploading}>
            Hủy
          </Button>
          <Button
            type="submit"
            form="course-form"
            variant="primary"
            disabled={pending || isUploading}
          >
            {pending ? "Đang lưu..." : isNew ? "Tạo khóa học" : "Lưu thay đổi"}
          </Button>
        </>
      }
    >
      <form id="course-form" onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* Mã khóa học */}
          <label>
            Mã khóa học *
            <input
              name="code"
              required
              maxLength={50}
              value={code}
              autoFocus={isNew}
              onChange={(e) => {
                setCode(e.target.value);
                if (codeError) setCodeError("");
              }}
              onBlur={handleCodeBlur}
              placeholder="VD: TOEIC-750-LR"
            />
            {codeError && <span className={formStyles.fieldError}>{codeError}</span>}
          </label>

          {/* Tên khóa học */}
          <label>
            Tên khóa học *
            <input
              name="title"
              required
              maxLength={200}
              value={title}
              autoFocus={!isNew}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="VD: TOEIC Mục Tiêu 750+ Cấp Tốc"
            />
            {titleError && <span className={formStyles.fieldError}>{titleError}</span>}
          </label>

          {/* Slug */}
          <label className={styles.fullWidth}>
            Đường dẫn tĩnh (Slug) *
            <input
              name="slug"
              required
              maxLength={160}
              value={slug}
              onChange={handleSlugChange}
              onBlur={handleSlugBlur}
              placeholder="VD: toeic-muc-tieu-750-cap-toc"
            />
            {slugError && <span className={formStyles.fieldError}>{slugError}</span>}
          </label>

          {/* Hình thức thi & Trình độ */}
          <div className={`${styles.fullWidth} ${formStyles.twoCol}`}>
            <label>
              Hình thức thi *
              <Select
                value={examType}
                onChange={(val) => setExamType(val as CourseExamType)}
                options={courseExamTypeFormOptions}
                aria-label="Hình thức thi"
              />
            </label>

            <label>
              Trình độ *
              <Select
                value={level}
                onChange={(val) => setLevel(val as CourseLevel)}
                options={courseLevelFormOptions}
                aria-label="Trình độ"
              />
            </label>
          </div>

          {/* Điểm mục tiêu */}
          <label className={styles.fullWidth}>
            Điểm mục tiêu (bội số của 10)
            <input
              type="number"
              step="10"
              min="0"
              max="1390"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              placeholder={
                examType === "ListeningReading"
                  ? "VD: 750 (10 – 990)"
                  : examType === "SpeakingWriting"
                    ? "VD: 300 (0 – 400)"
                    : "VD: 1050 (10 – 1390)"
              }
            />
          </label>

          {/* Thumbnail upload */}
          <div className={formStyles.thumbnailContainer}>
            <label>Ảnh đại diện khóa học (Thumbnail)</label>
            <div className={formStyles.thumbnailBox}>
              {currentThumbnailSrc ? (
                <img
                  src={currentThumbnailSrc}
                  alt="Thumbnail preview"
                  className={formStyles.thumbnailPreview}
                />
              ) : (
                <div className={formStyles.thumbnailPlaceholder}>
                  <ImageIcon size={24} />
                  <span>Chưa có ảnh</span>
                </div>
              )}

              <div className={formStyles.thumbnailActions}>
                <label className={formStyles.uploadBtn}>
                  <Upload size={14} />
                  <span>{currentThumbnailSrc ? "Thay đổi ảnh" : "Tải ảnh lên"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isUploading || pending}
                    onChange={handleThumbnailFile}
                  />
                </label>
                {currentThumbnailSrc && (
                  <button
                    type="button"
                    className={formStyles.removeThumbBtn}
                    onClick={removeThumbnail}
                    disabled={isUploading || pending}
                  >
                    Xóa ảnh
                  </button>
                )}
                {isUploading && (
                  <span className={formStyles.uploadProgress}>Đang tải ảnh lên máy chủ...</span>
                )}
                {uploadError && <span className={formStyles.uploadError}>{uploadError}</span>}
                <span className={formStyles.thumbnailHint}>
                  Hỗ trợ JPEG, PNG, WebP (Tối đa 5MB).
                </span>
              </div>
            </div>
          </div>

          {/* Mô tả ngắn */}
          <label className={styles.fullWidth}>
            Mô tả ngắn (tối đa 500 ký tự)
            <textarea
              name="shortDescription"
              maxLength={500}
              rows={2}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Tóm tắt nội dung chính của khóa học..."
            />
          </label>

          {/* Mô tả chi tiết */}
          <label className={styles.fullWidth}>
            Mô tả chi tiết (tối đa 10.000 ký tự)
            <textarea
              name="description"
              maxLength={10000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu đầy đủ chương trình, lộ trình, kết quả đạt được..."
            />
          </label>

          {/* Kỹ năng (Skills) */}
          <CourseTagInput
            label="Kỹ năng phát triển (Skills)"
            items={skills}
            maxItems={20}
            placeholder="VD: Nghe hiểu Part 3 & 4 (Nhấn Enter hoặc dán nhiều dòng)"
            onChange={setSkills}
            onError={setErrorMessage}
            disabled={pending || isUploading}
          />

          {/* Mục tiêu (Objectives) */}
          <CourseTagInput
            label="Mục tiêu đào tạo (Objectives)"
            items={objectives}
            maxItems={30}
            placeholder="VD: Nắm vững 12 chủ điểm ngữ pháp trọng tâm (Nhấn Enter hoặc dán nhiều dòng)"
            onChange={setObjectives}
            onError={setErrorMessage}
            disabled={pending || isUploading}
          />

          {/* Điều kiện tiên quyết (Prerequisites) */}
          <CourseTagInput
            label="Điều kiện tiên quyết (Prerequisites)"
            items={prerequisites}
            maxItems={30}
            placeholder="VD: Trình độ TOEIC đầu vào tối thiểu 500+ (Nhấn Enter hoặc dán nhiều dòng)"
            onChange={setPrerequisites}
            onError={setErrorMessage}
            disabled={pending || isUploading}
          />
        </div>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </form>
    </Modal>
  );
}

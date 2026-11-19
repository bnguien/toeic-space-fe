import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, Modal } from "./ui";
import { LessonDurationField } from "./LessonDurationField";
import { LessonTextEditor } from "./LessonTextEditor";
import { LessonMediaEditor } from "./LessonMediaEditor";
import { useCourseLessonActions } from "../hooks/useCourseLessons";
import type { CourseLesson, CourseLessonResource, LessonMediaDraft } from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import {
  clearLessonDraft,
  saveLessonDraft,
  verifyLessonDraftMedia,
  type LessonDraft,
} from "../utils/lessonDraft";
import styles from "./lessonManagement.module.css";

export function LessonEditorForm({
  courseId,
  moduleId,
  lesson,
  onClose,
  onSaved,
  onRefresh,
  onPreviewLesson,
  draftKey,
  draft,
}: {
  courseId: string;
  moduleId: string;
  lesson?: CourseLesson;
  onClose: () => void;
  onSaved: () => void;
  onRefresh: () => void;
  onPreviewLesson: (lessonId: string) => void;
  draftKey: string;
  draft: LessonDraft | null;
}) {
  const [savedLessonId, setSavedLessonId] = useState<string | null>(draft?.savedLessonId ?? null);
  const actions = useCourseLessonActions(courseId, moduleId);
  const [title, setTitle] = useState(draft?.title ?? lesson?.title ?? "");
  const [description, setDescription] = useState(draft?.description ?? lesson?.description ?? "");
  const [textContent, setTextContent] = useState(draft?.textContent ?? lesson?.textContent ?? "");
  const initialDuration = lesson?.durationSeconds ?? 0;
  const [durationHours, setDurationHours] = useState(
    draft?.durationHours ?? String(Math.floor(initialDuration / 3600)),
  );
  const [durationMinutes, setDurationMinutes] = useState(
    draft?.durationMinutes ?? String(Math.floor((initialDuration % 3600) / 60)),
  );
  const [durationSecondsPart, setDurationSecondsPart] = useState(
    draft?.durationSecondsPart ?? String(initialDuration % 60),
  );
  const [isFreePreview, setIsFreePreview] = useState(
    draft?.isFreePreview ?? lesson?.isFreePreview ?? false,
  );
  const [videos, setVideos] = useState<LessonMediaDraft[]>(
    () =>
      lesson?.videos
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((video) => ({
          id: video.id,
          key: video.objectKey,
          fileName: video.fileName,
        })) ?? [],
  );
  const [resources, setResources] = useState<CourseLessonResource[]>(lesson?.resources ?? []);
  const [removedResources, setRemovedResources] = useState<string[]>([]);
  const [pendingResources, setPendingResources] = useState<LessonMediaDraft[]>([]);
  const pendingResourcesRef = useRef(pendingResources);
  useEffect(() => {
    pendingResourcesRef.current = pendingResources;
  }, [pendingResources]);
  const [mediaBusy, setMediaBusy] = useState({ video: false, attachments: false });
  const [error, setError] = useState("");
  // A draft always wins over the saved lesson, even when its media lists are empty
  // (e.g. the admin removed every video). Otherwise server data would reappear.
  const [mediaRestoring, setMediaRestoring] = useState(Boolean(draft));
  const [mediaRestoreError, setMediaRestoreError] = useState(false);
  const [mediaRestoreAttempt, setMediaRestoreAttempt] = useState(0);
  const mediaRestored = useRef(false);
  const hasStoredDraft = useRef(Boolean(draft));

  useEffect(
    () => () =>
      pendingResourcesRef.current.forEach((resource) => {
        if (resource.previewUrl) URL.revokeObjectURL(resource.previewUrl);
      }),
    [],
  );

  useEffect(() => {
    if (!draft || mediaRestored.current || !mediaRestoring) return;
    let active = true;
    void verifyLessonDraftMedia(draft, lesson)
      .then((verified) => {
        if (!active) return;
        mediaRestored.current = true;
        setVideos(verified.videos);
        setPendingResources(verified.attachments);
        setRemovedResources(verified.removedResourceIds);
        if (verified.dropped)
          setError("Một số tệp trong bản nháp không còn hợp lệ và đã được bỏ qua.");
        setMediaRestoring(false);
        setMediaRestoreError(false);
      })
      .catch(() => {
        if (!active) return;
        setMediaRestoring(false);
        setMediaRestoreError(true);
      });
    return () => {
      active = false;
    };
  }, [draft, lesson, mediaRestoring, mediaRestoreAttempt]);

  const snapshot = useMemo(
    () => ({
      title,
      description,
      textContent,
      durationHours,
      durationMinutes,
      durationSecondsPart,
      isFreePreview,
      savedLessonId,
      videos: videos.map(({ key, fileName, id }) => ({ key, fileName, ...(id ? { id } : {}) })),
      attachments: pendingResources.map(({ key, fileName }) => ({ key, fileName })),
      removedResourceIds: removedResources,
    }),
    [
      title,
      description,
      textContent,
      durationHours,
      durationMinutes,
      durationSecondsPart,
      isFreePreview,
      savedLessonId,
      videos,
      pendingResources,
      removedResources,
    ],
  );
  const original = useMemo(
    () => ({
      title: lesson?.title ?? "",
      description: lesson?.description ?? "",
      textContent: lesson?.textContent ?? "",
      durationHours: String(Math.floor(initialDuration / 3600)),
      durationMinutes: String(Math.floor((initialDuration % 3600) / 60)),
      durationSecondsPart: String(initialDuration % 60),
      isFreePreview: lesson?.isFreePreview ?? false,
      savedLessonId: null,
      videos:
        lesson?.videos
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((video) => ({ key: video.objectKey, fileName: video.fileName, id: video.id })) ?? [],
      attachments: [],
      removedResourceIds: [],
    }),
    [lesson, initialDuration],
  );
  const unsaved = JSON.stringify(snapshot) !== JSON.stringify(original);
  const storedSnapshot = useMemo(
    () =>
      mediaRestoreError && draft
        ? {
            ...snapshot,
            videos: draft.videos,
            attachments: draft.attachments,
            removedResourceIds: draft.removedResourceIds,
          }
        : snapshot,
    [mediaRestoreError, draft, snapshot],
  );

  useEffect(() => {
    if (mediaRestoring || (!unsaved && !hasStoredDraft.current)) return;
    const timer = window.setTimeout(() => {
      saveLessonDraft(draftKey, storedSnapshot);
      hasStoredDraft.current = true;
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draftKey, storedSnapshot, mediaRestoring, unsaved]);

  const requestClose = () => {
    if (pending || mediaRestoring) return;
    if (!mediaRestoreError && (unsaved || hasStoredDraft.current)) {
      saveLessonDraft(draftKey, storedSnapshot);
      hasStoredDraft.current = true;
    }
    onClose();
  };

  const saving =
    actions.create.isPending ||
    actions.update.isPending ||
    actions.setFreePreview.isPending ||
    actions.addResources.isPending ||
    actions.removeResource.isPending;
  const pending = saving || mediaBusy.video || mediaBusy.attachments;
  const currentLessonId = savedLessonId ?? lesson?.id ?? null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || mediaRestoring) return;
    if (mediaRestoreError) {
      setError("Chưa xác minh được tệp trong bản nháp. Vui lòng kiểm tra lại trước khi lưu.");
      return;
    }
    if (!title.trim()) {
      setError("Tên bài học không được để trống.");
      return;
    }
    const durationParts = [durationHours, durationMinutes, durationSecondsPart];
    if (durationParts.some((part) => !/^\d*$/.test(part))) {
      setError("Thời lượng chỉ được nhập số nguyên không âm.");
      return;
    }
    const hours = Number(durationHours || 0);
    const minutes = Number(durationMinutes || 0);
    const seconds = Number(durationSecondsPart || 0);
    if (minutes > 59 || seconds > 59) {
      setError("Phút và giây phải từ 0 đến 59.");
      return;
    }
    const durationTotal = hours * 3600 + minutes * 60 + seconds;
    if (durationTotal > 86400) {
      setError("Thời lượng tối đa là 24 giờ.");
      return;
    }
    const durationSeconds = durationTotal > 0 ? durationTotal : null;
    if (textContent.length > 100000) {
      setError("Nội dung Markdown tối đa 100.000 ký tự.");
      return;
    }
    setError("");
    try {
      const attachPending = async (lessonId: string) => {
        const failures: string[] = [];
        for (let offset = 0; offset < pendingResources.length; offset += 20) {
          const batch = pendingResources.slice(offset, offset + 20);
          const result = await actions.addResources.mutateAsync({
            lessonId,
            keys: batch.map((item) => item.key),
          });
          const added = result.items.flatMap((item) => (item.resource ? [item.resource] : []));
          const addedKeys = new Set(added.map((item) => item.objectKey));
          setResources((current) => [...current, ...added]);
          setPendingResources((current) => current.filter((item) => !addedKeys.has(item.key)));
          failures.push(
            ...result.items
              .filter((item) => !item.resource)
              .map(
                (item) =>
                  batch.find((file) => file.key === item.objectKey)?.fileName ??
                  "Tệp không xác định",
              ),
          );
        }
        if (failures.length)
          setError(`Chưa thể gắn các tệp: ${failures.join(", ")}. Vui lòng thử lưu lại.`);
        return failures.length === 0;
      };
      const originalFreePreview = lesson?.isFreePreview ?? false;
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        textContent: textContent || null,
        videoKeys: videos.map((video) => video.key),
        durationSeconds,
        isFreePreview: originalFreePreview,
      };
      let id = currentLessonId;
      let wasFreePreview = originalFreePreview;
      if (id) {
        if (pendingResources.length && !(await attachPending(id))) return;
        await actions.update.mutateAsync({ id, payload });
      } else {
        const created = await actions.create.mutateAsync(payload);
        id = created.id;
        setSavedLessonId(created.id);
        saveLessonDraft(draftKey, { ...storedSnapshot, savedLessonId: created.id });
        hasStoredDraft.current = true;
        wasFreePreview = false;
      }
      if (isFreePreview !== wasFreePreview)
        await actions.setFreePreview.mutateAsync({ id, value: isFreePreview });
      for (const resourceId of removedResources) {
        await actions.removeResource.mutateAsync({ lessonId: id, resourceId });
        setRemovedResources((current) => current.filter((value) => value !== resourceId));
        setResources((current) => current.filter((resource) => resource.id !== resourceId));
      }
      if (!currentLessonId && pendingResources.length && !(await attachPending(id))) return;
      clearLessonDraft(draftKey);
      hasStoredDraft.current = false;
      onSaved();
      onClose();
    } catch (saveError) {
      setError(courseErrorMessage(saveError));
      onRefresh();
    }
  };

  const busy = pending || mediaRestoring;
  return (
    <Modal
      open
      wide
      title={lesson ? "Chỉnh sửa bài học" : "Thêm bài học"}
      description={lesson ? "Cập nhật nội dung bài học." : "Tạo bài học mới trong học phần."}
      busy={busy}
      onClose={requestClose}
      footer={
        <>
          <Button onClick={requestClose} disabled={busy}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" form="course-lesson-form" disabled={busy}>
            {busy ? "Đang lưu..." : "Lưu bài học"}
          </Button>
        </>
      }
    >
      <form
        id="course-lesson-form"
        className={styles.form}
        onSubmit={(event) => void submit(event)}
      >
        {mediaRestoring && (
          <p className={styles.state} role="status">
            Đang xác minh tệp trong bản nháp...
          </p>
        )}
        {mediaRestoreError && (
          <p className={styles.error} role="alert">
            Không thể xác minh tệp đã lưu trong bản nháp.{" "}
            <button
              type="button"
              onClick={() => {
                setMediaRestoreError(false);
                setMediaRestoring(true);
                setMediaRestoreAttempt((value) => value + 1);
              }}
            >
              Kiểm tra lại
            </button>
          </p>
        )}
        <label>
          Tiêu đề bài học *
          <input
            autoFocus
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Mô tả
          <textarea
            value={description}
            maxLength={2000}
            rows={2}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <LessonDurationField
          hours={durationHours}
          minutes={durationMinutes}
          seconds={durationSecondsPart}
          onHoursChange={setDurationHours}
          onMinutesChange={setDurationMinutes}
          onSecondsChange={setDurationSecondsPart}
        />
        <LessonTextEditor value={textContent} onChange={setTextContent} disabled={busy} />
        <label className={styles.freePreviewToggle}>
          <input
            type="checkbox"
            checked={isFreePreview}
            onChange={(event) => setIsFreePreview(event.target.checked)}
          />{" "}
          Cho phép xem trước miễn phí
        </label>
        <LessonMediaEditor
          videos={videos}
          onVideosChange={setVideos}
          resources={resources}
          pendingResources={pendingResources}
          onPendingResourcesChange={setPendingResources}
          removedResourceIds={removedResources}
          onToggleResourceRemoval={(resourceId) =>
            setRemovedResources((current) =>
              current.includes(resourceId)
                ? current.filter((id) => id !== resourceId)
                : [...current, resourceId],
            )
          }
          disabled={saving}
          onError={setError}
          onBusyChange={(kind, uploading) =>
            setMediaBusy((state) => ({ ...state, [kind]: uploading }))
          }
          isPersisted={Boolean(currentLessonId)}
          onPreviewSavedMedia={() => currentLessonId && onPreviewLesson(currentLessonId)}
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

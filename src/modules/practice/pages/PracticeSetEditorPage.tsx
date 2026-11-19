import { useCallback, useEffect, useState } from "react";
import { useBeforeUnload, useBlocker, useNavigate, useParams } from "react-router-dom";
import { Button, ButtonLink, ConfirmDialog } from "@/modules/admin";
import { useCurrentUser } from "@/modules/auth";
import {
  practiceSetsApi,
  type PracticeMetadata,
  type PracticeQuestionSelection,
  type PracticeStatus,
} from "../api/practice-sets.api";
import { PracticeMetadataForm } from "../components/PracticeMetadataForm";
import { PracticeQuestionPicker } from "../components/PracticeQuestionPicker";
import { PracticeState } from "../components/PracticeState";
import { usePracticeMutation, usePracticeSet } from "../hooks/usePracticeSets";
import { canManageSet, isPracticeConflict, statusLabels } from "../utils/practice";
import styles from "../components/Practice.module.css";

export function PracticeSetEditorPage() {
  const { id } = useParams();
  return <PracticeSetEditor key={id ?? "create"} />;
}

function PracticeSetEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const query = usePracticeSet(id);
  const [unpublishing, setUnpublishing] = useState(false);
  const [publishBlocked, setPublishBlocked] = useState(true);
  const [message, setMessage] = useState("");
  const [metadataDirty, setMetadataDirty] = useState(false);
  const [questionsDirty, setQuestionsDirty] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [draftQuestions, setDraftQuestions] = useState<{ part: string; ids: string[] }>({
    part: "Part5",
    ids: [],
  });
  const selectDraftQuestions = useCallback((part: string, ids: string[]) => {
    setDraftQuestions({ part, ids });
  }, []);
  const dirty = metadataDirty || questionsDirty;
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [dirty],
    ),
  );
  const save = usePracticeMutation(
    async (
      data: PracticeMetadata & {
        expectedUpdatedAt?: string;
        questionIds?: string[];
        status?: "Draft" | "Active";
      },
    ) => {
      const result = id
        ? await practiceSetsApi.update(id, data)
        : await practiceSetsApi.create(data);
      return result;
    },
  );
  const items = usePracticeMutation((selection: PracticeQuestionSelection) =>
    practiceSetsApi.items(id!, selection),
  );
  const status = usePracticeMutation((next: PracticeStatus) => practiceSetsApi.status(id!, next));
  const busy = save.isPending || items.isPending || status.isPending;
  const blocker = useBlocker(dirty || busy);
  // Refresh the blocker's predicate before navigating after a successful create.
  useEffect(() => {
    if (createdId && !dirty && !busy)
      navigate(`/teacher/practice-sets/${createdId}/edit`, { replace: true });
  }, [createdId, dirty, busy, navigate]);
  const set = query.data;
  if (id && !query.data && (query.isPending || query.isError))
    return (
      <PracticeState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  if (set && !canManageSet(user, set))
    return <p role="alert">Bạn chỉ được quản lý bộ luyện tập do chính mình tạo.</p>;
  const resetFeedback = () => {
    setMessage("");
    save.reset();
    items.reset();
    status.reset();
  };
  const changeStatus = (next: PracticeStatus) => {
    resetFeedback();
    status.mutate(next, { onSuccess: () => setMessage("Đã cập nhật trạng thái.") });
  };
  return (
    <div className={styles.page}>
      <ConfirmDialog
        pending={busy}
        open={blocker.state === "blocked"}
        title="Rời trang và bỏ thay đổi?"
        description="Thông tin hoặc danh sách câu hỏi chưa lưu sẽ bị bỏ."
        confirmLabel="Bỏ thay đổi và rời trang"
        onClose={() => blocker.state === "blocked" && blocker.reset()}
        onConfirm={() => blocker.state === "blocked" && blocker.proceed()}
      />
      <ConfirmDialog
        pending={busy}
        open={unpublishing}
        title="Ngừng xuất bản bộ luyện tập?"
        description="Học viên sẽ không thể mở bộ luyện tập này."
        confirmLabel="Ngừng xuất bản"
        onClose={() => setUnpublishing(false)}
        onConfirm={() => {
          setUnpublishing(false);
          changeStatus("Archived");
        }}
      />
      <ButtonLink to="/teacher/practice-sets">← Bộ luyện tập của tôi</ButtonLink>
      <h1>{id ? "Chỉnh sửa bộ luyện tập" : "Tạo bộ luyện tập"}</h1>
      {set && (
        <div className={styles.actions}>
          <strong>{statusLabels[set.status]}</strong>
          {set.status !== "Active" && (
            <Button
              variant="primary"
              disabled={busy || dirty || publishBlocked}
              onClick={() => changeStatus("Active")}
            >
              Xuất bản dữ liệu đã lưu
            </Button>
          )}
          {set.status === "Active" && (
            <Button disabled={busy} onClick={() => setUnpublishing(true)}>
              Ngừng xuất bản
            </Button>
          )}
        </div>
      )}
      {set?.status === "Active" && (
        <p>Có thể sửa bộ đang xuất bản. Nội dung mới phải hợp lệ và mọi câu hỏi phải Active.</p>
      )}
      <PracticeState error={save.error || items.error || status.error} />
      {message && <p role="status">{message}</p>}
      <PracticeMetadataForm
        key={id ?? "create"}
        set={set}
        busy={busy}
        onDirtyChange={setMetadataDirty}
        publishBlocked={publishBlocked}
        onSave={async (values, publish) => {
          resetFeedback();
          const result = await save.mutateAsync(
            id
              ? values
              : {
                  ...values,
                  questionIds: draftQuestions.part === values.part ? draftQuestions.ids : [],
                  status: publish ? "Active" : "Draft",
                },
          );
          if (!id) {
            setQuestionsDirty(false);
            setCreatedId(result.id);
          }
          setMessage(publish ? "Đã xuất bản bộ luyện tập." : "Đã lưu thông tin.");
          return result;
        }}
      >
        {!id
          ? (part) => (
              <PracticeQuestionPicker
                key={part}
                set={{ id: "", part, items: [] }}
                serverUpdatedAt={0}
                busy={busy}
                unsaved
                onSelectionChange={selectDraftQuestions}
                onDirtyChange={setQuestionsDirty}
                onPublishBlockedChange={setPublishBlocked}
              />
            )
          : undefined}
      </PracticeMetadataForm>
      {set && (
        <PracticeQuestionPicker
          key={`${set.id}-${set.part}`}
          set={set}
          serverUpdatedAt={query.dataUpdatedAt}
          busy={busy}
          onDirtyChange={setQuestionsDirty}
          onPublishBlockedChange={setPublishBlocked}
          onSave={async (ids, expectedIds) => {
            resetFeedback();
            try {
              const result = await items.mutateAsync({
                questionIds: ids,
                expectedQuestionIds: expectedIds,
              });
              setMessage("Đã lưu danh sách câu hỏi.");
              return result;
            } catch (error) {
              if (isPracticeConflict(error)) await query.refetch();
              throw error;
            }
          }}
        />
      )}
    </div>
  );
}

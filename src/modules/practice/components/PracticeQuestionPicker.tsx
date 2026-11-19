import { useQuery } from "@tanstack/react-query";
import { useEffect, useReducer, useState } from "react";
import {
  Button,
  ConfirmDialog,
  Drawer,
  examBankApi,
  Pagination,
  PART_NAMES,
  QuestionPreview,
} from "@/modules/admin";
import { practiceSetsApi, type PracticeSetDetail } from "../api/practice-sets.api";
import { useCurrentUser } from "@/modules/auth";
import { useDebouncedValue } from "../hooks/usePracticeFilters";
import { practiceKeys } from "../hooks/usePracticeSets";
import { PracticeState } from "./PracticeState";
import { PracticeQuestionCard, type PracticeQuestionSummary } from "./PracticeQuestionCard";
import { sameIds, selectionReducer, selectionState } from "../utils/pickerSelection";
import styles from "./Practice.module.css";

export function PracticeQuestionPicker({
  set,
  serverUpdatedAt,
  busy,
  onSave,
  onDirtyChange,
  onPublishBlockedChange,
  unsaved = false,
  onSelectionChange,
}: {
  set: Pick<PracticeSetDetail, "id" | "part" | "items">;
  serverUpdatedAt: number;
  busy: boolean;
  onSave?: (ids: string[], expectedIds: string[]) => Promise<PracticeSetDetail>;
  onDirtyChange: (dirty: boolean) => void;
  onPublishBlockedChange: (blocked: boolean) => void;
  unsaved?: boolean;
  onSelectionChange?: (part: string, ids: string[]) => void;
}) {
  const user = useCurrentUser();
  const [selectedPage, setSelectedPage] = useState(1);
  const serverIds = set.items.map((item) => item.questionId);
  const [selection, dispatch] = useReducer(
    selectionReducer,
    { ids: serverIds, at: serverUpdatedAt },
    ({ ids, at }) => selectionState(ids, at),
  );
  if (!sameIds(serverIds, selection.observed) || serverUpdatedAt !== selection.observedAt)
    dispatch({ type: "server", ids: serverIds, observedAt: serverUpdatedAt });
  const { ids } = selection;
  const setIds = (update: string[] | ((current: string[]) => string[])) =>
    dispatch({ type: "edit", ids: typeof update === "function" ? update(ids) : update });
  const [reloading, setReloading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [pickedQuestions, setPickedQuestions] = useState<Record<string, PracticeQuestionSummary>>(
    {},
  );
  const dirty = !sameIds(ids, selection.saved);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    onSelectionChange?.(set.part, ids);
  }, [ids, set.part, onSelectionChange]);
  const serverChanged = !sameIds(selection.server, selection.saved);
  const bank = useQuery({
    queryKey: ["exam-bank", "practice-picker", set.part, page, debouncedSearch],
    queryFn: ({ signal }) =>
      examBankApi.questions(
        {
          part: set.part,
          page,
          pageSize: 20,
          search: debouncedSearch || undefined,
          status: "Active",
        },
        signal,
      ),
  });
  const content = useQuery({
    queryKey: [...practiceKeys.all, "editor-content", set.id, user?.id, user?.role],
    enabled: !unsaved,
    queryFn: ({ signal }) => practiceSetsApi.content(set.id, signal),
  });
  const questions = new Map<string, PracticeQuestionSummary>(Object.entries(pickedQuestions));
  bank.data?.items.forEach((q) => questions.set(q.id, q));
  // Saved content is authoritative: an older Active bank page must not hide an archive.
  content.data?.parts.forEach((part) =>
    [...part.standaloneQuestions, ...part.passages.flatMap((p) => p.questions)].forEach((q) =>
      questions.set(q.id, q),
    ),
  );
  const publishBlocked =
    (!unsaved && (!content.data || content.isError)) ||
    ids.length === 0 ||
    ids.some((id) => questions.get(id)?.status !== "Active");
  useEffect(() => {
    onPublishBlockedChange(publishBlocked);
  }, [publishBlocked, onPublishBlockedChange]);
  const selectedPages = Math.max(1, Math.ceil(ids.length / 20));
  const visiblePage = Math.min(selectedPage, selectedPages);
  const move = (index: number, direction: number) =>
    setIds((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  return (
    <section className={styles.panel}>
      <h2>Câu hỏi và thứ tự</h2>
      <p>
        Chọn câu hỏi Active từ ngân hàng của {set.part.replace("Part", "Part ")}. Tối đa 2.000 câu.
      </p>
      {serverChanged && (
        <div role="status">
          <p>Danh sách trên máy chủ đã thay đổi. Các thay đổi chưa lưu của bạn được giữ nguyên.</p>
          <Button disabled={busy} onClick={() => setReloading(true)}>
            Tải danh sách từ máy chủ
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={reloading}
        title="Tải lại danh sách câu hỏi?"
        description="Các thay đổi chưa lưu sẽ bị bỏ để dùng danh sách mới nhất từ máy chủ."
        confirmLabel="Bỏ thay đổi và tải lại"
        pending={busy}
        onClose={() => setReloading(false)}
        onConfirm={() => {
          dispatch({ type: "reload" });
          setReloading(false);
        }}
      />
      {content.isError && (
        <PracticeState error={content.error} retry={() => void content.refetch()} />
      )}
      <fieldset disabled={busy}>
        <legend>Danh sách đã chọn ({ids.length})</legend>
        <ol className={styles.selected}>
          {ids.slice((visiblePage - 1) * 20, visiblePage * 20).map((id, offset) => {
            const index = (visiblePage - 1) * 20 + offset;
            return (
              <li key={id}>
                <PracticeQuestionCard
                  question={questions.get(id)}
                  part={set.part}
                  selected
                  number={index + 1}
                  onClick={() => setPreview(id)}
                />
                <div className={styles.actions}>
                  <Button
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Đưa câu ${index + 1} lên`}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    disabled={index === ids.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Đưa câu ${index + 1} xuống`}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    aria-label={`Bỏ câu ở vị trí ${index + 1} khỏi bộ luyện tập`}
                    onClick={() => setIds(ids.filter((value) => value !== id))}
                  >
                    Bỏ
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
        <Pagination
          page={visiblePage}
          pages={selectedPages}
          total={ids.length}
          pageSize={20}
          onChange={setSelectedPage}
        />
        {publishBlocked && (
          <p role="status">Chỉ xuất bản khi đã tải đủ nội dung và mọi câu hỏi còn hoạt động.</p>
        )}
        {ids.length === 0 && <PracticeState empty="Chưa chọn câu hỏi." />}
        {onSave && (
          <Button
            variant="primary"
            disabled={!dirty || serverChanged}
            onClick={async () => {
              dispatch({ type: "save" });
              try {
                const result = await onSave([...ids], [...selection.saved]);
                dispatch({ type: "saved", ids: result.items.map((item) => item.questionId) });
              } catch {
                dispatch({ type: "failed" });
                /* The page displays the mutation error. */
              }
            }}
          >
            Lưu danh sách câu hỏi
          </Button>
        )}
        {dirty && <p role="status">Danh sách chưa lưu.{!unsaved && " Lưu trước khi xuất bản."}</p>}
        <label className={styles.search}>
          Tìm trong ngân hàng
          <input
            value={search}
            maxLength={200}
            onKeyDown={(event) => {
              // Searching inside the creation form must not submit/save the set.
              if (event.key === "Enter") event.preventDefault();
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <PracticeState
          pending={bank.isPending}
          error={bank.error}
          retry={() => void bank.refetch()}
        />
        {bank.data && (
          <>
            {bank.data.items.length === 0 && (
              <PracticeState empty="Không tìm thấy câu hỏi Active phù hợp." />
            )}
            <ul className={styles.bank}>
              {bank.data.items.map((q, index) => (
                <li key={q.id}>
                  <PracticeQuestionCard
                    question={q}
                    part={set.part}
                    number={(page - 1) * 20 + index + 1}
                    onClick={() => setPreview(q.id)}
                  />
                  <Button
                    aria-label={`Thêm câu ${q.questionNumber ?? (page - 1) * 20 + index + 1} vào bộ luyện tập`}
                    disabled={ids.includes(q.id) || ids.length >= 2000}
                    onClick={() => {
                      setPickedQuestions((current) => ({ ...current, [q.id]: q }));
                      setIds((current) => [...current, q.id]);
                    }}
                  >
                    {ids.includes(q.id) ? "Đã chọn" : "Thêm"}
                  </Button>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pages={bank.data.totalPages}
              total={bank.data.totalCount}
              pageSize={20}
              onChange={setPage}
            />
          </>
        )}
      </fieldset>
      <Drawer
        open={Boolean(preview)}
        size="lg"
        title={`Chi tiết câu hỏi · ${set.part.replace("Part", "Part ")}`}
        subtitle={PART_NAMES[Number(set.part.replace("Part", "")) - 1]}
        onClose={() => setPreview(null)}
      >
        {preview && (
          <QuestionPreview
            key={preview}
            id={preview}
            part={Number(set.part.replace("Part", ""))}
            onSelect={setPreview}
          />
        )}
      </Drawer>
    </section>
  );
}

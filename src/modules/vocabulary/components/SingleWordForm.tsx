import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, BookmarkCheck, Check, Search, Sparkles } from "lucide-react";

import { Select } from "@/shared/components/Select";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  Skeleton,
  TextArea,
  TextInput,
  toast,
} from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import errorMascot from "@/assets/mascot/oy2-error.png";

import { useCreateCustomWord } from "../hooks/useCreateCustomWord";
import { useSaveWord } from "../hooks/useSaveWord";
import { useWordLookup } from "../hooks/useWordLookup";
import type { FolderDto, LookupField, PartOfSpeech } from "../types/vocabulary.types";
import { PHRASE_TYPE_LABELS, toPartOfSpeech } from "../utils/enrichment-format";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { POS_OPTIONS } from "../utils/vocabulary-format";
import { FolderPicker } from "./FolderPicker";
import styles from "./SingleWordForm.module.css";
import { SourceChip } from "./SourceChip";

const LOOKUP_DELAY_MS = 450;
const MAX_HEADWORD = 100;
const MAX_NOTE = 300;

interface Edits {
  /** Lookup text the edits belong to; edits of another word are ignored. */
  text: string;
  values: Partial<Record<LookupField, string>>;
}

interface SingleWordFormProps {
  folders: FolderDto[];
  folderId: string | null;
  onFolderChange: (folderId: string | null) => void;
}

/** "Một từ": type a word, the server fills it in (catalog → dictionary → translation → AI). */
export function SingleWordForm({ folders, folderId, onFolderChange }: SingleWordFormProps) {
  const [headword, setHeadword] = useState("");
  const [note, setNote] = useState("");
  const [edits, setEdits] = useState<Edits>({ text: "", values: {} });
  const debounced = useDebouncedValue(headword, LOOKUP_DELAY_MS);
  const lookup = useWordLookup(debounced);
  const saveOfficial = useSaveWord();
  const createCustom = useCreateCustomWord();
  const saving = saveOfficial.isPending || createCustom.isPending;
  const saveError = saveOfficial.error ?? createCustom.error;

  const data = lookup.data;
  const official = !!data?.officialWordId;
  const typing = headword.trim().replace(/\s+/g, " ") !== lookup.text;
  const ownEdits = edits.text === lookup.text ? edits.values : {};

  const valueOf = (field: LookupField): string => ownEdits[field] ?? data?.[field] ?? "";
  const sourceOf = (field: LookupField) =>
    ownEdits[field] === undefined ? data?.sources[field] : undefined;
  const edit = (field: LookupField, value: string) =>
    setEdits((current) => ({
      text: lookup.text,
      values: { ...(current.text === lookup.text ? current.values : {}), [field]: value },
    }));

  const reset = () => {
    setHeadword("");
    setNote("");
    setEdits({ text: "", values: {} });
    saveOfficial.reset();
    createCustom.reset();
  };

  const canSave =
    !!data && !typing && !data.existing && !saving && (official || !!valueOf("meaningVi").trim());

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || !canSave) return;
    const done = () => {
      toast(`Đã lưu ${data.headword || lookup.text}`, "green");
      reset();
    };
    const cleanNote = note.trim() || null;
    if (data.officialWordId) {
      saveOfficial.mutate(
        { wordId: data.officialWordId, folderId, note: cleanNote },
        { onSuccess: done },
      );
      return;
    }
    createCustom.mutate(
      {
        headword: (data.headword || lookup.text).trim(),
        phonetic: valueOf("phonetic").trim(),
        partOfSpeech: toPartOfSpeech(valueOf("partOfSpeech")),
        meaningVi: valueOf("meaningVi").trim(),
        definitionEn: valueOf("definitionEn").trim(),
        example: valueOf("example").trim(),
        exampleVi: valueOf("exampleVi").trim(),
        folderId,
        note: cleanNote,
      },
      { onSuccess: done },
    );
  };

  const labelled = (label: string, field: LookupField): ReactNode => (
    <span className={styles.label}>
      {label}
      <SourceChip source={sourceOf(field)} />
    </span>
  );

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextInput
        value={headword}
        maxLength={MAX_HEADWORD}
        lang="en"
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Từ hoặc cụm từ tiếng Anh"
        aria-label="Từ tiếng Anh"
        icon={<Search size={16} />}
        onChange={(event) => setHeadword(event.target.value)}
      />

      {lookup.text && lookup.loading && (
        <div className={styles.skeleton} aria-busy="true">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={64} />
        </div>
      )}

      {lookup.error !== null && (
        <ErrorState
          image={errorMascot}
          title={getVocabularyErrorMessage(lookup.error)}
          onRetry={lookup.retry}
        />
      )}

      {data && !lookup.loading && (
        <div className={styles.result} data-stale={typing || undefined}>
          <div className={styles.status}>
            <span className={styles.headword} lang="en">
              {data.headword || data.text}
            </span>
            {official && (
              <Badge tone="blue" icon={<Check size={12} />}>
                Bộ từ
              </Badge>
            )}
            {data.existing && (
              <Badge tone="green" icon={<BookmarkCheck size={12} />}>
                Đã có trong kho
              </Badge>
            )}
            {lookup.scanning && (
              <Badge tone="pink" icon={<Sparkles size={12} />} className={styles.scanning}>
                AI
              </Badge>
            )}
          </div>

          {data.kind === "phrase" && (data.phraseType || data.usage || data.explanation) && (
            <div className={styles.phrase}>
              {data.phraseType && (
                <Badge tone="pink">{PHRASE_TYPE_LABELS[data.phraseType] ?? data.phraseType}</Badge>
              )}
              {data.usage && (
                <p>
                  <span className={styles.term}>Cách dùng</span>
                  <span lang="en">{data.usage}</span>
                </p>
              )}
              {data.explanation && (
                <p>
                  <span className={styles.term}>Giải thích</span>
                  {data.explanation}
                </p>
              )}
              {data.literalMeaning && (
                <p className={styles.trap}>
                  <AlertTriangle size={14} />
                  <span className={styles.term}>Nghĩa đen</span>
                  {data.literalMeaning}
                </p>
              )}
            </div>
          )}

          <div className={styles.grid}>
            <Field
              label={labelled("Nghĩa", "meaningVi")}
              htmlFor="add-meaning"
              className={styles.wide}
            >
              <TextInput
                id="add-meaning"
                value={valueOf("meaningVi")}
                readOnly={official}
                maxLength={200}
                invalid={!official && !valueOf("meaningVi").trim() && !lookup.scanning}
                onChange={(event) => edit("meaningVi", event.target.value)}
              />
            </Field>
            <Field label={labelled("Phiên âm", "phonetic")} htmlFor="add-phonetic">
              <TextInput
                id="add-phonetic"
                value={valueOf("phonetic")}
                readOnly={official}
                onChange={(event) => edit("phonetic", event.target.value)}
              />
            </Field>
            <Field label={labelled("Từ loại", "partOfSpeech")} htmlFor="add-pos">
              <Select
                id="add-pos"
                value={toPartOfSpeech(valueOf("partOfSpeech"))}
                options={POS_OPTIONS}
                disabled={official}
                onChange={(value) => edit("partOfSpeech", value as PartOfSpeech)}
              />
            </Field>
            <Field
              label={labelled("Ví dụ", "example")}
              htmlFor="add-example"
              className={styles.wide}
            >
              <TextArea
                id="add-example"
                rows={2}
                lang="en"
                value={valueOf("example")}
                readOnly={official}
                maxLength={300}
                onChange={(event) => edit("example", event.target.value)}
              />
            </Field>
            <Field
              label={labelled("Dịch ví dụ", "exampleVi")}
              htmlFor="add-example-vi"
              className={styles.wide}
            >
              <TextArea
                id="add-example-vi"
                rows={2}
                value={valueOf("exampleVi")}
                readOnly={official}
                maxLength={300}
                onChange={(event) => edit("exampleVi", event.target.value)}
              />
            </Field>
            <Field label="Thư mục" htmlFor="add-folder" className={styles.wide}>
              <FolderPicker
                id="add-folder"
                folders={folders}
                value={folderId}
                onChange={onFolderChange}
                disabled={saving}
              />
            </Field>
            <Field
              label="Ghi chú"
              htmlFor="add-note"
              meta={`${note.length}/${MAX_NOTE}`}
              className={styles.wide}
            >
              <TextArea
                id="add-note"
                rows={2}
                value={note}
                maxLength={MAX_NOTE}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>

          {saveError && (
            <p className={styles.error} role="alert">
              {getVocabularyErrorMessage(saveError)}
            </p>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="outline" onClick={reset} disabled={saving || !headword}>
          Xoá
        </Button>
        <Button type="submit" variant="primary" disabled={!canSave}>
          {data?.existing ? "Đã có" : "Lưu từ"}
        </Button>
      </div>
    </form>
  );
}

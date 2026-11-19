import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { RotateCcw } from "lucide-react";

import { Select } from "@/shared/components/Select";
import { Button, Field, Kbd, Sheet, TextArea, TextInput } from "@/shared/components/ui";

import { useUpdateWordEdit } from "../hooks/useUpdateWordEdit";
import type {
  PartOfSpeech,
  PersonalField,
  SavedWordDto,
  WordDto,
  WordEditRequest,
} from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { getTzOffset } from "../utils/time";
import { formatPartOfSpeechName, POS_OPTIONS, posKey, posWire } from "../utils/vocabulary-format";
import styles from "./WordEditSheet.module.css";

const LIMITS = { phonetic: 80, meaningVi: 200, example: 300, exampleVi: 300, note: 1000 } as const;

interface EditFields {
  phonetic: string;
  partOfSpeech: PartOfSpeech;
  meaningVi: string;
  example: string;
  exampleVi: string;
  note: string;
}

type EditKey = keyof EditFields;
const KEYS: EditKey[] = ["phonetic", "partOfSpeech", "meaningVi", "example", "exampleVi", "note"];

const fieldsOf = (word: WordDto): EditFields => ({
  phonetic: word.phonetic ?? "",
  partOfSpeech: posKey(word.partOfSpeech),
  meaningVi: word.meaningVi ?? "",
  example: word.example ?? "",
  exampleVi: word.exampleVi ?? "",
  note: word.note ?? "",
});

interface WordEditSheetProps {
  /** Word as the learner currently sees it (overlay applied). */
  word: WordDto;
  onClose: () => void;
  onSaved: (saved: SavedWordDto) => void;
}

/**
 * The learner's own version of a word: phonetic, part of speech, meaning, example, translation
 * and note. Shared data never changes. Ctrl+Enter saves; keys never reach the page behind.
 */
export function WordEditSheet({ word, onClose, onSaved }: WordEditSheetProps) {
  const [initial] = useState(() => fieldsOf(word));
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const meaningRef = useRef<HTMLInputElement>(null);
  const mutation = useUpdateWordEdit();

  const overridden = new Set<PersonalField>(word.original ? (word.personal ?? []) : []);
  const originalOf = (field: PersonalField): string | null => {
    if (!overridden.has(field) || !word.original) return null;
    const value = word.original[field];
    if (field === "partOfSpeech") return formatPartOfSpeechName(value);
    return value?.trim() ? value : "—";
  };
  const meaningError = touched && !form.meaningVi.trim() ? "Bắt buộc" : null;

  // The dialog focuses its first control when it opens; move to the meaning afterwards.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => meaningRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, []);

  const set = <K extends EditKey>(key: K, value: EditFields[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const send = (body: WordEditRequest) =>
    mutation.mutate({ wordId: word.id, body }, { onSuccess: onSaved });

  const save = () => {
    setTouched(true);
    if (mutation.isPending || !form.meaningVi.trim()) return;
    const changed = KEYS.filter((key) => form[key].trim() !== initial[key].trim());
    if (changed.length === 0) {
      onClose();
      return;
    }
    const body: WordEditRequest = { tzOffset: getTzOffset() };
    for (const key of changed) {
      if (key === "partOfSpeech") body.partOfSpeech = posWire(form.partOfSpeech);
      else body[key] = form[key].trim();
    }
    send(body);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      save();
    }
  };

  const original = (field: PersonalField) => {
    const value = originalOf(field);
    return value ? <span className={styles.original}>Gốc: {value}</span> : null;
  };

  return (
    <Sheet
      open
      title={word.headword}
      busy={mutation.isPending}
      containKeys
      onKeyDown={handleKeyDown}
      onClose={onClose}
      footer={
        <>
          {overridden.size > 0 && (
            <Button
              variant="ghost"
              className={styles.reset}
              icon={<RotateCcw size={16} />}
              disabled={mutation.isPending}
              onClick={() => send({ reset: true, tzOffset: getTzOffset() })}
            >
              Về bản gốc
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="submit"
            form="word-edit-form"
            variant="primary"
            disabled={mutation.isPending}
            trailing={<Kbd inverted>Ctrl ↵</Kbd>}
          >
            Lưu
          </Button>
        </>
      }
    >
      <form id="word-edit-form" className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <Field label="Phiên âm" htmlFor="word-edit-phonetic">
            <TextInput
              id="word-edit-phonetic"
              lang="en"
              value={form.phonetic}
              maxLength={LIMITS.phonetic}
              autoComplete="off"
              onChange={(event) => set("phonetic", event.target.value)}
            />
            {original("phonetic")}
          </Field>
          <Field label="Từ loại" htmlFor="word-edit-pos">
            <Select
              id="word-edit-pos"
              value={form.partOfSpeech}
              options={POS_OPTIONS}
              onChange={(value) => set("partOfSpeech", value as PartOfSpeech)}
            />
            {original("partOfSpeech")}
          </Field>
        </div>
        <Field
          label="Nghĩa"
          htmlFor="word-edit-meaning"
          error={meaningError}
          meta={`${form.meaningVi.length}/${LIMITS.meaningVi}`}
        >
          <TextInput
            ref={meaningRef}
            id="word-edit-meaning"
            value={form.meaningVi}
            maxLength={LIMITS.meaningVi}
            invalid={!!meaningError}
            autoComplete="off"
            onChange={(event) => set("meaningVi", event.target.value)}
          />
          {original("meaningVi")}
        </Field>
        <Field label="Ví dụ" htmlFor="word-edit-example">
          <TextArea
            id="word-edit-example"
            lang="en"
            rows={2}
            value={form.example}
            maxLength={LIMITS.example}
            onChange={(event) => set("example", event.target.value)}
          />
          {original("example")}
        </Field>
        <Field label="Dịch ví dụ" htmlFor="word-edit-example-vi">
          <TextArea
            id="word-edit-example-vi"
            rows={2}
            value={form.exampleVi}
            maxLength={LIMITS.exampleVi}
            onChange={(event) => set("exampleVi", event.target.value)}
          />
          {original("exampleVi")}
        </Field>
        <Field label="Ghi chú" htmlFor="word-edit-note" meta={`${form.note.length}/${LIMITS.note}`}>
          <TextArea
            id="word-edit-note"
            rows={3}
            value={form.note}
            maxLength={LIMITS.note}
            onChange={(event) => set("note", event.target.value)}
          />
        </Field>
        {mutation.isError && (
          <p className={styles.error} role="alert">
            {getVocabularyErrorMessage(mutation.error)}
          </p>
        )}
      </form>
    </Sheet>
  );
}

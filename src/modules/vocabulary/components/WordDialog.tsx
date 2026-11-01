import { useState, type FormEvent } from "react";

import { Select, type SelectOption } from "@/shared/components/Select";
import { Button, Field, Modal, TextArea, TextInput } from "@/shared/components/ui";

import { useCreateCustomWord } from "../hooks/useCreateCustomWord";
import { useUpdateSavedWord } from "../hooks/useUpdateSavedWord";
import type {
  CustomWordFields,
  FolderDto,
  PartOfSpeech,
  SavedWordDto,
} from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { POS_OPTIONS } from "../utils/vocabulary-format";
import styles from "./WordDialog.module.css";

const UNFILED = "unfiled";
const LIMITS = { headword: 80, meaningVi: 200, example: 300, note: 300 } as const;

interface WordDialogProps {
  /** Entry to edit; omit to add a custom word. */
  savedWord?: SavedWordDto;
  folders: FolderDto[];
  /** Folder preselected for a new word. */
  defaultFolderId?: string | null;
  onClose: () => void;
  onSaved?: (saved: SavedWordDto) => void;
}

const emptyFields = (): CustomWordFields => ({
  headword: "",
  phonetic: "",
  partOfSpeech: "noun",
  meaningVi: "",
  definitionEn: "",
  example: "",
  exampleVi: "",
});

/**
 * Add a custom word, edit a custom word, or edit folder/note of an official word.
 * Mount when open (key by entry id) so the form starts from the entry.
 */
export function WordDialog({
  savedWord,
  folders,
  defaultFolderId,
  onClose,
  onSaved,
}: WordDialogProps) {
  const editingOfficial = !!savedWord && !savedWord.isCustom;
  const [fields, setFields] = useState<CustomWordFields>(() =>
    savedWord
      ? {
          headword: savedWord.word.headword,
          phonetic: savedWord.word.phonetic,
          partOfSpeech: savedWord.word.partOfSpeech,
          meaningVi: savedWord.word.meaningVi,
          definitionEn: savedWord.word.definitionEn,
          example: savedWord.word.example,
          exampleVi: savedWord.word.exampleVi,
        }
      : emptyFields(),
  );
  const [folderId, setFolderId] = useState<string>(
    (savedWord ? savedWord.folderId : defaultFolderId) ?? UNFILED,
  );
  const [note, setNote] = useState(savedWord?.note ?? "");
  const [touched, setTouched] = useState(false);

  const create = useCreateCustomWord();
  const update = useUpdateSavedWord();
  const mutation = savedWord ? update : create;

  const set = <K extends keyof CustomWordFields>(key: K, value: CustomWordFields[K]) =>
    setFields((current) => ({ ...current, [key]: value }));

  const headwordError = !editingOfficial && touched && !fields.headword.trim() ? "Bắt buộc" : null;
  const meaningError = !editingOfficial && touched && !fields.meaningVi.trim() ? "Bắt buộc" : null;

  const folderOptions: SelectOption[] = [
    { value: UNFILED, label: "Chưa phân loại" },
    ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
  ];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (mutation.isPending) return;
    if (!editingOfficial && (!fields.headword.trim() || !fields.meaningVi.trim())) return;

    const trimmed: CustomWordFields = {
      headword: fields.headword.trim(),
      phonetic: fields.phonetic.trim(),
      partOfSpeech: fields.partOfSpeech,
      meaningVi: fields.meaningVi.trim(),
      definitionEn: fields.definitionEn.trim(),
      example: fields.example.trim(),
      exampleVi: fields.exampleVi.trim(),
    };
    const target = folderId === UNFILED ? null : folderId;
    const cleanNote = note.trim() || null;
    const done = (saved: SavedWordDto) => {
      onSaved?.(saved);
      onClose();
    };

    if (savedWord) {
      update.mutate(
        {
          savedWordId: savedWord.id,
          body: {
            folderId: target,
            note: cleanNote,
            ...(savedWord.isCustom ? { custom: trimmed } : {}),
          },
        },
        { onSuccess: done },
      );
    } else {
      create.mutate({ ...trimmed, folderId: target, note: cleanNote }, { onSuccess: done });
    }
  };

  return (
    <Modal
      open
      wide={!editingOfficial}
      title={savedWord ? (editingOfficial ? savedWord.word.headword : "Sửa từ") : "Thêm từ"}
      busy={mutation.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" form="word-form" variant="primary" disabled={mutation.isPending}>
            {savedWord ? "Lưu" : "Thêm"}
          </Button>
        </>
      }
    >
      <form id="word-form" className={styles.form} onSubmit={submit} noValidate>
        {!editingOfficial && (
          <>
            <Field label="Từ" htmlFor="word-headword" error={headwordError}>
              <TextInput
                id="word-headword"
                lang="en"
                value={fields.headword}
                maxLength={LIMITS.headword}
                invalid={!!headwordError}
                autoFocus
                autoComplete="off"
                onChange={(event) => set("headword", event.target.value)}
              />
            </Field>
            <Field label="Phiên âm" htmlFor="word-phonetic">
              <TextInput
                id="word-phonetic"
                value={fields.phonetic}
                autoComplete="off"
                onChange={(event) => set("phonetic", event.target.value)}
              />
            </Field>
            <Field label="Từ loại" htmlFor="word-pos">
              <Select
                id="word-pos"
                value={fields.partOfSpeech}
                options={POS_OPTIONS}
                onChange={(value) => set("partOfSpeech", value as PartOfSpeech)}
              />
            </Field>
            <Field label="Nghĩa" htmlFor="word-meaning" error={meaningError}>
              <TextInput
                id="word-meaning"
                value={fields.meaningVi}
                maxLength={LIMITS.meaningVi}
                invalid={!!meaningError}
                autoComplete="off"
                onChange={(event) => set("meaningVi", event.target.value)}
              />
            </Field>
            <Field label="Định nghĩa (EN)" htmlFor="word-definition" className={styles.wide}>
              <TextInput
                id="word-definition"
                lang="en"
                value={fields.definitionEn}
                autoComplete="off"
                onChange={(event) => set("definitionEn", event.target.value)}
              />
            </Field>
            <Field label="Ví dụ" htmlFor="word-example" className={styles.wide}>
              <TextArea
                id="word-example"
                lang="en"
                rows={2}
                value={fields.example}
                maxLength={LIMITS.example}
                onChange={(event) => set("example", event.target.value)}
              />
            </Field>
            <Field label="Dịch ví dụ" htmlFor="word-example-vi" className={styles.wide}>
              <TextArea
                id="word-example-vi"
                rows={2}
                value={fields.exampleVi}
                maxLength={LIMITS.example}
                onChange={(event) => set("exampleVi", event.target.value)}
              />
            </Field>
          </>
        )}
        <Field label="Thư mục" htmlFor="word-folder">
          <Select
            id="word-folder"
            value={folderId}
            options={folderOptions}
            onChange={(value) => setFolderId(value)}
          />
        </Field>
        <Field
          label="Ghi chú"
          htmlFor="word-note"
          meta={`${note.length}/${LIMITS.note}`}
          className={styles.wide}
        >
          <TextArea
            id="word-note"
            rows={2}
            value={note}
            maxLength={LIMITS.note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {mutation.isError && (
          <p className={styles.error} role="alert">
            {getVocabularyErrorMessage(mutation.error)}
          </p>
        )}
      </form>
    </Modal>
  );
}

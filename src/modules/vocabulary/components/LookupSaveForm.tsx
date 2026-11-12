import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { vocabularyApi } from "../api/vocabulary.api";
import { useInvalidateLibrary } from "../hooks/useInvalidateLibrary";
import { useLibrary } from "../hooks/useLibrary";
import type { SelectionLookupDto } from "../types/dictionary.types";
import { getErrorStatus } from "../utils/vocabulary-errors";
import { FolderPicker } from "./FolderPicker";
import styles from "./LookupPopover.module.css";

const optional = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

interface LookupSaveFormProps {
  text: string;
  /** Sentence the text was selected in: used as the example when the lookup has none. */
  context?: string;
  result: SelectionLookupDto;
  signedIn: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Folder choice + save of a looked-up text into "Từ vựng của tôi" (official word when the catalog has it, otherwise
 * a custom word). Guests see a sign-in link, like Studychill's folder picker.
 */
export function LookupSaveForm({
  text,
  context = "",
  result,
  signedIn,
  onSaved,
  onCancel,
}: LookupSaveFormProps) {
  const location = useLocation();
  const library = useLibrary(signedIn);
  const invalidateLibrary = useInvalidateLibrary();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!signedIn) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <div className={styles.savePanel}>
        <div className={styles.saveError}>Bạn cần đăng nhập để lưu từ vào sổ.</div>
        <div className={styles.saveActions}>
          <button type="button" className={styles.ghostButton} onClick={onCancel}>
            Huỷ
          </button>
          <Link className={styles.saveLink} to={`/login?next=${next}`}>
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await vocabularyApi.importWords({
        items: [
          {
            headword: text.trim(),
            meaningVi: optional(result.meaning),
            phonetic: optional(result.phonetic),
            partOfSpeech: optional(result.partOfSpeech?.toLowerCase()),
            example: optional(result.example) ?? optional(context),
            exampleVi: optional(result.exampleVi),
          },
        ],
        folderId,
        createFoldersFromCategories: false,
      });
      await invalidateLibrary();
      onSaved();
    } catch (e) {
      const status = getErrorStatus(e);
      setError(
        status === 401 || status === 403
          ? "Bạn cần đăng nhập để lưu từ vào sổ."
          : "Chưa lưu được, thử lại giúp mình nhé.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.savePanel}>
      <div className={styles.saveLabel}>Lưu vào đâu?</div>
      {library.isPending ? (
        <div className={styles.status}>
          <Loader2 size={12} className={styles.spin} /> Đang tải thư mục…
        </div>
      ) : (
        <FolderPicker
          folders={library.data?.folders ?? []}
          value={folderId}
          onChange={setFolderId}
          disabled={saving}
        />
      )}
      {error ? (
        <div className={styles.saveError} role="alert">
          {error}
        </div>
      ) : null}
      <div className={styles.saveActions}>
        <button type="button" className={styles.ghostButton} onClick={onCancel} disabled={saving}>
          Huỷ
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={save}
          disabled={saving || library.isPending}
        >
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </div>
  );
}

/**
 * "Lưu vào đâu?" box under a grammar word (Studychill SaveFolderPicker) on top of the PBL-75 library: the word is
 * imported through `me/words/import` — an official word with the same headword is saved as the official word,
 * anything else becomes the learner's custom word — into the folder picked with the PBL-75 FolderPicker
 * (one folder per word in TOEIC Space; the last choice is remembered in the vocabulary preferences).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  FolderPicker,
  useImportWords,
  useLibrary,
  useVocabularyPreferences,
  type ImportItem,
} from "@/modules/vocabulary";

import kit from "../shared/GrammarKit.module.css";
import styles from "./WordSaveBox.module.css";

interface WordSaveBoxProps {
  item: ImportItem;
  /** true = guest (saving needs an account). */
  isGuest: boolean | undefined;
  onSaved: () => void;
  onCancel: () => void;
}

export function WordSaveBox({ item, isGuest, onSaved, onCancel }: WordSaveBoxProps) {
  const signedIn = isGuest === false;
  const library = useLibrary(signedIn);
  const { preferences, update } = useVocabularyPreferences();
  const { state, run } = useImportWords();
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const folderId = chosen !== undefined ? chosen : (preferences.lastFolderPickerId ?? null);
  const saving = state.status === "running";
  const failed = state.status === "done" && (state.failed.length > 0 || state.saved.length === 0);
  const succeeded = state.status === "done" && !failed;

  useEffect(() => {
    if (succeeded) onSaved();
  }, [succeeded, onSaved]);

  if (!signedIn) {
    const next =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search + window.location.hash
        : "/games/grammar";
    return (
      <div className={styles.box}>
        <div className={styles.label}>Lưu vào đâu?</div>
        <div className={styles.err} role="alert">
          Bạn cần <Link to={`/login?next=${encodeURIComponent(next)}`}>đăng nhập</Link> để lưu từ
          vào sổ.
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={onCancel}>
            Huỷ
          </button>
        </div>
      </div>
    );
  }

  const save = () => {
    if (saving) return;
    update({ lastFolderPickerId: folderId });
    void run([item], { folderId, createFoldersFromCategories: false });
  };

  const loading = library.isPending;

  return (
    <div className={styles.box}>
      <div className={styles.label}>Lưu vào đâu?</div>
      {loading ? (
        <div className={kit.muted}>Đang tải thư mục…</div>
      ) : (
        <FolderPicker
          folders={library.data?.folders ?? []}
          value={folderId}
          onChange={setChosen}
          disabled={saving}
        />
      )}
      {failed ? (
        <div className={styles.err} role="alert">
          Chưa lưu được, thử lại giúp mình nhé.
        </div>
      ) : null}
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={onCancel} disabled={saving}>
          Huỷ
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={save}
          disabled={saving || loading}
        >
          {saving ? "Đang lưu…" : "Lưu vào sổ"}
        </button>
      </div>
    </div>
  );
}

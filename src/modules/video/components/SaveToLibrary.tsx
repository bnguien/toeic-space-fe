import { useState, type MouseEvent } from "react";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";

import { useCurrentUser } from "@/modules/auth";
import { FolderPicker, useLibrary } from "@/modules/vocabulary";

import styles from "./SaveToLibrary.module.css";

const STORAGE_KEY = "ts_video_save_folder";

function storageKey(userId: string | undefined): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function readLastFolder(userId: string | undefined): string | null {
  try {
    return localStorage.getItem(storageKey(userId)) || null;
  } catch {
    return null;
  }
}

function writeLastFolder(userId: string | undefined, folderId: string | null): void {
  try {
    if (folderId) localStorage.setItem(storageKey(userId), folderId);
    else localStorage.removeItem(storageKey(userId));
  } catch {
    /* private mode / storage blocked: nothing to remember */
  }
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof Error && (error as { userFacing?: boolean }).userFacing)
    return error.message;
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return status === 401 || status === 403
    ? "Bạn cần đăng nhập để lưu từ vào sổ."
    : "Chưa lưu được, thử lại giúp mình nhé.";
}

interface SaveToLibraryProps {
  /** Saves into the chosen folder (`null` = unfiled); a rejection shows the reason in the form. */
  onSave: (folderId: string | null) => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
}

/**
 * Where to save a word in "Từ vựng của tôi": unfiled or one folder (with "Thư mục mới"). The last choice is
 * remembered per learner so the next save is one click. Shared by the word card and the lesson summary.
 */
export function SaveToLibrary({ onSave, onCancel, saveLabel = "Lưu vào sổ" }: SaveToLibraryProps) {
  const user = useCurrentUser();
  const library = useLibrary(true);
  const folders = library.data?.folders ?? [];
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [remembered] = useState(() => readLastFolder(user?.id));
  const fallback = remembered && folders.some((f) => f.id === remembered) ? remembered : null;
  const folderId = picked === undefined ? fallback : picked;
  const loading = library.isPending;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(folderId);
      writeLastFolder(user?.id, folderId);
    } catch (e) {
      setError(saveErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <div className={styles.picker} onMouseDown={stop} onClick={stop}>
      <div className={styles.label}>Lưu vào đâu?</div>

      {loading ? (
        <div className={styles.muted}>
          <Loader2 size={12} className={styles.spin} aria-hidden="true" /> Đang tải thư mục…
        </div>
      ) : (
        <FolderPicker
          folders={folders}
          value={folderId}
          onChange={(next) => setPicked(next)}
          disabled={saving}
        />
      )}

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.actions}>
        {onCancel ? (
          <button type="button" className={styles.ghost} onClick={onCancel} disabled={saving}>
            Huỷ
          </button>
        ) : null}
        <button
          type="button"
          className={styles.primary}
          onClick={save}
          disabled={saving || loading}
        >
          {saving ? "Đang lưu…" : saveLabel}
        </button>
      </div>
    </div>
  );
}

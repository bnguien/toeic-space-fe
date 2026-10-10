import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { Camera, Check, UploadCloud } from "lucide-react";

import type { AvatarUploadState } from "../types/profile.types";
import { normalizeAvatarUrl } from "../utils/profile-helpers";
import styles from "./ProfileAvatar.module.css";

interface ProfileAvatarProps {
  fullName: string;
  avatarUrl?: string | null;
  previewUrl?: string | null;
  uploadState: AvatarUploadState;
  onSelectFile: (file: File) => void;
  disabled?: boolean;
}

const getInitials = (name: string): string => {
  if (!name || !name.trim()) return "TS";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "TS";
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "TS";
};

export function ProfileAvatar({
  fullName,
  avatarUrl,
  previewUrl,
  uploadState,
  onSelectFile,
  disabled = false,
}: ProfileAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy =
    uploadState.stage === "processing" ||
    uploadState.stage === "uploading" ||
    uploadState.stage === "updating";

  const displayAvatar = previewUrl || normalizeAvatarUrl(avatarUrl);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
    // Reset file input so user can re-select the same file if needed
    e.target.value = "";
  };

  const handleTriggerClick = () => {
    if (!disabled && !isBusy && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === "Enter" || e.key === " ") && !disabled && !isBusy) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const stageTextMap: Record<string, string> = {
    processing: "Đang xử lý ảnh...",
    uploading: "Đang tải ảnh lên...",
    updating: "Đang cập nhật hồ sơ...",
  };

  return (
    <div className={styles.avatarContainer}>
      <input
        ref={fileInputRef}
        type="file"
        id="profile-avatar-input"
        className={styles.fileInput}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled || isBusy}
        aria-label="Tải ảnh đại diện mới"
      />

      <div
        role="button"
        tabIndex={disabled || isBusy ? -1 : 0}
        className={styles.avatarWrapper}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        aria-label={`Đổi ảnh đại diện cho ${fullName}`}
        title="Nhấp để đổi ảnh đại diện"
      >
        <div className={styles.avatarCircle}>
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={`Ảnh đại diện của ${fullName}`}
              className={styles.avatarImage}
              onError={(e) => {
                // If the remote avatar fails to load, gracefully fall back
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className={styles.initialsFallback} aria-hidden="true">
              {getInitials(fullName)}
            </div>
          )}

          {/* Hover overlay when idle */}
          {!isBusy && (
            <div className={styles.avatarOverlay}>
              <Camera size={22} />
              <span className={styles.overlayText}>Đổi ảnh</span>
            </div>
          )}

          {/* Progress / Loading Spinner Overlay */}
          {isBusy && (
            <div className={styles.statusOverlay} role="status" aria-live="polite">
              <div className={styles.spinner} />
              <span className={styles.statusText}>
                {stageTextMap[uploadState.stage] || "Đang xử lý..."}
              </span>
            </div>
          )}
        </div>

        {/* Camera badge on corner */}
        {!isBusy && (
          <div className={styles.cameraBadge} aria-hidden="true">
            <Camera size={16} />
          </div>
        )}

        {/* Success check badge */}
        {uploadState.stage === "success" && (
          <div className={styles.badgeSuccess} title="Đã cập nhật ảnh đại diện">
            <Check size={14} />
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.uploadButton}
        onClick={handleTriggerClick}
        disabled={disabled || isBusy}
      >
        <UploadCloud size={16} />
        <span>{isBusy ? "Đang cập nhật..." : "Đổi ảnh đại diện"}</span>
      </button>
    </div>
  );
}

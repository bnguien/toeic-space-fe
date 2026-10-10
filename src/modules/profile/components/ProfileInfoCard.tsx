import { Award, Compass, Sparkles, Target } from "lucide-react";

import mascotCheer from "@/assets/mascot/oy2-cheer.png";
import type { UserRole } from "@/modules/auth";

import type { AvatarUploadState, UserProfile } from "../types/profile.types";
import { ProfileAvatar } from "./ProfileAvatar";
import styles from "./ProfileInfoCard.module.css";

interface ProfileInfoCardProps {
  profile: UserProfile;
  role?: UserRole;
  previewUrl?: string | null;
  uploadState: AvatarUploadState;
  onSelectAvatarFile: (file: File) => void;
  disabled?: boolean;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  Admin: "Quản trị viên",
  Teacher: "Giáo viên",
  User: "Học viên",
};

const LEVEL_DISPLAY_NAMES: Record<string, string> = {
  Beginner: "Mất gốc / Cơ bản",
  Elementary: "Sơ cấp (A2)",
  Intermediate: "Trung cấp (B1)",
  "Upper-Intermediate": "Trung cao cấp (B2)",
  Advanced: "Nâng cao (C1)",
};

export function ProfileInfoCard({
  profile,
  role = "User",
  previewUrl,
  uploadState,
  onSelectAvatarFile,
  disabled,
}: ProfileInfoCardProps) {
  const targetScore = profile.targetScore ?? null;
  const scorePercent = targetScore ? Math.min(Math.round((targetScore / 990) * 100), 100) : 0;

  const roleText = ROLE_DISPLAY_NAMES[role] || "Học viên";
  const levelText = profile.currentLevel
    ? LEVEL_DISPLAY_NAMES[profile.currentLevel] || profile.currentLevel
    : "Chưa phân loại";

  return (
    <aside className={styles.card} aria-label="Tóm tắt tài khoản">
      <ProfileAvatar
        fullName={profile.fullName}
        avatarUrl={profile.avatarUrl}
        previewUrl={previewUrl}
        uploadState={uploadState}
        onSelectFile={onSelectAvatarFile}
        disabled={disabled}
      />

      <div className={styles.userSummary}>
        <h2 className={styles.name}>{profile.fullName}</h2>
        <p className={styles.email}>{profile.email}</p>

        <div className={styles.tagGroup}>
          <span className={styles.roleBadge} title="Vai trò tài khoản">
            <Award size={12} />
            {roleText}
          </span>

          <span className={styles.levelBadge} title="Trình độ tiếng Anh">
            <Compass size={12} />
            {levelText}
          </span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Target TOEIC Score Tracker Widget */}
      <div className={styles.targetScoreSection}>
        <div className={styles.targetScoreHeader}>
          <span className={styles.targetLabel}>
            <Target size={15} />
            Mục tiêu TOEIC
          </span>
          <span className={styles.targetValue}>
            {targetScore ? `${targetScore} / 990` : "Chưa đặt"}
          </span>
        </div>

        <div className={styles.targetBarTrack}>
          <div
            className={styles.targetBarFill}
            style={{ width: `${scorePercent}%` }}
            role="progressbar"
            aria-valuenow={targetScore ?? 0}
            aria-valuemin={10}
            aria-valuemax={990}
            aria-label="Tiến độ mục tiêu điểm TOEIC"
          />
        </div>

        <div className={styles.targetBarNote}>
          <span>Tối thiểu: 10</span>
          <span>{scorePercent}% thang điểm</span>
          <span>Tối đa: 990</span>
        </div>
      </div>

      {/* Mascot Companion Widget */}
      <div className={styles.mascotWidget}>
        <img src={mascotCheer} alt="" className={styles.mascotImg} />
        <div className={styles.mascotContent}>
          <div className={styles.mascotTitle}>
            <Sparkles size={13} style={{ display: "inline", marginRight: 4 }} />
            Oysteic đồng hành
          </div>
          <div className={styles.mascotText}>
            Luyện tập đều đặn mỗi ngày sẽ giúp bạn chạm tới mục tiêu điểm mong muốn!
          </div>
        </div>
      </div>
    </aside>
  );
}

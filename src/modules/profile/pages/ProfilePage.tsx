import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, RefreshCw } from "lucide-react";

import mascotHello from "@/assets/mascot/oy2-hello.png";
import mascotError from "@/assets/mascot/oy2-error.png";
import { useCurrentUser } from "@/modules/auth";
import { Footer } from "@/modules/landing";

import { ProfileForm } from "../components/ProfileForm";
import { ProfileInfoCard } from "../components/ProfileInfoCard";
import { ProfileSkeleton } from "../components/ProfileSkeleton";
import { ProfileToast, type ToastItem } from "../components/ProfileToast";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useProfile } from "../hooks/useProfile";
import { useUpdateProfile } from "../hooks/useUpdateProfile";
import type { UpdateUserProfileRequest } from "../types/profile.types";
import { getProfileErrorMessage } from "../utils/profile-helpers";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const authUser = useCurrentUser();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateMutation = useUpdateProfile();

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Avatar upload hook with notifications
  const { uploadAvatar, uploadState, previewUrl } = useAvatarUpload({
    onSuccess: () => {
      addToast("success", "Cập nhật ảnh đại diện thành công.", "Thành công");
    },
    onError: (errorMessage) => {
      addToast("error", errorMessage, "Tải ảnh thất bại");
    },
  });

  const handleSaveProfile = async (payload: UpdateUserProfileRequest) => {
    try {
      await updateMutation.mutateAsync(payload);
      addToast("success", "Cập nhật hồ sơ thành công.", "Thành công");
    } catch {
      // Error is tracked by mutation.error and displayed in ProfileForm
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Toast feedback system */}
      <ProfileToast toasts={toasts} onDismiss={removeToast} />

      <main className={styles.mainContent}>
        {/* Loading Skeleton */}
        {isLoading && <ProfileSkeleton />}

        {/* Error Screen */}
        {!isLoading && isError && (
          <section className={styles.errorCard} role="alert">
            <img src={mascotError} alt="" className={styles.errorMascot} />
            <h1 className={styles.errorTitle}>Không thể tải thông tin hồ sơ</h1>
            <p className={styles.errorText}>
              {getProfileErrorMessage(error) ||
                "Đã có lỗi xảy ra khi lấy thông tin người dùng từ máy chủ. Vui lòng kiểm tra lại kết nối."}
            </p>
            <button type="button" className={styles.retryBtn} onClick={() => void refetch()}>
              <RefreshCw size={15} style={{ display: "inline", marginRight: 6 }} />
              Thử lại
            </button>
          </section>
        )}

        {/* Profile Content */}
        {!isLoading && profile && (
          <>
            {/* Breadcrumb Navigation */}
            <nav className={styles.breadcrumb} aria-label="Đường dẫn trang">
              <Link to="/" className={styles.breadcrumbLink}>
                Trang chủ
              </Link>
              <ChevronRight size={14} className={styles.breadcrumbSeparator} />
              <span className={styles.breadcrumbCurrent} aria-current="page">
                Hồ sơ cá nhân
              </span>
            </nav>

            {/* Hero Greeting Banner */}
            <section className={styles.heroBanner} aria-label="Chào mừng người dùng">
              <div className={styles.heroContent}>
                <h1 className={styles.heroGreeting}>Xin chào, {profile.fullName}!</h1>
                <p className={styles.heroSubtitle}>
                  Quản lý thông tin tài khoản và theo dõi mục tiêu điểm số TOEIC của bạn{" "}
                  <span className={styles.noWrap}>tại TOEICSpace.</span>
                </p>
              </div>
              <img
                src={mascotHello}
                alt="TOEICSpace Mascot"
                className={styles.heroMascot}
                width={88}
                height={88}
              />
            </section>

            {/* Two-Column Responsive Layout */}
            <div className={styles.profileLayout}>
              {/* Left Column: Account Summary Card */}
              <ProfileInfoCard
                profile={profile}
                role={authUser?.role}
                previewUrl={previewUrl}
                uploadState={uploadState}
                onSelectAvatarFile={uploadAvatar}
                disabled={updateMutation.isPending}
              />

              {/* Right Column: Personal Information Form & View */}
              <ProfileForm
                profile={profile}
                isSaving={updateMutation.isPending}
                saveError={updateMutation.error}
                onSave={handleSaveProfile}
              />
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

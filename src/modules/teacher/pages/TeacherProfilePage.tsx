import { RefreshCw } from "lucide-react";
import teacherMascot from "@/assets/mascot/oy2-hello.png";
import { useCurrentUser } from "@/modules/auth";
import {
  getProfileErrorMessage,
  ProfileForm,
  ProfileInfoCard,
  ProfileSkeleton,
  useAvatarUpload,
  useProfile,
  useUpdateProfile,
  type UpdateUserProfileRequest,
} from "@/modules/profile";
import styles from "./TeacherProfilePage.module.css";

export function TeacherProfilePage() {
  const user = useCurrentUser();
  const profile = useProfile();
  const update = useUpdateProfile();
  const { uploadAvatar, uploadState, previewUrl } = useAvatarUpload();
  const save = async (payload: UpdateUserProfileRequest) => {
    await update.mutateAsync(payload);
  };
  if (profile.isLoading) return <ProfileSkeleton />;
  if (profile.isError || !profile.data)
    return (
      <section className={styles.error}>
        <RefreshCw size={24} />
        <h1>Không thể tải hồ sơ</h1>
        <p>{getProfileErrorMessage(profile.error)}</p>
        <button onClick={() => void profile.refetch()}>Thử lại</button>
      </section>
    );
  return (
    <div className={styles.page}>
      <header>
        <div>
          <span>HỒ SƠ GIẢNG VIÊN</span>
          <h1>Xin chào, {profile.data.fullName}!</h1>
          <p>Quản lý thông tin tài khoản, ảnh đại diện và hồ sơ giảng dạy của bạn.</p>
        </div>
        <img src={teacherMascot} alt="" />
      </header>
      <div className={styles.content}>
        <ProfileInfoCard
          profile={profile.data}
          role={user?.role}
          previewUrl={previewUrl}
          uploadState={uploadState}
          onSelectAvatarFile={uploadAvatar}
          disabled={update.isPending}
          showLearningGoals={false}
        />
        <ProfileForm
          profile={profile.data}
          isSaving={update.isPending}
          saveError={update.error}
          onSave={save}
          showLearningGoals={false}
        />
      </div>
    </div>
  );
}

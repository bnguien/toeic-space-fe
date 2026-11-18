import { RefreshCw } from "lucide-react";
import teacherMascot from "@/assets/mascot/oy2-hello.png";
import { AdminPage, ListHero } from "@/modules/admin";
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
import { TeacherGoogleMeetCard } from "../components/TeacherGoogleMeetCard";
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
    <AdminPage
      theme="blue"
      hero={
        <ListHero
          eyebrow="Hồ sơ giảng viên"
          title="Hồ sơ"
          highlight="của bạn"
          description="Quản lý thông tin tài khoản, ảnh đại diện, hồ sơ giảng dạy và kết nối Google Meet của bạn."
          mascot={teacherMascot}
          items={[
            { key: "role", label: "Vai trò", value: "Giáo viên" },
            { key: "profile", label: "Hồ sơ", value: "Đã cập nhật" },
            { key: "security", label: "Bảo mật", value: "An toàn" },
          ]}
        />
      }
    >
      <div className={styles.page}>
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
        <TeacherGoogleMeetCard />
      </div>
    </AdminPage>
  );
}

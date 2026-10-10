import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Calendar,
  Check,
  Edit3,
  FileText,
  Lock,
  Mail,
  Phone,
  Sparkles,
  Target,
  User,
  Users,
  X,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Select, type SelectOption } from "@/shared/components/Select";

import { profileSchema, type ProfileFormValues } from "../schemas/profile.schema";
import { UserGender, type UserProfile } from "../types/profile.types";
import {
  buildUpdateProfilePayload,
  formatDateOfBirth,
  formatGender,
  getGenderFormValue,
  getProfileErrorMessage,
  normalizeGenderToEnum,
} from "../utils/profile-helpers";
import styles from "./ProfileForm.module.css";

interface ProfileFormProps {
  profile: UserProfile;
  isSaving: boolean;
  saveError: unknown;
  onSave: (payload: ReturnType<typeof buildUpdateProfilePayload>) => Promise<void>;
}

const GENDER_OPTIONS: SelectOption[] = [
  { value: String(UserGender.Male), label: "Nam" },
  { value: String(UserGender.Female), label: "Nữ" },
  { value: String(UserGender.Other), label: "Khác" },
];

const LEVEL_OPTIONS: SelectOption[] = [
  { value: "Beginner", label: "Mất gốc / Cơ bản", description: "Bắt đầu làm quen với TOEIC" },
  { value: "Elementary", label: "Sơ cấp (A2)", description: "Mục tiêu 300 – 450 điểm" },
  { value: "Intermediate", label: "Trung cấp (B1)", description: "Mục tiêu 500 – 650 điểm" },
  {
    value: "Upper-Intermediate",
    label: "Trung cao cấp (B2)",
    description: "Mục tiêu 700 – 800 điểm",
  },
  { value: "Advanced", label: "Nâng cao (C1)", description: "Mục tiêu 850 – 990 điểm" },
];

export function ProfileForm({ profile, isSaving, saveError, onSave }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Maximum allowed date of birth is yesterday
  const yesterdayString = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: profile.fullName || "",
      phone: profile.phone || "",
      dateOfBirth: profile.dateOfBirth || "",
      gender: getGenderFormValue(profile.gender),
      biography: profile.biography || "",
      targetScore: profile.targetScore ?? undefined,
      currentLevel: profile.currentLevel || "",
    },
  });

  // Watch biography for live character counter
  const watchedBio = useWatch({ control, name: "biography" }) || "";
  const bioLength = watchedBio.length;

  // Whenever the profile data changes from upstream, update form values
  useEffect(() => {
    if (!isEditing) {
      reset({
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: getGenderFormValue(profile.gender),
        biography: profile.biography || "",
        targetScore: profile.targetScore ?? undefined,
        currentLevel: profile.currentLevel || "",
      });
    }
  }, [profile, isEditing, reset]);

  const handleCancel = () => {
    reset({
      fullName: profile.fullName || "",
      phone: profile.phone || "",
      dateOfBirth: profile.dateOfBirth || "",
      gender: getGenderFormValue(profile.gender),
      biography: profile.biography || "",
      targetScore: profile.targetScore ?? undefined,
      currentLevel: profile.currentLevel || "",
    });
    setIsEditing(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload = buildUpdateProfilePayload(profile, values);
    try {
      await onSave(payload);
      setIsEditing(false);
    } catch {
      // Error is handled by parent / hook
    }
  });

  const getLevelDisplay = (val?: string | null) => {
    if (!val) return "Chưa cập nhật";
    const found = LEVEL_OPTIONS.find((l) => l.value.toLowerCase() === val.toLowerCase());
    return found ? found.label : val;
  };

  return (
    <section className={styles.card} aria-labelledby="profile-info-heading">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h2 id="profile-info-heading" className={styles.title}>
            Thông tin cá nhân
          </h2>
          <p className={styles.subtitle}>
            {isEditing
              ? "Chỉnh sửa thông tin hồ sơ và mục tiêu học tập của bạn."
              : "Xem và quản lý thông tin tài khoản được lưu trên hệ thống."}
          </p>
        </div>

        <div className={styles.headerActions}>
          {!isEditing ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setIsEditing(true)}
              aria-label="Chỉnh sửa hồ sơ"
            >
              <Edit3 size={15} />
              <span>Chỉnh sửa hồ sơ</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Hủy chỉnh sửa"
            >
              <X size={15} />
              <span>Hủy</span>
            </button>
          )}
        </div>
      </header>

      {/* Server error alert if submission failed */}
      {Boolean(saveError) && (
        <div className={styles.serverAlert} role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{getProfileErrorMessage(saveError)}</span>
        </div>
      )}

      {/* VIEW MODE */}
      {!isEditing ? (
        <div className={styles.viewGrid}>
          <div className={styles.viewItem}>
            <span className={styles.viewLabel}>
              <User size={13} /> Họ và tên
            </span>
            <span className={styles.viewValue}>{profile.fullName}</span>
          </div>

          <div className={styles.viewItem}>
            <span className={styles.viewLabel}>
              <Mail size={13} /> Email
              <span className={styles.readOnlyBadge} title="Email không thể thay đổi">
                <Lock size={10} style={{ display: "inline", marginRight: 2 }} />
                Cố định
              </span>
            </span>
            <span className={styles.viewValue}>{profile.email}</span>
          </div>

          <div className={styles.viewItem}>
            <span className={styles.viewLabel}>
              <Phone size={13} /> Số điện thoại
            </span>
            <span className={profile.phone ? styles.viewValue : styles.viewValueEmpty}>
              {profile.phone || "Chưa cập nhật"}
            </span>
          </div>

          <div className={styles.viewItem}>
            <span className={styles.viewLabel}>
              <Calendar size={13} /> Ngày sinh
            </span>
            <span className={profile.dateOfBirth ? styles.viewValue : styles.viewValueEmpty}>
              {formatDateOfBirth(profile.dateOfBirth)}
            </span>
          </div>

          <div className={styles.viewItem}>
            <span className={styles.viewLabel}>
              <Users size={13} /> Giới tính
            </span>
            <span
              className={
                normalizeGenderToEnum(profile.gender) !== undefined
                  ? styles.viewValue
                  : styles.viewValueEmpty
              }
            >
              {formatGender(profile.gender)}
            </span>
          </div>

          <div className={styles.viewItem}>
            <span className={styles.viewLabel}>
              <Target size={13} /> Mục tiêu TOEIC
            </span>
            <span className={profile.targetScore ? styles.viewValue : styles.viewValueEmpty}>
              {profile.targetScore ? `${profile.targetScore} điểm` : "Chưa đặt"}
            </span>
          </div>

          <div className={styles.viewItem}>
            <span className={styles.viewLabel}>
              <Sparkles size={13} /> Trình độ hiện tại
            </span>
            <span className={profile.currentLevel ? styles.viewValue : styles.viewValueEmpty}>
              {getLevelDisplay(profile.currentLevel)}
            </span>
          </div>

          <div className={`${styles.viewItem} ${styles.viewItemFull}`}>
            <span className={styles.viewLabel}>
              <FileText size={13} /> Giới thiệu bản thân
            </span>
            <span className={profile.biography ? styles.viewValue : styles.viewValueEmpty}>
              {profile.biography || "Chưa có lời giới thiệu nào."}
            </span>
          </div>
        </div>
      ) : (
        /* EDIT MODE */
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <div className={styles.formGrid}>
            {/* Full Name */}
            <div className={styles.field}>
              <label htmlFor="profile-fullname" className={styles.label}>
                <span>Họ và tên *</span>
              </label>
              <input
                id="profile-fullname"
                type="text"
                maxLength={100}
                autoComplete="name"
                className={`${styles.input} ${errors.fullName ? styles.inputError : ""}`}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullname-error" : undefined}
                {...register("fullName")}
              />
              {errors.fullName && (
                <span id="fullname-error" className={styles.errorText} role="alert">
                  <AlertCircle size={13} /> {errors.fullName.message}
                </span>
              )}
            </div>

            {/* Email (Read-only) */}
            <div className={styles.field}>
              <label htmlFor="profile-email" className={styles.label}>
                <span>Email</span>
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                disabled
                className={`${styles.input} ${styles.inputDisabled}`}
                title="Email tài khoản được quản lý bởi hệ thống"
              />
            </div>

            {/* Phone */}
            <div className={styles.field}>
              <label htmlFor="profile-phone" className={styles.label}>
                <span>Số điện thoại</span>
              </label>
              <input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
              {errors.phone && (
                <span id="phone-error" className={styles.errorText} role="alert">
                  <AlertCircle size={13} /> {errors.phone.message}
                </span>
              )}
            </div>

            {/* Date of Birth */}
            <div className={styles.field}>
              <label htmlFor="profile-dob" className={styles.label}>
                <span>Ngày sinh</span>
              </label>
              <input
                id="profile-dob"
                type="date"
                max={yesterdayString}
                className={`${styles.input} ${errors.dateOfBirth ? styles.inputError : ""}`}
                aria-invalid={Boolean(errors.dateOfBirth)}
                aria-describedby={errors.dateOfBirth ? "dob-error" : undefined}
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <span id="dob-error" className={styles.errorText} role="alert">
                  <AlertCircle size={13} /> {errors.dateOfBirth.message}
                </span>
              )}
            </div>

            {/* Gender */}
            <div className={styles.field}>
              <label htmlFor="profile-gender" className={styles.label}>
                <span>Giới tính</span>
              </label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select
                    id="profile-gender"
                    value={field.value || ""}
                    onChange={field.onChange}
                    options={GENDER_OPTIONS}
                    placeholder="-- Chọn giới tính --"
                    error={Boolean(errors.gender)}
                    clearable
                  />
                )}
              />
              {errors.gender && (
                <span className={styles.errorText} role="alert">
                  <AlertCircle size={13} /> {errors.gender.message}
                </span>
              )}
            </div>

            {/* Target Score */}
            <div className={styles.field}>
              <label htmlFor="profile-target-score" className={styles.label}>
                <span>Mục tiêu điểm TOEIC</span>
                <span className={styles.labelNote}>10 – 990 điểm</span>
              </label>
              <input
                id="profile-target-score"
                type="number"
                min={10}
                max={990}
                placeholder="Ví dụ: 800"
                className={`${styles.input} ${errors.targetScore ? styles.inputError : ""}`}
                aria-invalid={Boolean(errors.targetScore)}
                aria-describedby={errors.targetScore ? "target-error" : undefined}
                {...register("targetScore", {
                  setValueAs: (val: unknown) => {
                    if (val === "" || val === null || val === undefined) return undefined;
                    const num = Number(val);
                    return Number.isNaN(num) ? undefined : num;
                  },
                })}
              />
              {errors.targetScore && (
                <span id="target-error" className={styles.errorText} role="alert">
                  <AlertCircle size={13} /> {errors.targetScore.message}
                </span>
              )}
            </div>

            {/* Current Level */}
            <div className={styles.field}>
              <label htmlFor="profile-level" className={styles.label}>
                <span>Trình độ hiện tại</span>
              </label>
              <Controller
                control={control}
                name="currentLevel"
                render={({ field }) => (
                  <Select
                    id="profile-level"
                    value={field.value || ""}
                    onChange={field.onChange}
                    options={LEVEL_OPTIONS}
                    placeholder="-- Chọn trình độ --"
                    error={Boolean(errors.currentLevel)}
                    clearable
                  />
                )}
              />
              {errors.currentLevel && (
                <span className={styles.errorText} role="alert">
                  <AlertCircle size={13} /> {errors.currentLevel.message}
                </span>
              )}
            </div>

            {/* Biography */}
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label htmlFor="profile-bio" className={styles.label}>
                <span>Giới thiệu bản thân</span>
                <span
                  className={`${styles.charCounter} ${
                    bioLength > 300 ? styles.charCounterWarn : ""
                  }`}
                >
                  {bioLength} / 300
                </span>
              </label>
              <textarea
                id="profile-bio"
                maxLength={300}
                rows={3}
                placeholder="Chia sẻ đôi nét về mục tiêu học TOEIC, thói quen luyện thi hoặc phương châm của bạn..."
                className={`${styles.textarea} ${errors.biography ? styles.inputError : ""}`}
                aria-invalid={Boolean(errors.biography)}
                aria-describedby={errors.biography ? "bio-error" : undefined}
                {...register("biography")}
              />
              {errors.biography && (
                <span id="bio-error" className={styles.errorText} role="alert">
                  <AlertCircle size={13} /> {errors.biography.message}
                </span>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleCancel}
              disabled={isSaving}
            >
              Hủy
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
              <Check size={16} />
              <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

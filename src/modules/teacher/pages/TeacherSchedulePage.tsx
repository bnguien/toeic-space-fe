import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import scheduleMascot from "@/assets/mascot/oy2-listening.png";
import { AdminPage, ListHero } from "@/modules/admin";
import { useCurrentUser } from "@/modules/auth";
import { ClassScheduleCalendar } from "../components/ClassScheduleCalendar";
import { TeacherSessionDetail } from "../components/TeacherSessionDetail";
import { useTeacherClasses } from "../hooks/useTeacherClasses";
import styles from "./TeacherSchedulePage.module.css";

export function TeacherSchedulePage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const classes = useTeacherClasses(1, 100);
  const classNames = useMemo(
    () => new Map((classes.data?.items ?? []).map((item) => [item.id, item.name])),
    [classes.data],
  );

  return (
    <AdminPage
      theme="blue"
      hero={
        <ListHero
          eyebrow="Lịch giảng dạy"
          icon={<CalendarDays size={14} />}
          title="Buổi dạy"
          highlight="của tôi"
          description="Xem các buổi dạy theo tuần. Mở một buổi để xem chi tiết, điểm danh học viên hoặc mở lớp học để quản lý."
          mascot={scheduleMascot}
          items={[
            {
              key: "classes",
              label: "Lớp đang phụ trách",
              value: classes.data?.totalCount,
            },
            { key: "view", label: "Chế độ xem", value: "Tuần" },
            { key: "zone", label: "Múi giờ", value: "GMT+7" },
          ]}
        />
      }
    >
      <div className={styles.page}>
        <ClassScheduleCalendar
          role="teacher"
          classNames={classNames}
          onOpenSession={(session) => setSelectedId(session.id)}
          onManageClass={(session) => navigate(`/teacher/classes?class=${session.classId}`)}
        />
        {selectedId && (
          <TeacherSessionDetail
            key={selectedId}
            sessionId={selectedId}
            teacherId={user?.id}
            teacherName={user?.fullName}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </AdminPage>
  );
}

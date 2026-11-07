import { useEffect, useState } from "react";
import { Button, ButtonLink, ConfirmDialog, Pagination } from "@/modules/admin";
import { useCurrentUser } from "@/modules/auth";
import { practiceSetsApi, type PracticeSet } from "../api/practice-sets.api";
import { usePracticeFilters } from "../hooks/usePracticeFilters";
import { PracticeFilters } from "../components/PracticeFilters";
import { PracticeState } from "../components/PracticeState";
import { usePracticeMutation, usePracticeSets } from "../hooks/usePracticeSets";
import {
  canManageSet,
  kindLabels,
  partLabel,
  practiceError,
  statusLabels,
} from "../utils/practice";
import styles from "../components/Practice.module.css";

export function PracticeSetManagementPage() {
  const user = useCurrentUser();
  const { filters, setFilters, page, setPage, search } = usePracticeFilters();
  const [deleting, setDeleting] = useState<PracticeSet | null>(null);
  const query = usePracticeSets({
    ownedOnly: true,
    page,
    pageSize: 12,
    search: search || undefined,
    part: filters.part || undefined,
    kind: filters.kind || undefined,
    level: filters.kind === "Level" && filters.level ? Number(filters.level) : undefined,
    status: filters.status || undefined,
  });
  const remove = usePracticeMutation((id: string) => practiceSetsApi.remove(id));
  const totalPages = query.data?.totalPages;
  useEffect(() => {
    if (totalPages != null && page > Math.max(1, totalPages)) setPage(Math.max(1, totalPages));
  }, [totalPages, page, setPage]);
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>TEACHER DASHBOARD</p>
          <h1>Bộ luyện tập của tôi</h1>
        </div>
        <ButtonLink to="/teacher/practice-sets/create" variant="primary">
          Tạo bộ luyện tập
        </ButtonLink>
      </div>
      <PracticeFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
        }}
        management
      />
      <PracticeState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <>
          {query.data.items.length === 0 && (
            <PracticeState empty="Bạn chưa có bộ luyện tập phù hợp. Hãy tạo bộ đầu tiên." />
          )}
          <div className={styles.grid}>
            {query.data.items.map((set) => (
              <article className={styles.card} key={set.id}>
                <span className={styles.eyebrow}>
                  {partLabel(set.part)} · {kindLabels[set.kind]}
                </span>
                <h2>{set.title}</h2>
                <p>{set.description}</p>
                <div className={styles.meta}>
                  <span>{statusLabels[set.status]}</span>
                  <span>{set.questionCount} câu</span>
                  {set.kind === "Level" && <span>Cấp độ {set.level}</span>}
                </div>
                {canManageSet(user, set) && (
                  <div className={styles.actions}>
                    <ButtonLink to={`/teacher/practice-sets/${set.id}/edit`}>Chỉnh sửa</ButtonLink>
                    <Button
                      variant="danger-outline"
                      onClick={() => {
                        remove.reset();
                        setDeleting(set);
                      }}
                    >
                      Xóa
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
          <Pagination
            page={page}
            pages={query.data.totalPages}
            total={query.data.totalCount}
            pageSize={12}
            onChange={setPage}
          />
        </>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa bộ luyện tập?"
        description={
          deleting?.status === "Active"
            ? `Bộ “${deleting.title}” đang xuất bản. Xóa sẽ khiến học viên không thể mở bộ này.`
            : deleting?.title
        }
        confirmLabel="Xóa"
        tone="danger"
        pending={remove.isPending}
        error={remove.error ? practiceError(remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}

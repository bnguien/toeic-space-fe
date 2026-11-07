import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Pagination } from "@/modules/admin";
import { Footer } from "@/modules/landing";
import { usePracticeFilters } from "../hooks/usePracticeFilters";
import { PracticeFilters } from "../components/PracticeFilters";
import { PracticeState } from "../components/PracticeState";
import { usePracticeSets } from "../hooks/usePracticeSets";
import { kindLabels, partLabel } from "../utils/practice";
import styles from "../components/Practice.module.css";

export function PracticeSetsPage() {
  const { filters, setFilters, page, setPage, search } = usePracticeFilters();
  const query = usePracticeSets({
    page,
    pageSize: 12,
    status: "Active",
    search: search || undefined,
    part: filters.part || undefined,
    kind: filters.kind || undefined,
    level: filters.kind === "Level" && filters.level ? Number(filters.level) : undefined,
  });
  const totalPages = query.data?.totalPages;
  useEffect(() => {
    if (totalPages != null && page > Math.max(1, totalPages)) setPage(Math.max(1, totalPages));
  }, [totalPages, page, setPage]);
  return (
    <>
      <main className={`${styles.page} ${styles.student}`}>
        <p className={styles.eyebrow}>LUYỆN THI / LUYỆN THEO PART</p>
        <h1>Bộ luyện tập TOEIC</h1>
        <p>Chọn Part, chủ đề hoặc cấp độ và xem câu hỏi kèm lời giải.</p>
        <PracticeFilters
          value={filters}
          onChange={(next) => {
            setFilters(next);
          }}
        />
        <PracticeState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {query.data && (
          <>
            {query.data.items.length === 0 && (
              <PracticeState empty="Chưa có bộ luyện tập phù hợp." />
            )}
            <div className={styles.grid}>
              {query.data.items.map((set) => (
                <Link className={styles.card} key={set.id} to={`/practice/parts/${set.id}`}>
                  <span className={styles.eyebrow}>
                    {partLabel(set.part)} · {kindLabels[set.kind]}
                  </span>
                  <h2>{set.title}</h2>
                  <p>{set.description || "Luyện tập và củng cố kỹ năng TOEIC."}</p>
                  <div className={styles.meta}>
                    {set.kind === "Level" && <span>Cấp độ {set.level}</span>}
                    <span>{set.questionCount} câu hỏi</span>
                  </div>
                  <b>Xem chi tiết →</b>
                </Link>
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
      </main>
      <Footer />
    </>
  );
}

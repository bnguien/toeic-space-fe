import { Link, useParams } from "react-router-dom";
import { useCurrentUser } from "@/modules/auth";
import { Footer } from "@/modules/landing";
import { PracticeContent } from "../components/PracticeContent";
import { PracticeState } from "../components/PracticeState";
import { usePracticePreview } from "../hooks/usePracticePreview";
import { kindLabels, partLabel } from "../utils/practice";
import styles from "../components/Practice.module.css";

export function PracticeSetDetailPage() {
  const { id = "" } = useParams();
  const user = useCurrentUser();
  const preview = usePracticePreview(id);
  // A cached snapshot cannot grant access on re-entry; first verify it with the server.
  const verified = preview.isFetchedAfterMount && !preview.isError;
  const set = verified ? preview.data?.set : null;
  const content = verified ? preview.data?.content : null;
  return (
    <>
      <main className={`${styles.page} ${styles.student}`}>
        <Link to="/practice/parts">← Bộ luyện tập</Link>
        <PracticeState
          pending={preview.isPending || !preview.isFetchedAfterMount}
          error={preview.error || preview.data?.error}
          retry={() => void preview.refetch()}
        />
        {set &&
          (set.status !== "Active" ? (
            <p>Bộ luyện tập này chưa được xuất bản.</p>
          ) : (
            <>
              <p className={styles.eyebrow}>
                {partLabel(set.part)} · {kindLabels[set.kind]}
              </p>
              <h1>{set.title}</h1>
              <p>{set.description}</p>
              <div className={styles.meta}>
                {set.kind === "Level" && <span>Cấp độ {set.level}</span>}
                <span>{content?.questionCount ?? set.items.length} câu hỏi</span>
                <span>{set.durationMinutes} phút</span>
                {set.targetScore != null && <span>Điểm mục tiêu: {set.targetScore}</span>}
              </div>
              <h2>Xem trước câu hỏi</h2>
              {!user ? (
                <p>
                  <Link to={`/login?next=${encodeURIComponent(`/practice/parts/${id}`)}`}>
                    Đăng nhập
                  </Link>{" "}
                  để xem câu hỏi, đáp án và lời giải.
                </p>
              ) : content ? (
                <PracticeContent content={content} items={set.items} />
              ) : null}
            </>
          ))}
      </main>
      <Footer />
    </>
  );
}

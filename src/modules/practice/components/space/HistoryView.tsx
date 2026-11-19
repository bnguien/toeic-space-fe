import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileCheck2,
  House,
  Play,
  Trophy,
} from "lucide-react";

import emptyMascot from "@/assets/mascot/oy2-empty.png";
import errorMascot from "@/assets/mascot/oy2-error.png";
import {
  Badge,
  ButtonLink,
  EmptyState,
  ErrorState,
  IconButton,
  Segmented,
  Skeleton,
} from "@/shared/components/ui";

import { useAttemptHistory } from "../../hooks/usePracticeExamQueries";
import type { AttemptSummary } from "../../types/practice-exam.types";
import { practiceExamError } from "../../utils/practiceExamErrors";
import { formatClock, formatDateTime } from "../../utils/scoreDisplay";
import styles from "./HistoryView.module.css";
import {
  HISTORY_TABS,
  continuePath,
  historyStatusOf,
  modeLabel,
  sourceLine,
  statusLabel,
  summaryScore,
  type HistoryModeFilter,
  type HistoryTab,
} from "./spaceModel";

const PAGE_SIZE = 10;

const MODE_OPTIONS = [
  { value: "all", label: "Mọi chế độ" },
  { value: "FullTest", label: "Thi thử" },
  { value: "Practice", label: "Luyện tập" },
] as const;

interface HistoryViewProps {
  tab: HistoryTab;
  mode: HistoryModeFilter;
  page: number;
  onChange: (next: { tab?: HistoryTab; mode?: HistoryModeFilter; page?: number }) => void;
}

/** "Lịch sử làm bài": every attempt of the learner, newest first, with filters and paging. */
export function HistoryView({ tab, mode, page, onChange }: HistoryViewProps) {
  const modeQuery = mode === "all" ? {} : { mode };
  const list = useAttemptHistory({
    ...modeQuery,
    status: historyStatusOf(tab),
    page,
    pageSize: PAGE_SIZE,
  });
  // "Tất cả" = attempts in progress on top (at most one per source) + the paged completed list.
  const open = useAttemptHistory(
    { ...modeQuery, status: "InProgress", pageSize: 20 },
    tab === "all",
  );

  return (
    <div className={styles.view}>
      <header className={styles.head}>
        <nav className={styles.crumb} aria-label="Breadcrumb">
          <Link to="/">
            <House size={13} aria-hidden="true" /> Trang chủ
          </Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">Lịch sử làm bài</span>
        </nav>
        <h1 className={styles.title}>
          Lịch sử <em>làm bài</em>
        </h1>
        <p className={styles.subtitle}>Mọi bài thi thử và luyện tập của bạn, mới nhất trước.</p>
      </header>

      <div className={styles.filters}>
        <Segmented
          label="Trạng thái"
          options={HISTORY_TABS}
          value={tab}
          onChange={(next) => onChange({ tab: next, page: 1 })}
          className={styles.tabs}
        />
        <Segmented
          label="Chế độ"
          size="sm"
          variant="subtle"
          options={MODE_OPTIONS}
          value={mode}
          onChange={(next) => onChange({ mode: next, page: 1 })}
        />
      </div>

      {tab === "all" && page === 1 && (open.data?.items.length ?? 0) > 0 && (
        <section className={styles.group} aria-labelledby="history-open">
          <h2 id="history-open" className={styles.groupTitle}>
            Đang làm dở <span>{open.data!.items.length}</span>
          </h2>
          <ul className={styles.list}>
            {open.data!.items.map((item) => (
              <AttemptRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      <section className={styles.group} aria-labelledby="history-list" aria-busy={list.isFetching}>
        {tab === "all" && (
          <h2 id="history-list" className={styles.groupTitle}>
            Đã nộp {list.data && <span>{list.data.totalCount}</span>}
          </h2>
        )}
        {list.isPending ? (
          <div className={styles.loading}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} shape="block" height={76} />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorState
            image={errorMascot}
            title={`Chưa tải được lịch sử. ${practiceExamError(list.error)}`}
            onRetry={() => void list.refetch()}
          />
        ) : list.data.items.length === 0 && tab === "all" && (open.data?.items.length ?? 0) > 0 ? (
          <p className={styles.quiet}>Chưa có bài nào đã nộp.</p>
        ) : list.data.items.length === 0 ? (
          <EmptyState
            image={emptyMascot}
            title={emptyTitle(tab, mode)}
            action={
              tab !== "abandoned" && (
                <ButtonLink to="/practice/exam" variant="primary" icon={<FileCheck2 size={16} />}>
                  Chọn đề luyện
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            <ul className={styles.list} id={tab === "all" ? undefined : "history-list"}>
              {list.data.items.map((item) => (
                <AttemptRow key={item.id} item={item} />
              ))}
            </ul>
            {list.data.totalPages > 1 && (
              <nav className={styles.pager} aria-label="Phân trang">
                <IconButton
                  label="Trang trước"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => onChange({ page: page - 1 })}
                >
                  <ChevronLeft size={16} />
                </IconButton>
                <span>
                  Trang <b>{page}</b>/{list.data.totalPages}
                </span>
                <IconButton
                  label="Trang sau"
                  variant="outline"
                  size="sm"
                  disabled={page >= list.data.totalPages}
                  onClick={() => onChange({ page: page + 1 })}
                >
                  <ChevronRight size={16} />
                </IconButton>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function emptyTitle(tab: HistoryTab, mode: HistoryModeFilter) {
  const what = mode === "FullTest" ? "bài thi thử" : mode === "Practice" ? "bài luyện tập" : "bài";
  if (tab === "in-progress") return `Không có ${what} nào đang làm dở.`;
  if (tab === "abandoned") return `Không có ${what} nào đã bỏ.`;
  return `Bạn chưa nộp ${what} nào. Chọn một đề để bắt đầu nhé!`;
}

function AttemptRow({ item }: { item: AttemptSummary }) {
  const score = summaryScore(item);
  const completed = item.status === "Completed";
  const title = item.title || item.source.title;
  // Drop the parts of the source line the title already says (series, "Part 5, 6"…).
  const source = sourceLine(item.source, item.parts)
    .split(" · ")
    .filter((bit) => bit && !title.includes(bit))
    .join(" · ");
  const when = formatDateTime(item.endTime ?? item.startTime);
  return (
    <li className={styles.row} data-status={item.status}>
      <span className={styles.icon} data-mode={item.mode} aria-hidden="true">
        {item.mode === "FullTest" ? <Clock size={18} /> : <FileCheck2 size={18} />}
      </span>
      <span className={styles.main}>
        <span className={styles.rowTitle}>
          <b>{title}</b>
          <Badge tone={item.mode === "FullTest" ? "rose" : "blue"}>{modeLabel(item.mode)}</Badge>
          {!completed && (
            <Badge tone={item.status === "InProgress" ? "outline" : "neutral"}>
              {statusLabel(item.status)}
            </Badge>
          )}
        </span>
        <small className={styles.meta}>
          {[
            source,
            when,
            completed && item.durationSeconds > 0 ? formatClock(item.durationSeconds) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </span>
      <span className={styles.score}>
        {completed ? (
          <>
            <b data-kind={score.kind}>
              {score.kind === "scaled" && <Trophy size={13} aria-hidden="true" />}
              {score.label}
            </b>
            {score.detail && <small>{score.detail}</small>}
          </>
        ) : (
          <>
            <b>
              {item.answered}/{item.questionCount}
            </b>
            <small>câu đã làm</small>
          </>
        )}
      </span>
      <span className={styles.actions}>
        {completed ? (
          <>
            <ButtonLink to={`/practice/attempts/${item.id}/result`} size="sm" variant="outline">
              Kết quả
            </ButtonLink>
            <ButtonLink
              to={`/practice/attempts/${item.id}/review`}
              size="sm"
              variant="ghost"
              icon={<Eye size={14} />}
            >
              Xem lại
            </ButtonLink>
          </>
        ) : item.status === "InProgress" ? (
          <ButtonLink
            to={continuePath(item)}
            state={{ from: "/practice/history" }}
            size="sm"
            variant="primary"
            icon={<Play size={14} />}
          >
            Làm tiếp
          </ButtonLink>
        ) : null}
      </span>
    </li>
  );
}

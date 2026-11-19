import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LogIn } from "lucide-react";

import errorMascot from "@/assets/mascot/oy2-error.png";
import lockedMascot from "@/assets/mascot/oy2-locked.png";
import { useCurrentUser } from "@/modules/auth";
import { ButtonLink, EmptyState, ErrorState, Sheet, Skeleton } from "@/shared/components/ui";

import { usePracticeStats, useTestsProgress } from "../../hooks/usePracticeExamQueries";
import type { TestProgress } from "../../types/practice-exam.types";
import { practiceExamError } from "../../utils/practiceExamErrors";
import {
  radarAxes,
  radarPoint,
  waffleCounts,
  waffleRows,
  type RadarAxis,
  type TestSeries,
} from "./spaceModel";
import styles from "./StatsDrawer.module.css";

interface StatsDrawerProps {
  open: boolean;
  onClose: () => void;
  series: TestSeries[];
  /** Path to come back to after signing in. */
  loginNext: string;
}

/**
 * "Phân tích" panel (StudyChill StatsDrawer), sliding from the left: profile, 3 KPIs, accuracy
 * radar of the 7 parts and a waffle of every test. Every figure comes from the server
 * (`me/practice/stats`, `me/practice/tests-progress`).
 */
export function StatsDrawer({ open, onClose, series, loginNext }: StatsDrawerProps) {
  return (
    <Sheet open={open} title="Phân tích luyện đề" onClose={onClose} className={styles.drawer}>
      {open && <Content series={series} loginNext={loginNext} />}
    </Sheet>
  );
}

function Content({ series, loginNext }: { series: TestSeries[]; loginNext: string }) {
  const user = useCurrentUser();
  const learner = user?.role === "User";
  const stats = usePracticeStats();
  const progress = useTestsProgress();
  // Same definition as the overview row and the waffle (tests-progress), so the figures agree.
  const testCount = series.reduce((sum, s) => sum + s.tests.length, 0);
  const submitted = waffleCounts(
    waffleRows(series, new Map((progress.data ?? []).map((p) => [p.testId, p]))),
  ).done;

  if (!learner) {
    return (
      <EmptyState
        image={lockedMascot}
        title={user ? "Phân tích chỉ dành cho tài khoản học viên" : "Đăng nhập để xem phân tích"}
        action={
          !user && (
            <ButtonLink
              to={`/login?next=${encodeURIComponent(loginNext)}`}
              variant="primary"
              icon={<LogIn size={16} />}
            >
              Đăng nhập
            </ButtonLink>
          )
        }
      />
    );
  }

  return (
    <div className={styles.body}>
      <header className={styles.profile}>
        {user.avatarUrl ? (
          <img className={styles.avatar} src={user.avatarUrl} alt="" />
        ) : (
          <span className={styles.avatar} aria-hidden="true">
            {initials(user.fullName || user.email)}
          </span>
        )}
        <span className={styles.who}>
          <b>{user.fullName || user.email}</b>
          <small>{user.email}</small>
        </span>
      </header>

      {stats.isPending ? (
        <div className={styles.loading} aria-busy="true">
          <Skeleton shape="block" height={64} />
          <Skeleton shape="block" height={260} />
        </div>
      ) : stats.isError ? (
        <ErrorState
          image={errorMascot}
          title={`Chưa tải được phân tích. ${practiceExamError(stats.error)}`}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <>
          <dl className={styles.quick}>
            <div data-tone="navy">
              <dt>Đề đã nộp</dt>
              <dd>
                {progress.data ? submitted : stats.data.testsCompleted}
                <small>/ {testCount || stats.data.testsTotal}</small>
              </dd>
            </div>
            <div data-tone="blue">
              <dt>Câu đã làm</dt>
              <dd>{stats.data.questionsAnswered.toLocaleString("vi-VN")}</dd>
            </div>
            <div data-tone="rose">
              <dt>Chính xác</dt>
              <dd>{Math.round(stats.data.correctRate * 100)}%</dd>
            </div>
          </dl>
          <Radar axes={radarAxes(stats.data)} empty={stats.data.questionsAnswered === 0} />
        </>
      )}

      <Waffle series={series} progress={progress.data} loading={progress.isPending} />

      <Link to="/practice/history" className={styles.more}>
        Xem lịch sử làm bài <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

/* Radar: grid at 25/50/75/100 %, accuracy polygon, a dot per part (hover for the figures). */
const CX = 160;
const CY = 146;
const R = 100;

function Radar({ axes, empty }: { axes: RadarAxis[]; empty: boolean }) {
  const n = axes.length;
  const ring = (k: number) =>
    axes.map((_, i) => radarPoint(i, n, R * k, CX, CY).join(",")).join(" ");
  const value = (axis: RadarAxis) => (R * Math.max(axis.percent, 2)) / 100;
  const shape = axes.map((axis, i) => radarPoint(i, n, value(axis), CX, CY).join(",")).join(" ");
  return (
    <section className={styles.section} aria-labelledby="stats-radar">
      <h3 id="stats-radar" className={styles.sectionTitle}>
        Độ chính xác theo Part
      </h3>
      <svg
        className={styles.radar}
        viewBox="0 0 320 290"
        role="img"
        aria-label={axes.map((a) => `${a.short} ${a.percent}%`).join(", ")}
      >
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <polygon key={k} points={ring(k)} className={styles.grid} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = radarPoint(i, n, R, CX, CY);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} className={styles.axis} />;
        })}
        {!empty && <polygon points={shape} className={styles.shape} />}
        {axes.map((axis, i) => {
          const [x, y] = radarPoint(i, n, value(axis), CX, CY);
          const [lx, ly] = radarPoint(i, n, R + 24, CX, CY);
          return (
            <g key={axis.part} className={styles.point} data-section={axis.section}>
              {!empty && (
                <>
                  <circle cx={x} cy={y} r="11" className={styles.hit}>
                    <title>
                      {`${axis.short} · ${axis.name}: ${axis.percent}% · ${axis.correct}/${axis.answered} câu đúng`}
                    </title>
                  </circle>
                  <circle cx={x} cy={y} r="4.5" className={styles.dot} />
                </>
              )}
              <text x={lx} y={ly - 3} className={styles.axisLabel}>
                {axis.short}
              </text>
              <text x={lx} y={ly + 12} className={styles.axisValue}>
                {axis.answered ? `${axis.percent}%` : "—"}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={styles.key}>
        <span data-section="listening">Nghe · P1–P4</span>
        <span data-section="reading">Đọc · P5–P7</span>
      </p>
      {empty && (
        <p className={styles.emptyNote}>Làm bài đầu tiên để thấy độ chính xác của từng Part.</p>
      )}
    </section>
  );
}

/* Waffle: one cell per test, rows per series; done / in progress (filled by %) / not started. */
function Waffle({
  series,
  progress,
  loading,
}: {
  series: TestSeries[];
  progress: TestProgress[] | undefined;
  loading: boolean;
}) {
  const rows = useMemo(
    () => waffleRows(series, new Map((progress ?? []).map((p) => [p.testId, p]))),
    [series, progress],
  );
  const counts = waffleCounts(rows);
  return (
    <section className={styles.section} aria-labelledby="stats-waffle">
      <h3 id="stats-waffle" className={styles.sectionTitle}>
        Tình hình làm đề
      </h3>
      {loading || series.length === 0 ? (
        <Skeleton shape="block" height={72} />
      ) : (
        <>
          <div className={styles.waffle}>
            {rows.map((row) => (
              <div key={row.key} className={styles.waffleRow}>
                <span className={styles.waffleLabel} title={row.label}>
                  {row.label}
                </span>
                <span className={styles.cells}>
                  {row.cells.map((cell) => (
                    <i
                      key={cell.id}
                      data-status={cell.status}
                      style={
                        cell.status === "doing"
                          ? ({ "--fill": `${Math.max(cell.percent, 12)}%` } as CSSProperties)
                          : undefined
                      }
                      title={`${cell.title} — ${
                        cell.status === "done"
                          ? "đã nộp"
                          : cell.status === "doing"
                            ? `đang làm ${cell.percent}%`
                            : "chưa làm"
                      }`}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className={styles.waffleKey}>
            <span data-status="done">Đã nộp {counts.done}</span>
            <span data-status="doing">Đang làm {counts.doing}</span>
            <span data-status="todo">Chưa làm {counts.todo}</span>
          </p>
        </>
      )}
    </section>
  );
}

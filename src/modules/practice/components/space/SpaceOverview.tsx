import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, House, LogIn, Play, Target } from "lucide-react";

import { Button, ButtonLink, NumberTile, ProgressBar, Skeleton } from "@/shared/components/ui";

import { HeroArt, type HeroArtKind } from "./HeroArt";
import type { PoolSummary } from "./spaceModel";
import styles from "./SpaceOverview.module.css";

export interface SpaceOverviewProps {
  kind: HeroArtKind;
  crumb: string;
  title: [string, string];
  subtitle: string;
  /** "Đề luyện" / "Bộ luyện" */
  poolLabel: string;
  /** "Đã nộp" / "Đã xong" */
  doneLabel: string;
  /** Total items (known to guests too). */
  total: number | null;
  /** Learner progress; null for guests. */
  summary: PoolSummary | null;
  loading: boolean;
  signedIn: boolean;
  loginNext: string;
  cta: { label: string; onClick: () => void; busy?: boolean } | null;
  ghost: { label: string; onClick: () => void } | null;
  map: ReactNode;
}

/** Overview of a mode before an item is chosen: hero, metric row + call to action, map. */
export function SpaceOverview({
  kind,
  crumb,
  title,
  subtitle,
  poolLabel,
  doneLabel,
  total,
  summary,
  loading,
  signedIn,
  loginNext,
  cta,
  ghost,
  map,
}: SpaceOverviewProps) {
  return (
    <div className={styles.overview}>
      <div className={styles.top}>
        <header className={styles.hero} aria-labelledby="space-title">
          <div className={styles.lead}>
            <nav className={styles.crumb} aria-label="Breadcrumb">
              <Link to="/">
                <House size={13} aria-hidden="true" /> Trang chủ
              </Link>
              <ChevronRight size={13} aria-hidden="true" />
              <span aria-current="page">{crumb}</span>
            </nav>
            <h1 id="space-title" className={styles.title} data-kind={kind}>
              {title[0]} <em>{title[1]}</em>
            </h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          <HeroArt kind={kind} />
        </header>

        <div className={styles.stats}>
          {loading ? (
            <Skeleton width={320} height={48} />
          ) : (
            <>
              <NumberTile value={total ?? "—"} caption={poolLabel} size="md" />
              {summary && (
                <>
                  <NumberTile
                    value={summary.doing}
                    caption="Đang làm"
                    tone={summary.doing > 0 ? (kind === "reading" ? "rose" : "blue") : undefined}
                  />
                  <NumberTile
                    value={
                      <>
                        {summary.done}
                        <span className={styles.of}>/{summary.total}</span>
                      </>
                    }
                    caption={doneLabel}
                  />
                  <span className={styles.goal} title={`Tiến độ ${summary.percent}%`}>
                    <Target size={16} className={styles.goalIcon} aria-hidden="true" />
                    <ProgressBar
                      className={styles.goalBar}
                      value={summary.percent}
                      tone="tone"
                      label={`Tiến độ ${summary.percent}%`}
                    />
                    <b className={styles.goalCount}>{summary.percent}%</b>
                  </span>
                </>
              )}
              {!signedIn && (
                <p className={styles.guest}>Đăng nhập để lưu tiến độ và điểm của bạn.</p>
              )}
            </>
          )}
          <span className={styles.actions}>
            {!signedIn && !loading && (
              <ButtonLink
                to={`/login?next=${encodeURIComponent(loginNext)}`}
                variant="primary"
                icon={<LogIn size={16} />}
              >
                Đăng nhập
              </ButtonLink>
            )}
            {cta && !loading && (
              <Button
                variant={signedIn ? "primary" : "outline"}
                icon={<Play size={16} />}
                onClick={cta.onClick}
                disabled={cta.busy}
              >
                {cta.label}
              </Button>
            )}
            {ghost && (
              <Button variant="outline" trailing={<ArrowRight size={16} />} onClick={ghost.onClick}>
                {ghost.label}
              </Button>
            )}
          </span>
        </div>
      </div>
      <div className={styles.bottom}>{map}</div>
    </div>
  );
}

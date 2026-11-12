import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";
import { ArrowDown } from "lucide-react";

import styles from "./ReaderTranscript.module.css";

interface ReaderTranscriptProps {
  listRef: RefObject<HTMLDivElement | null>;
  fontScale: number;
  hasCues: boolean;
  loadingSubs: boolean;
  preparingSubs: boolean;
  /** Scroll intent of the learner (wheel, touch move, scroll keys, scrollbar drag) — stops auto-follow. */
  onUserScroll: () => void;
  onListKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onListPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  /** Hover delegation (mouse only; undefined on touch screens). */
  onHover?: (e: MouseEvent<HTMLDivElement>) => void;
  onHoverEnd?: () => void;
  /** Show "Về câu đang phát". */
  showFollow: boolean;
  onFollow: () => void;
  children: ReactNode;
}

/** Scrollable transcript: rows or paragraphs, loading skeleton, "Về câu đang phát". */
export function ReaderTranscript({
  listRef,
  fontScale,
  hasCues,
  loadingSubs,
  preparingSubs,
  onUserScroll,
  onListKeyDown,
  onListPointerDown,
  onHover,
  onHoverEnd,
  showFollow,
  onFollow,
  children,
}: ReaderTranscriptProps) {
  return (
    <div className={styles.listWrap}>
      <div
        ref={listRef}
        className={styles.list}
        style={{ "--vr-scale": fontScale } as CSSProperties}
        tabIndex={0}
        aria-label="Lời thoại"
        onWheel={onUserScroll}
        onTouchMove={onUserScroll}
        onKeyDown={onListKeyDown}
        onPointerDown={onListPointerDown}
        onMouseOver={onHover}
        onMouseLeave={onHoverEnd}
      >
        {!hasCues && (
          <div className={styles.listEmpty}>
            {loadingSubs ? (
              <>
                {preparingSubs && (
                  <p className={styles.listNote} role="status">
                    Đang chuẩn bị phụ đề… Lần đầu mở video có thể mất tới một phút.
                  </p>
                )}
                <span className={styles.skeleton} />
                <span className={`${styles.skeleton} ${styles.skeletonShort}`} />
                <span className={styles.skeleton} />
              </>
            ) : (
              "Chưa có phụ đề để hiển thị."
            )}
          </div>
        )}
        {children}
      </div>
      {showFollow && (
        <button type="button" className={styles.follow} onClick={onFollow}>
          <ArrowDown size={15} aria-hidden="true" />
          Về câu đang phát
        </button>
      )}
    </div>
  );
}

/** Container of the sentence rows. */
export function ReaderRows({ children }: { children: ReactNode }) {
  return <div className={styles.rows}>{children}</div>;
}

/** Container of the flow paragraphs. */
export function ReaderFlow({ children }: { children: ReactNode }) {
  return <div className={styles.flow}>{children}</div>;
}

import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clock,
  Eye,
  FileBarChart,
  RotateCcw,
  Star,
} from "lucide-react";

import { Button, Modal } from "@/shared/components/ui";

import type { AttemptResult } from "../../types/practice-exam.types";
import type { QuestionGroup } from "../../utils/attemptGroups";
import {
  cefrOf,
  formatClock,
  percentOf,
  scoreComment,
  scoreHeadline,
} from "../../utils/scoreDisplay";
import { ScoreRing, SectionBar } from "../common";
import { resultCellTitle, resultCells, type ResultCell } from "./workspaceModel";
import styles from "./ScoreOverlay.module.css";

export interface ScoreOverlayProps {
  open: boolean;
  onClose: () => void;
  result: AttemptResult;
  groups: readonly QuestionGroup[];
  /** Grid cell click: close and jump to the question. */
  onJump: (cell: ResultCell) => void;
  /** "Xem lại bài thi": the read-only review. */
  onReview: () => void;
  /** "Luyện lại câu sai" (hidden when nothing is wrong or skipped). */
  onRetakeWrong: () => void;
  /** "Làm lại đề" (asks first). */
  onRetakeAll: () => void;
  retaking: boolean;
  resultHref: string;
  onExit: () => void;
  exitLabel: string;
}

/**
 * Score overlay after submit (port of the StudyChill "BẢNG ĐIỂM DỰ ĐOÁN"): total ring (/990 when
 * the attempt covers whole sections, else % correct), CEFR + comment, Listening / Reading bars,
 * three KPI, the full answer grid and the follow-up actions.
 */
export function ScoreOverlay({
  open,
  onClose,
  result,
  groups,
  onJump,
  onReview,
  onRetakeWrong,
  onRetakeAll,
  retaking,
  resultHref,
  onExit,
  exitLabel,
}: ScoreOverlayProps) {
  const { score } = result;
  const headline = scoreHeadline(score);
  const cefr = cefrOf(score);
  const cells = useMemo(() => resultCells(result, groups), [result, groups]);
  const flagged = cells.filter((c) => c.flagged).length;
  const needsRetake = cells.some((c) => c.status !== "correct");

  return (
    <Modal
      open={open}
      wide
      onClose={onClose}
      title="Kết quả bài làm"
      description={
        headline.kind === "scaled"
          ? "Đánh giá năng lực theo thang điểm chuẩn quốc tế 990"
          : "Bài chưa trọn phần Listening/Reading nên tính theo tỉ lệ câu đúng"
      }
      footer={
        <div className={styles.actions}>
          <Button variant="primary" icon={<Eye size={15} aria-hidden="true" />} onClick={onReview}>
            Xem lại bài thi
          </Button>
          {needsRetake && (
            <Button
              variant="outline"
              className={styles.retakeWrong}
              icon={<RotateCcw size={15} aria-hidden="true" />}
              onClick={onRetakeWrong}
              disabled={retaking}
            >
              Luyện lại câu sai
            </Button>
          )}
          <Button
            variant="outline"
            icon={<RotateCcw size={15} aria-hidden="true" />}
            onClick={onRetakeAll}
            disabled={retaking}
            title="Bắt đầu một lượt mới của đề này"
          >
            Làm lại đề
          </Button>
          <Link to={resultHref} className={styles.link}>
            <FileBarChart size={15} aria-hidden="true" />
            Xem trang kết quả
          </Link>
          <Button
            variant="ghost"
            icon={<ArrowLeft size={15} aria-hidden="true" />}
            onClick={onExit}
          >
            {exitLabel}
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.kicker}>
          {headline.kind === "scaled" ? "Bảng điểm dự đoán" : "Kết quả luyện tập"} ·{" "}
          {result.title || result.source.title}
        </p>

        <div className={styles.hero}>
          <ScoreRing
            value={headline.value}
            max={headline.max}
            label={String(headline.value)}
            caption={headline.kind === "scaled" ? "/ 990" : "% đúng"}
            tone="correct"
            size={136}
            ariaLabel={
              headline.kind === "scaled"
                ? `Điểm dự đoán ${headline.value} trên 990`
                : `Đúng ${headline.value} phần trăm`
            }
          />
          <div className={styles.cefr}>
            {cefr && headline.kind === "scaled" ? (
              <>
                <span className={styles.cefrBadge}>
                  Trình độ: {cefr.level} ({cefr.title})
                </span>
                <p>{scoreComment(headline.value)}</p>
              </>
            ) : (
              <>
                <span className={styles.cefrBadge}>
                  Đúng {score.correct}/{score.questionCount} câu
                </span>
                <p>
                  Điểm quy đổi 990 chỉ có khi làm trọn phần Listening (Part 1–4) hoặc Reading (Part
                  5–7) của một đề.
                </p>
              </>
            )}
          </div>
        </div>

        <div className={styles.sections}>
          {score.listeningTotal > 0 && (
            <SectionBar
              section="listening"
              title="Listening Comprehension"
              scaled={score.listeningScaled}
              correct={score.listeningCorrect}
              total={score.listeningTotal}
            />
          )}
          {score.readingTotal > 0 && (
            <SectionBar
              section="reading"
              title="Reading Comprehension"
              scaled={score.readingScaled}
              correct={score.readingCorrect}
              total={score.readingTotal}
            />
          )}
        </div>

        <dl className={styles.kpis}>
          <div>
            <dt>
              <CheckCircle2 size={15} aria-hidden="true" />
              Tổng câu đúng
            </dt>
            <dd>
              {score.correct}/{score.questionCount} ({percentOf(score.correct, score.questionCount)}
              %)
            </dd>
          </div>
          <div>
            <dt>
              <Clock size={15} aria-hidden="true" />
              Thời gian
            </dt>
            <dd>{formatClock(result.durationSeconds)}</dd>
          </div>
          <div>
            <dt>
              <Bookmark size={15} aria-hidden="true" />
              Câu đã đánh dấu
            </dt>
            <dd>{flagged} câu</dd>
          </div>
        </dl>

        <section className={styles.gridSection} aria-label="Bảng câu hỏi chi tiết">
          <div className={styles.gridHead}>
            <strong>Bảng câu hỏi chi tiết</strong>
            <ul className={styles.legend}>
              <li>
                <i data-status="correct" aria-hidden="true" /> Đúng
              </li>
              <li>
                <i data-status="wrong" aria-hidden="true" /> Sai
              </li>
              <li>
                <i data-status="skipped" aria-hidden="true" /> Chưa làm
              </li>
            </ul>
          </div>
          <div className={styles.grid}>
            {cells.map((cell) => (
              <button
                key={cell.questionId}
                type="button"
                className={styles.cell}
                data-status={cell.status}
                title={resultCellTitle(cell)}
                aria-label={resultCellTitle(cell)}
                onClick={() => onJump(cell)}
              >
                {cell.number}
                {cell.flagged && <Star size={9} className={styles.star} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}

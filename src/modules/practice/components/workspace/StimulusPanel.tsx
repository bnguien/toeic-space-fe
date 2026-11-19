import { FileText, Lightbulb } from "lucide-react";

import listeningMascot from "@/assets/mascot/oy2-listening.png";
import { mediaUrls, RichText } from "@/shared/components/RichText";

import type { AudioPlayer } from "../../hooks/useAudioPlayer";
import type { AnswerOption } from "../../types/practice-exam.types";
import type { QuestionGroup } from "../../utils/attemptGroups";
import { partMeta } from "../../utils/parts";
import { part5BlankFill } from "../../utils/passageMarks";
import { PassageView, PracticeAudioPlayer } from "../common";
import styles from "./StimulusPanel.module.css";

export interface StimulusPanelProps {
  group: QuestionGroup;
  player: AudioPlayer;
  /** The player is drawn here (desktop); stacked layouts pin it above the column instead. */
  showPlayer: boolean;
  /** Phone layout: no Part 2 tip card, no shortcut hints. */
  phone: boolean;
  answerOf: (questionId: string) => AnswerOption | null;
  /** Question in focus (Part 6 blank highlight). */
  currentQuestionId?: string;
}

/**
 * Left panel of the workspace, by part (port of the StudyChill left panel): instruction bar,
 * audio player (P1–4), photo (P1), tip card (P2), chart + transcript after the check (P3/4),
 * the sentence with its blank filled (P5) and the passage view (P6/7).
 */
export function StimulusPanel({
  group,
  player,
  showPlayer,
  phone,
  answerOf,
  currentQuestionId,
}: StimulusPanelProps) {
  const meta = partMeta(group.part);
  const images = group.imageUrls.flatMap((url) => mediaUrls(url));
  const revealed = group.questions.some((q) => q.reveal !== null);
  const listening = group.part <= 4;

  return (
    <div className={styles.panel} data-section={meta.section}>
      <p className={styles.instruction} lang="en">
        <span className={styles.partTag}>Part {group.part}</span>
        {meta.instruction}
      </p>

      {listening &&
        showPlayer &&
        (group.audioUrl ? (
          <PracticeAudioPlayer player={player} seed={group.audioUrl} showShortcuts={!phone} />
        ) : (
          <p className={styles.notice}>Nhóm câu này chưa có audio.</p>
        ))}

      {group.part === 1 &&
        (images.length ? (
          images.map((src, i) => (
            <figure key={src} className={styles.photo}>
              <img src={src} alt={`Tranh câu ${group.firstNumber}`} decoding="async" />
              {images.length > 1 && (
                <figcaption>
                  Tranh {i + 1} / {images.length}
                </figcaption>
              )}
            </figure>
          ))
        ) : (
          <div className={styles.placeholder}>
            <img src={listeningMascot} alt="" width={120} height={120} decoding="async" />
            <p>Mô tả bức tranh</p>
          </div>
        ))}

      {group.part === 2 && !phone && (
        <div className={styles.tipCard}>
          <img
            src={listeningMascot}
            alt=""
            width={92}
            height={92}
            decoding="async"
            className={styles.tipMascot}
          />
          <div>
            <h4>Part 2: Hỏi &amp; Đáp phản xạ</h4>
            <p>
              Lắng nghe kỹ từ để hỏi (<b lang="en">Who, Where, When, Why, How</b>) hoặc dạng câu hỏi{" "}
              <b>Yes/No</b> để chọn đáp án phản hồi tự nhiên nhất.
            </p>
            <ul>
              <li>Câu hỏi Wh-: đáp án có Yes/No thường là bẫy.</li>
              <li>Cẩn thận phương án lặp lại từ hoặc từ đồng âm với câu hỏi.</li>
              <li>Câu trả lời gián tiếp (“Để tôi kiểm tra…”) thường là đáp án đúng.</li>
            </ul>
          </div>
        </div>
      )}

      {(group.part === 3 || group.part === 4) &&
        images.map((src, i) => (
          <figure key={src} className={styles.photo} data-kind="chart">
            <img src={src} alt={`Biểu đồ nhóm câu ${group.firstNumber}-${group.lastNumber}`} />
            {images.length > 1 && (
              <figcaption>
                Hình {i + 1} / {images.length}
              </figcaption>
            )}
          </figure>
        ))}

      {(group.part === 3 || group.part === 4) && revealed && group.content && (
        <section className={styles.transcript} aria-label="Transcript">
          <p className={styles.transcriptHead}>
            <FileText size={14} aria-hidden="true" />
            <span>
              Transcript (Lời thoại) — <em>bật Chế độ tra từ rồi bôi đen để tra</em>
            </span>
          </p>
          {/* The chart is already shown above. */}
          <PassageView group={{ ...group, imageUrls: [] }} currentQuestionId={currentQuestionId} />
        </section>
      )}

      {group.part === 5 &&
        group.questions.map((q) => (
          <article key={q.id} className={styles.sentence}>
            <p className={styles.sentenceHead}>Câu {q.number} — Hoàn thành câu</p>
            <div className={styles.sentenceText} lang="en">
              {q.text ? (
                <RichText
                  value={q.text}
                  variant="text"
                  dashBlanks
                  blankFill={part5BlankFill(q, answerOf(q.id))}
                />
              ) : (
                <p>Chọn phương án chính xác nhất để điền vào chỗ trống.</p>
              )}
            </div>
            <p className={styles.tip}>
              <Lightbulb size={14} aria-hidden="true" />
              Mẹo: Xác định từ loại cần điền và cấu trúc ngữ pháp trước/sau chỗ trống.
            </p>
          </article>
        ))}

      {(group.part === 6 || group.part === 7) && (
        <PassageView group={group} currentQuestionId={currentQuestionId} />
      )}
    </div>
  );
}

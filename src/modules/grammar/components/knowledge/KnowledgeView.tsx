/**
 * Knowledge part of a topic — laid out like SECTION A of the lesson document: goals, then every unit (h3) and sub-unit
 * (h4) with main idea · recognition · formula · highlighted examples · diagram · TOEIC trap · Oysteic tip · recall;
 * ends with “Một trang nhớ cả bài”. Every unit / sub-unit carries `data-anchor` + `data-code` for the roadmap column's
 * scroll target and scroll-spy. Port of Studychill `KnowledgeView.jsx`.
 */
import { useState, type ReactNode } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

import type {
  GrammarKnowledge,
  GrammarKnowledgeUnit,
  KnowledgeExample,
  KnowledgeRecall,
} from "../../types/knowledge.types";
import { cx } from "../../utils/cx";
import { sticker } from "../../utils/grammar-assets";
import { pad2, splitHighlight } from "../../utils/grammar-text";
import kit from "../shared/GrammarKit.module.css";
import { Diagram } from "./Diagram";
import styles from "./KnowledgeView.module.css";

function ExampleSentence({ e }: { e: KnowledgeExample }) {
  const parts = splitHighlight(e.sentence, e.label);
  return (
    <li>
      <span className={styles.exampleSentence} lang="en">
        {parts ? (
          <>
            {parts[0]}
            <mark className={kit.hl}>{parts[1]}</mark>
            {parts[2]}
          </>
        ) : (
          e.sentence
        )}
      </span>
      <span className={styles.exampleTranslation}>{e.translation}</span>
      {e.caption && <span className={styles.exampleCaption}>{e.caption}</span>}
    </li>
  );
}

function RecallNote({ nl, onGoTo }: { nl: KnowledgeRecall; onGoTo: (code: string) => void }) {
  return (
    <div className={styles.recall}>
      <b>
        ↺ Nhắc lại{" "}
        {nl.code.map((code, i) => (
          <span key={code}>
            {i > 0 && ", "}
            <button
              type="button"
              className={kit.link}
              onClick={() => onGoTo(code)}
              title={`Mở ${code}`}
            >
              {code}
            </button>
          </span>
        ))}
        :
      </b>{" "}
      {nl.note}
    </div>
  );
}

interface OysteicTipProps {
  title?: string;
  children: ReactNode;
}

/** Mascot tip card (Studychill "Mẹo Chillo"). */
export function OysteicTip({ title: title = "Mẹo Oysteic", children }: OysteicTipProps) {
  return (
    <div className={styles.tip}>
      <img src={sticker("idea")} alt="" loading="lazy" width="88" height="88" />
      <div>
        <div className={styles.tipTitle}>{title}</div>
        <p>{children}</p>
      </div>
    </div>
  );
}

/** Blocks shared by units and sub-units (block_common of the PDF). */
function UnitBlock({
  x,
  hasTip: showTip,
  onGoTo,
}: {
  x: GrammarKnowledgeUnit;
  hasTip?: boolean;
  onGoTo: (code: string) => void;
}) {
  return (
    <>
      <p className={styles.mainIdea}>{x.mainIdea}</p>
      {x.signals && x.signals.length > 0 && (
        <div className={styles.signals}>
          <span className={kit.lbl}>Nhận diện</span>
          <ul>
            {x.signals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {x.formula && (
        <div className={styles.formula}>
          <span className={kit.lbl}>Công thức</span>
          <code>{x.formula}</code>
        </div>
      )}
      {x.examples && x.examples.length > 0 && (
        <div className={styles.examples}>
          <span className={kit.lbl}>Ví dụ</span>
          <ol>
            {x.examples.map((e) => (
              <ExampleSentence key={e.sentence} e={e} />
            ))}
          </ol>
        </div>
      )}
      <Diagram data={x.diagram} />
      {(x.toeicTraps || []).map((b) => (
        <div className={styles.trap} key={b.trap}>
          <div className={styles.bayH}>
            <span>Bẫy TOEIC</span>
            <small>Part {b.part || "5"}</small>
          </div>
          <p>
            <b>Bẫy:</b> {b.trap}
          </p>
          <p>
            <b>Vì sao:</b> {b.why}
          </p>
          <p>
            <b>Cách tránh:</b> {b.avoid}
          </p>
        </div>
      ))}
      {showTip && x.tip && <OysteicTip>{x.tip}</OysteicTip>}
      {x.recall && <RecallNote nl={x.recall} onGoTo={onGoTo} />}
    </>
  );
}

export interface KnowledgeEnding {
  understood: boolean;
  isGuest?: boolean;
  onConfirm: () => Promise<unknown> | unknown;
  onOpenVocab: () => void;
}

/** Closing block: the learner decides when they "understood" (no forced scrolling). */
function TheoryEnd({ understood, onConfirm: onUnderstood, onOpenVocab: onVocab }: KnowledgeEnding) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const handleConfirm = async () => {
    setSaving(true);
    setError("");
    try {
      await onUnderstood();
    } catch {
      setError("Chưa lưu được, thử lại nhé.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className={cx(kit.ending, understood && kit.endingDone)}>
      <div className={kit.endingTitle}>
        {understood ? "Bạn đã nắm bài này" : "Bạn đã nắm bài này?"}
      </div>
      <div className={kit.endingRow}>
        {understood ? (
          <>
            <span className={kit.endingOk}>
              <Check size={16} /> Đã hiểu bài
            </span>
            <button type="button" className={cx(kit.btn, kit.btnMoss)} onClick={onVocab}>
              Học từ vựng <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className={cx(kit.btn, kit.btnSon)}
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? <Loader2 size={15} className={kit.spin} /> : <Check size={15} />} Tôi đã hiểu
            bài
          </button>
        )}
        {error && (
          <span className={kit.error} role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

interface KnowledgeViewProps {
  knowledge: GrammarKnowledge;
  onGoTo: (code: string) => void;
  ending?: KnowledgeEnding | null;
}

export function KnowledgeView({ knowledge, onGoTo, ending }: KnowledgeViewProps) {
  const k = knowledge;
  const topicKey = pad2(k.number);
  return (
    <div className={styles.knowledge}>
      <div className={styles.goals}>
        <div className={styles.goalsT}>Học done bài này, bạn sẽ</div>
        <ul>
          {(k.goals || []).map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </div>

      <h2 className={kit.sectionTitle}>
        <b>SECTION A</b>
        <span>Kiến thức — {k.title}</span>
      </h2>

      {k.units.map((u) => {
        return (
          <section key={u.code} className={styles.unit}>
            <h3 className={styles.anchor} id={u.code} data-anchor="" data-code={u.code}>
              <i>{u.number}</i>
              {u.title}
            </h3>
            <UnitBlock x={u} hasTip onGoTo={onGoTo} />
            {(u.subItems || []).map((m) => (
              <div key={m.code} className={styles.sub}>
                <h4 className={styles.anchor} id={m.code} data-anchor="" data-code={m.code}>
                  <b>{m.number}</b>
                  {m.title}
                </h4>
                <UnitBlock x={m} onGoTo={onGoTo} />
              </div>
            ))}
          </section>
        );
      })}

      <div
        className={cx(styles.summary, styles.anchor)}
        id={`${k.code}-summary`}
        data-anchor=""
        data-code={`${k.code}-summary`}
      >
        <div className={styles.summaryT}>
          Một trang nhớ cả bài
          <small>CĐ {topicKey} · tóm tắt</small>
        </div>
        <ol>
          {(k.summary || []).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <table className={styles.ftab}>
          <tbody>
            {k.units.map((u) => (
              <tr key={u.code}>
                <td>{u.number}</td>
                <td>{u.title}</td>
                <td>
                  {u.formula && (
                    <>
                      <code>{u.formula}</code>
                      <br />
                    </>
                  )}
                  {u.diagram?.memoryHook}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ending && <TheoryEnd {...ending} />}
    </div>
  );
}

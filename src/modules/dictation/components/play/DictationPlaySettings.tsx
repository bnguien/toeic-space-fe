/** Settings drawer of the play screen (Studychill DictationPlaySettings). The card stops taking keys while it is
 * open; every change is saved at once (per mode, server copy for signed-in learners). */
import { useEffect, useRef, type ReactNode } from "react";
import { Gauge, Music2, Palette, PencilLine, Play, Shuffle, Volume2, X } from "lucide-react";

import { cx } from "@/shared/components/ui";

import { ACCENTS } from "../../hooks/useSentenceSpeech";
import type { AudioKind, PlaySource } from "../../types/play.types";
import {
  AUTO_NEXT_STEPS,
  LIVE_CHECKS,
  MEANING_MODES,
  PACES,
  RATES,
  REVEAL_STEPS,
  type PlaySettings,
} from "../../utils/dictation-settings";
import { CHIME_STYLES, playSfx, setSfxEnabled, setSfxPrefs, useSoundPrefs } from "../../utils/sfx";
import panel from "./PlayPanel.module.css";
import styles from "./DictationPlaySession.module.css";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cx(panel.toggle, checked && panel.toggleOn)}
      onClick={() => onChange(!checked)}
    >
      <span>
        <strong>{label}</strong>
      </span>
      <i aria-hidden="true" />
    </button>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className={panel.segmented} role="radiogroup" aria-label={label}>
      {options.map(([key, name]) => (
        <button
          key={String(key)}
          type="button"
          role="radio"
          aria-checked={value === key}
          className={value === key ? panel.active : undefined}
          onClick={() => onChange(key)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

/** One line: short label left, choices right. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={panel.row}>
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

interface DictationPlaySettingsProps {
  settings: PlaySettings;
  mode: "basic" | "pro";
  source: PlaySource;
  hasVideo: boolean;
  videoError: string;
  onShuffleScene: () => void;
  onChange: (patch: Partial<PlaySettings>) => void;
  onClose: () => void;
  onPreview: (kind?: AudioKind) => void;
}

export function DictationPlaySettings({
  settings,
  mode,
  source,
  hasVideo,
  videoError,
  onShuffleScene,
  onChange,
  onClose,
  onPreview,
}: DictationPlaySettingsProps) {
  const sound = useSoundPrefs();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  const paces: [string, string][] = [
    ...Object.entries(PACES).map(([key, pace]): [string, string] => [key, pace.name]),
    ...(settings.pace === "custom" ? [["custom", "Tuỳ chỉnh"] as [string, string]] : []),
  ];

  return (
    <div
      className={panel.layer}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className={cx(panel.panel, panel.right)}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt màn chơi"
        tabIndex={-1}
        data-play-panel=""
      >
        <header className={panel.head}>
          <h3>
            Cài đặt <small>· {mode === "pro" ? "Pro" : "Cơ bản"}</small>
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng cài đặt">
            <X size={18} />
          </button>
        </header>

        <div className={styles.settingsBody}>
          <section>
            <h4>
              <Gauge size={15} /> Tốc độ
            </h4>
            <Row label="Nhịp">
              <Segmented
                label="Nhịp học"
                value={settings.pace as string}
                options={paces}
                onChange={(pace) =>
                  pace !== "custom" && onChange({ pace: pace as PlaySettings["pace"] })
                }
              />
            </Row>
            <Row label="Đọc">
              <Segmented
                label="Tốc độ đọc"
                value={settings.rate}
                options={RATES.map((rate): [number, string] => [rate, `${rate}×`])}
                onChange={(rate) => onChange({ rate })}
              />
            </Row>
            <Row label="Phát">
              <Segmented
                label="Số lần phát"
                value={settings.repeat}
                options={[
                  [1, "1 lần"],
                  [2, "2 lần"],
                  [3, "3 lần"],
                ]}
                onChange={(repeat) => onChange({ repeat })}
              />
            </Row>
            <Row label="Đúng thì">
              <Segmented
                label="Tự sang câu"
                value={settings.autoNext}
                options={AUTO_NEXT_STEPS}
                onChange={(autoNext) => onChange({ autoNext })}
              />
            </Row>
          </section>

          <section>
            <h4>
              <Volume2 size={15} /> Giọng đọc
            </h4>
            <div className={panel.voice}>
              {source.voices.length ? (
                <select
                  className={panel.select}
                  aria-label="Người đọc"
                  value={source.voice}
                  onChange={(event) => source.onVoice(event.target.value)}
                >
                  {source.voices.map((voice) => (
                    <option key={voice.key} value={voice.key}>
                      {voice.flag} {voice.name} · {voice.accentLabel}
                    </option>
                  ))}
                </select>
              ) : (
                <Segmented
                  label="Giọng"
                  value={settings.accent}
                  options={ACCENTS}
                  onChange={(accent) => onChange({ accent })}
                />
              )}
              <button
                type="button"
                className={panel.iconButton}
                onClick={() => onPreview("normal")}
                aria-label="Nghe thử"
                title="Nghe thử"
              >
                <Play size={15} />
              </button>
            </div>
            <Toggle
              label="Tự phát khi sang câu"
              checked={settings.autoPlay}
              onChange={(autoPlay) => onChange({ autoPlay })}
            />
          </section>

          <section>
            <h4>
              <PencilLine size={15} /> Làm bài
            </h4>
            <Row label="Báo đúng sai">
              <Segmented
                label="Báo đúng sai"
                value={settings.liveCheck}
                options={LIVE_CHECKS}
                onChange={(liveCheck) => onChange({ liveCheck })}
              />
            </Row>
            <Row label="Hiện đáp án">
              <Segmented
                label="Tự hiện đáp án"
                value={settings.revealAfter}
                options={REVEAL_STEPS}
                onChange={(revealAfter) => onChange({ revealAfter })}
              />
            </Row>
            <Row label="Tiếng Việt">
              <Segmented
                label="Nghĩa tiếng Việt"
                value={settings.showMeaning}
                options={MEANING_MODES}
                onChange={(showMeaning) => onChange({ showMeaning })}
              />
            </Row>
            {!source.server && (
              <Toggle
                label="Hé chữ cái đầu mỗi từ"
                checked={settings.firstLetter}
                onChange={(firstLetter) => onChange({ firstLetter })}
              />
            )}
            <Toggle
              label="Phiên âm IPA khi xong câu"
              checked={settings.showIpa}
              onChange={(showIpa) => onChange({ showIpa })}
            />
          </section>

          <section>
            <h4>
              <Music2 size={15} /> Âm thanh
            </h4>
            {!sound.enabled && (
              <div className={styles.warn}>
                <span>Hiệu ứng đang tắt chung.</span>
                <button type="button" onClick={() => setSfxEnabled(true)}>
                  Bật lại
                </button>
              </div>
            )}
            <Toggle
              label="Tiếng gõ phím"
              checked={settings.typingSound}
              onChange={(typingSound) => onChange({ typingSound })}
            />
            <Toggle
              label="Âm báo đúng / sai"
              checked={settings.feedbackSound}
              onChange={(feedbackSound) => onChange({ feedbackSound })}
            />
            <Toggle
              label="Nhạc nền lofi"
              checked={settings.backgroundMusic}
              onChange={(backgroundMusic) => onChange({ backgroundMusic })}
            />
            <div className={styles.range}>
              <span>Âm lượng</span>
              <input
                type="range"
                aria-label="Âm lượng hiệu ứng"
                min="0.1"
                max="1"
                step="0.05"
                value={sound.volume}
                onChange={(event) => setSfxPrefs({ volume: Number(event.target.value) })}
                onMouseUp={() => playSfx("correct")}
              />
              <b>{Math.round(sound.volume * 100)}%</b>
            </div>
            <Row label="Kiểu âm báo">
              <Segmented
                label="Kiểu âm báo"
                value={sound.chime}
                options={CHIME_STYLES}
                onChange={(key) => {
                  setSfxPrefs({ chime: key });
                  playSfx("correct", { style: key });
                  setTimeout(() => playSfx("wrong", { style: key }), 650);
                }}
              />
            </Row>
          </section>

          <section>
            <h4>
              <Palette size={15} /> Giao diện
            </h4>
            <Row label="Màu">
              <Segmented
                label="Giao diện"
                value={settings.appearance}
                options={[
                  ["system", "Theo máy"],
                  ["light", "Sáng"],
                  ["dark", "Tối"],
                ]}
                onChange={(appearance) => onChange({ appearance })}
              />
            </Row>
            <Row label="Nền">
              <div className={panel.voice}>
                <Segmented
                  label="Kiểu nền"
                  value={settings.backdrop}
                  options={[
                    ["bubbles", "Bong bóng"],
                    ["video", "Video"],
                  ]}
                  onChange={(backdrop) => onChange({ backdrop })}
                />
                {hasVideo && (
                  <button
                    type="button"
                    className={panel.iconButton}
                    onClick={onShuffleScene}
                    aria-label="Đổi cảnh"
                    title="Đổi cảnh"
                  >
                    <Shuffle size={15} />
                  </button>
                )}
              </div>
            </Row>
            {settings.backdrop === "video" && videoError && (
              <small className={panel.note}>{videoError}</small>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

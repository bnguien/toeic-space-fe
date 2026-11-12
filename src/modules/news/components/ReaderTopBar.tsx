import {
  ArrowLeft,
  Clock,
  Columns2,
  Headphones,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Palette,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Rows3,
  Sun,
} from "lucide-react";

import { TOEIC_ACCENTS, voiceLabel, voiceRegion, type ReadAloud } from "../hooks/useReadAloud";
import type { BilingualLayout, TranslationMode } from "../types/news.types";
import { formatDuration, TRANSLATION_MODES, type ReaderPalette } from "../utils/news-reader";
import styles from "./ReaderTopBar.module.css";

const RATES = [0.75, 0.9, 1, 1.15, 1.3];

interface ReaderTopBarProps {
  readAloud: ReadAloud;
  sentenceCount: number;
  mode: TranslationMode;
  onModeChange: (mode: TranslationMode) => void;
  layout: BilingualLayout;
  onLayoutChange: (layout: BilingualLayout) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  palette: ReaderPalette;
  onShufflePalette: () => void;
  dark: boolean;
  onToggleDark: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  seconds: number;
  idle: boolean;
  percentRead: number;
  onBack: () => void;
}

/** Top bar: back · translation mode · layout · read-aloud player · font size, palette, dark, fullscreen, clock. */
export function ReaderTopBar({
  readAloud,
  sentenceCount,
  mode,
  onModeChange,
  layout,
  onLayoutChange,
  fontSize,
  onFontSizeChange,
  palette,
  onShufflePalette,
  dark,
  onToggleDark,
  fullscreen,
  onToggleFullscreen,
  seconds,
  idle,
  percentRead,
  onBack,
}: ReaderTopBarProps) {
  return (
    <header className={styles.bar}>
      <button
        type="button"
        className={styles.back}
        onClick={onBack}
        aria-label="Về danh sách bài báo"
      >
        <ArrowLeft size={18} />
      </button>
      <div className={styles.segment} role="radiogroup" aria-label="Chế độ dịch (phím T)">
        {TRANSLATION_MODES.map((x) => (
          <button
            key={x.key}
            type="button"
            role="radio"
            aria-checked={mode === x.key}
            className={mode === x.key ? styles.segmentActive : ""}
            onClick={() => onModeChange(x.key)}
          >
            {x.name}
          </button>
        ))}
      </div>
      {mode === "bilingual" && (
        <div className={styles.layout} role="radiogroup" aria-label="Bố cục song ngữ (phím L)">
          <button
            type="button"
            role="radio"
            aria-checked={layout === "inline"}
            className={layout === "inline" ? styles.segmentActive : ""}
            onClick={() => onLayoutChange("inline")}
            title="Dịch ngay dưới từng câu"
          >
            <Rows3 size={15} /> Dưới câu
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={layout === "columns"}
            className={layout === "columns" ? styles.segmentActive : ""}
            onClick={() => onLayoutChange("columns")}
            title="Hai cột: tiếng Anh | tiếng Việt"
          >
            <Columns2 size={15} /> Hai cột
          </button>
        </div>
      )}
      {readAloud.isSupported && (
        <div className={styles.player} aria-label="Đọc to bài báo">
          <button
            type="button"
            className={`${styles.play} ${readAloud.isReading ? styles.playActive : ""}`}
            onClick={readAloud.togglePlay}
            aria-label={readAloud.isReading ? "Dừng đọc (Space)" : "Đọc to bài (Space)"}
            title={readAloud.isReading ? "Dừng (Space)" : "Đọc to bài (Space)"}
          >
            {readAloud.isReading ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            type="button"
            onClick={() => readAloud.seek(-3)}
            aria-label="Lùi 3 giây"
            title="Lùi 3 giây (←)"
          >
            <RotateCcw size={15} />
            <small>3</small>
          </button>
          <button
            type="button"
            onClick={() => readAloud.seek(3)}
            aria-label="Tới 3 giây"
            title="Tới 3 giây (→)"
          >
            <RotateCw size={15} />
            <small>3</small>
          </button>
          <button
            type="button"
            onClick={readAloud.replaySentence}
            aria-label="Nghe lại câu"
            title="Nghe lại câu (R)"
          >
            <Headphones size={15} />
          </button>
          {readAloud.voices.length > 1 && (
            <select
              className={styles.voice}
              value={readAloud.voice}
              onChange={(e) => readAloud.changeVoice(e.target.value)}
              aria-label="Giọng đọc"
              title="Đổi giọng đọc"
            >
              {TOEIC_ACCENTS.map(([code, name]) => {
                const voices = readAloud.voices.filter((v) => voiceRegion(v) === code);
                return voices.length ? (
                  <optgroup key={code} label={`Giọng ${name}`}>
                    {voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {voiceLabel(v)}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          )}
          <select
            value={readAloud.rate}
            onChange={(e) => readAloud.changeRate(Number(e.target.value))}
            aria-label="Tốc độ đọc"
          >
            {RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
          <span className={styles.position}>
            Câu {readAloud.position.sentence + 1}/{sentenceCount}
          </span>
        </div>
      )}
      <span className={styles.gap} />
      <div className={styles.tools}>
        <div className={styles.font} aria-label="Cỡ chữ">
          <button
            type="button"
            onClick={() => onFontSizeChange(Math.max(15, fontSize - 1))}
            aria-label="Chữ nhỏ hơn"
          >
            <Minus size={14} />
          </button>
          <span>{fontSize}</span>
          <button
            type="button"
            onClick={() => onFontSizeChange(Math.min(26, fontSize + 1))}
            aria-label="Chữ to hơn"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          type="button"
          className={styles.icon}
          onClick={onShufflePalette}
          title={`Đổi bộ màu chữ (đang: ${palette.name})`}
          aria-label="Đổi bộ màu chữ"
        >
          <Palette size={17} />
          <i className={styles.swatch} />
        </button>
        <button
          type="button"
          className={styles.icon}
          onClick={onToggleDark}
          title={dark ? "Chế độ sáng" : "Chế độ tối"}
          aria-label={dark ? "Chế độ sáng" : "Chế độ tối"}
          aria-pressed={dark}
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          type="button"
          className={`${styles.icon} ${styles.fullscreenButton}`}
          onClick={onToggleFullscreen}
          title={fullscreen ? "Thoát toàn màn hình (F)" : "Toàn màn hình (F)"}
          aria-label="Toàn màn hình"
          aria-pressed={fullscreen}
        >
          {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
        <span
          className={`${styles.clock} ${idle ? styles.clockPaused : ""}`}
          title="Thời gian đọc thực (tự dừng khi bạn rời bàn)"
        >
          <Clock size={14} /> {formatDuration(seconds)}
        </span>
      </div>
      <span className={styles.progress} style={{ width: `${percentRead}%` }} aria-hidden="true" />
    </header>
  );
}

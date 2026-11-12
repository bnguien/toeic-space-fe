// Body of "Cài đặt đọc" — shared by the bottom sheet (narrow screens) and the left tray of the reader (wide screens).
// Pure presentation: values come in through `value`, changes go out through onChange(key, value); the reader keeps
// the state and persists it.
import {
  FONT_SIZES,
  READER_THEMES,
  type ReaderSettingKey,
  type ReaderSettings,
} from "../utils/subtitle-reading";
import styles from "./ReadingSettingsBody.module.css";

interface SwitchProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
}

function Switch({ checked, onToggle, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.switch} ${checked ? styles.on : ""}`}
      onClick={onToggle}
    >
      <span className={styles.knob} />
    </button>
  );
}

interface SwitchRowProps {
  title: string;
  description?: string;
  note?: string;
  checked: boolean;
  onToggle: () => void;
}

function SwitchRow({ title, description, checked, onToggle, note }: SwitchRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <div className={styles.rowTitle}>{title}</div>
        {description && <div className={styles.rowDesc}>{description}</div>}
        {note && <div className={styles.rowNote}>{note}</div>}
      </div>
      <Switch checked={checked} onToggle={onToggle} label={title} />
    </div>
  );
}

interface SegmentedProps {
  items: readonly { key: string; label: string }[];
  value: string;
  onPick: (key: string) => void;
}

function Segmented({ items, value, onPick }: SegmentedProps) {
  return (
    <div className={styles.seg}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`${styles.segBtn} ${value === it.key ? styles.active : ""}`}
          onClick={() => onPick(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export interface ReadingSettingsBodyProps {
  value: ReaderSettings;
  onChange: <K extends ReaderSettingKey>(key: K, value: ReaderSettings[K]) => void;
  saveWordsReady?: boolean;
  /** Settings that do nothing on this device (e.g. `hoverGloss` on touch screens): hidden, not disabled. */
  hiddenKeys?: readonly string[];
}

export function ReadingSettingsBody({
  value,
  onChange,
  saveWordsReady = false,
  hiddenKeys = [],
}: ReadingSettingsBodyProps) {
  const isShown = (key: ReaderSettingKey) => !hiddenKeys.includes(key);
  const theme = value.theme || "paper";

  return (
    <div className={styles.body}>
      {isShown("theme") && (
        <div className={styles.block}>
          <div className={styles.blockTitle}>Bộ màu</div>
          <div className={styles.blockDesc}>
            Màu dịu, đã cân độ tương phản để đọc lâu không chói. Hai bộ cuối cho buổi tối.
          </div>
          <div className={styles.swatches} role="radiogroup" aria-label="Bộ màu">
            {READER_THEMES.map((t) => {
              const on = theme === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`${styles.swatch} ${on ? styles.active : ""}`}
                  onClick={() => onChange("theme", t.key)}
                >
                  <span
                    className={styles.swatchSample}
                    style={{ background: t.bg, color: t.ink }}
                    aria-hidden="true"
                  >
                    Aa
                    <i style={{ background: t.accent }} />
                  </span>
                  <span className={styles.swatchName}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.block}>
        <div className={styles.blockTitle}>Cỡ chữ</div>
        <div className={styles.blockDesc}>Phóng to hoặc thu nhỏ chữ phụ đề.</div>
        <Segmented
          items={FONT_SIZES}
          value={value.fontSize}
          onPick={(k) => onChange("fontSize", k as ReaderSettings["fontSize"])}
        />
      </div>

      <div className={styles.sep} />

      {isShown("pauseEachSentence") && (
        <SwitchRow
          title="Dừng sau mỗi câu"
          description="Chế độ Từng câu tự dừng ở cuối câu, bấm phát để nghe câu kế. Điền từ luôn dừng để bạn gõ."
          checked={!!value.pauseEachSentence}
          onToggle={() => onChange("pauseEachSentence", !value.pauseEachSentence)}
        />
      )}

      <SwitchRow
        title="Hiện phiên âm"
        description="Phiên âm IPA hiển thị phía trên mỗi từ."
        checked={!!value.showPhonetic}
        onToggle={() => onChange("showPhonetic", !value.showPhonetic)}
      />

      <SwitchRow
        title="Hiện từ vựng quan trọng"
        description="Nghĩa ngắn dưới các từ TOEIC/B2/C1+ (chế độ Từng câu, Điền từ)."
        checked={!!value.showGloss}
        onToggle={() => onChange("showGloss", !value.showGloss)}
      />

      <SwitchRow
        title="Hiện bản dịch câu"
        description="Bản dịch trọn câu dưới mỗi đoạn."
        checked={!!value.showTranslation}
        onToggle={() => onChange("showTranslation", !value.showTranslation)}
      />

      <SwitchRow
        title="Đánh dấu từ đã lưu"
        description="Chấm vàng nhỏ trên những từ bạn đã thêm vào sổ từ vựng."
        note={saveWordsReady ? "" : "Chưa dùng được: tính năng lưu thẻ chưa bật."}
        checked={!!value.markSavedWords}
        onToggle={() => onChange("markSavedWords", !value.markSavedWords)}
      />

      {isShown("hoverGloss") && (
        <SwitchRow
          title="Hiện nghĩa khi trỏ chuột"
          description="Trỏ vào từ là hiện nghĩa ngay tại chỗ đó, không phải nhìn sang nơi khác."
          checked={!!value.hoverGloss}
          onToggle={() => onChange("hoverGloss", !value.hoverGloss)}
        />
      )}

      <SwitchRow
        title="Hiện phụ đề trên video"
        description="Vẽ thêm phụ đề đè lên video. Thường không cần vì transcript đã là nơi đọc chính."
        checked={!!value.showVideoOverlay}
        onToggle={() => onChange("showVideoOverlay", !value.showVideoOverlay)}
      />

      <SwitchRow
        title="Phóng video lấp đầy khung"
        description="Video được kéo giãn để lấp đầy khung (hai bên bị cắt bớt). Nếu tắt, video hiện đầy đủ với viền đen hai bên."
        checked={!!value.zoomVideo}
        onToggle={() => onChange("zoomVideo", !value.zoomVideo)}
      />
    </div>
  );
}

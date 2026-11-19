import type { ReactNode } from "react";
import {
  AudioLines,
  Check,
  Image,
  Layers,
  Lightbulb,
  Music2,
  Play,
  Shuffle,
  SunMoon,
  Timer,
  type LucideIcon,
} from "lucide-react";

import {
  Button,
  ChoiceGrid,
  Kbd,
  Segmented,
  Sheet,
  Switch,
  type ChoiceOption,
} from "@/shared/components/ui";
import { useColorMode, type ColorModePreference } from "@/shared/hooks/useColorMode";
import { sfx } from "@/shared/utils/sfx";

import { useStudySettings } from "../hooks/useStudySettings";
import {
  CARD_STYLES,
  CHIME_STYLES,
  QUIZ_SECONDS,
  REEL_SECONDS,
  TICK_STYLES,
  type CardStyle,
  type ChimeStyle,
  type StudyBackdropKind,
  type StudyLayout,
  type StudySettingsDto,
  type TickStyle,
} from "../types/vocabulary.types";
import { CARD_HUES } from "../utils/card-themes";
import { CardSwatch } from "./StudyCard";
import styles from "./StudySettingsSheet.module.css";

const TICK_LABELS: Record<TickStyle, string> = {
  wood: "Đồng hồ gỗ",
  mechanical: "Đồng hồ cơ",
  wall: "Đồng hồ treo",
  digital: "Bíp điện tử",
  drop: "Giọt nước",
  drum: "Nhịp trống",
  heart: "Nhịp tim",
  off: "Im lặng",
};

const CHIME_LABELS: Record<ChimeStyle, string> = {
  bell: "Chuông",
  game: "8-bit",
  soft: "Nhẹ nhàng",
};

const CARD_STYLE_LABELS: Record<CardStyle, string> = {
  stage: "Sắc màu",
  pastel: "Pastel",
  night: "Đêm",
};

const seconds = (value: number) => (value === 0 ? "Tắt" : `${value} giây`);

interface StudySettingsSheetProps {
  open: boolean;
  onClose: () => void;
  /** Shows "Đổi cảnh" while a video backdrop plays. */
  onShuffleScene?: () => void;
  /** The screen fits a landscape stage (the "Khung" row is hidden otherwise). */
  canLandscape?: boolean;
}

/** Study settings, persisted in `preferences.study`. Opening it pauses timed cards. */
export function StudySettingsSheet({
  open,
  onClose,
  onShuffleScene,
  canLandscape = false,
}: StudySettingsSheetProps) {
  const { settings, autoPlayAudio, change, update } = useStudySettings();
  const colorMode = useColorMode();

  const set = <K extends keyof StudySettingsDto>(key: K, value: StudySettingsDto[K]) =>
    change({ [key]: value } as Partial<StudySettingsDto>);

  const preview = (playing: boolean) =>
    playing ? <Check size={14} /> : <Play size={12} className={styles.play} />;

  const tickOptions: ChoiceOption<TickStyle>[] = TICK_STYLES.map((value) => ({
    value,
    label: TICK_LABELS[value],
    icon: preview(settings.tickStyle === value),
  }));
  const chimeOptions: ChoiceOption<ChimeStyle>[] = CHIME_STYLES.map((value) => ({
    value,
    label: CHIME_LABELS[value],
    icon: preview(settings.chimeStyle === value),
  }));
  const cardOptions: ChoiceOption<CardStyle>[] = CARD_STYLES.map((value) => ({
    value,
    label: CARD_STYLE_LABELS[value],
    icon: (
      <span className={styles.strip} aria-hidden="true">
        {CARD_HUES.map((hue) => (
          <CardSwatch key={hue} cardStyle={value} hue={hue} />
        ))}
      </span>
    ),
  }));

  return (
    <Sheet open={open} title="Cài đặt" containKeys onClose={onClose}>
      <div className={styles.sections}>
        <Section icon={Timer} title="Thời gian">
          <Row label="Reel">
            <Segmented
              size="sm"
              label="Thời gian Reel"
              value={String(settings.reelSeconds)}
              options={REEL_SECONDS.map((value) => ({
                value: String(value),
                label: seconds(value),
              }))}
              onChange={(value) =>
                set("reelSeconds", Number(value) as StudySettingsDto["reelSeconds"])
              }
            />
          </Row>
          <Row label="Trắc nghiệm">
            <Segmented
              size="sm"
              label="Thời gian trắc nghiệm"
              value={String(settings.quizSeconds)}
              options={QUIZ_SECONDS.map((value) => ({
                value: String(value),
                label: seconds(value),
              }))}
              onChange={(value) =>
                set("quizSeconds", Number(value) as StudySettingsDto["quizSeconds"])
              }
            />
          </Row>
        </Section>

        <Section icon={Lightbulb} title="Gợi ý">
          <Switch
            label="Chữ cái đầu"
            checked={settings.hintFirstLetter}
            onChange={(value) => set("hintFirstLetter", value)}
          />
          <Switch
            label="Gợi ý dần"
            checked={settings.hintProgressive}
            onChange={(value) => set("hintProgressive", value)}
          />
        </Section>

        <Section icon={AudioLines} title="Giọng đọc">
          <Switch
            label="Tự phát âm"
            checked={autoPlayAudio}
            onChange={(value) => update({ autoPlayAudio: value })}
          />
          <Switch
            label="Đọc nghĩa tiếng Việt"
            checked={settings.speakMeaning}
            onChange={(value) => set("speakMeaning", value)}
          />
        </Section>

        <Section icon={Layers} title="Thẻ">
          {canLandscape && (
            <Row label="Khung">
              <Segmented<StudyLayout>
                size="sm"
                label="Khung học"
                value={settings.layout}
                options={[
                  { value: "portrait", label: "Dọc" },
                  { value: "landscape", label: "Ngang" },
                ]}
                onChange={(value) => set("layout", value)}
              />
            </Row>
          )}
          <Row label="Mặt trước">
            <Segmented
              size="sm"
              label="Mặt trước thẻ"
              value={settings.flashcardFront}
              options={[
                { value: "word", label: "Từ" },
                { value: "meaning", label: "Nghĩa" },
              ]}
              onChange={(value) => set("flashcardFront", value)}
            />
          </Row>
          <Switch
            label="Ví dụ"
            checked={settings.showExample}
            onChange={(value) => set("showExample", value)}
          />
          <span className={styles.label}>Màu thẻ</span>
          <ChoiceGrid
            label="Màu thẻ"
            columns={3}
            layout="stack"
            options={cardOptions}
            value={settings.cardStyle}
            onChange={(value) => set("cardStyle", value)}
          />
        </Section>

        <Section icon={Music2} title="Âm thanh">
          <Switch label="Hiệu ứng" checked={settings.sfx} onChange={(value) => set("sfx", value)} />
          <label className={styles.range}>
            <span>Âm lượng</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              disabled={!settings.sfx}
              onChange={(event) => set("sfxVolume", Number(event.target.value))}
              onPointerUp={() => sfx.play("correct")}
            />
            <b>{Math.round(settings.sfxVolume * 100)}%</b>
          </label>
          <span className={styles.label}>Đếm ngược</span>
          <ChoiceGrid
            label="Tiếng đếm ngược"
            options={tickOptions}
            value={settings.tickStyle}
            disabled={!settings.sfx}
            onChange={(value) => {
              set("tickStyle", value);
              sfx.previewTick(value);
            }}
          />
          <span className={styles.label}>Đúng / sai</span>
          <ChoiceGrid
            label="Âm báo đúng sai"
            columns={3}
            options={chimeOptions}
            value={settings.chimeStyle}
            disabled={!settings.sfx}
            onChange={(value) => {
              set("chimeStyle", value);
              sfx.previewChime(value);
            }}
          />
        </Section>

        <Section icon={SunMoon} title="Giao diện">
          <Segmented<ColorModePreference>
            size="sm"
            label="Giao diện"
            value={colorMode.preference}
            options={[
              { value: "system", label: "Theo máy" },
              { value: "light", label: "Sáng" },
              { value: "dark", label: "Tối" },
            ]}
            onChange={colorMode.setPreference}
          />
        </Section>

        <Section icon={Image} title="Nền">
          <div className={styles.inline}>
            <Segmented<StudyBackdropKind>
              size="sm"
              label="Kiểu nền"
              value={settings.backdrop}
              options={[
                { value: "video", label: "Video" },
                { value: "ambient", label: "Màu nhẹ" },
              ]}
              onChange={(value) => set("backdrop", value)}
            />
            {settings.backdrop === "video" && onShuffleScene && (
              <Button
                size="sm"
                variant="outline"
                icon={<Shuffle size={14} />}
                trailing={<Kbd>C</Kbd>}
                onClick={onShuffleScene}
              >
                Đổi cảnh
              </Button>
            )}
          </div>
        </Section>
      </div>
    </Sheet>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>
        <Icon size={15} />
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      {children}
    </div>
  );
}

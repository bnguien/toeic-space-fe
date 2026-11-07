import { useState, type MouseEvent } from "react";
import { Volume2 } from "lucide-react";

import { IconButton, cx, type ControlSize } from "@/shared/components/ui";

import { speak, type SpeechLang } from "../utils/speech";
import styles from "./AudioButton.module.css";

interface AudioButtonProps {
  text: string;
  lang?: SpeechLang;
  size?: ControlSize;
  label?: string;
  className?: string;
}

export function AudioButton({
  text,
  lang = "en-US",
  size = "sm",
  label,
  className,
}: AudioButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const started = speak(text, lang, { onEnd: () => setSpeaking(false) });
    setSpeaking(started);
  };

  return (
    <IconButton
      label={label ?? `Phát âm ${text}`}
      size={size}
      className={cx(styles.button, className)}
      data-speaking={speaking || undefined}
      onClick={handleClick}
    >
      <Volume2 size={size === "lg" ? 22 : 18} />
    </IconButton>
  );
}

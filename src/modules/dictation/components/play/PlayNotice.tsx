import { ArrowLeft, RefreshCw } from "lucide-react";

import { cx } from "@/shared/components/ui";

import { MASCOT } from "../../utils/mascot";
import buttons from "./PlayButtons.module.css";
import styles from "./PlayNotice.module.css";
import theme from "./PlayTheme.module.css";

export interface PlayNoticeProps {
  loading?: boolean;
  message: string;
  onBack?: () => void;
  onRetry?: () => void;
}

/** Full-screen waiting / error screen shared by the pages wrapping the play session. */
export function PlayNotice({ loading, message, onBack, onRetry }: PlayNoticeProps) {
  return (
    <div className={cx(theme.theme, styles.notice)}>
      {loading ? (
        <RefreshCw size={34} className={buttons.spin} />
      ) : (
        <img src={MASCOT.thinking} alt="" />
      )}
      <p className={styles.message}>{message}</p>
      <div className={buttons.actions}>
        {onRetry && (
          <button type="button" className={cx(buttons.button, buttons.primary)} onClick={onRetry}>
            <RefreshCw size={16} /> Thử lại
          </button>
        )}
        {onBack && (
          <button type="button" className={buttons.button} onClick={onBack}>
            <ArrowLeft size={16} /> Về bản đồ
          </button>
        )}
      </div>
    </div>
  );
}

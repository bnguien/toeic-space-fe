import { X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { GRAMMAR_STORAGE_KEYS } from "../../utils/storage-keys";
import styles from "./LoginInvite.module.css";

const readInviteHidden = (): boolean => {
  try {
    return localStorage.getItem(GRAMMAR_STORAGE_KEYS.hideLoginInvite) === "1";
  } catch {
    return false;
  }
};

/** Thin line inviting guests to sign in (can be hidden; the choice is remembered). */
export function LoginInvite({ isGuest }: { isGuest: boolean | undefined }) {
  const [hidden, setHidden] = useState(readInviteHidden);
  const location = useLocation();
  if (!isGuest || hidden) return null;
  const next = `${location.pathname}${location.search}`;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(GRAMMAR_STORAGE_KEYS.hideLoginInvite, "1");
    } catch {
      /* hidden for this visit only */
    }
  };
  return (
    <p className={styles.invite}>
      <span>
        <Link to={`/login?next=${encodeURIComponent(next)}`}>Đăng nhập</Link> để lưu tiến độ
      </span>
      <button type="button" onClick={dismiss} aria-label="Ẩn lời mời đăng nhập">
        <X size={14} />
      </button>
    </p>
  );
}

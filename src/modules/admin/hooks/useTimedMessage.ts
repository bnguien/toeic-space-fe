import { useEffect, useState } from "react";

export function useTimedMessage(duration = 5000) {
  const [notice, setNotice] = useState<{ text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), duration);
    return () => window.clearTimeout(timer);
  }, [notice, duration]);

  const setMessage = (text: string) => setNotice(text ? { text } : null);
  return [notice?.text ?? "", setMessage] as const;
}

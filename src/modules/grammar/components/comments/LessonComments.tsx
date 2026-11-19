/**
 * Comment panel of the topic document (target `topic-04:document`): header · own scrolling list · composer stuck to the bottom. One level of replies; guests read,
 * sending invites them to sign in. Newest first; a sent comment is inserted at the top right away.
 * `focusId` (opened from a link, `?bl=`): once loaded, scrolls to that comment and highlights it — a reply outside the
 * preview loads the replies of hidden threads until found. Port of Studychill `LessonComments.jsx`.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CornerDownRight,
  Heart,
  Loader2,
  MessageSquare,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { isAxiosError } from "axios";

import { useCurrentUser } from "@/modules/auth";

import { grammarApi } from "../../api/grammar.api";
import type { CommentDto } from "../../types/grammar.types";
import { cx } from "../../utils/cx";
import { relativeTime, useNow } from "../../utils/relative-time";
import kit from "../shared/GrammarKit.module.css";
import styles from "./LessonComments.module.css";

const MAX = 1500;

export type LessonCommentsVariant = "drawer" | "flush";

interface ComposerProps {
  isGuest: boolean | undefined;
  onSend: (content: string, parentId: string | null) => Promise<void>;
  replyTo: CommentDto | null;
  onCancelReply: () => void;
}

function sendError(err: unknown): string {
  if (isAxiosError(err) && err.response) {
    const data = err.response.data as { detail?: unknown } | undefined;
    if (typeof data?.detail === "string" && data.detail) return data.detail;
  }
  return "Chưa gửi được, thử lại nhé.";
}

function Composer({ isGuest, onSend, replyTo, onCancelReply }: ComposerProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyTo) ref.current?.focus();
  }, [replyTo]);

  if (isGuest) {
    const next =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search + window.location.hash
        : "/games/grammar";
    return (
      <div className={cx(styles.compose, styles.composeGuest)}>
        <Link to={`/login?next=${encodeURIComponent(next)}`}>Đăng nhập</Link> để bình luận, hỏi bài
        cùng mọi người.
      </div>
    );
  }

  const send = async () => {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSend(content, replyTo?.id || null);
      setText("");
      if (ref.current) ref.current.style.height = "auto";
      onCancelReply();
    } catch (err) {
      setError(sendError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.compose}>
      {replyTo && (
        <p className={styles.replying}>
          <CornerDownRight size={13} /> Trả lời <b>{replyTo.author.name}</b>
          <button type="button" onClick={onCancelReply} aria-label="Huỷ trả lời">
            <X size={13} />
          </button>
        </p>
      )}
      <div className={styles.field}>
        <textarea
          ref={ref}
          rows={1}
          value={text}
          maxLength={MAX}
          placeholder={replyTo ? "Viết câu trả lời…" : "Viết bình luận, hỏi chỗ chưa hiểu…"}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          className={styles.send}
          onClick={() => void send()}
          disabled={!text.trim() || busy}
          aria-label="Gửi bình luận"
        >
          {busy ? <Loader2 size={17} className={kit.spin} /> : <SendHorizontal size={17} />}
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const initialOf = (name: string): string => (name.trim()[0] || "?").toLocaleUpperCase("vi-VN");

interface CommentItemProps {
  c: CommentDto;
  now: number;
  isGuest: boolean | undefined;
  onReply: (c: CommentDto) => void;
  onDelete: (c: CommentDto) => void;
  onLike: (c: CommentDto) => void;
  child?: boolean;
  focus: boolean;
}

function CommentItem({
  c,
  now,
  isGuest,
  onReply,
  onDelete,
  onLike,
  child = false,
  focus,
}: CommentItemProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div
      className={cx(styles.item, child && styles.isReply, focus && styles.isFocus)}
      data-comment={c.id}
    >
      <span className={styles.face} aria-hidden="true">
        {initialOf(c.author.name)}
      </span>
      <div className={styles.main}>
        <div className={styles.bubble}>
          <span className={styles.name}>{c.author.name}</span>
          <p className={styles.text}>{c.content}</p>
        </div>
        <div className={styles.meta}>
          <span>{relativeTime(c.createdAt, now)}</span>
          <button
            type="button"
            className={c.liked ? styles.isLiked : undefined}
            onClick={() => onLike(c)}
            disabled={isGuest}
          >
            <Heart size={12} fill={c.liked ? "currentColor" : "none"} />{" "}
            {c.likes > 0 ? c.likes : "Thích"}
          </button>
          {!isGuest && (
            <button type="button" onClick={() => onReply(c)}>
              Trả lời
            </button>
          )}
          {c.mine &&
            (confirming ? (
              <span className={styles.confirm}>
                Xoá?
                <button type="button" onClick={() => onDelete(c)}>
                  Xoá
                </button>
                <button type="button" onClick={() => setConfirming(false)}>
                  Thôi
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} aria-label="Xoá bình luận">
                <Trash2 size={12} />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

interface ListState {
  target: string | null;
  items: CommentDto[];
  next: string | null;
  total: number;
  loading: boolean;
  error: boolean;
}

export interface LessonCommentsProps {
  target: string;
  /** true = guest (read only), undefined = session still resolving. */
  isGuest: boolean | undefined;
  title?: string;
  onClose?: () => void;
  className?: string;
  /** Root or reply id to scroll to and highlight (opened from `?bl=`). */
  focusId?: string | null;
  /** drawer = fixed right drawer; flush = fills a host panel without frame. */
  variant?: LessonCommentsVariant;
}

const mapAll = (items: CommentDto[], fn: (c: CommentDto) => CommentDto): CommentDto[] =>
  items.map((r) => ({ ...fn(r), replies: (r.replies || []).map(fn) }));

export function LessonComments({
  target,
  isGuest,
  title = "Bình luận",
  onClose,
  className,
  focusId = null,
  variant,
}: LessonCommentsProps) {
  const user = useCurrentUser();
  const [state, setState] = useState<ListState>({
    target: null,
    items: [],
    next: null,
    total: 0,
    loading: true,
    error: false,
  });
  const [replyTo, setReplyTo] = useState<CommentDto | null>(null);
  const [replyFor, setReplyFor] = useState(target);
  const [moreBusy, setMoreBusy] = useState(false);
  const now = useNow();
  const current: ListState =
    state.target === target
      ? state
      : { target, items: [], next: null, total: 0, loading: true, error: false };

  // Changing target drops the reply in progress (Studychill reset it when the target changed).
  if (replyFor !== target) {
    setReplyFor(target);
    setReplyTo(null);
  }

  useEffect(() => {
    let alive = true;
    grammarApi
      .getComments(target)
      .then((d) => {
        if (alive)
          setState({
            target,
            items: d.items,
            next: d.next,
            total: d.total,
            loading: false,
            error: false,
          });
      })
      .catch(() => {
        if (alive)
          setState({ target, items: [], next: null, total: 0, loading: false, error: true });
      });
    return () => {
      alive = false;
    };
  }, [target]);

  const patch = (fn: (s: ListState) => ListState) =>
    setState((s) => (s.target === target ? fn(s) : s));

  const send = async (content: string, parentId: string | null) => {
    const c = await grammarApi.postComment(target, content, parentId, user?.fullName || undefined);
    patch((s) => {
      if (!c.parentId)
        return { ...s, items: [{ ...c, replies: [] }, ...s.items], total: s.total + 1 };
      return {
        ...s,
        total: s.total + 1,
        items: s.items.map((r) =>
          r.id === c.parentId
            ? { ...r, replyCount: r.replyCount + 1, replies: [...(r.replies || []), c] }
            : r,
        ),
      };
    });
  };

  const remove = async (c: CommentDto) => {
    await grammarApi.deleteComment(c.id).catch(() => null);
    patch((s) => {
      if (!c.parentId) {
        return {
          ...s,
          items: s.items.filter((r) => r.id !== c.id),
          total: Math.max(0, s.total - 1 - (c.replyCount || 0)),
        };
      }
      return {
        ...s,
        total: Math.max(0, s.total - 1),
        items: s.items.map((r) =>
          r.id === c.parentId
            ? {
                ...r,
                replyCount: r.replyCount - 1,
                replies: (r.replies || []).filter((x) => x.id !== c.id),
              }
            : r,
        ),
      };
    });
  };

  const like = async (c: CommentDto) => {
    const on = !c.liked;
    const flip = (x: CommentDto) =>
      x.id === c.id ? { ...x, liked: on, likes: Math.max(0, x.likes + (on ? 1 : -1)) } : x;
    patch((s) => ({ ...s, items: mapAll(s.items, flip) }));
    try {
      const r = await grammarApi.likeComment(c.id, on);
      patch((s) => ({
        ...s,
        items: mapAll(s.items, (x) =>
          x.id === c.id ? { ...x, liked: r.liked, likes: r.likes } : x,
        ),
      }));
    } catch {
      patch((s) => ({
        ...s,
        items: mapAll(s.items, (x) =>
          x.id === c.id ? { ...x, liked: c.liked, likes: c.likes } : x,
        ),
      }));
    }
  };

  const loadMore = async () => {
    if (!current.next || moreBusy) return;
    setMoreBusy(true);
    try {
      const d = await grammarApi.getComments(target, current.next);
      patch((s) => ({ ...s, items: [...s.items, ...d.items], next: d.next }));
    } catch {
      /* keep what is shown; the button stays */
    } finally {
      setMoreBusy(false);
    }
  };

  const loadReplies = async (root: CommentDto) => {
    const replies = await grammarApi.getCommentReplies(root.id).catch(() => null);
    if (replies)
      patch((s) => ({
        ...s,
        items: s.items.map((r) => (r.id === root.id ? { ...r, replies } : r)),
      }));
  };

  const rootOf = (c: CommentDto): CommentDto | null =>
    c.parentId ? current.items.find((r) => r.id === c.parentId) || null : c;

  // Opened from a link: scroll to `focusId`; not visible yet → load the replies of hidden threads (6 threads max).
  const listRef = useRef<HTMLDivElement>(null);
  const tried = useRef(new Set<string>());
  const focusKey = focusId == null ? null : String(focusId);
  const found =
    focusKey != null &&
    current.items.some(
      (r) => r.id === focusKey || (r.replies || []).some((x) => x.id === focusKey),
    );
  useEffect(() => {
    if (focusKey == null || current.loading) return undefined;
    if (found) {
      const t = setTimeout(
        () =>
          listRef.current
            ?.querySelector(`[data-comment="${CSS.escape(focusKey)}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        120,
      );
      return () => clearTimeout(t);
    }
    const hidden = current.items.find(
      (r) => r.replyCount > (r.replies || []).length && !tried.current.has(r.id),
    );
    if (hidden && tried.current.size < 6) {
      tried.current.add(hidden.id);
      grammarApi
        .getCommentReplies(hidden.id)
        .then((replies) =>
          setState((s) =>
            s.target === target
              ? { ...s, items: s.items.map((r) => (r.id === hidden.id ? { ...r, replies } : r)) }
              : s,
          ),
        )
        .catch(() => {});
    }
    return undefined;
  }, [focusKey, found, current.loading, current.items, target]);

  return (
    <aside
      className={cx(
        styles.cmt,
        variant === "drawer" && styles.drawer,
        variant === "flush" && styles.flush,
        className,
      )}
      aria-label={title}
    >
      <header className={styles.head}>
        <MessageSquare size={16} />
        <b>{title}</b>
        <span className={styles.count}>{current.total}</span>
        {onClose && (
          <button type="button" className={styles.x} onClick={onClose} aria-label="Đóng bình luận">
            <X size={16} />
          </button>
        )}
      </header>
      <div className={styles.list} ref={listRef}>
        {current.loading && (
          <p className={styles.note}>
            <Loader2 size={15} className={kit.spin} /> Đang tải bình luận…
          </p>
        )}
        {current.error && (
          <p className={styles.note}>Chưa tải được bình luận, thử tải lại trang nhé.</p>
        )}
        {!current.loading && !current.error && current.items.length === 0 && (
          <p className={styles.empty}>
            Chưa có bình luận nào.
            <br />
            Chỗ nào chưa hiểu, hỏi ngay ở đây nhé!
          </p>
        )}
        {current.items.map((r) => (
          <div key={r.id} className={styles.thread}>
            <CommentItem
              c={r}
              now={now}
              isGuest={isGuest}
              onReply={setReplyTo}
              onDelete={(c) => void remove(c)}
              onLike={(c) => void like(c)}
              focus={r.id === focusKey}
            />
            {(r.replies || []).map((x) => (
              <CommentItem
                key={x.id}
                c={x}
                now={now}
                isGuest={isGuest}
                child
                onReply={(c) => setReplyTo(rootOf(c))}
                onDelete={(c) => void remove(c)}
                onLike={(c) => void like(c)}
                focus={x.id === focusKey}
              />
            ))}
            {r.replyCount > (r.replies || []).length && (
              <button
                type="button"
                className={styles.moreReplies}
                onClick={() => void loadReplies(r)}
              >
                <CornerDownRight size={13} /> Xem {r.replyCount - (r.replies || []).length} trả lời
                nữa
              </button>
            )}
          </div>
        ))}
        {current.next && (
          <button
            type="button"
            className={styles.more}
            onClick={() => void loadMore()}
            disabled={moreBusy}
          >
            {moreBusy ? "Đang tải…" : "Xem bình luận cũ hơn"}
          </button>
        )}
      </div>
      <Composer
        isGuest={isGuest}
        onSend={send}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </aside>
  );
}

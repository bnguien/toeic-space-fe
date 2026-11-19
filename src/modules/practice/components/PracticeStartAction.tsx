import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { LoaderCircle, Play } from "lucide-react";
import { useCurrentUser, useAuthStore } from "@/modules/auth";
import { Button, ButtonLink } from "@/modules/admin";
import { attemptsApi } from "../api/attempts.api";
import styles from "./Attempt.module.css";

class OpenAttemptError extends Error {
  readonly reason: "timeout" | "cancelled" | "account_changed" | "unavailable";

  constructor(reason: OpenAttemptError["reason"]) {
    super(reason);
    this.reason = reason;
  }
}

function openingMessage(error: unknown) {
  if (error instanceof OpenAttemptError) {
    if (error.reason === "cancelled") return "Đã hủy mở bài. Tiến trình đã lưu vẫn được giữ.";
    if (error.reason === "account_changed") return "Phiên đăng nhập đã thay đổi. Hãy thử lại.";
    if (error.reason === "unavailable") return "Bộ luyện tập không còn khả dụng.";
    return "Chuẩn bị bài mất quá nhiều thời gian. Hãy thử lại để kiểm tra và tiếp tục bài đang làm.";
  }
  if (isAxiosError(error)) {
    if (error.response?.data?.code === "media_preservation_failed") {
      const reason = error.response.data.reason;
      if (
        reason === "storage_configuration" ||
        reason === "storage_bucket_missing" ||
        reason === "storage_endpoint_invalid" ||
        reason === "storage_credentials_missing" ||
        reason === "source_configuration" ||
        reason === "untrusted_or_invalid_source" ||
        reason === "storage_http_403" ||
        reason === "storage_http_404"
      )
        return "Cấu hình lưu trữ hoặc nguồn media của bài chưa hợp lệ. Vui lòng báo cho quản trị viên.";
      if (reason === "source_http_404" || reason === "source_http_410")
        return "Nguồn hình ảnh hoặc âm thanh của bài không còn tồn tại. Vui lòng báo cho giáo viên.";
      if (reason === "source_http_401" || reason === "source_http_403")
        return "Không có quyền truy cập nguồn hình ảnh hoặc âm thanh của bài. Vui lòng báo cho giáo viên.";
      if (
        reason === "unrecognized_media_content" ||
        reason === "empty_media" ||
        reason === "incomplete_source_media" ||
        reason === "media_too_large" ||
        reason === "invalid_source_redirect" ||
        reason === "invalid_source_response"
      )
        return "Có hình ảnh hoặc âm thanh không hợp lệ trong bộ luyện tập. Vui lòng báo cho giáo viên.";
      if (reason === "media_timeout")
        return "Chuẩn bị media chưa hoàn tất. Hãy thử mở lại; các tệp đã chuẩn bị sẽ được kiểm tra để tái sử dụng.";
      return "Chưa chuẩn bị được hình ảnh hoặc âm thanh của bài. Hãy thử lại sau ít phút.";
    }
    if (error.response?.status === 401) return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
    if (error.response?.status === 409)
      return "Bài luyện tập đã thay đổi ở phiên khác. Hãy thử lại để mở bài mới nhất.";
    if (error.response?.status === 404) return "Bộ luyện tập hoặc bài đang làm không còn khả dụng.";
  }
  return "Không mở được bài. Kiểm tra kết nối mạng rồi thử lại; tiến trình đã lưu vẫn được giữ.";
}

export function PracticeStartAction({
  setId,
  canStart = true,
}: {
  setId: string;
  canStart?: boolean;
}) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const client = useQueryClient();
  const operation = useRef<((reason: OpenAttemptError["reason"]) => void) | null>(null);
  useEffect(() => () => operation.current?.("account_changed"), [setId, user?.id]);
  const active = useQuery({
    queryKey: ["practice-attempt-active", user?.id, setId],
    enabled: user?.role === "User",
    queryFn: ({ signal }) => attemptsApi.activeForSet(setId, signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
    networkMode: "always",
  });
  const start = useMutation({
    networkMode: "always",
    retry: 0,
    mutationFn: async ({ ownerId }: { ownerId: string }) => {
      const controller = new AbortController();
      let interrupt!: (reason: OpenAttemptError["reason"]) => void;
      const interrupted = new Promise<never>((_, reject) => {
        interrupt = (reason) => {
          reject(new OpenAttemptError(reason));
          controller.abort();
        };
      });
      operation.current = interrupt;
      // Bound the entire flow, including auth refresh and active lookup. Offline queries must
      // fail visibly rather than leaving a mutation paused until connectivity returns.
      const timer = setTimeout(() => interrupt("timeout"), 90_000);
      const unsubscribe = useAuthStore.subscribe((state) => {
        if (state.user?.id !== ownerId) interrupt("account_changed");
      });
      try {
        const open = async () => {
          const current = await attemptsApi.activeForSet(setId, controller.signal);
          controller.signal.throwIfAborted();
          if (useAuthStore.getState().user?.id !== ownerId)
            throw new OpenAttemptError("account_changed");
          if (!current.attemptId && !canStart) throw new OpenAttemptError("unavailable");
          const attempt = await (current.attemptId
            ? attemptsApi.resume(current.attemptId, controller.signal)
            : attemptsApi.startForSet(
                setId,
                { expectedGeneration: current.generation },
                controller.signal,
              ));
          return { id: attempt.id, ownerId, generation: current.generation };
        };
        return await Promise.race([open(), interrupted]);
      } finally {
        clearTimeout(timer);
        unsubscribe();
        if (operation.current === interrupt) operation.current = null;
      }
    },
    onSuccess: (attempt) => {
      // An account switch invalidates the pending operation's navigation as well as its data.
      if (useAuthStore.getState().user?.id === attempt.ownerId) {
        client.setQueryData(["practice-attempt-active", attempt.ownerId, setId], {
          generation: attempt.generation,
          attemptId: attempt.id,
        });
        navigate(`/practice/attempts/${attempt.id}`);
      }
    },
  });
  if (!user && !canStart) return null;
  if (!user)
    return (
      <section className={styles.startPanel}>
        <ButtonLink
          variant="primary"
          to={`/login?next=${encodeURIComponent(`/practice/parts/${setId}`)}`}
        >
          Đăng nhập để luyện tập
        </ButtonLink>
      </section>
    );
  if (user.role !== "User") return null;
  if (!canStart && active.isSuccess && !active.data?.attemptId) return null;
  const opening = start.isPending && start.variables.ownerId === user.id;
  const failure = start.isError && start.variables.ownerId === user.id ? start.error : active.error;
  const cancelled = failure instanceof OpenAttemptError && failure.reason === "cancelled";
  return (
    <section className={styles.startPanel} aria-label="Mở bài luyện tập" aria-busy={opening}>
      <div className={styles.buttonRow}>
        <Button
          variant="primary"
          className={styles.primaryAction}
          disabled={active.isPending || opening}
          icon={
            opening ? (
              <LoaderCircle size={20} className={styles.spinner} aria-hidden="true" />
            ) : (
              <Play size={20} aria-hidden="true" />
            )
          }
          onClick={() => start.mutate({ ownerId: user.id })}
        >
          {opening
            ? "Đang mở bài…"
            : active.isPending
              ? "Đang kiểm tra bài…"
              : failure && !cancelled
                ? "Thử mở lại"
                : active.data?.attemptId
                  ? "Tiếp tục luyện tập"
                  : "Bắt đầu luyện tập"}
        </Button>
        {opening && (
          <Button className={styles.actionButton} onClick={() => operation.current?.("cancelled")}>
            Hủy mở bài
          </Button>
        )}
      </div>
      {opening ? (
        <p role="status">
          Đang chuẩn bị nội dung, hình ảnh và âm thanh. Bộ nhiều câu hỏi có thể cần thêm thời gian.
        </p>
      ) : failure ? (
        <p role={cancelled ? "status" : "alert"}>{openingMessage(failure)}</p>
      ) : (
        <p>Đáp án được tự động lưu để bạn có thể rời bài và tiếp tục sau.</p>
      )}
    </section>
  );
}

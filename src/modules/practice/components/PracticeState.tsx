import { Button, EmptyState } from "@/modules/admin";
import { practiceError } from "../utils/practice";

export function PracticeState({
  pending,
  error,
  retry,
  empty,
}: {
  pending?: boolean;
  empty?: string;
  error?: unknown;
  retry?: () => void;
}) {
  if (pending) return <p role="status">Đang tải bộ luyện tập...</p>;
  if (error)
    return (
      <div role="alert">
        <p>{practiceError(error)}</p>
        {retry && <Button onClick={retry}>Thử lại</Button>}
      </div>
    );
  return empty ? <EmptyState title={empty} image={false} /> : null;
}

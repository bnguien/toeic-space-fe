import { useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { ClassActionDialog, type ClassActionConfirmation } from "../components/ClassActionDialog";
import { ClassEnrollments } from "../components/ClassEnrollments";
import tableStyles from "../components/ClassListTable.module.css";
import { useClassActions, useDeletedClasses } from "../hooks/useClasses";
import { classErrorMessage } from "../utils/classErrorMessage";
import styles from "./ClassesPage.module.css";

export function DeletedClassesPage() {
  const [params, setParams] = useSearchParams();
  const selectedClassId = params.get("class");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [restoredStatus, setRestoredStatus] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ClassActionConfirmation | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const classes = useDeletedClasses(search, page);
  const actions = useClassActions();
  const busy = actions.adminRestore.isPending || actions.removePermanent.isPending;

  const run = async (operation: () => Promise<unknown>) => {
    setMessage("");
    setRestoredStatus(null);
    try {
      await operation();
    } catch (error) {
      setMessage(classErrorMessage(error));
    }
  };

  const restore = async (id: string) => {
    setPendingId(id);
    await run(async () => {
      const result = await actions.adminRestore.mutateAsync(id);
      const labels = { Draft: "Bản nháp", Active: "Đang hoạt động", Completed: "Đã hoàn thành" };
      setRestoredStatus(labels[result.class.status as keyof typeof labels] ?? result.class.status);
      if (classes.data?.items.length === 1 && page > 1) setPage(page - 1);
    });
    setPendingId(null);
  };
  const confirmDelete = (id: string, name: string) =>
    setConfirmation({
      title: "Xóa vĩnh viễn lớp học?",
      message: `Lớp ${name} sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`,
      confirmLabel: "Xóa vĩnh viễn",
      onConfirm: async () => {
        setPendingId(id);
        try {
          await actions.removePermanent.mutateAsync(id);
          if (classes.data?.items.length === 1 && page > 1) setPage(page - 1);
        } finally {
          setPendingId(null);
        }
      },
    });
  const confirmAction = async () => {
    if (!confirmation) return;
    const operation = confirmation.onConfirm;
    setConfirmation(null);
    await run(operation);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(input.trim());
  };

  return (
    <div className={styles.page}>
      {selectedClassId ? (
        <section className={styles.detailPanel}>
          <button className={styles.backButton} onClick={() => setParams({ tab: "deleted" })}>
            ← Quay lại lớp đã xóa
          </button>
          <h2>
            {classes.data?.items.find((item) => item.id === selectedClassId)?.name ??
              "Lớp học đã xóa"}
          </h2>
          <ClassEnrollments key={selectedClassId} classId={selectedClassId} classStatus="Deleted" />
        </section>
      ) : (
        <section className={styles.listPanel}>
          <form className={styles.toolbar} onSubmit={submit}>
            <div className={styles.search}>
              <Search size={16} />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Tìm theo tên lớp hoặc mã lớp..."
                aria-label="Tìm lớp đã xóa"
              />
              <button aria-label="Tìm kiếm" disabled={classes.isFetching}>
                <ChevronRight size={16} />
              </button>
            </div>
          </form>
          {message && (
            <p className={styles.actionError} role="alert">
              {message}
            </p>
          )}
          {restoredStatus && (
            <p className={styles.resultLabel} role="status">
              Đã khôi phục lớp về {restoredStatus}. Xem tại{" "}
              <Link to="/admin/classes/list">Danh sách lớp học</Link>.
            </p>
          )}
          {classes.isError ? (
            <p className={styles.notice}>
              Không tải được danh sách lớp đã xóa.{" "}
              <button onClick={() => void classes.refetch()}>Thử lại</button>
            </p>
          ) : classes.isPending ? (
            <p className={styles.notice} role="status">
              Đang tải danh sách lớp đã xóa...
            </p>
          ) : !classes.data.items.length ? (
            <div className={styles.emptyState}>
              <strong>{search ? "Không tìm thấy lớp phù hợp" : "Chưa có lớp đã xóa"}</strong>
              <p>
                {search
                  ? "Thử tìm theo mã hoặc tên lớp khác."
                  : "Các lớp được xóa sẽ xuất hiện tại đây để khôi phục khi cần."}
              </p>
            </div>
          ) : (
            <div className={tableStyles.scroll}>
              <table className={`${tableStyles.table} ${tableStyles.deletedTable}`}>
                <thead>
                  <tr>
                    <th scope="col">Mã lớp</th>
                    <th scope="col">Tên lớp</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.data.items.map((item) => (
                    <tr key={item.id}>
                      <td className={tableStyles.code}>
                        <span className={tableStyles.ellipsis}>{item.code}</span>
                      </td>
                      <td>
                        <strong className={`${tableStyles.name} ${tableStyles.ellipsis}`}>
                          {item.name}
                        </strong>
                      </td>
                      <td>
                        <span className={`${tableStyles.status} ${tableStyles.Deleted}`}>
                          Đã xóa
                        </span>
                      </td>
                      <td>
                        <div className={styles.trashActions}>
                          <Link className={tableStyles.view} to={`?tab=deleted&class=${item.id}`}>
                            Xem học viên
                          </Link>
                          <button
                            className={styles.secondaryButton}
                            disabled={busy}
                            onClick={() => void restore(item.id)}
                          >
                            <RotateCcw size={15} />{" "}
                            {pendingId === item.id && actions.adminRestore.isPending
                              ? "Đang khôi phục..."
                              : "Khôi phục lớp"}
                          </button>
                          <button
                            className={styles.archiveButton}
                            disabled={busy}
                            onClick={() => confirmDelete(item.id, item.name)}
                          >
                            <Trash2 size={15} />{" "}
                            {pendingId === item.id && actions.removePermanent.isPending
                              ? "Đang xóa..."
                              : "Xóa vĩnh viễn"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(classes.data?.totalCount ?? 0) > 20 && (
            <div className={styles.pagination}>
              <button
                disabled={page === 1 || classes.isFetching}
                onClick={() => setPage((value) => value - 1)}
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
              <span>Trang {page}</span>
              <button
                disabled={
                  classes.isFetching ||
                  !classes.data ||
                  page * classes.data.pageSize >= classes.data.totalCount
                }
                onClick={() => setPage((value) => value + 1)}
                aria-label="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}
      {confirmation && (
        <ClassActionDialog
          confirmation={confirmation}
          onClose={() => setConfirmation(null)}
          pending={busy}
          onConfirm={() => void confirmAction()}
        />
      )}
    </div>
  );
}

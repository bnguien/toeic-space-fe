import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import readingMascot from "@/assets/mascot/oy2-reading.png";
import listeningMascot from "@/assets/mascot/oy2-listening.png";
import {
  IconAnalytics,
  IconChevronRight,
  IconDashboard,
  IconSearch,
} from "@/shared/components/icons";
import { examBankApi } from "../api/exam-bank.api";
import { BankStatus, Pagination, PartNavigation } from "../components/exam-bank/BankControls";
import { STATUS_LABELS } from "../components/exam-bank/bank.constants";
import styles from "../components/exam-bank/ExamBrowser.module.css";
import library from "../components/exam-bank/ExamLibrary.module.css";
import { ExamLibraryItem } from "../components/exam-bank/ExamLibraryItem";

export function AdminExamsListPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "visual" ? "visual" : "cards";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const filters = {
    Page: page,
    PageSize: 12,
    Search: params.get("search") || undefined,
    Status: params.get("status") || undefined,
  };
  const query = useQuery({
    queryKey: ["exam-bank", "exams", filters],
    queryFn: ({ signal }) => examBankApi.exams(filters, signal),
    retry: false,
  });
  const update = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page" && key !== "view") next.delete("page");
      return next;
    });
  return (
    <div className={`${styles.page} ${library.library}`}>
      <header className={library.masthead}>
        <div className={library.headerContent}>
          <span className={library.eyebrow}>TOEIC SPACE</span>
          <h1>Thư viện đề thi</h1>
          <p>TOEIC Listening & Reading</p>
        </div>
        <img className={library.headerMascot} src={readingMascot} alt="" width="160" height="160" />
        <div className={library.headerSummary}>
          <div className={library.collectionCount}>
            <strong>{query.data ? query.data.totalCount.toLocaleString("vi-VN") : "—"}</strong>
            <span>đề thi{filters.Search || filters.Status ? " phù hợp" : " trong thư viện"}</span>
          </div>
          <span className={library.skillLabel} data-skill="listening">
            <i />
            Listening <b>Part 1–4</b>
          </span>
          <span className={library.skillLabel} data-skill="reading">
            <i />
            Reading <b>Part 5–7</b>
          </span>
        </div>
      </header>
      <div className={library.partRail}>
        <div className={library.sectionLine}>
          <h2 className={library.sectionTitle}>
            <img src={listeningMascot} alt="" width="36" height="36" />
            Luyện theo Part
          </h2>
          <i />
          <span>Listening · Reading</span>
        </div>
        <PartNavigation />
      </div>
      <div className={`${library.sectionLine} ${library.pinkSection}`}>
        <h2 className={library.sectionTitle}>
          <img src={readingMascot} alt="" width="36" height="36" />
          Tất cả đề thi
        </h2>
        <i />
      </div>
      <div className={library.controls}>
        <form
          className={`${styles.toolbar} ${library.toolbar}`}
          key={params.get("search")}
          onSubmit={(e) => {
            e.preventDefault();
            update("search", String(new FormData(e.currentTarget).get("search") || "").trim());
          }}
        >
          <div className={styles.search}>
            <IconSearch size={18} />
            <input
              name="search"
              aria-label="Tìm đề thi"
              placeholder="Tìm tên hoặc mã đề thi..."
              defaultValue={params.get("search") || ""}
            />
            <button className={styles.iconButton} title="Tìm kiếm" aria-label="Tìm kiếm">
              <IconChevronRight />
            </button>
          </div>
          <select
            aria-label="Trạng thái"
            value={params.get("status") || ""}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {(filters.Search || filters.Status) && (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => setParams(view === "visual" ? { view: "visual" } : {})}
            >
              Xóa bộ lọc
            </button>
          )}
        </form>
        <div className={library.viewSwitch} role="group" aria-label="Chế độ hiển thị">
          <button
            type="button"
            aria-pressed={view === "cards"}
            title="Xem dạng thẻ"
            onClick={() => update("view", "")}
          >
            <IconDashboard size={17} />
            <span>Thẻ</span>
          </button>
          <button
            type="button"
            aria-pressed={view === "visual"}
            title="Xem trực quan"
            onClick={() => update("view", "visual")}
          >
            <IconAnalytics size={17} />
            <span>Trực quan</span>
          </button>
        </div>
      </div>
      {query.isPending || query.isError ? (
        <BankStatus
          loading={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : !query.data.items.length ? (
        <BankStatus empty="Chưa có đề thi phù hợp" />
      ) : (
        <>
          <div className={library.resultsHeading}>
            <span>
              {query.data.items.length} đề trên trang {page}
            </span>
            <span>
              <i />
              Listening <i />
              Reading
            </span>
          </div>
          <div className={library.results} data-view={view}>
            {view === "visual" && (
              <div className={library.listHeader} aria-hidden="true">
                <span />
                <span>Đề thi</span>
                <span>Quy mô</span>
                <span>Phân bổ LC / RC</span>
                <span>Trạng thái</span>
                <span />
              </div>
            )}
            {query.data.items.map((exam, index) => (
              <ExamLibraryItem key={exam.id} exam={exam} index={index} />
            ))}
          </div>
          <Pagination
            page={page}
            pages={query.data.totalPages}
            total={query.data.totalCount}
            onChange={(value) => update("page", String(value))}
          />
        </>
      )}
    </div>
  );
}

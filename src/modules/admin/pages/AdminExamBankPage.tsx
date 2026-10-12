import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { IconAnalytics, IconExams } from "@/shared/components/icons";

import { examBankApi } from "../api/exam-bank.api";
import { BankStatus } from "../components/exam-bank/BankControls";
import {
  DIFFICULTY_LABELS,
  PART_NAMES,
  STATUS_LABELS,
} from "../components/exam-bank/bank.constants";
import type { BankOverview, BankPartStats } from "../types/exam-bank.types";
import styles from "./AdminExamBankPage.module.css";

const LISTENING = "#2563eb";
const READING = "#ea580c";

const DIFFICULTY_COLORS: Record<string, string> = {
  VeryEasy: "#22c55e",
  Easy: "#10b981",
  Medium: "#2563eb",
  Hard: "#f59e0b",
  VeryHard: "#dc2626",
};

const SET_KIND_LABELS: Record<string, string> = {
  Level: "Theo cấp độ",
  Topic: "Theo chủ đề",
  PartDrill: "Luyện theo Part",
};

const number = (value: number) => value.toLocaleString("vi-VN");

const partNumber = (part: string) => Number(part.replace("Part", "")) || 0;

/** Nice round ceiling for the Y axis, so the tallest bar never touches the top. */
function axisMax(parts: BankPartStats[]) {
  const tallest = Math.max(1, ...parts.map((part) => part.questions));
  const step = 10 ** Math.max(1, String(Math.round(tallest)).length - 1);
  return Math.ceil((tallest * 1.1) / step) * step;
}

function Bars({ parts }: { parts: BankPartStats[] }) {
  const max = axisMax(parts);
  return (
    <div className={styles.barChartContainer}>
      <div className={styles.oyAxis}>
        {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
          <span key={ratio}>{number(Math.round(max * ratio))}</span>
        ))}
      </div>
      <div className={styles.plotArea}>
        {["100%", "75%", "50%", "25%", "0%"].map((bottom) => (
          <div key={bottom} className={styles.gridLine} style={{ bottom }} />
        ))}
        <div className={styles.barsFlexRow}>
          {parts.map((part) => (
            <Link
              key={part.part}
              className={styles.barColumn}
              to={`/admin/exams/part-${partNumber(part.part)}`}
              title={`${part.part}: ${number(part.questions)} câu (${number(part.testQuestions)} trong đề, ${number(part.bankQuestions)} ngân hàng)`}
            >
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    height: `${Math.round((part.questions / max) * 100)}%`,
                    background: part.section === "Listening" ? LISTENING : READING,
                  }}
                >
                  <span className={styles.barValue}>{number(part.questions)}</span>
                </div>
              </div>
              <span className={styles.barLabel}>Part {partNumber(part.part)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Distribution({ overview }: { overview: BankOverview }) {
  const total = Math.max(1, overview.totalQuestions);
  const rows = overview.difficulties.map((item) => ({
    key: item.difficultyLevel,
    name: DIFFICULTY_LABELS[item.difficultyLevel] ?? item.difficultyLevel,
    count: item.questions,
    percent: Math.round((item.questions / total) * 100),
    color: DIFFICULTY_COLORS[item.difficultyLevel] ?? LISTENING,
  }));

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <div className={styles.chartTitle}>Phân bố theo độ khó</div>
          <div className={styles.chartSubtitle}>Trên {number(overview.totalQuestions)} câu hỏi</div>
        </div>
      </div>

      <div className={styles.progressCombined}>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{ width: `${row.percent}%`, background: row.color }}
            title={`${row.name}: ${row.percent}%`}
          />
        ))}
      </div>

      <div className={styles.levelList}>
        {rows.map((row) => (
          <div key={row.key} className={styles.levelItem}>
            <div className={styles.levelInfo}>
              <div className={styles.levelNameRow}>
                <span className={styles.levelDot} style={{ background: row.color }} />
                <span className={styles.levelName}>{row.name}</span>
              </div>
              <div className={styles.levelStats}>
                <strong>{number(row.count)} câu</strong> ({row.percent}%)
              </div>
            </div>
            <div className={styles.levelProgressBar}>
              <div
                className={styles.levelProgressFill}
                style={{ width: `${row.percent}%`, background: row.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.levelHint}>
        {overview.statuses
          .map(
            (item) => `${STATUS_LABELS[item.status] ?? item.status}: ${number(item.questions)} câu`,
          )
          .join(" • ")}
      </div>
    </div>
  );
}

export const AdminExamBankPage = () => {
  const query = useQuery({
    queryKey: ["exam-bank", "overview"],
    queryFn: ({ signal }) => examBankApi.overview(signal),
    retry: false,
  });

  if (query.isPending || query.isError) {
    return (
      <div className={styles.container}>
        <BankStatus
          loading={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      </div>
    );
  }

  const overview = query.data;
  const parts = [...overview.parts].sort(
    (left, right) => partNumber(left.part) - partNumber(right.part),
  );
  const practiceSetQuestions = overview.practiceSets.reduce(
    (total, kind) => total + kind.questions,
    0,
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ngân hàng đề thi</h1>
          <p className={styles.subtitle}>
            <strong>{number(overview.totalTests)} đề thi</strong> •{" "}
            <strong>{number(overview.totalQuestions)} câu hỏi</strong> •{" "}
            <strong>{number(overview.totalPracticeSets)} bộ luyện tập</strong>
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.btnOutline} to="/admin/exams/list">
            <IconExams size={15} />
            <span>Danh sách đề thi</span>
          </Link>
          <Link className={styles.btnPrimary} to="/admin/exams/part-1">
            <IconAnalytics size={15} />
            <span>Duyệt câu hỏi</span>
          </Link>
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={styles.statIcon} style={{ background: "#eff6ff", color: "#2563eb" }}>
              <IconExams size={18} />
            </div>
            <span className={styles.statBadge}>{number(overview.activeTests)} đang dùng</span>
          </div>
          <div className={styles.statValue}>{number(overview.totalTests)}</div>
          <div className={styles.statTitle}>Đề thi đầy đủ</div>
          <div className={styles.statSub}>{number(overview.testQuestions)} câu thuộc đề thi</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={styles.statIcon} style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <IconAnalytics size={18} />
            </div>
            <span className={styles.statBadge}>Part 1 - 7</span>
          </div>
          <div className={styles.statValue}>{number(overview.totalQuestions)}</div>
          <div className={styles.statTitle}>Tổng số câu hỏi</div>
          <div className={styles.statSub}>
            {number(overview.bankQuestions)} câu chỉ có trong ngân hàng
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={styles.statIcon} style={{ background: "#eff6ff", color: "#0284c7" }}>
              <span style={{ fontSize: 12, fontWeight: 800 }}>LC</span>
            </div>
            <span className={styles.statBadge}>Part 1 - 4</span>
          </div>
          <div className={styles.statValue}>{number(overview.listeningQuestions)}</div>
          <div className={styles.statTitle}>Câu hỏi Listening</div>
          <div className={styles.statSub}>
            {number(
              parts
                .filter((part) => part.section === "Listening")
                .reduce((total, part) => total + part.passages, 0),
            )}{" "}
            nhóm hội thoại & bài nói
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={styles.statIcon} style={{ background: "#fff7ed", color: "#ea580c" }}>
              <span style={{ fontSize: 12, fontWeight: 800 }}>RC</span>
            </div>
            <span className={styles.statBadge}>Part 5 - 7</span>
          </div>
          <div className={styles.statValue}>{number(overview.readingQuestions)}</div>
          <div className={styles.statTitle}>Câu hỏi Reading</div>
          <div className={styles.statSub}>
            {number(
              parts
                .filter((part) => part.section === "Reading")
                .reduce((total, part) => total + part.passages, 0),
            )}{" "}
            đoạn văn bản
          </div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Số lượng câu hỏi theo Part</div>
              <div className={styles.chartSubtitle}>
                Phân bổ {number(overview.totalQuestions)} câu hỏi trong ngân hàng
              </div>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.dot} style={{ background: LISTENING }} />
                <span>Listening</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.dot} style={{ background: READING }} />
                <span>Reading</span>
              </div>
            </div>
          </div>
          <Bars parts={parts} />
        </div>

        <Distribution overview={overview} />
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div>
            <div className={styles.chartTitle}>Chi tiết theo Part</div>
            <div className={styles.chartSubtitle}>
              {number(overview.totalPracticeSets)} bộ luyện tập ({number(practiceSetQuestions)} lượt
              dùng câu hỏi):{" "}
              {overview.practiceSets
                .map((kind) => `${number(kind.sets)} ${SET_KIND_LABELS[kind.kind] ?? kind.kind}`)
                .join(" • ")}
            </div>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colCode}>Part</th>
                <th className={styles.colName}>Dạng câu hỏi</th>
                <th className={styles.colCollection}>Phần thi</th>
                <th className={styles.colQuestions}>Số câu</th>
                <th className={styles.colLevel}>Đoạn văn / nhóm</th>
                <th className={styles.colAttempts}>Mỗi đề thi</th>
                <th className={styles.colActions}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <tr key={part.part}>
                  <td className={`${styles.codeCell} ${styles.colCode}`}>
                    Part {partNumber(part.part)}
                  </td>
                  <td className={`${styles.nameCell} ${styles.colName}`}>
                    {PART_NAMES[partNumber(part.part) - 1]}
                  </td>
                  <td className={styles.colCollection}>
                    {part.section === "Listening" ? "Listening" : "Reading"}
                  </td>
                  <td className={styles.colQuestions}>
                    {number(part.questions)} câu{" "}
                    <span className={styles.splitText}>
                      ({number(part.testQuestions)} trong đề / {number(part.bankQuestions)} ngân
                      hàng)
                    </span>
                  </td>
                  <td className={styles.colLevel}>
                    {part.passages > 0 ? (
                      <span className={styles.levelTag}>{number(part.passages)}</span>
                    ) : (
                      <span className={styles.splitText}>Câu đơn</span>
                    )}
                  </td>
                  <td className={styles.colAttempts}>{part.questionsPerTest} câu</td>
                  <td className={styles.colActions}>
                    <div className={styles.actions}>
                      <Link
                        className={styles.btnAction}
                        to={`/admin/exams/part-${partNumber(part.part)}`}
                      >
                        Xem câu hỏi
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>
            Tổng <strong>{number(overview.totalQuestions)}</strong> câu hỏi •{" "}
            <strong>{number(overview.totalPassages)}</strong> đoạn văn / nhóm câu
          </span>
        </div>
      </div>
    </div>
  );
};

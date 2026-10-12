import { useState } from "react";
import { Link } from "react-router-dom";

import mascotHero from "@/assets/mascot/oy2-hello.png";
import bannerBg from "@/assets/mascot/sky-sea-banner.jpg";
import {
  IconActivity,
  IconAnalytics,
  IconExams,
  IconRevenue,
  IconStudents,
  IconTeachers,
} from "@/shared/components/icons";

import { useAdminOverview } from "../hooks/useAdminOverview";
import styles from "./AdminDashboardPage.module.css";

// Tạo danh sách 7 ngày gần nhất, với ngày cuối cùng luôn là hôm nay
const getRecent7DaysData = () => {
  const baseAttempts = [920, 1150, 1080, 1420, 1310, 1850, 2140];
  const baseScores = [620, 635, 640, 655, 650, 670, 685];
  const result = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dayNum = String(d.getDate()).padStart(2, "0");
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
    const dateFormatted = `${dayNum}/${monthNum}`;
    const isToday = i === 0;

    const dataIndex = 6 - i;
    result.push({
      dateLabel: isToday ? `Hôm nay (${dateFormatted})` : dateFormatted,
      shortLabel: isToday ? "Hôm nay" : dateFormatted,
      fullDate: dateFormatted,
      isToday,
      attempts: baseAttempts[dataIndex],
      score: baseScores[dataIndex],
    });
  }
  return result;
};

const WEEKLY_BAR_DATA = getRecent7DaysData();

const TOEIC_PARTS_DATA = [
  { part: "Part 1: Mô tả hình ảnh", rate: 78, color: "#10b981" },
  { part: "Part 2: Hỏi - Đáp", rate: 72, color: "#0ea5e9" },
  { part: "Part 3: Hội thoại ngắn", rate: 65, color: "#3b82f6" },
  { part: "Part 4: Bài nói ngắn", rate: 58, color: "#f59e0b" },
  { part: "Part 5: Điền vào câu", rate: 70, color: "#0ea5e9" },
  { part: "Part 6: Điền đoạn văn", rate: 62, color: "#f59e0b" },
  { part: "Part 7: Đọc hiểu văn bản", rate: 52, color: "#ef4444" },
];

const REVENUE_BREAKDOWN = [
  { label: "Premium Pro 6 Tháng", percent: 45, color: "#2563eb", amount: "128.4M" },
  { label: "Khóa Cấp Tốc 750+", percent: 30, color: "#0ea5e9", amount: "85.6M" },
  { label: "Gói Luyện Đề ETS", percent: 15, color: "#10b981", amount: "42.8M" },
  { label: "Học Kèm VIP 1-1", percent: 10, color: "#f59e0b", amount: "28.5M" },
];

export const AdminDashboardPage = () => {
  const { data: stats, isLoading } = useAdminOverview();
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const formatCurrency = (amount?: number) => {
    if (!amount) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  return (
    <div className={styles.dashboard}>
      {/* 1. Compact Minimal Hero Banner (Không có button, chữ to rõ) */}
      <section className={styles.heroBanner}>
        <img src={bannerBg} alt="Sky Sea Banner" className={styles.heroBgImage} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Xin chào, Quản trị viên!</h1>
          <div className={styles.heroSubtitle}>
            <span>
              <strong>{formatNumber(stats?.activeStudentsToday ?? 1845)}</strong> học viên trực
              tuyến
            </span>
            <span>•</span>
            <span className={styles.heroBadge}>
              {stats?.pendingTeacherApprovals ?? 8} giáo viên chờ duyệt
            </span>
            <span>•</span>
            <span>Gateway 5050 Online</span>
          </div>
        </div>

        <div className={styles.heroMascotWrap}>
          <img
            src={mascotHero}
            alt="Oysteic Mascot"
            className={`${styles.heroMascot} animate-bob`}
          />
        </div>
      </section>

      {/* 2. Compact KPI Stat Cards - Click vào nhảy sang trang Tổng quan tương ứng */}
      <section className={styles.statGrid}>
        <Link to="/admin/students" className={styles.statCard} title="Xem tổng quan Học viên">
          <div className={styles.statTop}>
            <div className={styles.statIcon} style={{ background: "#eff6ff", color: "#2563eb" }}>
              <IconStudents size={18} />
            </div>
            <span className={`${styles.statBadge} ${styles.statBadgeUp}`}>+14.2%</span>
          </div>
          <div>
            <div className={styles.statValue}>
              {isLoading ? "..." : formatNumber(stats?.totalStudents)}
            </div>
            <div className={styles.statTitle}>Tổng Học viên</div>
          </div>
        </Link>

        <Link to="/admin/teachers" className={styles.statCard} title="Xem tổng quan Giáo viên">
          <div className={styles.statTop}>
            <div className={styles.statIcon} style={{ background: "#fefce8", color: "#ca8a04" }}>
              <IconTeachers size={18} />
            </div>
            <span className={`${styles.statBadge} ${styles.statBadgeUp}`}>
              {stats?.pendingTeacherApprovals ?? 8} chờ duyệt
            </span>
          </div>
          <div>
            <div className={styles.statValue}>
              {isLoading ? "..." : formatNumber(stats?.totalTeachers)}
            </div>
            <div className={styles.statTitle}>Giáo viên</div>
          </div>
        </Link>

        <Link to="/admin/exams" className={styles.statCard} title="Xem tổng quan Ngân hàng đề">
          <div className={styles.statTop}>
            <div className={styles.statIcon} style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <IconExams size={18} />
            </div>
            <span className={`${styles.statBadge} ${styles.statBadgeUp}`}>+22%</span>
          </div>
          <div>
            <div className={styles.statValue}>
              {isLoading ? "..." : formatNumber(stats?.totalExams)}
            </div>
            <div className={styles.statTitle}>Bộ đề & Bài thi</div>
          </div>
        </Link>

        <Link
          to="/admin/revenue"
          className={styles.statCard}
          title="Xem tổng quan Đơn hàng & Doanh thu"
        >
          <div className={styles.statTop}>
            <div className={styles.statIcon} style={{ background: "#fff1f2", color: "#e11d48" }}>
              <IconRevenue size={18} />
            </div>
            <span className={`${styles.statBadge} ${styles.statBadgeUp}`}>
              +{stats?.revenueGrowthPercent ?? 18.5}%
            </span>
          </div>
          <div>
            <div className={styles.statValue}>
              {isLoading ? "..." : formatCurrency(stats?.monthlyRevenue)}
            </div>
            <div className={styles.statTitle}>Doanh thu tháng</div>
          </div>
        </Link>
      </section>

      {/* 3. Charts Section Row 1 */}
      <section className={styles.chartsRow}>
        {/* Weekly Attempts SVG Bar Chart (Biểu đồ cột) */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h2 className={styles.chartTitle}>
                <IconAnalytics size={17} />
                <span>Biểu đồ Cột: Lượt thi & Điểm số 7 Ngày qua</span>
              </h2>
              <p className={styles.chartSubtitle}>
                Thống kê lượt hoàn thành bài test theo ngày (Đỉnh: 2.140 lượt)
              </p>
            </div>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#2563eb" }} />
                <span>Số lượt làm bài</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Container with crisp Oy & Ox axes */}
          <div className={styles.barChartContainer}>
            {/* Oy Axis (Trục Oy giá trị) */}
            <div className={styles.oyAxis}>
              <span className={styles.axisLabel}>2.500</span>
              <span className={styles.axisLabel}>2.000</span>
              <span className={styles.axisLabel}>1.500</span>
              <span className={styles.axisLabel}>1.000</span>
              <span className={styles.axisLabel}>500</span>
              <span className={styles.axisLabel}>0</span>
            </div>

            {/* Chart Area with Grid lines and Bars */}
            <div className={styles.chartPlotArea}>
              {/* Horizontal Grid lines */}
              <div className={styles.gridLine} style={{ bottom: "100%" }} />
              <div className={styles.gridLine} style={{ bottom: "80%" }} />
              <div className={styles.gridLine} style={{ bottom: "60%" }} />
              <div className={styles.gridLine} style={{ bottom: "40%" }} />
              <div className={styles.gridLine} style={{ bottom: "20%" }} />
              <div className={styles.gridLine} style={{ bottom: "0%" }} />

              {/* Bars container */}
              <div className={styles.barsFlexRow}>
                {WEEKLY_BAR_DATA.map((item, idx) => {
                  const isHovered = hoveredPoint === idx;
                  // Calculate height percentage relative to max 2500
                  const heightPercent = Math.min(100, Math.round((item.attempts / 2500) * 100));

                  return (
                    <div
                      key={item.fullDate}
                      className={styles.barColumn}
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Bar Track & Fill */}
                      <div className={styles.barTrack}>
                        <div
                          className={`${styles.barFill} ${item.isToday ? styles.barFillToday : ""}`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          {/* Value above bar */}
                          <span
                            className={`${styles.barValue} ${item.isToday ? styles.barValueToday : ""}`}
                          >
                            {item.attempts}
                          </span>
                        </div>
                      </div>

                      {/* Tooltip on hover */}
                      {isHovered && (
                        <div className={styles.chartTooltip}>
                          <div className={styles.tooltipDate}>{item.dateLabel}</div>
                          <div className={styles.tooltipValue}>
                            <strong>{item.attempts}</strong> lượt làm • Điểm TB:{" "}
                            <strong>{item.score}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Trục hoành Ox (Đường trục kẻ đậm rõ nét) */}
              <div className={styles.oxLine} />
            </div>
          </div>

          {/* Dòng nhãn ngày trục Ox - Nằm ngay sát phía dưới trục Ox */}
          <div className={styles.oxLabelsRow}>
            {WEEKLY_BAR_DATA.map((item, idx) => (
              <div
                key={item.fullDate}
                className={`${styles.oxDateLabel} ${item.isToday ? styles.oxDateLabelToday : ""}`}
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {item.isToday ? (
                  <span className={styles.todayTag}>
                    <span className={styles.todayText}>Hôm nay</span>
                    <span className={styles.todayDate}>{item.fullDate}</span>
                  </span>
                ) : (
                  <span>{item.dateLabel}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* TOEIC Parts Accuracy Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h2 className={styles.chartTitle}>
                <IconExams size={17} />
                <span>Tỷ lệ Đúng theo 7 Parts TOEIC</span>
              </h2>
              <p className={styles.chartSubtitle}>Dữ liệu tổng hợp từ các bài làm tuần này</p>
            </div>
          </div>

          <div className={styles.partsList}>
            {TOEIC_PARTS_DATA.map((item) => (
              <div key={item.part} className={styles.partRow}>
                <div className={styles.partInfo}>
                  <span>{item.part}</span>
                  <span className={styles.partRate} style={{ color: item.color }}>
                    {item.rate}%
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${item.rate}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Charts Section Row 2: Revenue Donut & Quick Activities */}
      <section className={styles.bottomRow}>
        {/* Revenue Donut Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h2 className={styles.chartTitle}>
                <IconRevenue size={17} />
                <span>Cơ cấu Nguồn Doanh thu</span>
              </h2>
              <p className={styles.chartSubtitle}>Tỷ trọng các gói cước & dịch vụ</p>
            </div>
          </div>

          <div className={styles.donutContainer}>
            <svg viewBox="0 0 42 42" className={styles.donutSvg}>
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#2563eb"
                strokeWidth="6"
                strokeDasharray="45 55"
                strokeDashoffset="25"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#0ea5e9"
                strokeWidth="6"
                strokeDasharray="30 70"
                strokeDashoffset="-20"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="6"
                strokeDasharray="15 85"
                strokeDashoffset="-50"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#f59e0b"
                strokeWidth="6"
                strokeDasharray="10 90"
                strokeDashoffset="-65"
              />
            </svg>

            <div className={styles.donutList}>
              {REVENUE_BREAKDOWN.map((item) => (
                <div key={item.label} className={styles.donutItem}>
                  <span className={styles.legendDot} style={{ background: item.color }} />
                  <span>
                    {item.label} ({item.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Activities */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h2 className={styles.chartTitle}>
                <IconActivity size={17} />
                <span>Hoạt động Hệ thống Gần đây</span>
              </h2>
              <p className={styles.chartSubtitle}>Sự kiện mới nhất trên toàn hệ thống</p>
            </div>
            <Link
              to="/admin/system/audit-log"
              style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 600 }}
            >
              Xem tất cả →
            </Link>
          </div>

          <div className={styles.activityList}>
            {stats?.recentActivities.slice(0, 4).map((act) => (
              <div key={act.id} className={styles.activityItem}>
                <div className={styles.activityAvatar}>
                  {act.type === "teacher" && <IconTeachers size={15} />}
                  {act.type === "exam" && <IconExams size={15} />}
                  {act.type === "order" && <IconRevenue size={15} />}
                  {act.type === "student" && <IconStudents size={15} />}
                  {act.type === "system" && <IconActivity size={15} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className={styles.activityAction}>{act.action}</div>
                  <div className={styles.activityTime}>
                    {act.user.name} • {act.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

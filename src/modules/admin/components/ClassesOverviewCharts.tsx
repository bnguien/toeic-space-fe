import styles from "./ClassesOverviewCharts.module.css";

export function EnrollmentChart({ values }: { values: number[] }) {
  return (
    <div
      className={styles.barChart}
      role="img"
      aria-label={`Ghi danh theo tháng (dữ liệu mẫu): ${values.join(", ")}`}
    >
      {values.map((value, index) => (
        <div className={styles.barColumn} key={index}>
          <strong>{value}</strong>
          <div
            className={`${styles.bar} ${index === values.length - 1 ? styles.barLatest : ""}`}
            style={{ height: `${(value / 70) * 100}%` }}
          />
          <small>T{index + 5}</small>
        </div>
      ))}
    </div>
  );
}

export function AttendanceChart({ values }: { values: number[] }) {
  const points = values
    .map((value, index) => `${10 + index * 76},${105 - (value - 80) * 4.5}`)
    .join(" ");
  return (
    <div
      className={styles.lineChart}
      role="img"
      aria-label={`Chuyên cần theo tuần (dữ liệu mẫu): ${values.map((value) => `${value}%`).join(", ")}`}
    >
      <svg viewBox="0 0 400 125" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 15 H400 M0 60 H400 M0 105 H400" stroke="#e0e8ef" fill="none" />
        <polyline
          points={points}
          fill="none"
          stroke="#365e82"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx="390" cy={105 - (values[values.length - 1] - 80) * 4.5} r="4" fill="#365e82" />
      </svg>
      <div className={styles.weekLabels}>
        {values.map((_, index) => (
          <small key={index}>T{37 + index}</small>
        ))}
      </div>
    </div>
  );
}

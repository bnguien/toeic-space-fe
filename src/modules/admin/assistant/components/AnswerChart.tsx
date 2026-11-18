import { BarChart, DonutChart, LineChart, type ChartSeries } from "../../components/ui";
import { formatNumber, type AnswerChart as Chart } from "../utils/answerParser";
import styles from "./assistant.module.css";

function DataTable({ chart }: { chart: Chart }) {
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            <th scope="col">
              <span className={styles.srOnly}>Nhãn</span>
            </th>
            {chart.series.map((item) => (
              <th key={item.key} scope="col" data-align="right">
                {item.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.data.map((row, index) => (
            <tr key={index}>
              <th scope="row">{row.label}</th>
              {chart.series.map((item) => (
                <td key={item.key} data-align="right">
                  {row.values[item.key] === null ? "—" : formatNumber(row.values[item.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Plot({ chart }: { chart: Chart }) {
  const label = chart.title || "Biểu đồ";
  const series: ChartSeries[] = chart.series;
  switch (chart.type) {
    case "pie":
    case "donut":
      return (
        <DonutChart
          variant={chart.type}
          unit={chart.unit}
          label={label}
          slices={chart.data.map((row, index) => ({
            key: `${index}`,
            label: row.label,
            value: row.values[chart.series[0].key] ?? 0,
            other: row.other,
          }))}
        />
      );
    case "line":
    case "area":
      return (
        <LineChart
          series={series}
          data={chart.data}
          unit={chart.unit}
          area={chart.type === "area"}
          label={label}
        />
      );
    case "hbar":
      return (
        <BarChart
          layout="horizontal"
          series={series}
          data={chart.data}
          unit={chart.unit}
          label={label}
        />
      );
    default:
      return (
        <BarChart
          series={series}
          data={chart.data}
          unit={chart.unit}
          stacked={chart.type === "stacked"}
          label={label}
        />
      );
  }
}

/** A chart of an answer: title, unit, the drawing, and its figures as a table. */
export function AnswerChart({ chart }: { chart: Chart }) {
  return (
    <div className={styles.chart}>
      {(chart.title || chart.unit) && (
        <div className={styles.chartCaption}>
          {chart.title}
          {chart.unit && <small>Đơn vị: {chart.unit}</small>}
        </div>
      )}
      {chart.drawable ? (
        <>
          <Plot chart={chart} />
          <details className={styles.chartData}>
            <summary>Xem bảng số liệu</summary>
            <DataTable chart={chart} />
          </details>
        </>
      ) : (
        <DataTable chart={chart} />
      )}
    </div>
  );
}

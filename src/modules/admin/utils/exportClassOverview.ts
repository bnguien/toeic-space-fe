export function exportClassOverview(
  activeCount: number | undefined,
  students: number,
  fill: number,
  attendance: number,
) {
  const csv = `Chỉ số;Giá trị;Nguồn\nLớp đang hoạt động;${activeCount ?? ""};API\nHọc viên đang học;${students};Dữ liệu mẫu\nTỷ lệ lấp đầy;${fill}%;Dữ liệu mẫu\nChuyên cần tuần này;${attendance}%;Dữ liệu mẫu`;
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "tong-quan-lop-hoc-du-lieu-mau.csv";
  link.click();
  URL.revokeObjectURL(url);
}

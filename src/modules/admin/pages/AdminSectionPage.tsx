import { useState } from "react";
import { useLocation } from "react-router-dom";

import mascotFocus from "@/assets/mascot/oy2-focus.png";
import mascotListening from "@/assets/mascot/oy2-listening.png";
import mascotReading from "@/assets/mascot/oy2-reading.png";
import mascotSearch from "@/assets/mascot/oy2-search.png";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconPlus,
  IconSearch,
} from "@/shared/components/icons";
import { ADMIN_NAV_SECTIONS } from "@/shared/constants/adminNav";

import styles from "./AdminSectionPage.module.css";

interface TableRowData {
  id: string;
  code: string;
  name: string;
  category: string;
  date: string;
  status: "active" | "pending" | "draft";
  statusText: string;
  meta: string;
}

function getNavInfo(pathname: string) {
  for (const section of ADMIN_NAV_SECTIONS) {
    if (section.path === pathname) {
      return {
        sectionTitle: section.label,
        itemTitle: section.label,
        description: `Quản lý tập trung dữ liệu ${section.label.toLowerCase()} của hệ thống TOEIC Space.`,
        sectionKey: section.key,
      };
    }
    const matched = section.children?.find((c) => c.path === pathname);
    if (matched) {
      return {
        sectionTitle: section.label,
        itemTitle: matched.label,
        description: `Quản lý phân hệ ${matched.label} trong khối ${section.label}. Kết nối trực tiếp cơ sở dữ liệu qua API Gateway.`,
        sectionKey: section.key,
      };
    }
  }
  return {
    sectionTitle: "Quản trị",
    itemTitle: "Bảng dữ liệu",
    description: "Quản lý dữ liệu hệ thống TOEIC Space.",
    sectionKey: "general",
  };
}

function getMascot(pathname: string, sectionKey: string) {
  if (
    pathname.includes("part-1") ||
    pathname.includes("part-2") ||
    pathname.includes("part-3") ||
    pathname.includes("part-4")
  ) {
    return mascotListening;
  }
  if (pathname.includes("part-5") || pathname.includes("part-6") || pathname.includes("part-7")) {
    return mascotReading;
  }
  if (sectionKey === "exams") {
    return mascotFocus;
  }
  return mascotSearch;
}

function getSampleRows(pathname: string): TableRowData[] {
  if (pathname.includes("teachers")) {
    return [
      {
        id: "1",
        code: "GV-001",
        name: "Thầy Đặng Hoài Phương",
        category: "TOEIC Master (990/990)",
        date: "12/08/2026",
        status: "active",
        statusText: "Đang giảng dạy",
        meta: "4 Lớp • 142 Học viên",
      },
      {
        id: "2",
        code: "GV-002",
        name: "Cô Nguyễn Lê Mai Anh",
        category: "TOEIC Speaking & Listening",
        date: "24/08/2026",
        status: "active",
        statusText: "Đang giảng dạy",
        meta: "3 Lớp • 98 Học viên",
      },
      {
        id: "3",
        code: "GV-003",
        name: "Thầy Vũ Minh Tuấn",
        category: "Chuyên gia Ngữ pháp Part 5-6",
        date: "02/09/2026",
        status: "pending",
        statusText: "Chờ duyệt hồ sơ",
        meta: "Hồ sơ mới gửi",
      },
      {
        id: "4",
        code: "GV-004",
        name: "Cô Trần Thị Thu Hà",
        category: "Luyện thi Cấp Tốc 650+",
        date: "05/09/2026",
        status: "active",
        statusText: "Đang giảng dạy",
        meta: "2 Lớp • 65 Học viên",
      },
    ];
  }

  if (pathname.includes("students")) {
    return [
      {
        id: "1",
        code: "HV-1029",
        name: "Trần Anh Quân",
        category: "Mục tiêu 850+",
        date: "01/09/2026",
        status: "active",
        statusText: "Đang học (Lớp K12)",
        meta: "Làm 28 đề • Điểm TB: 780",
      },
      {
        id: "2",
        code: "HV-1030",
        name: "Lê Hoàng Phúc",
        category: "Mục tiêu 600+",
        date: "03/09/2026",
        status: "active",
        statusText: "Đang học (Lớp K14)",
        meta: "Làm 15 đề • Điểm TB: 590",
      },
      {
        id: "3",
        code: "HV-1031",
        name: "Nguyễn Ngọc Diễm",
        category: "Khóa VIP 1-1",
        date: "08/09/2026",
        status: "pending",
        statusText: "Chờ xếp lớp",
        meta: "Chưa hoàn thành test đầu vào",
      },
    ];
  }

  if (pathname.includes("exams")) {
    return [
      {
        id: "1",
        code: "ETS-2024-T01",
        name: "ETS TOEIC 2024 Test 01 (Full 200 câu)",
        category: "Full Test (LC + RC)",
        date: "15/08/2026",
        status: "active",
        statusText: "Đã xuất bản",
        meta: "1.420 lượt thi • Điểm TB: 645",
      },
      {
        id: "2",
        code: "ETS-2024-T02",
        name: "ETS TOEIC 2024 Test 02 (Full 200 câu)",
        category: "Full Test (LC + RC)",
        date: "20/08/2026",
        status: "active",
        statusText: "Đã xuất bản",
        meta: "980 lượt thi • Điểm TB: 630",
      },
      {
        id: "3",
        code: "PART5-ADV-01",
        name: "Bộ 100 Câu Điền Khuyết Bẫy Từ Loại Part 5",
        category: "Part 5 Practice",
        date: "02/09/2026",
        status: "active",
        statusText: "Đã xuất bản",
        meta: "3.210 lượt luyện tập",
      },
      {
        id: "4",
        code: "DRAFT-MINI-09",
        name: "Mini Test 30 Phút Kiểm Tra Tuần 2",
        category: "Mini Test",
        date: "11/09/2026",
        status: "draft",
        statusText: "Bản nháp",
        meta: "Chưa kiểm duyệt audio",
      },
    ];
  }

  if (pathname.includes("revenue")) {
    return [
      {
        id: "1",
        code: "ORD-98214",
        name: "Gói Premium Pro 6 Tháng",
        category: "Nguyễn Thu Hà (nguyenha@gmail.com)",
        date: "13/09/2026 14:22",
        status: "active",
        statusText: "Thành công (Seepay)",
        meta: "1.490.000 ₫",
      },
      {
        id: "2",
        code: "ORD-98213",
        name: "Khóa Luyện Đề Chuyên Sâu 800+",
        category: "Vũ Hải Đăng (dangvu@gmail.com)",
        date: "13/09/2026 11:05",
        status: "active",
        statusText: "Thành công (Seepay)",
        meta: "3.200.000 ₫",
      },
      {
        id: "3",
        code: "ORD-98212",
        name: "Gói Luyện Nghe Listening Siêu Tốc",
        category: "Phạm Minh Trang (trangpm@gmail.com)",
        date: "13/09/2026 09:18",
        status: "pending",
        statusText: "Đang chờ thanh toán",
        meta: "599.000 ₫",
      },
    ];
  }

  if (pathname.includes("analytics")) {
    return [
      {
        id: "1",
        code: "ANL-PART-5",
        name: "Tỷ lệ sai cao nhất Part 5: Mệnh đề quan hệ rút gọn",
        category: "Reading - Grammar",
        date: "Tuần này",
        status: "active",
        statusText: "Cảnh báo 58% sai",
        meta: "4.820 lượt làm",
      },
      {
        id: "2",
        code: "ANL-PART-3",
        name: "Tỷ lệ sai cao Part 3: Câu hỏi suy luận ngụ ý",
        category: "Listening - Audio",
        date: "Tuần này",
        status: "active",
        statusText: "Cảnh báo 47% sai",
        meta: "3.910 lượt làm",
      },
    ];
  }

  return [
    {
      id: "1",
      code: "CFG-SYS-01",
      name: "Cấu hình Thời gian làm bài thi thử (Full Test = 120 phút)",
      category: "Assessment Settings",
      date: "01/09/2026",
      status: "active",
      statusText: "Đang áp dụng",
      meta: "Áp dụng toàn hệ thống",
    },
    {
      id: "2",
      code: "CFG-SYS-02",
      name: "Cấu hình Bảng quy đổi điểm TOEIC 2024",
      category: "Score Mapping Table",
      date: "01/09/2026",
      status: "active",
      statusText: "Đang áp dụng",
      meta: "Listening (5-495) • Reading (5-495)",
    },
    {
      id: "3",
      code: "ROLE-ADMIN-01",
      name: "Quyền Quản trị viên Cấp cao (Super Admin)",
      category: "Identity / Security",
      date: "10/08/2026",
      status: "active",
      statusText: "Kích hoạt",
      meta: "Toàn quyền trên cả 5 Services",
    },
  ];
}

export const AdminSectionPage = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const currentNav = getNavInfo(location.pathname);
  const mascotImg = getMascot(location.pathname, currentNav.sectionKey);
  const sampleRows = getSampleRows(location.pathname);

  const filteredRows = sampleRows.filter((row) => {
    const matchSearch =
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || row.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className={styles.container}>
      {/* Top Header Card with Mascot */}
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <img
            src={mascotImg}
            alt="Oysteic Mascot"
            className={`${styles.mascotIcon} animate-bob`}
          />
          <div>
            <h1 className={styles.pageTitle}>{currentNav.itemTitle}</h1>
            <p className={styles.pageDescription}>{currentNav.description}</p>
          </div>
        </div>

        <button type="button" className={styles.primaryBtn}>
          <IconPlus size={16} />
          <span>Thêm mới {currentNav.itemTitle}</span>
        </button>
      </div>

      {/* Toolbar: Search, Filter, Actions */}
      <div className={styles.toolbar}>
        <div className={styles.searchGroup}>
          <IconSearch size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Tìm kiếm mã, tên, danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động / Thành công</option>
            <option value="pending">Chờ xử lý / Phê duyệt</option>
            <option value="draft">Bản nháp</option>
          </select>

          <button
            type="button"
            className={styles.selectInput}
            style={{
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <IconDownload size={15} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên / Tiêu đề</th>
              <th>Phân loại / Ghi chú</th>
              <th>Ngày cập nhật</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 700, color: "#0284c7" }}>{row.code}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{row.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{row.meta}</div>
                  </td>
                  <td>{row.category}</td>
                  <td>{row.date}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        row.status === "active"
                          ? styles.statusActive
                          : row.status === "pending"
                            ? styles.statusPending
                            : styles.statusDraft
                      }`}
                    >
                      {row.statusText}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionCell}>
                      <button type="button" className={styles.btnAction}>
                        Chi tiết
                      </button>
                      <button type="button" className={styles.btnAction}>
                        Sửa
                      </button>
                      <button type="button" className={`${styles.btnAction} ${styles.btnDelete}`}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#94a3b8",
                  }}
                >
                  Không tìm thấy bản ghi phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className={styles.pagination}>
          <span>
            Hiển thị <strong>1 - {filteredRows.length}</strong> trong tổng số{" "}
            <strong>{filteredRows.length}</strong> kết quả
          </span>
          <div className={styles.pageBtns}>
            <button type="button" className={styles.pageBtn} disabled>
              <IconChevronLeft size={16} />
            </button>
            <button type="button" className={`${styles.pageBtn} ${styles.pageBtnActive}`}>
              1
            </button>
            <button type="button" className={styles.pageBtn}>
              2
            </button>
            <button type="button" className={styles.pageBtn}>
              3
            </button>
            <button type="button" className={styles.pageBtn}>
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

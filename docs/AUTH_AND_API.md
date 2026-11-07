# Auth & API

Thiết kế phía server: `toeic-space-be/docs/AUTHENTICATION.md`.

## Gọi API

- Dùng `httpClient` từ `@/services/http`. Không tự thêm header `Authorization`.
- API được gọi **cùng origin**: `VITE_API_BASE_URL` để trống. `npm run dev` proxy `/identity` và `/assessment` tới `VITE_DEV_PROXY_TARGET` (mặc định `http://localhost:5050`). Khi chạy Vite trong Docker, đặt biến này thành `http://host.docker.internal:5050`.
- Production: nginx proxy hai prefix trên tới gateway (`nginx.conf`, biến `API_GATEWAY_URL`). Nếu deploy `dist/` lên máy chủ khác, cấu hình tương tự và thêm các header trong `nginx-security-headers.inc`.

## Phiên đăng nhập (`modules/auth`)

| Việc                      | Cách làm                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Access token              | Chỉ nằm trong Zustand store (bộ nhớ). Không ghi vào localStorage, sessionStorage hay cookie          |
| Refresh token             | Cookie HttpOnly do server đặt, JavaScript không đọc được                                             |
| Hết hạn                   | Interceptor nhận 401 → refresh một lần → gửi lại request. Refresh thất bại → xoá phiên → về `/login` |
| Nhiều tab                 | Refresh chạy tuần tự qua Web Locks; đăng xuất được phát sang các tab khác (BroadcastChannel)         |
| Đăng xuất / đổi tài khoản | Xoá toàn bộ cache TanStack Query (câu hỏi, đáp án)                                                   |
| Chuyển hướng              | `?next=` chỉ nhận đường dẫn cùng origin                                                              |

## Bảo vệ route

```tsx
import { CONTENT_MANAGER_ROLES, RequireAuth } from "@/modules/auth";

<RequireAuth roles={CONTENT_MANAGER_ROLES}>
  <AdminShell />
</RequireAuth>;
```

Guard chỉ phục vụ trải nghiệm người dùng. Quyền thực sự do API kiểm tra trên mọi request.

## Layout dùng chung

`shared/` không được import module nghiệp vụ. `AdminLayout` nhận `account` và `onLogout` qua props; `modules/admin/components/AdminShell.tsx` nối chúng với module auth.

## Hiển thị nội dung đề

Các trường nội dung (đoạn văn, transcript, lời giải) có HTML và entity từ nguồn Studychill. Luôn hiển thị qua `RichText` từ `@/shared/components/RichText`, không dùng `dangerouslySetInnerHTML`. Chi tiết định dạng: `toeic-space-be/docs/CONTENT_FORMAT.md`.

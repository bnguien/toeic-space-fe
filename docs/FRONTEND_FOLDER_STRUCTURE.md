# Frontend Folder Structure

## `app/`

Chứa phần khởi tạo và kết nối toàn ứng dụng.

Ví dụ:

```text
app/
├── providers.tsx
├── query-client.ts
└── router.tsx
```

- `providers.tsx`: khai báo các Provider dùng toàn app.
- `query-client.ts`: cấu hình TanStack Query.
- `router.tsx`: gom route từ các module.

---

## `config/`

Chứa cấu hình global của ứng dụng.

Ví dụ:

```text
config/
├── locales/
├── env.ts
└── i18n.ts
```

- `env.ts`: quản lý biến môi trường.
- `i18n.ts`: cấu hình đa ngôn ngữ.
- `locales/`: chứa nội dung dịch theo từng ngôn ngữ.

---

## `modules/`

Chứa các business feature của hệ thống.

Ví dụ:

```text
modules/
└── auth/
```

Mỗi module tự quản lý code thuộc feature của nó.

Ví dụ cấu trúc Auth:

```text
auth/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── store/
├── types/
├── utils/
├── routes.tsx
└── index.ts
```

---

## `modules/<module>/api/`

Chứa các hàm gọi API của module.

Ví dụ:

```text
auth.api.ts
auth.query-keys.ts
```

- `auth.api.ts`: gọi các endpoint Auth.
- `auth.query-keys.ts`: định nghĩa query key cho TanStack Query.

---

## `modules/<module>/components/`

Chứa component chỉ dùng trong module đó.

Ví dụ:

```text
LoginForm.tsx
RegisterForm.tsx
```

---

## `modules/<module>/hooks/`

Chứa custom hook thuộc business của module.

Ví dụ:

```text
useLogin.ts
useCurrentUser.ts
```

Thường dùng để kết hợp API với TanStack Query.

---

## `modules/<module>/pages/`

Chứa các page của module.

Ví dụ:

```text
LoginPage.tsx
RegisterPage.tsx
```

---

## `modules/<module>/schemas/`

Chứa schema validation.

Thường dùng với:

```text
Zod
+
React Hook Form
```

Ví dụ:

```text
login.schema.ts
register.schema.ts
```

---

## `modules/<module>/store/`

Chứa Zustand store của module.

Dùng cho client state cần chia sẻ giữa nhiều component.

Server state từ backend nên dùng TanStack Query.

---

## `modules/<module>/types/`

Chứa TypeScript type và interface của module.

Ví dụ:

```text
User
LoginRequest
LoginResponse
```

---

## `modules/<module>/utils/`

Chứa helper function chỉ thuộc module đó.

Nếu utility được nhiều module sử dụng thì chuyển sang `shared/utils/`.

---

## `modules/<module>/routes.tsx`

Chứa route của module.

Mỗi module tự quản lý route của mình, sau đó `app/router.tsx` chỉ gom lại.

---

## `modules/<module>/index.ts`

Public API của module.

Code bên ngoài module nên import thông qua file này.

Ví dụ:

```ts
import { useCurrentUser } from "@/modules/auth";
```

Không nên import trực tiếp file nội bộ:

```ts
import { useCurrentUser } from "@/modules/auth/hooks/useCurrentUser";
```

---

## `shared/`

Chứa code được nhiều module cùng sử dụng.

```text
shared/
├── components/
├── hooks/
├── layouts/
├── constants/
├── types/
└── utils/
```

---

## `shared/components/`

Chứa UI component dùng chung.

Ví dụ:

```text
Button
Input
Modal
Loading
```

---

## `shared/hooks/`

Chứa custom hook dùng chung.

Ví dụ:

```text
useDebounce
useMediaQuery
```

---

## `shared/layouts/`

Chứa layout dùng cho nhiều page.

Ví dụ:

```text
MainLayout
AuthLayout
AdminLayout
```

---

## `shared/constants/`

Chứa constant dùng chung toàn ứng dụng.

---

## `shared/types/`

Chứa type thực sự được nhiều module cùng sử dụng.

---

## `shared/utils/`

Chứa utility function dùng chung.

Ví dụ:

```text
formatDate
formatCurrency
```

---

## `services/`

Chứa các service hạ tầng dùng chung.

Ví dụ:

```text
services/
└── http/
```

Không chứa business API cụ thể.

---

## `services/http/`

Chứa cấu hình HTTP client.

Ví dụ:

```text
httpClient.ts
interceptors.ts
index.ts
```

- `httpClient.ts`: cấu hình Axios.
- `interceptors.ts`: xử lý request/response interceptor.
- `index.ts`: public API của HTTP service.

---

## `assets/`

Chứa tài nguyên tĩnh.

```text
assets/
├── images/
├── icons/
└── fonts/
```

---

## `styles/`

Chứa style global của ứng dụng.

Ví dụ:

```text
globals.css
```

---

## `main.tsx`

Entry point của React application.

Có nhiệm vụ mount ứng dụng và kết nối:

```text
Providers
+
Router
+
Global styles
```

---

# Quy tắc đặt file

```text
Chỉ một module dùng
→ modules/<module>/

Nhiều module dùng
→ shared/

Hạ tầng kỹ thuật
→ services/

Cấu hình global
→ config/

Khởi tạo ứng dụng
→ app/
```

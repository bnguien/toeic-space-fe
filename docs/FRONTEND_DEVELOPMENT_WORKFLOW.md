# Frontend Development Flow

Tài liệu này mô tả 2 luồng chính khi làm việc với frontend repo:

- Setup ban đầu sau khi clone project.
- Luồng code và commit hằng ngày.

---

# 1. Flow setup ban đầu sau khi clone

Sau khi clone repo:

```bash
git clone <repository-url>
cd toeic-space-fe
```

## Bước 1: Dùng đúng Node version

Project sử dụng `.nvmrc`.

Chạy:

```bash
nvm use
```

Nếu máy chưa có Node version tương ứng:

```bash
nvm install
nvm use
```

Kiểm tra:

```bash
node -v
npm -v
```

---

## Bước 2: Cài dependencies

Chạy:

```bash
npm ci
```

`npm ci` sẽ cài đúng dependency theo `package-lock.json`.

Không nên dùng:

```bash
npm install --force
npm install --legacy-peer-deps
```

nếu không có lý do rõ ràng.

---

## Bước 3: Tạo file môi trường

Copy file mẫu:

```bash
cp .env.example .env
```

Sau đó cập nhật giá trị trong `.env` nếu cần.

Ví dụ:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## Bước 4: Chạy project

```bash
npm run dev
```

Mặc định Vite thường chạy tại:

```text
http://localhost:5173
```

---

## Flow tổng quát

```text
Clone repo
   ↓
cd toeic-space-fe
   ↓
nvm use
   ↓
npm ci
   ↓
cp .env.example .env
   ↓
npm run dev
   ↓
Bắt đầu code
```

---

# 2. Flow khi code và commit

## Bước 1: Bắt đầu code

Mỗi lần mở project:

```bash
cd toeic-space-fe
nvm use
npm run dev
```

Nếu vừa pull code mới và `package-lock.json` thay đổi thì chạy lại:

```bash
npm ci
```

---

## Bước 2: Code feature

Code theo cấu trúc module đã thống nhất.

Ví dụ:

```text
modules/auth/
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

Nguyên tắc:

```text
Code riêng feature
→ modules/<feature>/

Code dùng chung
→ shared/

Hạ tầng kỹ thuật
→ services/

Cấu hình
→ config/
```

---

## Bước 3: Kiểm tra code

Trước khi commit nên chạy:

```bash
npm run lint
npm run typecheck
npm run build
```

Ý nghĩa:

```text
npm run lint
→ kiểm tra ESLint và architecture rules

npm run typecheck
→ kiểm tra lỗi TypeScript

npm run build
→ kiểm tra project có build thành công hay không
```

---

## Bước 4: Stage và commit

```bash
git add .
git commit -m "feat: ..."
```

Khi commit:

```text
git commit
   ↓
Husky pre-commit
   ↓
lint-staged
   ↓
ESLint + Prettier
   ↓
Pass
   ↓
Commit thành công
```

Nếu có lỗi ESLint thì commit sẽ bị chặn để sửa trước.

---

## Bước 5: Push code

```bash
git push
```

---

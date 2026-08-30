# Frontend Coding Conventions

## Responsive

- Áp dụng mobile-first.
- Breakpoints chuẩn:
  - Mobile: `< 768px`
  - Tablet: `768px - 1023px`
  - Desktop: `>= 1024px`
- Ưu tiên Flexbox/Grid và kích thước tương đối.
- Tránh hard-code width cố định lớn.
- Component tự quản lý responsive của chính nó.
- Chỉ dùng JavaScript media query khi behavior thay đổi, không dùng thay CSS.
- Mọi page phải kiểm tra trên mobile, tablet và desktop trước khi merge.

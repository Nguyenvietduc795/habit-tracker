# Mini Habit Tracker

App theo dõi thói quen: đăng ký tài khoản → tạo thói quen → mỗi ngày đánh dấu đã làm → xem chuỗi ngày liên tục (streak).

Bài tập 1 ngày của training **"Tư duy Big Picture cho Team IT" — NhiLe Holdings**.

---

## Stack

| Lớp | Công nghệ |
|---|---|
| Database | PostgreSQL (Supabase) — schema quan ly bang file SQL danh so trong `api/db/` |
| Backend | NestJS + TypeScript, auth bằng JWT (access + refresh token) |
| Frontend | React 19 + Vite + TypeScript + TanStack Query |
| Deploy | Frontend → Vercel · Backend → Render · DB → Supabase |

## Vì sao chọn stack này

> ⚠️ **Phần này tự viết tay, không paste AI.** Viết được = hiểu. Viết không được = chưa hiểu.
> Trả lời 3 câu:
> 1. Vì sao chọn Postgres mà không phải MongoDB cho app này?
> 2. Vì sao tách backend riêng thay vì làm hết trong Next.js?
> 3. Nếu phải đổi 1 thứ trong stack trên, đổi cái nào? Vì sao?

_(chưa viết)_

---

## Cấu trúc thư mục

```
habit-tracker/
├─ web/     → Frontend (React + Vite)
├─ api/     → Backend (NestJS)
├─ docs/    → ARCHITECTURE.md, ERD
└─ .env.example
```

## Chạy ở máy local

**Yêu cầu:** Node 20+, npm, một database Postgres (Supabase free tier hoặc Postgres local).

1. Clone repo về và cài thư viện:

```bash
npm install --prefix web && npm install --prefix api
```

2. Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

3. Điền `DATABASE_URL` và `JWT_SECRET` thật vào `.env`.

4. Tạo bảng: mở Supabase → SQL Editor → dán nội dung [`api/db/001_init.sql`](api/db/001_init.sql) → Run.
   (Hoặc chạy bằng psql: `psql "$DATABASE_URL" -f api/db/001_init.sql`)

5. Chạy backend (cổng 3000) và frontend (cổng 5173) ở 2 cửa sổ terminal:

```bash
npm run start:dev --prefix api
```

```bash
npm run dev --prefix web
```

---

## Link

- **Frontend (production):** _(chưa deploy)_
- **Backend (production):** _(chưa deploy)_
- **Kiến trúc:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Deploy

```
Trình duyệt ──▶ Vercel (web/)  ── /api/* chuyển tiếp ──▶ Render (api/) ──▶ Supabase (Postgres)
               habit-tracker.vercel.app                  *.onrender.com
```

**Vì sao đi qua `/api` thay vì gọi thẳng Render?** Frontend và backend khác tên miền thì cookie refresh token thành "cookie bên thứ ba" — Safari/iPhone chặn, user bị đăng xuất mỗi lần tải lại trang. Cho Vercel chuyển tiếp `/api` thì trình duyệt chỉ thấy **một** tên miền.

| Nơi | Cấu hình | Ghi chú |
|---|---|---|
| Render | [`render.yaml`](render.yaml) | New → Blueprint → chọn repo. Chỉ cần dán `DATABASE_URL`; `JWT_SECRET` Render tự sinh |
| Vercel | [`web/vercel.json`](web/vercel.json) | Import repo, **Root Directory = `web`**. Không cần biến môi trường nào |

Thử bản production ngay trên máy (bắt chước proxy của Vercel):

```bash
npm --prefix web run build
```

```bash
npm --prefix web run preview
```

> Backend chạy local cần `COOKIE_PATH=/api/auth` khi thử theo cách này.

**Lưu ý Render free:** không có request trong 15 phút thì server ngủ, lần mở đầu tiên sau đó mất khoảng 30–60 giây để thức dậy.

---

## Tiến độ theo 6 chặng

- [x] Chặng 1 — Setup & Repo
- [x] Chặng 2 — Database (ERD + migration)
- [x] Chặng 3 — Backend (API contract + auth + CRUD)
- [x] Chặng 4 — Frontend (layout + login + list)
- [ ] Chặng 5 — Kết nối & Auth end-to-end
- [ ] Chặng 6 — Deploy & Tài liệu

---

## Ghi công

- **Bé cáo** trên trang chính lấy từ [page-mascot](https://github.com/nilbuild/page-mascot) của Kamran Ahmed, giấy phép MIT. Ảnh nhân vật nằm ở `web/public/mascots/`, component đã chép về `web/src/components/Mascot.tsx` (giữ nguyên thông báo giấy phép) và sửa thêm hàm `react()` để cáo phản ứng khi tick.

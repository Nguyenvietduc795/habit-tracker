# Kiến trúc — Mini Habit Tracker

> Tài liệu 1 trang. Mục đích: 6 tháng sau mở ra vẫn hiểu **vì sao** hồi đó mình chọn vậy.
> Mọi quyết định ở đây phải có chữ ký của bạn, kể cả khi trùng y lời AI gợi ý.

---

## 1. Sơ đồ 3 lớp

```
┌─────────────────────┐
│  FRONTEND  (web/)   │   React + Vite
│  Cái user nhìn thấy │   Màn login, danh sách habit, nút check-in
└──────────┬──────────┘
           │  gọi qua HTTP, kèm access token trong header
           │  Authorization: Bearer <token>
           ▼
┌─────────────────────┐
│  BACKEND   (api/)   │   NestJS
│  Bộ não, giữ luật   │   Kiểm token · kiểm quyền · tính streak
└──────────┬──────────┘
           │  truy vấn qua Prisma
           ▼
┌─────────────────────┐
│  DATABASE           │   PostgreSQL
│  Nơi lưu trữ        │   users · habits · check_ins
└─────────────────────┘
```

**Luật bất di bất dịch:** mọi kiểm tra quyền nằm ở Backend. Frontend chỉ để hiển thị — không bao giờ tin dữ liệu gửi lên từ trình duyệt.

---

## 2. Auth đi xuyên 3 lớp như thế nào

_(điền sau khi làm xong Chặng 5)_

- Access token sống ở đâu: _(cookie httpOnly? localStorage? in-memory?)_ — vì sao chọn:
- Refresh token sống ở đâu — vì sao chọn:
- Access token hết hạn thì xử lý ra sao:
- Logout thì thu hồi token kiểu gì:

---

## 3. Các quyết định kiến trúc

> Mỗi mục ghi theo mẫu: **Quyết định** → **Vì sao** → **Đánh đổi (mất gì)**.

### QĐ-01 — Chọn PostgreSQL thay vì MongoDB

- **Vì sao:**
- **Đánh đổi:**

### QĐ-02 — Tách backend riêng thay vì gộp vào Next.js

- **Vì sao:**
- **Đánh đổi:**

### QĐ-03 — Chỗ lưu token

- **Vì sao:**
- **Đánh đổi:**

### QĐ-04 — Tính streak ở backend hay frontend

- **Vì sao:**
- **Đánh đổi:**

---

## 4. Chỗ biết trước là sẽ phải sửa

_(Trả lời câu hỏi chốt Chặng 2: schema chỗ nào sẽ break sau 6 tháng?)_

---

## 5. Nếu có thêm 1 tuần, tôi sẽ làm khác chỗ nào

_(điền cuối ngày)_

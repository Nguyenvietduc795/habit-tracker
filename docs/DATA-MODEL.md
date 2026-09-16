# Data Model & Yêu cầu — Mini Habit Tracker

Tài liệu Chặng 2. Trả lời 3 câu: dữ liệu gồm gì, app làm được gì, và chạy tốt nghĩa là thế nào.

---

## 1. Thực thể

| Bảng | Là gì | Vì sao tách riêng |
|---|---|---|
| `users` | Người dùng | Mỗi người có dữ liệu riêng, phải phân biệt được |
| `habits` | Thói quen | Một người nhiều thói quen |
| `check_ins` | Một lần tick của một ngày | Một thói quen nhiều lần tick |
| `refresh_tokens` | Phiên đăng nhập dài hạn | Cần thu hồi được khi logout / đổi mật khẩu |

**Streak không phải bảng, cũng không phải cột.** Tính ra được từ `check_ins`. Lưu lại = một sự thật nằm hai chỗ = sẽ lệch.

---

## 2. Sơ đồ quan hệ (ERD)

```
┌──────────────────────┐
│ users                │
│──────────────────────│
│ id            uuid PK│
│ email         text   │◄── unique theo lower(email)
│ password_hash text   │
│ display_name  text   │
│ timezone      text   │
│ created_at    tstz   │
│ updated_at    tstz   │
└─────────┬────────────┘
          │ 1
          │
          │ n                          ┌──────────────────────┐
┌─────────▼────────────┐               │ refresh_tokens       │
│ habits               │               │──────────────────────│
│──────────────────────│               │ id          uuid PK  │
│ id          uuid PK  │               │ user_id     uuid FK  │──┐
│ user_id     uuid FK  │──┐            │ token_hash  text  UQ │  │
│ name        text     │  │            │ expires_at  tstz     │  │
│ frequency   text     │  │            │ revoked_at  tstz     │  │
│ color       text     │  │            │ user_agent  text     │  │
│ archived_at tstz     │  │            │ created_at  tstz     │  │
│ created_at  tstz     │  │            └──────────────────────┘  │
│ updated_at  tstz     │  │                                      │
└─────────┬────────────┘  └──────────────────────────────────────┘
          │ 1                    cả hai FK đều trỏ về users.id
          │                      ON DELETE CASCADE
          │ n
┌─────────▼────────────┐
│ check_ins            │
│──────────────────────│
│ id         uuid PK   │
│ habit_id   uuid FK   │
│ done_on    date      │
│ note       text      │
│ created_at tstz      │
│──────────────────────│
│ UNIQUE(habit_id,     │
│        done_on)      │◄── một habit, một ngày, một lần
└──────────────────────┘
```

**Không có quan hệ nhiều-nhiều nào.** Đó là lý do đề này vừa sức 1 ngày.

---

## 3. Vì sao chọn kiểu dữ liệu đó

| Cột | Kiểu | Lý do |
|---|---|---|
| `id` | `uuid` | Số tăng dần để lộ thông tin: đoán được id người khác, biết được hệ thống có bao nhiêu bản ghi |
| `email` | `text` | `varchar(n)` không nhanh hơn trong Postgres, chỉ thêm giới hạn phải migration mới nới được |
| `password_hash` | `text` | Không bao giờ có cột `password`. DB lộ thì mật khẩu vẫn an toàn |
| `created_at` | `timestamptz` | Có múi giờ. `timestamp` thường sẽ lệch giờ âm thầm khi server khác múi giờ user |
| `done_on` | `date` | Luật là "hôm nay làm chưa", không phải "làm lúc mấy giờ". Lưu thừa giờ thì so sánh ngày sai |
| `frequency` | `text` + CHECK | ENUM của Postgres thêm giá trị mới phải sửa cấu trúc; CHECK sửa dễ hơn |
| `timezone` | `text` | "Ngày" phụ thuộc múi giờ — không có cột này thì streak sai với user khác múi giờ |

**Quy tắc xoá:**

| Tình huống | Chọn | Lý do |
|---|---|---|
| Xoá user | `ON DELETE CASCADE` | Xoá tài khoản là xoá sạch, user có quyền đó |
| Xoá habit | `ON DELETE CASCADE` | Giữ check-in của habit đã xoá = dữ liệu mồ côi |
| User bỏ thói quen | `archived_at` (ẩn, không xoá) | Xoá thật là mất luôn lịch sử — người ta tiếc |

---

## 4. Tính năng cần xây (chức năng)

### 4.1 Tài khoản

| # | Tính năng | Ghi chú |
|---|---|---|
| A1 | Đăng ký (email + mật khẩu) | Băm mật khẩu bằng argon2/bcrypt |
| A2 | Đăng nhập | Trả access token + refresh token |
| A3 | Làm mới token | Dùng refresh token lấy access token mới |
| A4 | Đăng xuất | Thu hồi refresh token (ghi `revoked_at`) |
| A5 | Xem thông tin mình | `GET /me` |

### 4.2 Habits — CRUD đầy đủ

| # | Thao tác | HTTP | Ghi chú |
|---|---|---|---|
| H1 | **C**reate — tạo thói quen | `POST /habits` | Tên 1–100 ký tự |
| H2 | **R**ead — danh sách | `GET /habits` | Chỉ habit của mình, mặc định ẩn cái đã archive |
| H3 | **R**ead — chi tiết | `GET /habits/:id` | Kèm lịch sử check-in + streak |
| H4 | **U**pdate — sửa | `PATCH /habits/:id` | Đổi tên, màu, tần suất |
| H5 | **D**elete — lưu trữ | `PATCH /habits/:id/archive` | Ẩn, không xoá |
| H6 | **D**elete — xoá thật | `DELETE /habits/:id` | Có xác nhận, cascade luôn check-in |

### 4.3 Check-ins

| # | Thao tác | HTTP | Ghi chú |
|---|---|---|---|
| C1 | Tick hôm nay | `POST /habits/:id/check-in` | Tick lần 2 trong ngày → DB chặn. **Không tick bù ngày cũ** |
| C2 | Bỏ tick hôm nay | `DELETE /habits/:id/check-in` | Lỡ tay bấm nhầm. Ngày cũ đã khoá |
| C3 | Xem lịch sử | `GET /habits/:id/check-ins?from=&to=` | Vẽ lịch trong tháng — chỉ để xem |

### 4.4 Tính toán (không phải CRUD)

| # | Tính năng | Luật phải tự quyết |
|---|---|---|
| S1 | Streak hiện tại | Nghỉ 1 ngày có mất chuỗi không? |
| S2 | Streak dài nhất | |
| S3 | Tỷ lệ hoàn thành 30 ngày | Tính theo ngày tạo habit hay 30 ngày chẵn? |

> **S1 là quyết định sản phẩm, không phải quyết định kỹ thuật.** AI không trả lời thay được. Ghi lựa chọn vào ARCHITECTURE.md.

### 4.5 Luật nghiệp vụ (bắt buộc kiểm ở backend)

1. User chỉ đọc/sửa/xoá được habit của **chính mình** — kiểm ở backend, không tin frontend.
2. Chỉ check-in / bỏ check-in cho **hôm nay** — không tick bù ngày cũ, không tick trước ngày tương lai (database không làm được luật này).
3. Ngày "hôm nay" tính theo `users.timezone`, không theo giờ server.
4. Habit đã archive thì không tick được nữa.

---

## 5. Yêu cầu phi chức năng

| Nhóm | Yêu cầu | Đo bằng gì |
|---|---|---|
| **Bảo mật** | Mật khẩu băm bằng argon2/bcrypt, không bao giờ lưu thô | Đọc bảng `users` không thấy mật khẩu |
| | Refresh token lưu dạng **băm** trong DB | Đọc `refresh_tokens` không dùng lại được token |
| | Mọi API (trừ login/register) phải có token hợp lệ | Gọi không token → 401 |
| | User A không truy cập được dữ liệu user B | Test thật: login A, gọi id của B → 403/404 |
| | Chỉ chạy HTTPS ở production | |
| | Secret nằm trong biến môi trường, không trong code | `grep` repo không ra secret nào |
| **Hiệu năng** | API trả về < 300ms với 1.000 check-in | Đo bằng Postman |
| | Có index cho mọi cột dùng để lọc | `user_id`, `(habit_id, done_on)` |
| **Tin cậy** | Mọi thay đổi schema qua file migration đánh số | `api/db/00X_*.sql` |
| | Database có backup tự động | Supabase free tier có sẵn |
| | Lỗi trả về đúng mã HTTP, không nuốt lỗi | 400/401/403/404/409/500 |
| **Dùng được** | Màn hình rỗng phải có hướng dẫn, không để trống trơn | |
| | Báo lỗi bằng tiếng người, không phải mã lỗi kỹ thuật | |
| | Dùng được trên màn hình điện thoại | Thử ở chiều rộng 375px |
| **Bảo trì** | Người khác clone về chạy được theo README | Thử clone sang thư mục mới |
| | TypeScript bật `strict` | |
| | Commit rõ nghĩa, mỗi chặng ít nhất một commit | |
| **Chi phí** | Chạy hết trong free tier | Supabase + Render + Vercel = 0đ |

---

## 6. Chỗ biết trước sẽ phải sửa

| Chỗ | Vấn đề sẽ gặp | Khi nào phải sửa |
|---|---|---|
| `frequency` chỉ có `daily`/`weekly` | Không diễn tả được "3 lần mỗi tuần" hay "thứ 2-4-6" | Khi user đầu tiên đòi |
| `timezone` cố định theo user | User đi nước ngoài, ngày bị nhảy | Khi có user di chuyển |
| Chưa có bảng `habit_goals` | Muốn đặt mục tiêu "20 ngày trong tháng" thì chưa có chỗ lưu | |
| `check_ins` không giới hạn dung lượng | 1.000 user × 5 habit × 365 ngày ≈ 1,8 triệu dòng/năm — vẫn ổn với Postgres, nhưng cần partition khi lớn hơn nhiều | Còn xa |

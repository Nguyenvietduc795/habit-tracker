# API Contract — Mini Habit Tracker

> Viết **trước** khi code. Frontend và Backend nhìn vào đây mà làm, không cần hỏi nhau.
> Base URL local: `http://localhost:3000`

---

## Quy ước chung

**Xác thực:** mọi endpoint trừ `/auth/register`, `/auth/login`, `/auth/refresh` đều cần header:

```
Authorization: Bearer <access_token>
```

**Access token** sống 15 phút, trả trong body JSON — frontend giữ trong bộ nhớ (state), không ghi vào localStorage.

**Refresh token** sống 7 ngày, gửi về bằng **cookie httpOnly** — JavaScript không đọc được, nên kẻ tấn công chèn script vào trang cũng không lấy được.

**Mã lỗi dùng chung:**

| Mã | Nghĩa | Khi nào gặp |
|---|---|---|
| 400 | Dữ liệu gửi lên sai | Thiếu trường, email sai định dạng, mật khẩu ngắn |
| 401 | Chưa đăng nhập / token hỏng | Không có token, token hết hạn |
| 403 | Đăng nhập rồi nhưng không có quyền | Đụng vào habit của người khác |
| 404 | Không tìm thấy | Habit không tồn tại |
| 409 | Xung đột | Email đã đăng ký, tick 2 lần một ngày |
| 500 | Lỗi server | Bug |

**Hình dạng lỗi trả về:**

```json
{
  "statusCode": 409,
  "message": "Email này đã được đăng ký",
  "error": "Conflict"
}
```

---

## 1. Auth

### `POST /auth/register` — Đăng ký

```json
// Request
{ "email": "duc@example.com", "password": "MatKhau123", "displayName": "Đức" }
```

- `email`: bắt buộc, đúng định dạng email
- `password`: bắt buộc, tối thiểu 8 ký tự
- `displayName`: không bắt buộc

```json
// 201 Created
{
  "user": { "id": "uuid", "email": "duc@example.com", "displayName": "Đức", "timezone": "Asia/Ho_Chi_Minh" },
  "accessToken": "eyJhbGci..."
}
// + Set-Cookie: refresh_token=...; HttpOnly; SameSite=Lax; Path=/auth
```

Lỗi: `409` email đã tồn tại · `400` dữ liệu sai

---

### `POST /auth/login` — Đăng nhập

```json
// Request
{ "email": "duc@example.com", "password": "MatKhau123" }
```

```json
// 200 OK — giống hệt register
{ "user": { ... }, "accessToken": "eyJhbGci..." }
```

Lỗi: `401` sai email **hoặc** sai mật khẩu

> Cố ý trả **cùng một thông báo** cho cả hai trường hợp. Nếu báo riêng "email không tồn tại" thì kẻ xấu dò được email nào đã đăng ký trong hệ thống.

---

### `POST /auth/refresh` — Lấy access token mới

Không có body. Backend đọc refresh token từ cookie.

```json
// 200 OK
{ "accessToken": "eyJhbGci..." }
// + Set-Cookie: refresh_token=<token MỚI>
```

> **Xoay vòng token (rotation):** mỗi lần refresh, token cũ bị thu hồi và cấp token mới. Nếu ai đó dùng lại token cũ đã thu hồi → dấu hiệu bị đánh cắp → thu hồi toàn bộ phiên của user đó.

Lỗi: `401` không có cookie / token hết hạn / token đã bị thu hồi

---

### `POST /auth/logout` — Đăng xuất

Cần đăng nhập. Thu hồi refresh token hiện tại và xoá cookie.

```json
// 200 OK
{ "success": true }
```

---

### `GET /auth/me` — Thông tin của mình

```json
// 200 OK
{ "id": "uuid", "email": "duc@example.com", "displayName": "Đức", "timezone": "Asia/Ho_Chi_Minh" }
```

---

## 2. Habits

### `GET /habits` — Danh sách thói quen của mình

Query: `?includeArchived=true` (mặc định `false`)

```json
// 200 OK
[
  {
    "id": "uuid",
    "name": "Tập gym",
    "frequency": "daily",
    "color": "#B8851A",
    "archivedAt": null,
    "createdAt": "2026-09-15T01:00:00.000Z",
    "currentStreak": 7,
    "checkedToday": true
  }
]
```

> `currentStreak` và `checkedToday` **tính ra lúc đọc**, không lưu trong database.

---

### `POST /habits` — Tạo thói quen

```json
// Request
{ "name": "Tập gym", "frequency": "daily", "color": "#B8851A" }
```

- `name`: bắt buộc, 1–100 ký tự
- `frequency`: `daily` hoặc `weekly`, mặc định `daily`
- `color`: không bắt buộc

```json
// 201 Created — trả về habit vừa tạo
```

---

### `GET /habits/:id` — Chi tiết

```json
// 200 OK
{
  "id": "uuid", "name": "Tập gym", "frequency": "daily",
  "currentStreak": 7, "longestStreak": 21, "checkedToday": true,
  "checkIns": [ { "doneOn": "2026-09-15", "note": null } ]
}
```

Lỗi: `404` không tồn tại **hoặc không phải của mình**

> Cố ý trả `404` chứ không phải `403` khi habit thuộc người khác — trả `403` là vô tình xác nhận "id này có thật", giúp kẻ xấu dò được hệ thống có bao nhiêu habit.

---

### `PATCH /habits/:id` — Sửa

```json
// Request — gửi trường nào sửa trường đó
{ "name": "Tập gym buổi sáng", "color": "#2F6B4F" }
```

---

### `PATCH /habits/:id/archive` — Lưu trữ (ẩn, không xoá)

```json
// Request
{ "archived": true }   // false = bỏ lưu trữ, dùng lại
```

---

### `DELETE /habits/:id` — Xoá hẳn

```
// 204 No Content
```

> Xoá luôn toàn bộ check-in của habit đó (`ON DELETE CASCADE`). Không khôi phục được. Frontend phải hỏi xác nhận trước khi gọi.

---

## 3. Check-ins

### `POST /habits/:id/check-in` — Đánh dấu đã làm **hôm nay**

> **Chỉ tick được cho hôm nay** (theo múi giờ của user). Không tick bù ngày cũ — nếu cho tick bù thì ai cũng tự "vá" được chuỗi và con số 🔥 mất ý nghĩa.

```json
// Request — date không cần gửi; nếu gửi thì phải đúng là hôm nay
{ "note": "Chạy 5km" }
```

```json
// 201 Created
{ "doneOn": "2026-09-16", "note": "Chạy 5km", "currentStreak": 8 }
```

Lỗi:
- `409` hôm nay đã tick rồi
- `400` gửi `date` khác hôm nay (ngày cũ hoặc tương lai)
- `400` habit đã lưu trữ
- `404` habit không phải của mình

---

### `DELETE /habits/:id/check-in` — Bỏ tick **hôm nay**

Dùng khi lỡ tay bấm nhầm. Lịch sử ngày cũ đã khoá: không tick bù được thì cũng không xoá được.

```
// 204 No Content
```

Lỗi: `400` nếu gửi `?date=` khác hôm nay · `404` hôm nay chưa tick

---

### `GET /habits/:id/check-ins?from=2026-09-01&to=2026-09-30` — Lịch sử

```json
// 200 OK
[ { "doneOn": "2026-09-15", "note": "Chạy 5km" } ]
```

---

## 4. Luật nghiệp vụ backend phải giữ

Những luật này **không** đặt được ở database, nên backend bắt buộc phải kiểm:

| # | Luật | Vì sao database không làm được |
|---|---|---|
| 1 | User chỉ đụng được dữ liệu của mình | Database không biết ai đang gọi API |
| 2 | Chỉ tick / bỏ tick cho **hôm nay** — ngày cũ đã khoá | Postgres không cho dùng `current_date` trong CHECK |
| 3 | "Hôm nay" tính theo `users.timezone` | Database chỉ biết giờ server |
| 4 | Habit đã lưu trữ thì không tick được | Cần đọc trạng thái habit rồi mới quyết định |

Luật *"một habit một ngày một lần"* thì ngược lại — database giữ (`UNIQUE(habit_id, done_on)`), backend chỉ việc bắt lỗi `23505` và đổi thành `409`.

---

## 5. Quy ước streak (quyết định sản phẩm)

| Câu hỏi | Chốt |
|---|---|
| Nghỉ 1 ngày có mất chuỗi không? | **Có** — mất luôn, về 0 |
| Chuỗi tính tới hôm nay hay hôm qua? | Tick hôm nay hoặc hôm qua đều còn tính là "đang giữ chuỗi" |
| Habit `weekly` tính sao? | Bản này tính giống `daily` — nợ kỹ thuật, ghi rõ trong ARCHITECTURE.md |

> Đây là **quyết định sản phẩm, không phải kỹ thuật**. Đổi luật này thì code đổi theo, không có đáp án đúng tuyệt đối.

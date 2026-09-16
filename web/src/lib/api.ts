/**
 * Local: goi thang backend o cong 3000.
 * Production: goi /api tren CHINH ten mien cua frontend; Vercel chuyen tiep sang Render
 * (xem web/vercel.json). Cung ten mien -> cookie refresh token khong bi Safari chan.
 */
const API_URL = import.meta.env.PROD
  ? // Co dinh, KHONG doc bien moi truong: lo dat sai VITE_API_URL tren Vercel
    // (vd. dan nguyen file .env) thi app van goi dung /api.
    '/api'
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

/**
 * Access token CHI nam trong bien nay (bo nho), khong ghi vao localStorage.
 * Tai lai trang la mat -> lay lai bang refresh token trong cookie httpOnly.
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Goi khi refresh that bai -> AuthProvider dua user ve man dang nhap
let onSessionExpired: (() => void) | null = null

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

/**
 * CHI MOT lan refresh chay cung luc.
 *
 * Vi sao bat buoc: backend xoay vong refresh token va coi viec dung lai token
 * cu la dau hieu bi danh cap -> thu hoi MOI phien. Neu 2 request cung het han
 * roi cung goi refresh, request thu 2 dung token vua bi thu hoi -> user bi
 * da ra ngoai. React StrictMode chay effect 2 lan nen loi nay xay ra ngay
 * khi mo trang o che do dev.
 */
let refreshing: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          accessToken = null
          return null
        }
        const data = (await res.json()) as { accessToken: string }
        accessToken = data.accessToken
        return accessToken
      })
      .catch(() => {
        accessToken = null
        return null
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

// Nhung endpoint nay tu xu ly 401, khong tu dong refresh
const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh']

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  json?: unknown
}

export async function api<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const headers = new Headers()
  if (options.json !== undefined) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      // Bat buoc de trinh duyet gui kem va nhan cookie refresh token
      credentials: 'include',
      body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ')
  }

  // Access token het han -> lay token moi roi thu lai DUNG MOT lan
  if (res.status === 401 && retry && !NO_RETRY.includes(path)) {
    const token = await refreshAccessToken()
    if (token) return api<T>(path, options, false)
    onSessionExpired?.()
  }

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) message = body.message.join(', ')
      else if (body.message) message = body.message
    } catch {
      // body khong phai JSON -> giu statusText
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Doi loi ky thuat thanh cau tieng nguoi. */
export function friendlyError(error: unknown, byStatus: Partial<Record<number, string>> = {}): string {
  if (error instanceof ApiError) {
    if (byStatus[error.status]) return byStatus[error.status]!
    if (error.status === 0) return 'Không kết nối được máy chủ. Backend đã chạy chưa?'
    if (error.status === 401) return 'Phiên đăng nhập đã hết, đăng nhập lại nhé.'
    if (error.status === 404) return 'Không tìm thấy — có thể đã bị xoá.'
    if (error.status >= 500) return 'Máy chủ đang gặp sự cố, thử lại sau ít phút.'
    return error.message
  }
  return 'Có lỗi xảy ra, thử lại nhé.'
}

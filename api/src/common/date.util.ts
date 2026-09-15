/**
 * "Hom nay" phu thuoc mui gio cua user, khong phai mui gio cua server.
 * User tick luc 23:30 o VN ma server o Tokyo/My thi ngay se lech -> streak sai.
 */

/** Tra ve ngay hom nay dang YYYY-MM-DD theo mui gio cho truoc. */
export function todayIn(timezone: string): string {
  try {
    // 'en-CA' cho dinh dang san YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
      new Date(),
    );
  } catch {
    // Mui gio khong hop le -> quay ve gio server, khong lam sap app
    return new Intl.DateTimeFormat('en-CA').format(new Date());
  }
}

/** Cong them so ngay vao mot chuoi YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** So sanh: a co truoc b khong (chuoi YYYY-MM-DD so sanh truc tiep duoc). */
export function isAfter(a: string, b: string): boolean {
  return a > b;
}

/**
 * Chuoi ngay lien tuc tinh den hien tai.
 *
 * LUAT SAN PHAM (xem docs/API-CONTRACT.md muc 5):
 *  - Nghi 1 ngay la mat chuoi, ve 0.
 *  - Tick hom nay HOAC hom qua deu con duoc tinh la dang giu chuoi
 *    (chua tick hom nay khong co nghia la da dut).
 */
export function currentStreak(datesDesc: string[], today: string): number {
  if (datesDesc.length === 0) return 0;

  const yesterday = addDays(today, -1);
  const latest = datesDesc[0];

  if (latest !== today && latest !== yesterday) return 0;

  let streak = 1;
  let expected = addDays(latest, -1);

  for (let i = 1; i < datesDesc.length; i++) {
    if (datesDesc[i] !== expected) break;
    streak++;
    expected = addDays(expected, -1);
  }

  return streak;
}

/** Chuoi dai nhat tung dat duoc. */
export function longestStreak(datesDesc: string[]): number {
  if (datesDesc.length === 0) return 0;

  let longest = 1;
  let run = 1;

  for (let i = 1; i < datesDesc.length; i++) {
    if (datesDesc[i] === addDays(datesDesc[i - 1], -1)) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  return longest;
}

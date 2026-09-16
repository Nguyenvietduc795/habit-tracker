import { addDays, currentStreak, longestStreak } from './date.util.js';

// API khong con cho tick ngay cu, nen khong dung smoke test dung nhieu ngay lien tiep
// duoc nua. Kiem truc tiep ham tinh chuoi o day.

const TODAY = '2026-09-16';
const days = (...offsets: number[]) => offsets.map((n) => addDays(TODAY, n));

describe('addDays', () => {
  it('cong tru ngay qua ranh gioi thang va nam', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // nam nhuan
  });
});

describe('currentStreak', () => {
  it('chua tick lan nao -> 0', () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });

  it('tick hom nay va 2 ngay truoc lien tiep -> 3', () => {
    expect(currentStreak(days(0, -1, -2), TODAY)).toBe(3);
  });

  it('chua tick hom nay nhung hom qua co -> chuoi van song', () => {
    expect(currentStreak(days(-1, -2), TODAY)).toBe(2);
  });

  it('nghi hom qua -> mat chuoi ve 0', () => {
    expect(currentStreak(days(-2, -3, -4), TODAY)).toBe(0);
  });

  it('dut quang giua -> chi dem doan gan nhat', () => {
    expect(currentStreak(days(0, -1, -3, -4, -5), TODAY)).toBe(2);
  });
});

describe('longestStreak', () => {
  it('lay doan dai nhat, khong phai doan gan nhat', () => {
    expect(longestStreak(days(0, -1, -3, -4, -5, -6))).toBe(4);
  });

  it('chua tick lan nao -> 0', () => {
    expect(longestStreak([])).toBe(0);
  });
});

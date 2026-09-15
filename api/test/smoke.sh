#!/usr/bin/env bash
# Kiem thu toan bo luong API — Chang 3
API=http://localhost:3000
STAMP=$(date +%s)
A="duc${STAMP}@test.local"
B="khac${STAMP}@test.local"
JAR=./.cookies.txt; rm -f "$JAR"
PASS=0; FAIL=0

check() { # check "ten" "mong doi" "thuc te"
  if [ "$2" = "$3" ]; then echo "  OK   $1 ($3)"; PASS=$((PASS+1));
  else echo "  FAIL $1 — mong doi $2, nhan $3"; FAIL=$((FAIL+1)); fi
}

code() { curl -s -o ./.body.json -w "%{http_code}" "$@"; }

echo "=== 1. AUTH ==="
C=$(code -X POST "$API/auth/register" -H 'Content-Type: application/json' \
   -c "$JAR" -d "{\"email\":\"$A\",\"password\":\"MatKhau123\",\"displayName\":\"Duc\"}")
check "dang ky user A" 201 "$C"
TOKEN_A=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).accessToken)}catch(e){console.log('')}")
[ -n "$TOKEN_A" ] && echo "  OK   nhan duoc access token" && PASS=$((PASS+1)) || { echo "  FAIL khong co access token"; FAIL=$((FAIL+1)); }
grep -q refresh_token "$JAR" && echo "  OK   refresh token nam trong cookie" && PASS=$((PASS+1)) || { echo "  FAIL khong co cookie"; FAIL=$((FAIL+1)); }

C=$(code -X POST "$API/auth/register" -H 'Content-Type: application/json' \
   -d "{\"email\":\"$A\",\"password\":\"MatKhau123\"}")
check "dang ky trung email -> 409" 409 "$C"

C=$(code -X POST "$API/auth/register" -H 'Content-Type: application/json' \
   -d "{\"email\":\"khonghople\",\"password\":\"123\"}")
check "email sai + mat khau ngan -> 400" 400 "$C"

C=$(code -X POST "$API/auth/login" -H 'Content-Type: application/json' \
   -d "{\"email\":\"$A\",\"password\":\"SaiMatKhau\"}")
check "sai mat khau -> 401" 401 "$C"

C=$(code "$API/auth/me" -H "Authorization: Bearer $TOKEN_A")
check "GET /auth/me co token -> 200" 200 "$C"

C=$(code "$API/auth/me")
check "GET /auth/me khong token -> 401" 401 "$C"

C=$(code "$API/auth/me" -H "Authorization: Bearer token.bia.dat")
check "token bia -> 401" 401 "$C"

echo "=== 2. HABITS CRUD ==="
C=$(code -X POST "$API/habits" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{"name":"Tap gym","frequency":"daily"}')
check "tao habit -> 201" 201 "$C"
HID=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).id)}catch(e){console.log('')}")

C=$(code -X POST "$API/habits" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{"name":"","frequency":"daily"}')
check "ten rong -> 400" 400 "$C"

C=$(code -X POST "$API/habits" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{"name":"X","frequency":"hang_gio"}')
check "frequency sai -> 400" 400 "$C"

C=$(code "$API/habits" -H "Authorization: Bearer $TOKEN_A")
check "danh sach habit -> 200" 200 "$C"

C=$(code -X PATCH "$API/habits/$HID" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{"name":"Tap gym buoi sang"}')
check "sua habit -> 200" 200 "$C"

echo "=== 3. CHECK-IN ==="
C=$(code -X POST "$API/habits/$HID/check-in" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{}')
check "tick hom nay -> 201" 201 "$C"
STREAK=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).currentStreak)}catch(e){console.log('?')}")
check "streak sau 1 lan tick" 1 "$STREAK"

C=$(code -X POST "$API/habits/$HID/check-in" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{}')
check "tick lai cung ngay -> 409" 409 "$C"

C=$(code -X POST "$API/habits/$HID/check-in" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{"date":"2099-01-01"}')
check "tick ngay tuong lai -> 400" 400 "$C"

YDAY=$(node -e "const d=new Date();d.setDate(d.getDate()-1);console.log(d.toISOString().slice(0,10))")
C=$(code -X POST "$API/habits/$HID/check-in" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d "{\"date\":\"$YDAY\"}")
check "tick hom qua -> 201" 201 "$C"
STREAK=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).currentStreak)}catch(e){console.log('?')}")
check "streak 2 ngay lien tiep" 2 "$STREAK"

C=$(code "$API/habits/$HID/check-ins" -H "Authorization: Bearer $TOKEN_A")
check "lich su check-in -> 200" 200 "$C"

echo "=== 4. QUYEN SO HUU ==="
C=$(code -X POST "$API/auth/register" -H 'Content-Type: application/json' \
   -d "{\"email\":\"$B\",\"password\":\"MatKhau123\"}")
check "dang ky user B -> 201" 201 "$C"
TOKEN_B=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).accessToken)}catch(e){console.log('')}")

C=$(code "$API/habits/$HID" -H "Authorization: Bearer $TOKEN_B")
check "B doc habit cua A -> 404" 404 "$C"

C=$(code -X PATCH "$API/habits/$HID" -H "Authorization: Bearer $TOKEN_B" \
   -H 'Content-Type: application/json' -d '{"name":"Cuop habit"}')
check "B sua habit cua A -> 404" 404 "$C"

C=$(code -X DELETE "$API/habits/$HID" -H "Authorization: Bearer $TOKEN_B")
check "B xoa habit cua A -> 404" 404 "$C"

C=$(code -X POST "$API/habits/$HID/check-in" -H "Authorization: Bearer $TOKEN_B" \
   -H 'Content-Type: application/json' -d '{}')
check "B tick habit cua A -> 404" 404 "$C"

C=$(code "$API/habits" -H "Authorization: Bearer $TOKEN_B")
N=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).length)}catch(e){console.log('?')}")
check "danh sach cua B rong" 0 "$N"

echo "=== 5. REFRESH TOKEN XOAY VONG ==="
cp "$JAR" "$JAR.cu"
C=$(code -X POST "$API/auth/refresh" -b "$JAR" -c "$JAR")
check "refresh lan 1 -> 200" 200 "$C"

C=$(code -X POST "$API/auth/refresh" -b "$JAR.cu" -c /dev/null)
check "dung lai token CU -> 401" 401 "$C"

C=$(code -X POST "$API/auth/refresh" -b "$JAR" -c /dev/null)
check "token moi cung bi thu hoi (phat hien danh cap) -> 401" 401 "$C"

echo "=== 6. LUU TRU & XOA ==="
C=$(code -X POST "$API/auth/login" -H 'Content-Type: application/json' \
   -d "{\"email\":\"$A\",\"password\":\"MatKhau123\"}")
TOKEN_A=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).accessToken)}catch(e){console.log('')}")
check "dang nhap lai -> 200" 200 "$C"

C=$(code -X PATCH "$API/habits/$HID/archive" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{"archived":true}')
check "luu tru habit -> 200" 200 "$C"

C=$(code -X POST "$API/habits/$HID/check-in" -H "Authorization: Bearer $TOKEN_A" \
   -H 'Content-Type: application/json' -d '{}')
check "tick habit da luu tru -> 400" 400 "$C"

C=$(code "$API/habits" -H "Authorization: Bearer $TOKEN_A")
N=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).length)}catch(e){console.log('?')}")
check "habit da luu tru bi an khoi danh sach" 0 "$N"

C=$(code "$API/habits?includeArchived=true" -H "Authorization: Bearer $TOKEN_A")
N=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('./.body.json','utf8')).length)}catch(e){console.log('?')}")
check "includeArchived=true thi thay lai" 1 "$N"

C=$(code -X DELETE "$API/habits/$HID" -H "Authorization: Bearer $TOKEN_A")
check "xoa habit -> 204" 204 "$C"

C=$(code "$API/habits/$HID" -H "Authorization: Bearer $TOKEN_A")
check "habit da xoa -> 404" 404 "$C"

rm -f ./.body.json "$JAR" "$JAR.cu"
echo
echo "==================================="
echo "  DAT: $PASS   —   HONG: $FAIL"
echo "==================================="
echo "EMAIL_A=$A"
echo "EMAIL_B=$B"
[ "$FAIL" -eq 0 ]

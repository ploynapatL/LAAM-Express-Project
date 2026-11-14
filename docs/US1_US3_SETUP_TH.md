# Backend US1–US3 และการตั้งค่าภายหลัง

สถานะงานรอบนี้: เขียนโค้ดและเตรียม tests/Postman แล้ว ตรวจเฉพาะ static และ syntax
ยังไม่ได้ติดตั้ง/เปิด PostgreSQL, สร้างฐานข้อมูล, รัน SQL, เปิดระบบ หรือรัน automated/integration tests
ผลการทำงานกับ PostgreSQL จริงยังไม่ยืนยัน ไม่ได้ commit หรือ push

## ไฟล์ที่เพิ่มหรือแก้

| ไฟล์ | หน้าที่ |
|---|---|
| `server/routes/riders.js` (เพิ่ม) | ตรวจ token/role และ routes รายการงาน/ข้อมูลติดต่อ |
| `server/repositories/postgres-repositories.js` | queries พนักงาน งาน และเบอร์ตาม ownership; แก้ serviceType ของ US1 |
| `server/app.js` | ค่าเริ่มต้น PostgreSQL, mount rider routes และ error กลาง |
| `server/index.js` | อ่าน/ตรวจ config token และส่งเข้า app |
| `server/.env.example` (เพิ่ม) | ตัวอย่าง DB, CORS และ token configuration |
| `server/package.json` | แยกคำสั่ง unit และ integration tests |
| `server/test/tracking.test.js` | ระบุ demo fixture ของ unit tests อย่างชัดเจน |
| `server/test/us1-us3.integration.test.js` (เพิ่ม) | เตรียมทดสอบกับ PostgreSQL จริงและ rollback fixtures |
| `database/backend_read_access.sql` (เพิ่ม) | เตรียมสิทธิ์ read-only สำหรับ trusted backend; ยังไม่รัน |
| `client/features/sprint1/js/config.js` | เปลี่ยนเลขตัวอย่างให้ตรง seed |
| `client/features/sprint2/US02/js/rider_api.js` (เพิ่ม) | HTTP client, token ใน memory และ request timeout ร่วม |
| `client/features/sprint2/US02/js/config.js` | origin API จริงที่ port 3001 |
| `client/features/sprint2/US02/js/schedule_api.js` | โหลดงานจาก backend ไม่มี mock fallback |
| `client/features/sprint2/US02/js/main.js` | จัดการ token/refresh/clear, NULL schedule และ response เก่า |
| `client/features/sprint2/US02/rider_schedule.html` | เพิ่มช่องกรอก token และปุ่มโหลด/ล้างสิทธิ์ |
| `client/features/sprint2/US02/css/styles.css` | รูปแบบส่วนกรอก token |
| `client/features/sprint2/US03/js/config.js` | ใช้ config ร่วมกับ US2 |
| `client/features/sprint2/US03/js/contact_api.js` | เรียก contact API ด้วย credential เดียวกับรายการงาน |
| `postman/LAAM-US1-US3.postman_collection.json` (เพิ่ม) | เตรียม 18 requests พร้อม assertions สำหรับ fresh seed |
| `docs/RIDER_API_CONTRACT.md` (เพิ่ม) | API contract ของ US2–US3 |
| `docs/API_CONTRACT.md` | ระบุสถานะ/service/seed ปัจจุบันของ US1 |
| `docs/US1_US3_SETUP_TH.md` (เพิ่ม) | รายการไฟล์ สมมติฐาน การติดตั้งและลำดับทดสอบภายหลัง |
| `docs/BACKEND_SETUP_TH.md`, `README.md` | ชี้ไปคู่มือใหม่และระบุสถานะการตรวจจริง |

## พฤติกรรมและสมมติฐาน

- ใช้ `database/schema.sql` เป็นฐาน ไม่แก้ schema เพื่อเพิ่ม fields ที่ยังไม่มี
- US1: public tracking ใช้ PostgreSQL เป็นค่าเริ่มต้น `serviceType` อ่านจาก `orders.service_type` ไม่ใช่ชนิดพัสดุ
- US2: ดูงานของพนักงานที่ยืนยันตัวตนเท่านั้น ตรวจ `employee.role` จาก DB ทุก request
  เรียก tab ที่ไม่ตรง role ได้ HTTP 200 พร้อมรายการว่าง เพื่อให้ frontend โหลดสอง tabs ได้
- หนึ่ง pickup มีหลาย orders จึงคืนหนึ่งรายการต่อ pickup/order เป็น `P-<pickup_id>-O-<order_id>`
  เพื่อให้เลือกเบอร์ผู้ส่งได้แน่นอน pickup ที่ยังไม่มี order จะยังไม่อยู่ในรายการ ต้องยืนยันนโยบายนี้กับทีม
- Delivery ใช้ `D-<delivery_id>` เก็บแต่ละ delivery attempt แยกกัน
- `appointment_date/time` ใช้สำหรับ pickup เท่านั้น ไม่มี end time, customer note หรือ delivery appointment ใน schema
  จึงคืน `null` และแสดงว่าไม่มีข้อมูล ไม่ใช้ `delivery_date` เป็นวันนัด เพราะเป็นวันเกิดเหตุการณ์ส่งจริง
- สถานะใช้ค่าจาก schema โดยตรง เช่น `Successful`, `Scheduled`, `In Transit`, `Pending`
  ไม่กรองเฉพาะงานอนาคต เพราะ seed มีทั้งงานสำเร็จและงานที่ยังไม่จบ
- US3: pickup อ่าน `orders.sender_phone`; delivery อ่าน `orders.receiver_phone`
  ไม่ fallback เป็น `customer.phone` เพราะเจ้าของบัญชีอาจไม่ใช่ผู้ติดต่อใน order
- ตอบ 401 เมื่อ token ขาด/ผิด, 403 เมื่อไม่ใช่ rider หรือเข้าถึง contact ผิด role,
  404 เมื่องานไม่มี/ไม่ใช่เจ้าของ/ไม่มีเบอร์, 400 เมื่อ task ID ผิดรูปแบบ
  ใช้ 404 สำหรับเจ้าของงานไม่ตรงกันเพื่อไม่เปิดเผยว่างานของคนอื่นมีอยู่จริง
- คืนเฉพาะ phone ใน contact API; รายการงานไม่มีเบอร์ และ public tracking ไม่มีข้อมูลติดต่อ
  queries ใช้ parameters และตรวจ ownership รวมถึงความสัมพันธ์ pickup/order ใน SQL
- ไม่มีตาราง login/session ใน schema จึงใช้ **server-managed opaque tokens ชั่วคราว** ผ่าน `RIDER_TOKENS_JSON`
  token ผูก employee ID ฝั่ง server; browser ไม่ส่ง employee ID เพื่อเลือกตัวตน
  นี่ไม่ใช่ระบบ login เต็มรูปแบบ ต้องยืนยันระบบ auth จริงก่อนใช้งาน production
- Frontend US2–US3 ใช้ token ใน memory ร่วมกัน กรอกผ่านช่อง Rider access token
  ไม่เก็บใน source, URL หรือ browser storage; reload/ปุ่ม Clear access ล้าง token และข้อมูลหน้าเดิม
  ป้องกัน response เก่ากลับมาแสดงหลังเปลี่ยน token/เปลี่ยนงาน/ออกจากหน้ารายละเอียด
- ไม่มี mock fallback: หาก DB ใช้งานไม่ได้ startup จะล้มเหลว หรือ request จะตอบ 500
  ไฟล์ mock เดิมยังเก็บไว้เป็น legacy แต่ US2–US3 ไม่ import หรือเปิดใช้งาน
- `/api/health` เป็น process liveness และชื่อแหล่งข้อมูล ไม่ใช่ DB readiness probe ต่อเนื่อง

สิ่งที่ต้องยืนยันกับ DB จริง: query/type/date formatting, permission ของ login จริง, seed IDs,
การแยกหลาย order ต่อ pickup, การแสดง delivery ที่ไม่มีเวลานัด, พฤติกรรม NULL/เบอร์ผิดรูปแบบ,
การเปลี่ยนผู้รับผิดชอบแล้วเพิกถอนสิทธิ์ทันที และนโยบายแสดงงานที่เสร็จแล้ว
Frontend จะไม่สร้างลิงก์ `tel:` สำหรับเบอร์ผิดรูปแบบ

## ติดตั้ง PostgreSQL ภายหลัง (ยังไม่ต้องทำตอนนี้)

1. ดาวน์โหลด PostgreSQL สำหรับ Windows จาก <https://www.postgresql.org/download/windows/>
   ติดตั้ง server, command line tools และ pgAdmin ตามต้องการ จด port และรหัส admin ที่เลือก
2. เปิด service PostgreSQL เมื่อต้องการทดสอบ เพิ่มโฟลเดอร์ `bin` ลง PATH หรือใช้ SQL Shell (psql)
3. ใช้ฐานข้อมูลใหม่สำหรับ dev และฐานข้อมูลแยกที่ชื่อลงท้าย `_test` สำหรับ integration
   อย่าใช้ migration กับฐานใหม่ และอย่ารัน schema/seed ซ้ำทับฐานที่มีตารางอยู่แล้ว

จาก project root (คำสั่งทั้งหมดด้านล่างเตรียมไว้ให้รันภายหลัง):

```powershell
createdb -U postgres laam_express_dev
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_dev -f database/schema.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_dev -f database/seed.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_dev -f database/access_control.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_dev -f database/backend_read_access.sql
psql -U postgres -d laam_express_dev
```

ใน psql สร้าง login ของ trusted backend และตั้ง password ผ่าน prompt:

```sql
CREATE ROLE laam_api LOGIN;
\password laam_api
GRANT CONNECT ON DATABASE laam_express_dev TO laam_api;
GRANT laam_backend_reader TO laam_api;
\q
```

หาก login มีอยู่แล้วให้ข้าม CREATE ROLE ใช้สิทธิ์ read-only ที่เตรียมไว้ ไม่ใช้ login ของ rider ต่อ DB โดยตรง
`backend_read_access.sql` เพิ่ม role ของ trusted backend เพราะ roles เดิมไม่พอสำหรับ US2–US3
role นี้อ่านหลายแถวได้ จึงต้องผ่าน HTTP authorization ของ backend; ยังไม่มี PostgreSQL RLS

## ตั้งค่าและเปิดระบบ US1–US3

Terminal 1 จาก project root:

```powershell
cd server
npm ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

คำสั่งสุดท้ายใช้สร้าง token ใหม่ รันแยกสำหรับแต่ละพนักงาน อย่าใช้ placeholder ใน `.env.example`
แก้ `.env` ให้ตรง DB จริงและตั้ง `RIDER_TOKENS_JSON` เป็น JSON map เช่น `{ "TOKEN_ใหม่ของคนรับ": 1, "TOKEN_ใหม่ของคนส่ง": 2 }`
(ลบช่องว่างใน token และใช้ความยาวอย่างน้อย 32 ตัวอักษร)
seed บนฐานใหม่ใช้ employee 1 = Pickup Rider, 2 = Delivery Rider, 3 = Hub Staff
หากจะรัน Postman non-rider case ให้สร้าง token อีกตัวที่ map เป็น 3 ด้วย

```powershell
npm start
```

startup จะตรวจ DB ด้วย `SELECT 1` ก่อนเปิด port; ถ้าต่อไม่ได้จะหยุด ไม่มี mock แทน
Terminal 2 จาก project root:

```powershell
cd client
python -m http.server 8080
```

- Home: <http://localhost:8080/>
- US1: <http://localhost:8080/features/sprint1/sprint1.html> ใช้ LAAM001, LAAM002, LAAM003
  seed ให้ LAAM002 เป็น `Picked Up` ไม่ใช่ Delivered
- US2–US3: <http://localhost:8080/features/sprint2/US02/rider_schedule.html>
  กรอก pickup token เพื่อดู `P-1-O-1`, `P-1-O-2`, `P-2-O-3`; เปลี่ยนเป็น delivery token เพื่อดู `D-1`, `D-2`
  เลือก View Details แล้วตรวจ phone และ Call customer
- เมื่อเปลี่ยน frontend port ให้ตั้ง `FRONTEND_ORIGINS` ให้ตรง
  ถ้าเปลี่ยน backend origin ให้แก้ sprint1 `js/config.js` และ sprint2 `US02/js/config.js`

## ลำดับทดสอบภายหลัง

1. ตรวจ UI และ Postman กับ dev DB ตาม seed ก่อน
   import `postman/LAAM-US1-US3.postman_collection.json` ใน Postman
   ตั้ง `pickupToken`, `deliveryToken`, `staffToken` เป็นค่าจริงของเครื่อง และตรวจ task IDs ตามฐานที่ใช้
   Collection มี success/error assertions และอิง fresh seed; ยังไม่ได้รัน
   เก็บ token เป็น local values ไม่ export/share ไฟล์ที่มี secrets
2. ใน `server` รัน unit tests เดิมของ US1 (ใช้ demo fixture ที่ระบุไว้ชัดเจนใน test เท่านั้น):

```powershell
npm test
```

3. เตรียมฐานทดสอบจริงจาก project root ใช้ admin หรือเจ้าของ schema สำหรับ fixture ที่ต้อง INSERT/UPDATE:

```powershell
createdb -U postgres laam_express_test
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_test -f database/schema.sql
```

4. จาก `server` ระบุฐานทดสอบและ credentials แยก (อย่าใช้ read-only laam_api สำหรับ suite นี้):

```powershell
$env:DB_NAME="laam_express_test"
$env:DB_USER="postgres"
$env:DB_PASSWORD="YOUR_LOCAL_TEST_DATABASE_PASSWORD"
$env:RUN_DB_TESTS="1"
npm run test:integration
Remove-Item Env:RUN_DB_TESTS, Env:DB_NAME, Env:DB_USER, Env:DB_PASSWORD
```

integration suite ปฏิเสธชื่อ DB ที่ไม่ลงท้าย `_test` และต้อง opt-in ด้วย `RUN_DB_TESTS=1`
ใช้ PostgreSQL จริง สร้าง fixtures ใน transaction แล้ว rollback แต่ sequence IDs อาจขยับตามปกติของ PostgreSQL
ครอบคลุม US1 no-history, service type, US2 assignment scoping/multiple orders,
US3 sender/receiver, 401/403/404/400, ไม่มีเบอร์, forged order และ reassignment
ไม่ต้อง seed ฐานทดสอบและไม่ต้องเปิด backend อีกตัว เพราะ test เปิด HTTP server ของตัวเอง

5. ถ้าต้องการทดสอบ DB constraints เพิ่ม จาก project root ใช้อีกฐานใหม่
   เพราะ integration rollback ไม่ย้อน sequence IDs และ seed อ้างอิง IDs ของฐานใหม่:

```powershell
createdb -U postgres laam_constraints_test
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_constraints_test -f database/schema.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_constraints_test -f database/seed.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_constraints_test -f database/access_control.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_constraints_test -f database/tests.sql
```

บันทึกผลจริงหลังรัน โดยแยก unit, integration, DB tests, Postman และ manual UI
รายงานเก่าใน `database/README.md` เป็นข้อมูลเดิมใน repository ไม่ใช่ผลยืนยันจากรอบงานนี้

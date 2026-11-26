# LAAM Express

LAAM Express เป็นเว็บเดียวสำหรับติดตามพัสดุ บัญชีลูกค้า และงานไรเดอร์ หน้าแรกเปิดแบบฟอร์มติดตามได้ทันที ส่วน My Parcels แสดงรายการตามบัญชีลูกค้า หน้า Assignments ของไรเดอร์แสดงงานรับและส่งพร้อมกันแยกตามจุดแวะ

## เปิดเว็บ

ต้องมี Node.js และ PostgreSQL สำหรับฐานข้อมูลใหม่ ให้รัน `database/schema.sql` แล้วตามด้วย `database/seed.sql` ถ้าต้องการข้อมูลตัวอย่าง สำหรับการตั้ง login ของแอปแบบจำกัดสิทธิ์ ให้รัน `database/access_control.sql` และ `database/backend_read_access.sql` ก่อน migration

รัน migration `database/migrations/002_accounts.sql` และ `database/migrations/003_rider_route_stops.sql` ตามลำดับ โดยใช้สิทธิ์ของเจ้าของ schema และข้ามไฟล์ที่รันสำเร็จไปแล้ว หากใช้ `laam_backend_reader` ให้ตั้ง role และสิทธิ์พื้นฐานก่อนรัน migrations ตาม [คู่มือการตั้งค่า PostgreSQL](docs/US1_US3_SETUP_TH.md#ติดตั้ง-postgresql-ภายหลัง-ยังไม่ต้องทำตอนนี้)

ตั้งค่าการเชื่อมต่อใน `server/.env` ตาม `server/.env.example` แล้วรันจากโฟลเดอร์โปรเจกต์

```powershell
cd server
npm ci
npm start
```

เปิด <http://localhost:3001/> เพื่อใช้หน้าเว็บและ API จาก Express ตัวเดียวกัน หากนำขึ้น Render ให้เปิดจาก URL ของ Web Service ที่รัน Express โดยใช้ source checkout ที่มีทั้ง `server` และ `client`

## บัญชีและข้อมูลตัวอย่าง

- ผู้ใช้ทั่วไปสมัครด้วย username, email และเบอร์โทร จากนั้นเข้าสู่ระบบด้วย username หรือ email
- บัญชีที่สมัครใหม่เริ่มด้วยรายการพัสดุว่าง รายการพัสดุเดิมเชื่อมด้วย `customer_id` ในคำสั่งซื้อ
- ทีมงานสร้างบัญชีไรเดอร์หรือบัญชีสำหรับลูกค้าเดิมด้วยคำสั่งด้านล่างจาก `server` โดยใช้การเชื่อมต่อของเจ้าของ schema เลขในตัวอย่างเป็น ID จาก seed ของฐานข้อมูลใหม่ คำสั่งแสดงรหัสผ่านเริ่มต้นให้ส่งกับเจ้าของบัญชีเพื่อเปลี่ยนใน My account

```powershell
node accounts/provision.js rider 1 pickup-rider pickup@example.test
node accounts/provision.js customer 1 levi levi@example.test
```

ลองติดตามพัสดุจาก seed ได้ด้วย `LAAM001`, `LAAM002` และ `LAAM003`

## เส้นทางไรเดอร์

- บัญชีไรเดอร์เดิมใช้ดูงานได้ทั้งสองประเภทตาม `employee_id` ที่ได้รับมอบหมาย
- ผู้จัดเส้นทางกำหนดวันที่ จุดแวะ และลำดับใน `rider_route_stop` แล้วผูกงานรับและงานส่งที่จุดเดียวกันด้วย `route_stop_id` เดียวกัน
- งานที่ยังไม่ได้ผูกจุดแวะจะอยู่ใน **Unscheduled stops** และแสดงรวมตามที่อยู่ หากมีการส่งต่องานให้ไรเดอร์คนอื่น ให้เปลี่ยน `employee_id` พร้อมล้างหรือเปลี่ยน `route_stop_id` ในคำสั่งเดียวกัน

## ทดสอบ

```powershell
cd server
npm test
npm run lint
# เปิด RUN_DB_TESTS=1 และตั้ง DB_NAME ให้ลงท้ายด้วย _test ก่อนสั่ง
npm run test:integration
```

[สัญญา API ติดตามพัสดุ](docs/API_CONTRACT.md) · [สัญญา API งานไรเดอร์](docs/RIDER_API_CONTRACT.md) · [Postman collection](postman/LAAM-US1-US3.postman_collection.json)

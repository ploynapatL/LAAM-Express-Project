# Backend ติดตามพัสดุ — trackingFeat_Backend

งานนี้ทำตาม docs/API_CONTRACT.md ของ branch trackingFeat_Frontend
เป็น Express API ที่รันได้จริง แต่ข้อมูลพัสดุยังเป็นตัวอย่างใน server/data/demo-parcels.json
ยังไม่ได้ต่อฐานข้อมูลของทีม และไม่มี API แก้สถานะใน sprint นี้

## ใส่ไฟล์ในโปรเจกต์เดิม

1. ในโปรเจกต์ที่ clone จาก trackingFeat_Frontend แล้ว ให้สร้าง branch ด้วย `git switch -c trackingFeat_Backend` (ถ้าสร้างแล้วไม่ต้องสร้างซ้ำ)
2. คัดลอกไฟล์จาก ZIP นี้ลงโฟลเดอร์โปรเจกต์เดิมโดยให้ชื่อโฟลเดอร์ตรงกัน ไม่ต้องลบไฟล์เดิมทั้งโปรเจกต์
3. เปิด Terminal ในโฟลเดอร์ server แล้วรัน:

```bash
npm install
npm test
npm start
```

ใช้ Node.js 20 ขึ้นไป เปิด http://localhost:3001/api/health ต้องได้ status ok และ dataSource demo

เปิด client/features/sprint1/sprint1.html ด้วย VS Code Live Server (พอร์ต 5500)
หรือเปิด Terminal อีกอัน เข้า client แล้วใช้ `python -m http.server 8080`
จากนั้นเข้า http://localhost:8080/features/sprint1/sprint1.html
config.js ถูกตั้ง USE_MOCK_API = false แล้ว หน้าเว็บจึงเรียก backend ผ่าน HTTP

## ทดลอง

- LAAM20260001: Sorting พร้อมประวัติ
- LAAM20260002: Out for Delivery พร้อมประวัติ
- LAAM20260003: Awaiting Handover และ history ว่าง
- UNKNOWN123: ไม่พบพัสดุ (404)
- http://localhost:3001/api/tracking/ab: เลขผิดรูปแบบ (400)
- http://localhost:3001/api/tracking/LAAM20260001: ดู JSON ตรงจาก API

หน้าเว็บตรวจเลขสั้นหรืออักขระผิดก่อนส่ง API ด้วย
จำกัด lookup 60 ครั้งต่อ IP ต่อนาที ถ้าเกินจะได้ 429 รอสักครู่แล้วลองใหม่
ถ้า frontend อยู่คนละพอร์ต ให้เพิ่ม origin ผ่าน FRONTEND_ORIGINS ก่อนเริ่ม server
เช่น PowerShell: `$env:FRONTEND_ORIGINS="http://localhost:5501"` แล้ว `npm start`

## ส่งต่อคนทำ DB

จุดเชื่อมคือ server/repositories/tracking-repository.js
เปลี่ยน adapter ตัวอย่างให้ query ฐานข้อมูลแบบ parameterized และคืน object รูปเดียวกับ demo-parcels.json
จากนั้นส่ง repository เข้า createApp({ repository }) ใน server/index.js
คืน null เมื่อไม่พบพัสดุ; ถ้ามีพัสดุแต่ไม่มีประวัติให้คืน history: []
เมื่อมี event API จะใช้ event ล่าสุดเป็นสถานะ/สถานที่/เวลาปัจจุบัน
origin/destination ต้องเป็นระดับเมืองหรือสาขาเท่านั้น
อย่าใส่ชื่อ เบอร์ ที่อยู่จริง รูปลายเซ็น หรือรูปหลักฐานลง public fields
ให้ dataSource ของ adapter เป็นชื่อแหล่งข้อมูลจริง เช่น mysql
แยกการทดสอบ query/การเชื่อมต่อจริงเมื่อทีมส่ง schema และ config มา

## ไฟล์หลัก

- server/index.js: เปิดพอร์ต
- server/app.js: route, validation, public response, CORS, rate limit และ error handling
- server/repositories/tracking-repository.js: แหล่งข้อมูลที่เปลี่ยนเป็น DB ได้
- server/data/demo-parcels.json: ข้อมูลตัวอย่างเท่านั้น
- server/test/tracking.test.js: ทดสอบ HTTP API
- client/features/sprint1/js/config.js: เปิดใช้ backend

## ส่งงานขึ้น branch

ตรวจ `git status` และ `git diff` ก่อน แล้ว add เฉพาะไฟล์ของงานนี้
อย่า commit node_modules, .env หรือรหัสฐานข้อมูล

```bash
git add .gitignore server/index.js server/app.js server/repositories server/data server/test server/package.json server/package-lock.json client/features/sprint1/js/config.js docs/BACKEND_SETUP_TH.md
git commit -m "Implement parcel tracking backend"
git push -u origin trackingFeat_Backend
```

## ข้อจำกัด

ยังไม่ใช่ระบบ production: ข้อมูลยังเป็น demo; rate limit อยู่ใน memory ของ process เดียวและรีเซ็ตเมื่อ restart
ก่อนใช้งานจริงต้องต่อ DB, ตรวจ logging/monitoring, HTTPS, deployment origins และ shared rate limiter ตามระบบที่ deploy
ไม่มีระบบสร้างพัสดุ/อัปเดตสถานะ/auth เพราะสัญญา sprint นี้ระบุ public read-only tracking เท่านั้น

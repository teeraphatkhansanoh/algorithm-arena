# นำ Algorithm Arena ขึ้น Render + Neon

โค้ดรองรับ H2 สำหรับเครื่องตัวเอง และ PostgreSQL สำหรับออนไลน์แล้ว
ยังไม่ได้สร้างบริการออนไลน์หรือย้ายข้อมูลเดิมให้อัตโนมัติ

## 1. สร้างฐานข้อมูล Neon

สมัคร https://neon.com และสร้างโปรเจกต์ PostgreSQL ในแผน Free
เปิด Connect แล้วเลือก Java/JDBC จด host, database, user และ password
ใช้ endpoint แบบ pooled ได้ เลือก region ใกล้กับ Render

## 2. เก็บโค้ดบน GitHub

สร้าง repository แล้วอัปโหลดโฟลเดอร์โปรเจกต์นี้ รวม lib, src, web, Dockerfile และ render.yaml
ไม่อัปโหลด data/, build/, .env หรือรหัสผ่านใด ๆ

## 3. สร้าง Render Web Service

ไป https://render.com เชื่อม GitHub แล้วเลือก repository
เลือก Runtime: Docker, Instance: Free, Health Check Path: /health
ถ้า repository มีโฟลเดอร์นี้ซ้อนอยู่ ให้ตั้ง Root Directory เป็นโฟลเดอร์ที่มี Dockerfile
หรือใช้ New > Blueprint เพื่ออ่าน render.yaml (ตรวจว่าเลือก Free ก่อนสร้าง)

ตั้ง Environment Variables ดังนี้:

| ชื่อ | ค่า |
|---|---|
| JDBC_DATABASE_URL | jdbc:postgresql://HOST/DATABASE?sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory&channelBinding=require&connectTimeout=15&socketTimeout=30 |
| DB_USER | ชื่อผู้ใช้ฐานข้อมูลจาก Neon |
| DB_PASSWORD | รหัสผ่านฐานข้อมูลจาก Neon |
| HOST | 0.0.0.0 |
| COOKIE_SECURE | true |
| REQUIRE_POSTGRES | true |

แทน HOST และ DATABASE ด้วยค่าจริง ไม่ใส่ชื่อผู้ใช้หรือรหัสผ่านใน JDBC_DATABASE_URL
ไม่ใช้ URL ที่เริ่ม postgresql:// โดยตรง ต้องเริ่ม jdbc:postgresql://
sslfactory ใช้ truststore มาตรฐานของ Java ตรวจใบรับรอง โดย verify-full ตรวจชื่อเซิร์ฟเวอร์ด้วย
ไม่ต้องตั้ง PORT เอง Render จะกำหนดให้
Dockerfile ตั้งค่าที่ไม่ใช่ความลับไว้แล้ว และ REQUIRE_POSTGRES ป้องกันเผลอใช้ H2 บนพื้นที่ชั่วคราว

กด Deploy แล้วเปิดลิงก์ onrender.com ที่ Render ให้
Docker จะคอมไพล์ Java 21 และรันเว็บให้ ไม่ต้องเปิด Mac ค้างไว้

## 4. ตรวจงานจริงหลัง Deploy

1. เปิด /health ต้องเห็น status: ok
2. สมัครสมาชิก เล่นจบด่าน ตรวจประวัติและตารางคะแนน
3. ทดลองจากมือถือหรืออีกเบราว์เซอร์
4. สั่ง Restart Service แล้วเข้าสู่ระบบใหม่: บัญชี คะแนน ประวัติต้องยังอยู่
5. ตรวจครบ Bubble Sort, Stack และ Queue ก่อนส่งงาน

Session อยู่ในหน่วยความจำ จึงต้องล็อกอินใหม่หลัง restart แต่ข้อมูลเกมอยู่ใน PostgreSQL
เวอร์ชันนี้ใช้เว็บเซิร์ฟเวอร์หนึ่ง instance เหมาะกับงานสาธิต ยังไม่ได้ออกแบบ session สำหรับหลาย instance
Render Free พักเมื่อไม่มีการใช้งาน เปิดรอบแรกอาจรอ และมีโควตาการใช้งาน
Neon Free มีโควตาพื้นที่และการประมวลผล ตรวจแพ็กเกจปัจจุบันก่อนสมัคร
ฐานข้อมูลใหม่เริ่มว่าง มีเฉพาะด่าน 15 รายการ บัญชีและคะแนนจาก H2 ไม่ถูกย้ายไปเอง

## รันบนเครื่องเหมือนเดิม

ถ้าไม่ได้ตั้ง JDBC_DATABASE_URL ให้ใช้ sh run.sh หรือ run.bat ตามเดิม
ไฟล์ .env ไม่ถูกโหลดโดยโปรแกรมอัตโนมัติ ใช้ Environment ของระบบหรือของ Render
ห้ามแชร์ค่า DB_PASSWORD ในรายงานหรือภาพหน้าจอ

## แหล่งอ้างอิง

- https://render.com/docs/docker
- https://render.com/docs/web-services
- https://render.com/docs/free
- https://jdbc.postgresql.org/documentation/use/
- https://neon.com/docs/connect/connect-from-any-app

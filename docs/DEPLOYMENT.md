# คู่มือการติดตั้งใช้งานและความปลอดภัย (Deployment & Security)

ระบบแดชบอร์ด สภ.สะท้อน รองรับการล็อกอิน 3 แบบ (เลือกใช้แบบใดแบบหนึ่ง) + สิทธิ์ในแอป:

- **Firebase Authentication** — ล็อกอิน Google จริง (ปุ่ม Sign in with Google) ใช้ได้บนทุกโดเมนรวม `*.vercel.app` ไม่ต้อง custom domain **(แนะนำสำหรับตอนนี้ — ดูส่วนที่ 5)**
- **Cloudflare Access** — กั้นหน้าเว็บทั้งหมดก่อนเข้า (perimeter จริง) ต้องมี custom domain ผ่าน Cloudflare
- **ล็อกอินชั่วคราว (พิมพ์อีเมล)** — ใช้เมื่อยังไม่ตั้งสองแบบข้างต้น (ประตูอ่อน สำหรับพรีวิว)

ลำดับการทำงาน: Cloudflare (ถ้ามี) → Firebase (ถ้าตั้งค่า) → ล็อกอินชั่วคราว จากนั้น **สิทธิ์ในแอป (RBAC)** ตัดสินว่าอีเมลนั้นเป็น Admin/User และดูหน้าไหนได้

> ⚠️ **สำคัญ:** ถ้า deploy โดย **ไม่มี** Cloudflare Access ข้อมูลจะเปิดสาธารณะ (ใครมีลิงก์ก็เข้าได้ เพราะแอปดึงข้อมูลฝั่ง browser) — RBAC ในแอปเพียงอย่างเดียว **ไม่ใช่** การป้องกันจริง ต้องตั้ง Cloudflare Access ด้วยเสมอสำหรับข้อมูลราชการ

---

## ส่วนที่ 1 — Deploy ขึ้น Vercel

1. เชื่อม repo GitHub `s0ci4lx/Police-Dashboard` กับ Vercel
2. Vercel จะ detect Vite อัตโนมัติ (`npm run build` → เสิร์ฟโฟลเดอร์ `dist`)
3. ไฟล์ `vercel.json` ตั้ง header กัน index/บอทให้แล้ว (`X-Robots-Tag`, ฯลฯ)
4. ตั้ง **custom domain** (จำเป็นสำหรับ Cloudflare Access เช่น `dashboard.example.go.th`)

---

## ส่วนที่ 2 — ตั้ง Cloudflare Access (ฟรี)

Cloudflare Access ต้องให้ทราฟฟิกวิ่งผ่าน Cloudflare (โดเมนชี้ผ่าน Cloudflare แบบ proxied)

1. สมัคร Cloudflare (ฟรี) และเพิ่มโดเมนของหน่วยงานเข้า Cloudflare (เปลี่ยน nameserver ตามที่แจ้ง)
2. ที่โดเมน สร้าง DNS record ชี้ไปที่ Vercel:
   - `CNAME dashboard → cname.vercel-dns.com` (เปิด proxy = เมฆสีส้ม 🟠)
   - เพิ่มโดเมนนี้ใน Vercel project → Domains
3. เข้า **Cloudflare Zero Trust** → **Access → Applications → Add an application → Self-hosted**
   - Application domain: `dashboard.example.go.th`
   - Identity provider: เพิ่ม **Google** (Zero Trust → Settings → Authentication → Login methods → Add → Google) แล้วเลือกใช้
4. สร้าง **Policy** ว่าใครเข้าได้:
   - Action: **Allow**
   - Include: **Emails** = รายชื่ออีเมลเจ้าหน้าที่ที่อนุญาต — หรือ **Emails ending in** `@your-domain.go.th` ถ้าใช้อีเมลหน่วยงาน
5. บันทึก — เสร็จแล้วทุกคนที่เข้าเว็บจะเจอหน้า Google login ของ Cloudflare ก่อน

หลังจากนี้ Cloudflare จะส่งอีเมลผู้ล็อกอินให้แอปผ่าน `/cdn-cgi/access/get-identity` และปุ่ม "ออกจากระบบ" ในแอปจะพาไป `/cdn-cgi/access/logout`

---

## ส่วนที่ 3 — สิทธิ์ผู้ใช้ในแอป (RBAC)

### ผู้ดูแลตั้งต้น (Bootstrap Admin)
กำหนดในโค้ด `src/config/access.ts` → `BOOTSTRAP_ADMINS` (เป็น Admin เสมอ กันล็อกตัวเองออก):

```
export const BOOTSTRAP_ADMINS = ['tummarat@gmail.com', 'investigate.thepha@gmail.com'];
```

### การจัดการผู้ใช้ (ทำในแอป — ไม่ต้องแก้โค้ด)
1. ล็อกอินด้วยอีเมล Admin → กดปุ่ม **⚙️ (เฟือง)** มุมขวาบน
2. แท็บ **ผู้ใช้และสิทธิ์** → เพิ่มอีเมล → เลือก **User** หรือ **Admin**
3. ถ้าเป็น User ให้ **ติ๊กเลือกหน้า** ที่อนุญาตให้ดู
4. อีเมลที่ไม่อยู่ในรายชื่อและไม่ใช่ bootstrap admin = เข้าไม่ได้ (เห็นหน้า "ไม่มีสิทธิ์")

> หมายเหตุ: สิทธิ์เก็บใน localStorage ของเบราว์เซอร์ (ตามสถาปัตยกรรมที่เลือก) หากต้องการให้สิทธิ์ตรงกันทุกเครื่อง ใช้แท็บ **สำรอง/นำเข้า** ส่งออก JSON แล้วนำเข้าในเครื่องอื่น หรือย้ายการจัดเก็บไปฐานข้อมูลกลางในอนาคต

---

## ส่วนที่ 4 — เปลี่ยนแหล่งข้อมูล (Google Sheet)

**ทำในแอป:** ⚙️ → แท็บ **แหล่งข้อมูล** → วางลิงก์ Google Sheet ของแต่ละหน้า → **ทดสอบ** → **บันทึก** → โหลดหน้าใหม่

**หรือแก้ค่าเริ่มต้นถาวร (ทุกเครื่อง):** แก้ `src/config/dataSources.ts` → `DEFAULT_DATA_SOURCES` แล้ว deploy ใหม่

ชีตต้องแชร์เป็น **"ทุกคนที่มีลิงก์ ดูได้"** (เพราะแอปดึงฝั่ง browser)
- ต้องการความปลอดภัยสูงสุด (ชีตเป็นส่วนตัว) ให้ทำ backend proxy + service account เพิ่มในอนาคต

---

## ส่วนที่ 5 — Firebase Authentication (ล็อกอิน Google จริง) ⭐

วิธีนี้ได้หน้าล็อกอิน Google จริง ใช้ได้บน `*.vercel.app` เลย ไม่ต้อง custom domain

**สร้างโปรเจกต์ + เปิดใช้ Google**
1. ไปที่ https://console.firebase.google.com → Add project
2. เมนูซ้าย **Build → Authentication → Get started**
3. แท็บ **Sign-in method → Add new provider → Google → Enable** → เลือก support email → Save
4. แท็บ **Settings → Authorized domains** → ตรวจว่ามี `localhost` และ **กด Add domain ใส่ `sathon-police.vercel.app`** (โดเมน Vercel ของคุณ)
5. **Project settings (เฟือง) → General → Your apps → Web app** → คัดลอกค่า config

**ใส่ค่า config**
- ในเครื่อง: สร้างไฟล์ `.env.local` (ดูตัวอย่างใน `.env.example`) ใส่ค่า `VITE_FIREBASE_*`
- บน Vercel: **Project → Settings → Environment Variables** ใส่ค่าเดียวกันทั้ง 6 ตัว แล้ว **Redeploy**

**การกำหนดสิทธิ์** ใช้ RBAC เดิม (ส่วนที่ 3) — อีเมลที่ล็อกอินต้องเป็น bootstrap admin หรืออยู่ในรายชื่อ ไม่งั้นเห็นหน้า "ไม่มีสิทธิ์"

> หมายเหตุ: ค่า `VITE_FIREBASE_*` (apiKey ฯลฯ) **ไม่ใช่ความลับ** — Firebase ออกแบบให้เปิดเผยฝั่ง client ได้ ความปลอดภัยอยู่ที่ Authorized domains + Auth provider + สิทธิ์ในแอป

---

## สรุปช่องทางจัดการหลัง handoff ให้เจ้าหน้าที่

| ต้องการทำ | ทำที่ไหน | ต้อง deploy ใหม่ไหม |
|---|---|---|
| เพิ่ม/ลบผู้ใช้, กำหนดสิทธิ์หน้า | ⚙️ แท็บ ผู้ใช้และสิทธิ์ | ไม่ต้อง |
| เปลี่ยนลิงก์ Google Sheet | ⚙️ แท็บ แหล่งข้อมูล | ไม่ต้อง (โหลดหน้าใหม่) |
| เปลี่ยนชื่อสถานี/พิกัดแผนที่ | ⚙️ แท็บ ข้อมูลสถานี | ไม่ต้อง (โหลดหน้าใหม่) |
| เพิ่มอีเมล Admin ตั้งต้น | `src/config/access.ts` | ต้อง deploy |
| อนุญาตใครเข้าเว็บได้ (ประตูจริง) | Cloudflare Access Policy | ไม่ต้อง (ตั้งที่ Cloudflare) |

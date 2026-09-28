# Sales Target Planning — Prototype

Prototype เว็บวางแผน Sales Target ประจำปีของ Charmiss ครอบคลุม Sales Planning (4 ขั้น) · Product Master · Account Master
เป็น HTML + CSS + JavaScript ล้วน ไม่มี Framework ไม่มี Build step ไม่ต้องติดตั้งอะไร · ข้อมูลเป็นตัวอย่าง เก็บในเบราว์เซอร์ระหว่างใช้งาน

## เปิดใช้งาน

1. ดับเบิลคลิก `index.html` (แนะนำ Chrome หรือ Edge)
2. Firefox เปิดจากไฟล์ในเครื่องแล้วค่าที่แก้จะไม่ส่งต่อข้ามหน้า ให้เปิดจาก GitHub Pages แทน
3. ต้องต่ออินเทอร์เน็ตเพื่อโหลด Font และส่งออก Excel ถ้าไม่มีอินเทอร์เน็ต หน้าเว็บยังใช้ได้ครบ และส่งออกเป็น CSV แทน

## ทดสอบ

- `node tests/run.js` (ไม่ต้องติดตั้ง package)
- Test ที่ใช้กราฟหรือ DOM: เปิด `tests/calc.test.html` ในเบราว์เซอร์

## Deploy บน GitHub Pages

1. อัปโหลดทุกไฟล์ขึ้น Branch `main` **รวม `.nojekyll`** (ถ้าไม่มี GitHub จะข้ามโฟลเดอร์ที่ขึ้นต้นด้วย `_`)
2. Settings → Pages → Build and deployment → Source = Deploy from a branch → `main` / `(root)`
3. รอ 1–2 นาที แล้วเปิดลิงก์ `https://<บัญชี>.github.io/<ชื่อ Repo>/`

Repo แบบ Private ต้องใช้แพ็กเกจ GitHub ที่รองรับ Pages · ถ้าเป็น Public ตรวจก่อนว่าไม่มีข้อมูลที่ห้ามเปิดเผยใน `data/`

## โครงสร้าง

```
index.html      หน้าเริ่มต้น (พาไปขั้นที่ 1)
core/           โค้ดกลาง: layout, registry, loader, calc, store, components, charts, export ฯลฯ
data/           ข้อมูลตัวอย่างและข้อความ (content.js) · data/seed/ สร้างจาก Excel ห้ามแก้ด้วยมือ
modules/        1 หน้า = 1 โฟลเดอร์ · _template/ สำหรับหน้าใหม่
styles/         CSS · สีและขนาดอยู่ที่ tokens.css
tests/          run.js (Node) · calc.test.html (เบราว์เซอร์)
docs/           SPEC.md สารบัญ · spec/ สเปกแยกตามหัวข้อ · change-requests/ งานที่ได้รับ
```

## เอกสาร

| เอกสาร | ใช้ทำอะไร |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | สารบัญสเปก ลิงก์ไปไฟล์ใน `docs/spec/` |
| [docs/DECISIONS.md](docs/DECISIONS.md) | ข้อสรุปที่ตกลงแล้วและเหตุผล |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | สิ่งที่เปลี่ยนในแต่ละ CR |
| [docs/change-requests/](docs/change-requests/) | Change Request ที่ยังไม่ทำ (ทำเสร็จแล้วสรุปไว้ใน CHANGELOG) |
| [docs/spec/architecture.md](docs/spec/architecture.md) | เพิ่มหน้าใหม่ กติกาของ Module |
| [docs/spec/data-model.md](docs/spec/data-model.md) | ข้อมูลตัวอย่างและ Key ใน store |
| [CLAUDE.md](CLAUDE.md) | กติกาสำหรับ Claude Code |

## ข้อจำกัดของ Prototype

- ข้อมูลเก็บใน sessionStorage ปิดแท็บแล้วหาย · ปุ่ม `รีเซ็ตข้อมูล` คืนค่าตั้งต้น
- บทบาทผู้ใช้เป็นการจำลองเพื่อนำเสนอ สิทธิ์ทำงานเฉพาะฝั่งหน้าจอ

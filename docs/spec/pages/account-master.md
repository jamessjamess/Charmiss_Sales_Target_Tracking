# Account Master (CR-29 · CR-32 เหลือ 2 หน้า)

| หน้า | Module · id | จัดการ | Spec |
|---|---|---|---|
| `A` Partner List (CR-36 · เดิม Account Master / Sales Unit & Customer) | `modules/sales-units` · `salesUnits` | หน่วยขาย (Account · Platform · เขต) · คู่ค้า (รหัสคู่ค้า) ตามช่วงเดือน · CR-33 แก้ไขรายรายการ · GP / Platform Fee · Channel Master | [sales-units.md](sales-units.md) |
| `S` Sales Person Management | `modules/people` · `people` | บุคลากร / ทีม · สมาชิกทีมขาย · บัญชีผู้ใช้ · ผู้รับผิดชอบรายเดือน | [people.md](people.md) |

- หน้าที่ซ่อนแล้ว (ไม่ลบไฟล์ · เปิดลิงก์เดิมแล้วพาไปหน้าใหม่):
  - CR-32 `accounts` (Account & Platform) · `territories` (เขตและร้านค้า · → แท็บของ Channel ที่แบ่งเป้าตามเขต) — `perm: 'salesUnits'`
  - CR-29 `salespeople` · `salesTeam` → `people#monthly` / `people#list` — `perm: 'people'`
  - spec เดิม [accounts.md](accounts.md) · [territories.md](territories.md) เหลือเป็นหมายเหตุชี้มาหน้าใหม่
- **เก็บ Master Data เท่านั้น** — ไม่มีคอลัมน์เป้าหมายหรือแผน (ยกเว้นมุมมองตามบุคคลของ Sales Person Management ที่อ่านเป้าหมายรายเดือน) · ผลต่อแผนแสดงในกล่องยืนยัน
- เดือนปัจจุบัน = `SP.core.clock.currentMonth()` (ก.ย. 2026) · เดือนสุดท้ายของแผน = `settings.PLAN_HORIZON_END` (ธ.ค. 2027 · `clock.horizonEnd`) ที่เดียว ห้าม Hardcode
- Logic: `core/units.js` (หน่วยขายและคู่ค้า · ข้อมูลที่ต้องตรวจของทั้ง 2 หน้า) · `core/stores.js` (ร้านค้าของเขต) · `core/master.js` (บุคลากร · ทีม · Audit) ·
  `calc.setOwner` / `calc.ownerReplace` (ผู้รับผิดชอบ) · `calc.ownerGaps` (เดือนที่ไม่มีผู้รับผิดชอบ · ใช้ร่วมกัน 2 หน้า)

## รูปแบบร่วม

- แถบเครื่องมือ: ค้นหา · ตัวกรอง · **ข้อมูลที่ต้องตรวจ** (CR-32 มาตรฐานใหม่ `components.dataCheck` — ใช้ใน 2 หน้านี้ก่อน หน้าอื่นยังใช้ `checksChip` เดิม) · `ส่งออก ▾` · `แก้ไข`
  - Chip เหลือง `ข้อมูลที่ต้องตรวจ (n)` / เทา `ข้อมูลครบ` · Popover จัดกลุ่ม `<เกณฑ์> (n)` · ปุ่ม `ไปที่รายการ` (เลือกแท็บ · กรอง · เลื่อน · ไฮไลต์แถว 2 วินาที `components.flashRow`) ·
    ท้าย `เกณฑ์ที่ตรวจ:` รายชื่อเกณฑ์ทั้งหมดของหน้า (แสดงแม้ n = 0)
- คลิกแถว → Drawer ขวา แท็บ `ข้อมูล` · `ประวัติการเปลี่ยนแปลง` (`components.historyList` จาก `master.audit`)
- โหมดแก้ไข (`workflowBar` แบบง่าย) → draft → `บันทึก` เขียน store + `master.audit` / `ยกเลิก` = ทิ้งทั้งหมด · เปิดมาเป็นโหมดดู · บทบาทที่ดูได้อย่างเดียวเห็นข้อความอ่านอย่างเดียว
  - CR-33 ข้อยกเว้น: Account Master ไม่มีโหมดแก้ไขทั้งหน้า · แก้ไขรายรายการใน Drawer / Dialog แล้วบันทึกทันที (ตรวจสิทธิ์ใน `units.command*`) · Sales Person Management ยังใช้โหมดแก้ไข
- ไม่ลบรายการที่ถูกอ้างอิง ใช้ปิดใช้งานพร้อมเดือนที่มีผล · ค่าที่เปลี่ยนตามเวลาเก็บเป็นช่วง `มีผลตั้งแต่ – ถึง` · เดือนที่ผ่านไปแล้วแก้ไม่ได้
- ชื่อผู้รับผิดชอบ = ลิงก์ไปหน้า Sales Person Management (`components.personLink` → Drawer ของคน · แผงหน่วยขาย → แท็บผู้รับผิดชอบรายเดือน)
- ทั้ง 2 หน้าและทุกแท็บไม่เลื่อนที่ 1920×1080 (ตารางเลื่อนภายในการ์ด) · ไม่มี Emoji

## ตารางเทียบฟีเจอร์

- Account & Platform · เขตและร้านค้า (TT) → Account Master: ดู [sales-units.md](sales-units.md#ตารางเทียบฟีเจอร์-cr-32-ส่วน-6--ไม่มีอะไรหาย)
- บุคลากรและทีม → Sales Person Management: ดู [people.md](people.md#ตารางเทียบฟีเจอร์-cr-32)
- CR-29 (หน้าเดิมก่อนหน้านั้น): ผลงานรายบุคคลอยู่ที่ Plan Summary · ตัวเลือกเดือนปัจจุบันจำลองตัดออก (`SP.core.clock`) · คอลัมน์ `แผนปี 2027` ของ Account ตัดออก

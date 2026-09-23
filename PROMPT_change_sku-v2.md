# Change Request: ยุบหน้า Status SKU → Product Master และปรับหน้าวางแผน SKU (สำหรับ Claude Code)

> สั่ง Claude Code: "อ่าน PROMPT_change_sku-v2.md และ CLAUDE.md แล้วสรุปไฟล์ที่จะแก้ก่อนเริ่ม"
> ทำหลังจาก `PROMPT_change_top-down-v2.md` และ `PROMPT_change_phasing-v2.md` เสร็จแล้ว

ยังคงยึดหลักการเดิมใน `CLAUDE.md` ทั้งหมด (Script ธรรมดา, `window.SP`, Module ไม่เรียกกันเอง, สูตรอยู่ที่ `calc.js`, ข้อความอยู่ที่ `content.js`, ดับเบิลคลิกเปิดได้, Layout ไม่ต้องเลื่อนที่ 1920×1080)

---

## 1. ยุบหน้า Status SKU และสร้าง Module Product Master

- ตั้ง `sku-status` เป็น `visible: false` ใน registry **ห้ามลบไฟล์**
- สร้าง Module ใหม่ `modules/product-master/` วางใน Tour **ก่อนหน้าวางแผน SKU**
- ป้ายมุมหน้า: `เจ้าของข้อมูล: ทีม Product · Clearance: Supply Chain` (ข้อความใน `content.js`)
- หัวข้อ: `Product Master · Listing` คำอธิบาย 1 บรรทัด: `กำหนดวันเริ่มขายและ Account ที่ขายได้ ทีมขายจะเห็นเฉพาะ SKU ที่ Listing แล้วในหน้าวางแผน`

### 1.1 หน้าจอ

แถบเครื่องมือ: Filter Channel `MT | TT | ECOM` + ค้นหา SKU + Filter Status

ตาราง 1 แถวต่อ SKU:

| คอลัมน์ | รายละเอียด |
|---|---|
| SKU / ชื่อ / Campaign | อ่านอย่างเดียว |
| วันเริ่มขาย (Launch Date) | Date picker ระดับ SKU (วันขายวันแรกตามแผน) |
| Status | Badge คำนวณอัตโนมัติ ณ เดือนแรกของปีแผน: NPD / Existing / Clearance / เลิกขาย |
| Listing ต่อ Account | Checkbox 1 คอลัมน์ต่อ Account ของ Channel ที่เลือก (อ่านรายชื่อจาก Account Master) ติ๊ก = ขายใน Account นั้นได้ |
| Clearance | ช่วงเดือนและ Stock (ป้าย `Supply Chain`) กรอกได้ในเดโม |
| เลิกขาย | เดือนที่เลิกขาย (ถ้ามี) |

- ถ้า Account มีมากจนล้นจอ ให้ตารางเลื่อนแนวนอนภายในการ์ด โดยคอลัมน์ SKU ติดซ้าย (sticky)
- ด้านบนตารางมีบรรทัดสรุปกฎ Status แบบสั้นบรรทัดเดียว (จาก `content.js`): `NPD = 3 เดือนนับจากวันเริ่มขาย · Clearance มาก่อนเสมอ · หลังเดือนเลิกขาย = 0`
- มีปุ่ม `+ เพิ่ม SKU` สำหรับเพิ่ม SKU ใหม่ (รหัส, ชื่อ, Campaign, วันเริ่มขาย) เพื่อใช้เดโม NPD

### 1.2 ข้อมูล

- `data/products.js` = Product Master ตั้งต้น: `{ sku, name, campaign, launchDate, discontinueMonth, clearance: { fromMonth, toMonth, stockQty } | null }`
- `data/listings.js` = Listing ตั้งต้น: `{ sku, accountId }`
- ค่าที่แก้ในหน้านี้เก็บที่ `store` Key `master.products` และ `master.listings` (ไม่แยกตามปี เพราะเป็นข้อมูลสินค้า)
- ย้ายฟังก์ชันคำนวณ Status ไปไว้ใน `calc.js` (ถ้ายังไม่อยู่) และให้หน้าวางแผน SKU เรียกใช้ตัวเดียวกัน

## 2. หน้าวางแผน SKU

### 2.1 แถบเครื่องมือ (ใช้ร่วมกับหน้า Phasing)

- ย้ายชุด Filter `Channel | Sub-channel (ค้นหาได้, ‹ ›) | Sales Person` จากหน้า Phasing ไปเป็น Component กลาง `SP.core.components.subChannelPicker` แล้วใช้ทั้ง 2 หน้า ค่าที่เลือกใช้ Key เดียวกัน (`ui.selection`) เพื่อให้สลับหน้าแล้วยังอยู่ Account เดิม
- ต่อจากนั้น: มุมมอง `จำนวนชิ้น | Sell-out Amount | Net Sales` · GP ของ Account · **โหมด (ข้อ 2.2)**
- หัวข้อ: `วางแผนราย SKU` คำอธิบาย 1 บรรทัด: `กรอกจำนวนชิ้นต่อ SKU ต่อเดือน ระบบแปลงเป็น Net Sales และเทียบกับเป้าจากหน้า Phasing`

### 2.2 โหมดของแผน (Segmented control)

| โหมด | เดือนที่แก้ได้ | การแสดงผล |
|---|---|---|
| **สร้างแผนครั้งแรก** | ทุกเดือน | ทุกเดือนเป็นตัวเลขแผน |
| **ปรับแผน (Re-forecast)** | ตั้งแต่ M+4 เท่านั้น | เดือนที่ผ่านแล้วแสดง Actual (พื้นลายหรือสีจาง ป้าย `Actual`) · M+1 ถึง M+3 ล็อก (ไอคอนกุญแจ ป้าย `ล็อก`) · M+4 ขึ้นไปแก้ได้ |

- โหมดปรับแผนมี Dropdown `เดือนปัจจุบัน (จำลอง)` ค่าเริ่มต้น `มี.ค. 2027` (ทำให้ ม.ค.–มี.ค. = Actual, เม.ย.–มิ.ย. = ล็อก, ก.ค.–ธ.ค. = แก้ได้)
- ตัวเลข Actual เป็นข้อมูลสมมติใน `data/actuals.js` (อย่าสุ่มใหม่ทุกครั้งที่เปิด)
- โหมดปรับแผนแสดงแถว `Target Baseline` (ค่าจากโหมดสร้างแผนครั้งแรก) เทียบกับ `แผนล่าสุด` เพื่อให้เห็นว่า Target ที่อนุมัติไม่เปลี่ยน
- เก็บโหมดและเดือนจำลองที่ `ui.planMode` และ `ui.currentMonth`

### 2.3 กฎการแก้ไขช่อง

ฟังก์ชันเดียวใน `calc.js`: `cellState(mode, month, currentMonth, fillSource)` คืนค่า `editable`, `reason`

- ช่อง **ล็อก 0** (ก่อนเดือนเริ่มขายใน Account นี้ หรือหลังเลิกขาย หรือไม่ได้ Listing) แก้ไม่ได้ทุกโหมด
- ช่องอื่นแก้ได้ตามโหมดในข้อ 2.2 **รวมถึงช่องระบบเติมและ Clearance** เมื่อแก้แล้วให้แสดงจุดเล็กมุมช่อง (Override) และมีปุ่มคืนค่าระบบรายแถว
- แก้ได้เฉพาะในมุมมองจำนวนชิ้น (มุมมองบาทอ่านอย่างเดียว)

### 2.4 กลุ่ม SKU ในตาราง

แบ่งตารางเป็น 2 กลุ่ม (หัวกลุ่มพับได้ แสดงจำนวนรายการ):

1. **SKU ที่ขายอยู่** — Existing และ Clearance ที่ Listing ใน Account นี้
2. **NPD** — SKU ที่ Status เป็น NPD ในปีแผน แต่ละแถวมี Dropdown `เริ่มขายใน Account นี้` (เลือกเดือน ห้ามเลือกก่อนวันเริ่มขายใน Product Master) เดือนก่อนหน้าเป็นล็อก 0 อัตโนมัติ

### 2.5 เพิ่ม / ลบ SKU ในแผน

- ปุ่ม `+ เพิ่ม SKU` เปิดรายการให้เลือกจาก Product Master **เฉพาะ SKU ที่ Listing ใน Account นี้และยังไม่อยู่ในแผน** มีช่องค้นหา แสดง Badge Status ในรายการ ห้ามพิมพ์รหัสเอง
- ด้านบนตารางมีป้ายเตือน `NPD ที่ Listing แล้วแต่ยังไม่อยู่ในแผน: n รายการ` กดแล้วเปิดรายการเพิ่ม SKU กรองเฉพาะ NPD
- แต่ละแถวมีปุ่มลบ (×) ถามยืนยันก่อนลบ
  - โหมดสร้างแผนครั้งแรก: เอา SKU ออกจากแผนทั้งแถว
  - โหมดปรับแผน: ตั้งเดือนที่แก้ได้ (M+4 ขึ้นไป) เป็น 0 และคงเดือน Actual / ล็อกไว้ แถวยังแสดงพร้อมป้าย `หยุดวางแผน`
- ลบ SKU ในหน้านี้ **ไม่กระทบ Product Master**

### 2.6 ตารางและ Layout

- คอลัมน์ SKU ติดซ้าย และแถวหัวตาราง + แถว Target ติดบน (sticky)
- 12 เดือน + คอลัมน์รวม ต้องพอดีกว้าง 1920px โดยไม่เลื่อนแนวนอน (ลดความกว้างคอลัมน์ ตัวเลขชิดขวา ใช้ตัวอักษรขนาดเล็กลงในช่อง)
- ตัดคำอธิบายย่อยใต้ชื่อ SKU ออก (ย้ายไปเป็น tooltip)
- แถวสรุปท้าย: `รวม Plan (ชิ้น)`, `รวม Plan (Net Sales)`, `Remaining` (Alert 3 สีชุดเดิม)
- การ์ดสรุปทั้งปีด้านบน ย่อเหลือบรรทัดเดียว: `MT · Watsons 2027 | Plan x / เป้า y | แถบความคืบหน้า | Badge Remaining`
- Legend รวมเป็นบรรทัดเดียวขนาดเล็ก: `ล็อก 0 · กรอกเอง · ระบบเติม · Clearance · Override · Actual · ล็อก M+1–M+3 · P = มี Promo บางวัน`
- ตัดข้อความ "แก้ได้เฉพาะช่องสีฟ้า..." ใต้ตาราง
- ตัดกล่อง "สิ่งที่ต้องการให้อนุมัติ" ย้ายข้อความไปรวมใน Decision log ของหน้า `summary`
- ถ้า SKU มีมากกว่าที่จอแสดงได้ ให้เลื่อนภายในตาราง (หน้าไม่ยืด)

### 2.7 ข้อมูล

- เก็บแผนที่ `plan.<year>.sku.<subChannelId>` = `{ items: { [sku]: { startMonth, qty: [12], overrides: [12 bool], stopped: bool } } }`
- โหมดปรับแผนเก็บแยกที่ `plan.<year>.forecast.<subChannelId>` (โครงเดียวกัน) Target Baseline ไม่ถูกแก้
- ใช้ Listing และ Status จาก `master.*` เท่านั้น

## 3. Test ใน `tests/calc.test.html`

1. `cellState` โหมดสร้างแผนครั้งแรก: ทุกเดือนแก้ได้ ยกเว้นช่องล็อก 0
2. `cellState` โหมดปรับแผน เดือนปัจจุบัน มี.ค.: ม.ค.–มี.ค. = Actual แก้ไม่ได้ / เม.ย.–มิ.ย. = ล็อก / ก.ค.–ธ.ค. = แก้ได้
3. NPD เริ่มขายใน Account เดือน พ.ค.: ม.ค.–เม.ย. = ล็อก 0
4. เลือกเดือนเริ่มขายใน Account ก่อน Launch Date → ไม่ยอมรับ
5. Status: Launch 15 เม.ย. 2027 → เม.ย.–มิ.ย. = NPD, ก.ค. = Existing; มี Clearance มี.ค.–พ.ค. → Clearance มาก่อน
6. ลบ SKU ในโหมดปรับแผน เดือนปัจจุบัน มี.ค. → ก.ค.–ธ.ค. = 0 และ ม.ค.–มิ.ย. คงเดิม
7. SKU ที่ไม่ได้ Listing ใน Account ไม่ปรากฏในรายการเพิ่ม SKU

## 4. สิ่งที่ห้ามทำ

- ห้ามลบไฟล์ของหน้า `sku-status`
- ห้ามให้พิมพ์รหัส SKU เองในหน้าวางแผน (เลือกจาก Product Master เท่านั้น)
- ห้ามคำนวณ Status / สิทธิ์แก้ช่อง / Net Sales ใน Module ให้เรียกจาก `calc.js`
- ห้ามให้โหมดปรับแผนเขียนทับ Target Baseline
- ห้ามสร้าง Filter Channel / Sub-channel ชุดใหม่ ใช้ Component กลางตัวเดียวกับหน้า Phasing

## 5. ตรวจก่อนส่งงาน

1. Test ผ่านทั้งหมด
2. Tour: Top-down → Phasing → Product Master → วางแผน SKU → … และหน้า Status SKU ไม่แสดง
3. ติ๊ก Listing SKU ใหม่ใน Watsons ที่หน้า Product Master แล้วไปหน้าวางแผน SKU ของ Watsons เห็นป้าย NPD ที่ยังไม่อยู่ในแผน และเพิ่มได้
4. สลับโหมด 2 แบบแล้วสิทธิ์แก้ช่องถูกต้อง และแถว Target Baseline ไม่เปลี่ยนเมื่อแก้ในโหมดปรับแผน
5. หน้าวางแผน SKU ไม่เลื่อนแนวนอนที่ 1920×1080
6. อัปเดต `CLAUDE.md` (Module Product Master, Key `master.*`, โหมดแผน, `cellState`, Component `subChannelPicker`)

# Change Request v6: ขยาย Product Master เป็น Module ข้อมูลสินค้าจริง (สำหรับ Claude Code)

> สั่ง Claude Code: "อ่าน PROMPT_change_v6_product-master.md และ CLAUDE.md แล้วสรุปไฟล์ที่จะแก้ โครงข้อมูล และลำดับงานก่อนเริ่ม"
> ทำหลังจาก v5 เสร็จแล้ว

ยังคงยึดหลักการเดิมใน `CLAUDE.md` ทั้งหมด (Script ธรรมดา, `window.SP`, Module ไม่เรียกกันเอง, สูตรอยู่ที่ `calc.js`, ข้อความอยู่ที่ `content.js`, ดับเบิลคลิกเปิดได้, ไม่ต้องเลื่อนที่ 1920×1080, ห้ามใช้ Library กราฟ) และมาตรฐานกลางของ v5 (ภาษาทางการ, ตารางคำศัพท์, สีสถานะ, รูปแบบตัวเลข, โครงหัวหน้า, `workflowBar`)

ลำดับงาน: ข้อ 1 (โครงข้อมูล) → ข้อ 2 (Status) → ข้อ 3 (หมวดสินค้าและ Series) → ข้อ 4 (รายการสินค้า + รายละเอียดสินค้า) → ข้อ 5 (แผน NPD) → ข้อ 6 (Promotion Price) → ข้อ 7 (Listing) → ข้อ 8 (เชื่อมกับ Sales Planning)

---

## 0. เป้าหมาย

เปลี่ยน Product Master จากหน้า Listing หน้าเดียว เป็น Module ที่เก็บข้อมูลสินค้าครบ และเป็นแหล่งข้อมูลเดียวที่ Sales Planning ใช้ ได้แก่ ข้อมูลทั่วไปและรูปสินค้า, หมวดสินค้าและ Series, ราคา, Listing, แผนการเปิดตัว NPD และ Promotion Price รายเดือน

## เมนูกลุ่ม Product Master (ใหม่)

```
Product Master
  • รายการสินค้า
  • แผน NPD
  • Promotion Price
  • Listing และวันเริ่มขาย
  • หมวดสินค้าและ Series
```

| หน้า | หัวข้อ | คำอธิบาย | ผู้แก้ไข |
|---|---|---|---|
| รายการสินค้า | รายการสินค้า | ข้อมูลหลักของสินค้า ราคา และสถานะความครบถ้วนของข้อมูล | ทีม Product |
| แผน NPD | แผนการเปิดตัวสินค้าใหม่ (NPD) | กำหนดการเปิดตัวสินค้าใหม่ตาม Series และ Account ที่วางแผนจำหน่าย | ทีม Product |
| Promotion Price | Promotion Price | ราคาโปรโมชันราย SKU ราย Account ตามช่วงเวลา | Trade Marketing |
| Listing | Listing และวันเริ่มขาย | กำหนด Account ที่จำหน่ายสินค้าได้ และช่วง Clearance | ทีม Product · Supply Chain (Clearance) |
| หมวดสินค้าและ Series | หมวดสินค้าและ Series | รายการหมวดสินค้าและ Series ที่ใช้อ้างอิงในข้อมูลสินค้า | ทีม Product |

- เพิ่มบทบาทจำลอง `ทีม Product`, `Supply Chain`, `Trade Marketing` ใน `มุมมองผู้ใช้` และใช้ `workflowBar` แบบแก้ไข/บันทึก/ยกเลิก (ไม่มีขั้นอนุมัติ ยกเว้นแผน NPD ข้อ 5) บทบาทที่ไม่มีสิทธิ์เห็นข้อความอ่านอย่างเดียวตาม v5 ข้อ 1.6

---

## 1. โครงข้อมูล

ทุกตารางที่ค่าเปลี่ยนตามเวลามี `effectiveFrom` / `effectiveTo` และห้ามเขียนทับค่าเดิม ทุกการแก้ไขบันทึกใน Audit log

```js
// data/products.js → store: master.products
{ trCode,            // รหัสหลัก (String) ว่างได้ถ้ายังเป็น NPD ที่ยังไม่ได้รหัสจริง
  tempCode,          // รหัสชั่วคราว เช่น "NPD_Q3_06" (ใช้เมื่อยังไม่มี trCode)
  internalCode, barcode,
  name, nameEn,
  categoryId, subCategoryId, typeId,      // จาก taxonomy.category
  seriesId, subSeriesId,                  // จาก taxonomy.series
  itemType: "SALE" | "TESTER" | "GIFT" | "PREMIUM",
  packSize, uom,                          // เช่น 30, "g"
  image,                                  // data URL ของภาพย่อ หรือ null
  launchDate, discontinueMonth,
  createdAt, updatedAt }

// data/taxonomy.js → store: master.taxonomy
{ category: [{ id, name, parentId, level: "CATEGORY"|"SUB_CATEGORY"|"TYPE", active, order }],
  series:   [{ id, name, parentId, level: "SERIES"|"SUB_SERIES", active, order }] }

// data/pricing.js → store: master.priceList (มีอยู่แล้ว ขยาย)
{ productKey, priceType: "RSP"|"SELL_IN", channelId|null, price, effectiveFrom, effectiveTo }

// data/promotions.js → store: master.promotions (ใหม่)
{ id, name, productKey, accountIds: [..], startDate, endDate,
  mode: "PRICE"|"DISCOUNT_PCT", value, promoGpPct|null,
  status: "DRAFT"|"CONFIRMED", createdBy }

// data/npd.js → store: master.npdPlans (ใหม่)
{ id, productKey, seriesId, stage, plannedLaunchDate,
  plannedAccounts: [{ accountId, plannedStartMonth }], note,
  workflow: { status, history } }

// store: master.audit
{ entity, key, field, oldValue, newValue, by, at }
```

- `productKey` = `trCode` ถ้ามี ไม่มีใช้ `tempCode` ทุกที่ที่อ้างสินค้า (Listing, ราคา, Promotion, แผน SKU) ใช้ `productKey`
- ราคาทั้งหมดเก็บแบบไม่รวม VAT ตาม Setting `PRICE_INCLUDES_VAT` เดิม
- ข้อมูลตัวอย่าง: 40–60 SKU ใน 3 Category และ 5 Series (ชื่อสมมติ ไม่ใช้ชื่อสินค้าจริง) มี NPD ที่ใช้รหัสชั่วคราวอย่างน้อย 2 รายการ มีสินค้าที่ข้อมูลไม่ครบ มี Tester/Gift อย่างน้อย 3 รายการ

## 2. Status สินค้า (ชุดเดียวทั้งระบบ)

Status **คำนวณจากวันที่** ไม่ให้เลือกเอง เพื่อไม่ให้ข้อมูลขัดกัน ใช้ชื่อชุดเดียวกันทุกหน้า รวมถึง Sales Planning (เปลี่ยน `NPD` / `Existing` เดิมเป็นชุดนี้)

| Status | เงื่อนไข ณ เดือนที่พิจารณา | สี |
|---|---|---|
| Planned | ก่อน `launchDate` | เทา |
| New | 3 เดือนแรกนับจาก `launchDate` (เดือนที่เริ่มขายเป็นเดือนที่ 1) | ม่วง |
| Active | พ้นช่วง New แล้ว | เขียว |
| Clearance | อยู่ในช่วง Clearance (มาก่อน Status อื่น) | ส้ม |
| Discontinued | หลัง `discontinueMonth` | แดงเข้ม |

- หน้ารายการสินค้าแสดง Status ณ เดือนปัจจุบัน หน้าที่อยู่ในบริบทปีแผน (Listing, Sales Planning) แสดง Status ณ เดือนแรกของปีแผน และ Tooltip แสดงการเปลี่ยน Status ในปีนั้น
- ฟังก์ชัน `productStatus(product, month)` ใน `calc.js` (แทนฟังก์ชันเดิม)

## 3. หน้าหมวดสินค้าและ Series

- 2 แท็บ: `หมวดสินค้า` (Category → Sub Category → Type) และ `Series` (Series → Sub Series)
- แสดงเป็นตาราง Tree พับได้ คอลัมน์: ชื่อ · จำนวน SKU · Active · ลำดับ
- โหมดแก้ไข: เพิ่มรายการย่อย, แก้ชื่อ, ปิดใช้งาน (ห้ามลบรายการที่มี SKU ใช้อยู่ ให้แสดงจำนวน SKU ที่ใช้อยู่ในกล่องแจ้ง), จัดลำดับด้วยปุ่มขึ้น/ลง
- รายการที่ปิดใช้งานเลือกใหม่ไม่ได้ในฟอร์มสินค้า แต่สินค้าเดิมยังแสดงชื่อได้

## 4. หน้ารายการสินค้า

### 4.1 ส่วนบน

- **KPI 5 ใบ** (กดแล้วกรองตาราง ใบที่เลือกมีกรอบเน้น): ทั้งหมด · Active · New · ขาดข้อมูลจำเป็น · ขาดข้อมูลที่ควรมี
- **แถบค้นหาและตัวกรอง** แถวเดียว: ค้นหา (TR Code / รหัสชั่วคราว / Internal Code / Barcode / ชื่อ) · มุมมอง `รายการ | จัดกลุ่ม` · Status · หมวดสินค้า · Series · Channel (มี Listing ใน Channel นั้น) · Item Type (ค่าเริ่มต้น `ขายจริง`) · ความครบถ้วน
- ปุ่มขวา: `เลือกคอลัมน์` · `ส่งออก CSV` · `เปรียบเทียบกับ ERP` · (โหมดแก้ไข) `+ เพิ่ม SKU`
- ถ้ามีตัวกรอง แสดงบรรทัดสรุปตัวกรองที่ใช้ + ลิงก์ `ล้างตัวกรอง`

### 4.2 ตาราง

- คอลัมน์เริ่มต้น: รูป · TR Code (หรือรหัสชั่วคราวพร้อมป้าย `ชั่วคราว`) · ชื่อสินค้า · Status · Category · Sub Category · Type · Series · Sub Series · RSP (ราคาปัจจุบัน) · ความครบถ้วน · จัดการ
- คอลัมน์เพิ่มได้จาก `เลือกคอลัมน์`: Internal Code · Barcode · Item Type · ขนาดบรรจุ · วันเริ่มขาย · จำนวน Account ที่ Listing · ราคาขายเข้า · แก้ไขล่าสุด (จำค่าที่ `ui.productColumns`)
- หัวคอลัมน์หมวดสินค้ามีหัวกลุ่ม `หมวดสินค้า` ครอบ Category/Sub Category/Type
- คอลัมน์รูปและ TR Code ติดซ้าย หัวตารางติดบน ห้ามมี Scrollbar แนวนอนระดับหน้า (ถ้าคอลัมน์เกิน ให้เลื่อนภายในตาราง)
- ข้อความยาวตัดด้วย … พร้อม Tooltip ชื่อเต็ม (ใช้กับข้อความเท่านั้น ห้ามตัดตัวเลข)
- มุมมอง `จัดกลุ่ม`: จัดกลุ่มตาม Series → Sub Series แสดงจำนวน SKU และจำนวนตาม Status ในหัวกลุ่ม
- คลิกแถวเพื่อเปิดรายละเอียดสินค้า (ข้อ 4.3)

### 4.3 รายละเอียดสินค้า (Drawer ด้านขวา กว้างประมาณ 600px)

หัว Drawer: รูป · ชื่อ · รหัส · Status · ความครบถ้วน (%) · ปุ่ม `แก้ไข`

แท็บ:

1. **ข้อมูลทั่วไป**: รหัสทั้งหมด, ชื่อไทย/อังกฤษ, Barcode, หมวดสินค้า (Dropdown แบบลำดับชั้น เลือก Category แล้ว Sub Category แสดงเฉพาะที่อยู่ใต้ Category นั้น), Series/Sub Series (แบบเดียวกัน), Item Type, ขนาดบรรจุ + หน่วย
   - **รูปสินค้า**: เลือกไฟล์จากเครื่อง ระบบย่อเป็นภาพขนาดไม่เกิน 320px ด้วย Canvas แล้วเก็บเป็น data URL (ห้ามเก็บไฟล์ต้นฉบับ) ถ้ายังไม่มีรูปแสดงภาพแทนเป็นตัวอักษรย่อของ Series บนพื้นสี
2. **ราคา**: ตารางประวัติราคา RSP และราคาขายเข้าต่อ Channel (วันที่มีผล · ราคา · ผู้แก้ไข) ปุ่ม `+ ราคาใหม่` ให้ระบุวันที่มีผล (ราคาเดิมปิดช่วงอัตโนมัติ) และส่วน `Promotion ที่เกี่ยวข้อง` แสดงรายการ Promotion ของ SKU นี้ ลิงก์ไปหน้า Promotion Price
3. **Listing และวงจรสินค้า**: วันเริ่มขาย, Account ที่ Listing (อ่านอย่างเดียว ลิงก์ไปหน้า Listing), ช่วง Clearance, เดือนเลิกขาย และเส้นเวลา Status ของปีแผน (12 ช่องสีตาม Status)
4. **ประวัติการแก้ไข**: จาก `master.audit` (วันเวลา · ผู้แก้ไข · ฟิลด์ · ค่าเดิม → ค่าใหม่)

### 4.4 ความครบถ้วนของข้อมูล

- กำหนดใน `data/settings.js`:
  - จำเป็น: รหัส (TR Code หรือรหัสชั่วคราว), ชื่อ, Category, Sub Category, Type, Series, Item Type, RSP, วันเริ่มขาย
  - ควรมี: Barcode, รูป, Sub Series, Internal Code, ขนาดบรรจุ
- ฟังก์ชัน `productCompleteness(product, priceList)` ใน `calc.js` คืน `%`, `missingRequired[]`, `missingRecommended[]`
- แสดงเป็นป้าย `ครบ` / `ขาดจำเป็น n` / `ขาดที่ควรมี n` Tooltip บอกชื่อฟิลด์
- สินค้าที่ขาดข้อมูลจำเป็น **ใช้ในหน้าวางแผน SKU ไม่ได้** (แสดงในรายการเพิ่ม SKU แต่กดเลือกไม่ได้ พร้อมเหตุผล)

### 4.5 เพิ่ม SKU / รหัสชั่วคราว

- ฟอร์มเพิ่ม SKU ใช้ช่องเดียวกับแท็บข้อมูลทั่วไป ถ้ายังไม่มี TR Code ให้เลือก `ใช้รหัสชั่วคราว` ระบบสร้างรหัสรูปแบบ `NPD_{ปี}Q{ไตรมาส}_{ลำดับ}`
- เมื่อได้ TR Code จริง ปุ่ม `ผูกรหัสจริง` ใน Drawer: กรอก TR Code ระบบย้ายทุกข้อมูลที่อ้าง `tempCode` (ราคา, Listing, Promotion, แผน NPD, แผน SKU ทุกปี) ไปใช้ TR Code และเก็บ `tempCode` ไว้เป็นประวัติ ห้ามซ้ำกับ TR Code ที่มีอยู่

### 4.6 ส่งออก CSV และเปรียบเทียบกับ ERP

- `ส่งออก CSV` ส่งออกเฉพาะแถวและคอลัมน์ที่แสดงตามตัวกรอง ใช้ Blob + `<a download>` (ทำงานได้เมื่อเปิดจากไฟล์ในเครื่อง) ใส่ BOM เพื่อให้ Excel อ่านภาษาไทยได้
- `เปรียบเทียบกับ ERP` เป็นเดโม: เทียบกับ `data/erp-snapshot.js` (ข้อมูลสมมติ) แล้วแสดงกล่องรายการที่ต่างกัน 3 กลุ่ม: มีใน ERP แต่ไม่มีใน Master · มีใน Master แต่ไม่มีใน ERP · ฟิลด์ไม่ตรงกัน (ชื่อ, Barcode, RSP) พร้อมปุ่ม `ใช้ค่าจาก ERP` รายฟิลด์ (โหมดแก้ไข)

## 5. หน้าแผน NPD

### 5.1 มุมมอง

สลับ `Timeline | ตาราง`

- **Timeline**: แถว = Series (พับได้) → SKU ใหม่ คอลัมน์ = 12 เดือนของปีแผน (เลื่อนไปปีถัดไปได้) แต่ละ SKU แสดงหมุดวันเปิดตัว และแถบช่วง New (3 เดือน) สีตามขั้น
- **ตาราง**: SKU · Series · ขั้น · วันเปิดตัวตามแผน · Account ที่วางแผน (จำนวน + Tooltip รายชื่อ) · อยู่ในแผน SKU แล้ว (x / y Account) · สถานะอนุมัติ

### 5.2 ขั้นของ NPD

`วางแผน → อนุมัติแนวคิด → เตรียมผลิต → พร้อมขาย → เปิดตัวแล้ว` (ข้อความใน `content.js`) ขั้น `เปิดตัวแล้ว` ระบบตั้งให้เมื่อถึง `launchDate`

### 5.3 การแก้ไขและการอนุมัติ

- ทีม Product สร้าง/แก้แผน NPD: เลือก SKU (หรือสร้าง SKU ใหม่ด้วยรหัสชั่วคราว), วันเปิดตัว, Account ที่วางแผนพร้อมเดือนเริ่มขายต่อ Account
- ใช้ Workflow จาก `core/workflow.js`: ทีม Product ส่ง → Sales Director อนุมัติ (ใช้สถานะชุดเดียวกับ Sales Planning)
- เมื่อแผน NPD อนุมัติแล้ว: `launchDate` ของสินค้า และ Listing ของ Account ที่วางแผน ถูกตั้งค่าอัตโนมัติ และเดือนเริ่มขายต่อ Account กลายเป็นค่าเริ่มต้นในหน้าวางแผน SKU (ผู้รับผิดชอบยังแก้ได้)
- ถ้าเลื่อนวันเปิดตัวหลังอนุมัติ ให้ Workflow กลับเป็น `ฉบับร่าง` และแผน SKU ที่เกี่ยวข้องเป็น `ต้องตรวจสอบใหม่`

### 5.4 สรุปด้านบน

KPI: NPD ในปีแผน · ตาม Series · ยังไม่อนุมัติ · Account ที่วางแผนแล้วแต่ยังไม่อยู่ในแผน SKU

## 6. หน้า Promotion Price

### 6.1 มุมมอง

แถบตัวกรอง: Channel · Account (หลายค่า) · Series · ค้นหา SKU · ปีแผน สลับ `ปฏิทินรายเดือน | รายการ`

- **ปฏิทินรายเดือน**: แถว = SKU (จัดกลุ่มตาม Series) · คอลัมน์ = 12 เดือน · ช่องแสดง **ราคาที่มีผลเฉลี่ยของเดือน** (ถ่วงตามจำนวนวัน) และป้ายเล็ก `−x%` เทียบ RSP ช่องที่ไม่มี Promotion แสดง RSP สีจาง ช่องที่ Promotion ครอบบางวันมีเครื่องหมาย `P` มุมซ้ายบน (แบบเดียวกับหน้าวางแผน SKU) Hover แสดงรายการ Promotion ที่ครอบเดือนนั้น
  - เมื่อเลือกหลาย Account และราคาไม่เท่ากัน แสดง `หลายราคา` และ Tooltip แยกราย Account
- **รายการ**: ชื่อ Promotion · SKU · Account · ช่วงวันที่ · ราคา/ส่วนลด · GP ช่วง Promotion · สถานะ (`ฉบับร่าง` / `ยืนยันแล้ว`)

### 6.2 การแก้ไข (Trade Marketing)

- โหมดแก้ไข คลิกช่องในปฏิทิน → เปิดฟอร์ม Promotion ตั้งค่าเริ่มต้นเป็นทั้งเดือนนั้น ปรับวันที่เริ่ม/สิ้นสุดได้
- ฟอร์ม: ชื่อ · SKU (เลือกหลายรายการได้ เช่นทั้ง Series) · Account (หลายค่า) · ช่วงวันที่ · `ราคาโปรโมชัน` หรือ `ส่วนลด %` · GP ช่วง Promotion (ไม่บังคับ) · แสดงตัวอย่างราคาหลังคำนวณ
- ปุ่ม `คัดลอกไปเดือนถัดไป` และ `คัดลอกไปหลาย Account`
- **ห้าม Promotion ซ้อนกัน** ของ SKU × Account เดียวกันในวันเดียวกัน (แสดงข้อผิดพลาดพร้อมชื่อ Promotion ที่ชน)
- ราคาโปรโมชันต้องมากกว่า 0 และไม่เกิน RSP (ถ้าเกินให้เตือน)
- เฉพาะ Promotion `ยืนยันแล้ว` ที่ใช้คำนวณใน Sales Planning Promotion `ฉบับร่าง` แสดงในปฏิทินเป็นเส้นประ

### 6.3 ผลต่อ Sales Planning

- หน้าวางแผน SKU ใช้ `effectivePrice(productKey, accountId, month)` และ `effectiveGp(...)` ใน `calc.js` (ฟังก์ชันเดียวกับปฏิทิน)
- Promotion ที่เพิ่มหรือแก้หลังล็อก Baseline **ไม่เปลี่ยน Target Baseline** (ใช้ Snapshot) แต่มีผลกับ Forecast และแสดงป้ายเตือนในหน้าวางแผน SKU โหมดปรับแผน `ราคาเปลี่ยนจาก Baseline n เดือน`

## 7. หน้า Listing และวันเริ่มขาย (ปรับจากเดิม)

- ใช้ Filter ชุดเดียวกับหน้ารายการสินค้า (ค้นหา, Series, Status, Item Type) และ Channel แบบ Segmented
- คอลัมน์ SKU แสดงรูปย่อ ชื่อ และ Series / Sub Series (บรรทัดเล็ก) ติดซ้าย
- ตัดคอลัมน์ `วันเริ่มขาย` แบบแก้ได้ออก (แก้ในรายละเอียดสินค้าหรือแผน NPD) คงไว้เป็นข้อความอ่านอย่างเดียว
- Checkbox Listing ต่อ Account: ในโหมดแก้ไขมี `เลือกทั้งแถว` และ `เลือกทั้งคอลัมน์` (เช่น Listing ทั้ง Series ใน Watsons)
- คอลัมน์ Clearance: แสดงช่วงเดือนและจำนวน Stock แบบย่อ (ไม่ตัดตัวเลข) กดแล้วเปิดฟอร์ม Clearance (Supply Chain)
- หัวตารางกลุ่ม `Listing ต่อ Account · {Channel}` คงไว้

## 8. เชื่อมกับ Sales Planning

- หน้าวางแผน SKU
  - ใช้เฉพาะสินค้า `itemType = SALE`
  - Filter Series รองรับ Sub Series (เลือกระดับ Series แล้วรวม Sub Series ทั้งหมด)
  - Tooltip ชื่อ SKU แสดงรูปย่อ, หมวดสินค้า, Series/Sub Series, RSP
  - รายการ `+ เพิ่ม SKU` ปิดการเลือกสินค้าที่ขาดข้อมูลจำเป็น (ข้อ 4.4)
  - NPD ที่อยู่ในแผน NPD ที่อนุมัติแล้ว ใช้เดือนเริ่มขายต่อ Account จากแผน NPD เป็นค่าเริ่มต้น
- หน้ารายงานสรุปแผน: กราฟสัดส่วนตาม Status ใช้ชุด Status ใหม่ และเพิ่มตัวเลือกจัดกลุ่มตาม `Category`
- เปลี่ยนคำ `NPD` / `Existing` ในทุกหน้าของ Sales Planning เป็นชุด Status ข้อ 2 (อัปเดตตารางคำศัพท์ใน `content.js` และ `CLAUDE.md`)

## 9. Test

1. `productStatus`: launch 15 เม.ย. 2027 → มี.ค. = Planned, เม.ย.–มิ.ย. = New, ก.ค. = Active; Clearance มี.ค.–พ.ค. มาก่อน; หลัง discontinueMonth = Discontinued
2. `productCompleteness`: ขาด Series และรูป → missingRequired = [Series], missingRecommended = [รูป]
3. ราคาตามวันที่มีผล: RSP 100 ถึง 31 พ.ค., RSP 110 ตั้งแต่ 1 มิ.ย. → ราคาเดือน มิ.ย. = 110 และ พ.ค. = 100
4. `effectivePrice`: RSP 100, Promotion 70 ช่วง 1–10 มิ.ย. (10 จาก 30 วัน) → 90
5. Promotion แบบส่วนลด 20% บน RSP 100 → 80
6. Promotion ซ้อนกันใน SKU × Account เดียวกัน → ไม่ยอมรับ
7. Promotion `ฉบับร่าง` ไม่มีผลต่อ `effectivePrice`
8. ผูกรหัสจริง: `NPD_2027Q2_01` → `11050` แล้ว Listing, ราคา, Promotion, แผน NPD และแผน SKU อ้าง `11050` ทั้งหมด และ TR Code ซ้ำ → ไม่ยอมรับ
9. ลบหมวดสินค้าที่มี SKU ใช้อยู่ → ไม่ยอมรับ
10. แผน NPD อนุมัติแล้ว → Listing ของ Account ที่วางแผนถูกตั้งค่า และเดือนเริ่มขายเป็นค่าเริ่มต้นในแผน SKU
11. แก้ Promotion หลังล็อก Baseline → Net Sales ของ Baseline ไม่เปลี่ยน, Forecast เปลี่ยน
12. ส่งออก CSV มี BOM และมีเฉพาะคอลัมน์ที่แสดง

## 10. สิ่งที่ห้ามทำ

- ห้ามให้เลือก Status เอง (คำนวณจากวันที่เท่านั้น)
- ห้ามพิมพ์ชื่อ Category / Series เองในฟอร์มสินค้า (เลือกจาก Master เท่านั้น)
- ห้ามเก็บรูปขนาดเต็ม (ย่อก่อนเก็บเสมอ) และห้ามโหลดรูปจาก URL ภายนอก
- ห้ามลบข้อมูลที่ถูกอ้างอิง (ใช้ปิดใช้งานแทน)
- ห้าม Promotion ซ้อนกันใน SKU × Account เดียวกัน
- ห้ามให้การแก้ราคาหรือ Promotion เปลี่ยน Target Baseline
- ห้ามคำนวณ Status, ราคา, ความครบถ้วน ใน Module ให้เรียกจาก `calc.js`

## 11. ตรวจก่อนส่งงาน

1. Test ทั้งหมดผ่าน
2. เมนู Product Master มี 5 หน้า ทุกหน้าใช้โครงหัวหน้าและภาษาตาม v5
3. หน้ารายการสินค้า: KPI กดกรองได้ มุมมองรายการ/จัดกลุ่ม เลือกคอลัมน์ได้ เปิด Drawer แล้วแก้ข้อมูล อัปโหลดรูป ดูประวัติได้
4. เพิ่ม SKU ใหม่ด้วยรหัสชั่วคราว → สร้างแผน NPD → Sales Director อนุมัติ → หน้าวางแผน SKU ของ Account ที่วางแผนเห็น SKU นี้พร้อมเดือนเริ่มขาย → ผูกรหัสจริง แล้วแผน SKU ยังอยู่ครบ
5. สร้าง Promotion ใน Watsons เดือน มิ.ย. → ปฏิทินแสดงราคาเฉลี่ย และ Tooltip ในหน้าวางแผน SKU ของ Watsons แสดงราคาเดียวกัน
6. หน้า Listing เลือกทั้งคอลัมน์ได้ และคอลัมน์ Clearance ไม่ถูกตัด
7. ทุกหน้าไม่ต้องเลื่อนที่ 1920×1080 (ตารางเลื่อนภายในได้)
8. อัปเดต `CLAUDE.md` (โครงข้อมูลข้อ 1, `productKey`, Status ชุดใหม่, `productCompleteness`, `effectivePrice`, Promotion, แผน NPD, การผูกรหัสจริง)

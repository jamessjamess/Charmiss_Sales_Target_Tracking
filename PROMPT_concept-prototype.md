# Prompt: Concept Prototype "Sales Target Planning" แบบแยก Module (สำหรับ Claude Code)

> วางไฟล์นี้ไว้ที่ root ของ repo แล้วสั่ง Claude Code ว่า
> "อ่าน PROMPT_concept-prototype.md แล้วเสนอโครงไฟล์ รายชื่อ Module และข้อมูลตัวอย่างก่อนเขียนโค้ด"

---

## 0. เป้าหมาย

สร้างเว็บ **เล่า Concept** ของระบบตั้ง Sales Target เพื่อให้ Management และ Sales Director **อนุมัติแนวคิด** ก่อนสร้างระบบจริง

- ผู้ชมไม่ใช่สายเทคนิค ต้องเข้าใจได้ใน 10–15 นาที
- เป็น Prototype สำหรับนำเสนอ ไม่มี Login ไม่มีฐานข้อมูล ไม่มี Import/Export
- มีตัวอย่างที่กดลองได้ในจุดสำคัญ และตัวเลขที่แก้ในหน้าหนึ่งต้องส่งต่อไปหน้าถัดไป (เช่น เป้าที่แบ่งใน Top-down ไปแสดงเป็นแถว Target ใน SKU Grid)
- **แยกเป็น Module หลายหน้า** เพื่อให้เพิ่ม แก้ หรือถอด Module ได้โดยไม่กระทบส่วนอื่นเมื่อระบบใหญ่ขึ้น
- สูตรคำนวณต้องถูกต้องตามส่วนที่ 6

---

## 1. ข้อกำหนดทางเทคนิค

- **HTML + CSS + JavaScript ล้วน** ไม่มี Framework ไม่มี Build step ไม่มี npm
- **ต้องดับเบิลคลิกเปิด `index.html` จากเครื่องได้เลย** (ผ่าน `file://`) โดยไม่ต้องมี Server และต้อง Deploy บน GitHub Pages ได้ด้วย
- เพราะฉะนั้น **ห้ามใช้ ES Modules** (`<script type="module">`, `import`, `export`) และห้าม `fetch()` ไฟล์ในเครื่อง ใช้ `<script src>` แบบธรรมดาเท่านั้น
- ทุกไฟล์ JS ผูกตัวเองไว้ใต้ตัวแปรกลางตัวเดียว `window.SP` เช่น `SP.core.calc`, `SP.core.format`, `SP.data.products`, `SP.modules.topDown` ห้ามสร้างตัวแปร Global อื่น (ห่อแต่ละไฟล์ด้วย IIFE)
- ลิงก์ระหว่างหน้าใช้ `<a href>` แบบ Path relative และ **ชี้ไปที่ไฟล์ `index.html` ตรงๆ** (เช่น `../top-down/index.html`) ห้ามลิงก์แค่ชื่อโฟลเดอร์ เพราะเปิดจากเครื่องจะได้หน้ารายชื่อไฟล์ ห้ามใช้ Path ที่ขึ้นต้นด้วย `/`
- ใช้ไฟล์ภายนอกได้ไม่เกิน 2 อย่าง: Google Font ภาษาไทย 1 ตัว และ Mermaid จาก CDN สำหรับ Diagram (ถ้าโหลดไม่ได้ หน้าต้องยังอ่านได้)
- Responsive ใช้บนมือถือได้ และทุกหน้ามี Print CSS สำหรับพิมพ์หรือบันทึก PDF (ซ่อนเมนูและปุ่ม)

---

## 2. หลักการแยก Module (สำคัญที่สุด)

1. **1 Module = 1 โฟลเดอร์** ใน `modules/` มี `index.html` และไฟล์ JS ของตัวเอง (และ CSS ของตัวเองเฉพาะเมื่อจำเป็น)
2. **Module ห้ามเรียกใช้โค้ดของ Module อื่น** ใช้ได้เฉพาะ `SP.core.*` และ `SP.data.*`
3. **ส่งข้อมูลข้าม Module ผ่าน `SP.core.store` เท่านั้น** ห้ามอ่านหรือเขียน sessionStorage ตรงๆ ใน Module
4. **ห้ามซ้ำซ้อน**
   - Header, เมนู, Stepper, ปุ่มก่อนหน้า/ถัดไป สร้างจาก `core/layout.js` ที่เดียว ห้ามเขียนซ้ำใน HTML ของแต่ละหน้า
   - รายการไฟล์ `core/` และ `data/` ที่ต้องโหลด อยู่ใน `core/loader.js` ที่เดียว แต่ละหน้าใส่ Script แค่บรรทัดเดียว
   - สูตรอยู่ที่ `core/calc.js` ที่เดียว
   - การจัดรูปแบบตัวเลข (บาท, %, จำนวนชิ้น) อยู่ที่ `core/format.js` ที่เดียว
   - UI ที่ใช้หลายหน้า (ตาราง, Alert badge, Status badge, แถบ Remaining) อยู่ที่ `core/components.js`
   - สีและขนาดอยู่ใน `styles/tokens.css` เป็น CSS Variables เท่านั้น ห้าม Hardcode สีใน Module
   - ห้ามเขียนตัวเลขผลลัพธ์ลงใน HTML ตรงๆ ให้คำนวณจาก `calc.js` เสมอ
5. **เมนูและลำดับ Tour สร้างจาก `core/registry.js`** การเพิ่ม Module ใหม่ = คัดลอก `modules/_template/` + เพิ่ม 1 บรรทัดใน registry โดยไม่ต้องแก้ไฟล์อื่น
6. ทุกไฟล์ JS ของ Module มี Comment หัวไฟล์ระบุ: หน้าที่ของ Module, ข้อมูลที่อ่านจาก `data/`, Key ที่อ่านและเขียนใน `store`

---

## 3. โครงสร้างไฟล์

```
/
├─ index.html                     # หน้าแรก: ปัญหาปัจจุบัน + ภาพรวมแนวคิด + ปุ่ม "เริ่ม Tour"
├─ README.md                      # วิธีเปิดจากเครื่อง, Deploy GitHub Pages, วิธีเพิ่ม Module
├─ CLAUDE.md                      # หลักการในส่วนที่ 2 + Business Rules สรุป สำหรับรอบถัดไป
│
├─ core/
│  ├─ loader.js                   # โหลด core/ และ data/ ตามลำดับ แล้วโหลด JS ของ Module ที่ระบุ
│  ├─ registry.js                 # รายชื่อ Module: id, ชื่อ, path ไปยัง index.html, ลำดับใน Tour, แสดงในเมนูหรือไม่
│  ├─ layout.js                   # สร้าง Header, เมนู, Stepper, ปุ่มก่อนหน้า/ถัดไป, ปุ่มรีเซ็ตข้อมูล
│  ├─ store.js                    # get / set / reset (เก็บใน sessionStorage ถ้าใช้ไม่ได้ให้ใช้ค่าตั้งต้น)
│  ├─ calc.js                     # สูตรทั้งหมด (pure functions ไม่แตะ DOM)
│  ├─ format.js                   # จัดรูปแบบตัวเลข
│  ├─ components.js               # UI ที่ใช้ซ้ำ
│  └─ paths.js                    # หา Root ของเว็บจาก src ของ loader.js เพื่อสร้างลิงก์ relative ที่ถูกทั้งบนเครื่องและ GitHub Pages
│
├─ data/                          # ข้อมูลตัวอย่าง (กำหนดค่าใส่ SP.data เท่านั้น ไม่มี Logic)
│  ├─ settings.js                 # VAT, PRICE_INCLUDES_VAT, NPD_MONTHS, FROZEN_MONTHS ฯลฯ
│  ├─ channels.js                 # Channel และ Sub-channel
│  ├─ products.js                 # SKU, วันขายวันแรก, Listing ต่อ Sub-channel, Clearance
│  ├─ pricing.js                  # Price List, GP ต่อ Account, Promotion
│  ├─ targets.js                  # Total Target และ % แบ่งตั้งต้น
│  ├─ history.js                  # ยอดย้อนหลังสำหรับ Seasonality และ Run-rate
│  └─ content.js                  # ข้อความอธิบายทุกหน้า, Decision log, คำถามที่ค้าง (ผมแก้ได้โดยไม่แตะ HTML)
│
├─ styles/
│  ├─ tokens.css                  # CSS Variables: สี, ฟอนต์, ระยะห่าง
│  ├─ base.css                    # Layout, Typography
│  ├─ components.css              # สไตล์ของ UI ใน core/components.js
│  └─ print.css
│
├─ modules/
│  ├─ _template/                  # โครงตั้งต้นสำหรับ Module ใหม่ (ไม่แสดงในเมนู)
│  ├─ master-data/                # ใครดูแลข้อมูลอะไร
│  ├─ top-down/                   # Allocation Tree
│  ├─ phasing/                    # Monthly Phasing
│  ├─ sku-status/                 # Status สินค้า vs วิธีเติมยอด + ตัวอย่าง SKU A
│  ├─ sku-planning/               # SKU Grid
│  ├─ measure-chain/              # จำนวนชิ้น → Net Sales
│  ├─ approval/                   # อนุมัติ ล็อกเป้า Forecast
│  └─ summary/                    # สรุปและสิ่งที่ขออนุมัติ
│
└─ tests/
   └─ calc.test.html              # ดับเบิลคลิกเปิดแล้วรัน Test ของ calc.js แสดงผ่าน/ไม่ผ่านบนหน้าจอ
```

**โครงของ `index.html` ในแต่ละ Module** มีแค่ `<head>` (ลิงก์ CSS กลาง), `<main id="module-root">` และ Script บรรทัดเดียว:

```html
<script src="../../core/loader.js" data-module="top-down.js"></script>
```

`loader.js` หา Root จาก `src` ของตัวเอง โหลดไฟล์ใน `core/` และ `data/` ตามลำดับ (สร้าง `<script>` แบบ `async = false` เพื่อรักษาลำดับ) แล้วโหลด JS ของ Module ที่ระบุใน `data-module` จากนั้นเรียก `layout.js` สร้าง Header/เมนู/ปุ่มนำทาง หน้า `index.html` ที่ root ใช้ `core/loader.js` แบบเดียวกัน

**`store.js`** กำหนด Key เป็นชื่อเต็ม เช่น `topDown.allocation`, `skuPlan.<subChannelId>` และมี Default จาก `data/` เมื่อยังไม่มีค่า ปุ่มรีเซ็ตใน Header ล้างทุก Key ออกแบบ Interface ให้เปลี่ยนไปใช้ Backend ได้ภายหลังโดยไม่ต้องแก้ Module

ข้อจำกัดเมื่อเปิดจากไฟล์ในเครื่อง: Chrome/Edge ส่งค่าข้ามหน้าผ่าน sessionStorage ได้ แต่บางเบราว์เซอร์ (เช่น Firefox) มองแต่ละไฟล์เป็นคนละ Origin ทำให้ส่งข้ามหน้าไม่ได้ ให้ `store.js` ตรวจว่าใช้ได้หรือไม่ ถ้าไม่ได้ใช้ค่าตั้งต้นและแสดงข้อความเล็กๆ ใน Header ว่า "ค่าที่แก้จะไม่ส่งต่อข้ามหน้าในเบราว์เซอร์นี้" (บน GitHub Pages ใช้ได้ทุกเบราว์เซอร์)

---

## 4. รูปแบบการนำเสนอ

- **โหมด Tour**: Stepper ด้านบนเรียงตาม registry ปุ่มก่อนหน้า/ถัดไปพาไปหน้า Module ถัดไป ใช้ลูกศรซ้ายขวาบนคีย์บอร์ดได้
- **โหมดเมนู**: เข้า Module ใดก็ได้โดยตรงจากเมนู
- ทุก Module ใช้โครงหน้าเดียวกัน: หัวข้อ → คำอธิบาย 2–3 บรรทัด → ภาพหรือตัวอย่างที่กดลองได้ → กล่อง "สิ่งที่ต้องการให้อนุมัติ" (ถ้ามี)
- ภาษาไทย ใช้คำศัพท์ธุรกิจภาษาอังกฤษตามที่ทีมใช้ (Target, Sell-in, Sell-out, Net Sales, GP, SKU, Sub-channel)
- ดีไซน์เรียบ ตัวอักษรใหญ่พอสำหรับฉายบนจอประชุม
- สีบอกความหมายชุดเดียวทั้งเว็บ (กำหนดใน `tokens.css`):
  - Source ของช่อง SKU: ล็อก 0 = เทา, กรอกเอง = ฟ้า, ระบบเติม = เขียว, Clearance = ส้ม
  - Alert: ครบ = เขียว, ยังจัดสรรไม่ครบ = เหลือง, เกินเป้า = แดง

---

## 5. เนื้อหาแต่ละหน้า

| ลำดับ | หน้า | เนื้อหา | อ่าน store | เขียน store |
|---|---|---|---|---|
| 0 | `index.html` | ปัญหาของ Excel ปัจจุบัน (ข้อความจาก `content.js`) + Diagram Top-down (Net Sales) และ Bottom-up (จำนวนชิ้น) มาเจอกันที่ Remaining + ปุ่มเริ่ม Tour | – | – |
| 1 | `master-data` | ตารางข้อมูลและเจ้าของ: Status/วันเปิดตัว/Listing/Price List = ทีม Product (Product Master), Clearance = Supply Chain, GP = Sales/KAM + Finance, Promotion = Sales/Trade Marketing | – | – |
| 2 | `top-down` | Tree: Total → Channel → Sub-channel กรอก % ต่อโหนด Remaining และ Alert อัปเดตทันที | – | `topDown.allocation` |
| 3 | `phasing` | เลือก Sub-channel แสดงกราฟแท่ง 12 เดือน (SVG หรือ CSS) ยอดต่อเดือน = เป้าของ Sub-channel × สัดส่วน Seasonality แก้สัดส่วนได้ | `topDown.allocation` | `phasing.<subChannelId>` |
| 4 | `sku-status` | อธิบาย Status ระดับ SKU (NPD = 3 เดือนนับจากวันขายวันแรก, Clearance มาก่อนเสมอ) แยกจากวิธีเติมยอดระดับ SKU × Sub-channel + ตาราง SKU A ขายวันแรก เม.ย. กับ Shopee (Listing เม.ย.), Watsons (พ.ค.), TT Distributor (ธ.ค.) + ข้อสรุปว่า SKU ใหม่ต้องกรอกเองทั้งปีในแผนรายปี | – | – |
| 5 | `sku-planning` | Grid ~6 SKU × 12 เดือน สีตาม Source, Badge Status, แถวบน = Target (จาก phasing), ผลรวม Plan, Remaining + Alert ช่องฟ้าแก้ได้ ปุ่มสลับมุมมอง จำนวนชิ้น / Sell-out Amount / Net Sales | `phasing.<id>` | `skuPlan.<id>` |
| 6 | `measure-chain` | เครื่องคิดเลข: จำนวนชิ้น, ราคา, GP% → แสดงทุกขั้นพร้อมสูตร และฝั่งกลับด้าน Net Sales → Sell-out Amount ค่าเริ่มต้น 100 ชิ้น × 50 บาท GP 45% | – | – |
| 7 | `approval` | Timeline: Draft → Submitted → Director อนุมัติ → Baseline ล็อกทั้งปี (Snapshot ราคาและ GP) → Forecast (M+1 ถึง M+3 ล็อก ปรับได้ตั้งแต่ M+4, Exception ผ่าน Director) + ภาพ 12 เดือนแสดงเดือนที่ผ่านไป/ล็อก/ปรับได้ | – | – |
| 8 | `summary` | ขอบเขต, สิ่งที่ตัดออกโดยตั้งใจ, Decision log, คำถามที่ค้าง (ส่วนที่ 7), ขั้นต่อไปหลังอนุมัติ และสรุปตัวเลขจากที่ผู้ชมลองแก้ใน Tour | ทั้งหมด (อ่านอย่างเดียว) | – |

---

## 6. สูตร (`core/calc.js`)

ใช้ `PRICE_INCLUDES_VAT` (ค่าเริ่มต้น `false`) และ `VAT = 0.07` จาก `data/settings.js`

```
Sell-out Amount ก่อน VAT = จำนวนชิ้น × ราคา                (ถ้าราคารวม VAT ให้ ÷ 1.07)
Net Sales                = Sell-out Amount ก่อน VAT × (1 − GP)
Sell-out Amount รวม VAT  = Sell-out Amount ก่อน VAT × 1.07   (แสดงผล)

กลับด้าน: Sell-out Amount ก่อน VAT = Net Sales ÷ (1 − GP)

Remaining = เป้าชั้นบน − ผลรวมที่แบ่งแล้ว (บาทและ %)
Alert: 0 (±1 บาท) = ครบ | > 0 = ยังจัดสรรไม่ครบ | < 0 = เกินเป้า

Effective Price เดือนที่มี Promo บางวัน = ราคาเฉลี่ยถ่วงตามจำนวนวัน
Clearance = Stock ÷ จำนวนเดือน (ปัดเศษให้ผลรวมเท่า Stock)
ระบบเติม = Run-rate × Seasonality Index ของเดือนนั้น
Seasonality Index = ยอดเดือนนั้น ÷ ค่าเฉลี่ยรายเดือนของ 12 เดือนย้อนหลัง
```

Test ใน `tests/calc.test.html`:
1. 100 ชิ้น × 50, GP 45% → ก่อน VAT 5,000 / Net Sales 2,750 / รวม VAT 5,350
2. Net Sales 100, GP 45% → ก่อน VAT 181.82 / รวม VAT 194.55
3. Clearance 1,000 ชิ้น 3 เดือน → 333 / 333 / 334
4. Promo 10 จาก 30 วัน ราคาปกติ 100 Promo 70 → 90
5. Remaining: เป้า 10,000 แบ่งแล้ว 9,500 → 500 (5%) ยังจัดสรรไม่ครบ / แบ่งแล้ว 10,300 → −300 เกินเป้า
6. Seasonality Index ของ 12 เดือนรวมกันเฉลี่ยเท่ากับ 1.0

---

## 7. ข้อมูลตัวอย่างและคำถามที่ค้าง

ข้อมูลตัวอย่าง (ใน `data/`):
- ใช้ชื่อ SKU สมมติ (SKU A, SKU B, …) Sub-channel ใช้ชื่อจริงได้ (7-Eleven, Watsons, Shopee, Tiktok, Lazada, Distributor ภาคเหนือ ฯลฯ)
- % แบ่งตั้งต้นใน Top-down ต้องทำให้มีโหนดที่ครบ ขาด และเกิน อย่างน้อยอย่างละ 1 เพื่อให้เห็น Alert ครบ
- SKU ใน Grid อย่างน้อย: 2 ตัว Existing (ระบบเติม), 1 ตัว NPD ขายวันแรก เม.ย. (ก่อน เม.ย. ล็อก 0 หลังจากนั้นกรอกเอง), 1 ตัว Clearance มี.ค.–พ.ค. Stock 1,000 ชิ้น, 1 ตัวที่ Listing ช่องทางนี้เดือน ธ.ค., 1 Promo ที่ครอบบางวันของเดือน

คำถามที่ค้าง (แสดงใน `summary` ข้อความเก็บใน `content.js`):
1. ราคาใน Price List รวม VAT หรือไม่ (ไฟล์ Excel เดิมคำนวณแบบรวม VAT)
2. TT มี GP หรือไม่
3. Export และ Chayamiss เป็น Channel หรือ Sub-channel
4. ระบบจริงใช้หลายคนพร้อมกัน ต้องมี Backend

---

## 8. สิ่งที่ห้ามทำ

- ห้ามใช้ Framework, Build tool, npm, ES Modules (`type="module"`, `import`, `export`) และ `fetch()` ไฟล์ในเครื่อง
- ห้ามทำ Import/Export, Login, ฐานข้อมูล และห้ามใช้ localStorage (ใช้ sessionStorage ผ่าน `store.js` เท่านั้น)
- ห้าม Module เรียกใช้โค้ดของ Module อื่น และห้ามสร้างตัวแปร Global นอกจาก `window.SP`
- ห้ามเขียน Header/เมนู/สูตร/การจัดรูปแบบตัวเลขซ้ำในหลายที่
- ห้ามใส่ Feature ที่ถูกตัดออก (Ramp-up NPD, Cannibalization, เกณฑ์ % Remaining ที่ Config ได้, แยก Core/Steady)

---

## 9. ลำดับการทำงาน

1. เสนอโครงไฟล์ รายชื่อ Module และข้อมูลตัวอย่าง ให้ผมยืนยัน
2. ทำ `core/`, `styles/`, `data/`, `tests/calc.test.html` และ `modules/_template/` ให้เสร็จและ Test ผ่านก่อน
3. ทำ Module ทีละตัวตามลำดับใน registry จบแต่ละตัวให้สรุปสั้นๆ
4. ทดสอบโดยดับเบิลคลิกเปิด `index.html` ใน Chrome แล้วกดผ่าน Tour ทุกหน้า และตรวจว่าลิงก์ทุกลิงก์เปิดหน้าได้ (ไม่ใช่หน้ารายชื่อไฟล์)
5. เขียน `README.md` (วิธีเปิดจากเครื่อง, Deploy GitHub Pages, **วิธีเพิ่ม Module ใหม่ทีละขั้น**) และ `CLAUDE.md`

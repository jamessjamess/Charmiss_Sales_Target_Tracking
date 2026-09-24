# Sales Target Planning — Concept Prototype

เว็บเล่าแนวคิดระบบตั้ง Sales Target เพื่อขออนุมัติจาก Management และ Sales Director ก่อนสร้างระบบจริง
เป็น HTML + CSS + JavaScript ล้วน ไม่มี Framework ไม่มี Build step ไม่ต้องติดตั้งอะไร

ข้อกำหนดทั้งหมดอยู่ที่ [PROMPT_concept-prototype.md](PROMPT_concept-prototype.md) และ Change Request [PROMPT_change_top-down-v2.md](PROMPT_change_top-down-v2.md), [PROMPT_change_phasing-v2.md](PROMPT_change_phasing-v2.md), [PROMPT_change_sku-v2.md](PROMPT_change_sku-v2.md), [PROMPT_change_approval-topdown-v3.md](PROMPT_change_approval-topdown-v3.md), [PROMPT_change_v4.md](PROMPT_change_v4.md), [PROMPT_change_v5_ux-review.md](PROMPT_change_v5_ux-review.md), [PROMPT_change_v6_product-master.md](PROMPT_change_v6_product-master.md), [PROMPT_change_v7_top-down.md](PROMPT_change_v7_top-down.md) และตั้งแต่ CR-10 ที่ [docs/change-requests/](docs/change-requests/)
(สรุปสเปก [docs/SPEC.md](docs/SPEC.md) · ข้อสรุป [docs/DECISIONS.md](docs/DECISIONS.md) · ประวัติการเปลี่ยนแปลง [docs/CHANGELOG.md](docs/CHANGELOG.md))

---

## เปิดจากเครื่อง

1. ดับเบิลคลิก `index.html` เว็บจะพาไปหน้าแรกของ Tour (ตอนนี้คือ Top-down ปี 2027)
2. แนะนำ **Chrome หรือ Edge** ตัวเลขที่ลองแก้ในหน้าหนึ่งจะส่งต่อไปหน้าถัดไป
3. ใน Firefox เปิดจากไฟล์ในเครื่องแล้วค่าที่แก้จะไม่ส่งต่อข้ามหน้า (Header จะขึ้นข้อความเตือน) ถ้าจะใช้ Firefox ให้เปิดจาก GitHub Pages แทน

ต้องต่ออินเทอร์เน็ตเพื่อโหลด Font และตัวสร้างไฟล์ Excel (SheetJS โหลดเมื่อกดส่งออก Excel ครั้งแรก) ถ้าไม่มีเน็ต หน้าเว็บยังอ่านได้ครบ
ใช้ Font ของเครื่อง และส่งออกเป็น CSV แทน Excel

### ระหว่างนำเสนอ

- **Side Menu** ซ้ายมี 4 กลุ่ม: Sales Planning (4 ขั้น: จัดสรรเป้าหมายประจำปี → จัดสรรเป้าหมายรายเดือน → วางแผนยอดขายราย SKU →
  รายงานสรุปแผน · ชี้ชื่อหน้าเพื่อดูคำเดิม Top-down / Phasing / Bottom-up) / Product Master /
  Account Master / ข้อมูลโครงการ (เกี่ยวกับ Prototype) ปุ่ม « ล่างเมนูพับเหลือไอคอน (ชี้ไอคอนเพื่อดูชื่อหน้าและสถานะ)
  หน้าวางแผนยอดขายราย SKU พับเมนูเองเมื่อจอกว้างน้อยกว่า 2200px (รวมจอ 1920px) / จอแคบเปิดเมนูด้วย ☰
- **ปีแผน** เลือกที่ตัวเลข `2027 ▾` ต่อท้ายชื่อหน้า (หน้าที่อิงปี: 4 ขั้นของ Sales Planning, แผน NPD, Promotion Price, Listing, ผู้รับผิดชอบ)
  ตัวเลือก 2026–2028 เปลี่ยนในหน้าใดมีผลทุกหน้า ข้อมูลแผนแยกตามปี เปลี่ยนปีแล้วค่าที่แก้ของปีเดิมยังอยู่ (ถ้ามีค่าที่ยังไม่บันทึกจะถามก่อน)
- **มุมมองผู้ใช้** (Header) จำลองว่าใครกำลังใช้: Management / Sales Director / ทีม Product / Supply Chain / Trade Marketing / Sales Person
  ปุ่มที่หัวหน้าเปลี่ยนตามบทบาท
  - บทบาทที่แก้ไขไม่ได้จะเห็น `อ่านอย่างเดียว · ผู้จัดทำคือ …` และปุ่ม **สลับเป็นมุมมองผู้จัดทำ** (กดแล้วแก้ไขได้ทันที)
  - จัดสรรเป้าหมายประจำปี (Top-down): Sales Director กด แก้ไข → ส่งอนุมัติ → สลับเป็น Management → อนุมัติ หรือ ส่งกลับแก้ไข (ต้องใส่เหตุผล)
  - จัดสรรเป้าหมายรายเดือน / วางแผนยอดขายราย SKU: ผู้รับผิดชอบของหน่วยขายนั้นจัดทำ → ส่ง → Sales Director อนุมัติ / แผน NPD: ทีม Product ส่ง → Sales Director อนุมัติ
  - ส่งไม่ได้ถ้ายังจัดสรรไม่ครบ (แผน SKU ต้องไม่ขาดเป้า) หรือขั้นบนยังไม่อนุมัติ ปุ่มจะบอกเหตุผล
  - ชื่อผู้จัดทำ / ผู้ส่ง / ผู้อนุมัติ อยู่ใน `ประวัติ ▾` ข้างป้ายสถานะ
- **ทุกหน้าเปิดมาเป็นโหมดดู** ต้องกด **แก้ไข** ก่อน แล้ว **บันทึก** หรือ **ยกเลิก** (ยกเลิกคืนค่าเดิม) ช่องที่ยังไม่บันทึกมีขอบหนา
- สีคงเหลือ: **จัดสรรครบ = เขียว / ขาด = แดง / เกิน = เหลือง / ยังไม่กำหนด = เทา** มีข้อความกำกับเสมอ
- หน้าจัดสรรเป้าหมายประจำปีและรายเดือน แก้ได้ทั้ง % และบาท ตัวเลขเปลี่ยนเมื่อกด **Enter** หรือออกจากช่อง (ตาราง Phasing และ SKU ใช้ลูกศร ← → เลื่อนเดือนได้)
- หน้าจัดสรรเป้าหมายประจำปี: 2 คอลัมน์สัดส่วน **% ของ Total** (แถว Channel กรอกที่นี่) และ **% ใน Channel** (แถวหน่วยขายกรอกที่นี่) /
  คอลัมน์ **เป้าหมายเทียบปีก่อน**: ทุกแถวใช้สเกลเดียวกันตั้งแต่ 0 (แกนอยู่ใต้ชื่อคอลัมน์) ความยาวแท่ง = เป้าหมาย ขีดดำ = ยอดขายปีก่อน
  แท่งยาวเลยขีด = เติบโต (ในรายงานสรุปแผนใช้แบบเดียวกัน) /
  กราฟที่มาของการเติบโตอยู่ในรายงานสรุปแผน / โหมดแก้ไข: `กระจายตามสัดส่วนปัจจุบัน`
  (ต้องกดเอง) · ถังขยะ = นำออกจากแผน · `+ Account` / `+ เขตการขาย` / `+ Platform` · `+ เพิ่ม Channel` เลือก Export เพื่อเดโม Channel ใหม่
  / เปิดใช้งาน `LINE Shop` ที่หน้า Account แล้วกลับมากด `+ Platform` ใน ECOM ได้
- **ส่งออก ▾** (หน้าจัดสรรเป้าหมายประจำปี, รายเดือน, วางแผนยอดขายราย SKU): Excel (.xlsx) หรือ CSV ตัวเลขเป็นตัวเลขจริง คำนวณต่อใน Excel ได้
  (ถ้ามีค่าที่ยังไม่บันทึก ระบบถามว่าจะส่งออกชุดไหน)
- หน้า **วางแผนยอดขายราย SKU** (สินค้าจริงของบริษัท: 7-Eleven 11 SKU + สินค้าใหม่ 2027 · EVEANDBOY 73 SKU):
  แถว 1 = Channel · หน่วยขาย · ผู้รับผิดชอบ · ตัวเลขหลัก / แถว 2 = ค้นหา · จัดกลุ่ม (Series | Status | ไม่จัดกลุ่ม + พับ/กางทั้งหมด) · Series ·
  เรียง · มุมมอง · ⓘ · ☐ แสดงยอดปีก่อน · โหมด · ? (สัญลักษณ์ กฎ และคีย์ลัด)
  - ค่าตั้งต้น = **ยอดขายเดือนเดียวกันปีก่อน × การเติบโตของหน่วยขาย** (7-Eleven: 14,925 ชิ้น × 1.1182 = 16,689) ชี้ช่องเพื่อดูที่มาและยอดปีก่อน
    / EVEANDBOY ขาดราว 21% เพราะสินค้าเลิกขาย 41 SKU และ 5 SKU ยังไม่มี Series (แถวข้อความท้ายตารางบอกยอดขายปีก่อนของกลุ่มนี้)
  - โหมดแก้ไข: `ค่าตั้งต้น ▾` เปลี่ยนเป็น Run-rate × Seasonality ได้ · Checkbox เลือกแถว / ทั้ง Series → `ปรับ ±%` · `ตั้งเท่ายอดปีก่อน` · `คืนค่าตั้งต้น` ·
    `ล้างค่า` · ⋯ ของแถว · พิมพ์ยอดในช่อง `ทั้งปี` แล้วระบบกระจายให้ · `ปิดส่วนต่าง` ที่แถวคงเหลือ (หรือกดช่องคงเหลือของเดือน) เลือกเดือนและ SKU
    ดูก่อน/หลังแล้วกดยืนยัน · คัดลอก/วางกับ Excel (Ctrl+C / Ctrl+V) · Enter ลงล่าง · Tab ไปขวา · Shift+ลูกศรเลือกช่วง · Delete · Ctrl+D / Ctrl+R · Ctrl+Z ย้อนกลับ
    · ▲/▼ เมื่อต่างจากเดือนเดียวกันปีก่อนเกิน 50% / ช่องที่ล็อกไม่ถูกแก้โดยเครื่องมือใดๆ
  - `+ เพิ่ม SKU` ที่หัวคอลัมน์ SKU (สินค้าที่ขาดข้อมูลจำเป็นเลือกไม่ได้ พร้อมเหตุผล) และ `+ เพิ่มสินค้าใหม่` ในกลุ่มสินค้าใหม่ / ชี้ชื่อ SKU เพื่อดูชื่อเต็ม
    หมวดสินค้า Series RSP และราคาเฉพาะ Account (Juicy Pop Tint 02/05 ที่ 7-Eleven 149 บาท) / โหมดปรับแผนใช้ได้หลังล็อก Baseline
    (ถ้าราคาเปลี่ยนหลังล็อกจะมีป้าย `ราคาเปลี่ยนจาก Baseline n เดือน`)
- **รายงานสรุปแผน** (ขั้นที่ 4 มี 2 แท็บ — CR-12):
  - **ติดตามสถานะ** (ค่าเริ่มต้นก่อนล็อก Baseline ไม่ใช่เอกสารสำหรับพิมพ์): สถานะทั้งปี · ปุ่ม **ล็อก Baseline** (Sales Director เมื่อแผน SKU ทุกหน่วยขายอนุมัติแล้ว)
    / **ปลดล็อก Baseline** (ต้องมีเหตุผล) · ตารางรายการที่ต้องดำเนินการ 1 แถวต่อหน่วยขาย เรียงตามความรุนแรง พร้อมลิงก์การดำเนินการถัดไป ·
    ตัวกรอง Channel · ผู้รับผิดชอบ · เฉพาะที่มีส่วนต่าง / ตัวเลขในเมนูข้างของขั้นที่ 4 = จำนวนรายการ
  - **รายงานสรุปแผน** (ค่าเริ่มต้นหลังล็อก พิมพ์ / บันทึก PDF A4 แนวนอนได้ 4 หน้า): หัวรายงานพร้อมเลขฉบับ `2027-BL-01` (ฉบับร่าง = `2027-DRAFT` + ลายน้ำ) ·
    KPI · เป้าหมายเทียบแผนรายเดือน : ที่มาของการเติบโต (60 : 40) · ตาราง Channel → หน่วยขาย (% ของ Total, สถานะอนุมัติ 2 ไอคอน) ·
    สัดส่วนตาม Status และ Series / Category · เป้าหมายรายผู้รับผิดชอบ · การอนุมัติ · ช่องลงนาม / หลังล็อกตัวเลขทั้งหมดมาจาก Baseline ที่ล็อกไว้
- **เกี่ยวกับ Prototype** (เมนูล่างสุดหรือลิงก์ที่ Header): ขอบเขต · Decision log · คำถามที่ค้าง · ขั้นต่อไป และสิ่งที่ขออนุมัติ
- หน้า **ผู้รับผิดชอบ**: บันทึกการลาออก แล้วคลิกเดือนแรก–เดือนสุดท้ายใน Timeline เพื่อโอนหน่วยขายให้คนใหม่
  ตัวเลขเป้าไม่เปลี่ยน ตารางผลงานรายบุคคลแยกยอดตามเดือนที่แต่ละคนรับผิดชอบ
- **Product Master** 5 หน้า (สลับบทบาทเป็นเจ้าของข้อมูลก่อนแก้ไข):
  - **รายการสินค้า** (ทีม Product): KPI กดกรองได้ · รายการ/จัดกลุ่ม · เลือกคอลัมน์ · ส่งออก CSV · เปรียบเทียบกับ ERP / คลิกแถว = Drawer
    ข้อมูลทั่วไป · ราคา · Listing และวงจรสินค้า · ประวัติการแก้ไข / `+ เพิ่ม SKU` ใช้รหัสชั่วคราวได้ แล้ว `ผูกรหัสจริง` ภายหลัง (ย้ายแผน SKU ให้ด้วย)
  - **แผน NPD** (ทีม Product → Sales Director อนุมัติ): Timeline | ตาราง / อนุมัติแล้วสินค้าได้วันเริ่มขายและ Listing และเข้าแผน SKU ของหน่วยที่วางแผน
  - **Promotion Price** (Trade Marketing): ปฏิทินราคาเฉลี่ยรายเดือน / โหมดแก้ไขคลิกช่องเพื่อสร้าง Promotion (ห้ามซ้อนกัน) / ฉบับร่างไม่นับในแผน
  - **Listing และวันเริ่มขาย**: ทีม Product ติ๊ก Listing (เลือกทั้งแถว / ทั้งคอลัมน์) · Supply Chain แก้ Clearance
  - **หมวดสินค้าและ Series**: รายการ Category / Sub Category / Type และ Series / Sub Series ที่ฟอร์มสินค้าเลือกได้
- หน้า Master ทุกหน้าลบรายการด้วยถังขยะ (ลบได้เฉพาะรายการที่ยังไม่ถูกใช้ นอกนั้นให้ปิดใช้งาน)
- ปุ่มลูกศร **← →** บนคีย์บอร์ดเปลี่ยนหน้าใน Sales Planning ได้ (ยกเว้นตอนพิมพ์อยู่ในช่องกรอก)
- **รีเซ็ตข้อมูล** ล้างค่าที่ลองแก้ทั้งหมดรวมสถานะอนุมัติ กลับไปใช้ข้อมูลตัวอย่าง (ค่าที่แก้หายเองเมื่อปิดแท็บ)
- **พิมพ์หรือบันทึก PDF** ด้วย Ctrl+P ได้ทุกหน้า เมนูและปุ่มจะถูกซ่อน

### Test สูตรคำนวณ

ดับเบิลคลิก `tests/calc.test.html` หน้าจอจะแสดงผลผ่าน/ไม่ผ่านของทุก Test

---

## Deploy บน GitHub Pages

1. สร้าง Repository ใหม่บน GitHub (Public หรือ Private ที่มี GitHub Pages)
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น Branch `main` รวมไฟล์ `.nojekyll` ด้วย
   (ถ้าไม่มี `.nojekyll` GitHub จะข้ามโฟลเดอร์ที่ขึ้นต้นด้วย `_` เช่น `modules/_template/`)
3. ไปที่ **Settings → Pages**
4. ที่ **Build and deployment** เลือก Source = **Deploy from a branch**, Branch = **main**, Folder = **/ (root)** แล้วกด Save
5. รอ 1–2 นาที GitHub จะแสดงลิงก์ เช่น `https://<ชื่อบัญชี>.github.io/<ชื่อ-repo>/`

ลิงก์ทั้งหมดในเว็บเป็นแบบ Relative จึงใช้ได้ทั้งบนเครื่องและบน GitHub Pages โดยไม่ต้องแก้อะไร

---

## แก้ข้อความหรือข้อมูลตัวอย่าง

| ต้องการแก้ | ไฟล์ |
|---|---|
| ข้อความทุกหน้า, Decision log, คำถามที่ค้าง (หน้าเกี่ยวกับ Prototype) | `data/content.js` |
| VAT, ราคารวม VAT หรือไม่, จำนวนเดือน New, เดือนที่ล็อก Forecast, ฟิลด์จำเป็น/ที่ควรมีของสินค้า, ขนาดรูป | `data/settings.js` |
| ปีที่เลือกได้และปีตั้งต้น | `data/settings.js` (`PLAN_YEARS`, `DEFAULT_PLAN_YEAR`) |
| Channel Master (หน่วยแบ่งเป้า, ชื่อเรียกหน่วยขาย `unitLabel` และ GP `gpLabel`, มี GP หรือไม่, สี) | `data/channels.js` |
| Account Master (Account / Platform และ GP หรือค่าธรรมเนียมที่มีผล) | `data/accounts.js` |
| เขตการขายของ TT | `data/territories.js` |
| Sales Person (เริ่มงาน/ลาออก) | `data/salespeople.js` |
| ผู้รับผิดชอบแต่ละหน่วยตามช่วงเดือน | `data/assignments.js` |
| **สินค้าจริงจาก Excel** (รหัส, ชื่อ, ชื่อย่อ, Series, RSP, ราคา Dealer, วันเริ่มขาย/เลิกขาย, Listing ของ 7-Eleven / EVEANDBOY, ราคาเฉพาะ Account, ยอดขายปี 2026 ราย SKU) — **ห้ามแก้ด้วยมือ** สร้างใหม่จาก `Sales_Planning_2026_R2.xlsx` | `data/seed/seed-charmiss.js` |
| กฎนำเข้าสินค้า (หมวดสินค้าจากคำในชื่อ, Campaign ที่ไม่ใช่ Series) และสินค้าใหม่ปี 2027 (รหัสชั่วคราว) | `data/products.js` |
| หมวดสินค้า (Series สร้างจาก Excel) | `data/taxonomy.js` |
| Listing ของหน่วยขายอื่น (ตัดประเภทสินค้า / Series จากรายการต้นแบบ) | `data/listings.js` |
| ยอดขายจริงสมมติของปี 2027 (ใช้ในโหมดปรับแผน) | `data/actuals.js` |
| ราคาที่เปลี่ยนในปีแผน และ Channel ที่ใช้ราคา Dealer (ราคาตั้งต้นมาจาก Excel) | `data/pricing.js` |
| Promotion Price | `data/promotions.js` |
| แผน NPD | `data/npd.js` |
| ความต่างตัวอย่างของข้อมูล ERP (เปรียบเทียบกับ ERP) | `data/erp-snapshot.js` |
| Total Target, Channel และ % แบ่งตั้งต้น, หน่วยในแผนตั้งต้นต่อปี | `data/targets.js` |
| ยอดย้อนหลังรายเดือนต่อหน่วยขาย ปี 2025–2026 (+ จำนวนเดือนที่เป็นยอดจริง) / ยอดราย SKU และ Run-rate คำนวณตอนโหลด | `data/history.js` |
| จำนวนชิ้นที่กำหนดเองในแผน SKU ตั้งต้น (ให้ตัวอย่างมีขาด เกิน และจัดสรรครบ) | `data/plan-seeds.js` |
| ค่าตั้งต้นของแผน SKU (วิธีเติมยอด, จัดกลุ่มตาม Series เมื่อเกินกี่ SKU, เกณฑ์ ▲/▼, จำนวนครั้งที่ย้อนกลับได้) | `data/settings.js` |
| สี ฟอนต์ ขนาด | `styles/tokens.css` |

ห้ามพิมพ์ตัวเลขที่เป็นผลคำนวณลงในข้อความ ทุกตัวเลขคำนวณจาก `core/calc.js`

---

## โครงสร้างไฟล์

```
index.html            พาไปหน้าแรกของ Sales Planning (ตามลำดับ Tour ใน core/registry.js)
core/                 ส่วนกลาง: loader, registry, layout, store, calc, seed (นำเข้าข้อมูลจริง), workflow, format, components, charts, export,
                      report (ข้อมูลขั้นที่ 4 ใช้ร่วมกับ Side Menu), paths
data/                 ข้อมูลตัวอย่าง กฎนำเข้า และข้อความ (ไม่มี Logic)
data/seed/            ข้อมูลจริงที่สร้างจาก Excel (ห้ามแก้ด้วยมือ)
docs/                 SPEC.md · DECISIONS.md · CHANGELOG.md · change-requests/ (CR-10 เป็นต้นไป)
styles/               app.css (ไฟล์เดียวที่ทุกหน้าลิงก์) → tokens, base, components, print
modules/<ชื่อ>/        1 Module = 1 โฟลเดอร์: index.html + <ชื่อ>.js (+ <ชื่อ>.css ถ้าจำเป็น)
modules/_template/    โครงตั้งต้นสำหรับ Module ใหม่
tests/                Test ของสูตร
```

ทุกหน้ามีแค่ `<link>` ไปที่ `styles/app.css`, `<main id="module-root">` และ Script บรรทัดเดียว:

```html
<script src="../../core/loader.js" data-module="top-down.js"></script>
```

`loader.js` โหลดไฟล์ใน `core/` และ `data/` ตามลำดับ แล้วโหลด JS ของ Module จากนั้น `layout.js` สร้าง Header (ชื่อระบบ + ป้าย Prototype, ปีแผน, มุมมองผู้ใช้, เกี่ยวกับ Prototype, รีเซ็ต), Side Menu, แถบก่อนหน้า/ถัดไป, หัวข้อ และคำอธิบายให้เอง (Module ใส่ `workflowBar` ในแถวหัวข้อผ่าน `ctx.intro`)

---

## เพิ่ม Module ใหม่ทีละขั้น

ตัวอย่าง: เพิ่มหน้า "ตรวจราคา" id = `priceCheck` โฟลเดอร์ = `price-check`

1. **คัดลอกโฟลเดอร์** `modules/_template/` เป็น `modules/price-check/`
2. **เปลี่ยนชื่อไฟล์** `modules/price-check/template.js` เป็น `price-check.js`
3. **แก้ `modules/price-check/index.html`** บรรทัด Script ให้ชี้ไฟล์ใหม่:
   ```html
   <script src="../../core/loader.js" data-module="price-check.js"></script>
   ```
4. **แก้ `price-check.js`**
   - บรรทัดสุดท้าย `SP.modules.template = ...` เป็น `SP.modules.priceCheck = { render: render };`
   - แก้ Comment หัวไฟล์: หน้าที่, ข้อมูลที่อ่านจาก `data/`, Key ที่อ่าน/เขียนใน store
   - เขียนเนื้อหาใน `render(root, ctx)`
5. **เพิ่ม 1 บรรทัดใน `core/registry.js`** ตรงตำแหน่งที่ต้องการใน Tour:
   ```js
   { id: 'priceCheck', title: 'ตรวจราคา', short: 'ตรวจราคา', icon: 'P', path: 'modules/price-check/index.html', group: 'product-master', tour: null, visible: true },
   ```
   แล้วเลื่อนเลข `tour` ของหน้าหลังจากนั้นขึ้นทีละ 1 (หรือใส่ `tour: null` ถ้าไม่ให้อยู่ใน Tour)
   `group` = กลุ่มใน Side Menu (`sales-planning` | `product-master` | `account-master` | `project-info`) / `short` = ชื่อในเมนู (บรรทัดเดียว) / `icon` = ตัวอักษรตอนพับเมนู
   ถ้าเป็นขั้นใน Sales Planning ใส่ `group: 'sales-planning'` และเลข `tour` (เลขขั้นและปุ่มก่อนหน้า/ถัดไปนับใหม่เอง) / `visible: false` = ซ่อนจากเมนู
6. **เพิ่มข้อความหน้าใน `data/content.js`** ใต้ `pages`:
   ```js
   priceCheck: {
     title: 'ตรวจราคา',
     lead: ['คำอธิบาย 1 บรรทัด ว่าหน้านี้ทำอะไร'],   // วิธีใช้ปุ่มให้อยู่ใน Tooltip หรือแผง ?
     approve: ['สิ่งที่ต้องการให้อนุมัติ']      // ไม่มีก็ลบออก
   }
   ```
7. ถ้าต้องมี CSS เฉพาะหน้า สร้าง `modules/price-check/price-check.css` แล้วเพิ่ม `<link>` ใน `index.html` ต่อจาก `app.css` (ใช้สีจาก `var(--...)` ใน `tokens.css` เท่านั้น)
8. ดับเบิลคลิก `index.html` แล้วตรวจว่าหน้าใหม่อยู่ใน Side Menu (และปุ่มก่อนหน้า/ถัดไปถ้าเป็นขั้นใน Sales Planning)

**ซ่อน Module ชั่วคราว** = ตั้ง `visible: false` ใน `core/registry.js` (ไฟล์ยังอยู่ เปิดกลับได้) ตอนนี้ไม่มีหน้าที่ซ่อนอยู่

**ถอด Module** = ลบบรรทัดใน `core/registry.js` (จะลบโฟลเดอร์ด้วยก็ได้) หน้าอื่นไม่ได้รับผลกระทบ

### กติกาของ Module

- ใช้ได้เฉพาะ `SP.core.*` และ `SP.data.*` ห้ามเรียกโค้ดของ Module อื่น
- ส่งข้อมูลข้ามหน้าผ่าน `SP.core.store` เท่านั้น ข้อมูลแผนใช้ Key ตามปี: `SP.core.store.planKey('priceCheck')` → `plan.<ปี>.priceCheck`
- สูตรใหม่ให้เพิ่มใน `core/calc.js` พร้อม Test ใน `tests/calc.test.js` / กฎการอนุมัติอยู่ที่ `core/workflow.js` (Module เรียกผ่าน `components.workflowBar`)
- ส่ง `SP.core.store.data()` ให้ calc แทน `SP.data` เพื่อให้ค่าที่แก้ในหน้า Master มีผล
- ห้าม Hardcode ชื่อหรือจำนวน Channel อ่านจาก `SP.data.channels` และ Channel ในแผนของปี
- จัดรูปแบบตัวเลขด้วย `SP.core.format` และใช้ UI จาก `SP.core.components`
- ห้ามสร้างตัวแปร Global อื่นนอกจาก `window.SP` (ห่อไฟล์ด้วย IIFE เหมือน Template)

### Key ใน store ที่มีอยู่

| Key | ค่า | เขียนโดย |
|---|---|---|
| `app.planYear` | ปีแผนที่เลือก | ตัวเลือกปีต่อท้ายชื่อหน้า (`components.planYearPicker`) |
| `plan.<ปี>.topDown` | `{ total, channels: [channelId], pct: { <channelId/unitId>: สัดส่วน }, units: { <channelId>: [unitId] } }` | top-down |
| `plan.<ปี>.phasing.<unitId>` | `{ monthPct: [12 สัดส่วน], edited }` | phasing |
| `plan.<ปี>.sku.<unitId>` | `{ method, items: { <productKey>: { startMonth, qty, overrides, stopped } } }` แผนครั้งแรก (`method` = วิธีเติมยอด `lastYear` / `runRate`) | sku-planning, products (ผูกรหัสจริง) |
| `plan.<ปี>.forecast.<unitId>` | โครงเดียวกัน แผนโหมดปรับแผน (ไม่เขียนทับแผนครั้งแรก) | sku-planning |
| `plan.<ปี>.workflow.<step>.<unitId\|all>` | `{ status, history, snapshot }` สถานะอนุมัติ (topDown, phasing, sku, forecast, baseline — snapshot ของ baseline = GP + ราคา + Promotion + ตัวเลขทั้งหมดของรายงานตอนล็อก) | workflowBar, summary (ล็อก / ปลดล็อก Baseline), npd-plan (ต้องตรวจสอบใหม่) |
| `plan.<ปี>.baselineVersions` | `[{ no, code, at, by }]` ประวัติเลขฉบับของรายงาน (`{ปี}-BL-{nn}`) | summary |
| `master.products` / `master.listings` | สินค้าและ Listing (ไม่แยกปี) | products, product-master, npd-plan |
| `master.taxonomy` | หมวดสินค้าและ Series | taxonomy |
| `master.priceList` / `master.promotions` | ราคาตามวันที่มีผล / Promotion Price | products, promotions |
| `master.npdPlans` | แผน NPD (มี workflow ของตัวเองในแต่ละแผน) | npd-plan |
| `master.audit` | ประวัติการแก้ไขข้อมูลสินค้า | ทุกหน้า Product Master |
| `master.accounts` / `master.territories` | Account (GP) และเขตการขาย | accounts, territories |
| `master.salespeople` / `master.assignments` | Sales Person และผู้รับผิดชอบตามช่วงเดือน | salespeople (หน้าผู้รับผิดชอบ) |
| `ui.selection` | `{ channel, unit }` ของตัวเลือก Channel / Account หรือเขต (หน้า Phasing และ SKU ใช้ร่วมกัน) | phasing, sku-planning, summary |
| `ui.planMode` / `ui.currentMonth` | โหมดแผน และเดือนปัจจุบันจำลอง (ใช้กับผู้รับผิดชอบและ Performance ด้วย) | sku-planning, salespeople |
| `ui.role` | บทบาทจำลอง `{ type, personId }` | Header (layout.js), ปุ่มสลับมุมมองใน workflowBar |
| `ui.sidebarCollapsed` | Side Menu พับอยู่หรือไม่ | layout.js |
| `ui.seriesFilter` | Series / Sub Series ที่เลือก (หน้า SKU และ Product Master ใช้ร่วมกัน) | sku-planning, products, product-master, promotions |
| `ui.productColumns` | คอลัมน์เพิ่มเติมของหน้ารายการสินค้า | products |
| `ui.skuShowLastYear` | หน้าวางแผน SKU แสดงยอดปีก่อน (บรรทัดเล็กใต้ตัวเลข + คอลัมน์ปีก่อน / การเติบโต) | sku-planning |
| `ui.summaryTab` | แท็บล่าสุดของขั้นที่ 4 `status` / `report` (ไม่มี = ตามสถานะ Baseline) | summary |
| `ui.productMaster.channel` / `ui.masterChannel` | Channel ที่เลือกในหน้า Listing และ Promotion Price / Account | product-master, promotions, accounts |

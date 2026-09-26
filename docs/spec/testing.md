# การทดสอบ

## Test อัตโนมัติ

- `node tests/run.js` ทุกชุด (ไม่ต้องติดตั้ง package) · `node tests/run.js <ชุด>` = `calc` · `taxonomy` · `stores` · `features` · `l12m` (CR-24) · `permissions` · `targets` (CR-23)
  - โหลดไฟล์ตาม `FILES` ของ `core/loader.js` ใน Node vm
  - Test ที่ใช้กราฟหรือ DOM ถูกข้ามพร้อมบอกจำนวน
- `tests/calc.test.html` ในเบราว์เซอร์ต้องขึ้น "ผ่านทั้งหมด" (รวมทุกชุด ปัจจุบัน 209 Test)
- ต้องรันทุกครั้งที่แก้ `core/` และเพิ่ม Test เมื่อเพิ่มสูตรหรือกฎ
- Test อ้างสินค้าจริง (12130 · 33390 · 33400 · 12040 · 25011 · NPD_2027Q2_01..03) กฎที่ข้อมูลจริงไม่มี (Clearance · Sub Series) ใช้สินค้าสมมติในแต่ละ Test
- Test ของ Phase 2 รันภายใต้ Flag ที่เปิดชั่วคราว (ชุด features รัน Test Workflow เดิมซ้ำโดยเปิด Flag ทั้งหมด)

## ทดสอบบนเบราว์เซอร์

- เปิด `index.html` ผ่าน `file://` ใน Chrome แล้วตรวจ:
  - ไม่มี "โหลดไฟล์ไม่ได้" และไม่มี Error ใน Console
  - Side Menu ครบตามสิทธิ์ของมุมมองผู้ใช้ · ค่าที่แก้ส่งต่อข้ามหน้า
  - ไม่มีคำต้องห้ามตามตารางคำศัพท์ (`ui-standards.md`)
- ขนาดจอ:
  - ทุกหน้าไม่เลื่อนที่ 1920×937 (ยกเว้นรายงาน)
  - Annual Target / Sub-channel Allocation / SKU Planning / บทบาทและสิทธิ์ ไม่เลื่อนที่ 1366×625
  - Sub-channel Allocation ที่ 1920×937: หน่วยขาย ≤ 6 ไม่มี Scroll ทั้งหน้าและภายในส่วน A / B (โหมดดู + แก้ไข) · 7 หน่วย = ส่วน A เลื่อนภายใน ส่วน B ไม่เลื่อน
  - CR-24: Annual Target มีกราฟ 2 ใบและไม่เลื่อนที่ 1920×937 · SKU Planning เปิดมาเมนูข้างไม่พับ ไม่มี Scroll แนวนอนของหน้า (เปิดและปิดยอดอ้างอิง)
  - CR-24: ไม่มีคำ `ยอดขายปี 2026` / `Actual 8M` / `ปีก่อน` ใน innerText ทุกหน้าและทุกแท็บ (Tooltip อธิบายที่มาของข้อมูลได้)
  - ไม่มี Scroll แนวนอนที่ 375px
  - ตัวเลขไม่ถูกตัด (`scrollWidth > clientWidth` ของช่องและ input ในโหมดแก้ไข) ที่ 1920 / 1800 / 1600 / 1440 / 1366
- ทดสอบอย่างน้อย 3 มุมมองผู้ใช้: ผู้ดูแลระบบ · Sales Director · ผู้ดูรายงาน (และ Sales Officer สำหรับหน้าวางแผน SKU)

### วิธีใช้ Chrome headless (DevTools Protocol)

- Browser pane ของ Claude desktop แสดง `file://` เป็นภาพนิ่ง ให้ใช้ Chrome headless ผ่าน DevTools Protocol แทน (Node มีในเครื่อง ไม่ต้องติดตั้ง package)
- ห้ามรันสคริปต์ headless 2 ตัวพร้อมกัน (ใช้ Port เดียวกันแล้วผลผิด)
- เปิด `Emulation.setFocusEmulationEnabled` ไม่อย่างนั้นช่องที่ commit ตอน blur จะดูเหมือนไม่ทำงาน
- Dialog:
  - `confirm` / `beforeunload` ตอบผ่าน `Page.javascriptDialogOpening` → `Page.handleJavaScriptDialog`
  - beforeunload แสดงเฉพาะเมื่อมีการโต้ตอบจริง (ใช้ `Input.dispatchMouseEvent`)
  - กล่องยืนยัน `<dialog>` ให้กด `.dlg-confirm`
- ตั้ง `ui.role` เป็นผู้ใช้ที่มีสิทธิ์ก่อนกดแก้ไข (`{ userId: 'u-admin' }` แก้ได้ทุกหน้า) หรือกด `.wf-switch`
- จำลองการใช้งาน:
  - วางจาก Excel: `new ClipboardEvent('paste', { clipboardData: new DataTransfer() })`
  - ลากวาง: `DragEvent` + `DataTransfer`
  - อัปโหลดรูป: `DOM.setFileInputFiles` (รูปที่ได้ต้องไม่เกิน 320px)
- ไฟล์ส่งออก:
  - ดักไฟล์ด้วยการแทน `URL.createObjectURL` / `HTMLAnchorElement.prototype.click`
  - Excel ต้องมีอินเทอร์เน็ต อ่านกลับด้วย `XLSX.read` (zip ของ SheetJS หา Path ที่ขึ้นต้นด้วย `/` เช่น `/xl/worksheets/sheet1.xml`)
  - ตรวจตัวเลขเป็นชนิดตัวเลข · ไม่มี Merge · `<pane ySplit="5" state="frozen">`
- พิมพ์รายงาน:
  - `Page.printToPDF({ preferCSSPageSize: true })` ต้องได้ A4 แนวนอน (842×595 pt)
  - จำลองการพิมพ์ด้วย `Emulation.setEmulatedMedia({ media: 'print' })` ที่กว้าง 1032px
  - เปิดไฟล์ PDF ใน headless Chrome เพื่อจับภาพได้

## สถานการณ์ที่ต้องเล่นได้

| เรื่อง | ขั้นตอน |
|---|---|
| Sales Planning | Annual Target (Management แก้ MT 45% → 50%) → Audit → Sub-channel Allocation (Director เห็นบรรทัดแจ้ง · 7-Eleven 41% = 24,600,000 · แก้ % และรายเดือน · Tab ไม่เสียโฟกัส · บันทึก) → SKU Planning และรายงานใช้เป้าใหม่ · Channel เป้าหมาย 0 = แก้ไขไม่ได้ · ส่งออก 2 ชีต · สิทธิ์เดิมแปลงเป็น annualTarget / unitTargets |
| เดโม 7-Eleven | ขาด 2.34 ล้าน → ปรับทั้งหน่วยขาย ±% → สร้าง NPD → ปรับให้ครบตามเป้าหมาย → รายงาน |
| หน้าวางแผน SKU | ค้นหา · จัดกลุ่ม · พับ/กาง · เลือกทั้ง Series ปรับ +10% · กรอกยอดทั้งปี · ปิดส่วนต่าง · วางจาก Excel + Ctrl+Z · Ctrl+C ได้ TSV · ยกเลิกแล้วค่ากลับทั้งหมด · เปิดยอดอ้างอิงที่ 1920×937 (เมนูข้างเปิด) ไม่มี Scroll แนวนอน · ช่อง ก.ย.–ธ.ค. มีจุดประมาณการ + Tooltip |
| เพิ่ม SKU / NPD | Drawer เพิ่ม SKU (ยังไม่ได้ Listing → Listing โดย Sales) · สร้าง NPD แล้วเห็นในรายการสินค้า / แผน NPD / Listing · ทีม Product แก้ราคาแล้วแถวมี `!` |
| ราคาขายต่อ Account | กรอก · ลบค่า = RSP · ลด x% · วางจาก Excel · บันทึก → หน้าวางแผน SKU ใช้ราคาใหม่ · ล้าง GP ของ Account → `ยังไม่ได้กำหนด GP` + Net Sales `–` |
| Product Master | สร้าง SKU รหัสชั่วคราว → อัปโหลดรูป → แผน NPD + หน่วยขาย → แผน SKU มี SKU พร้อมเดือนเริ่มขาย → ผูกรหัสจริง (รหัสซ้ำไม่ยอมรับ) แผน SKU ยังอยู่ครบ · Listing เลือกทั้งคอลัมน์ |
| หมวดสินค้าและ Series | เพิ่ม (ชื่อว่าง / ซ้ำไม่ยอมรับ) · เปลี่ยนชื่อ · ลาก · ย้าย SKU · ย้ายรายการ · รวม · ปิดรายการแม่ · ยกเลิกแล้วคืนค่า · บันทึกแล้วมี Audit · ตารางไขว้รวม 115 → คลิกไปรายการสินค้า · Drawer ที่ 1200px |
| ร้านค้า TT | ย้ายด้วย Checkbox และลากวาง · นำออกแล้วจัดสรรตามเขตแนะนำ · โอนทั้งเขต · Drawer ร้าน 711 (TT เขต 4 อัมพร → TT เขต 1 สิริกาญจน์) · เปลี่ยนข้อมูล ณ เดือน (ก.ค. 2026 ยังไม่จัดสรร 32) |
| ผู้รับผิดชอบ / ทีมขาย | บันทึกลาออก + โอนเขต → หน้า Sub-channel Allocation แสดงแถบผู้รับผิดชอบ 2 คน ตัวเลขเป้าไม่เปลี่ยน · เพิ่ม / สิ้นสุดสมาชิกทีมแล้วสิทธิ์หน้าวางแผน SKU เปลี่ยนทันที |
| บทบาทและสิทธิ์ | แก้เมทริกซ์ (ทีม Product แผน NPD ไม่เห็น · ผู้ดูรายงาน ส่งออก ไม่อนุญาต · Sales Manager แผน SKU ดู → สร้าง NPD ปรับเองพร้อมแจ้ง) → สรุป → บันทึก → ดูตัวอย่าง (เมนูไม่มีหน้า · URL ขึ้นไม่มีสิทธิ์ · ไม่มีปุ่มส่งออก) · เพิ่มบทบาทแบบคัดลอก · ชื่อซ้ำ · จัดลำดับ · เพิ่มผู้ใช้ · Drawer สิทธิ์ · บันทึกไม่ได้เมื่อไม่มีผู้ดูแล · ยืนยันซ้ำเมื่อเอาสิทธิ์ตัวเองออก · รีเซ็ต |
| เพิ่ม Channel | เพิ่ม Export แล้วเห็นใน Tree · Waterfall · แท่งสัดส่วน · ปุ่ม Channel ของ Sub-channel Allocation · Filter ของ SKU / Listing / ราคาขายต่อ Account · เปิดใช้งาน LINE Shop แล้วเพิ่มใน Sub-channel Allocation |
| ขั้นที่ 4 | แท็บรายงานเป็นค่าเริ่มต้น · ตัวนับ 9 · ตัวกรอง · พิมพ์แท็บติดตามสถานะได้แค่ข้อความ · รายงานฉบับร่างมีลายน้ำทุกหน้า |
| **[Phase 2]** Workflow | เปิด Flag ทั้งหมดชั่วคราว: ส่ง Top-down → Management อนุมัติ → ส่ง Phasing / SKU ทุกหน่วย → Director อนุมัติ → ล็อก Baseline (BL-01 + ช่องลงนาม) · แก้ราคาหลังล็อกแล้วรายงานไม่เปลี่ยน · ปลดล็อก (ต้องมีเหตุผล) → DRAFT → ล็อกใหม่ BL-02 · เปิดให้แก้ไข Top-down แล้วเปลี่ยนเป้าหน่วยเดียว → หน่วยนั้น "ต้องตรวจสอบใหม่" · PDF 4 หน้า |

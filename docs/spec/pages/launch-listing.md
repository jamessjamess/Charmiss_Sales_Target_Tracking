# Launch & Listing (`modules/launch-listing`, id `launchListing`)

CR-35 รวมหน้าแผน NPD (`npdPlan`) และ Listing (`productMaster`) เป็นหน้าเดียว 2 แท็บ · Product Master · fit · ไอคอน `L` · ผู้แก้ไขตั้งต้น: ทีม Product · Supply Chain (สิทธิ์ย่อย Clearance)

- แท็บ `NPD | Listing` (`components.segmented`) · จำที่ `ui.launchTab` · `#npd` / `#listing` ใน URL · `<title>` = `Launch & Listing · {แท็บ}`
- เนื้อหาแต่ละแท็บ = โค้ดเดิมของหน้าเดิม (`renderNpd` · `renderListing` ใน `modules/launch-listing/launch-listing.js`) · spec ของแท็บ:
  - แท็บ NPD → [npd-plan.md](npd-plan.md)
  - แท็บ Listing → [product-master.md](product-master.md)
- ปุ่มของหัวหน้า (ข้อมูล ณ เดือน · ส่งออก ▾ · แก้ไข / บันทึก / ยกเลิก) เป็นของแท็บที่เปิด · เปลี่ยนแท็บขณะมีรายการยังไม่บันทึก = ถาม `มีรายการที่ยังไม่บันทึก {n} รายการ…` ก่อน (`components.unsavedCount` + `confirmDiscard`)
- Drawer ของแท็บ NPD ปิดและนำออกเมื่อเปลี่ยนแท็บ · ปุ่ม `?` รวมหัวข้อของทั้ง 2 แท็บ (ไม่ซ้ำ)
- ลิงก์ข้ามแท็บ:
  - แท็บ NPD: `ดู Listing` ที่แถวตารางและใน Drawer → แท็บ Listing ค้นหาเฉพาะสินค้านั้น (`ui.listingFocus` อ่านครั้งเดียว)
  - หน้า Product List (Drawer แท็บ Listing และวงจรสินค้า): `แก้ไขที่ Launch & Listing แท็บ Listing` → `#listing` ของสินค้านั้น
- CR-36 แท็บ NPD:
  - การ์ด KPI 3 ใบ (รูปแบบเดียวกับ Product List): `NPD ยังไม่เปิดตัว` (Planned) · `NPD เปิดตัวแล้ว` (NPD) · `Request จาก Sales` (Request) — Status ณ เดือนปัจจุบัน · กด = กรอง Status ·
    การ์ดที่เลือกขอบสีหลัก + Chip `KPI: <ชื่อการ์ด>` · แทน KPI เดิม (NPD ทั้งหมด · ยังไม่เปิดตัว / เปิดตัวใน 3 เดือน · ตาม Series · หน่วยขายที่ยังไม่อยู่ในแผน SKU) และ Chip `คำขอจาก Sales`
  - `จัดกลุ่ม: <เกณฑ์> ▾` (`components.groupPicker`): ไม่จัดกลุ่ม (ค่าเริ่มต้น) · Series · Product Level · Status · เดือนเปิดตัว · ใช้ทั้ง Timeline และตาราง · `ui.groupBy.<ผู้ใช้>.npd`
  - Chip `มี Listing แต่ยังไม่อยู่ในแผน SKU (N)` · ปุ่ม `ยังไม่อยู่ในแผน N` ต่อแถว (Timeline และตาราง) → Popover หน่วยขาย + `ไปที่ SKU Planning ›`
    (`ui.selection` + `ui.skuAddHandoff` → SKU Planning เข้าโหมดแก้ไขและเปิด `เพิ่มสินค้าในแผน` แท็บ NPD ที่ยืนยันแล้วพร้อมเลือกสินค้า · ไม่มีสิทธิ์แก้ไข = เปิดหน้าอย่างเดียว) ·
    `calc.listedNotPlanned` = หน่วยขายที่มี Listing ในปีแผนแต่แผน SKU ไม่มีแถว (ตัวเลขเดียวกับข้อความแจ้งใน SKU Planning)
- แท็บ Listing เพิ่ม Chip `เฉพาะสินค้าใหม่` (Request · Planned · NPD ณ เดือนที่เลือก) · ค้นหาด้วย Product Code / รหัสชั่วคราวได้
- ช่วง Clearance (สิทธิ์ย่อย `listing.clearance`) ยังแก้ได้ที่แท็บ Listing: เดือนเริ่ม · เดือนสิ้นสุด (ว่าง = จนสินค้าหมด) · Stock · ราคา / หน่วยขาย / หมายเหตุแก้ที่ [promotions.md](promotions.md) แท็บ Clearance
- สิทธิ์: `launchListing` = ระดับสูงสุดของ `npdPlan` และ `listing` เดิม (`core/permissions.js` LEGACY + ALIASES · ค่าตั้งต้นเท่ากันทุกบทบาท `N V V V E V N E`) · ดู [permissions.md](../permissions.md)
- หน้าเดิมซ่อน (`visible: false` · `perm: 'launchListing'`) ไฟล์ยังอยู่: `modules/npd-plan` → `launch-listing/index.html#npd` · `modules/product-master` → `#listing` (`location.replace`)

## ตารางเทียบฟีเจอร์ (ไม่มีอะไรหาย)

| หน้าเดิม | ฟีเจอร์ | ใน Launch & Listing |
|---|---|---|
| แผน NPD | KPI (NPD ทั้งหมด · ยังไม่เปิดตัว / เปิดตัวใน 3 เดือน · ตาม Series · หน่วยขายที่ยังไม่อยู่ในแผน SKU) | CR-36 การ์ด 3 ใบ + จัดกลุ่ม Series + Chip มี Listing แต่ยังไม่อยู่ในแผน SKU |
| แผน NPD | Timeline (แถบขั้นงาน · หมุดเปิดตัว · ไตรมาส · NPD 3 เดือน · ⚠ เลยกำหนด) · ช่วง 12 / 18 / 24 เดือน | แท็บ NPD เหมือนเดิม |
| แผน NPD | ตาราง (ใช้ในแผน · ที่มา · ใน TRCLOUD) | แท็บ NPD + ลิงก์ `ดู Listing` ต่อแถว |
| แผน NPD | ตัวกรอง Series · ขั้นงาน · ที่มา · Chip `คำขอจาก Sales (n)` | แท็บ NPD เหมือนเดิม |
| แผน NPD | Drawer แผน (ขั้นงาน · เดือนเปิดตัว / ไตรมาส · หน่วยขาย · RSP ที่คาด · คำขอจาก Sales) | แท็บ NPD + `ดู Listing` · สถานะคำขออ่านอย่างเดียว + รหัสชั่วคราวเดิม |
| แผน NPD | ยืนยันคำขอ (CR-34 สถานะคำขอใน Drawer) | CR-35 ปุ่ม `ยืนยันเป็น NPD` ที่แถวคำขอ / Drawer (บันทึกทันที · ได้ Product Code 5 หลัก) |
| แผน NPD | บันทึกแผน → เดือนเปิดตัว + Listing ของหน่วยที่วางแผน (`calc.applyNpdApproval`) | แท็บ NPD เหมือนเดิม |
| แผน NPD | ส่งออก ▾ (รวมเหตุผล · สถานะคำขอ) | ส่งออกของแท็บ NPD |
| แผน NPD | **[Phase 2]** Workflow `npdApproval` | ไม่แตะ (ปิดตาม Flag) |
| Listing | ข้อมูล ณ เดือน · แท็บ Channel · ค้นหา · Series · Status · สถานะ Listing · อายุ · ไม่มียอด ≥ 3 เดือน | แท็บ Listing เหมือนเดิม + Chip `เฉพาะสินค้าใหม่` · ค้นหารหัสชั่วคราว |
| Listing | ตาราง SKU × หน่วยขาย (ความครอบคลุม · สัญลักษณ์ ✓ ◌ ✕ · อายุ / ไม่มียอด) | แท็บ Listing เหมือนเดิม |
| Listing | โหมดแก้ไข: Popover ช่อง · เลือกหลายช่อง (Shift / Ctrl · ปุ่ม `เลือก`) · แถบลอย วางขาย / ถอด | แท็บ Listing เหมือนเดิม |
| Listing | ยืนยันถอดเมื่อยังมีแผน SKU (`calc.plannedAfter`) · ป้าย `Listing โดย Sales` | แท็บ Listing เหมือนเดิม |
| Listing | Clearance (Supply Chain · ช่วงเดือน + Stock) | แท็บ Listing (สิ้นสุดว่างได้) + ราคา Clearance ที่ Price & Promotion แท็บ Clearance |
| Listing | `?` กฎ Status และวิธีเติมยอด | ปุ่ม `?` ของหน้า |
| Listing | ส่งออก ▾ · Audit log `entity: 'listing'` | ส่งออกของแท็บ Listing · Audit เดิม |
| ทั้งสอง | สิทธิ์ `npdPlan` · `listing` · สิทธิ์ย่อย `listing.clearance` | `launchListing` (สูงสุดของ 2 ค่าเดิม) · `listing.clearance` คงเดิม |
| ทั้งสอง | Route เดิม | พาไปแท็บที่ตรงกัน |

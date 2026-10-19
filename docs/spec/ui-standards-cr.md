# มาตรฐาน UI ราย CR (CR-37 ขึ้นไป)

แยกจาก [ui-standards.md](ui-standards.md) (CR-39) · มาตรฐานหลักอยู่ที่ ui-standards.md

## CR-37 ป้าย Bundle

- `components.bundleTag(product, products)` = ป้าย `Bundle` (สีเขียวน้ำทะเล `--c-bundle-*`) ต่อท้ายชื่อสินค้า เหมือนกันทุกหน้า (Product List · Drawer · Price & Promotion · SKU Planning · Dialog เพิ่มสินค้าในแผน) ·
  Tooltip = ส่วนประกอบ `12130 × 1 + 12140 × 1` · ไม่ใช่ Bundle หรือ Flag `bundle` ปิด = ไม่แสดง · หน่วย `ชุด` (`labels.bundleTag.unit`)

## CR-38 Revision

- คำศัพท์: `Revision` · `ร่าง` / `รอ Lock` / `Lock แล้ว` · `เดือนที่มีผล` · `เสนอ Lock` · `ถอนการเสนอ` · `ส่งกลับแก้ไข` · `Snapshot` · `ล็อก` (เดือนก่อนเดือนที่มีผล) · ชื่อรอบ `2027 R2` · ข้อความกลางที่ `labels.revision`
- สี (`styles/tokens.css`): `--c-rev-draft-*` (เหลืองอ่อน) · `--c-rev-submitted-*` (เหลือง) · `--c-rev-locked-*` (เทา) · `--c-rev-hatch` (ลายเส้นบางของเดือนล็อก) · ป้าย Lock แล้ว = สีเขียวของสถานะครบ
- Component ใหม่ (`core/components.js`): `revisionBadge(status)` ป้ายสถานะ · `revisionPicker()` ตัวเลือก `2027 · R2 ร่าง ▾` (Popover จัดกลุ่มตามปี) ·
  `revisionBar(overview)` แถบสถานะ 1 บรรทัดใต้คำอธิบายของหน้า Sales Planning (CR-40 เลิกใช้ ดูหัวข้อ CR-40) · `revisionCard(overview, opts)` การ์ดสถานะรอบ (Revision List · Plan Summary)
- เดือนล็อกในตารางรายเดือน: หัวคอลัมน์มีคำเล็ก `ล็อก` · ช่องพื้นเทาลายเส้นบาง (`is-rev-locked` · `cell-rev-locked` · `head-rev-locked`) อ่านอย่างเดียว · Tooltip บอกเหตุผล
- รอบ รอ Lock / Lock แล้ว = โหมดดูทุกหน้า: `workflowBar` ตัวเลือก `readOnly` แสดงข้อความ (`.wf-readonly-revision`) แทนปุ่ม `แก้ไข`
- ปุ่ม `รีเซ็ตข้อมูล ▾` (Flag `revision`) = Popover 2 ตัวเลือก พร้อมคำอธิบายบรรทัดเล็ก

## CR-39 Approval · เมนูข้าง

- เมนูข้าง: ชื่อที่ยาวเกินกรอบขึ้นบรรทัดที่ 2 (`.side-label` white-space normal) ไม่ล้นและไม่ถูกตัด · `.side-menu` ไม่มีแถบเลื่อนแนวนอน (overflow-x hidden) · ตรวจกับ Sales Person Management ที่ 1920×1080
- คำศัพท์: `คำขออนุมัติ` · `ขั้นอนุมัติ` · `ชุดสรุป` · `รออนุมัติ` (แทน รอ Lock) · `ส่งขออนุมัติ` · `ถอนคำขอ` · `ยืนยัน` · `อนุมัติและ Lock` · `ส่งกลับแก้ไข` · ข้อความกลางที่ `labels.approval`
- ป้ายสถานะคำขอ (`.ap-badge`): รอดำเนินการ (เหลือง) · อนุมัติแล้ว (เขียว) · ส่งกลับแก้ไข (แดง) · ถอนคำขอแล้ว (เทา) · ป้ายสถานะของรอบยังใช้ `components.revisionBadge`
- ไทม์ไลน์ขั้นอนุมัติแนวนอน: กล่องต่อขั้น (บทบาท · ชื่อขั้น · สถานะ · ผู้ทำ · วันที่) · ขั้นปัจจุบันเส้นขอบสีหลัก 2px · ส่งกลับ = พื้นแดงอ่อน · ไม่ใช้ขั้นนี้ = เส้นประจาง · จอแคบเรียงแนวตั้ง
- สวิตช์ (`.ap-switch`): checkbox ซ่อน + แถบเลื่อน · ปุ่มที่ใช้ไม่ได้แต่ต้องมี Tooltip ใช้ `.btn.is-disabled` + `aria-disabled` (ไม่ใช้ disabled เพราะ Tooltip ไม่แสดง)

## CR-40 แถบสถานะ Revision · SKU Planning · ธีม

- **แถบสถานะ Revision เฉพาะโหมดแก้ไข:** โหมดดูไม่มีแถบ — ป้ายข้างชื่อรอบ (`2027 · R1 [ร่าง] ▾`) มี Tooltip (`revisionTip`): ร่าง `แก้ไขได้ตั้งแต่ <เดือน> · เดือนก่อนหน้าใช้ค่าจาก <รอบก่อน>` (R1 `แก้ไขได้ทุกเดือน` · ส่งกลับ = ต่อท้ายข้อความส่งกลับ) ·
  รออนุมัติ `ส่งขออนุมัติเมื่อ <วันที่> · ขั้นปัจจุบัน <ขั้น>` · Lock แล้ว `Lock เมื่อ <วันที่> โดย <ชื่อ>` · รอบที่ไม่ใช่รอบปัจจุบัน = ลิงก์เล็ก `ไปรอบปัจจุบัน` ข้างตัวเลือก
- **โหมดแก้ไข** (Annual Target · Sub-channel Allocation · SKU Planning): `editBanner({ revision: true })` แถบเดียว 1 บรรทัด `โหมดแก้ไข · 2027 R2 ร่าง · แก้ไขได้ตั้งแต่ เม.ย. 2027 · มีรายการที่ยังไม่บันทึก 2 รายการ` · ข้อความส่งกลับอยู่ใน Tooltip ของแถบ ·
  ข้อความกลาง `labels.revision.tip` · `labels.revision.editBar` · ปิด Flag `revision` = แถบเดิม
- **SKU Planning แถวเครื่องมือแถวเดียว** ดู [pages/sku-planning.md](pages/sku-planning.md) หัวข้อ CR-40
- **ธีม · โครงหน้า · แท็บ · ป้ายสถานะ · ไอคอน** ดู [ui-theme.md](ui-theme.md)

## CR-41 สถานการณ์ Demo · ยอดจริงของเดือนที่ปิดแล้ว

- แถบบน: ป้ายสถานการณ์ (`.scenario-badge` ขอบประสีหลัก) ถัดจาก `Prototype` + ปุ่ม `สถานการณ์ Demo ▾` (แทน `รีเซ็ตข้อมูล ▾`) เปิดเมนูเดียวกัน: จุดเลือก + ชื่อ + คำอธิบายต่อสถานการณ์ · เส้นคั่น · `เริ่มสถานการณ์นี้ใหม่` · ทุกการสลับมี Dialog ยืนยัน
- `components.actualLine(actual, target, { format, sample })` = บรรทัดเล็ก `จริง <ค่า>` ใต้เป้าหมาย / แผนของเดือนที่ปิดแล้ว · ต่ำกว่า = `text-short` (แดง) · ไม่ต่ำกว่า = `text-ok` (เขียว) · ยอดตัวอย่าง = Tooltip `ยอดจริงตัวอย่าง (ยังไม่ใช่ยอดจาก TRCLOUD)`
- `charts.compareLines`: ค่า null = เส้นขาดช่วง (ไม่มีจุดและแท่งส่วนต่าง) — ไม่มี null = ผลเดิม
- รายละเอียดที่ [demo-scenarios.md](demo-scenarios.md)

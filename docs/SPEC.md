# SPEC — สารบัญ

Prototype เว็บวางแผน Sales Target ของ Charmiss สำหรับนำเสนอและทดลอง Flow กับ Management / Sales Director ก่อนทำระบบจริง

- **Top-down** เป็น Net Sales (บาท): Total → Channel → หน่วยขาย (Account / เขตการขาย / Platform) → รายเดือน
- **Bottom-up** เป็นจำนวนชิ้นต่อ SKU × หน่วยขาย × เดือน มาเจอกับ Top-down ที่ "คงเหลือ"
- **Phase 1** (ปัจจุบัน) แก้ไขและบันทึกได้ทันทีตามสิทธิ์ ไม่มีขั้นอนุมัติ ไม่มีล็อก Baseline ไม่มี Re-forecast · ปิดด้วย Feature Flag และโค้ดยังอยู่ครบ
- **Phase 2** อนุมัติทีละขั้น → ล็อก Baseline → Re-forecast (หัวข้อที่มีป้าย **[Phase 2]**)
- ไม่มี Login · ไม่มีฐานข้อมูล (sessionStorage) · ส่งออก Excel / CSV ได้ · กติกาโค้ดอยู่ที่ `CLAUDE.md`

## ไฟล์สเปก (`docs/spec/`)

| ไฟล์ | เนื้อหา |
|---|---|
| [architecture.md](spec/architecture.md) | ข้อกำหนดทางเทคนิค · โฟลเดอร์ · ลำดับโหลด · registry · layout · กติกา Module · store · Feature Flags · เพิ่มหน้าใหม่ |
| [data-model.md](spec/data-model.md) | Key ใน store · ข้อมูลหลักใน `data/` · ข้อมูลจริงจาก seed · ข้อมูลตั้งต้นสำหรับนำเสนอ |
| [ui-standards.md](spec/ui-standards.md) | คำศัพท์ · ตัวเลข · สี · โครงหน้า · โหมดดู/แก้ไข · Component · กราฟ · ส่งออก · ขนาดจอ |
| [business-rules.md](spec/business-rules.md) | เป้าหมาย · แผน SKU · สูตรเงิน · สินค้า · ร้านค้าและเขต · สิทธิ์ · Workflow **[Phase 2]** · สิ่งที่ห้ามทำ |
| [open-items.md](spec/open-items.md) | คำถามที่ค้าง · สมมติฐานที่ตั้งเอง · ปัญหาที่รู้แล้ว |
| [testing.md](spec/testing.md) | Test อัตโนมัติ · วิธีทดสอบด้วย Chrome headless · สถานการณ์ที่ต้องเล่นได้ |
| [pages/](spec/pages/) | 1 ไฟล์ต่อหน้า (ชื่อไฟล์ = ชื่อโฟลเดอร์ใน `modules/`) |

หน้า: [top-down](spec/pages/top-down.md) (Annual Target) · [phasing](spec/pages/phasing.md) (Sub-channel Allocation) · [sku-planning](spec/pages/sku-planning.md) (SKU Planning) ·
[summary](spec/pages/summary.md) (Plan Summary) ·
[products](spec/pages/products.md) · [npd-plan](spec/pages/npd-plan.md) · [promotions](spec/pages/promotions.md) · [product-master](spec/pages/product-master.md) ·
[taxonomy](spec/pages/taxonomy.md) · [accounts](spec/pages/accounts.md) · [territories](spec/pages/territories.md) · [salespeople](spec/pages/salespeople.md) ·
[sales-team](spec/pages/sales-team.md) · [about-prototype](spec/pages/about-prototype.md) · [role-management](spec/pages/role-management.md)

## หัวข้อเดิมของ SPEC (CR เก่าอ้างถึง)

| หัวข้อเดิม | อยู่ที่ |
|---|---|
| 1 ภาพรวม | ไฟล์นี้ |
| 2 ผู้ใช้ บทบาท และสิทธิ์ (2.1–2.5) | `business-rules.md` สิทธิ์ · `data-model.md` ทีมขาย บทบาท ผู้ใช้ · `pages/sales-team.md` |
| 2.6 หน้าบทบาทและสิทธิ์ | `pages/role-management.md` |
| 3 ข้อกำหนดทางเทคนิค | `architecture.md` |
| 4 โครงหน้าและเมนู | `ui-standards.md` โครงหน้า |
| 5 จัดสรรเป้าหมายประจำปีและรายเดือน · 5.1 มุมมองรวม | `pages/top-down.md` (Annual Target) · `pages/phasing.md` (Sub-channel Allocation — CR-23 รวมการแบ่งลงหน่วยขาย) |
| 6.1–6.5 ข้อมูลหลัก | `data-model.md` |
| 6.6 หน้าหมวดสินค้าและ Series | `pages/taxonomy.md` |
| 6.7 หน้าเขตการขายและร้านค้า | `pages/territories.md` |
| 6.8 หน้าราคาขายต่อ Account | `pages/promotions.md` |
| 7 หน้าวางแผนยอดขายราย SKU | `pages/sku-planning.md` |
| 8 ขั้นที่ 4 | `pages/summary.md` |
| 9 Workflow · 10 Business Rules และสูตร | `business-rules.md` |
| 11 มาตรฐาน UI และคำศัพท์ | `ui-standards.md` |
| 12 การทดสอบ | `testing.md` |

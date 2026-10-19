# Module Approval (CR-39)

Flag `approval` (`data/settings.js` FEATURES · ใช้คู่กับ Flag `revision` · ปิด = วงจรของ CR-38 ในแท็บ Revision) · โค้ด `core/approval.js` (`SP.core.approval`) · ข้อมูล `data/approvals.js` ·
หน้า [pages/approval.md](pages/approval.md) · Flag เดิม `approvalWorkflow` (อนุมัติทีละขั้นของ Phase 2 เดิม) ยังปิด โค้ดเดิมอยู่หลัง Flag เดิม · `npdApproval` ไม่แตะ

## ข้อตกลง

- คำขอ 1 รายการ = การสรุปและขออนุมัติ Sales Planning ของ 1 Revision · ประเภทเดียวตอนนี้ `revisionLock` (ฟิลด์ `type` รองรับคำขอประเภทอื่น เช่น คำขอ NPD)
- สถานะของ Revision: `ร่าง` → `รออนุมัติ` (เดิม `รอ Lock` · id `submitted`) → `Lock แล้ว` · ส่งกลับที่ขั้นใดก็ตาม = กลับเป็น `ร่าง`
- ทุกคำขอมีชุดสรุปของรอบสำหรับผู้อนุมัติ (`calc.revisionSummary`) คำนวณตอนส่งและเก็บในคำขอ

## โครงข้อมูล

| Key | เนื้อหา |
|---|---|
| `approval.requests` | `[{ id ('REQ-2027-R2-01'), type, refId (id ของ Revision), status: pending · approved · returned · withdrawn, steps[], summary, comments[], note, createdBy/At, closedBy/At, returnNote }]` |
| `approvalConfig.revisionLock` | `{ sdConfirm }` (ค่าตั้งต้น `data/approvals.js` config = ปิด) |
| `ui.approvalTab` · `ui.approvalOpen` | แท็บล่าสุดของหน้า Approval · คำขอที่จะเปิด (ส่งต่อจากแท็บ Revision · อ่านครั้งเดียว) |

- `steps[]` = `{ key, role, status: waiting · current · approved · returned · skipped, actedBy, actedAt, note }` สร้างตอนส่งตามตั้งค่า → แก้ตั้งค่ามีผลกับคำขอใหม่เท่านั้น
- `comments[]` = `{ by, at, text }` เพิ่มได้ทุกสถานะ (ต่อท้ายอย่างเดียว)

## ขั้นอนุมัติ

| ลำดับ | key | บทบาท | สิทธิ์ย่อย | ค่าเริ่มต้น |
|---|---|---|---|---|
| 1 | `mgmtSubmit` | Management ส่งขออนุมัติ (สร้างคำขอ = ผ่านทันที) | `approval.submit` | เปิดเสมอ |
| 2 | `sdConfirm` | Sales Director ยืนยันการจัดสรรหน่วยขายและรายเดือน | `approval.sdConfirm` | **ปิด** (= `skipped`) |
| 3 | `mdLock` | MD อนุมัติและ Lock | `approval.mdLock` | เปิดเสมอ |

- ดำเนินการขั้นได้เมื่อ ขั้นนั้นเป็น `current` + ผู้ใช้มีบทบาทของขั้น + มีสิทธิ์ย่อยของขั้น (`approval.canStep`) · ผู้ดูแลระบบไม่มีบทบาทของขั้น จึงทำแทนไม่ได้
- ตั้งค่า (`approval.config`): Management + ผู้ดูแลระบบ (ผู้ใช้เลือก · CR ข้อ 2.2) ที่แท็บ ตั้งค่า ของหน้า Approval

## กติกา (บังคับที่ Store)

`store.set` / `remove` เรียก `approval.guardWrite` (ต่อจาก `revision.guardWrite`) · ข้อความปฏิเสธที่ `labels.approval.errors`

| คำสั่ง | เงื่อนไข | ผล |
|---|---|---|
| ส่งขออนุมัติ (`create`) | Revision เป็นร่าง · 3 ข้อบังคับของการตรวจครบ · ไม่มีคำขอ pending ของรอบนี้ · ข้อความบังคับ | คำขอ pending → Revision `รออนุมัติ` (ทุกหน้าอ่านอย่างเดียว · `assertWritable` ปฏิเสธเหมือนเดิม) |
| ยืนยัน (`confirm`) | ขั้นปัจจุบัน `sdConfirm` | ขั้นถัดไป (`mdLock`) เป็น current · บันทึกในประวัติของรอบ (`confirm`) |
| อนุมัติและ Lock (`approve`) | ขั้นปัจจุบัน `mdLock` · พิมพ์ชื่อรอบตรง | `revision.lock` (Snapshot + Lock ตาม CR-38 ทุกข้อ) → คำขอ approved |
| ส่งกลับแก้ไข (`return`) | ขั้นปัจจุบัน `sdConfirm` หรือ `mdLock` · ข้อความบังคับ | Revision กลับเป็นร่าง + `returnNote` (CR-40: Tooltip ของป้ายรอบ · การ์ดของรอบ · Tooltip ของแถบโหมดแก้ไข จนกว่าจะส่งใหม่) → คำขอ returned |
| ถอนคำขอ (`withdraw`) | Management · ยังไม่มีขั้นหลังการส่งถูกดำเนินการ | Revision กลับเป็นร่าง → คำขอ withdrawn |

- Store ปฏิเสธ: ลบคำขอ · แก้ฟิลด์ที่บันทึกตอนส่ง (type · refId · ผู้ส่ง · ข้อความ · ชุดสรุป) · แก้คำขอที่ปิดแล้ว (นอกจากเพิ่มความคิดเห็น) · ขั้นถอยหลัง / ข้ามขั้น ·
  approved โดย Revision ยังไม่ Lock · returned / withdrawn โดย Revision ไม่กลับเป็นร่าง · คำขอ pending ซ้ำของรอบเดียวกัน
- Revision เปลี่ยนสถานะได้เฉพาะระหว่างคำสั่งของคำขอ (`approval.authorizes` · `revisionMoveOk` ใน `revision.guardList`) — เขียน `revision.list` ตรงๆ หรือเรียก `revision.submit` / `lock` เองถูกปฏิเสธ
- ลำดับในคำสั่ง: ส่ง = บันทึกคำขอก่อนแล้ว Revision เป็นรออนุมัติ · อนุมัติ / ส่งกลับ / ถอน = เปลี่ยน Revision ก่อนแล้วบันทึกคำขอ (Store ตรวจสถานะของ Revision ตอนบันทึกคำขอ)
- ทุกการเปลี่ยนสถานะของคำขอบันทึกในประวัติของ Revision: `submit` (ส่งขออนุมัติ) · `confirm` · `return` · `withdraw` · `lock` (อนุมัติและ Lock)

## ชุดสรุป (`calc.revisionSummary` · ชื่อใน CR = `SP.calc.revisionSummary(revisionId, compareToId)`)

- `revision.summary(id, compareToId)` → ข้อมูลของรอบ (รอบ Lock = Snapshot · อื่น = `report.build`) + รอบก่อน (`basedOn` → ลำดับก่อนหน้า) → `calc.revisionSummary(cur, prev)` (ฟังก์ชันล้วน)
- ตัวเลขหลัก: Total Target · ยอดขาย L12M (`report.total.prior`) · การเติบโต (Total ÷ L12M − 1) · ส่วนต่างจากรอบก่อน (บาท · %)
- ราย Channel: รอบก่อน · รอบนี้ · ส่วนต่าง · % ของ Total · แท่งเทียบสเกลจริงเริ่ม 0 · หน่วยขายที่เปลี่ยนมากที่สุด 5 อันดับ (|ส่วนต่าง| ≥ 0.5 บาท)
- ความครบของแผน SKU: จำนวนหน่วยขาย ครบ / ขาด / เกิน / ไม่มีเป้า (`calc.remaining`) + ยอดขาดรวม · ประเภทสินค้าในแผน (`calc.planTypeMix` สินค้าเดิม · NPD ยืนยันแล้ว · ขอ NPD)
- Clearance = แผน Clearance รวม (`calc.clearancePlanMonthly` · ไม่นับในเป้าหมาย) · รายเดือน = เป้าหมายรายเดือนของรอบนี้และรอบก่อน + เดือนล็อก (กราฟ `charts.compareLines`)
- กติกา: Total และราย Channel = Annual Target ของรอบเดียวกัน · ส่วนต่าง = `compareRevisions` ระดับ Total / Channel · รอบแรก = ไม่มีส่วนต่าง
- ข้อมูลเปลี่ยนหลังส่ง: `calc.revisionSummaryChanges(เก็บไว้, คำนวณใหม่)` (ปัดเป็นบาท) ไม่ว่าง = แถบเตือนสีแดงในหน้ารายละเอียด · ระหว่างรออนุมัติรอบถูกล็อก จึงไม่ควรเกิด (Test cr39-24)

## ข้อมูลตั้งต้น · ข้อมูลตัวอย่าง

- `ข้อมูลตั้งต้น`: ไม่มีคำขอ · ตั้งค่าขั้นอนุมัติ = ค่าเริ่มต้น (Sales Director ยืนยัน ปิด)
- `ข้อมูลตัวอย่าง Revision` (`approval.sampleApproved` ใน `revision.loadSample`): R1 มีคำขอ approved 1 รายการ (Management ส่ง 10 ธ.ค. 2026 · ความคิดเห็นของ MD 14 ธ.ค. 2026 · MD อนุมัติ 15 ธ.ค. 2026) · R2 ร่าง ไม่มีคำขอ
- ผู้ใช้ทดลองครบทุกขั้น: Management (วรวุฒิ) · Sales Director (ปรียา) · MD (ธนวัฒน์)

# Revision ของ Sales Planning (CR-38 · Phase 2 ส่วนแรก)

Flag `revision` (`data/settings.js` FEATURES · ปิด = Phase 1 เดิมทุกหน้า ไม่มีแท็บ Revision ไม่มีข้อบังคับ) · โค้ด `core/revision.js` (`SP.core.revision`) · ข้อมูล `data/revisions.js` ·
CR-39: แท็บ [Revision](pages/revision-list.md) · [เปรียบเทียบ](pages/revision-compare.md) ของ Plan Summary (หน้าเดิมเป็นทางผ่าน) · เสนอ / Lock ผ่าน [Module Approval](approval.md) (Flag `approval`) · Flag เดิม `approvalWorkflow` / `baseline` / `reforecast` ยังปิด โค้ดเดิมอยู่หลัง Flag เดิมครบ (ไม่ใช้ร่วมกับ Revision)

## ข้อตกลง

- Revision = ชุดเป้าหมายและแผนของ 1 ปีแผน 1 รอบ · ชื่อ `{ปี} R{ลำดับ}` (`labels.revision.name`) · id `2027-R2`
- สถานะ `draft` (ร่าง) → `submitted` (รออนุมัติ · CR-38 เรียก รอ Lock) → `locked` (Lock แล้ว) · ส่งกลับเป็นร่างได้ · ไม่มีการลบรอบหรือปลด Lock
- ครอบคลุม 4 ขั้น: Total · เป้าหมาย Channel · เป้าหมายหน่วยขาย × เดือน (สัดส่วนรายเดือน) · แผน SKU × หน่วยขาย × เดือน
- มีรอบ `ร่าง` หรือ `รอ Lock` ได้ครั้งละ 1 รอบต่อปีแผน · รอบใหม่เปิดได้เมื่อรอบล่าสุด Lock แล้ว (R1 ของปีที่ยังไม่มีรอบ = เปิดได้เสมอ)
- ค่าตั้งต้น (`data/revisions.js` defaults) = `2027 R1 ร่าง` มีผล ม.ค. 2027 → ทุกขั้นแก้ได้ทุกเดือนเหมือน Phase 1 · ตัวเลขทุกหน้าเท่ากับก่อน CR

## ที่เก็บ (store)

| Key | เนื้อหา |
|---|---|
| `revision.list` | รายการ Revision ทุกปี: `id · planYear · seq · name · status · effectiveMonth ('YYYY-MM') · basedOn · reason · openedBy/At · submittedBy/At · submitNote · lockedBy/At · returnNote · history[] · base · lockBefore · snapshotAt` |
| `revision.snap.<id>` | Snapshot ตอน Lock (สร้างครั้งเดียว แก้ไม่ได้) |
| `plan.<ปี>.*` | ข้อมูลของรอบล่าสุดของปี (working) · R1 ใช้ Key เดิม · เปิดรอบใหม่ = คัดลอกค่าจาก Snapshot ของรอบ Lock ล่าสุดลง Key เดิม |
| `ui.revision` | รอบที่เลือกใน Sales Planning (ใช้ร่วมทุกหน้า) · เลือกแล้ว `app.planYear` = ปีของรอบ · ไม่มี = รอบร่าง / รอ Lock ของปีที่เลือก → รอบ Lock ล่าสุด |

- `history[]` = `{ action: open | submit | withdraw | return | lock, by, at, note }` ทุกการเปลี่ยนสถานะ
- `base` (รอบที่มีเดือนล็อก) = ค่าของเดือนล็อกจากรายงานของรอบก่อน (`baseFrom`): `{ before, targets: { <unitId>: [บาท × 12] }, sku: { <unitId>: { <productKey>: { u, s, n } } } }` (ชิ้น · Sale Amount · Net Sales)
- Snapshot = `plan` (ค่าทั้ง 4 ขั้นแบบคงที่) · `master` (products · listings · taxonomy · basePrices · promoPrices · npdPlans · accounts · territories · salespeople · assignments · customers · customerAssignments) ·
  `channels` · `history` (ยอดอ้างอิง L12M) · `report` (`core/report.js build` = ค่าที่คำนวณแล้วทั้งหมด) · `base` · `lockBefore` · `checks` (ผลตรวจก่อนเสนอ Lock ณ ตอน Lock) · ขนาดประมาณ 0.8 MB ต่อรอบ

## การอ่านข้อมูล

- ทุกหน้า Sales Planning และ `core/report.js` อ่านผ่าน `revision.read(suffix, id)` · `revision.data(id)` · `revision.master(id)`
- รอบ `ร่าง` / `รอ Lock` = คำนวณสดจาก Master ปัจจุบันเหมือน Phase 1 · รอบ `Lock แล้ว` = อ่านจาก Snapshot เท่านั้น (แก้ Master ภายหลังไม่เปลี่ยนตัวเลข)
- `revision.get(id)` / `list()` / `current()` คืน Object แช่แข็งแบบลึก (`Object.freeze`) · แก้ Object ที่ได้ไม่มีผล
- `report.current()` ของรอบ Lock = `Snapshot.report`

## เดือนที่มีผลและเดือนล็อก

- R1 = เดือนแรกของปีแผนเสมอ · รอบถัดไปตั้งตอนเปิด: ค่าเริ่มต้น `defaultEffective` = เดือนถัดจากเดือนปัจจุบัน (`core/clock.js`) แต่ไม่ก่อนเดือนแรกของปีแผน
- ใช้ได้ (`effectiveIssue`) เมื่ออยู่ในปีแผน (เดือน 1–12) และหลังเดือนปิดล่าสุด · ~~Prototype เลือกได้เพื่อจำลองการปรับกลางปี~~ CR-41: ใช้กติการะบบจริง = เดือนถัดไปเสมอ (D-149 · D-170) ·
  Dialog `เปิด Revision ใหม่` แสดงอ่านอย่างเดียว `มีผลตั้งแต่ มี.ค. 2027 (เดือนถัดไป)` / `(เดือนแรกของปีแผน)` · เดือนปัจจุบันจากนาฬิกากลางของสถานการณ์ Demo ([demo-scenarios.md](demo-scenarios.md))
- จำนวนเดือนล็อก `lockCount(rev) = max(เดือนก่อนเดือนที่มีผล, เดือนที่ปิดแล้วของปีแผน)` · รอบ Lock แล้วใช้ `lockBefore` ที่บันทึกตอน Lock
- เดือนล็อก: เป้าหมายหน่วยขาย = บาทจาก `base.targets` (ไม่ใช่สัดส่วน) · แผน SKU = ชิ้น / Sale Amount / Net Sales จาก `base.sku` · เดือนที่เปิด = เป้าหมายทั้งปี × สัดส่วนของเดือน (`calc.revisionPhasing`)
- ส่วนต่างเมื่อเปลี่ยนเป้าหมายทั้งปีของหน่วยขาย → แสดงที่คงเหลือของเดือนที่เปิด · `รีเซ็ตเป็นค่าตั้งต้น` / `ใช้รูปแบบของ Channel` / การกระจายอัตโนมัติ เติมเฉพาะเดือนที่เปิด (`calc.fillOpenMonths`)

## ข้อบังคับห้ามแก้ย้อนหลัง (Store)

`store.set` / `store.remove` เรียก `revision.guardWrite(key, value, prev, wasSet)` ก่อนเขียนทุกครั้ง · ไม่มีบทบาทใดข้ามได้ รวมผู้ดูแลระบบ · โยน Error ข้อความจาก `labels.revision.errors`

| ปฏิเสธเมื่อ | ข้อความ |
|---|---|
| เขียน `plan.<ปี>.*` ของปีที่รอบล่าสุด `Lock แล้ว` | `แก้ไม่ได้: {ชื่อรอบ} Lock แล้ว` |
| รอบล่าสุด `รอ Lock` | `แก้ไม่ได้: {ชื่อรอบ} รอ MD Lock` |
| เปลี่ยนสัดส่วน (`phasing.<unit>`) หรือจำนวน / ช่องแก้เอง (`sku.<unit>`) ของเดือนล็อก | `แก้ไม่ได้: เดือน {เดือน} อยู่ก่อนเดือนที่มีผลของรอบนี้` · เดือนปิดแล้ว = `แก้ไม่ได้: เดือน {เดือน} ปิดแล้ว` |
| เป้าหมาย Total / Channel / หน่วยขายต่ำกว่าส่วนที่ล็อก (`calc.lockedTargetIssues`) | `แก้ไม่ได้: เป้าหมาย {ชื่อ} ต่ำกว่าส่วนที่ล็อก ({ช่วงเดือน}) {บาท} บาท` |
| ลบข้อมูลที่มีค่าในเดือนล็อก | `แก้ไม่ได้: {ชื่อ} มีค่าในเดือนที่ล็อกของรอบนี้` |
| แก้ Snapshot · แก้รายการของรอบ Lock ใน `revision.list` | `แก้ไม่ได้: Snapshot ของ {ชื่อรอบ} Lock แล้ว` · `แก้ไม่ได้: {ชื่อรอบ} Lock แล้ว` |

- การเขียนที่ค่าไม่เปลี่ยนผ่านได้เสมอ (ใช้ตอน Lock บันทึกค่าตั้งต้นที่คำนวณจาก Master ให้คงที่) · Key `plan.<ปี>.workflow.*` / `baselineVersions` (Phase 2 เดิม) ไม่ตรวจ
- `revision.assertWritable(revisionId, month)` ตรวจล่วงหน้าแบบเดียวกัน (`writable` → `locked` · `submitted` · `beforeEffective` · `closed`) · หน้าจอใช้ซ่อนปุ่มและเตือนก่อนบันทึก
- `store.reset` (ปุ่มรีเซ็ตข้อมูล) เป็นข้อยกเว้นเดียว: ล้างทั้ง Session

## วงจรสถานะ (`transition` ฟังก์ชันล้วน + `open` / `submit` / `withdraw` / `returnToDraft` / `lock`)

| คำสั่ง | สิทธิ์ (`core/permissions.js`) | ตรวจ | ผล |
|---|---|---|---|
| เปิด | `revision.open` | ไม่มีรอบเปิดอยู่ · เหตุผลบังคับ · เดือนที่มีผลใช้ได้ | รอบ `ร่าง` ลำดับถัดไป · `basedOn` = รอบ Lock ล่าสุด · คัดลอกค่า 4 ขั้นจาก Snapshot · `base` จากรายงานของรอบก่อน · เลือกรอบใหม่ |
| เสนอ Lock | `revision.submit` | 3 ข้อบังคับของการตรวจก่อนเสนอ Lock ต้องครบ | `รอ Lock` · บันทึกข้อความถึง MD · ล้าง `returnNote` |
| ถอนการเสนอ | `revision.submit` | สถานะ `รอ Lock` | `ร่าง` |
| ส่งกลับแก้ไข | `revision.lock` | สถานะ `รอ Lock` · ข้อความบังคับ | `ร่าง` + `returnNote` (แสดงในการ์ดสถานะจนกว่าจะเสนอใหม่) |
| Lock | `revision.lock` | สถานะ `รอ Lock` · พิมพ์ชื่อรอบตรง | Snapshot → บันทึกค่าทุก Key ให้คงที่ → `Lock แล้ว` |

- ตรวจก่อนเสนอ Lock (`checksFrom`): `Total = Channel` · `Channel = หน่วยขาย` · `หน่วยขาย = รายเดือน` (บังคับ) · `แผน SKU ครบเป้า` (คำเตือน · นับหน่วยขายที่ขาด) — ใช้ผลตรวจความครบถ้วนเดิมของแต่ละขั้น
- ผู้ทำ = ชื่อของผู้ใช้ที่เลือก (`components.roleName`) · `p.system` ข้ามการตรวจสิทธิ์ได้เฉพาะ `loadSample`

## Revision Compare (`calc.compareRevisions`)

- `revision.compare(aId, bId, opts)` → `revision.dataset(id)` ของแต่ละรอบ (รอบ Lock = `Snapshot.report` · อื่น = `report.build` ของรอบ) → `calc.compareRevisions(dsA, dsB, opts)` (ฟังก์ชันล้วน)
- `opts = { level: total | channel | unit | series | sku, metric: net | sale | units, view: year | month, channel, unit }`
- ระดับ Total · Channel · หน่วยขาย = เป้าหมาย (Net Sales = `targetM` ของหน่วยขาย · Sale Amount = `calc.saleFromNet` ด้วย GP ของหน่วยขาย · Channel / Total = ผลรวมของหน่วยขาย) · มุมมองทั้งปีใช้เป้าหมายทั้งปี
- ระดับ Series · SKU = แผน SKU (`report.skuItems` ชิ้น · Sale Amount · Net Sales รายเดือน) · จำนวนชิ้นใช้ได้เฉพาะ 2 ระดับนี้ · SKU ใช้ได้เมื่อเลือก Channel หรือหน่วยขาย
- คืน `{ rows: [{ id, name, a, b, diff, pct, aM, bM, dM }] (เรียง |diff| มากไปน้อย), total, max, lockBefore, effectiveMonth, newer }` · `lockBefore` / `newer` = ของรอบที่ใหม่กว่า (ปีเดียวกัน)
- กติกา: ผลรวมส่วนต่างทุกแถวของระดับเป้าหมาย = ส่วนต่างของ Total · เดือนก่อนเดือนที่มีผลของรอบที่ใหม่กว่า ส่วนต่าง = 0 · A = B → ส่วนต่าง 0 ทุกแถว

## ปุ่มรีเซ็ตข้อมูลและข้อมูลตัวอย่าง

- CR-41: เมนู `รีเซ็ตข้อมูล ▾` ถูกแทนด้วยเมนู `สถานการณ์ Demo ▾` (S1 = ข้อมูลตั้งต้นเดิม · S2 = R1 Lock แล้ว ไม่มี R2 · [demo-scenarios.md](demo-scenarios.md))
- `loadSample` เหลือเป็นข้อมูลสำหรับ Test เท่านั้น (ไม่มีในเมนู) · R1 Lock ด้วย `lockFirstRound` และคำขอของ R1 จาก `data/scenarios.js` (S2 build.r1) · R2 จาก `data/revisions.js` sample.r2
- `loadSample` เดิม (`data/revisions.js` sample · ไม่แก้ `data/seed/`): รีเซ็ต → R1 เสนอ Lock โดย Management 10 ธ.ค. 2026 → MD Lock 15 ธ.ค. 2026 → เปิด R2 มีผล เม.ย. 2027 เหตุผล `ECOM โตเกินคาดไตรมาสแรก`
  → Total 120 → 123 ล้านบาท · ECOM +4 ล้าน กระจายลง Shopee / Lazada / Tiktok ตามสัดส่วนเดิม · MT −1 ล้าน ที่ Watsons · ส่วนต่างของหน่วยขายลงเฉพาะ เม.ย.–ธ.ค. · แผน SKU ไม่เปลี่ยน (เห็นคงเหลือ ขาด / เกิน)
- `loadSample` ตั้งมุมมองผู้ใช้กลับเป็นค่าตั้งต้นของ store (เลือกบทบาทใหม่หลังโหลด)

## CR-39 Revision ใน Plan Summary + Module Approval

- ที่อยู่: แท็บ `Revision` (เดิม Revision List) และ `เปรียบเทียบ` (เดิม Revision Compare) ของ Plan Summary · ตัดกลุ่มเมนู REVISION · หน้าเดิมเป็นทางผ่านไป `#revision` / `#compare` ·
  สิทธิ์ `revisionList` / `revisionCompare` เป็นสิทธิ์ส่วนของหน้า Plan Summary (ค่าเดิมคงไว้ · ผู้ดูแลระบบ = ดู) · `revision.open` อยู่ใต้แท็บ Revision (`parent`)
- Flag `approval` เปิด: เสนอ / ถอน / Lock / ส่งกลับ ทำผ่านคำขอใน `core/approval.js` เท่านั้น ([approval.md](approval.md)) ·
  `revision.submit / withdraw / lock / returnToDraft / logEvent` ยอมเฉพาะคำสั่งที่มาจากคำขอที่กำลังทำ (`approval.authorizes`) · `guardList` ตรวจทุกการเปลี่ยนสถานะของรายการรอบ (`approval.revisionMoveOk`) ·
  สิทธิ์ย่อย `revision.submit` / `revision.lock` ไม่แสดงในเมทริกซ์ (`feature: '!approval'`) · ปิด Flag = วงจรและปุ่มของ CR-38 ในแท็บ Revision
- ข้อบังคับห้ามแก้ย้อนหลังและ Snapshot เหมือน CR-38 ทุกข้อ (Test ของ CR-38 ผ่านทั้งเปิดและปิด Flag approval)
- ประวัติ: R1 จากข้อมูลตั้งต้นเริ่มด้วย `create` (สร้างจากข้อมูลตั้งต้น · วันที่ `data/revisions.js` defaults[].createdAt) · เหตุการณ์ใหม่ `confirm` (Sales Director ยืนยัน) ·
  ชื่อเหตุการณ์ submit = ส่งขออนุมัติ · withdraw = ถอนคำขอ · lock = อนุมัติและ Lock
- ชุดสรุปของคำขอ: `revision.summary(id, compareToId)` → `calc.revisionSummary` · `revision.previousOf(id)` = รอบก่อน (basedOn → ลำดับก่อนหน้า)
- ข้อมูลตัวอย่าง (Flag approval เปิด): R1 ส่งและ Lock ผ่านคำขอ (`approval.sampleApproved`) + ความคิดเห็นของ MD

## CR-40 การแสดงสถานะของรอบ (การแสดงผลเท่านั้น · ข้อบังคับเดิม)

- โหมดดูไม่มีแถบสถานะ Revision: ป้ายข้างชื่อรอบที่หัวหน้าบอกสถานะ (สีตามป้าย 5 กลุ่ม: ร่าง neutral · รออนุมัติ warning · Lock แล้ว success) + Tooltip (`components.revisionTip`) ·
  รอบที่ไม่ใช่รอบปัจจุบัน (`openOf` หรือ `lastLocked` ของปี) = ลิงก์ `ไปรอบปัจจุบัน` (ถามก่อนทิ้งรายการที่ยังไม่บันทึก)
- โหมดแก้ไขของ Annual Target · Sub-channel Allocation · SKU Planning = แถบโหมดแก้ไขแถบเดียวรวมข้อความของรอบ (`editBanner({ revision: true })`) · ข้อความส่งกลับอยู่ใน Tooltip ของแถบและของป้าย
- `components.revisionBar` คงไว้แต่ไม่มีหน้าเรียก · รายละเอียด UI ดู [ui-standards-cr.md](ui-standards-cr.md) CR-40

## CR-41 นาฬิกากลาง · Snapshot ไม่เปลี่ยนตามนาฬิกา

- `assertWritable` / `writable` ใช้เดือนปิดล่าสุดของนาฬิกากลาง (`SP.core.clock.lastClosedMonth()` · ตามสถานการณ์ Demo) — ข้อบังคับเดิมไม่เปลี่ยน
- Snapshot เก็บเดือนปัจจุบันตอน Lock ใน `history.asOfMonth` → `calc.refClock` คำนวณยอดอ้างอิง / ค่าระบบเติมของรอบที่ Lock แล้วด้วยเดือนนั้น (สลับสถานการณ์แล้วตัวเลขของรอบไม่เปลี่ยน)
- `lockFirstRound(year, spec)` = Lock รอบแรกของปีด้วยฟังก์ชันจริง (สถานการณ์ S2 · `loadSample`) · `actualDataset(refId)` / `compare(a, 'actual')` = Revision Compare B = ยอดจริง
- เวลาที่ประทับของการกระทำ = `clock.now()` (วันที่ของสถานการณ์ + เวลาจริง)

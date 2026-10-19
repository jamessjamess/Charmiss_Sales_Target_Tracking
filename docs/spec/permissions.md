# สิทธิ์ · เมนูตามบทบาท · หน้าเริ่มต้น (`core/permissions.js`)

แยกจาก `business-rules.md` (CR-25 · ไฟล์เดิมเกิน 30 KB) · หน้าจอจัดการสิทธิ์ดู [pages/role-management.md](pages/role-management.md)

> Prototype ตรวจสิทธิ์เฉพาะฝั่งหน้าจอ (ซ่อนเมนู ลิงก์ และปุ่ม) ไม่ใช่การป้องกันข้อมูลจริง ระบบจริงต้องตรวจที่ Backend ด้วย
> (CR-31: บนหน้าจอแสดงข้อความนี้ที่คู่มือ ส่วน `สำหรับการทดสอบ` ที่เดียว)

- **ระดับสิทธิ์**
  - ไม่เห็น: ไม่อยู่ในเมนู / ขั้น / ลิงก์ และเปิดด้วย URL ได้ `ไม่มีสิทธิ์เข้าถึงหน้านี้` + ปุ่มไปหน้าเริ่มต้นของบทบาท (CR-25)
  - ดู: โหมดดู + ข้อความอ่านอย่างเดียว
  - แก้ไข
- **ขอบเขต** ทุก Channel / เฉพาะทีม: เฉพาะทีม = แก้ได้เฉพาะ Channel ที่เป็นสมาชิกทีม ณ เดือนปัจจุบันจำลอง นอกทีมเป็นดู
- **ปุ่มเฉพาะ** (เช่น สร้าง NPD · ส่งออก) มีแค่ อนุญาต / ไม่อนุญาต
- รายการสิทธิ์ = 1 รายการต่อหน้าใน registry (หน้าใหม่ได้ค่าตั้งต้นของบทบาท = ดู · ผู้ดูแลระบบแก้ไข) + สิทธิ์ย่อย:
  - CR-32 `salesUnits` (Account Master) + ส่วนของหน้า `salesUnits.gp` · `salesUnits.channelSettings` แทน `accounts` · `accounts.gp` · `accounts.channelSettings` · `territories`
    (ค่าที่บันทึกไว้เดิม = ระดับสูงสุดของ accounts / territories · สิทธิ์ย่อยย้ายค่าเดิม · `LEGACY` + `ALIASES` ใน `core/permissions.js` · หน้าเดิม `perm: 'salesUnits'`) ·
    ค่าตั้งต้น salesUnits: Director แก้ไข · Manager ดู · Officer ดู · ผู้ดูแลระบบแก้ไข · `people` คง key เดิม (ชื่อแสดง Sales Person Management)
  - CR-29 Account Master: `accounts` (Account & Platform) + ส่วนของหน้า `accounts.gp` · `accounts.channelSettings` · `territories` · `people` (บุคลากรและทีม ·
    แทน `salespeople` + `salesTeam` · ค่าที่บันทึกไว้เดิมแปลงเป็นระดับสูงสุดของสองค่าแล้วลบ Key เดิม · LEGACY ใน `core/permissions.js`) ·
    หน้าผู้รับผิดชอบ / ทีมขายเดิม `perm: 'people'` · ค่าตั้งต้น: Sales Director แก้ไขทั้งหมด · Sales Manager ดู (`accounts.channelSettings` ไม่เห็น) ·
    Sales Officer ดูเฉพาะ `territories` · บทบาทอื่นไม่เห็น · ผู้ดูแลระบบแก้ไข
  - CR-25: Permissions · Users (CR-31 · หน้า Roles ซ่อน) ใช้สิทธิ์เดียว `roleManagement` (แถว `Permissions / Users`) · คู่มือการใช้งาน (CR-28 เดิมเกี่ยวกับ Prototype · id `aboutPrototype`) เห็นทุกบทบาทเสมอ ไม่อยู่ในเมทริกซ์
  - Annual Target = `annualTarget` · Sub-channel Allocation = `unitTargets` (CR-23 แทน topdown.channel / topdown.unit / phasing — ค่าที่บันทึกไว้เดิมแปลงให้เอง ค่าที่สูงกว่า)
  - แผน SKU: สร้าง NPD
  - CR-35 Launch & Listing: `launchListing` (หน้า · แทน `npdPlan` + `listing` · ค่าที่บันทึกไว้เดิม = ระดับสูงสุดของสองค่า แล้วลบ Key เดิม · `LEGACY` + `ALIASES` ·
    ถามสิทธิ์ด้วยชื่อเดิมได้ผลของ `launchListing` · ค่าตั้งต้นของ 2 Key เดิมเท่ากันทุกบทบาท `N V V V E V N E` จึงไม่มีบทบาทใดได้สิทธิ์เปลี่ยน) + ส่วนของหน้า Clearance (`listing.clearance` คง id เดิม)
    - หน้าแผน NPD / Listing เดิม `visible: false` · `perm: 'launchListing'`
  - CR-36 Product List = `productList` (หน้า) + ส่วนของหน้า `taxonomy` (แท็บ Product Level · ค่าเดิม ทีม Product / ผู้ดูแลระบบ แก้ไข) · หน้า Category & Series เดิม `perm: 'productList'` ·
    เมนู Product Master 3 หน้า · Partner List = ชื่อใหม่ของ `salesUnits` (key คงเดิม)
    - Clearance ใช้กับแท็บ Clearance ของ Price & Promotion ด้วย: registry `alsoPerms: ['listing.clearance']` ทำให้หน้า Price & Promotion มองเห็นสำหรับผู้มีสิทธิ์ย่อยนี้ (`pageLevel`) ·
      workflowBar ของหน้าใช้ `pageModules + listing.clearance` · ผู้ไม่มีสิทธิ์ราคาเห็นเฉพาะแท็บ Clearance (Supply Chain · Test cr25-9 = เห็น 4 · แก้ไข 2)
  - CR-30 ราคาและ Promotion: `prices` (หน้า · แทน `promotionPrice` / `accountPrices` · ค่าที่บันทึกไว้เดิมย้ายให้ผ่าน `LEGACY`) + ส่วนของหน้า `prices.base` (ราคาหลัก) · `prices.promo` (Promotion Price · กำหนดขอบเขตเฉพาะทีมได้)
  - ทุกหน้า: ส่งออก (Excel / CSV / พิมพ์)
- ผู้ใช้หลายบทบาทใช้สิทธิ์สูงสุด (แก้ไข > ดู > ไม่เห็น · ทุก Channel > เฉพาะทีม) · ผู้ใช้ที่ปิดใช้งาน = ไม่เห็นทุกหน้า
- **กฎสิทธิ์ย่อย** (ปรับเองพร้อมแจ้งหลังทุกการแก้):
  - หน้าหลักไม่เห็น → สิทธิ์ย่อยไม่เห็นทั้งหมด
  - ปุ่มเฉพาะอนุญาตได้เมื่อหน้าหลักเป็นแก้ไขเท่านั้น และขอบเขตไม่กว้างกว่าหน้าหลัก
  - สิทธิ์ย่อยที่ไม่ใช่ปุ่ม (Clearance) แก้ไขได้แม้หน้าหลักเป็นดู
- บันทึกสิทธิ์ได้เมื่อยังมีผู้ใช้ที่เปิดใช้งานและแก้หน้า Role Management ได้อย่างน้อย 1 คน · เอาสิทธิ์ของตัวเองออกต้องยืนยันซ้ำ
- บทบาทตั้งต้นลบไม่ได้ (เมนูไม่มีตัวเลือกลบ) · บทบาทที่สร้างเองลบได้เมื่อไม่มีผู้ใช้ · บทบาทที่สร้างเองมี Chip `สร้างเอง` (หัวคอลัมน์ · คู่มือ)
- CR-31: `roleSummary` (เห็น n · แก้ไข m หน้า) ยังอยู่ใน `core/permissions.js` แต่ไม่แสดงบนหน้าจอแล้ว
- **ค่าตั้งต้น** (CR-25 · `data/permissions.js` ระบุครบทุกช่อง · ซ่อนหน้าที่ไม่เกี่ยวกับบทบาท แทนค่าตั้งต้นของ CR-21 ที่ทุกบทบาทเห็นทุกหน้า):
  `—` ไม่เห็น · ★ หน้าเริ่มต้น · ทุกบทบาทส่งออกได้

  | หน้า / สิทธิ์ | Mgmt | Director | Manager | Officer | Product | Supply | ผู้ดูรายงาน | ผู้ดูแลระบบ |
  |---|---|---|---|---|---|---|---|---|
  | 1 Annual Target | แก้ไข ★ | ดู | — | — | — | — | — | แก้ไข |
  | 2 Sub-channel Allocation | ดู | แก้ไข ★ | ดู | ดู | — | — | — | แก้ไข |
  | 3 SKU Planning · สร้าง NPD | ดู · – | ดู · – | แก้ไข·ทีม ★ · ✓·ทีม | แก้ไข·ทีม ★ · ✓·ทีม | — | — | — | แก้ไข · ✓ |
  | 4 Plan Summary | ดู | ดู | ดู | ดู | ดู | ดู | ดู ★ | ดู |
  | Product List · Launch & Listing (CR-35 แทนแผน NPD) | — | ดู | ดู | ดู | แก้ไข (★ Product List) | ดู (★ Product List) | — | แก้ไข |
  | ราคาและ Promotion · ราคาหลัก · Promotion Price (CR-30) | — | ดู · ดู · **แก้ไข** | ดู · ดู · **แก้ไข·ทีม** | ดู · ดู · **แก้ไข·ทีม** | ดู · **แก้ไข** · ดู | — | — | แก้ไข |
  | Clearance (CR-35 ส่วนของ Launch & Listing + แท็บ Clearance ของ Price & Promotion) | — | ดู | ดู | ดู | ดู | **แก้ไข** | — | แก้ไข |
  | Product Level (CR-36 ส่วนของหน้า Product List · key เดิม `taxonomy`) | — | — | — | — | แก้ไข | — | — | แก้ไข |
  | Account Master (CR-32 · GP = Director · Manager ดู · ตั้งค่า Channel = Director) | — | แก้ไข | ดู | ดู | — | — | — | แก้ไข |
  | Sales Person Management (people) | — | แก้ไข | ดู | — | — | — | — | แก้ไข |
  | Permissions / Users | — | — | — | — | — | — | — | แก้ไข ★ (Permissions) |

  - ค่าที่บันทึกไว้แล้วใน store ไม่ถูกแทนที่ · `คืนค่าตั้งต้น` และ `รีเซ็ตข้อมูล` ใช้ตารางนี้ · ผู้ดูแลระบบ Plan Summary = ดู ตามตาราง CR-25
- **เมนูตามบทบาท** (CR-25): หน้าไม่เห็นไม่อยู่ในเมนู · กลุ่มที่ไม่เหลือหน้าไม่มีหัวกลุ่ม · เลขขั้นของ Sales Planning คงที่ (`ขั้นที่ 3/4` แม้ขั้นที่ 1 ถูกซ่อน)
  ปุ่มก่อนหน้า/ถัดไปและลูกศรข้ามขั้นที่มองไม่เห็น (แทนกฎนับเฉพาะหน้าที่เห็นของ CR-21 ข้อ 6)
- **หน้าเริ่มต้นของบทบาท** (`roles[].homePageId` แก้ได้ที่เมนู ⋯ ของหัวคอลัมน์บทบาทในหน้า Permissions (CR-31) เลือกจากหน้าที่บทบาทเห็น):
  - ใช้เมื่อเปิด `index.html` · สลับมุมมองผู้ใช้แล้วหน้าปัจจุบันถูกซ่อน (Toast `สลับเป็น {บทบาท} · ไปที่ {หน้า}`) · ดูตัวอย่างในมุมมองนี้ · ปุ่มในหน้าไม่มีสิทธิ์
  - ผู้ใช้หลายบทบาท = หน้าเริ่มต้นของบทบาทแรกตามลำดับบทบาท (ลำดับคอลัมน์ในหน้า Permissions) · ค่าที่ตั้งไว้แต่บทบาทมองไม่เห็นแล้ว = ขั้นแรกของ Sales Planning ที่เห็น → หน้าแรกในเมนู
  - สลับมุมมองผู้ใช้แล้วหน้าปัจจุบันยังเห็น = อยู่หน้าเดิม

- สิทธิ์แก้แผน SKU มาจากการเป็นสมาชิกทีมของ Channel ไม่ใช่ผู้รับผิดชอบหน่วยขาย · ผู้รับผิดชอบใช้แสดงผลและคำนวณผลงานรายคน
- ปุ่มสลับมุมมอง = ผู้ใช้คนแรกที่มีสิทธิ์ตามลำดับบทบาท · ข้อความ `หน้านี้แก้ไขโดย …` ไม่นับผู้ดูแลระบบถ้ามีบทบาทอื่นแก้ได้
- **ผู้ใช้ ↔ บุคลากร** (CR-32): `person.userId` ที่เดียว (ผู้ใช้ไม่มี `salesPersonId` แล้ว · ค่าตั้งต้น `data/users.js` `personUsers` ผูกตอนโหลด) · `permissions.normalize`
  หา personId จาก `master.salespeople` (`personOfUser`) → ทีมและขอบเขต "เฉพาะทีม" · ผลสิทธิ์ของผู้ใช้ตัวอย่างทั้ง 18 คนเท่าเดิม · ผู้ใช้สมมติที่ส่ง `salesPersonId` มาเอง (Test) ใช้ค่านั้น ·
  `linkUser` (1:1 · ทีมผูกไม่ได้ · ผู้ใช้ที่ผูกคนอื่นแล้ว = taken) · `defaultRolesFor` (บทบาทตั้งต้นของบัญชีใหม่ตามบทบาทในทีม)

## CR-37 หน้า Bundle

- resource `bundle` (สิทธิ์หน้า · ไม่มีสิทธิ์ย่อย): `N V V V E V N E` (ทีม Product / ผู้ดูแลระบบ = แก้ไข · Sales Director / Sales Manager / Sales Officer / Supply Chain = ดู ·
  Management / ผู้ดูรายงาน = ไม่เห็น เหมือน Product List — CR ระบุ "บทบาทอื่น = ดู" ตีความเป็นบทบาทที่เห็น Product Master)
- registry `feature: 'bundle'` (CR-37): Flag ปิด = `pageLevel` NONE ทุกบทบาท · ไม่อยู่ใน `resources()` (เมทริกซ์ Permissions / Users) · ไม่อยู่ในเมนู (`registry.menu` · `permissions.menuFor`)

## CR-38 Revision · บทบาท MD

- บทบาทใหม่ `md` (MD · Managing Director · ลำดับ 9 · คอลัมน์สุดท้ายของ `ROLE_ORDER` · `system: true` · หน้าเริ่มต้น `revisionList`) · ผู้ใช้ตัวอย่าง `u-md` ธนวัฒน์ ศรีประเสริฐ (`data/users.js` · ผู้ใช้ตัวอย่าง 19 คน)
- ค่าตั้งต้นของ MD: ดู Annual Target · Sub-channel Allocation · SKU Planning · Plan Summary · Revision Compare · แก้ไข Revision List + `revision.lock` · หน้าอื่นไม่เห็น
- resource ใหม่ (registry `feature: 'revision'` · Flag ปิด = ไม่เห็นทุกบทบาท ไม่อยู่ในเมทริกซ์):

  | สิทธิ์ | Mgmt | Director | Manager | Officer | Product | Supply | ผู้ดูรายงาน | ผู้ดูแลระบบ | MD |
  |---|---|---|---|---|---|---|---|---|---|
  | Revision List (`revisionList`) | แก้ไข | ดู | ดู | ดู | ดู | ดู | ดู | แก้ไข | แก้ไข ★ |
  | ปุ่ม เปิด Revision (`revision.open`) | ✓ | – | – | – | – | – | – | – | – |
  | ปุ่ม เสนอ Lock / ถอนการเสนอ (`revision.submit`) | ✓ | – | – | – | – | – | – | – | – |
  | ปุ่ม Lock / ส่งกลับแก้ไข (`revision.lock`) | – | – | – | – | – | – | – | – | ✓ |
  | Revision Compare (`revisionCompare`) | ดู | ดู | ดู | ดู | ดู | ดู | ดู | แก้ไข | ดู |

- ผู้ดูแลระบบไม่ได้รับปุ่ม Revision ทั้ง 3 ตามค่าตั้งต้น (ให้สิทธิ์ได้ที่หน้า Permissions) · ปุ่มเฉพาะยังอยู่ใต้กฎสิทธิ์ย่อยเดิม (อนุญาตได้เมื่อหน้า Revision List เป็นแก้ไข)
- `core/revision.js` ตรวจสิทธิ์ของคำสั่งด้วย `permissions.can` (open → `revision.open` · submit / withdraw → `revision.submit` · lock / return → `revision.lock`)
- ระหว่างรอบร่างใช้สิทธิ์แก้ Sales Planning เดิม (Management Annual Target · Sales Director Sub-channel Allocation · Sales ทีมของตน SKU Planning) จำกัดเฉพาะเดือนที่เปิด ·
  ข้อบังคับห้ามแก้ย้อนหลังที่ Store ไม่ขึ้นกับสิทธิ์ (ทุกบทบาทรวมผู้ดูแลระบบ · [revision.md](revision.md))

## CR-39 Revision เป็นแท็บของ Plan Summary · Module Approval

- หน้า Revision List / Revision Compare เดิม: registry `visible: false` · `perm: 'summary'` (ทางผ่าน) · สิทธิ์ `revisionList` / `revisionCompare` เป็นสิทธิ์ส่วนของหน้า Plan Summary (`pages.summary`) ·
  ค่าเดิมคงไว้ ยกเว้นผู้ดูแลระบบ = ดู (Plan Summary ของผู้ดูแลระบบ = ดู ตาม CR-25 · แท็บไม่มีอะไรให้ผู้ดูแลระบบแก้) · สิทธิ์ย่อยที่ไม่ใช่ปุ่มสูงกว่าหน้าหลักได้
- `data/permissions.js` สิทธิ์ย่อยมีฟิลด์ใหม่ `parent` (สิทธิ์ย่อยต้นทาง · `revision.open` อยู่ใต้ `revisionList` = ปุ่มอนุญาตได้เมื่อแท็บ Revision เป็นแก้ไข) และ
  `feature` (`'!approval'` = แสดงเมื่อ Flag ปิด · `revision.submit` / `revision.lock` ของ CR-38) · `core/permissions.js` resources รองรับทั้ง 2 ฟิลด์ (ไม่ระบุ = ผลเดิม)
- หน้า `approval` (Flag `approval`) + ปุ่มเฉพาะ:

  | สิทธิ์ | Mgmt | Director | Manager | Officer | Product | Supply | ผู้ดูรายงาน | ผู้ดูแลระบบ | MD |
  |---|---|---|---|---|---|---|---|---|---|
  | Approval (`approval`) | แก้ไข | แก้ไข | ดู | ดู | ดู | ดู | ดู | แก้ไข | แก้ไข ★ |
  | ส่งขออนุมัติ / ถอนคำขอ (`approval.submit`) | ✓ | – | – | – | – | – | – | – | – |
  | ยืนยันขั้น Sales Director (`approval.sdConfirm`) | – | ✓ | – | – | – | – | – | – | – |
  | อนุมัติและ Lock (`approval.mdLock`) | – | – | – | – | – | – | – | – | ✓ |
  | ตั้งค่าขั้นอนุมัติ (`approval.config`) | ✓ | – | – | – | – | – | – | ✓ | – |

- ดำเนินการขั้นต้องมีทั้งบทบาทของขั้น (Management · Sales Director · MD) และสิทธิ์ย่อย (`approval.canStep`) → ผู้ดูแลระบบทำขั้นแทนไม่ได้แม้ให้สิทธิ์ย่อยในเมทริกซ์ ·
  ตั้งค่า = Management + ผู้ดูแลระบบ (ผู้ใช้เลือก ตาม CR ข้อ 2.2) · หน้า Approval แก้ไข = เพิ่มความคิดเห็นได้
- หน้าเริ่มต้นของ MD = Approval · คำอธิบายบทบาท MD = อนุมัติและ Lock / ส่งกลับแก้ไขคำขออนุมัติ Revision

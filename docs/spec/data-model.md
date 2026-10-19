# โครงข้อมูลและ Key ใน store

## Key ใน store

### แผนรายปี (`plan.<ปี>.*`)

ปีแผนที่เลือกเก็บที่ `app.planYear` (ตัวเลือกจาก `settings.PLAN_YEARS` 2026–2028 ค่าตั้งต้น 2027) ใช้ร่วมกันทุกหน้า เปลี่ยนปีแล้วหน้าโหลดใหม่

| Key | รูปแบบ |
|---|---|
| `topDown` | `{ total, channels: [channelId], pct: { <channelId \| unitId>: สัดส่วน }, units: { <channelId>: [unitId] } }` |
| `phasing.<unitId>` | `{ monthPct: [12], edited }` → บาทรายเดือนคำนวณจากเป้าหมายทั้งปี × สัดส่วน |
| `sku.<unitId>` | `{ method, items: { <productKey>: { startMonth, qty: [12], overrides: [12 bool], stopped } } }` = แผนครั้งแรก |
| `forecast.<unitId>` | โครงเดียวกับ `sku` ใช้ในโหมดปรับแผน **[Phase 2]** ห้ามเขียนทับแผนครั้งแรก |
| `unitNotes` | CR-27 `{ <unitId>: ข้อความ }` หมายเหตุต่อหน่วยขาย (Sub-channel Allocation · ไม่บังคับ · ไม่มีข้อความ = ไม่มี Key ของหน่วย) |
| `workflow.<step>.<unitId \| all>` | `{ status, history: [{ action, by, at, note }], snapshot, prevSnapshot }` step = topDown · phasing · sku · forecast · baseline **[Phase 2]** |
| `baselineVersions` | `[{ no, code, at, by }]` เลขฉบับรายงาน `{ปี}-BL-{nn}` **[Phase 2]** |

- ปีที่ไม่มีใน `targets.years` เริ่มจาก 0 (ใช้ `targets.defaultChannels` / `defaultUnits`)
- % เก็บความละเอียดเต็ม บาทคำนวณจาก % เสมอ
- แผน SKU ตั้งต้น = สินค้าที่ขายในหน่วยนั้น (ข้อมูลจำเป็นครบ · Listing · ขายอยู่) + สินค้าใหม่ที่วางแผนหน่วยนี้ + จำนวนชิ้นใน `data/plan-seeds.js` (เป็น Override)
- CR-34 Key รอบันทึกบนแผนร่าง `newListings` · `listingStarts` · `dropListings` · `cancelRequests` ใช้กับ Master ตอนบันทึก (ไม่เก็บลง store)
- `baseline.all.snapshot` **[Phase 2]** = `{ gp, basePrices, promoPrices, report }` ตอนล็อก (CR-30) · รายงานที่ล็อกแล้วอ่านตัวเลขทั้งหมดจาก `report`

### Master (ไม่แยกปี · ค่าตั้งต้นจาก `data/`)

| Key | เนื้อหา |
|---|---|
| `master.products` · `listings` · `taxonomy` · `basePrices` · `promoPrices` · `npdPlans` · `codeCounters` | Product Master · CR-30 ตัด `priceList` · `accountPrices` · `promotions` (ย้ายเป็นราคาหลักและ Promotion Price) · `codeCounters` = `{ <เลขนำหน้า>: รหัสสูงสุดที่เคยใช้ }` (เลขที่ใช้แล้วไม่กลับมาใช้) |
| `master.accounts` · `territories` · `salespeople` · `assignments` | Account Master และผู้รับผิดชอบรายเดือน · CR-29 Account `code` (U-{Channel}-{nnn} เก็บตอนบันทึก) · `inactiveFrom` (เดือนที่ปิดใช้งานมีผล) · Sales Person `type` ('person' \| 'team') · `endMonth` = เดือนสุดท้ายที่รับผิดชอบ · `endUndo` (ค่าเดิมสำหรับยกเลิกการสิ้นสุด) |
| `master.channels` | CR-29 Channel Master ที่แก้ที่หน้า Account & Platform (ไม่มีค่า = `data/channels.js`) · บันทึกแล้วแทน `SP.data.channels` ทั้งเว็บ (`core/store.js`) |
| `master.stores` (อ่านอย่างเดียว) · `storeAssignments` · `storeMoves` · `provinceSuggestions` | ร้านค้า TT |
| `master.customers` · `customerAssignments` | CR-32 คู่ค้าของ Account / Platform (สำนักงานใหญ่ · สาขา · Platform) + ช่วงในหน่วยขาย `{ customerId, salesUnitId, fromMonth, toMonth }` · ร้านค้า TT ยังอยู่ที่ `stores` / `storeAssignments` · `core/units.js` รวมเป็นโครงเดียว |
| `master.teams` · `roles` · `permissions` · `users` | ทีมขาย บทบาท สิทธิ์ ผู้ใช้ (ไม่มีค่าใน store = ใช้ค่าใน `data/`) |
| `master.audit` | เริ่ม `[]` ต่อท้ายด้วย `store.appendAudit` `{ entity, key, field, oldValue, newValue, by, at }` · CR-23 `entity: 'channelTarget'` (key = Channel · `year`) ตอนบันทึก Annual Target · CR-29 Account Master: `account` · `channel` · `assignment` (field owner · ค่า = ช่วงทั้งหมดของหน่วย) · `person` · `team` (ค่า = ช่วงสมาชิกของคน) · `territory` (name · active · provinces) · `store` · field `_new` / `_removed` = เพิ่ม / นำออก |

### UI (`ui.*`)

- `selection` = `{ channel, unit, aggregate: 'channel' }` ใช้ร่วมกันระหว่าง Sub-channel Allocation และ SKU Planning (ค่า 'all' เดิม = รวมทั้ง Channel)
- CR-23: `phasingChart` (false = ซ่อนกราฟรายเดือน) · `targetNotice` = `{ '<ปี>.<channelId>': at ของการเปลี่ยนเป้าหมายที่กดปิดแล้ว }`
- `planMode` = `'initial' \| 'reforecast'` **[Phase 2]**
- `currentMonth` = เดือนปัจจุบันจำลอง 0–11 (`DEMO_FORECAST_MONTH` = มี.ค.) · `store.currentKey()` = `'YYYY-MM'` · `store.today()`
  - CR-24: แยกจากเดือนปัจจุบันกลาง `settings.DEMO_CURRENT_MONTH` = '2026-09' (`core/clock.js` ใช้กับ L12M · ยอดอ้างอิง · หน้าเขตการขาย) ไม่เก็บใน store
- `role` = `{ userId, type, personId, channelId }` (ผู้ใช้ปัจจุบัน · ค่ารุ่นก่อนแปลงให้เอง · CR-32 personId ได้จาก `person.userId`)
- CR-32: `salesUnitsTab` (แท็บ Account Master: 'all' \| channelId · ลิงก์ `#<channelId>` ตั้งค่าให้) · `peopleGroupByChannel` ค่าเริ่มต้น **false** ·
  Preset คอลัมน์ของตารางคู่ค้าที่ `columnPresets.<userId>.salesUnits.<แท็บ>` (CR-33 + `version` = `SALES_UNIT_COLUMN_VERSION`) · `toast` = ข้อความแจ้งโหลดข้อมูลตั้งต้นใหม่เมื่อรุ่นข้อมูลเปลี่ยน (`content.site.dataVersionToast`)
- ค่าที่จำไว้ต่อหน้า:
  - `sidebarCollapsed` · `seriesFilter` · `productMaster.channel` (ร่วมกันหน้า Listing และราคาและ Promotion) · `masterChannel` · `skuShowLastYear`
  - CR-30 `columnPresets.<userId>.<ตาราง>` = Preset คอลัมน์ส่วนตัว `{ presets: [{ id, name, columns }], defaultId, columns }` (`core/catalog.js` · รีเซ็ตข้อมูลล้างด้วย) · `productMoreFilters` (กางแถวตัวกรองที่สอง) · `pricesTab` ('base' \| 'promo')
  - CR-29 `unitsTab` (แท็บ Account & Platform: 'all' \| channelId) · `peopleTab` ('list' \| 'monthly') · `peopleGroupByChannel` (ค่าเริ่มต้น true)
  - `summaryTab` (`null` = เปิดแท็บรายงาน) · CR-28 `statusFilter` = แท็บตัวกรองของติดตามสถานะ `'all' | 'short' | 'over' | 'ok' | 'vacant'` ·
    `guideTab` = แท็บของหน้าคู่มือ `'overview' | 'glossary'` (CR-36 ตัด `uat`)
  - CR-36 `productListTab` (`'items' | 'level'`) · `groupBy.<userId>.<productList | npd>` = เกณฑ์จัดกลุ่ม · `skuAddHandoff` = `{ unitId, key }` (Launch & Listing → เพิ่มสินค้าในแผน · อ่านครั้งเดียว)
- `toast` (CR-25) = ข้อความที่ต้องแสดงครั้งเดียวหลังโหลดหน้าถัดไป (layout ล้างเป็น `null` หลังแสดง)
- CR-26: `summaryPivot` = `{ rows, cols, value, show, filters: { series, channels, units, statuses, q } }` (ตาราง Pivot ของรายงาน) ·
  `skuSearchHandoff` = Product Code ที่ SKU Planning ค้นหาให้ครั้งเดียว (คลิกช่องใน Pivot)
  - `taxonomySelection` · `taxonomyFilters`
  - `productFilterHandoff` (หน้ารายการสินค้าอ่านครั้งเดียวแล้วลบ)
- ตัวกรอง ค้นหา จัดกลุ่ม เรียง แถวที่เลือก และแท็บย่อยอื่นเป็นตัวแปรใน Module ไม่เก็บลง store

### ผลการทดสอบ (`uat.*`)

- CR-36 ตัดทั้งหมด (คู่มือไม่มี UAT · `รีเซ็ตข้อมูล` ล้าง store ทั้งหมด)

## ข้อมูลหลัก (`data/`)

### Channel และหน่วยขาย

- Channel Master (`data/channels.js`) = `{ id, name, fullName, colorToken, allocationUnit, sellOutMethod, hasGP, active, order, unitLabel, gpLabel, priceBasis }`

  | Channel | แบ่งเป้าตาม | ชื่อหน่วยขาย (`unitLabel`) | `gpLabel` | อื่นๆ |
  |---|---|---|---|---|
  | MT | ACCOUNT | Account | GP | |
  | ECOM | ACCOUNT | Platform | Platform Fee | |
  | TT | TERRITORY | เขตการขาย | – | ไม่หัก GP · `priceBasis: 'SELL_IN'` = ราคา Dealer |
  | Export | ACCOUNT | Account | GP | `active: false` เพิ่มได้จาก `+ เพิ่ม Channel` |

  สี Channel `--ch-1` ถึง `--ch-8`
- **หน่วยขาย** (unit) = Account / เขต / Platform ตาม Channel · id ไม่ซ้ำ และใช้เป็น Key ทุกที่ (phasing · sku · listing · history · actuals)
  - เป้าหมาย ยอดขาย และประวัติผูกกับหน่วยขาย ไม่ผูกกับคน
- Account (`data/accounts.js`) = `{ id, name, channelId, active, gp, note, suggest }` · CR-32 `suggest` = คำนำหน้าชื่อคู่ค้าที่แนะนำหน่วยขายนี้ (Account ของ MT = ชื่อตัวพิมพ์ใหญ่
  ไม่มีช่องว่างและเครื่องหมาย เช่น `7ELEVEN` · `BEAUTRIUM` · ECOM ไม่มี)
- CR-32 **หน่วยขายโครงเดียว** (`units.salesUnits`) = `{ id, channelId, code, name, gp, gpLabel, hasGP, active, status, note, suggest, kind: 'account' | 'territory' }` ·
  id เดิมทุกตัว (`seven` · `eveandboy` · `TT-01` …) · `code` = U-{Channel}-{nnn} (Account · ระบบสร้าง) / id ของเขต · GP และ Platform Fee เป็นฟิลด์เดียว `gp` เรียกตาม `gpLabel`
- CR-32 **คู่ค้าโครงเดียว** (`units.customers`) = `{ id, trcloudId, name, legalName, taxId, trcloudType, kind: headOffice | branch | store | platform, channelId, province,
  priceType, isExport, isOnline, active, refL12M, isSample }` · ร้านค้า TT: trcloudId = System ID · trcloudType = ประเภทร้าน · refL12M = ยอดอ้างอิงเดิม ·
  `data/seed/seed-mt-branches.js` (ตัวอย่าง): Beautrium 10 · EVEANDBOY 10 (รายชื่อตาม CR-32) · Account อื่นของ MT รายละ 4 (`isSample` · รหัส 9000x) · สาขายังไม่จัดสรร 3 (909xx) ·
  ECOM Platform ละ 1 (9500x) · ยอดอ้างอิงของคู่ค้าที่จัดสรร = ยอด L12M ของหน่วยขายแบ่ง สำนักงานใหญ่ 5% · คลังสินค้า 20% · ที่เหลือลดหลั่น (ผลรวมเท่ายอดหน่วยขายพอดี · `units.splitRef`)
- หน่วยขายแนะนำ `calc.suggestSalesUnit(customer, units)`: Account = ข้อความก่อน `_` ตัวแรกตรงกับ `suggest` ของหน่วยเดียว · เขต = จังหวัด (Logic เดิม) · ECOM = ไม่มี
  - GP / Platform Fee เป็นสัดส่วน ค่าเดียวทั้งปี · ว่าง = ยังไม่ได้กำหนด
  - GP: 7-Eleven 40% · EVEANDBOY 45%
  - ECOM มี `Website (Own)` และ `LINE Shop` แบบ `active: false`
- ผู้รับผิดชอบรายเดือน (`data/assignments.js`) = `{ unitId, salesPersonId | null, fromMonth, toMonth | null }`
  - 1 หน่วย 1 เดือน 1 คน ช่วงห้ามทับกัน
  - ตัวอย่าง: EVEANDBOY เปลี่ยนคน มี.ค. 2027 · TT เขต 4 อัมพร ม.ค.–ก.ค. 2026 → กฤษดา ตั้งแต่ ส.ค. 2026
- Sales Person (`data/salespeople.js`) = `{ id, name, channelId | null, startMonth, endMonth, type, userId }` · CR-32 `userId` = ผู้ใช้ที่ผูก (1:1 · บุคคลเท่านั้น · แหล่งเดียว)

### ร้านค้า TT (ข้อมูลจริง)

- `data/seed/seed-tt-stores.js` สร้างจาก `รายชื่อร้านค้า_Update_พนักงานที่ดูแลเขต.xlsx` + กฎนำเข้า `data/stores.js`
  - `provinceAliases` แปลงชื่อจังหวัดที่สะกดต่าง 6 ชื่อ
  - ยอดอ้างอิงรวมปรับเป็น 22,900,000 (ร้านยอดสูงสุด 3 ร้าน +1)
  - Seasonality ของ TT
  - `data/territories.js` เป็นรายการว่าง (เขต TT มาจาก seed)
- 4 เขต:

  | เขต | พื้นที่ | ผู้รับผิดชอบ |
  |---|---|---|
  | TT-01 | เหนือ–กลาง–กทม. | สิริกาญจน์ |
  | TT-02 | อีสานตอนบน–ลาว | ฝนเทพ |
  | TT-03 | อีสานใต้–ตะวันออก | อภิญญา |
  | TT-04 | ตะวันตก–ใต้ | อัมพร (ลาออก ก.ค. 2026) → กฤษดา |
- ร้าน 211 ร้าน (CR-35 หลังรวมรหัสซ้ำ · ไฟล์ต้นทาง 220 แถว):
  - ใช้งาน 177 · ยกเลิกการขาย 34
  - ยังไม่จัดสรร ณ ก.ย. 2026 = 9 (ไม่มีจังหวัดทั้งหมด) · ไม่ระบุจังหวัด 27
  - บุคคลธรรมดา 26 ร้าน แสดงเป็น `ร้านค้า {ID} (บุคคลธรรมดา)`
  - CR-35 **รหัสคู่ค้าห้ามซ้ำ**: รหัสซ้ำในไฟล์ต้นทาง 8 รหัส (9 แถวเพิ่ม) รวมตอนโหลด (`stores.mergeDuplicates` หลังปัดยอดอ้างอิง · ไม่แก้ seed):
    ชื่อเหมือนกัน = รายการเดียว (ยอดอ้างอิงรวม · ข้อมูลและเขตของแถวแรก) · ชื่อต่างกัน = เก็บแถวที่ยอดอ้างอิงสูงกว่า · บันทึกที่ `SP.data.storeCodeMerges` = `[{ code, name, action: merged | kept, rows, salesRef }]` ·
    ข้อมูลตั้งต้นชื่อเหมือนกันทุกรหัส (merged 8) · ยอดอ้างอิงรวม TT เท่าเดิม 22,900,000 · รายชื่อรหัสอยู่ใน [open-items.md](open-items.md) · ตัด id ภายใน `{ID}-2`
  - ยอดอ้างอิงติดลบ 2 ร้าน
- ไม่นำเข้าเงื่อนไขเครดิต วงเงินเครดิต และช่องทางชำระ
- `storeAssignments` = `[{ storeId, territoryId, fromMonth, toMonth | null }]`
- `storeMoves` = `[{ at, by, to, fromMonth, storeIds, before }]`
- ยอดขายปี 2026 ของเขต = Σ ยอดอ้างอิงของร้านในเขต ณ ม.ค. ของปีแผน (7.79 / 6.59 / 4.27 / 4.24 ล้าน · ม.ค.–ส.ค. เป็นส่วนหนึ่งของ L12M เขต) และ skuQty / Run-rate ของเขตปรับตามสัดส่วนนี้

### ทีมขาย บทบาท สิทธิ์ ผู้ใช้

- `data/teams.js` = `[{ channelId, members: [{ salesPersonId, role: MANAGER | OFFICER, fromMonth, toMonth }] }]`

  | Channel | Manager | Officer |
  |---|---|---|
  | MT | อนันต์ | พิมพ์ลดา · วิทยา (ถึง ก.พ. 2027) |
  | TT | ประเสริฐ | สิริกาญจน์ · ฝนเทพ · อภิญญา · กฤษดา · อัมพร (ถึง ก.ค. 2026) |
  | ECOM | ณัฐวุฒิ | มิลิน · ต้นกล้า |
- `data/permissions.js`:
  - `SP.data.roles` = `{ id, name, description, system, order, defaultLevel, homePageId }`: บทบาทตั้งต้น 8 บทบาท (CR-38 + MD = 9) และผู้ดูแลระบบใช้ `defaultLevel: 'EDIT'`
    - CR-25 `homePageId` = หน้าเริ่มต้น (id ใน registry) · `master.roles` ที่บันทึกก่อน CR-25 ไม่มีค่า = ใช้ค่าตั้งต้นของบทบาท id เดียวกันใน data/
    - `SP.data.permissions` ระบุครบทุกช่องตามตาราง CR-25 ข้อ 3 (เขียนเป็นตาราง TABLE ใน data/permissions.js)
  - `SP.data.permissionResources` = สิทธิ์ของหน้าที่ใช้ id ต่างจากหน้า (`annualTarget` · `unitTargets` · `skuPlan` · `listing`) + สิทธิ์ย่อย + สิทธิ์ทุกหน้า (ส่งออก)
  - `SP.data.permissions` = `{ <roleId>: { <resourceId>: { level, scope } } }` เก็บเฉพาะที่ต่างจาก `defaultLevel`
- `data/users.js` = `{ id, name, roleIds, active, email }` มี 18 คน (CR-38 + `u-md` ธนวัฒน์ ศรีประเสริฐ บทบาท MD = 19 คน) (CR-32 ไม่มี `salesPersonId` · การผูกอยู่ที่ `person.userId` · ค่าตั้งต้น `SP.data.personUsers` 12 คน):
  - บทบาทละ 1 คน: วรวุฒิ · ปรียา · ชนิดา · ธีรพล · กมลวรรณ · ศิริพร
  - Sales Person ในทีมขายทุกคน (วิทยาและอัมพรปิดใช้งาน)

### Product Master · ราคา · Listing · แผน NPD

CR-35 แยกไป [data-model-products.md](data-model-products.md) (ไฟล์นี้ใกล้ 30 KB)

### ยอดขาย

- `data/history.js` → `years.<ปี>.monthly.<unitId>` + `actualMonths` (เดือนหลังจากนี้ = ประมาณการ · CR-24 ไม่ใช้ใน L12M / ยอดอ้างอิง) · ปี 2024 · 2025 · 2026 (CR-23 เพิ่ม 2024 ทุกหน่วยขาย
    และ 2024 / 2025 ของเขต TT เป็นข้อมูลสมมติแบบกำหนดตายตัว: MT ~9% ต่อปี · ECOM ~30–40% · TT ทรงตัว)
  - `years.2026.skuQty.<unitId>.<productKey>` = [12 ชิ้น] · CR-27 `years.2025.skuQty` สร้างจากยอดหน่วยขายปี 2025 × สัดส่วน SKU ปี 2026 (`seed.priorSkuQty` ดู business-rules) และ `runRate` = เฉลี่ย 3 เดือนจริงล่าสุด (มิ.ย.–ส.ค. 2026) เติมโดย `core/seed.js`
  - CR-26 `history.skuStart` = `{ <productKey>: 'YYYY-MM' }` เดือนเริ่มขายของ SKU ใน seed (ใช้กับอายุการขายเท่านั้น · `calc.skuBackfill` คำนวณยอดก่อนปี 2026 จากค่านี้)
  - 7-Eleven / EVEANDBOY ใช้รูปแบบรายเดือนจริง ยอดทั้งปี 19,800,000 / 9,900,000
  - หน่วยอื่นใช้รูปแบบ SKU ของหน่วยต้นแบบ (เฉพาะ SKU ที่ Listing) ปรับทุกเดือนให้เท่ายอดขายรายเดือนของหน่วย (ไม่สุ่ม)
- `data/actuals.js` = ยอดขายจริงสมมติปี 2027 `<unitId>.<productKey>` = [12 ชิ้น] (แผนตั้งต้น × ตัวคูณคงที่ 0.85–1.12)
- `data/plan-seeds.js` = จำนวนชิ้นที่ทีมขายปรับในแผนตั้งต้น (TT เขต 1 +1.5% · Tiktok +2% · TT เขต 3 เท่าเป้าพอดี · CR-27 สร้างใหม่ตามยอด SKU ปี 2025 และเป้าหมายใหม่)
- ห้ามสุ่มตัวเลขในข้อมูลตั้งต้น ถ้าต้องสร้างใหม่ ใช้สคริปต์ที่กำหนดผลตายตัว

## ข้อมูลตั้งต้นสำหรับนำเสนอ (ปีแผน 2027 · รีเซ็ตข้อมูลคืนค่าชุดนี้)

- Total 120,000,000 · ยอดขาย L12M รวม 114,424,720 (+4.9% = +5,575,280) — CR-24 (ก่อนหน้า ยอดขายปี 2026 113,200,000)
  - CR-27 เป้าหมายเทียบ L12M ราย Channel: MT 57.60 / 56.83 ล้าน (+1.4%) · TT 24.00 / 22.82 (+5.2%) · ECOM 38.40 / 34.77 (+10.4%) · 7-Eleven 26.50 / 24.88
- Top-down ตั้งต้น (`targets.years[2027]` · CR-27) จัดสรรครบทุกชั้น:
  - Channel 48 / 20 / 32 (ทุก Channel โตกว่า L12M)
  - หน่วยขาย = สัดส่วน L12M ปัดเป็น % เต็ม: MT 46 / 35 / 19 · TT 34 / 29 / 19 / 18 · ECOM 46 / 27 / 27
- Waterfall 114.42 → MT +0.77 → TT +1.18 → ECOM +3.63 → 120.00
- 10 หน่วยขาย · แผน SKU ตั้งต้น (ยอดอ้างอิง ม.ค.–ส.ค. 2026 · ก.ย.–ธ.ค. 2025 · CR-27 ≈ L12M ของหน่วย) รวม 110.39 ล้าน (−8.0% เทียบเป้าหมาย):
  - ขาด 7 หน่วย: 7-Eleven −6.1% (1.62 ล้าน ใช้เดโม Flow) · Watsons · EVEANDBOY −24.7% · TT เขต 2 · TT เขต 4 · Shopee · Lazada
  - เกิน 2 หน่วย: TT เขต 1 · Tiktok
  - จัดสรรครบ 1 หน่วย: TT เขต 3
- ตัวนับรายการที่ต้องดำเนินการของขั้นที่ 4 = 9
- แผน NPD · ยอดขายจริงปี 2027 · ข้อมูล ERP · Promotion เป็นข้อมูลตัวอย่างบนสินค้าจริง

## CR-37 Key ใหม่

- `ui.bundleTab` = แท็บของหน้า Bundle (`list` | `demand`) · `ui.bundleFocus` = productKey ของ Bundle ที่จะเปิด Drawer ตอนเปิดหน้า Bundle (ลิงก์ อยู่ใน Bundle · อ่านครั้งเดียวแล้วลบ)
- `master.products` ของ Bundle มี `kind` · `components` · `seriesManual` (ดู [data-model-products.md](data-model-products.md)) · `app.dataVersion` 16

## CR-38 Key ใหม่ (Revision · รายละเอียดที่ [revision.md](revision.md))

- `revision.list` = รายการ Revision ทุกปี (ค่าตั้งต้น `data/revisions.js` defaults = `2027 R1 ร่าง` มีผล ม.ค. 2027) · ฟิลด์ดู revision.md
- `revision.snap.<id>` = Snapshot ตอน Lock (`plan` · `master` · `channels` · `history` · `report` · `base` · `lockBefore` · `checks`) · สร้างครั้งเดียว แก้ / ลบไม่ได้ (ยกเว้น `store.reset`)
- `plan.<ปี>.*` = ข้อมูลของรอบล่าสุดของปี (R1 = Key เดิม ตัวเลขเท่าก่อน CR) · รอบที่ Lock แล้วอ่านจาก Snapshot · Store ตรวจข้อบังคับห้ามแก้ย้อนหลังทุกครั้งที่เขียน
- `ui.revision` = id ของรอบที่เลือกใน Sales Planning (`null` = รอบร่าง / รอ Lock ของปี → รอบ Lock ล่าสุด) · เลือกแล้ว `app.planYear` = ปีของรอบ
- `ui.revisionCompare` = `{ a, b }` จาก Revision List (อ่านครั้งเดียว) · `ui.revisionCompareOpts` = ตัวเลือกล่าสุดของ Revision Compare (`a · b · level · metric · view · channel · unit`)
- `data/revisions.js` = `{ defaults: [{ planYear }], sample: { year, r1: { history }, r2: { effectiveMonth, reason, userId, at, total, channelDelta, unitDelta } } }` (ข้อมูลเท่านั้น ไม่แก้ `data/seed/`)
- `app.dataVersion` 17

## CR-39 Key ใหม่ (Approval · รายละเอียดที่ [approval.md](approval.md))

- `approval.requests` = คำขออนุมัติทุกรายการ (ไม่มี = []) · `approvalConfig.revisionLock` = `{ sdConfirm }` (ค่าตั้งต้น `data/approvals.js` config)
- `ui.approvalTab` = แท็บของหน้า Approval (`mine` | `all` | `settings`) · `ui.approvalOpen` = id ของคำขอที่จะเปิด (ส่งต่อจากแท็บ Revision · อ่านครั้งเดียว)
- `ui.summaryTab` เพิ่มค่า `revision` · `compare` (CR-39 แท็บของ Plan Summary)
- CR-41: `app.scenario` = สถานการณ์ Demo (`S1` | `S2` · ไม่มี = S1 · นาฬิกาอ่าน sessionStorage เอง) · `app.dataVersion` 19 · ยอดจริงตัวอย่าง `history.years[ปี].sample` (12 bool) ·
  Snapshot `history.asOfMonth` · `data/scenarios.js` · รายละเอียดที่ [demo-scenarios.md](demo-scenarios.md)
- CR-40 (การแสดงผลเท่านั้น · ไม่เปลี่ยน `app.dataVersion`): `ui.skuFilters` = `{ age, noSale, node, nodeLevel, planType, kind }` ตัวกรองเพิ่มเติมของ SKU Planning ·
  `ui.skuFilterPanel` = แผงตัวกรองเปิดอยู่ (true/false) · `ui.sidebarCollapsed` เดิม (ปุ่มพับเป็นไอคอนที่กล่องโลโก้)
- `data/approvals.js` = `{ config: { revisionLock: { sdConfirm } }, sample: { r1: { comments: [{ userId, at, text }] } } }` (ข้อมูลเท่านั้น · ไม่แก้ `data/seed/` · ผู้ใช้เลือก)
- `data/revisions.js` defaults[].createdAt = วันที่ของรายการ สร้างจากข้อมูลตั้งต้น ในประวัติของ R1 · `revision.history[].action` เพิ่ม `create` · `confirm`
- `app.dataVersion` 18

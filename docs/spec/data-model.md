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
| `workflow.<step>.<unitId \| all>` | `{ status, history: [{ action, by, at, note }], snapshot, prevSnapshot }` step = topDown · phasing · sku · forecast · baseline **[Phase 2]** |
| `baselineVersions` | `[{ no, code, at, by }]` เลขฉบับรายงาน `{ปี}-BL-{nn}` **[Phase 2]** |

- ปีที่ไม่มีใน `targets.years` เริ่มจาก 0 (ใช้ `targets.defaultChannels` / `defaultUnits`)
- % เก็บความละเอียดเต็ม บาทคำนวณจาก % เสมอ
- แผน SKU ตั้งต้น = สินค้าที่ขายในหน่วยนั้น (ข้อมูลจำเป็นครบ · Listing · ขายอยู่) + สินค้าใหม่ที่วางแผนหน่วยนี้ + จำนวนชิ้นใน `data/plan-seeds.js` (เป็น Override)
- `baseline.all.snapshot` **[Phase 2]** = `{ gp, priceList, accountPrices, promotions, report }` ตอนล็อก · รายงานที่ล็อกแล้วอ่านตัวเลขทั้งหมดจาก `report`

### Master (ไม่แยกปี · ค่าตั้งต้นจาก `data/`)

| Key | เนื้อหา |
|---|---|
| `master.products` · `listings` · `taxonomy` · `priceList` · `accountPrices` · `promotions` · `npdPlans` | Product Master |
| `master.accounts` · `territories` · `salespeople` · `assignments` | Account Master และผู้รับผิดชอบรายเดือน |
| `master.stores` (อ่านอย่างเดียว) · `storeAssignments` · `storeMoves` · `provinceSuggestions` | ร้านค้า TT |
| `master.teams` · `roles` · `permissions` · `users` | ทีมขาย บทบาท สิทธิ์ ผู้ใช้ (ไม่มีค่าใน store = ใช้ค่าใน `data/`) |
| `master.audit` | เริ่ม `[]` ต่อท้ายด้วย `store.appendAudit` `{ entity, key, field, oldValue, newValue, by, at }` · CR-23 `entity: 'channelTarget'` (key = Channel · `year`) ตอนบันทึก Annual Target |

### UI (`ui.*`)

- `selection` = `{ channel, unit, aggregate: 'channel' }` ใช้ร่วมกันระหว่าง Sub-channel Allocation และ SKU Planning (ค่า 'all' เดิม = รวมทั้ง Channel)
- CR-23: `phasingChart` (false = ซ่อนกราฟรายเดือน) · `targetNotice` = `{ '<ปี>.<channelId>': at ของการเปลี่ยนเป้าหมายที่กดปิดแล้ว }`
- `planMode` = `'initial' \| 'reforecast'` **[Phase 2]**
- `currentMonth` = เดือนปัจจุบันจำลอง 0–11 (`DEMO_FORECAST_MONTH` = มี.ค.) · `store.currentKey()` = `'YYYY-MM'` · `store.today()`
  - CR-24: แยกจากเดือนปัจจุบันกลาง `settings.DEMO_CURRENT_MONTH` = '2026-09' (`core/clock.js` ใช้กับ L12M · ยอดอ้างอิง · หน้าเขตการขาย) ไม่เก็บใน store
- `role` = `{ userId, type, personId, channelId }` (ผู้ใช้ปัจจุบัน · ค่ารุ่นก่อนแปลงให้เอง)
- ค่าที่จำไว้ต่อหน้า:
  - `sidebarCollapsed` · `seriesFilter` · `productMaster.channel` · `productColumns` · `masterChannel` · `skuShowLastYear`
  - `summaryTab` (`null` = เปิดแท็บรายงาน)
  - `taxonomySelection` · `taxonomyFilters`
  - `productFilterHandoff` (หน้ารายการสินค้าอ่านครั้งเดียวแล้วลบ)
- ตัวกรอง ค้นหา จัดกลุ่ม เรียง แถวที่เลือก และแท็บย่อยอื่นเป็นตัวแปรใน Module ไม่เก็บลง store

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
- Account (`data/accounts.js`) = `{ id, name, channelId, active, gp, note }`
  - GP / Platform Fee เป็นสัดส่วน ค่าเดียวทั้งปี · ว่าง = ยังไม่ได้กำหนด
  - GP: 7-Eleven 40% · EVEANDBOY 45%
  - ECOM มี `Website (Own)` และ `LINE Shop` แบบ `active: false`
- ผู้รับผิดชอบรายเดือน (`data/assignments.js`) = `{ unitId, salesPersonId | null, fromMonth, toMonth | null }`
  - 1 หน่วย 1 เดือน 1 คน ช่วงห้ามทับกัน
  - ตัวอย่าง: EVEANDBOY เปลี่ยนคน มี.ค. 2027 · TT เขต 4 อัมพร ม.ค.–ก.ค. 2026 → กฤษดา ตั้งแต่ ส.ค. 2026
- Sales Person (`data/salespeople.js`) = `{ id, name, channelId | null, startMonth, endMonth }`

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
- ร้าน 220 ร้าน:
  - ใช้งาน 185 · ยกเลิกการขาย 35
  - ยังไม่จัดสรร ณ ก.ย. 2026 = 9 (ไม่มีจังหวัดทั้งหมด) · ไม่ระบุจังหวัด 30
  - บุคคลธรรมดา 29 ร้าน แสดงเป็น `ร้านค้า {ID} (บุคคลธรรมดา)`
  - System ID ซ้ำ 8 ID (9 แถว) → id ภายใน `{ID}-2`
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
  - `SP.data.roles` = `{ id, name, description, system, order, defaultLevel }`: บทบาทตั้งต้น 8 บทบาท และผู้ดูแลระบบใช้ `defaultLevel: 'EDIT'`
  - `SP.data.permissionResources` = สิทธิ์ของหน้าที่ใช้ id ต่างจากหน้า (`annualTarget` · `unitTargets` · `skuPlan` · `listing`) + สิทธิ์ย่อย + สิทธิ์ทุกหน้า (ส่งออก)
  - `SP.data.permissions` = `{ <roleId>: { <resourceId>: { level, scope } } }` เก็บเฉพาะที่ต่างจาก `defaultLevel`
- `data/users.js` = `{ id, name, salesPersonId | null, roleIds, active }` มี 18 คน:
  - บทบาทละ 1 คน: วรวุฒิ · ปรียา · ชนิดา · ธีรพล · กมลวรรณ · ศิริพร
  - Sales Person ในทีมขายทุกคน (วิทยาและอัมพรปิดใช้งาน)

### Product Master (ข้อมูลจริง)

- `data/seed/seed-charmiss.js` สร้างจาก `Sales_Planning_2026_R2.xlsx` (ฉบับที่ 2 ราคารวม VAT)
- สินค้า 120 รายการ:
  - จริง 117: Active 58 · NPD-2025 18 (เปิดตัว 1 ต.ค. 2025) · Discontinued 41
  - สินค้าใหม่ 2027 อีก 3 รายการ: `NPD_2027Q2_01..03` เปิดตัว 1 มิ.ย. 2027 ชื่อลงท้าย "(ชื่อชั่วคราว)" กำหนดใน `data/products.js`
- ฟิลด์: `{ trCode, tempCode, tempCodeHistory, internalCode, barcode, name, nameEn, shortName, categoryId, subCategoryId, typeId, inferred,
  seriesId, subSeriesId, itemType, packSize, uom, image, launchDate, discontinueMonth, clearance, source, request, note }`
- `productKey` = TR Code ถ้ามี ไม่มีใช้รหัสชั่วคราว `NPD_{ปี}Q{ไตรมาส}_{ลำดับ}` ใช้อ้างสินค้าทุกที่
- การแปลงตอนนำเข้า:
  - Campaign → Series 8 รายการ · `Existing` ไม่ใช่ Series (5 SKU คิ้วและไพรเมอร์ จึงขาดข้อมูลจำเป็น)
  - หมวดสินค้ากำหนดจากคำในชื่อ (`inferred: true` ป้าย "ระบบกำหนด") และขนาดบรรจุอ่านจากชื่อ
- หมวดสินค้า (`data/taxonomy.js`): Category Face · Cheek · Lip · Eye · Skincare → Sub Category → Type / Series → Sub Series
  (Series มีวันเริ่ม / วันสิ้นสุดได้)
- ไม่มี Tester / Gift / Premium และ Clearance ในข้อมูลจริง · Sales Planning ใช้เฉพาะ `itemType = SALE`
- สินค้าที่ Sales สร้าง: `source: 'SALES_REQUEST'` · `requestedBy` · `requestedAt` · `request = { unitId, unitIds, price, launchDate, startMonth, note }`

### ราคาและ Listing

- ราคาทุกรายการรวม VAT (`PRICE_INCLUDES_VAT = true`)
- Price List (`data/pricing.js`) = `{ productKey, priceType: RSP | SELL_IN, channelId, accountId, price, effectiveFrom, effectiveTo }`
  - เพิ่มราคาใหม่แล้วช่วงราคาเดิมปิดเอง ไม่เขียนทับ
  - ตัวอย่าง: Perfect Heart Cushion 399 → 429 (TT 220 → 240) ตั้งแต่ 1 ก.ค. 2027
- ราคาต่อ Account `accountPrices` = `{ productKey, accountId, price }` ราคาเดียวทั้งปี (Juicy Pop Tint 02 / 05 ที่ 7-Eleven 149 บาท)
- Promotion (`data/promotions.js`) = `{ id, name, productKey, accountIds, startDate, endDate, mode: PRICE | DISCOUNT_PCT, value, promoGpPct, status }`
  ใช้เฉพาะเมื่อเปิด Flag `promotionCalendar` **[Phase 2]**
- Listing (`data/listings.js`) = `{ productKey, accountId, addedBy?, addedAt?, fromMonth? }`
  - 7-Eleven 11 · EVEANDBOY 76 SKU จาก Excel
  - หน่วยอื่นใช้รายการของหน่วยต้นแบบ แล้วตัดประเภทสินค้าหรือ Series ที่กำหนดไว้ (TT ไม่มี Palette และ Toner · Watsons ไม่มี Toner · Lazada ไม่มีดินสอเขียนคิ้ว)
  - `addedBy: 'SALES'` = Listing ที่ Sales สร้าง
- แผน NPD (`data/npd.js`) = `{ id, productKey, seriesId, stage: plan | concept | production | ready, plannedLaunchDate, plannedAccounts: [{ accountId, plannedStartMonth }], note, workflow }`
- ข้อมูล ERP ตัวอย่าง (`data/erp-snapshot.js`) ใช้กับปุ่มเปรียบเทียบกับ ERP ในหน้ารายการสินค้า

### ยอดขาย

- `data/history.js` → `years.<ปี>.monthly.<unitId>` + `actualMonths` (เดือนหลังจากนี้ = ประมาณการ · CR-24 ไม่ใช้ใน L12M / ยอดอ้างอิง) · ปี 2024 · 2025 · 2026 (CR-23 เพิ่ม 2024 ทุกหน่วยขาย
    และ 2024 / 2025 ของเขต TT เป็นข้อมูลสมมติแบบกำหนดตายตัว: MT ~9% ต่อปี · ECOM ~30–40% · TT ทรงตัว)
  - `years.2026.skuQty.<unitId>.<productKey>` = [12 ชิ้น] (ไม่มีปี 2025 → ยอดอ้างอิง SKU เดือน ก.ย.–ธ.ค. ใช้ค่าปี 2026 และติดจุด) และ `runRate` = เฉลี่ย 3 เดือนจริงล่าสุด (มิ.ย.–ส.ค. 2026) เติมโดย `core/seed.js`
  - 7-Eleven / EVEANDBOY ใช้รูปแบบรายเดือนจริง ยอดทั้งปี 19,800,000 / 9,900,000
  - หน่วยอื่นใช้รูปแบบ SKU ของหน่วยต้นแบบ (เฉพาะ SKU ที่ Listing) ปรับทุกเดือนให้เท่ายอดขายรายเดือนของหน่วย (ไม่สุ่ม)
- `data/actuals.js` = ยอดขายจริงสมมติปี 2027 `<unitId>.<productKey>` = [12 ชิ้น] (แผนตั้งต้น × ตัวคูณคงที่ 0.85–1.12)
- `data/plan-seeds.js` = จำนวนชิ้นที่ทีมขายปรับในแผนตั้งต้น (TT เขต 1 +1.5% · Tiktok +2% · TT เขต 3 เท่าเป้าพอดี)
- ห้ามสุ่มตัวเลขในข้อมูลตั้งต้น ถ้าต้องสร้างใหม่ ใช้สคริปต์ที่กำหนดผลตายตัว

## ข้อมูลตั้งต้นสำหรับนำเสนอ (ปีแผน 2027 · รีเซ็ตข้อมูลคืนค่าชุดนี้)

- Total 120,000,000 · ยอดขาย L12M รวม 114,424,720 (+4.9% = +5,575,280) — CR-24 (ก่อนหน้า ยอดขายปี 2026 113,200,000)
  - L12M ราย Channel: MT 56.83 ล้าน (−5.0%) · TT 22.82 (+5.2%) · ECOM 34.77 (+20.8%) · 7-Eleven 24.88
- Top-down ตั้งต้น (สัดส่วนที่เก็บใน `targets.years[2027]` ตั้งจากยอดขายปี 2026 เดิม CR-24 ไม่เปลี่ยน) จัดสรรครบทุกชั้น:
  - Channel 45 / 20 / 35
  - MT 41 / 39 / 20 · TT 34 / 29 / 19 / 18 · ECOM 45 / 25 / 30
- Waterfall 114.42 → MT −2.83 → TT +1.18 → ECOM +7.23 → 120.00
- 10 หน่วยขาย · แผน SKU ตั้งต้น (ยอดอ้างอิงตรงๆ = ค่าปี 2026 ทุกเดือน) รวม 109.09 ล้าน (−9.1% เทียบเป้าหมาย):
  - ขาด 7 หน่วย: 7-Eleven −10.6% (2.34 ล้าน ใช้เดโม Flow) · Watsons · EVEANDBOY −27.6% · TT เขต 2 · TT เขต 4 · Shopee · Lazada
  - เกิน 2 หน่วย: TT เขต 1 · Tiktok
  - จัดสรรครบ 1 หน่วย: TT เขต 3
- ตัวนับรายการที่ต้องดำเนินการของขั้นที่ 4 = 9
- แผน NPD · ยอดขายจริงปี 2027 · ข้อมูล ERP · Promotion เป็นข้อมูลตัวอย่างบนสินค้าจริง

# ธีม · โครงหน้า · ป้ายสถานะ · ไอคอน (CR-40)

ธีมตามแนวระบบ KOL Management ของ Charmiss: พื้นเทาอ่อน · การ์ดขาวมุมโค้ง · สีหลักชมพูแดง · หัวหน้าแบบแถบไล่สีชมพูอ่อนพร้อม Breadcrumb · แท็บแบบขีดเส้นใต้ · ป้ายสถานะพื้นสีอ่อน
มาตรฐานอื่น (คำศัพท์ · ตัวเลข · โหมดดู/แก้ไข · Component) อยู่ที่ [ui-standards.md](ui-standards.md) · กราฟอยู่ที่ [ui-charts.md](ui-charts.md)

## 1. Token สี (`styles/tokens.css` ที่เดียว)

**ใช้ Token สีเท่านั้น** — ห้ามเขียนค่าสี (`#xxxxxx` · `rgb(` · `rgba(`) ในไฟล์อื่น (`modules/` · `core/` · `styles/` ยกเว้น `tokens.css`) · Test `cr40-1` ตรวจทุกไฟล์

ค่าสีมาจาก Repo ของ KOL Management (`charmiss-kol-affiliate-tracking/src/styles.css`) แทนค่าประมาณจากภาพใน CR · แถบไล่สีของหัวหน้าใช้ค่าจาก CR (Repo ไม่มี)

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--bg` | `#f6f7f9` | พื้นหลังหน้า |
| `--surface` · `--surface-2` | `#ffffff` · `#f2f4f7` | การ์ด ตาราง เมนูข้าง แถบบน · พื้นรอง / Hover |
| `--border` · `--border-strong` | `#e4e7ec` · `#d0d5dd` | เส้นขอบการ์ดและตาราง · ขอบปุ่มและช่องกรอก |
| `--text` · `--text-2` · `--text-muted` | `#101828` · `#344054` · `#667085` | ข้อความหลัก · ข้อความในเมนูและปุ่มรอง · ข้อความรอง |
| `--primary` · `--primary-hover` · `--primary-soft` | `#c2185b` · `#a3144c` · `#fdeef4` | ปุ่มหลัก เมนูที่เลือก แท็บที่เลือก ลิงก์ · พื้นเมนูที่เลือก พื้นป้ายสีหลัก |
| `--header-gradient` | `linear-gradient(90deg, #fce4ec 0%, #fff5f8 70%, #ffffff 100%)` | การ์ดหัวหน้า |
| `--success` / `-soft` | `#067647` / `#ecfdf3` | ครบ · ใช้งาน · Lock แล้ว |
| `--warning` / `-soft` | `#b54708` / `#fffaeb` | เกิน · รออนุมัติ · ข้อมูลที่ต้องตรวจ |
| `--danger` / `-soft` | `#b42318` / `#fef3f2` | ขาด · ข้อผิดพลาด · ป้ายตัวเลขแจ้งเตือนในเมนู |
| `--neutral` / `-soft` | `#344054` / `#f2f4f7` | ร่าง · ปิดใช้งาน · ยังไม่กำหนด |
| `--radius-card` · `--radius-control` · `--radius-pill` | `12px` · `8px` · `999px` | การ์ด · ปุ่ม/ช่องกรอก · ป้าย |
| `--shadow-card` · `--shadow-pop` | เงาบาง · เงาของ Popover / รายการค้นหา | |
| `--row-hover-overlay` | ชั้นโปร่งบางทับสีพื้นเดิมของช่อง | Hover แถวตาราง (ช่องสีสถานะยังเห็นสีเดิม) |

- **ชื่อเดิมเป็นชื่อแทน (Alias):** `--c-bg` · `--c-surface` · `--c-text` · `--c-primary` · `--c-primary-strong` · `--c-primary-soft` · `--c-success-bg/fg` · `--c-warn-bg/fg` · `--c-danger-bg/fg` · `--radius` · `--radius-sm` ชี้ไป Token ของธีม — CSS เดิมใช้ต่อได้ ไฟล์ใหม่ใช้ชื่อของธีม
- **สีข้อมูลคงค่าเดิม (ไม่อ้าง Token ของธีม):** Channel `--ch-1..8` (ชื่อตาม CR `--ch-mt` · `--ch-tt` · `--ch-ecom` ชี้ `--ch-1..3`) · กราฟ `--chart-*` · `--c-bar` · `--c-td` · `--c-split-*` · Waterfall `--wfc-*` · ประเภทสินค้าในแผน `--c-type-*` · Series `--ser-*` · ผู้รับผิดชอบ `--person-*` · ขั้น NPD `--npd-*` · ที่มาของช่อง `--c-src-*`
- `--primary` (#c2185b) กับสี MT `--ch-1` (#8c2f5d) อยู่ในโทนชมพูแดงเหมือนกัน แต่ความสว่างต่างกันชัด (MT เข้มกว่า) · คงสี MT ไว้ตาม CR

## 2. โครงหน้า

```
┌ เมนูข้าง (เต็มความสูง) ┐┌ แถบบน: [ค้นหาหรือไปที่หน้า…] [Prototype] ……… (ศ) ชื่อ / บทบาท ▾ · คู่มือ · รีเซ็ตข้อมูล ▾ ┐
│ (โลโก้) Sales Target   ││ ┌ หัวหน้า (การ์ดไล่สี ≤ 88px) ───────────────────────────────────────────────────┐ │
│         Planning  [⊟] ││ │ Sales Planning › SKU Planning                                                      │ │
│ SALES PLANNING        ││ │ SKU Planning (?) 2027 · R2 [ร่าง] ▾ …… ดูอย่างเดียว · แก้ไขได้โดย … [ส่งออก ▾] [แก้ไข] │ │
│ (1) Annual Target     ││ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ …                     ││ เนื้อหา                                                                              │
│ v0.40 · Prototype     ││ [← ก่อนหน้า]                                                           [ถัดไป →]     │
└───────────────────────┘└──────────────────────────────────────────────────────────────────────────────────────┘
```

**แถบบน** (`core/layout.js` buildHeader · อยู่ในคอลัมน์เนื้อหา ติดบนเมื่อเลื่อน · สูง `--header-h` 52px)
- ซ้าย: ☰ (เฉพาะจอ < 1024px) · ช่องค้นหาเมนู `ค้นหาหรือไปที่หน้า…` · ป้าย `Prototype`
- ช่องค้นหาเมนู: กรองรายการเมนูที่ผู้ใช้เห็น (ชื่อในเมนู · ชื่อเต็ม · ชื่อกลุ่ม) · รายการ = ไอคอน · ชื่อ · กลุ่ม · ↑ ↓ เลือก · Enter / คลิก = ไปหน้า · Esc = ล้างและปิด · ไม่พบ = `ไม่พบหน้าที่ตรงกับคำค้น`
- ขวา: มุมมองผู้ใช้เป็น Avatar วงกลม (ตัวอักษรแรกของชื่อ ข้ามสระหน้า เ แ โ ใ ไ) + ชื่อ + บทบาท 2 บรรทัด + ▾ · Dropdown เดิมวางทับแบบโปร่งใส (เลือกได้เหมือนเดิม · Tooltip = มุมมองผู้ใช้ (จำลองสำหรับการนำเสนอ)) · ลิงก์ `คู่มือ` (ไอคอนหนังสือ) · `รีเซ็ตข้อมูล ▾`
- หน้าที่ไม่มีเมนูข้าง (หน้า Test) แสดงชื่อระบบแทนช่องค้นหา

**เมนูข้าง** (buildSideMenu · กว้าง `--side-w` 248px · พับ 56px)
- บนสุด: กล่องโลโก้ (ไอคอน `target` บนพื้นสีหลัก + `Sales Target Planning` / `Charmiss`) · ปุ่มพับเมนูแบบไอคอน (`panel-left-close` / `panel-left-open`) มุมขวา แทนปุ่ม `« พับเมนู` ด้านล่าง
- หัวกลุ่ม: ตัวพิมพ์ใหญ่ ตัวเล็ก `--text-muted` · รายการ: ไอคอน + ชื่อ (ยาวเกินขึ้นบรรทัดที่ 2 ตาม CR-39) · ที่เลือก = พื้น `--primary-soft` ตัวอักษรและไอคอน `--primary`
- ป้ายตัวเลขแจ้งเตือน (Plan Summary · Approval) ชิดขวา พื้น `--danger` ตัวอักษรขาว
- ล่างสุด: `v0.40 · Prototype` (`content.site.version`)
- พับแล้ว: เหลือไอคอน + Tooltip ชื่อหน้า (title ของลิงก์) · โลโก้กับปุ่มขยายเรียงแนวตั้ง · ไม่มีหัวกลุ่ม ป้ายตัวเลข และเวอร์ชัน
- จอ < 1024px: เมนูเลื่อนออกด้วย ☰ เต็มความสูง (ไม่มีปุ่มพับ)

**หัวหน้า** (buildIntro · `.page-intro.page-head`)
- การ์ดพื้น `--header-gradient` มุม `--radius-card` สูงไม่เกิน 88px (ตรวจทุกหน้าในเมนู)
- บรรทัดแรก: Breadcrumb `<ชื่อกลุ่มเมนู> › <ชื่อหน้าในเมนู>` ตัวเล็ก (`site.groups` · `.page-crumb`)
- บรรทัดที่สอง: ชื่อหน้า · ปุ่ม `?` · ตัวเลือกปี / Revision / `ข้อมูล ณ เดือน` · ข้อความ `ดูอย่างเดียว · แก้ไขได้โดย …` + ปุ่ม `ส่งออก` · `แก้ไข` / `บันทึก` · `ยกเลิก` ชิดขวา (workflowBar ของ Module ต่อท้ายบรรทัดเดิม)
- **ไม่มีคำอธิบายใต้หัวข้อทุกหน้า:** ข้อความเดิมย้ายเป็นบรรทัดแรกในปุ่ม `?` (`content.pages.<id>.helpLead` · `components.pageHelp`) · ไม่มี key `lead` ใน content.js · หน้าคู่มือไม่มีปุ่ม `?` (CR-28)
- พิมพ์: หัวหน้าเป็นชื่อหน้าธรรมดา ไม่มี Breadcrumb (`styles/print.css`)

**แท็บระดับหน้า** (`components.tabs` · Component ใหม่ รูปแบบเดียวกับ `segmented` + `count`)
- ขีดเส้นใต้: ข้อความ `--text-muted` ตัวหนา · แท็บที่เลือก `--primary` + เส้นใต้ 2px · เส้นฐาน `--border`
- ตัวนับเป็นตัวเลขเล็กสีเทาต่อท้าย (`รอฉันดำเนินการ 2` · `ทั้งหมด 5` · `MT 51`) — ข้อความแท็บไม่มีวงเล็บจำนวนแล้ว
- ใช้กับ: Plan Summary (รายงาน · ติดตามสถานะ · Revision · เปรียบเทียบ) · Approval · Product List · Bundle · Launch & Listing · Price & Promotion · Partner List (Channel) · Sales Person Management · คู่มือ
- ปุ่มสลับค่า (จำนวนชิ้น | Sale Amount | Net Sales · จัดกลุ่ม · ตัวกรองสถานะของแท็บติดตามสถานะ · แท็บใน Drawer) ยังเป็น `segmented` · ตัวที่เลือก = พื้น `--primary-soft` ตัวอักษร `--primary` ตัวหนา

**การ์ด · ตาราง · ปุ่ม**
- การ์ด: พื้น `--surface` · ขอบ `--border` · มุม `--radius-card` · เงา `--shadow-card` · Popover / Dialog มุม 12px เงา `--shadow-pop`
- หัวตาราง (`.data-table`): พื้นขาว ตัวอักษร `--text-muted` ตัวหนา เส้นใต้ `--border-strong` · แถวคั่นด้วย `--border` · Hover = ชั้นโปร่ง `--row-hover-overlay`
- ปุ่มหลัก: พื้น `--primary` ตัวอักษรขาว มุม `--radius-control` · Hover `--primary-hover` · ปุ่มรอง: พื้นขาว ขอบ `--border-strong` (ค่าเดียวกับ Repo KOL) · ปุ่มข้อความ / ลิงก์: `--primary`

## 3. ป้ายสถานะ (Pill)

ทุกป้ายเป็น Pill พื้นสีอ่อน ตัวอักษรสีเข้มของกลุ่มเดียวกัน **ไม่มีเส้นขอบ**

| กลุ่ม | ป้าย | class / Token |
|---|---|---|
| success | ใช้งาน · Active · ครบ · จัดสรรครบ · Lock แล้ว · ข้อมูลครบ · อนุมัติแล้ว | `tag-ok` · `alert-ok` · `st-active` · `rev-locked` · `ap-approved` · `--c-wf-approved-*` |
| warning | รออนุมัติ · เกิน · จะสิ้นสุด · ข้อมูลที่ต้องตรวจ · ขาดที่ควรมี | `tag-warn` · `alert-over` · `rev-submitted` · `ap-pending` · `checks-chip` / `data-check.has-issues` |
| danger | ขาด · ขาดจำเป็น · ไม่มีผู้รับผิดชอบ · Delete (ขีดฆ่า) · ส่งกลับแก้ไข | `tag-danger` · `alert-short` · `st-delete` · `ap-returned` |
| primary | NPD · Planned · Listing ใหม่ · ขั้นปัจจุบัน | `tag-primary` · `st-new` · `st-planned` · `type-badge.is-newListing` / `is-npdConfirmed` · `ap-step-chip` |
| neutral | ร่าง · ปิดใช้งาน · ยังไม่กำหนด · Discontinued · สิ้นสุด · ถอนคำขอ | `tag-muted` · `alert-empty` · `st-discontinued` · `rev-draft` · `ap-withdrawn` · `history-tag` |

- พิเศษ: `Request` = พื้นขาว ขอบประสีหลัก (`st-request` · `type-badge.is-npdRequest` · ป้ายชื่อ/รหัสชั่วคราว) · `Clearance` คงสีส้มของ Clearance (`--c-st-clearance-*` = `--c-src-clearance-*`) · Bundle คงสีเขียวน้ำทะเล
- เส้นเวลา Status ของสินค้า (`.status-cell`): Planned มีขอบประเพื่อแยกจาก New (ทั้งสองอยู่กลุ่ม primary)
- แถวคงเหลือท้ายกลุ่มใช้พื้น `*-soft` ตามมาตรฐานเดิม (`--status-*-bg`) · แท่งสถานะในกราฟคงสีเดิม (`--status-complete / short / over / empty`)
- **ห้ามสื่อสถานะด้วยสีอย่างเดียว · ห้ามใช้ไอคอนแทนสถานะในตาราง**

## 4. ไอคอน

- **แหล่ง:** Lucide v0.469.0 (ใบอนุญาต ISC) · คัดลอกเฉพาะรูปร่างภายใน `<svg>` ไว้ใน `assets/icons.js` (`SP.data.icons` · ข้อความใบอนุญาตที่หัวไฟล์) · เปิดด้วย `file://` ได้ ไม่โหลดจาก CDN
- **แสดงผล:** `components.icon(name, opts)` → SVG `viewBox 0 0 24 24` · เส้น 1.75 · 18px · `currentColor` (class `icon-lucide`) · ชื่อเดิม `trash` · `lock` · `person-off` ใช้ Path ใน components.js (16px)
- **เลขขั้น:** `components.stepIcon(n)` วงกลมเส้นพร้อมเลข 1–4 (Sales Planning · สีตามสถานะเมนูเหมือนไอคอนอื่น)
- **ใช้เฉพาะ:** เมนูข้าง · ช่องค้นหาเมนู · แถบบน · ปุ่ม · ห้ามใช้แทนสถานะในตาราง

| เมนู | ไอคอน (`registry.icon`) |
|---|---|
| Annual Target · Sub-channel Allocation · SKU Planning · Plan Summary | วงกลมเลขขั้น 1–4 (ไม่มี `icon`) |
| Approval | `badge-check` |
| Product List (+ Product Level) | `package` |
| Bundle | `boxes` |
| Launch & Listing (+ NPD · Listing เดิม) | `rocket` |
| Price & Promotion | `tag` |
| Partner List (+ Account & Platform · เขตและร้านค้า) | `store` |
| Sales Person Management (+ ผู้รับผิดชอบ · ทีมขาย) | `users` |
| Permissions (+ Roles) | `shield-check` |
| Users | `user-cog` |
| คู่มือการใช้งาน | `book-open` |
| โลโก้ · Revision List / Compare เดิม | `target` |
| แถบบน / ปุ่ม | `search` · `panel-left-close` · `panel-left-open` · `chevron-down` · `circle-help` |

- เพิ่มไอคอน: คัดลอกรูปร่างจาก Lucide รุ่นเดียวกันลง `assets/icons.js` (คงข้อความใบอนุญาต) · Test `cr40-3` / `cr40-4` ตรวจว่าทุกรายการเมนูมีไอคอนในไฟล์

## 5. ความสูงหน้า

- ทุกหน้าในเมนูและทุกแท็บไม่ต้องเลื่อนหน้าที่ 1920×1080 (ยกเว้น Plan Summary แท็บรายงานและติดตามสถานะ ตาม CR-39) · หัวหน้าใหม่สูงเท่าหัวข้อ + คำอธิบายเดิมโดยประมาณ จึงไม่ต้องลดการ์ดหรือกราฟเพิ่ม
- Annual Target (CR-40 ข้อ 1.3): แถว Channel สูงอย่างน้อย 44px (ชื่อ + ลิงก์ `n หน่วยขาย` 2 บรรทัด) · ตารางไม่ถูกบีบ ความสูงที่ไม่พอให้การ์ดกราฟลดลงแทน
- สิ่งที่ไม่ทำ: โหมดมืด · เปลี่ยนภาษา · หน้า Dashboard แบบระบบ KOL

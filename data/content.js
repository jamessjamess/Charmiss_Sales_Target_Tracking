/*
 * data/content.js — ข้อความทั้งหมดของเว็บ (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * แก้ข้อความได้ที่นี่โดยไม่ต้องแตะ HTML หรือ Module
 * ภาษา: ภาษาไทยระดับทางการ ประโยคสั้น / ศัพท์ธุรกิจคงเป็นภาษาอังกฤษ (Target, Net Sales, GP, SKU, Channel, Account, …)
 * pages.<id> ใช้ id เดียวกับ core/registry.js:
 *   title   = หัวข้อหน้า ({year} = ปีแผน, {territoryChannels} = ชื่อ Channel ที่แบ่งตามเขต)
 *   lead    = คำอธิบาย 1 บรรทัด บอกว่าหน้านี้ทำอะไร (วิธีใช้อยู่ใน Tooltip หรือแผง ?)
 *   approve = รายการในกล่อง "สิ่งที่ต้องการให้อนุมัติ" (ตอนนี้มีเฉพาะหน้าเกี่ยวกับ Prototype)
 * {ชื่อ} ในข้อความ = ค่าที่หน้าเว็บเติมให้ตอนแสดงผล
 * ห้ามใส่ตัวเลขที่เป็นผลคำนวณในข้อความ ให้หน้าเว็บคำนวณจาก core/calc.js
 */
(function (SP) {
  'use strict';

  SP.data.content = {

    site: {
      name: 'Sales Target Planning',
      badge: 'Prototype',
      aboutLink: 'คู่มือ',   // CR-28 ลิงก์ Header ไปหน้าคู่มือการใช้งาน
      // CR-28: ปุ่ม ? ต่อท้ายชื่อหน้า (components.pageHelp · เนื้อหาจาก data/guide.js pages)
      help: { button: 'วิธีใช้หน้านี้', purpose: 'หน้านี้ใช้ทำอะไร', editors: 'ผู้แก้ไข', steps: 'ขั้นตอนหลัก', all: 'ดูคู่มือทั้งหมด', viewOnly: 'ทุกบทบาทดูได้อย่างเดียว', back: '← กลับ' },
      menu: 'เมนู',
      menuOpen: 'เปิดเมนู',
      collapse: 'พับเมนู',
      expand: 'ขยายเมนู',
      groups: { 'sales-planning': 'Sales Planning', 'product-master': 'Product Master', 'account-master': 'Account Master', 'role-management': 'Role Management', 'project-info': 'ช่วยเหลือ' },
      // CR-21: เปิดหน้าที่มุมมองผู้ใช้นี้ไม่เห็น (สิทธิ์ ไม่เห็น) ตรงด้วย URL
      accessDenied: 'ไม่มีสิทธิ์เข้าถึงหน้านี้',
      accessDeniedText: 'บทบาทของมุมมองผู้ใช้นี้ไม่เห็นหน้านี้ · เปลี่ยนมุมมองผู้ใช้ที่ Header หรือกลับไปหน้าที่เห็น',
      accessDeniedLink: 'ไปที่หน้าเริ่มต้น: {page}',
      // CR-25: สลับมุมมองผู้ใช้แล้วหน้าปัจจุบันถูกซ่อน → ไปหน้าเริ่มต้นของบทบาท (Toast หลังโหลดหน้า)
      switchToast: 'สลับเป็น {role} · ไปที่ {page}',
      // CR-32: โครงข้อมูลเปลี่ยนรุ่น (core/store.js DATA_VERSION) → ล้างค่าที่ลองแก้ไว้และโหลดข้อมูลตั้งต้นใหม่ แจ้งครั้งเดียว
      dataVersionToast: 'ระบบปรับโครงข้อมูลเป็นรุ่นใหม่ จึงโหลดข้อมูลตั้งต้นใหม่ ค่าที่เคยแก้ไว้ในเบราว์เซอร์นี้ถูกล้างแล้ว',
      toastClose: 'ปิดข้อความ',
      reset: 'รีเซ็ตข้อมูล',
      resetConfirm: 'ล้างข้อมูลที่แก้ไขทั้งหมดรวมถึงสถานะการอนุมัติ และกลับไปใช้ข้อมูลตั้งต้นหรือไม่',
      storeWarning: 'เบราว์เซอร์นี้ไม่ส่งต่อข้อมูลที่แก้ไขข้ามหน้า',
      prev: 'ก่อนหน้า',
      next: 'ถัดไป',
      finish: 'กลับขั้นแรก',
      yearLabel: 'ปีแผน',
      yearChange: 'เปลี่ยนปีแผน',
      roleLabel: 'มุมมองผู้ใช้',
      roleNote: '(จำลองสำหรับการนำเสนอ)',
      approveTitle: 'สิ่งที่ต้องการให้อนุมัติ',
      leaveConfirm: 'มีรายการที่ยังไม่บันทึก หากออกจากหน้านี้ รายการดังกล่าวจะหายไป',
      discardConfirm: 'มีรายการที่ยังไม่บันทึก {n} รายการ ต้องการยกเลิกรายการดังกล่าวหรือไม่',
      actionCount: 'รายการที่ต้องดำเนินการ {n} รายการ'
    },

    labels: {
      source: { locked: 'ล็อก 0', manual: 'กรอกเอง', system: 'ระบบเติม', clearance: 'Clearance' },
      // สถานะคงเหลือ: ขาด = แดง, เกิน = เหลือง, จัดสรรครบ = เขียว, ยังไม่กำหนด = เทา
      alert: { ok: 'จัดสรรครบ', short: 'ขาด', over: 'เกิน', empty: 'ยังไม่กำหนด' },
      // CR-29: Account Master ร่วมกันทุกหน้า (ลิงก์ชื่อคน → Drawer ของคนนั้น)
      masterData: { personLink: 'เปิดข้อมูลของ {name}' },
      // CR-29: ประวัติการเปลี่ยนแปลงใน Drawer ของ Account Master (จาก master.audit)
      masterHistory: {
        empty: 'ยังไม่มีการเปลี่ยนแปลงที่บันทึกไว้', by: '{at} · {by}',
        fields: { _new: 'เพิ่มรายการ', _removed: 'นำออก', name: 'ชื่อ', code: 'รหัส', gp: 'GP / Platform Fee', note: 'หมายเหตุ', active: 'การใช้งาน', inactiveFrom: 'ปิดใช้งานตั้งแต่', owner: 'ผู้รับผิดชอบ',
          provinces: 'จังหวัดแนะนำ', members: 'ทีม', type: 'ประเภท', endMonth: 'เดือนสุดท้ายที่รับผิดชอบ', channelId: 'Channel', storeType: 'ประเภทร้าน', priceType: 'ประเภทราคา',
          province: 'จังหวัด', hasExport: 'Export', hasOnline: 'Online', suggest: 'คำนำหน้าชื่อคู่ค้าที่แนะนำ', salesUnit: 'หน่วยขาย' },
        change: '{field}: {from} → {to}', added: '{field}: {to}'
      },
      // CR-32: ข้อมูลที่ต้องตรวจ มาตรฐานใหม่ (components.dataCheck · ใช้ใน Account Master และ Sales Person Management ก่อน)
      dataCheck: {
        chip: 'ข้อมูลที่ต้องตรวจ ({n})', ok: 'ข้อมูลครบ', group: '{label} ({n})', go: 'ไปที่รายการ', more: 'และอีก {n} รายการ',
        criteria: 'เกณฑ์ที่ตรวจ:', none: 'ไม่พบรายการที่ต้องตรวจ'
      },
      remainingText: { ok: 'จัดสรรครบ', short: 'ขาด {amount}', over: 'เกิน {amount}', empty: 'ยังไม่กำหนด' },
      // CR-35: ตัวเลือกปี ‹ 2027 ▾ › (components.yearPicker)
      yearPicker: { label: 'ปี', prev: 'ปีก่อนหน้า', next: 'ปีถัดไป', plan: 'ปีแผน', actual: 'ข้อมูลจริง' },
      // CR-36: ปุ่มจัดกลุ่ม (components.groupPicker) · ชื่อเกณฑ์ (Product List · แท็บ NPD ของ Launch & Listing)
      groupPicker: { label: 'จัดกลุ่ม', text: 'จัดกลุ่ม: {value}' },
      groupBy: { none: 'ไม่จัดกลุ่ม', category: 'Category', subCategory: 'Sub Category', type: 'Type', series: 'Series', level: 'Product Level (Category › Sub Category › Type)',
        levelShort: 'Product Level', status: 'Status', year: 'Product Year', launchMonth: 'เดือนเปิดตัว', noneName: '(ไม่ระบุ)', noYear: 'ยังไม่มี Listing', noLaunch: 'ยังไม่กำหนดเดือนเปิดตัว',
        head: '{name} · {n} SKU', expand: 'กาง {name}', collapse: 'พับ {name}' },
      // Status สินค้า (calc.productStatus) ชุดเดียวทั้งระบบ คำนวณจากวันที่
      // CR-30: New → NPD (ค่าภายในยังเป็น 'new')
      status: { planned: 'Planned', 'new': 'NPD', active: 'Active', clearance: 'Clearance', discontinued: 'Discontinued', request: 'Request', 'delete': 'Delete' },
      // CR-35: วงจรสถานะ 7 แบบ (ลำดับ calc.PRODUCT_STATUSES) · ประเภทรายได้ (calc.revenueTypeOf · Phase 2) · ป้ายชื่อชั่วคราว · ยืนยันคำขอ NPD
      revenueTypes: { npd: 'NPD', existing: 'Existing', clearance: 'Clearance' },
      tempName: { tag: 'ชื่อชั่วคราว', tip: 'ชื่อชั่วคราวของคำขอ NPD · ทีม Product ตั้งชื่อจริงตอนยืนยัน' },
      tempCode: { tag: 'รหัสชั่วคราว', tip: 'รหัสชั่วคราว NPD-ปีเดือนที่เริ่มขาย-ลำดับ · ได้ Product Code 5 หลักเมื่อทีม Product ยืนยัน', old: 'รหัสชั่วคราวเดิม {code}' },
      confirmRequest: {
        button: 'ยืนยันเป็น NPD', title: 'ยืนยันคำขอเป็น NPD · {code}', temp: 'รหัสชั่วคราว', name: 'ชื่อสินค้าจริง', type: 'Type (กำหนดเลขนำหน้า Product Code)',
        code: 'Product Code ที่จะได้', note: 'ยืนยันแล้ว Status เป็น Planned · แผน SKU Listing และราคาของคำขอยังอยู่ครบ · เปลี่ยนกลับเป็น Request ไม่ได้',
        confirm: 'ยืนยันเป็น NPD', done: 'ยืนยันแล้ว · {code} {name}', placeholder: 'เลือก',
        errors: { name: 'กรุณากรอกชื่อสินค้า', type: 'กรุณาเลือกหมวดสินค้าถึง Type', prefix: 'Type นี้ยังไม่มีเลขนำหน้า Product Code (Product List แท็บ Product Level)', full: 'เลข Product Code ของ Type นี้เต็มแล้ว', notRequest: 'สินค้านี้ไม่ใช่คำขอ NPD' }
      },
      // CR-34: ประเภทสินค้าในแผน (calc.planTypeOf) — ป้ายและสีที่เดียว ใช้ร่วมกัน SKU Planning · Plan Summary (token = สีใน styles/tokens.css)
      planTypes: {
        existing: { label: 'สินค้าเดิม', badge: '', token: '--c-type-existing', tip: 'เคยมียอดขายในหน่วยขายนี้' },
        newListing: { label: 'Listing ใหม่', badge: 'Listing ใหม่', token: '--c-type-existing', tip: 'สินค้าที่ขายอยู่แต่ยังไม่เคยมียอดขายในหน่วยขายนี้' },
        npdConfirmed: { label: 'NPD ยืนยันแล้ว', badge: 'NPD', token: '--c-type-npd', tip: 'สินค้าใหม่ที่ทีม Product ยืนยันแล้ว (เปิดตัวหรืออยู่ในช่วง NPD ในปีแผน)' },
        npdRequest: { label: 'ขอ NPD', badge: 'ขอ NPD', token: '--c-type-request', borderToken: '--c-type-request-bd', pattern: 'hatch', tip: 'คำขอสินค้าใหม่จาก Sales ที่ทีม Product ยังไม่ยืนยัน' },
        clearance: { label: 'Clearance', badge: 'Clearance', token: '--c-type-clearance', tip: 'สินค้าที่อยู่ในช่วง Clearance · ไม่ควรอยู่ในแผน' },
        // CR-36: แผน Clearance ของ Supply Chain (Price & Promotion › Clearance) · แสดงแยก ไม่นับในรวมแผน / คงเหลือ
        clearancePlan: { label: 'แผน Clearance (ไม่นับในเป้าหมาย)', token: '--c-type-clearance-plan', tip: 'แผนระบายสินค้า Clearance ของ Supply Chain · ไม่นับในรวมแผน คงเหลือ และสถานะของ Sales Planning' }
      },
      statusHint: { planned: 'ก่อนเดือนเปิดตัว', 'new': '3 เดือนแรกนับจากเดือนเปิดตัว', active: 'พ้นช่วง NPD แล้ว', clearance: 'อยู่ในช่วง Clearance', discontinued: 'หลังเดือนเลิกขาย' },
      inactive: 'ปิดใช้งาน',
      // CR-30 ประเภทราคาหลัก (settings.PRICE_TYPES)
      priceTypes: { RSP: 'RSP', TT_DEALER: 'TT Dealer', TT_WHOLESALE: 'TT Wholesale' },
      // รายการสินค้า / ความครบถ้วน (components.productThumb, completenessBadge)
      product: {
        noImage: 'ยังไม่มีรูปสินค้า',
        complete: 'ครบ',
        completeTitle: 'ข้อมูลครบทุกฟิลด์',
        missingRequired: 'ขาดจำเป็น {n}',
        missingRecommended: 'ขาดที่ควรมี {n}',
        missingRequiredTitle: 'ขาดข้อมูลจำเป็น: {fields}',
        missingRecommendedTitle: 'ขาดข้อมูลที่ควรมี: {fields}',
        blockedIncomplete: 'ขาดข้อมูลจำเป็น: {fields} · แก้ไขได้ที่รายการสินค้า',
        // CR-11: หมวดสินค้าที่ระบบกำหนดจากคำในชื่อสินค้า (inferred)
        inferredTag: 'ระบบกำหนด',
        inferredTitle: 'หมวดสินค้ากำหนดจากคำในชื่อสินค้า (Excel ยังไม่มี Category) ควรตรวจสอบ'
      },
      // CR-30 เลือกคอลัมน์ + Preset ส่วนตัว (components.columnPicker)
      columnPicker: {
        button: 'คอลัมน์ ▾', title: 'เลือกคอลัมน์', fixed: 'บางคอลัมน์แสดงเสมอ', preset: 'Preset', custom: '(กำหนดเอง)', system: 'ของระบบ', isDefault: 'ค่าเริ่มต้นของฉัน',
        setDefault: 'ตั้งเป็นค่าเริ่มต้นของฉัน', remove: 'ลบ', saveAs: 'บันทึกเป็น Preset…', saveTitle: 'บันทึก Preset คอลัมน์', saveLabel: 'ชื่อ Preset', save: 'บันทึก',
        nameRequired: 'กรุณาตั้งชื่อ Preset', reset: 'คืนค่าตั้งต้น', dragHint: 'ลากเพื่อเรียงลำดับ', up: 'เลื่อนขึ้น', down: 'เลื่อนลง',
        storeNote: 'Preset เก็บแยกตามผู้ใช้ของมุมมองผู้ใช้ที่เลือก (Prototype เก็บในเบราว์เซอร์นี้)'
      },
      // ปุ่ม "ส่งออก ▾" (components.exportButton + core/export.js)
      // CR-21: ระดับสิทธิ์ (components.permChip)
      perm: {
        levels: { NONE: 'ไม่เห็น', VIEW: 'ดู', EDIT: 'แก้ไข' },
        allowed: '✓', denied: '–', allowedText: 'อนุญาต', deniedText: 'ไม่อนุญาต',
        team: 'ทีม', teamText: 'เฉพาะ Channel ในทีม', changed: 'ต่างจากค่าตั้งต้น',
        // CR-31 ช่องสิทธิ์แบบข้อความ (components.permissionCell / permissionLegend)
        cell: { edit: 'แก้ไข', view: 'ดู', allow: 'อนุญาต', team: 'เฉพาะทีม', none: 'ไม่เห็น', deny: 'ไม่อนุญาต', legendEmpty: 'ว่าง = ไม่เห็น' }
      },
      exporting: {
        button: 'ส่งออก ▾',
        xlsx: 'Excel (.xlsx)',
        csv: 'CSV',
        loading: 'กำลังส่งออก…',
        unsavedTitle: 'มีรายการที่ยังไม่บันทึก {n} รายการ ต้องการส่งออกค่าชุดใด',
        useDraft: 'ส่งออกค่าที่ยังไม่บันทึก',
        useSaved: 'ส่งออกค่าที่บันทึกล่าสุด',
        xlsxFailed: 'ส่งออก Excel ไม่ได้ในขณะนี้ · ส่งออกเป็น CSV แทนได้',
        headerYear: 'ปีแผน',
        headerStatus: 'สถานะ',
        headerAt: 'วันเวลาที่ส่งออก',
        headerRole: 'มุมมองผู้ใช้',
        headerUnit: 'หน่วยขาย',
        headerView: 'มุมมอง',
        statusCode: { draft: 'Draft', submitted: 'Submitted', approved: 'Approved', returned: 'Returned', review: 'Review', locked: 'Locked' }
      },
      // แท่งเป้าหมายเทียบยอดขาย L12M (charts.vsLastYearBar) หน้า Annual Target · Sub-channel Allocation และรายงานสรุปแผน
      vsLastYear: {
        header: 'เป้าหมายเทียบ L12M',
        headerTip: 'ความยาวแท่ง = เป้าหมาย · ขีดตั้ง = ยอดขาย L12M · ทุกแถวใช้สเกลเดียวกัน',
        tip: 'เป้าหมาย {target} บาท · ยอดขาย L12M {prior} บาท · {pct}',
        newTip: 'เป้าหมาย {target} บาท · ไม่มียอดขาย L12M',
        newTag: 'ใหม่',
        axisUnit: 'ล้าน'
      },
      // ⓘ ของยอดขายฐาน (components.priorLabel) — CR-24: ยอดขาย L12M · ช่วงเดือนจาก core/clock.js (mixed / actual / estimate = แบบเดิมเมื่อไม่มี clock)
      priorInfo: {
        label: 'ยอดขาย L12M',
        column: 'ยอดขาย L12M (ล้านบาท)',
        columnBaht: 'ยอดขาย L12M (บาท)',
        short: 'L12M',
        l12mNote: 'ยอดขายจริง 12 เดือนล่าสุดที่ปิดแล้ว ({range}) · ใช้เป็นฐานเทียบการเติบโต',
        fullYearTip: 'ยอดขายจริงทั้งปี {year}',
        overlapTip: 'ยอดขายจริงทั้งปี {year} · ช่วง {months} {year} อยู่ใน L12M ด้วย',
        mixed: 'ยอดขายปี {year} = ยอดขายจริง {actual} + ประมาณการ {estimate}',
        actual: 'ยอดขายปี {year} = ยอดขายจริงทั้งปี',
        estimate: 'ยอดขายปี {year} = ประมาณการทั้งปี',
        none: 'ไม่มีข้อมูลยอดขายปี {year}'
      },
      // CR-24: ยอดขายอ้างอิงรายเดือน (ยอดจริงล่าสุดของแต่ละเดือน) — Sub-channel Allocation · SKU Planning · รายงาน
      referenceInfo: {
        label: 'ยอดขายอ้างอิง',
        rowBaht: 'ยอดขายอ้างอิง (บาท)',
        note: '{latestMonths} ใช้ยอดจริงปี {year} · {olderMonths} ใช้ยอดจริงปี {prev} (ยังไม่มียอดจริงปี {year})',
        allLatest: 'ใช้ยอดจริงปี {year} ทุกเดือน',
        yearTip: 'ยอดขายอ้างอิงของเดือนนี้ใช้ยอดจริงปี {year}'
      },
      views: { units: 'จำนวนชิ้น', sellOut: 'Sale Amount', net: 'Net Sales' },
      remaining: 'คงเหลือ',
      allocated: 'จัดสรรแล้ว',
      target: 'เป้าหมาย',
      of: 'จาก',
      baht: 'บาท',
      units: 'ชิ้น',
      million: 'ล้าน',
      millionBaht: 'ล้านบาท',
      edited: 'แก้ไขแล้ว',
      defaultValue: 'ค่าตั้งต้น',
      prior: 'ยอดขาย L12M',
      growth: 'การเติบโต',
      growthNew: 'ใหม่',
      growthBelowL12m: 'เป้าหมายต่ำกว่ายอดขาย 12 เดือนล่าสุด',   // CR-27 ▼ ที่การเติบโตติดลบ (Annual Target · Sub-channel Allocation)
      total: 'รวม',
      other: 'อื่นๆ',
      yes: 'ใช่',
      no: 'ไม่ใช่',
      unitAllText: 'รวมทั้ง {unit}',
      // ปุ่มเพิ่มหน่วยขายในแถว Channel ({unit} = unitLabel ของ Channel เช่น Account, เขตการขาย, Platform)
      addUnitButton: '+ {unit}',
      noUnitsOf: 'ยังไม่มี {unit}',
      noMoreUnitsOf: 'เพิ่ม {unit} ที่เปิดใช้งานครบแล้ว · เปิดใช้งาน {unit} ใหม่ได้ที่ {master}',
      masterOf: { ACCOUNT: 'Partner List', TERRITORY: 'Partner List' },   // CR-36 ชื่อหน้า Partner List   // CR-32: หน่วยขายทุก Channel อยู่ที่หน้าเดียว
      // ชื่อฟิลด์ของสินค้า (ความครบถ้วน, Audit log, ฟอร์ม)
      productFields: {
        code: 'Product Code', trCode: 'Product Code', barcode: 'Barcode', inTrcloud: 'ใน TRCLOUD',
        name: 'ชื่อ', nameEn: 'ชื่อภาษาอังกฤษ', shortName: 'ชื่อย่อ', inferred: 'หมวดสินค้าที่ระบบกำหนด', categoryId: 'Category', subCategoryId: 'Sub Category', typeId: 'Type',
        seriesId: 'Series', subSeriesId: 'Sub Series', packSize: 'ขนาดบรรจุ', uom: 'หน่วย', image: 'รูป',
        rsp: 'RSP', launchDate: 'เดือนเปิดตัว', discontinueMonth: 'เดือนเลิกขาย', clearance: 'Clearance', note: 'หมายเหตุ',
        create: 'สร้างรายการ', 'delete': 'ลบรายการ', listing: 'Listing', price: 'ราคา', manualDefault: 'ค่าตั้งต้นช่องกรอกเอง'
      },
      // แถบบริบท (subChannelPicker) หน้า Phasing และวางแผน SKU
      // หมวดสินค้าและ Series (components.categoryFilter / filterChips — CR-15)
      taxonomy: {
        levels: { CATEGORY: 'Category', SUB_CATEGORY: 'Sub Category', TYPE: 'Type', SERIES: 'Series', SUB_SERIES: 'Sub Series' },
        filter: { all: 'ทุก {level}', selected: '{n} รายการ', clear: 'ล้างที่เลือก', empty: 'ไม่พบรายการ', search: 'ค้นหา', remove: 'เอา {name} ออกจากตัวกรอง', clearAll: 'ล้างตัวกรอง' }
      },
      picker: {
        channel: 'Channel',
        unit: 'หน่วยขาย',
        search: 'ค้นหาชื่อหรือผู้รับผิดชอบ',
        noMatch: 'ไม่พบรายการ',
        prev: 'รายการก่อนหน้าใน Channel นี้',
        next: 'รายการถัดไปใน Channel นี้',
        // มุมมองรวม (CR-13 · CR-23 หน้า Sub-channel Allocation ใช้เฉพาะรวมทั้ง Channel)
        all: 'ทั้งหมด',
        allTitle: 'รวมทุก Channel',
        allTotal: 'รวมทุก Channel',
        channelTotal: 'รวมทั้ง {channel} ({n} หน่วย)'
      },
      context: { annual: 'เป้าหมายทั้งปี', prior: 'ยอดขาย L12M', growth: 'การเติบโต', gp: 'GP', gpMissing: 'ยังไม่ได้กำหนด {gpLabel}' },
      // ผู้รับผิดชอบตามช่วงเดือน
      owner: {
        label: 'ผู้รับผิดชอบ',
        row: 'ผู้รับผิดชอบ',
        none: 'ไม่มีผู้รับผิดชอบ',
        resigned: '{name} (สิ้นสุดการรับผิดชอบแล้ว)',   // CR-29
        historyTitle: 'ประวัติผู้รับผิดชอบ',
        historyEmpty: 'ยังไม่เคยกำหนดผู้รับผิดชอบ',
        now: 'ปัจจุบัน',
        tip: 'ผู้รับผิดชอบ: {name}'
      },
      personStatus: { active: 'ใช้งาน', leaving: 'จะสิ้นสุด {month}', resigned: 'สิ้นสุดการรับผิดชอบ {month}', future: 'เริ่ม {month}' },   // CR-29
      // CR-19: manager / officer = ทีมขายต่อ Channel · viewer = ผู้ดูรายงาน / sales · trade = ค่าจากรุ่นก่อน (ประวัติเดิม)
      // CR-21: ชื่อที่แสดงจริงมาจาก master.roles (แก้ได้ที่หน้า Roles) ชุดนี้ใช้กับข้อความเดิม
      roles: { management: 'Management', director: 'Sales Director', manager: 'Sales Manager', officer: 'Sales Officer', product: 'ทีม Product', supply: 'Supply Chain', viewer: 'ผู้ดูรายงาน', admin: 'ผู้ดูแลระบบ',
        sales: 'Sales Person', trade: 'Trade Marketing' },
      // Workflow ต่อขั้น (core/workflow.js + components.workflowBar)
      workflow: {
        status: { draft: 'ฉบับร่าง', submitted: 'รออนุมัติ', approved: 'อนุมัติแล้ว', returned: 'ส่งกลับแก้ไข', review: 'ต้องตรวจสอบใหม่', locked: 'ล็อกแล้ว' },
        icon: { draft: '○', submitted: '◔', approved: '✓', returned: '↩', review: '!', locked: '🔒' },
        actions: { edit: 'แก้ไข', submit: 'ส่งอนุมัติ', save: 'บันทึก', cancel: 'ยกเลิก', recall: 'ดึงกลับ', approve: 'อนุมัติ', 'return': 'ส่งกลับแก้ไข', reopen: 'เปิดให้แก้ไข', lock: 'ล็อก Baseline' },
        events: { apply: 'บันทึกแล้วมีผล (ไม่มีขั้นอนุมัติ) โดย', submit: 'ผู้ส่ง:', recall: 'ดึงกลับโดย', approve: 'ผู้อนุมัติ:', 'return': 'ส่งกลับแก้ไขโดย', reopen: 'เปิดให้แก้ไขโดย', invalidate: 'เปลี่ยนเป็นต้องตรวจสอบใหม่ ·', lock: 'ล็อกโดย' },
        history: 'ประวัติ',
        historyEmpty: 'ยังไม่มีการเปลี่ยนสถานะ',
        preparer: 'ผู้จัดทำ: {name}',
        approver: 'ผู้อนุมัติ: {name}',
        readOnly: 'อ่านอย่างเดียว · ผู้จัดทำคือ {name}',
        readOnlyApprover: 'อ่านอย่างเดียว · รอ {name} อนุมัติ',
        readOnlyMaster: 'อ่านอย่างเดียว · ผู้แก้ไขคือ {name}',
        switchToEditor: 'สลับเป็นมุมมอง {name}',
        waiting: 'อ่านอย่างเดียว · รอผู้จัดทำส่งอนุมัติ (ผู้จัดทำคือ {name})',
        switchToPreparer: 'สลับเป็นมุมมองผู้จัดทำ',
        switchToApprover: 'สลับเป็นมุมมองผู้อนุมัติ',
        switchTitle: 'เปลี่ยนมุมมองผู้ใช้เป็น {name} เพื่อการนำเสนอ',
        // CR-19: สิทธิ์แยกตาม Module (core/permissions.js)
        readOnlyBy: 'อ่านอย่างเดียว · หน้านี้แก้ไขโดย {roles}',
        viewOnlyBy: 'ดูอย่างเดียว · แก้ไขได้โดย {roles}',   // CR-35: หน้าที่แก้ไขรายรายการ (ไม่มี workflowBar) · components.viewOnlyNote
        editingHint: ' · {hint}',   // CR-35: ข้อความต่อท้ายแถบโหมดแก้ไข (components.editBanner opts.suffix)
        readOnlyTeam: 'อ่านอย่างเดียว · หน่วยขายนี้อยู่ในทีม {channel}',
        readOnlyNone: 'อ่านอย่างเดียว',
        noTeam: 'ยังไม่มีทีมขายของ {channel}',
        teamEditors: '{roles} ทีม {channel}',
        rolesJoin: ' และ ',
        switchToRole: 'สลับเป็น {role}',
        reasons: {
          upstream: { phasing: 'ส่งอนุมัติได้หลังจาก Top-down ได้รับอนุมัติ', sku: 'ส่งอนุมัติได้หลังจาก Phasing ของรายการนี้ได้รับอนุมัติ' },
          remaining: { topDown: 'ส่งอนุมัติไม่ได้ เนื่องจากยังจัดสรรไม่ครบ', phasing: 'ส่งอนุมัติไม่ได้ เนื่องจากยังจัดสรรไม่ครบ', sku: 'ส่งอนุมัติไม่ได้ เนื่องจากแผนต่ำกว่าเป้าหมาย' },
          baseline: 'ใช้งานได้หลังจากล็อก Baseline',
          incomplete: { npd: 'ส่งอนุมัติได้เมื่อกำหนดวันเปิดตัวและหน่วยขายที่วางแผนแล้ว' }
        },
        confirm: {
          submit: 'ส่ง{title} ให้ {approver} อนุมัติ',
          approve: 'อนุมัติ{title}',
          'return': 'ส่ง{title} กลับแก้ไข',
          reopen: 'เปิด{title} ให้แก้ไข สถานะจะกลับเป็นฉบับร่าง',
          recall: 'ดึง{title} กลับเป็นฉบับร่าง'
        },
        approveNote: 'หากเป้าหมายของ หน่วยขายใดเปลี่ยนจากการอนุมัติครั้งก่อน ขั้นถัดไปของรายการนั้นจะเปลี่ยนเป็น "ต้องตรวจสอบใหม่"',
        returnNote: 'เหตุผลที่ส่งกลับแก้ไข (จำเป็น)',
        noteRequired: 'กรุณาระบุเหตุผลก่อนส่งกลับแก้ไข',
        invalidateNote: { topDown: 'เป้าหมายจาก Top-down เปลี่ยน', phasing: 'เป้าหมายรายเดือนจาก Phasing เปลี่ยน', npd: 'เลื่อนวันเปิดตัว NPD หลังอนุมัติ' },
        editing: 'โหมดแก้ไข · มีรายการที่ยังไม่บันทึก {n} รายการ',
        editingClean: 'โหมดแก้ไข · ยังไม่มีรายการที่เปลี่ยนแปลง',
        lockedTag: 'ล็อก Baseline แล้ว'
      },
      dialog: { confirm: 'ยืนยัน', cancel: 'ยกเลิก', close: 'ปิด' },
      more: 'ตัวเลือกเพิ่มเติม',
      removeFromPlan: 'นำออกจากแผน',
      remove: 'ลบ',
      // Filter หลายค่า (Series ในหน้าวางแผน SKU และ Product Master, Channel ในรายงาน)
      series: {
        label: 'Series',
        all: 'ทุก Series',
        search: 'ค้นหา Series',
        count: '{n} SKU',
        clear: 'ล้างที่เลือก',
        selected: '{n} Series',
        empty: 'ไม่พบ Series',
        none: '(ไม่ระบุ Series)'
      },
      // แผง "คำอธิบายสถานะและวิธีเติมยอด" (หน้า Product Master และปุ่ม ? ในหน้าวางแผน SKU)
      rules: {
        title: 'คำอธิบายสถานะและวิธีเติมยอด',
        button: 'คำอธิบายสัญลักษณ์และกฎ',
        legendTitle: 'สัญลักษณ์ในตาราง',
        // คีย์ลัดของตารางกรอกตัวเลข (components.gridKeys) — แสดงในแผง ? หน้าวางแผน SKU
        keysTitle: 'คีย์ลัดในตาราง (โหมดแก้ไข)',
        keys: [
          ['Enter / Tab', 'ส่งค่าแล้วเลื่อนลงล่าง / ไปขวา'],
          ['ลูกศร · Shift + ลูกศร', 'เลื่อนช่อง · เลือกช่วง'],
          ['Ctrl + C / Ctrl + V', 'คัดลอก / วางหลายช่องกับ Excel (ข้ามช่องที่ล็อก)'],
          ['Delete', 'ล้างค่าช่องที่เลือก'],
          ['Ctrl + D / Ctrl + R', 'เติมลงล่าง / เติมไปขวา'],
          ['Ctrl + Z', 'ย้อนกลับภายในรอบแก้ไข']
        ],
        statusTitle: 'Status สินค้า (คำนวณจากวันที่ เหมือนกันทุกหน่วยขาย)',
        statusRules: [
          { status: 'planned', text: 'ก่อนวันเริ่มขาย มีค่าเป็น 0' },
          { status: 'new', text: '3 เดือนแรกนับจากเดือนเปิดตัว (เดือนเปิดตัวนับเป็นเดือนที่ 1)' },
          { status: 'active', text: 'พ้นช่วง NPD แล้ว' },
          { status: 'clearance', text: 'ช่วงระบายสต็อกที่ Supply Chain กำหนด มาก่อน Status อื่นเสมอ' },
          { status: 'discontinued', text: 'หลังเดือนเลิกขาย มีค่าเป็น 0' }
        ],
        sourceTitle: 'วิธีเติมยอด ระดับ SKU × หน่วยขาย',
        sourceRules: [
          { source: 'locked', text: 'Planned ก่อนเดือนเริ่มขาย Discontinued หรือไม่ได้ Listing มีค่าเป็น 0 และแก้ไขไม่ได้' },
          { source: 'manual', text: 'ยังไม่มียอดขายอ้างอิงในหน่วยขายนี้ (รวมถึง SKU ใหม่ทั้งปี) ทีมขายเป็นผู้กรอก' },
          { source: 'system', text: 'มียอดขายอ้างอิงในหน่วยขายนี้ ค่าตั้งต้น = ยอดจริงล่าสุดของเดือนนั้น และแก้ไขได้ (Override)' },
          { source: 'clearance', text: 'อยู่ในช่วง Clearance ระบบคำนวณจาก Stock ÷ จำนวนเดือน และแก้ไขได้ (Override)' }
        ]
      },
      // คำอธิบายการคำนวณ (ⓘ ในหน้าวางแผน SKU)
      explain: {
        button: 'วิธีคำนวณตัวเลข',
        title: 'วิธีคำนวณ',
        // CR-18: ราคารวม VAT · สูตรตาม Channel (มี GP / ไม่มี GP)
        formulas: {
          sale: ['Sale Amount', '= จำนวนชิ้น × ราคาขาย (รวม VAT)'],
          net: ['Net Sales', '= Sale Amount ÷ {vatFactor} × (1 − {gpLabel})'],
          netNoGp: ['Net Sales', '= Sale Amount ÷ {vatFactor} (ไม่หัก GP)']
        },
        // CR-30 ลำดับการหาราคารายเดือน (calc.resolvePrice)
        priceOrder: 'ราคาขาย = Promotion Price ของหน่วยขาย → Promotion Price ของ Channel → RSP ที่มีผลเดือนนั้น',
        priceOrderDealer: 'ราคาขาย = Promotion Price ของหน่วยขาย → Promotion Price ของ Channel → TT Dealer ที่มีผลเดือนนั้น',
        gpMissing: 'ยังไม่ได้กำหนด {gpLabel} ของ {unit} · Net Sales คำนวณไม่ได้',
        splitTitle: 'สัดส่วนเงินที่ลูกค้าจ่าย · {unit} ทั้งปีตามแผน',
        splitParts: { net: 'Net Sales (บริษัท)', gp: '{gpLabel} (ร้านค้า)', vat: 'VAT' },
        valuesTitle: 'ค่าที่ใช้กับรายการนี้',
        gp: 'GP',
        noGP: 'Channel นี้ไม่หัก GP',
        vat: 'VAT',
        priceVat: { excl: 'ราคาขาย: ไม่รวม VAT', incl: 'ราคาขาย: รวม VAT' },
        sellOutMethod: { ACTUAL: 'Sell-out = ยอดขายจริงของร้านค้า', SELL_IN_MINUS_CN: 'Sell-out = Sell-in − CN (รอกำหนด CN%)' }
      },
      // Tooltip รายช่อง (components.cellBreakdown)
      breakdown: {
        saleAmount: 'Sale Amount รวม VAT',
        net: 'Net Sales',
        gpMissing: 'ยังไม่ได้กำหนด GP',
        // CR-30 ที่มาของราคารายช่อง
        priceSource: { promoUnit: 'Promotion Price · {unit}', promoChannel: 'Promotion Price · ทั้ง {channel}', dealer: 'TT Dealer', rsp: 'RSP', clearance: 'ราคา Clearance' },
        source: 'ที่มา',
        actual: 'Actual (ยอดขายจริง)',
        override: 'Override (ค่าระบบ {value})',
        promo: 'Promo {days}/{total} วัน (ราคาเฉลี่ย)',
        noGP: 'ไม่มี GP',
        lockReasons: {
          notListed: 'ไม่ได้ Listing',
          beforeListing: 'ก่อนเดือนเริ่มวางขายใน Listing',   // CR-30: นอกช่วง Listing ของหน่วยขาย
          delisted: 'ถอดจาก Listing แล้ว',
          beforeStart: 'ก่อนเดือนเริ่มขาย',
          planned: 'Planned (ก่อนวันเริ่มขายใน Product Master)',
          discontinued: 'Discontinued (เลิกขายแล้ว)',
          clearance: 'วางแผนที่ Price & Promotion › Clearance'   // CR-36: เดือน Clearance อ่านอย่างเดียว (แผน Clearance ไม่นับในแผนนี้)
        },
        price: 'ราคาที่มีผล {price} บาท (RSP {rsp})',
        // CR-11: ที่มาของช่องระบบเติม และยอดอ้างอิงของช่อง — CR-24: ค่าตั้งต้น = ยอดจริงล่าสุดของเดือนนั้น (ปีจาก core/clock.js)
        fill: {
          priorYear: 'ค่าตั้งต้น = ยอดจริงล่าสุดของเดือนนี้ ({year})',
          estimated: 'ใช้ประมาณการปี {year} เพราะไม่มียอดจริงเดือนนี้',
          lastYear: 'ยอดอ้างอิง × การเติบโต ({ly} × {g})',
          runRate: 'Run-rate × Seasonality ({rr} × {si})'
        },
        prior: 'ยอดอ้างอิง ({year}) {ly} ชิ้น · {diff}',
        priorEstimated: 'ยอดอ้างอิง (ประมาณการ {year}) {ly} ชิ้น · {diff}',
        priorNone: 'ไม่มียอดขายอ้างอิงในหน่วยขายนี้',
        anomaly: { up: 'สูงกว่ายอดอ้างอิงของเดือนนี้เกิน {pct}', down: 'ต่ำกว่ายอดอ้างอิงของเดือนนี้เกิน {pct}' },
        gpPromo: 'GP ช่วง Promotion ถ่วงแล้ว {gp}'
      }
    },

    pages: {

      template: {
        title: 'Module ใหม่ (Template)',
        lead: ['โครงตั้งต้นสำหรับสร้าง Module ใหม่ ดูขั้นตอนใน README.md'],
        approve: ['ตัวอย่างกล่องสิ่งที่ต้องการให้อนุมัติ']
      },

      // CR-23 ขั้นที่ 1 Annual Target: Management ตั้ง Total Target และแบ่งลงแต่ละ Channel (แถวหน่วยขายอยู่ที่ Sub-channel Allocation)
      //   wf* / share* / unallocated / overAllocated ใช้ในรายงานสรุปแผน (Waterfall · แท่งสัดส่วน Channel)
      topDown: {
        title: 'Annual Target',
        short: 'Annual Target',
        titleTip: 'กำหนดเป้าหมายประจำปี',
        lead: ['กำหนด Total Target (Net Sales) ประจำปี และเป้าหมายของแต่ละ Channel'],
        workflowTitle: 'Annual Target ปี {year}',
        totalLabel: 'Total Target',
        columns: {
          name: 'Channel',
          history: 'ยอดขาย (ล้านบาท)',
          historyTip: 'ยอดขาย Net Sales: ยอดจริงทั้งปี 2 ปีล่าสุด และ L12M (ยอดจริง 12 เดือนล่าสุดที่ปิดแล้ว ใช้เป็นฐานเทียบการเติบโต)',
          pctTotal: '% ของ Total',
          pctTotalTip: 'สัดส่วนเป้าหมายของ Channel เทียบกับ Total Target',
          amount: 'เป้าหมาย {year} (บาท)',
          amountTip: 'เป้าหมาย Net Sales ของ Channel',
          growth: 'การเติบโต',
          manage: 'จัดการ'
        },
        unitsLink: '{n} หน่วยขาย',
        // CR-24: กราฟใต้ตาราง
        charts: {
          columnsTitle: 'ยอดขายและเป้าหมายราย Channel (ล้านบาท)',
          targetColumn: 'เป้าหมาย {year}',
          overlap: 'ช่วงเวลาทับซ้อน',
          segmentTip: '{channel} · {column}: {amount} ล้านบาท'
        },
        unitsLinkTip: 'ไปที่ {page} ของ {channel}',
        remainingTotal: 'คงเหลือระดับ Total',
        usePriorShares: 'เติมตามสัดส่วน L12M',
        usePriorSharesTitle: 'กำหนดสัดส่วนของทุก Channel ตามยอดขาย L12M (Channel ที่ไม่มียอดขาย L12M ได้ 0%)',
        usePriorShareOne: 'เติมตามสัดส่วน L12M',
        usePriorShareOneTitle: 'กำหนดสัดส่วนของ Channel นี้ตามยอดขาย L12M',
        normalize: 'กระจายตามสัดส่วนปัจจุบัน',
        normalizeTitle: 'ปรับสัดส่วนของทุก Channel ตามสัดส่วนเดิมให้รวมเป็น 100%',
        addChannel: '+ เพิ่ม Channel',
        addChannelPlaceholder: 'เลือก Channel',
        noMoreChannels: 'Channel ใน Channel Master อยู่ในแผนครบแล้ว',
        removeChannel: 'นำ Channel ออกจากแผน',
        removeChannelConfirm: 'นำ {name} และทุกหน่วยขายใน Channel นี้ออกจากแผนปี {year}',
        removeChannelLine: 'เป้าหมาย {amount} บาท · {count} หน่วยขาย จะถูกนำออกจากแผน',
        wfTitle: 'ที่มาของการเติบโต (ล้านบาท)',
        wfStart: 'ยอดขาย L12M',
        wfEnd: 'Total Target {year}',
        wfTip: '{name}: เป้าหมาย {target} · ยอดขาย L12M {prior} ล้านบาท',
        wfAxis: 'แกนเริ่มที่ {value} ล้านบาท · ตัวเลขบนแท่ง = ส่วนต่างเทียบ L12M',
        // CR-36: Tooltip ของ Waterfall แนวตั้ง (ล้านบาท)
        wfStepTip: '{name} · ยอดขาย L12M {prior} · เป้าหมาย {target} · ส่วนต่าง {delta} · เติบโต {growth} (ล้านบาท)',
        wfTotalTip: '{label}: {value} ล้านบาท',
        shareTitle: 'สัดส่วน Channel L12M เทียบเป้าหมายปี {year}',
        shareTip: '{name} {pct}',
        unallocated: 'ยังไม่จัดสรร',
        overAllocated: 'จัดสรรเกิน',
        exportSpec: {
          file: 'Annual-Target_{year}_{status}_{date}', sheet: 'Annual Target',
          cols: { channel: 'Channel', level: 'ระดับ', units: 'จำนวนหน่วยขาย', history: 'ยอดขายปี {year} (บาท)', l12m: 'ยอดขาย L12M {range} (บาท)',
            pctOfTotal: '% ของ Total', amount: 'เป้าหมาย {year} (บาท)', growth: 'การเติบโต (%)', growthAmount: 'การเติบโต (บาท)' },
          levels: { channel: 'Channel', total: 'Total', remaining: 'คงเหลือ' }
        },
        summaryLines: {
          total: 'Total Target {amount} บาท',
          channel: '{name} {pct} = {amount} บาท'
        }
      },

      // CR-23 ขั้นที่ 2 Sub-channel Allocation: Sales Director แบ่งเป้าของ Channel ลงหน่วยขาย (ส่วน A) และกระจายเป็นรายเดือน (ส่วน B)
      phasing: {
        title: 'Sub-channel Allocation',
        short: 'Sub-channel Allocation',
        titleTip: 'จัดสรรเป้าหมายหน่วยขาย',
        lead: ['จัดสรรเป้าหมายของ Channel ให้แต่ละหน่วยขาย และกระจายเป็นรายเดือน'],
        workflowTitle: 'Sub-channel Allocation ของ {unit}',
        channelLabel: 'Channel',
        stats: { target: 'เป้าหมาย Channel', targetBy: '(กำหนดโดย Management)' },
        changeNotice: 'เป้าหมาย {channel} เปลี่ยนจาก {from} เป็น {to} บาท เมื่อ {at} · หน่วยขายคงสัดส่วน % เดิม',
        changeDismiss: 'ปิด',
        changeDismissTitle: 'ปิดบรรทัดแจ้งนี้',
        waitTarget: 'รอ Management กำหนดเป้าหมายของ {channel}',
        waitTargetLink: 'ไปที่หน้า {page}',
        editBlocked: 'แก้ไขได้หลังจาก Management กำหนดเป้าหมายของ {channel}',
        noChannels: 'แผนของปีนี้ยังไม่มี Channel',
        goTopDown: 'ไปที่หน้า {page}',
        // ---------- ส่วน A: จัดสรรลงหน่วยขาย ----------
        unitsTitle: 'จัดสรรลงหน่วยขาย · {channel}',
        unitsHint: 'คลิกหน่วยขายเพื่อดูเป้าหมายรายเดือน',
        columns: {
          name: 'หน่วยขาย',
          history: 'ยอดขาย (ล้านบาท)',
          historyTip: 'ยอดขาย Net Sales: ยอดจริงทั้งปี 2 ปีล่าสุด และ L12M (ยอดจริง 12 เดือนล่าสุดที่ปิดแล้ว ใช้เป็นฐานเทียบการเติบโต)',
          pctChannel: '% ใน Channel',
          pctChannelTip: 'สัดส่วนของหน่วยขายเทียบกับเป้าหมายของ Channel · กรอกที่คอลัมน์นี้',
          amount: 'เป้าหมาย {year} (บาท)',
          amountTip: 'เป้าหมาย Net Sales ของหน่วยขาย · ชี้ที่ตัวเลขเพื่อดู Sale Amount (รวม VAT) ที่เทียบเท่า',
          pctTotal: '% ของ Total',
          pctTotalTip: '% ใน Channel × % ของ Total ของ Channel (อ่านอย่างเดียว)',
          growth: 'การเติบโต',
          // CR-27: แผน SKU (Net Sales ทั้งปีจาก SKU Planning) · ส่วนต่างแผน (แผน − เป้าหมาย)
          plan: 'แผน SKU', planTip: 'ผลรวม Net Sales ทั้งปีของแผน SKU ของหน่วยขาย (ล้านบาท · ตัวเลขเดียวกับหน้า SKU Planning) · คลิกเพื่อเปิด SKU Planning',
          planGap: 'ส่วนต่างแผน', planGapTip: 'แผน SKU − เป้าหมาย (ล้านบาท) · + = แผนเกินเป้า · − = แผนขาด · ✓ = จัดสรรครบ',
          manage: 'จัดการ'
        },
        aggregateRow: 'รวมทั้ง {channel}',
        aggregateTag: 'มุมมองรวม',
        aggregateRowTip: 'คลิกเพื่อดูเป้าหมายรายเดือนรวมทั้ง Channel (มุมมองรวม · อ่านอย่างเดียว)',
        planLinkTip: 'เปิด SKU Planning ของ {name}',
        planTotalTip: 'ผลรวมแผน SKU ของหน่วยขายใน Channel นี้',
        // CR-27: หมายเหตุต่อหน่วยขาย (plan.<ปี>.unitNotes)
        noteLabel: 'หมายเหตุของ {name}', noteAdd: 'เขียนหมายเหตุของ {name}', noteTitle: 'หมายเหตุ · {name}',
        noteHint: 'ไม่บังคับ · แสดงใน Tooltip ของหน่วยขายและไฟล์ส่งออก · ลบข้อความทั้งหมด = ลบหมายเหตุ', noteSave: 'ตกลง',
        // CR-27: ส่วน B
        channelPatternButton: 'ใช้รูปแบบรายเดือนของ Channel',
        channelPatternTip: 'ตั้งสัดส่วนรายเดือนตามยอดอ้างอิงรวมของทั้ง {channel}',
        channelPatternConfirm: 'ใช้รูปแบบรายเดือนของ {channel} กับ {unit}',
        channelPatternLine: 'สัดส่วนรายเดือนทุกเดือนของหน่วยขายนี้จะเปลี่ยนตามยอดอ้างอิงรวมของทั้ง Channel (บันทึกเมื่อกด บันทึก)',
        growthUniform: 'การเติบโตเท่ากันทุกเดือน ',
        selectTip: 'คลิกเพื่อดูเป้าหมายรายเดือนของ {name}',
        monthlyStatus: 'เป้าหมายรายเดือน: {status}',
        remainingIn: 'คงเหลือใน {channel}',
        noUnits: 'ยังไม่มี {unit}',
        noUnitsHint: 'กด แก้ไข แล้ว + {unit} เพื่อเพิ่มจาก Partner List',
        usePriorShares: 'เติมตามสัดส่วน L12M',
        usePriorSharesTitle: 'กำหนดสัดส่วนของหน่วยขายตามยอดขาย L12M (หน่วยที่ไม่มียอดขาย L12M ได้ 0%)',
        normalize: 'กระจายตามสัดส่วนปัจจุบัน',
        normalizeTitle: 'ปรับสัดส่วนของทุกหน่วยขายตามสัดส่วนเดิมให้รวมเป็น 100%',
        addPlaceholder: 'เลือกจาก Master',
        removeUnitConfirm: 'นำ {name} ออกจากแผนปี {year}',
        removeUnitLine: 'สัดส่วน {pct} · เป้าหมาย {amount} บาท จะถูกนำออกจากแผน',
        removeUnitMonthly: 'เป้าหมายรายเดือนของ {name} (สัดส่วน 12 เดือน) จะถูกลบด้วย',
        // CR-18: Sale Amount = Net Sales ÷ (1 − GP) × (1 + VAT) / ไม่หัก GP = Net Sales × (1 + VAT)
        saleTip: {
          gp: 'เทียบเท่า Sale Amount (รวม VAT) {sale} บาท = เป้าหมาย ÷ (1 − {gpLabel} {gp}) × {vat}',
          noGp: 'เทียบเท่า Sale Amount (รวม VAT) {sale} บาท = เป้าหมาย × {vat} (ไม่หัก GP)',
          missing: 'ยังไม่ได้กำหนด {gpLabel} ของ {unit} · คำนวณ Sale Amount ไม่ได้'
        },
        // ---------- ส่วน B: เป้าหมายรายเดือน ----------
        monthlyTitle: 'เป้าหมายรายเดือน · {unit}',
        monthlyAnnual: 'เป้าหมายทั้งปี {amount} บาท',
        chartHide: 'ซ่อนกราฟ',
        chartShow: 'แสดงกราฟ',
        resetButton: 'คืนค่าตามยอดอ้างอิง',
        rows: { month: 'เดือน', owner: 'ผู้รับผิดชอบ', prior: 'ยอดขายอ้างอิง (บาท)', pct: 'สัดส่วนรายเดือน (%)', amount: 'เป้าหมาย Net Sales (บาท)', growth: 'การเติบโตเทียบยอดอ้างอิง' },
        totalColumn: 'รวมทั้งปี',
        defaultTip: 'ค่าตั้งต้น {pct}',
        legendTarget: 'เป้าหมายปีนี้',
        legendPrior: 'ยอดขายอ้างอิง',
        basisTag: { channel: 'ค่าตั้งต้นใช้ยอดอ้างอิงของ Channel', flat: 'ไม่มียอดขายอ้างอิง ค่าตั้งต้นเท่ากันทุกเดือน' },
        summaryLines: { annual: 'เป้าหมายทั้งปี {amount} บาท', months: 'รวม 12 เดือน {pct} = {sum} บาท', remaining: 'คงเหลือ: {remaining}' },
        exportSpec: {
          file: 'Sub-channel-Allocation_{year}_{channel}_{status}_{date}',
          sheets: { units: 'หน่วยขาย', monthly: 'รายเดือน' },
          cols: {
            unit: 'หน่วยขาย', owner: 'ผู้รับผิดชอบปัจจุบัน', history: 'ยอดขายปี {year} (บาท)', l12m: 'ยอดขาย L12M {range} (บาท)', pctInChannel: '% ใน Channel', amount: 'เป้าหมาย {year} (บาท)',
            pctOfTotal: '% ของ Total', growth: 'การเติบโต (%)', growthAmount: 'การเติบโต (บาท)', total: 'รวมทั้งปี (บาท)', remaining: 'คงเหลือรายเดือน (บาท)',
            plan: 'แผน SKU (บาท)', planGap: 'ส่วนต่างแผน (บาท)', note: 'หมายเหตุ'
          },
          remaining: 'คงเหลือใน {channel} · {status}'
        },
        // มุมมองรวม (CR-13): รวมทั้ง Channel อ่านอย่างเดียว ผลรวมคำนวณทุกครั้ง (calc.aggregatePhasing) ไม่เก็บลง store
        aggregate: {
          readOnly: 'มุมมองรวม · เลือกหน่วยขายเพื่อแก้ไขเป้าหมายรายเดือน',
          chartTitle: '{name} · เป้าหมายรายเดือน (ล้านบาท)',
          priorTip: 'รวมยอดขาย L12M ของ {n} หน่วยขายในแผน',
          chartLabel: 'รูปแบบกราฟ',
          chartModes: { total: 'แท่งรวม', units: 'แยกตามหน่วยขาย' },
          legendTotal: 'เป้าหมายรวม',
          legendPrior: 'ยอดขายอ้างอิง',
          legendTip: 'ไปที่มุมมองของ {name}',
          tipTotal: 'รวม',
          tipPrior: 'ยอดขายอ้างอิง',
          unitsRow: 'เป้าหมายรายหน่วยขาย ({n} หน่วย)',
          unitsToggle: 'แสดงหรือซ่อนเป้าหมายรายหน่วยขาย',
          incomplete: 'หน่วยขายที่เป้าหมายรายเดือนยังจัดสรรไม่ครบ: {n} หน่วย',
          complete: 'เป้าหมายรายเดือนจัดสรรครบทุกหน่วยขาย',
          openUnit: 'เปิดเป้าหมายรายเดือนของ {name}'
        }
      },

      // โหมดดู/แก้ไข (workflowBar แบบง่าย ไม่มีขั้นอนุมัติ)
      // Product Master · รายการสินค้า (modules/products)
      productList: {
        // CR-35: ชื่อหน้าภาษาอังกฤษ · คำอธิบายใต้หัวข้อย้ายไปบรรทัดแรกของปุ่ม ? (helpLead)
        title: 'Product List', short: 'Product List',
        lead: [],
        helpLead: 'ข้อมูลหลักของสินค้า ราคา และสถานะความครบถ้วนของข้อมูล',
        // CR-36: แท็บ สินค้า | Product Level (หน้า Category & Series เดิม) · ป้าย ระบบกำหนด = ลิงก์ไปแท็บ Product Level
        pageTabLabel: 'แท็บ', pageTabs: { items: 'สินค้า', level: 'Product Level' }, levelLinkTip: 'กดเพื่อเปิด Product Level ที่ Type นี้',
        // CR-30: KPI 6 ใบ กดเพื่อกรอง · CR-35 ทั้งหมด = ไม่นับ Delete · NPD = Request + Planned + NPD (บรรทัดย่อยกดแยกได้) · ยังไม่เปิดใน TRCLOUD = Request
        kpi: { all: 'ทั้งหมด', active: 'Active', activeSub: 'Discontinued {n}', npd: 'NPD', npdSubs: { request: 'ขอ NPD {n}', planned: 'ยืนยันแล้ว {n}', 'new': 'เปิดขายแล้ว {n}' }, tempCodeSub: 'รหัสชั่วคราว', npdSub: 'ยังไม่เปิดขาย {a} · เปิดขายแล้ว {b}', required: 'ขาดข้อมูลจำเป็น', recommended: 'ขาดข้อมูลที่ควรมี',
          notInTrcloud: 'ยังไม่เปิดใน TRCLOUD', unit: 'SKU', title: 'กดเพื่อกรองตาราง' },
        searchPlaceholder: 'ค้นหา Product Code / ชื่อ / Barcode',
        viewLabel: 'มุมมอง',
        views: { list: 'รายการ', group: 'จัดกลุ่ม' },
        filters: {
          status: 'Status', statusAll: 'ไม่รวม Delete', statusEverything: 'ทั้งหมด', category: 'หมวดสินค้า', categoryAll: 'ทุกหมวดสินค้า',
          year: 'Product Year', yearAll: 'ทุก Product Year', yearSelected: '{n} ปี',
          revenue: 'ประเภทรายได้', revenueAll: 'ทุกประเภทรายได้',
          channel: 'Channel ที่ Listing', channelAll: 'ทุก Channel',
          completeness: 'ความครบถ้วน', completenessAll: 'ทุกระดับ',
          // CR-20: สินค้าที่ Sales สร้างจากหน้าวางแผน SKU
          source: 'ที่มา', sourceAll: 'ทุกที่มา', sourceOptions: { product: 'ทีม Product', sales: 'จาก Sales' },
          trcloud: 'ใน TRCLOUD', trcloudAll: 'ทุกสถานะ TRCLOUD',
          fromSales: 'จาก Sales', fromSalesTip: 'คำขอจาก Sales · ผู้ขอ {by} · {date} · หน่วยขาย {units} · หมายเหตุ {note}',
          completenessOptions: { ok: 'ครบ', required: 'ขาดข้อมูลจำเป็น', recommended: 'ขาดข้อมูลที่ควรมี' },
          // CR-30: แถวที่สอง (กดครั้งเดียวกาง · จำสถานะที่ ui.productMoreFilters)
          more: 'ตัวกรองเพิ่มเติม ({n})', moreTitle: 'แสดง / ซ่อนตัวกรองเพิ่มเติม',
          chip: '{label}: {value}', kpiChip: 'KPI: {value}', searchChip: 'ค้นหา: {value}'
        },
        statusAsOf: 'Status ณ {month}',
        columnsButton: 'คอลัมน์ ▾',
        fixedColumns: 'Product Code และชื่อสินค้าแสดงเสมอ (ติดซ้าย)',
        // CR-30: Preset ของระบบ (คอลัมน์อยู่ใน data/settings.js PRODUCT_COLUMN_PRESETS)
        presets: { standard: 'มาตรฐาน', price: 'ราคา', completeness: 'ตรวจความครบถ้วน' },
        compareErp: 'เปรียบเทียบกับ ERP',
        addSku: '+ เพิ่ม SKU',
        resultCount: 'แสดง {n} จาก {total} SKU',
        columns: {
          image: 'รูป', code: 'Product Code', name: 'ชื่อสินค้า', status: 'Status',
          category: 'Category', subCategory: 'Sub Category', type: 'Type', series: 'Series', subSeries: 'Sub Series',
          rsp: 'RSP (บาท)', completeness: 'ความครบถ้วน', manage: 'จัดการ',
          barcode: 'Barcode', packSize: 'ขนาดบรรจุ', launchDate: 'เดือนเปิดตัว', productYear: 'Product Year',
          listedCount: 'Listing (หน่วยขาย)', sellIn: 'ราคา Dealer {channel} (บาท)', inTrcloud: 'ใน TRCLOUD', source: 'ที่มา', updatedAt: 'แก้ไขล่าสุด'
        },
        trcloud: { open: 'เปิดแล้ว', notOpen: 'ยังไม่เปิด' },
        groupHead: '{name} · {n} SKU',
        noSeries: '(ไม่ระบุ Series)',
        noSubSeries: '(ไม่ระบุ Sub Series)',
        empty: 'ไม่พบสินค้าตามตัวกรอง',
        viewDetail: 'ดูรายละเอียด',
        removeTitle: 'ลบ SKU',
        removeConfirm: 'ลบ {code} ออกจาก Product Master (เลข Product Code นี้จะไม่ถูกนำกลับมาใช้)',
        removeBlocked: 'ลบได้เฉพาะ SKU ที่ยังไม่มี Listing ราคาต่อ Account หรือแผน NPD · ปิดการขายด้วยเดือนเลิกขายแทน',
        exportFile: 'Product-List_{date}',
        exportSheet: 'Product List',
        tabs: { general: 'ข้อมูลทั่วไป', price: 'ราคา', listing: 'Listing และวงจรสินค้า', history: 'ประวัติการแก้ไข' },
        edit: 'แก้ไข',
        completenessPct: 'ความครบถ้วน {pct}',
        general: {
          codes: 'รหัส', names: 'ชื่อสินค้า', category: 'หมวดสินค้า', series: 'Series', other: 'ขนาดบรรจุและหมายเหตุ', image: 'รูปสินค้า',
          placeholder: 'เลือก', imageUpload: 'เลือกรูปจากเครื่อง', imageRemove: 'ลบรูป',
          imageNote: 'ระบบย่อรูปให้ด้านยาวไม่เกิน {px}px ก่อนเก็บ (ไม่เก็บไฟล์ต้นฉบับ)', imageError: 'อ่านไฟล์รูปไม่ได้',
          // CR-30: Product Code ระบบสร้าง แก้ไม่ได้
          codeLocked: 'Product Code สร้างโดยระบบ แก้ไขไม่ได้',
          codeNote: 'Product Code สร้างโดยระบบจากเลขนำหน้าของ Type ที่เลือก',
          trcloudNote: 'ตั้งจากผลของปุ่ม เปรียบเทียบกับ ERP',
          note: 'หมายเหตุ'
        },
        // CR-30: แท็บราคาอ่านอย่างเดียว (แก้ที่หน้าราคาและ Promotion)
        price: {
          readonly: 'ราคารวม VAT · แก้ไขที่หน้าราคาและ Promotion', link: 'เปิดหน้าราคาและ Promotion ›',
          baseTitle: 'ราคาหลักตามรอบเวลา', noPrice: 'ยังไม่มีราคาหลัก',
          columns: { type: 'ประเภทราคา', from: 'มีผลตั้งแต่', price: 'ราคา (บาท)', by: 'ผู้บันทึก' },
          inUse: 'ใช้อยู่ ณ {month}',
          promoTitle: 'Promotion Price', promoEmpty: 'ยังไม่มี Promotion Price ของสินค้านี้',
          promoLine: '{level} · {range} · {price} บาท{diff}', wholeChannel: 'ทั้ง {channel}', vsBase: ' ({pct} เทียบ {type} {base})'
        },
        listing: {
          launch: 'เดือนเปิดตัว', listedTitle: 'หน่วยขายที่ Listing ({n})', listedEmpty: 'ยังไม่ได้ Listing',
          listingLink: 'แก้ไขที่ Launch & Listing แท็บ Listing', clearance: 'Clearance', clearanceNone: 'ไม่มี',
          clearanceText: '{from} – {to} · Stock {stock} ชิ้น', clearanceUntilSold: 'จนสินค้าหมด', discontinue: 'เดือนเลิกขาย', discontinueNone: 'ยังขายอยู่',
          // CR-35: Status Delete (เลิกขายแล้ว ไม่ผลิต ไม่ขาย) · ถามยืนยันเมื่อสินค้ายังมีในแผน
          deleted: 'Delete ตั้งแต่เดือน', deletedNone: 'ยังไม่ Delete', deletedTip: 'เลิกขายแล้ว ไม่ผลิต ไม่ขาย · แถวในแผน SKU อ่านอย่างเดียว (ไม่ล้างค่าให้อัตโนมัติ)',
          deleteConfirm: { title: 'เปลี่ยนเป็น Delete · {name}', inPlan: 'สินค้านี้มีในแผน {n} หน่วยขาย ({units})', none: 'สินค้านี้ไม่มีในแผน SKU', note: 'แถวในแผนยังแสดงแต่อ่านอย่างเดียว · ไม่ล้างค่าให้อัตโนมัติ', confirm: 'เปลี่ยนเป็น Delete' },
          timelineTitle: 'Status ปี {year}', npdLink: 'แผน NPD: {stage} · {status}', npdLinkStage: 'แผน NPD: {stage}'
        },
        history: { columns: { at: 'วันเวลา', by: 'ผู้แก้ไข', field: 'ฟิลด์', change: 'ค่าเดิม → ค่าใหม่' }, empty: 'ยังไม่มีประวัติการแก้ไข', imageYes: 'มีรูป', imageNo: 'ไม่มีรูป' },
        create: {
          title: 'เพิ่ม SKU ใหม่', submit: 'เพิ่ม SKU', nameRequired: 'กรุณากรอกชื่อสินค้า', rspLabel: 'RSP (บาท)', rspFrom: 'RSP มีผลตั้งแต่',
          // CR-30: แสดงรหัสที่จะได้ก่อนกดบันทึก
          codePreview: 'Product Code ที่จะได้: {code}', codePending: 'เลือก Type เพื่อดู Product Code ที่จะได้',
          codeErrors: { type: 'กรุณาเลือกหมวดสินค้าถึง Type (Product Code สร้างจากเลขนำหน้าของ Type)', prefix: 'กำหนดเลขนำหน้า Product Code ของ Type นี้ก่อน', full: 'เลข Product Code ของกลุ่มนี้เต็มแล้ว' }
        },
        erp: {
          title: 'เปรียบเทียบกับ ERP', note: 'เทียบกับข้อมูล TRCLOUD ตัวอย่าง (data/erp-snapshot.js) · Product Code เป็นเลขเดียวกับ TRCLOUD (Product Master เป็นต้นทาง)',
          groups: { onlyErp: 'มีใน TRCLOUD แต่ไม่มีใน Product Master', onlyMaster: 'มีใน Product Master แต่ไม่มีใน TRCLOUD', mismatches: 'ฟิลด์ไม่ตรงกัน',
            trcloud: 'สถานะ ใน TRCLOUD ที่ต่างจากผลเปรียบเทียบ' },
          fields: { name: 'ชื่อ', barcode: 'Barcode', rsp: 'RSP' }, master: 'Product Master', erpValue: 'TRCLOUD',
          use: 'ใช้ค่าจาก ERP', useHint: 'ใช้ค่าจาก ERP ได้ในโหมดแก้ไข', none: 'ไม่มีรายการ', applied: 'ใช้ค่าจาก ERP แล้ว (ยังไม่บันทึก)',
          importSame: 'นำเข้าด้วยรหัสเดิม', imported: 'นำเข้า {code} ด้วยรหัสเดิมแล้ว (ยังไม่บันทึก · เติมข้อมูลที่ขาดก่อนใช้วางแผน)',
          trcloudApply: 'ปรับสถานะตามผลเปรียบเทียบ', trcloudApplied: 'ปรับสถานะ ใน TRCLOUD แล้ว {n} รายการ (ยังไม่บันทึก)', trcloudLine: '{from} → {to}'
        }
      },

      // Product Master · แผน NPD (modules/npd-plan · CR-30 ช่วงเวลาต่อเนื่อง · ขั้นงานมีเดือนเป้าหมาย · เดือนเปิดตัวแบบไตรมาส)
      // CR-35: Launch & Listing = แท็บ NPD (pages.npdPlan) | Listing (pages.productMaster) · คำอธิบายอยู่ในปุ่ม ?
      launchListing: {
        title: 'Launch & Listing', short: 'Launch & Listing', lead: [],
        helpLead: 'แผนการเปิดตัวสินค้าใหม่ (NPD) และสถานะ / ช่วงเวลาวางขายของสินค้าในแต่ละหน่วยขาย (Listing)',
        tabLabel: 'แท็บ', tabs: { npd: 'NPD', listing: 'Listing' }
      },
      npdPlan: {
        title: 'แผนการเปิดตัวสินค้าใหม่ (NPD)',
        moved: 'หน้านี้รวมอยู่ใน Launch & Listing แล้ว (แท็บ NPD)', go: 'ไปหน้า Launch & Listing', viewListing: 'ดู Listing',
        lead: ['ติดตามสินค้าใหม่ตั้งแต่วางแผนจนเปิดตัว ทีมขายใช้ดูว่าสินค้าใหม่ใดพร้อมขายเมื่อใด ทีม Product ใช้ติดตามขั้นงานและคำขอจากทีมขาย'],
        kpi: {
          all: 'NPD ทั้งหมด', notLaunched: 'ยังไม่เปิดตัว', soon: 'เปิดตัวใน 3 เดือน', bySeries: 'ตาม Series',   // CR-36 ไม่ใช้แล้ว (แทนด้วย kpi3)
          missing: 'หน่วยขายที่ยังไม่อยู่ในแผน SKU', missingTitle: 'หน่วยขายที่วางแผนแต่ยังไม่อยู่ในแผน SKU', missingEmpty: 'ทุกหน่วยขายที่วางแผนอยู่ในแผน SKU แล้ว',
          missingLine: '{sku} · {unit}', missingYear: 'แผน SKU ปี {year}', open: 'เปิด SKU Planning ›'
        },
        // CR-36: การ์ด KPI 3 ใบ · หน่วยขายที่มี Listing ในปีแผนแต่ยังไม่อยู่ในแผน SKU (calc.listedNotPlanned)
        kpi3: { planned: 'NPD ยังไม่เปิดตัว', 'new': 'NPD เปิดตัวแล้ว', request: 'Request จาก Sales', unit: 'SKU', title: 'กดเพื่อกรองตาม Status', chip: 'KPI: {value}' },
        notPlanned: { chip: 'มี Listing แต่ยังไม่อยู่ในแผน SKU ({n})', chipTip: 'สินค้าที่มีอย่างน้อย 1 หน่วยขายที่ Listing ปี {year} แต่แผน SKU ของหน่วยขายนั้นยังไม่มีสินค้านี้',
          chipOn: 'มี Listing แต่ยังไม่อยู่ในแผน SKU ปี {year}', cell: 'ยังไม่อยู่ในแผน {n}', title: 'หน่วยขายที่มี Listing ปี {year} แต่ยังไม่อยู่ในแผน SKU', go: 'ไปที่ SKU Planning ›' },
        viewLabel: 'มุมมอง',
        views: { timeline: 'Timeline', table: 'ตาราง' },
        range: 'ช่วงเวลา', rangeOption: '{n} เดือน', from: 'ตั้งแต่',
        seriesAll: 'ทุก Series', stageFilter: 'ขั้นงาน', stageAll: 'ทุกขั้นงาน', sourceFilter: 'ที่มา', sourceAll: 'ทุกที่มา',
        sources: { PRODUCT: 'ทีม Product', SALES: 'จาก Sales' },
        // CR-34: ที่มา = ทีม Product | Sales · ชื่อผู้ขอ (Tooltip เหตุผล) · Chip นับเฉพาะคำขอที่ยังไม่ยืนยัน
        sourceSales: 'Sales · {name}', sourceReason: 'เหตุผล: {reason}', sourceNoReason: 'ไม่ได้ระบุเหตุผล',
        requestsChip: 'คำขอจาก Sales ({n})', requestsTip: 'คำขอ NPD จาก Sales ที่ทีม Product ยังไม่ยืนยัน · กดเพื่อแสดงเฉพาะคำขอ · กดอีกครั้งเพื่อแสดงทั้งหมด',
        requestBadge: 'ขอ NPD',
        stages: { plan: 'วางแผน', concept: 'สรุปแนวคิด', production: 'เตรียมผลิต', ready: 'พร้อมขาย', launched: 'เปิดตัวแล้ว' },
        stageAuto: 'ระบบตั้ง เปิดตัวแล้ว ให้เมื่อถึงเดือนเปิดตัว',
        columns: { sku: 'SKU', series: 'Series', stage: 'ขั้นงาน', launch: 'เดือนเปิดตัว', accounts: 'Channel / หน่วยขายที่วางแผน', inPlan: 'ใช้ในแผน',
          rsp: 'ราคา RSP ที่คาด (บาท)', owner: 'ผู้รับผิดชอบ', source: 'ที่มา', trcloud: 'ใน TRCLOUD' },
        rowLine: 'เปิดตัว {launch} · {n} หน่วยขาย · ในแผน SKU {x}/{n}',
        quarter: '{q} {y}', unconfirmed: 'เดือนเปิดตัวยังไม่ยืนยัน', noLaunch: 'ยังไม่กำหนด',
        pin: 'เปิดตัว {month}', quarterBand: 'เปิดตัวใน {q} (ยังไม่ยืนยันเดือน)', npdBand: 'NPD', npdBandTip: 'ช่วง NPD 3 เดือนแรกนับจากเดือนเปิดตัว',
        stageTip: '{stage}: {from} – {to}', currentStage: ' (ขั้นปัจจุบัน)', overdue: 'เลยเดือนเป้าหมายแล้วยังไม่เสร็จ: {stages}',
        accountsCount: '{n} หน่วย', inPlanText: '{x} / {y}',
        // CR-34: ใช้ในแผน = จำนวนหน่วยขายที่มีสินค้านี้ในแผน SKU (ปีเปิดตัว)
        usedText: '{n} หน่วยขาย', usedTip: 'อยู่ในแผน SKU ปี {year}: {units}', usedNone: 'ยังไม่มีหน่วยขายใดมีสินค้านี้ในแผน SKU ปี {year}',
        usedMissing: 'วางแผนแต่ยังไม่อยู่ในแผน SKU: {units}',
        empty: 'ไม่มีแผน NPD ตามตัวกรองในช่วงเวลานี้',
        create: '+ เพิ่ม NPD', createTitle: 'เพิ่มแผน NPD',
        pickSku: 'SKU ที่ยังไม่มีแผน NPD', pickPlaceholder: 'เลือก SKU',
        orNew: 'หรือสร้าง SKU ใหม่ (Product Code จากระบบตาม Type)', newName: 'ชื่อสินค้าใหม่',
        createSubmit: 'สร้างแผน NPD', nameRequired: 'กรุณาเลือก SKU หรือกรอกชื่อสินค้าใหม่',
        drawerTitle: 'แผน NPD · {name}', workflowTitle: 'แผน NPD ของ {name}',
        fields: {
          product: 'SKU', series: 'Series', stage: 'ขั้นปัจจุบัน', targets: 'เดือนเป้าหมายของขั้นงาน (ไม่บังคับ)', launch: 'เดือนเปิดตัว',
          launchModes: { month: 'เดือน', quarter: 'ไตรมาส' }, quarterSelect: 'ไตรมาส', rsp: 'ราคา RSP ที่คาด (บาท)', owner: 'ผู้รับผิดชอบฝั่ง Product',
          source: 'ที่มา', accounts: 'หน่วยขายที่วางแผนและเดือนเริ่มขาย', note: 'หมายเหตุ',
          requestedBy: 'ผู้ขอ', reason: 'เหตุผล / แนวคิดสินค้า', request: 'สถานะคำขอ'
        },
        // CR-34: ทีม Product ยืนยันคำขอ NPD จาก Sales (การแก้ไขปกติของหน้า ไม่มีขั้นอนุมัติ · ไม่ใช้ Flag npdApproval)
        requestStates: { pending: 'รอทีม Product ยืนยัน (Request)', confirmed: 'ยืนยันเป็น NPD แล้ว (Planned)' },
        confirmedLine: 'ยืนยันโดย {by} · {date}',
        confirmNote: 'ยืนยันแล้ว แถวของสินค้านี้ในหน้า SKU Planning เปลี่ยนเป็นประเภท NPD ยืนยันแล้ว เมื่อบันทึก',
        addAccount: '+ หน่วยขาย',
        startMonth: 'เดือนเริ่มขาย',
        removeAccount: 'นำหน่วยขายออกจากแผน NPD',
        noAccounts: 'ยังไม่มีหน่วยขายที่วางแผน',
        inSkuPlan: 'อยู่ในแผน SKU แล้ว',
        notInSkuPlan: 'ยังไม่อยู่ในแผน SKU',
        openSkuPlan: 'เปิดหน้า SKU Planning ของ {unit}',
        productLink: 'เปิดรายละเอียดสินค้า',
        approvedEffect: 'อนุมัติแล้ว: ตั้งเดือนเปิดตัวและ Listing ให้อัตโนมัติ และเดือนเริ่มขายเป็นค่าตั้งต้นในหน้า SKU Planning',
        // CR-17 ปิด npdApproval
        saveEffect: 'บันทึกแล้วมีผลทันที: แผนที่มีเดือนเปิดตัว (หรือไตรมาส) และหน่วยขายจะตั้งเดือนเปิดตัวและ Listing ให้ และเดือนเริ่มขายเป็นค่าตั้งต้นในหน้า SKU Planning · แผนแบบไตรมาส = สินค้าเป็น Planned จนกว่าจะระบุเดือน',
        launchMovedNote: 'เลื่อนเดือนเปิดตัวหลังอนุมัติ: แผนกลับเป็นฉบับร่าง และแผน SKU ที่อนุมัติแล้วของหน่วยขายที่วางแผนเป็น "ต้องตรวจสอบใหม่"',
        summaryLines: { launch: 'เดือนเปิดตัว {date}', accounts: 'หน่วยขายที่วางแผน {n} หน่วย', stage: 'ขั้น {stage}' },
        exportFile: 'NPD-Plan_{date}', exportSheet: 'แผน NPD'
      },

      // Product Master · ราคาและ Promotion (modules/promotions · CR-30 แทนราคาขายต่อ Account และปฏิทิน Promotion)
      promotionPrice: {
        title: 'Price & Promotion',
        short: 'Price & Promotion',
        lead: [],
        helpLead: 'ราคาหลักตามรอบเวลา และ Promotion Price รายเดือนของแต่ละ Channel และหน่วยขาย',
        tabs: { base: 'ราคาหลัก', promo: 'Promotion Price', clearance: 'Clearance' },
        tabLead: {
          base: 'ราคาหลักรวม VAT เปลี่ยนได้รายเดือน มีผลวันที่ 1 · MT / ECOM / Export ใช้ RSP · TT ใช้ TT Dealer',
          promo: 'ราคาของหน่วยขายรายเดือน: ราคา Clearance → Promotion Price ของหน่วยขาย → ของทั้ง Channel → ราคาหลัก',
          clearance: 'ราคา Clearance ใช้แทนทุกลำดับราคาในเดือนที่อยู่ในช่วง Clearance ของหน่วยขายนั้น · แก้ได้เฉพาะผู้มีสิทธิ์ Clearance'
        },
        // CR-35: แท็บ Clearance (1 แถวต่อ SKU × ช่วง Clearance · สิทธิ์ย่อย listing.clearance · หน้าจัดการ Clearance แยกและรายงานรายได้ = Phase 2)
        clearance: {
          columns: { sku: 'SKU', base: 'ราคาหลัก (บาท)', price: 'ราคา Clearance (บาท)', discount: 'ส่วนลด', range: 'ช่วงเดือน', units: 'หน่วยขาย', expiry: 'วันหมดอายุ', note: 'หมายเหตุ',
            stock: 'สต็อกที่ต้องระบาย (ชิ้น)', planned: 'แผนระบาย (ชิ้น)', remaining: 'คงเหลือสต็อก', net: 'Net Sales แผน {year} (บาท)', manage: '' },
          // CR-36: แผน Clearance (Supply Chain · ไม่นับในเป้าหมายและคงเหลือของ Sales Planning)
          planNote: 'แผน Clearance ไม่นับในเป้าหมายและคงเหลือของ Sales Planning · คลิกแถวเพื่อวางแผนจำนวนรายเดือน ({year})',
          stockStatus: { ok: 'ครบ', left: 'ยังระบายไม่หมด {n}', over: 'เกินสต็อก {n}' }, stockTip: 'คงเหลือสต็อก = สต็อกที่ต้องระบาย − แผนระบาย',
          netTip: 'Net Sales ของแผนระบายปี {year} = จำนวน × ราคา Clearance ตามสูตร Net Sales ของ Channel', expand: 'กางแผนรายเดือน', collapse: 'พับแผนรายเดือน',
          plan: { title: 'แผน Clearance {year}', note: 'ไม่นับในเป้าหมาย', unit: 'หน่วยขาย', total: 'รวม', sumUnits: 'รวมชิ้น', sumNet: 'Net Sales (บาท)',
            distribute: 'กระจายเท่ากันทุกเดือน', distributeTip: 'แบ่งคงเหลือสต็อกให้ทุกหน่วยขายและทุกเดือนเท่ากัน (ปัดลง · เศษไปเดือนสุดท้าย)',
            noMonths: 'ช่วง Clearance ไม่อยู่ในปีแผน {year}', noUnits: 'ยังไม่มีหน่วยขาย · เลือกหน่วยขาย หรือ Listing สินค้านี้ก่อน' },
          baseTip: 'RSP ของเดือนเริ่ม Clearance (อ่านอย่างเดียว)', openEndTip: 'เดือนสิ้นสุด · ว่าง = จนสินค้าหมด', allUnits: 'ทุกหน่วยขาย', untilSold: 'จนสินค้าหมด', unitsSelected: '{n} หน่วยขาย',
          add: '+ เพิ่ม Clearance', addTitle: 'เพิ่ม Clearance', pickSku: 'SKU (Active หรือ Discontinued)', fromMonth: 'เริ่ม Clearance', pickPlaceholder: 'เลือก SKU',
          confirmStatus: 'เปลี่ยน Status ของ {name} เป็น Clearance ตั้งแต่ {month}', confirmTitle: 'ยืนยันการเปลี่ยน Status', confirm: 'เปลี่ยนเป็น Clearance',
          remove: 'นำออกจาก Clearance', empty: 'ยังไม่มีสินค้า Clearance', noRight: 'ดูอย่างเดียว · แก้ Clearance ได้เฉพาะผู้มีสิทธิ์ Clearance',
          usesPrice: 'ใช้ราคา Clearance {range}', pickUnits: 'เลือกหน่วยขาย (ว่าง = ทุกหน่วยขาย)', errors: { sku: 'กรุณาเลือก SKU', month: 'กรุณาเลือกเดือนเริ่ม' },
          exportSheet: 'Clearance'
        },
        search: 'ค้นหา SKU',
        noSkus: 'ไม่มี SKU ตามตัวกรอง',
        columns: { sku: 'SKU' },
        exportFile: 'Prices_{tab}_{date}',
        exportColumns: { code: 'Product Code', name: 'ชื่อสินค้า' },
        base: {
          month: 'ราคา ณ เดือน', now: 'เดือนปัจจุบัน',
          legend: { changed: 'เปลี่ยนในเดือนนี้', pending: 'ราคาใหม่ที่กำลังบันทึก' },
          changedTip: 'ราคาเปลี่ยน ณ {month}',
          newPrice: '+ บันทึกราคาใหม่', newPriceTitle: 'บันทึกราคาใหม่', newPriceLead: 'เลือกเดือนที่มีผล (เดือนปัจจุบันหรืออนาคต) แล้วกรอกเฉพาะ SKU ที่เปลี่ยน',
          newPriceStart: 'เริ่มกรอกราคา', effectiveMonth: 'มีผลตั้งแต่',
          pendingTitle: 'ราคาใหม่มีผลตั้งแต่ {month}', pendingHint: 'กรอกเฉพาะช่องที่เปลี่ยน (ช่องว่าง = ใช้ราคาเดิม)', pendingEnd: 'เลิกกรอก',
          editHint: 'กด + บันทึกราคาใหม่ เพื่อเลือกเดือนที่มีผล หรือนำเข้าจาก Excel',
          noRight: 'บทบาทนี้ดูราคาหลักได้อย่างเดียว',
          importButton: 'นำเข้าจาก Excel',
          historyTitle: 'ประวัติราคา', historyHead: '{sku} · {type}', historyCols: { month: 'มีผลตั้งแต่', price: 'ราคา (บาท)', by: 'ผู้บันทึก' }, historyEmpty: 'ยังไม่มีราคา',
          tip: { value: '{price} บาท (มีผลตั้งแต่ {month})', none: 'ยังไม่มีราคา', next: 'ราคาถัดไป {price} บาท ตั้งแต่ {month}', click: 'คลิกเพื่อดูประวัติราคา' },
          'import': {
            title: 'นำเข้าราคาหลักจากไฟล์: {name}', apply: 'ใส่ราคาเหล่านี้', failed: 'อ่านไฟล์ไม่ได้',
            noHeader: 'ไม่พบคอลัมน์ Product Code ในไฟล์', format: 'หัวคอลัมน์ที่รับได้: Product Code · RSP · TT Dealer · TT Wholesale',
            summary: 'ราคาที่เปลี่ยน {n} รายการ (เท่าเดิม {same}) · มีผลตั้งแต่ {month} · ยังไม่บันทึกจนกด บันทึก',
            unknown: 'ไม่พบใน Product Master {n} รหัส: {codes}', invalid: 'ราคาไม่ถูกต้อง {n} ช่อง (ข้าม)', more: 'และอีก {n} รายการ',
            change: '{old} → {price}'
          }
        },
        promo: {
          viewLabel: 'มุมมอง', views: { monthly: 'รายเดือน', overview: 'ภาพรวมเดือน' },
          level: 'ระดับ', month: 'เดือน', wholeChannel: 'ทั้ง {channel}',
          hideEmpty: 'ซ่อนหน่วยขายที่ไม่มีสินค้า Listing',
          legend: { inherited: 'ราคาที่ได้รับมา', promo: 'Promotion Price', unlisted: 'ไม่ได้ Listing' },
          noChannels: 'ยังไม่มี Channel ที่ใช้งาน', noUnits: 'Channel นี้ยังไม่มี {unit} ที่เปิดใช้งาน',
          noRight: 'บทบาทนี้แก้ Promotion Price ของ {channel} ไม่ได้',
          editHint: 'โหมดแก้ไข: กรอกราคารวม VAT · ลบค่า = ใช้ราคาที่ได้รับมา · เลือกหลายช่อง (ลากหรือ Shift+คลิก) แล้วใช้ปุ่มด้านบน · วางจาก Excel ได้ · Ctrl+Z ย้อนกลับ',
          warnNote: 'มีราคาที่ควรตรวจสอบ {n} ช่อง (สูงกว่าราคาหลัก หรือต่ำกว่าราคาหลักเกิน {pct}) · บันทึกได้ตามปกติ',
          warnings: { aboveBase: 'ราคาสูงกว่าราคาหลัก', belowBase: 'ราคาต่ำกว่าราคาหลักเกิน 50%' },
          tools: {
            selected: 'เลือก {n} ช่อง', none: 'ยังไม่ได้เลือกช่อง',
            set: 'ตั้งราคา…', discount: 'ลด x% จากราคาหลัก', copyMonth: 'คัดลอกไปเดือน…', copyUnit: 'คัดลอกไปหน่วยขาย…',
            setTitle: 'ตั้ง Promotion Price', setLabel: 'ราคาขาย (รวม VAT)',
            discountTitle: 'ลดราคาจากราคาหลัก', discountLabel: 'ส่วนลดจากราคาหลัก',
            copyMonthTitle: 'คัดลอกไปเดือน', copyMonthLabel: 'เดือนปลายทาง',
            copyUnitTitle: 'คัดลอกไปหน่วยขาย (เดือนเดียวกัน)', copyApply: 'คัดลอก',
            hint: 'ใช้กับ {n} ช่องที่เลือก (ข้ามช่องที่ไม่ได้ Listing)', invalid: 'กรุณากรอกตัวเลขมากกว่า 0'
          },
          tip: {
            unlisted: 'ไม่ได้ Listing ในหน่วยขายนี้', exact: 'Promotion Price {price} บาท (ตั้งที่ระดับนี้)',
            vsBase: '{pct} เทียบ {type} {base} บาท', otherwise: 'ถ้าลบค่า: {price} บาท จาก{source}',
            inherited: '{price} บาท จาก{source}', fromChannel: 'Promotion Price · ทั้ง {channel}', fromBase: 'ราคาหลัก ({type})'
          }
        }
      },

      // Product Master · Listing (modules/product-master)
      productMaster: {
        moved: 'หน้านี้รวมอยู่ใน Launch & Listing แล้ว (แท็บ Listing)', go: 'ไปหน้า Launch & Listing',   // CR-35
        // CR-30 รอบ 3: หน้า Listing = สถานะและช่วงเวลา Listing ต่อหน่วยขาย (แทน Checkbox · ตัดคอลัมน์วันเริ่มขาย / Status ปีแผน / เลิกขาย)
        title: 'Listing',
        lead: ['กำหนดสถานะและช่วงเวลาวางขายของสินค้าในแต่ละหน่วยขาย และช่วง Clearance'],
        month: { label: 'ข้อมูล ณ เดือน', tip: 'เลือกเดือนที่ใช้นับความครอบคลุม จำนวน SKU ที่วางขาย และ Status', current: 'เดือนปัจจุบัน' },
        rulesHelp: 'กฎ Status และวิธีเติมยอด',
        searchPlaceholder: 'ค้นหา SKU ชื่อ หรือ Series',
        statusFilter: 'Status',
        statusAll: 'ทุก Status',
        columns: { sku: 'SKU (ชื่อสั้น · Code · Series)', coverage: 'ความครอบคลุม', listing: 'Listing ต่อ {unit} · {channel}', clearance: 'Clearance' },
        discontinuedAt: 'Discontinued {month}',
        listing: {
          newOnly: 'เฉพาะสินค้าใหม่', newOnlyTip: 'แสดงเฉพาะสินค้า Request / Planned / NPD (CR-35)',
          statuses: { listed: 'วางขาย', offered: 'เสนอขาย', delisted: 'ถอดแล้ว', none: 'ไม่เคย Listing' },
          marks: { listed: '✓', offered: '◌', delisted: '✕' },
          fromText: 'เริ่ม {month}', toText: 'วางขายถึง {month}',
          filter: 'สถานะ Listing', filterAll: 'ทุกสถานะ', filterSelected: '{n} สถานะ',
          ageFilter: 'อายุ', ageAll: 'ทุกอายุ',
          ageOptions: { le1y: 'อายุไม่เกิน 1 ปี', y1to2: 'อายุ 1–2 ปี', gt2y: 'อายุมากกว่า 2 ปี' },
          noSale: 'ไม่มียอด ≥ {n} เดือน',
          noSaleTip: 'เฉพาะ SKU ที่มีหน่วยขายไม่มียอดจริง {n} เดือนขึ้นไป (ใช้ประเมินการถอด Shelf · นิยามเดียวกับ SKU Planning)',
          noSaleTag: 'ไม่มียอด {n}ด',
          age: { years: '{y}ป', months: '{m}ด', yearsMonths: '{y}ป {m}ด' },
          count: '{n} SKU',
          countTip: 'วางขาย {n} SKU ณ {month}',
          coverageTip: 'หน่วยขายที่วางขาย ÷ หน่วยขายที่ใช้งานใน Channel นี้ (ณ เดือนที่เลือก · ไม่นับข้าม Channel)',
          coverageRow: 'วางขาย {x} จาก {y} หน่วยขายที่ใช้งานใน Channel นี้',
          popover: {
            title: '{sku} · {unit}', status: 'สถานะ', from: 'เดือนเริ่มวางขาย', to: 'วางขายถึงเดือน (ล็อกแผนตั้งแต่เดือนถัดไป)',
            column: 'ทั้งคอลัมน์ {unit}', series: 'ทั้ง Series {series} ใน {unit}', apply: 'ใช้ค่านี้',
            errorFrom: 'กรุณาระบุเดือนเริ่มวางขาย', errorTo: 'กรุณาระบุเดือนสุดท้ายที่วางขาย (ต้องไม่ก่อนเดือนเริ่ม)'
          },
          selection: {
            text: 'เลือก {n} ช่อง', list: 'วางขายตั้งแต่…', delist: 'ถอดตั้งแต่…', offer: 'เสนอขาย', clear: 'ล้างที่เลือก',
            listTitle: 'วางขายตั้งแต่เดือน', delistTitle: 'ถอดตั้งแต่เดือน', offerTitle: 'เสนอขาย · เดือนที่คาดว่าจะเริ่ม',
            fromLabel: 'เดือน', toLabel: 'ถอดตั้งแต่เดือน (เดือนสุดท้ายที่วางขาย = เดือนก่อนหน้า)', confirm: 'ใช้กับช่องที่เลือก',
            hint: 'Shift / Ctrl + คลิกเพื่อเลือกหลายช่อง'
          },
          delistWarnTitle: 'ยังมีแผน SKU หลังเดือนถอด',
          delistWarn: 'มีแผน {units} ชิ้น ({amount} บาท) ในเดือนที่จะถูกล็อก',
          delistWarnNote: 'เดือนหลังเดือนถอดจะถูกล็อกเป็น 0 ใน SKU Planning เมื่อบันทึก',
          delistConfirm: 'ถอดต่อ'
        },
        clearanceOwner: 'Supply Chain',
        clearanceFrom: 'ตั้งแต่',
        clearanceTo: 'ถึง (ว่าง = จนสินค้าหมด)',
        clearanceStock: 'Stock (ชิ้น)',
        clearanceStockNote: 'Prototype แบ่ง Stock เท่ากันทุกหน่วยขายที่ Listing',
        clearanceNone: '–',
        clearanceText: '{from}–{to} · {stock}', clearanceUntilSold: 'จนสินค้าหมด',
        clearanceEdit: 'แก้ไข Clearance',
        clearanceTitle: 'Clearance · {sku}',
        clearanceSave: 'ใช้ค่านี้',
        clearanceClear: 'ไม่มี Clearance',
        clearanceError: 'กรุณาระบุเดือนเริ่ม (เดือนสิ้นสุดต้องไม่ก่อนเดือนเริ่ม · ว่าง = จนสินค้าหมด)',
        clearancePriceNote: 'ราคา Clearance หน่วยขาย และหมายเหตุ แก้ที่แท็บ Clearance ของหน้า Price & Promotion',
        bySales: 'Listing โดย Sales',
        bySalesTip: 'Listing โดย Sales · {unit} · เพิ่มโดย {by} · {date} · เริ่มขาย {from} · ทีม Product ตรวจสอบได้ที่นี่',
        selectShort: 'เลือก',
        selectRow: 'เลือกทั้งแถว',
        selectColumn: 'เลือกทั้งคอลัมน์ {unit} (เฉพาะแถวที่แสดง)',
        noMatch: 'ไม่พบ SKU ตามเงื่อนไข',
        noUnits: 'Channel นี้ยังไม่มีหน่วยขายใน Master',
        roleHint: { product: 'ทีม Product: แก้ไข Listing (คลิกช่อง · Shift / Ctrl + คลิกเพื่อเลือกหลายช่อง)', supply: 'Supply Chain: แก้ไข Clearance' },
        exportFile: 'Listing_{channel}_{month}_{date}',
        exportSheet: 'Listing',
        exportColumns: { code: 'Product Code', name: 'ชื่อสินค้า', series: 'Series', status: 'Status' }
      },

      // Product Master · หมวดสินค้าและ Series (modules/taxonomy)
      // CR-15: มุมมองแบบคอลัมน์ (Category → Sub Category → Type | Series → Sub Series) + แผงรายละเอียด + ตัวกรอง + ตารางไขว้
      // CR-36: เป็นแท็บ Product Level ของ Product List (หน้าเดิม modules/taxonomy = ทางผ่าน)
      taxonomy: {
        title: 'Product Level', short: 'Product Level',
        moved: 'หน้านี้ย้ายเป็นแท็บ Product Level ของ Product List แล้ว', go: 'ไปหน้า Product List',
        lead: [],
        helpLead: 'รายการหมวดสินค้าและ Series ที่ใช้อ้างอิงในข้อมูลสินค้า',
        tabLabel: 'มุมมอง',
        tabs: { category: 'หมวดสินค้า', series: 'Series', cross: 'ตารางไขว้' },
        columnHead: '{level} ({n})',
        crossNote: 'เฉพาะ {dim}: {names}',
        dims: { category: 'หมวดสินค้า', series: 'Series' },
        countTip: 'SKU ตามตัวกรอง {x} จาก {y} รายการ',
        countTipAll: 'SKU {n} รายการ',
        childrenTip: 'มีรายการย่อย',
        inactiveTag: 'ปิดใช้งาน',
        endedTag: 'สิ้นสุดแล้ว',
        warn: { dupParent: 'ชื่อซ้ำกับระดับบน ({parent})', noSku: 'ยังไม่มี SKU ใช้รายการนี้', expired: 'Series สิ้นสุดแล้ว ({date})', noPrefix: 'ยังไม่มีเลขนำหน้า Product Code' },
        emptyColumn: 'ไม่มีรายการ',
        emptyFiltered: 'ไม่มีรายการตามตัวกรอง',
        pickParent: 'เลือก {level} ทางซ้ายเพื่อดูรายการย่อย',
        add: '+ {level}',
        addDisabled: 'เลือก {level} ในคอลัมน์ก่อนหน้าก่อน',
        placeholder: 'ชื่อ {level}',
        dirtyTip: 'ยังไม่บันทึก',
        dragTip: 'ลากเพื่อเปลี่ยนลำดับ (ภายในรายการแม่เดียวกัน)',
        renameTip: 'ดับเบิลคลิกหรือกด F2 เพื่อเปลี่ยนชื่อ',
        nameErrors: { empty: 'กรุณาระบุชื่อ', duplicate: 'ชื่อนี้มีอยู่แล้วภายใต้รายการแม่เดียวกัน' },
        searchPlaceholder: 'ค้นหาชื่อหมวดสินค้าหรือ Series',
        searchEmpty: 'ไม่พบชื่อที่ค้นหา',
        status: { label: 'สถานะ', active: 'ใช้งาน', inactive: 'ปิดใช้งาน', all: 'ทั้งหมด' },
        data: { label: 'ข้อมูลที่ต้องตรวจ', all: 'ทั้งหมด', noSku: 'ไม่มี SKU', dupParent: 'ชื่อซ้ำกับระดับบน', expired: 'Series สิ้นสุดแล้ว', noPrefix: 'Type ไม่มีเลขนำหน้า' },
        showZero: 'แสดงรายการที่ไม่มี SKU ตามตัวกรอง',
        chipStatus: 'สถานะ: {v}',
        chipData: 'ข้อมูล: {v}',
        detail: {
          empty: 'เลือกรายการเพื่อดูรายละเอียด',
          status: 'สถานะ', active: 'ใช้งานอยู่', inactive: 'ปิดใช้งาน', switchTip: 'เปิดหรือปิดใช้งาน',
          skuCount: 'SKU {n} รายการ', skuFiltered: 'ตามตัวกรอง {n} รายการ', skuMore: 'และอีก {n} รายการ', noSku: 'ยังไม่มี SKU ใช้รายการนี้',
          openProducts: 'ดูทั้งหมดในรายการสินค้า ›',
          period: 'ช่วงเวลาของ Series', start: 'วันเริ่ม', end: 'วันสิ้นสุด', noDate: 'ไม่กำหนด', periodNote: 'ไม่บังคับ · ใช้กับ Series คอลแลบ',
          warnings: 'คำเตือน', close: 'ปิดแผงรายละเอียด', label: 'รายละเอียด',
          // CR-30: บรรทัดรองใต้ชื่อ · เลขนำหน้า Product Code ของ Type
          pathIn: '{level} · อยู่ใน {path}',
          prefix: 'เลขนำหน้า Product Code', prefixTip: '2 หลัก · ห้ามซ้ำกับ Type อื่น · ใช้สร้าง Product Code ของสินค้าใหม่ใน Type นี้',
          prefixPlaceholder: '2 หลัก', noPrefix: 'ยังไม่กำหนด',
          prefixErrors: { format: 'ต้องเป็นตัวเลข 2 หลัก', duplicate: 'เลขนี้ใช้กับ Type อื่นแล้ว' },
          nextCode: 'รหัสถัดไป: {code}', nextCodeErrors: { prefix: 'กำหนดเลขนำหน้าก่อนจึงสร้างสินค้าใน Type นี้ได้', full: 'รหัสในกลุ่มนี้เต็มแล้ว', type: '' }
        },
        actions: { rename: 'เปลี่ยนชื่อ', move: 'ย้ายไปอยู่ใต้…', moveSkus: 'ย้าย SKU ไป…', merge: 'รวมกับ…', remove: 'ลบ' },
        actionTips: {
          removeHasSku: 'มี SKU {n} รายการ · ใช้ "ย้าย SKU ไป…" หรือ "รวมกับ…" ก่อน',
          removeHasChildren: 'มีรายการย่อย {n} รายการ · ย้ายหรือลบรายการย่อยก่อน',
          moveTop: 'รายการระดับบนสุดย้ายไปอยู่ใต้รายการอื่นไม่ได้',
          noTargets: 'ไม่มีปลายทางระดับเดียวกันที่ใช้งานอยู่',
          noSkus: 'ไม่มี SKU ให้ย้าย'
        },
        dialogs: {
          target: 'ปลายทาง',
          dupTarget: '{path} (มีชื่อ {name} อยู่แล้ว)',
          move: { title: 'ย้าย {name} ไปอยู่ใต้…', lines: ['รายการย่อยทั้งหมดย้ายตาม', 'SKU {n} รายการได้หมวดใหม่ตามปลายทาง'], confirm: 'ย้าย' },
          moveSkus: { title: 'ย้าย SKU จาก {name} ไป…', pick: 'เลือก SKU ที่จะย้าย', all: 'เลือกทั้งหมด', summary: 'ย้าย SKU {n} รายการ', confirm: 'ย้าย SKU', none: 'กรุณาเลือก SKU อย่างน้อย 1 รายการ' },
          unassigned: 'ปลายทางมี {level} มากกว่า 1 รายการหรือไม่มี · {level} ของ SKU ที่ย้ายจะว่าง ต้องกำหนดใหม่ในรายการสินค้า',
          merge: { title: 'รวม {name} กับ…', lines: ['ย้าย SKU {n} รายการไปปลายทาง', '{name} และรายการย่อยจะถูกปิดใช้งาน'], confirm: 'รวม' },
          deactivate: { title: 'ปิดใช้งาน {name}', lines: ['มีรายการย่อย {n} รายการ'], only: 'ปิดเฉพาะรายการนี้', all: 'ปิดรายการย่อยด้วย' },
          remove: { title: 'ลบ {name}', lines: ['ลบถาวรเมื่อกดบันทึก (ยกเลิกได้ก่อนบันทึก)'], confirm: 'ลบ' },
          errors: { duplicate: 'ชื่อ {name} มีอยู่แล้วใต้ปลายทาง', inactive: 'ปลายทางปิดใช้งานอยู่', level: 'ปลายทางต้องอยู่ระดับเดียวกัน' }
        },
        cross: {
          rows: 'Series', cols: 'หมวดสินค้า', total: 'รวม', corner: 'Series / หมวดสินค้า',
          note: 'จำนวน SKU ที่มีทั้ง Series และหมวดสินค้า · คลิกช่องเพื่อเปิดรายการสินค้าที่กรองแล้ว',
          expand: 'กาง {name}', collapse: 'พับ {name}', cellTip: '{row} × {col}: SKU {n} รายการ · คลิกเพื่อเปิดรายการสินค้า', empty: 'ไม่มี SKU ตามตัวกรอง'
        }
      },

      // Workflow ต่อ Account/เขต: แผนครั้งแรก (sku) และ Re-forecast (forecast) แยกกัน
      skuPlanning: {
        title: 'SKU Planning',
        short: 'SKU Planning',
        titleTip: 'วางแผนยอดขายราย SKU',
        lead: ['วางแผนจำนวนขายราย SKU รายเดือน และเปรียบเทียบกับเป้าหมายรายเดือน'],
        workflowTitle: { initial: 'แผน SKU ของ {unit}', reforecast: 'Re-forecast ของ {unit}' },
        noChannels: 'แผนของปีนี้ยังไม่มี Channel',
        noUnitsInChannel: 'Channel {channel} ในแผนปี {year} ยังไม่มี {unit}',
        goTopDown: 'ไปที่หน้า Sub-channel Allocation',
        viewLabel: 'มุมมอง',
        modeLabel: 'โหมด',
        blockedReason: 'ขาดข้อมูลจำเป็น: {fields} · แก้ไขได้ที่รายการสินค้า',
        productTip: {
          category: 'หมวดสินค้า', series: 'Series', rsp: 'RSP', rspValue: '{price} บาท (ณ {date})', noRsp: 'ยังไม่มีราคา',
          promoPrice: { promoUnit: 'Promotion Price ({unit})', promoChannel: 'Promotion Price (ทั้ง {channel})', clearance: 'ราคา Clearance' }, dealer: 'TT Dealer', status: 'Status ปี {year}'
        },
        // CR-11: แถบเครื่องมือตาราง (แถวที่ 2)
        searchPlaceholder: 'ค้นหา SKU / ชื่อ',
        searchLabel: 'ค้นหา SKU หรือชื่อสินค้า',
        searchEmpty: 'ไม่พบ SKU ที่ตรงกับคำค้น',
        groupLabel: 'จัดกลุ่ม',
        groupBy: { series: 'Series', type: 'ประเภท', status: 'Status', none: 'ไม่จัดกลุ่ม' },
        collapseAll: 'พับทั้งหมด',
        expandAll: 'กางทั้งหมด',
        sortLabel: 'เรียง',
        sorts: { total: 'ยอดทั้งปีมากไปน้อย', code: 'Product Code', name: 'ชื่อ', growth: 'การเติบโต', age: 'อายุการขายมากไปน้อย', noSale: 'ไม่มียอดนานที่สุด', recent: 'เริ่มขายล่าสุด' },
        // CR-26: คอลัมน์อายุการขาย (calc.salesAge · เดือนจาก core/clock.js) · ตัวกรองอายุ · ตัวนับในหัวกลุ่ม
        //   CR-33: แยก 2 คอลัมน์ ช่วงเวลาขาย | อายุ · groups = ป้ายกลุ่มอายุชุดเดียวของตัวกรองและคอลัมน์ (calc.skuAgeGroup)
        age: {
          rangeColumn: 'ช่วงเวลาขาย', groupColumn: 'อายุ',
          headTip: 'ข้อมูล ณ 1 {month} · "ปัจจุบัน" = มียอดขายถึงเดือน {last} · ไม่มียอด = ไม่มียอดจริง {n} เดือนขึ้นไป',
          groupHeadTip: 'กลุ่มอายุการขายในหน่วยขายนี้ (ชุดเดียวกับตัวกรองอายุ) · ชี้ที่ป้ายเพื่อดูระยะเวลาจริง',
          groups: { le1y: '≤ 1 ปี', y1to2: '1–2 ปี', gt2y: '> 2 ปี', notStarted: 'ยังไม่เริ่มขาย' },
          groupTip: 'อายุการขาย {len} · {tip}',
          range: '{from} – {to}', present: 'ปัจจุบัน',
          years: '{y} ปี', months: '{m} ด.', yearsMonths: '{y} ปี {m} ด.',
          noSaleBadge: 'ไม่มียอด {n} ด.',
          plannedStart: 'เริ่ม {month}', noHistory: 'ยังไม่มียอด', none: '–',
          tip: 'เริ่มขายที่ {unit}: {first} · เริ่มขายใน {channel}: {channelFirst} · ขายล่าสุด: {last} · อายุการขาย {months} เดือน',
          tipListing: 'ไม่มียอดขายจริงในหน่วยขายนี้ · ใช้เดือนเริ่มขายใน Listing',
          tipPlanned: 'ยังไม่เริ่มขายที่ {unit} · เริ่มขายตามแผน {month}',
          filterLabel: 'อายุ', filterAll: 'ทั้งหมด',
          noSaleOnly: 'เฉพาะที่ไม่มียอด ≥ {n} เดือน',
          empty: 'ไม่มี SKU ตามตัวกรองอายุ',
          groupNoSale: '· ไม่มียอด {n}',
          groupNoSaleTip: '{n} SKU ในกลุ่มนี้ไม่มียอดจริง {months} เดือนขึ้นไป'
        },
        // CR-27: ป้ายหัวเดือนเมื่อบางแถวใช้ยอดอ้างอิงประมาณการ (แทนจุดรายช่อง)
        estHead: 'ประมาณการ',
        rulesLink: 'กฎ Status และวิธีเติมยอด',   // CR-28 หัวข้อในปุ่ม ? ต่อท้ายชื่อหน้า (แทนปุ่ม ? ในแถวเครื่องมือ)
        estHeadTip: '{n} SKU ไม่มียอดจริงเดือนนี้ของปีก่อน · ยอดอ้างอิงใช้ประมาณการของปีล่าสุด',
        // CR-24: ยอดอ้างอิง = ยอดจริงล่าสุดของแต่ละเดือน · คอลัมน์ L12M = ผลรวมยอดอ้างอิง 12 เดือน
        showLastYear: 'แสดงยอดอ้างอิง',
        showLastYearTip: 'แสดงยอดอ้างอิงของเดือนนั้นใต้ตัวเลข และคอลัมน์ L12M / การเติบโต',
        lyColumn: 'L12M',
        lyColumnTip: 'ยอดขาย L12M ({range}) ของ SKU ในแผน = ผลรวมยอดอ้างอิง 12 เดือน (ไม่รวม SKU ที่ไม่อยู่ในแผน)',
        growthColumn: 'การเติบโต',
        groupRows: { active: 'สินค้าที่วางขายแล้ว', 'new': 'สินค้าใหม่ (NPD) ปี {year}', clearance: 'Clearance', discontinued: 'เลิกขายระหว่างปี', all: 'ทุก SKU', noSeries: '(ไม่ระบุ Series)' },   // CR-34 จัดกลุ่มตามประเภทใช้ labels.planTypes
        groupSearchCount: '{n} จาก {total} รายการ',
        groupToggle: 'พับหรือกางกลุ่ม {group}',
        selectRow: 'เลือก {sku}',
        selectGroup: 'เลือกทุก SKU ในกลุ่ม {group}',
        // CR-11: เครื่องมือช่วยกรอก (โหมดแก้ไข) — CR-20 ตัดเมนูค่าตั้งต้น ▾ (CR-24: ค่าตั้งต้น = ยอดอ้างอิงของเดือนนั้น)
        // CR-20: คำสั่งทั้งหน่วยขาย (แถบแก้ไข) + แถวคงเหลือเมื่อขาด
        unitTools: {
          scale: 'ปรับทั้งหน่วยขาย ±%', scaleTitle: 'ปรับทุก SKU ที่แก้ได้ของหน่วยขายนี้เป็น %', scaleTarget: 'ทั้งหน่วยขาย {unit} ({n} SKU)',
          fill: 'ปรับให้ครบตามเป้าหมาย', fillTitle: 'ปรับทุก SKU ที่มีค่ามากกว่า 0 ตามสัดส่วน ให้คงเหลือรายเดือนเป็น 0 (ดูตารางก่อน/หลังก่อนยืนยัน)',
          fillDialog: 'ปรับให้ครบตามเป้าหมาย · {unit}'
        },
        remHint: 'ขาด {amount} ล้านบาท · ปรับจำนวน หรือเพิ่มสินค้าในแผน',
        remHintSmall: 'ขาด {amount} บาท · ปรับจำนวน หรือเพิ่มสินค้าในแผน',
        // CR-34: + เพิ่มสินค้าในแผน (แทน + เพิ่ม SKU · + เพิ่มสินค้าใหม่ · + สร้าง NPD) — 3 แท็บ
        addPlan: {
          button: '+ เพิ่มสินค้าในแผน', title: 'เพิ่มสินค้าในแผน · {unit}',
          tabs: { existing: 'สินค้าเดิมที่ยังไม่เคยขายในหน่วยขายนี้', npd: 'NPD ที่ยืนยันแล้ว', request: 'ขอ NPD เพิ่ม' },
          notes: {
            existing: 'สินค้าที่ขายอยู่แต่ยังไม่อยู่ในแผนของหน่วยขายนี้ · เพิ่มแล้วสร้าง Listing ของหน่วยขายนี้ตั้งแต่เดือนที่เลือกเมื่อบันทึกแผน',
            npd: 'สินค้าใหม่ที่ทีม Product ยืนยันแล้ว · เดือนเริ่มค่าเริ่มต้น = เดือนเปิดตัวตามแผน NPD',
            request: 'ทีม Product จะเห็นคำขอนี้ในหน้าแผน NPD และเปลี่ยนเป็น NPD เมื่อยืนยัน'
          },
          month: 'เดือนเริ่มขาย', monthNote: 'ใช้เดือนเดียวกันทุกรายการ · แก้รายแถวได้ภายหลังที่คอลัมน์ช่วงเวลาขาย · จำนวนเริ่มต้น 0 ทุกเดือน',
          l12m: 'L12M {n} ชิ้น (ทุกหน่วยขาย)', launch: 'เปิดตัว {month}', listed: 'Listing แล้ว',
          empty: 'ไม่มีรายการ', selectAll: 'เลือกทั้งหมด', selected: 'เลือก {n} รายการ', confirm: 'เพิ่ม {n} รายการ',
          monthLaunch: 'ตามเดือนเปิดตัวของแต่ละรายการ',
          noRequest: 'บทบาทนี้ขอ NPD ไม่ได้ (สิทธิ์ สร้าง NPD ของหน้า SKU Planning)', link: 'เพิ่มสินค้าในแผน',
          errors: { permission: 'ไม่มีสิทธิ์แก้ไขแผนของหน่วยขายนี้', invalid: 'รายการที่เลือกเพิ่มในแผนไม่ได้' }
        },
        // CR-20: ฟอร์มสร้าง NPD → CR-34 แท็บ ขอ NPD เพิ่ม ของ Dialog เพิ่มสินค้าในแผน (Sales Manager / Officer ของ Channel · สิทธิ์ สร้าง NPD)
        npdForm: {
          fields: { name: 'ชื่อสินค้า (ชั่วคราว)', series: 'Series', category: 'หมวดสินค้า (ถึง Type)', price: 'ราคาขายที่ {unit} (รวม VAT)', month: 'เดือนเริ่มขาย',
            units: 'หน่วยขายอื่นใน {channel} ที่จะขาย', note: 'หมายเหตุถึงทีม Product', reason: 'เหตุผล / แนวคิดสินค้า' },
          seriesPlaceholder: 'เลือก Series', seriesNone: 'ยังไม่ระบุ', categoryPlaceholder: 'ยังไม่ระบุ',
          noOtherUnits: 'ไม่มีหน่วยขายอื่นในแผนของ Channel นี้',
          hint: '* = ต้องกรอก · ราคาบันทึกเป็นราคาต่อ Account ของหน่วยขายนี้ และใช้เป็น RSP ตั้งต้น · เดือนก่อนเดือนเริ่มขายล็อก 0',
          save: 'ส่งคำขอ NPD', cancel: 'ยกเลิก',
          errors: { name: 'กรุณากรอกชื่อสินค้า', series: 'กรุณาเลือก Series (หรือเลือก ยังไม่ระบุ)',
            type: 'กรุณาเลือกหมวดสินค้าถึง Type (Product Code สร้างจากเลขนำหน้าของ Type)', prefix: 'กำหนดเลขนำหน้า Product Code ของ Type นี้ก่อน (ทีม Product · Product List แท็บ Product Level)', price: 'ราคาขายต้องมากกว่า 0', month: 'กรุณาเลือกเดือนเริ่มขายในปีแผน' }
        },
        requestChanged: { title: 'ข้อมูลสินค้าถูกแก้โดยทีม Product', fields: { price: 'ราคาเปลี่ยนจากที่ Sales กรอก', launch: 'วันเริ่มขายเปลี่ยน (แผนยังใช้เดือนที่ Sales กรอก)' } },
        bulk: { selected: 'เลือก {n} รายการ', scale: 'ปรับ ±%', lastYear: 'ตั้งเท่ายอดอ้างอิง', reset: 'คืนค่าตั้งต้น', clear: 'ล้างค่า', unselect: 'ยกเลิกการเลือก' },
        rowMenu: { title: 'คำสั่งของ {sku}', reset: 'คืนค่าตั้งต้น', lastYear: 'ตั้งเท่ายอดอ้างอิง', scale: 'ปรับเพิ่ม/ลด %', clear: 'ล้างค่า' },
        scaleDialog: {
          title: 'ปรับเพิ่ม/ลด % · {target}', label: 'ปรับ', hint: 'ค่าบวก = เพิ่ม ค่าลบ = ลด · ปรับเฉพาะเดือนที่แก้ไขได้ ผลลัพธ์ปัดเป็นจำนวนเต็ม',
          invalid: 'กรุณากรอกตัวเลข', rows: '{n} รายการ'
        },
        annualTitle: 'กรอกยอดทั้งปี · ระบบกระจายไปเดือนที่แก้ไขได้ตามรูปแบบเดิมของแถว',
        closeGap: {
          button: 'ปิดส่วนต่าง',
          monthButton: 'ปิดส่วนต่างเดือน {month}',
          yearButton: 'ปิดส่วนต่างทั้งปี',
          title: 'ปิดส่วนต่าง · {unit}',
          months: 'เดือน',
          skus: 'SKU ที่จะปรับ',
          skusSelected: 'แถวที่เลือก ({n} รายการ)',
          skusAll: 'ทุกแถวที่แก้ไขได้และมีค่ามากกว่า 0 ({n} รายการ)',
          note: 'ระบบปรับจำนวนชิ้นตามสัดส่วน Net Sales ของแต่ละแถว ให้คงเหลือของเดือนที่เลือกเป็น 0 (ปัดเป็นจำนวนเต็ม)',
          cols: { sku: 'SKU', before: 'ก่อน (ชิ้น)', after: 'หลัง (ชิ้น)', change: 'เปลี่ยน' },
          more: 'และอีก {n} รายการ',
          remBefore: 'คงเหลือก่อนปรับ: {text}',
          remAfter: 'คงเหลือหลังปรับ: {text}',
          confirm: 'ยืนยันปิดส่วนต่าง',
          noRows: 'ไม่มี SKU ที่ปรับได้ในเดือนที่เลือก'
        },
        // CR-11: SKU ที่ไม่อยู่ในแผนแต่มียอดขายอ้างอิง (ที่มาของส่วนต่าง) — CR-24: ยอดเงิน = ยอดขาย L12M
        notInPlan: {
          discontinued: 'เลิกขายก่อนปี {year} {n} รายการ (ยอดขาย L12M {amount} บาท)',
          incomplete: 'ขาดข้อมูลจำเป็น {n} รายการ (ยอดขาย L12M {amount} บาท · แก้ไขได้ที่รายการสินค้า)',
          title: 'SKU ที่มียอดขาย L12M แต่ไม่อยู่ในแผน: {names}'
        },
        priceChanged: 'ราคาเปลี่ยนจาก Baseline {n} เดือน',
        priceChangedTitle: 'ราคาหรือ Promotion ที่มีผลต่างจากตอนล็อก Baseline · Target Baseline และ Plan Baseline ใช้ราคาตอนล็อก แผนล่าสุดใช้ราคาปัจจุบัน',
        exportSpec: {
          file: 'SKU-Plan_{year}_{unit}_{status}_{date}', sheet: 'SKU Plan',
          cols: { rowType: 'ประเภทแถว', sku: 'SKU', name: 'ชื่อสินค้า', series: 'Series', status: 'Status', start: 'เดือนเริ่มขาย', total: 'ทั้งปี',
            price: 'ราคาขาย (รวม VAT)', priceSource: 'ที่มาของราคา', sale: 'Sale Amount ทั้งปี (บาท)', gp: '{gpLabel} %', net: 'Net Sales ทั้งปี (บาท)',
            salesRange: 'ช่วงเวลาขาย', ageGroup: 'อายุ', ageChannel: 'เริ่มขาย (Channel)', ageMonths: 'อายุการขาย (เดือน)', ageNoSale: 'ไม่มียอด (เดือน)' },
          priceVaries: 'ราคาเปลี่ยนระหว่างปี (ราคาเฉลี่ย)',
          rowTypes: { sku: 'SKU', planUnits: 'รวมแผน (ชิ้น)', planMoney: 'รวมแผน {money} (บาท)', target: 'เป้าหมาย {money} (บาท)', remaining: 'คงเหลือ (ค่าบวก = ขาด ค่าลบ = เกิน)' }
        },
        modes: { initial: 'สร้างแผนครั้งแรก', reforecast: 'ปรับแผน (Re-forecast)' },
        reforecastLocked: 'ใช้งานได้หลังจากล็อก Baseline',
        noGP: 'ไม่มี GP',
        currentMonthLabel: 'เดือนปัจจุบัน (จำลอง)',
        skuColumn: 'SKU',
        totalColumn: 'ทั้งปี',
        groups: { selling: 'สินค้าที่วางขายแล้ว', npd: 'สินค้าใหม่ (NPD) ปี {year}' },
        groupCount: '{n} รายการ',
        rows: {
          owner: 'ผู้รับผิดชอบ',
          target: 'เป้าหมาย {money} (จาก Phasing)',
          targetBaseline: 'Target Baseline {money} (จาก Phasing)',
          planBaseline: 'Plan Baseline {money} (แผนครั้งแรก)',
          planUnits: 'รวมแผน (ชิ้น)',
          planMoney: 'รวมแผน {money} (บาท)',
          latestUnits: 'แผนล่าสุด (ชิ้น)',
          latestMoney: 'แผนล่าสุด {money} (บาท)',
          seriesUnits: 'รวม Series ที่เลือก (ชิ้น)',
          seriesMoney: 'รวม Series ที่เลือก {money} (บาท)',
          unitUnits: '{all} (ชิ้น)',
          unitMoney: '{all} {money} (บาท)',
          remaining: 'คงเหลือ',
          remainingNote: 'เป้าหมาย − แผน เทียบกับเป้าหมายทั้งหน่วยขายเสมอ (ค่าบวก = ขาด ค่าลบ = เกิน)'
        },
        // CR-34: เดือนเริ่มขายในคอลัมน์ช่วงเวลาขาย (โหมดแก้ไข · สินค้าใหม่ 3 ประเภท)
        startEdit: {
          label: 'เริ่ม', aria: 'เดือนเริ่มขาย {sku}', tip: 'เดือนเริ่มขายในหน่วยขายนี้ · เดือนก่อนหน้าล็อก 0',
          reasons: { beforeLaunch: 'เปิดตัวตามแผน NPD {month}', beforeListing: 'Listing ที่ทีม Product สร้างเริ่ม {month}' },
          clearTitle: 'เลื่อนเดือนเริ่มขาย · {sku}', clearLine: 'ค่าใน {months} จะถูกล้างเป็น 0', clearConfirm: 'เลื่อนเดือนเริ่ม'
        },
        removePlanListing: 'Listing ที่สร้างจาก SKU Planning ของหน่วยขายนี้จะถูกนำออกเมื่อบันทึกแผน',
        cancelRequest: {
          title: 'ยกเลิกคำขอ NPD {sku} ด้วยหรือไม่', lines: ['ไม่มีหน่วยขายอื่นใช้สินค้านี้', 'ยกเลิกแล้วสินค้า ราคา และแผน NPD ของคำขอนี้จะถูกนำออกเมื่อบันทึกแผน'],
          yes: 'ยกเลิกคำขอด้วย', no: 'เก็บคำขอไว้'
        },
        // CR-34 ส่วน 5: ข้อมูลที่ต้องตรวจของหน่วยขายนี้
        checks: { title: 'ข้อมูลที่ต้องตรวจ', types: { clearance: 'มีแผนสินค้า Clearance', 'delete': 'มีแผนสินค้า Delete' }, item: '{sku} {name}', criteria: ['มีแผนสินค้า Clearance', 'มีแผนสินค้า Delete'],
          clearValues: 'ล้างค่า' },   // CR-36: ล้างค่าในเดือน Clearance ที่ล็อก (โหมดแก้ไข)
        deletedCell: 'สินค้าเป็น Delete · อ่านอย่างเดียว (ไม่ล้างค่าให้อัตโนมัติ)',
        addSearch: 'ค้นหา SKU',
        addEmpty: 'ไม่มี SKU ตามตัวกรอง',
        npdEmpty: 'ยังไม่มีสินค้าใหม่ในแผน',
        npdAvailable: 'มีสินค้าใหม่ที่ Listing แล้วแต่ยังไม่อยู่ในแผน {n} รายการ',
        seriesMissing: 'SKU ใน Series ที่เลือกที่ Listing แล้วแต่ยังไม่อยู่ในแผน {n} รายการ',
        addSeries: 'เพิ่มทั้ง Series',
        seriesEmpty: 'ไม่มี SKU ของ Series ที่เลือกในแผนนี้',
        removeTitle: 'นำ SKU ออกจากแผน',
        removeConfirm: 'นำ {sku} ออกจากแผนของ {unit} ปี {year}',
        removeLine: 'Product Master ไม่เปลี่ยนแปลง',
        stopTitle: 'หยุดวางแผน SKU นี้',
        stopConfirm: 'หยุดวางแผน {sku} ใน {unit}',
        stopLine: 'เดือนที่แก้ไขได้ ({months}) จะเป็น 0 เดือน Actual และเดือนที่ล็อกคงเดิม',
        stopped: 'หยุดวางแผน',
        // CR-30: ป้ายในคอลัมน์ชื่อ SKU
        listingOffered: 'ยังไม่ยืนยัน Listing',
        listingOfferedTip: 'สถานะ Listing ในหน่วยขายนี้ = เสนอขาย (ยังไม่ยืนยันกับคู่ค้า) · วางแผนได้',
        quarterLaunch: 'เดือนเปิดตัวยังไม่ยืนยัน',
        quarterLaunchTip: 'NPD เปิดตัว {quarter} · ล็อกเดือนก่อนต้นไตรมาส จนกว่าทีม Product จะระบุเดือนเปิดตัว',
        resetRowTitle: 'คืนค่าระบบเติมและ Clearance ของแถวนี้ (ล้าง Override)',
        cellReasons: { locked: 'ล็อก 0', actual: 'Actual', frozen: 'ล็อก (M+1 ถึง M+3)', open: 'ปรับได้' },
        legend: { override: 'Override', actual: 'Actual', frozen: 'ล็อก M+1–M+3', promo: 'มี Promo บางวัน', dirty: 'ยังไม่บันทึก', anomaly: 'ต่างจากยอดอ้างอิงเกิน ±{pct}' },
        sellOutNote: 'Sale Amount รวม VAT · เป้าหมาย = Net Sales ÷ (1 − GP) × 1.07',
        summaryLines: { plan: 'แผนทั้งปี {plan} บาท', target: 'เป้าหมายทั้งปี {target} บาท', remaining: 'คงเหลือ: {remaining}', skus: '{n} SKU ในแผน' }
      },

      // Account Master (workflowBar แบบง่าย)
      // CR-32: Account & Platform + เขตและร้านค้า (TT) รวมเป็น Account Master (หน้าเดิมซ่อน · เปิดลิงก์เดิมแล้วพาไปหน้าใหม่)
      accounts: {
        title: 'Account & Platform',
        moved: 'หน้านี้รวมอยู่ใน Partner List แล้ว', go: 'ไปหน้า Partner List'
      },
      territories: {
        title: 'เขตและร้านค้า ({territoryChannels})',
        short: 'เขตและร้านค้า ({territoryChannels})',
        moved: 'หน้านี้รวมอยู่ใน Partner List แล้ว (แท็บ {channel})', go: 'ไปหน้า Partner List'
      },

      // CR-32: Account Master — Channel → หน่วยขาย (Account · Platform · เขต) → คู่ค้า (รหัสคู่ค้า = รหัสใน TRCLOUD) ตามช่วงเดือน · CR-33 แก้ไขรายรายการ
      //   ป้ายหน่วยขายใช้ unitLabel / gpLabel ของ Channel Master · ผู้รับผิดชอบแก้ไขที่หน้าบุคลากร (อ่านอย่างเดียวในหน้านี้)
      salesUnits: {
        // CR-36: ชื่อหน้า Partner List (หัวกลุ่มเมนู ACCOUNT MASTER คงเดิม)
        title: 'Partner List',
        short: 'Partner List',
        titleTip: 'หน่วยขายและคู่ค้า',
        lead: ['หน่วยขายของทุก Channel และคู่ค้าตามรหัสคู่ค้าที่อยู่ในแต่ละหน่วยขายตามช่วงเดือน'],
        month: { label: 'ข้อมูล ณ เดือน', tip: 'ตัวเลขและการจัดสรรทั้งหน้าแสดงตามเดือนที่เลือก', current: 'เดือนปัจจุบัน' },
        tabLabel: 'Channel', tabAll: 'ทั้งหมด', tabCount: '{name} ({n})', tabWarn: 'มีข้อมูลที่ต้องตรวจ {n} รายการ',
        search: 'ค้นหารหัสคู่ค้า / ชื่อ',
        filters: {
          status: 'สถานะ', statusOptions: { active: 'ใช้งาน', inactive: 'ปิดใช้งาน', all: 'ทั้งหมด' },
          more: 'ตัวกรองเพิ่มเติม', moreOn: 'ตัวกรองเพิ่มเติม ({n})',
          kind: 'ประเภท', trcloudType: 'ประเภทคู่ค้า', priceType: 'ประเภทราคา', province: 'จังหวัด', channels: 'Export/Online', data: 'ข้อมูล',
          all: 'ทั้งหมด', selected: '{n} รายการ', clear: 'ล้าง', empty: 'ไม่พบรายการ', find: 'ค้นหา', none: 'ไม่ระบุ',
          channelOptions: { export: 'Export', online: 'Online' },
          dataOptions: { outside: 'อยู่นอกจังหวัดของเขต', noProvince: 'ไม่ระบุจังหวัด', moved: 'ย้ายหน่วยขายในปีนี้' },
          chipSearch: 'ค้นหา: {q}', chip: '{label}: {value}'
        },
        kinds: { headOffice: 'สำนักงานใหญ่', branch: 'สาขา', store: 'ร้านค้า', platform: 'Platform' },
        channelSettings: 'ตั้งค่า Channel',
        // CR-33: แถวหน่วยขายบรรทัดเดียว (ชื่อ · {gpLabel} xx% · คู่ค้า n / ร้าน n · ปุ่ม แก้ไข / รายละเอียด)
        panel: {
          title: 'หน่วยขาย', all: 'ทั้งหมด', unassigned: 'ยังไม่จัดสรร', noOwner: 'ไม่มีผู้รับผิดชอบ',
          countLabels: { customers: 'คู่ค้า', stores: 'ร้าน' }, countTip: 'จำนวนคู่ค้า ณ เดือนที่เลือก ตามตัวกรองสถานะ ({status})',
          unassignedTip: 'คู่ค้าที่ใช้งานแต่ยังไม่อยู่ในหน่วยขายใดในเดือนนี้',
          inactive: 'ปิดใช้งาน', gpMissing: 'ยังไม่กำหนด',
          edit: 'แก้ไข', details: 'รายละเอียด', editTip: 'แก้ไข {name}', detailsTip: 'ดูรายละเอียด {name}',
          ownerTip: 'เปิดผู้รับผิดชอบรายเดือนที่หน้า {page}',
          add: '+ เพิ่มหน่วยขาย', dropHint: 'ลากคู่ค้ามาวางบนหน่วยขายเพื่อย้าย', ownerNote: 'ผู้รับผิดชอบของทุก Channel แก้ไขได้ที่หน้า {page}'
        },
        tableTitle: { all: 'คู่ค้า · ทั้งหมด', unassigned: 'คู่ค้า · ยังไม่จัดสรร ({channel})', unit: 'คู่ค้า · {name}' },
        columnsButton: 'คอลัมน์', fixedColumns: 'รหัสคู่ค้าและชื่อแสดงเสมอ',
        presets: { standard: 'มาตรฐาน', single: 'มาตรฐาน', territory: 'มาตรฐาน', full: 'ทุกคอลัมน์' },
        columns: {
          select: 'เลือก', selectAll: 'เลือกทั้งหมดตามตัวกรอง', trcloudId: 'รหัสคู่ค้า', name: 'ชื่อคู่ค้า', nameStore: 'ชื่อร้าน', kind: 'ประเภท', trcloudType: 'ประเภทคู่ค้า',
          province: 'จังหวัด', status: 'สถานะ', refL12M: 'ยอดอ้างอิง (บาท)', unit: 'หน่วยขาย', suggested: 'หน่วยขายแนะนำ',
          storeType: 'ประเภทร้าน', priceType: 'ประเภทราคา', export: 'Export', online: 'Online', taxId: 'Tax ID', legalName: 'ชื่อนิติบุคคล', period: 'ช่วงเดือนที่อยู่ในหน่วยขาย'
        },
        tips: {
          refL12M: 'ยอดอ้างอิงของคู่ค้า: Account / Platform = ยอด L12M ของหน่วยขายแบ่งตามคู่ค้า · ร้านค้าของเขต = ยอดอ้างอิงปี {year} (ผลรวมของร้านในเขต ณ เดือนแรกของปีแผน = ยอดขายปีก่อนของเขต)',
          trcloudType: 'ค่าจาก TRCLOUD',
          suggestTag: 'แนะนำ {name}', suggestTip: 'หน่วยขายแนะนำ: {name} (จากคำนำหน้าชื่อคู่ค้า หรือจังหวัดของร้าน)', unassignedSuggest: 'ยังไม่จัดสรร · แนะนำ {name}',
          export: 'ร้านที่ขายส่งออก', online: 'ขายออนไลน์', has: 'มี',
          masked: 'ชื่อบุคคลธรรมดา · ซ่อนเพื่อคุ้มครองข้อมูลส่วนบุคคล',

          outside: 'นอกจังหวัด', outsideTip: 'จังหวัดของร้านไม่อยู่ในรายชื่อจังหวัดแนะนำของ {territory}', sort: 'เรียงตาม{name}',
          sample: 'ข้อมูลตัวอย่าง · ยังไม่มีข้อมูลจริงจาก TRCLOUD', period: '{from} – {to}', periodNow: 'ปัจจุบัน'
        },
        status: { active: 'ใช้งาน', inactive: 'ปิดใช้งาน', inactiveFrom: 'ปิดใช้งาน ตั้งแต่ {month}', scheduled: 'ใช้งาน · ปิดตั้งแต่ {month}' },
        unassignedCell: 'ยังไม่จัดสรร',
        footer: { count: '{n} ราย', ref: ' · ยอดอ้างอิงรวม {amount} บาท', sample: ' · มีข้อมูลตัวอย่าง {n} ราย (คู่ค้าของ {channels} ยังไม่ใช่ข้อมูลจริงจาก TRCLOUD)', and: ' และ ' },
        emptyRows: 'ไม่มีคู่ค้าตามตัวกรอง',
        // CR-33: แถบคำสั่งแทนหัวแผงคู่ค้าเมื่อเลือกตั้งแต่ 1 ราย · ยืนยันแล้วบันทึกทันที + Toast
        selection: {
          text: 'เลือก {n} ราย', move: 'ย้ายไปหน่วยขาย…', unassign: 'นำออกจากหน่วยขาย', suggest: 'ใช้หน่วยขายแนะนำ', status: 'เปลี่ยนสถานะ…',
          clear: 'ยกเลิกการเลือก', noneAssigned: 'คู่ค้าที่เลือกยังไม่อยู่ในหน่วยขายใด', noneSuggested: 'คู่ค้าที่เลือกไม่มีหน่วยขายแนะนำ',
          mixed: 'เลือกคู่ค้าใน Channel เดียวกันเพื่อย้ายหน่วยขาย'
        },
        move: {
          title: 'ย้ายคู่ค้าไปหน่วยขายอื่น', target: 'หน่วยขายปลายทาง', targetOption: '{name} · {owner}', fromMonth: 'มีผลตั้งแต่เดือน',
          channelOnly: 'เลือกได้เฉพาะหน่วยขายใน {channel} (Channel เดียวกับคู่ค้า)',
          count: '{n} ราย · ยอดอ้างอิงที่ย้าย {amount} บาท', fromTo: '{from} ({fromOwner}) → {to} ({toOwner}): {n} ราย',
          outside: 'อยู่นอกจังหวัดแนะนำของปลายทาง {n} ร้าน', noChange: 'คู่ค้าที่เลือกอยู่ในหน่วยขายนี้แล้วตั้งแต่เดือนที่เลือก ไม่มีรายการที่เปลี่ยน',
          approved: 'เป้าหมายปี {year} อนุมัติแล้ว · การย้ายนี้ไม่เปลี่ยนเป้าหมายของเขต ยอดอ้างอิงที่ย้าย {amount} บาท',
          draftYear: 'เป้าหมายปี {year} ไม่เปลี่ยน · ยอดขาย L12M ของเขตคำนวณใหม่ตามร้านที่อยู่ในเขต ณ ม.ค. {year}',
          accountNote: 'เป้าหมาย แผน และยอดขายปีก่อนของหน่วยขายไม่เปลี่ยน (Sales Planning ใช้ยอดของหน่วยขาย ไม่ใช่ของคู่ค้า)',
          confirm: 'ย้าย', pastNote: 'เลือกได้ตั้งแต่เดือนปัจจุบัน ({month}) เป็นต้นไป',
          errors: { past: 'เลือกเดือนที่ผ่านไปแล้วไม่ได้', range: 'ช่วงเดือนไม่ถูกต้อง', channel: 'ย้ายได้เฉพาะหน่วยขายใน Channel เดียวกับคู่ค้า', unit: 'ไม่พบหน่วยขายปลายทาง' }
        },
        unassign: {
          title: 'นำคู่ค้าออกจากหน่วยขาย', text: 'คู่ค้าจะเป็น "ยังไม่จัดสรร" ตั้งแต่เดือนที่เลือก', count: '{n} ราย · ยอดอ้างอิง {amount} บาท',
          from: 'จาก {from} ({owner}): {n} ราย', confirm: 'นำออกจากหน่วยขาย'
        },
        suggest: {
          title: 'ใช้หน่วยขายแนะนำ', item: '{name} ({owner}): {n} ราย · ยอดอ้างอิง {amount} บาท',
          skipped: 'ไม่มีหน่วยขายแนะนำ หรืออยู่ในหน่วยขายที่แนะนำแล้ว {n} ราย (ไม่ย้าย)', confirm: 'ย้ายตามคำแนะนำ'
        },
        statusDialog: {
          title: 'เปลี่ยนสถานะคู่ค้า', label: 'สถานะใหม่', count: 'เปลี่ยนสถานะ {n} ราย', same: 'มีสถานะนี้อยู่แล้ว {n} ราย (ไม่เปลี่ยน)', none: 'ไม่มีรายการที่เปลี่ยน',
          note: 'ข้อมูลอื่นจาก TRCLOUD ไม่เปลี่ยน', confirm: 'เปลี่ยนสถานะ'
        },
        toast: {
          saved: 'บันทึกแล้ว', unitSaved: 'บันทึกแล้ว · {name}', customerSaved: 'บันทึกแล้ว · {name}', added: 'บันทึกแล้ว · เพิ่มหน่วยขาย {name}',
          removed: 'บันทึกแล้ว · นำ {name} ออกจาก Master', moved: 'บันทึกแล้ว · ย้ายคู่ค้า {n} รายไป {unit}', suggested: 'หน่วยขายแนะนำ',
          unassigned: 'บันทึกแล้ว · นำคู่ค้า {n} รายออกจากหน่วยขาย', status: 'บันทึกแล้ว · เปลี่ยนสถานะคู่ค้า {n} ราย', imported: 'บันทึกแล้ว · นำเข้าร้านค้า',
          channels: 'บันทึกแล้ว · ตั้งค่า Channel'
        },
        errors: {
          permission: 'บทบาทนี้แก้ไขข้อมูลส่วนนี้ไม่ได้', name: 'กรุณากรอกชื่อ', duplicate: 'มีหน่วยขายชื่อนี้ใน Channel นี้แล้ว',
          blocked: 'นำออกไม่ได้เพราะอยู่ในแผน มียอดขายย้อนหลัง หรือเคยมีผู้รับผิดชอบ', channelId: 'รหัส Channel ห้ามว่างหรือซ้ำ', failed: 'บันทึกไม่สำเร็จ',
          duplicateCode: 'รหัสคู่ค้า {code} มีอยู่แล้ว ({name})'   // CR-35: รหัสคู่ค้าห้ามซ้ำทั้งระบบ (units.firstCodeConflict · store.js)
        },
        drawerActions: {
          save: 'บันทึก', cancel: 'ยกเลิก', dirty: 'มีการแก้ไขที่ยังไม่บันทึก',
          discardTitle: 'ปิดโดยไม่บันทึก?', discardText: 'การแก้ไขที่ยังไม่บันทึกใน Drawer นี้จะหายไป', discardConfirm: 'ปิดโดยไม่บันทึก', keepEditing: 'แก้ไขต่อ'
        },
        checks: {
          title: 'ข้อมูลที่ต้องตรวจ ณ {month}',
          types: {
            unassigned: 'คู่ค้าใช้งานที่ยังไม่จัดสรร', noOwner: 'หน่วยขายใช้งานที่ไม่มีผู้รับผิดชอบ', prefix: 'คู่ค้าที่คำนำหน้าชื่อชี้ไปหน่วยขายอื่น',
            noProvince: 'ไม่ระบุจังหวัด', noCustomers: 'หน่วยขายใช้งานที่ไม่มีคู่ค้าใช้งาน'
          },
          item: '{name}', unitItem: '{channel} · {name}', prefixItem: '{name} → {unit}', showAll: 'กรองตารางตามเกณฑ์นี้'
        },
        unitDrawer: {
          label: 'รายละเอียดหน่วยขาย', tabs: { info: 'ข้อมูล', history: 'ประวัติการเปลี่ยนแปลง' },
          fields: { name: 'ชื่อ', channel: 'Channel', gp: '{label} %', status: 'สถานะ', note: 'หมายเหตุ', suggestAccount: 'คำนำหน้าชื่อคู่ค้าที่แนะนำ',
            suggestTerritory: 'จังหวัดแนะนำ', customers: 'คู่ค้าที่ใช้งาน', stores: 'ร้านที่ใช้งาน' },
          suggestHint: 'คั่นหลายค่าด้วย , · เทียบกับข้อความก่อน _ ตัวแรกของชื่อคู่ค้า (ไม่สนตัวพิมพ์)', suggestNone: 'ไม่มี',
          editProvinces: 'แก้จังหวัดแนะนำ…', deactivate: 'ปิดใช้งาน…', activate: 'เปิดใช้งาน',
          deactivateBlocked: 'ปิดใช้งานได้เฉพาะเขตที่ไม่มีร้านที่ใช้งาน',
          // CR-33: ผู้รับผิดชอบ ปีปัจจุบัน – เดือนสุดแผน (อ่านอย่างเดียว)
          ownerTitle: 'ผู้รับผิดชอบ ({from} – {to})', ownerEdit: 'แก้ไขที่ {page}', ownerNone: 'ไม่มีผู้รับผิดชอบ', ownerRun: '{name} · {range}',
          ownerRange: { sameYear: '{from}–{to} {year}', span: '{from} – {to}', open: '{from} เป็นต้นไป' },
          readonly: 'บทบาทนี้ดูได้อย่างเดียว',
          remove: 'นำออกจาก Master', removeConfirm: 'นำ {name} ออกจาก Master', removeBlocked: 'นำออกไม่ได้เพราะอยู่ในแผน มียอดขายย้อนหลัง หรือเคยมีผู้รับผิดชอบ · ให้ปิดใช้งานแทน'
        },
        deactivateDialog: {
          title: 'ปิดใช้งาน {name}', fromMonth: 'มีผลตั้งแต่เดือน', confirm: 'ปิดใช้งาน',
          lines: ['หน่วยที่ปิดใช้งานไม่แสดงในรายการเพิ่มหน่วยขายของ Sub-channel Allocation และไม่อยู่ในข้อมูลที่ต้องตรวจ'],
          target: 'หน่วยนี้มีเป้าหมายในแผน {year} {amount} ล้านบาท · ต้องย้ายเป้าหมายที่ Sub-channel Allocation', noTarget: 'หน่วยนี้ไม่มีเป้าหมายในแผนปีใด',
          territoryLines: ['เขตที่ปิดใช้งานไม่แสดงในรายการเพิ่มหน่วยขายของ Sub-channel Allocation', 'เปิดใช้งานใหม่ได้ภายหลัง']
        },
        gpDialog: {
          title: 'เปลี่ยน {label} ของ {name}', line: '{label} {from} → {to}', confirm: 'เปลี่ยน',
          impact: 'Net Sales ของแผน {year} เปลี่ยน {amount} ล้านบาท (จำนวนชิ้นเท่าเดิม)', noPlan: 'หน่วยนี้ยังไม่มีแผน SKU ในปี {year}', noBase: 'ยังคำนวณผลต่อ Net Sales ไม่ได้ เพราะเดิมยังไม่กำหนด {label}'
        },
        addDialog: {
          title: 'เพิ่มหน่วยขาย', channel: 'Channel', name: 'ชื่อ', codeNote: 'รหัสที่จะได้ {code} (ระบบสร้าง)', gp: '{label} %', provinces: 'จังหวัดแนะนำ', hint: 'กำหนดผู้รับผิดชอบที่หน้า {page} · เพิ่มหน่วยขายเข้าแผนได้ที่หน้า Sub-channel Allocation (ไม่เพิ่มอัตโนมัติ)'
        },
        provinces: {
          title: 'จังหวัดแนะนำ: {name}', hint: 'ใช้แนะนำเขตให้ร้านที่ยังไม่จัดสรร และเตือนร้านที่อยู่นอกจังหวัดของเขต ไม่ได้บังคับว่าร้านต้องอยู่เขตนี้',
          search: 'ค้นหาจังหวัด', also: 'อยู่ในรายชื่อของ {names} ด้วย', count: 'เลือกไว้ {n} จังหวัด', confirm: 'ใช้รายชื่อนี้'
        },
        channelPanel: {
          title: 'ตั้งค่า Channel', note: 'Channel Master ใช้ทุกหน้า · Channel ที่ปิดใช้งานไม่แสดงเป็นแท็บ · เปลี่ยนหน่วยแบ่งเป้าได้เฉพาะ Channel ที่ยังไม่มีหน่วยขาย',
          columns: { id: 'รหัส', name: 'ชื่อย่อ', fullName: 'ชื่อเต็ม', allocationUnit: 'หน่วยแบ่งเป้า', unitLabel: 'ชื่อเรียกหน่วยขาย', hasGP: 'มี GP', gpLabel: 'ชื่อเรียก GP', color: 'สี', active: 'ใช้งาน', order: 'ลำดับ' },
          allocation: { ACCOUNT: 'Account', TERRITORY: 'เขต' }, yes: 'ใช่', no: '–',
          locked: 'มีหน่วยขายแล้ว เปลี่ยนหน่วยแบ่งเป้าไม่ได้',
          add: '+ เพิ่ม Channel', newName: 'Channel ใหม่', idError: 'รหัสต้องเป็นตัวอักษรอังกฤษ / ตัวเลข และไม่ซ้ำ', readonly: 'บทบาทนี้ดูได้อย่างเดียว'
        },
        customerDrawer: {
          label: 'รายละเอียดคู่ค้า', info: 'ข้อมูลคู่ค้า', history: 'ประวัติหน่วยขายและผู้รับผิดชอบรายเดือน', prevYear: 'ปีก่อนหน้า', nextYear: 'ปีถัดไป',
          fields: { trcloudId: 'รหัสคู่ค้า', kind: 'ประเภท', trcloudType: 'ประเภทคู่ค้า (TRCLOUD)', legalName: 'ชื่อนิติบุคคล', taxId: 'Tax ID', storeType: 'ประเภทร้าน', tags: 'Tag',
            priceType: 'ประเภทราคา', province: 'จังหวัด', channels: 'Export / Online', status: 'สถานะ', refL12M: 'ยอดอ้างอิง (บาท)', suggested: 'หน่วยขายแนะนำ', unit: 'หน่วยขาย ณ {month}' },
          rows: { unit: 'หน่วยขาย', owner: 'ผู้รับผิดชอบ', ref: 'ยอดอ้างอิงรายเดือน (บาท)' },
          refNote: 'ยอดอ้างอิงรายเดือน = ยอดอ้างอิงทั้งปี × Seasonality ของ {channel} · ยอดของเดือนที่ร้านอยู่ในเขตนับเป็นผลงานของผู้รับผิดชอบเขตในเดือนนั้น',
          trcloudNote: 'รหัสคู่ค้า ชื่อ Tax ID และประเภทมาจาก TRCLOUD (อ่านอย่างเดียว) · แก้ได้เฉพาะสถานะ', readonly: 'ข้อมูลจาก TRCLOUD · บทบาทนี้ดูได้อย่างเดียว',
          move: 'ย้ายหน่วยขาย…', deactivate: 'ปิดใช้งาน', activate: 'เปิดใช้งาน',
          vacant: 'ว่าง', none: '–'
        },
        importButton: 'นำเข้าร้านค้า', importTip: 'นำเข้าร้านค้าจาก Excel (รูปแบบเดียวกับไฟล์ส่งออกคู่ค้าของแท็บนี้)',
        import: {
          title: 'นำเข้าร้านค้าจากไฟล์: {file}', failed: 'อ่านไฟล์ไม่ได้ · ใช้ไฟล์ .xlsx หรือ .csv รูปแบบเดียวกับไฟล์ส่งออก',
          noHeader: 'ไม่พบหัวคอลัมน์ System ID ในไฟล์', rows: 'อ่านได้ {n} แถว',
          groups: { added: 'ร้านใหม่ ({n})', changed: 'ข้อมูลเปลี่ยน ({n})', missing: 'ไม่พบในไฟล์ ({n}) · เสนอปิดใช้งาน' },
          missingNote: 'ไม่ปิดใช้งานอัตโนมัติ · เลือกเฉพาะร้านที่ต้องการปิด',
          rejected: 'ไม่นำเข้า {n} แถว เพราะรหัสคู่ค้าซ้ำ', selectAll: 'เลือกทั้งหมด', fromMonth: 'การเปลี่ยนเขตมีผลตั้งแต่เดือน',
          unknownTerritory: 'ไม่พบเขตชื่อ {names} · ร้านเหล่านี้จะไม่ถูกจัดสรรเขต', masked: 'ชื่อบุคคลธรรมดาถูกซ่อนตามกฎเดิม',
          nothing: 'ไม่มีรายการที่เปลี่ยน', confirm: 'นำเข้ารายการที่เลือก', more: 'และอีก {n} รายการ',
          fields: { name: 'ชื่อร้าน', storeType: 'ประเภทร้าน', priceType: 'ประเภทราคา', province: 'จังหวัด', hasExport: 'Export', hasOnline: 'Online', active: 'สถานะ', territory: 'เขตการขาย' },
          yes: 'มี', no: 'ไม่มี', none: '–'
        },
        exportFile: 'Partner-List_{tab}_{month}_{date}',
        exportSheets: { units: 'หน่วยขาย', customers: 'คู่ค้า', history: 'ประวัติการจัดสรร' },
        exportHeader: { month: 'ข้อมูล ณ เดือน', tab: 'แท็บ', view: 'รายการ', filters: 'ตัวกรอง', noFilters: 'ไม่มี' },
        exportColumns: {
          channel: 'Channel', code: 'รหัส', name: 'ชื่อ', gp: 'GP / Platform Fee (%)', status: 'สถานะ', owner: 'ผู้รับผิดชอบ ณ {month}', note: 'หมายเหตุ',
          suggest: 'เกณฑ์แนะนำ', customers: 'คู่ค้า (ราย)', ref: 'ยอดอ้างอิง (บาท)', unitCode: 'รหัสหน่วยขาย', unitName: 'หน่วยขาย', fromMonth: 'ตั้งแต่เดือน', toMonth: 'ถึงเดือน',
          outside: 'อยู่นอกจังหวัดของเขต', sample: 'ข้อมูลตัวอย่าง', yes: 'ใช่', open: 'ไม่กำหนด'
        }
      },

      // CR-21: หน้าบทบาทและสิทธิ์ (modules/role-management) — ผู้ดูแลระบบ
      //   CR-31: 2 หน้า — Permissions (id roleManagement · จัดการบทบาทที่หัวคอลัมน์ · ข้อความที่ใช้ร่วมอยู่ที่นี่) · Users (roleUsers) · หน้า Roles ซ่อน
      //   ข้อความเรื่องสิทธิ์ใน Prototype ทำงานเฉพาะฝั่งหน้าจอ อยู่ที่คู่มือ (data/guide.js testNotes) ที่เดียว
      roleManagement: {
        title: 'Permissions',
        short: 'Permissions',
        titleTip: 'สิทธิ์ของแต่ละบทบาทในแต่ละหน้า',
        lead: ['สิทธิ์ของแต่ละบทบาทในแต่ละหน้า'],
        history: 'ประวัติการแก้ไข',
        historyEmpty: 'ยังไม่มีการแก้ไขสิทธิ์ บทบาท หรือผู้ใช้',
        historyLine: '{key} · {field}: {old} → {next}',
        headMenu: 'คำสั่งของตาราง',
        resetAll: 'คืนค่าตั้งต้นทั้งหมด',
        resetAllConfirm: 'คืนค่าตั้งต้นของสิทธิ์ทุกบทบาท',
        resetAllLine: 'สิทธิ์ของบทบาทตั้งต้นกลับเป็นค่าตั้งต้น · บทบาทที่สร้างเองกลับเป็น ดู ทุกหน้า',
        matrix: {
          pageColumn: 'หน้า',
          globalGroup: 'ทั้งระบบ',
          moduleFilter: 'Module', moduleAll: 'ทุก Module',
          roleFilter: 'บทบาท', roleAll: 'ทุกบทบาท', roleSelected: '{n} บทบาท',
          empty: 'ไม่มีรายการตามตัวกรอง',
          usersCount: '{n} คน', usersTip: 'เปิดหน้า Users เฉพาะบทบาท {role}', customChip: 'สร้างเอง',
          cellTitle: '{role} · {res}',
          levels: { NONE: 'ไม่เห็น', VIEW: 'ดู', EDIT: 'แก้ไข' },
          actionLevels: { NONE: 'ไม่อนุญาต', EDIT: 'อนุญาต' },
          scopes: { ALL: 'ทุก Channel', TEAM: 'เฉพาะทีม' },
          keysHint: 'คลิกช่องเพื่อเลือกสิทธิ์ · ลูกศรเลื่อนช่อง · 1 ไม่เห็น · 2 ดู · 3 แก้ไข · T สลับเฉพาะทีม · คลิกชื่อหน้าเพื่อตั้งทั้งแถว',
          groupToggle: 'พับ / กาง {group}',
          rowMenu: 'คำสั่งของแถว {res}', setRow: 'ตั้งทั้งแถวเป็น {level}',
          roleMenu: 'คำสั่งของบทบาท {role}',
          menuGroups: { info: 'ข้อมูลบทบาท', perms: 'สิทธิ์', other: 'อื่นๆ', danger: 'อันตราย' },
          menu: {
            rename: 'แก้ชื่อและคำอธิบาย…', home: 'ตั้งหน้าเริ่มต้น…', left: 'เลื่อนไปซ้าย', right: 'เลื่อนไปขวา',
            setColumn: 'ตั้งทั้งคอลัมน์เป็น…', copyFrom: 'คัดลอกสิทธิ์จากบทบาท…', reset: 'คืนค่าตั้งต้นของบทบาทนี้',
            preview: 'ดูตัวอย่างในมุมมองนี้', users: 'ดูรายชื่อผู้ใช้', remove: 'ลบบทบาท'
          },
          setColumnTitle: 'ตั้งทั้งคอลัมน์ของ {role}', setColumnLabel: 'ระดับสิทธิ์', setColumnLine: 'ทุกหน้าของ {role} เป็นระดับที่เลือก · ปุ่มเฉพาะ: แก้ไข = อนุญาต · อื่นๆ = ไม่อนุญาต',
          copyTitle: 'คัดลอกสิทธิ์ให้ {role}', copyLabel: 'คัดลอกจากบทบาท', copyLine: 'สิทธิ์ทุกหน้าของ {role} จะเท่ากับบทบาทที่เลือก (ยังไม่บันทึกจนกด บันทึก)',
          removeConfirm: 'ลบบทบาท {name}', removeHasUsers: 'ลบบทบาท {name} ไม่ได้ เพราะมีผู้ใช้ {n} คน · เอาบทบาทออกจากผู้ใช้ก่อน',
          previewNone: 'ยังไม่มีผู้ใช้ที่เปิดใช้งานในบทบาทนี้',
          adjusted: 'ปรับสิทธิ์ย่อยให้ไม่สูงกว่าหน้าหลัก: {items}',
          adjustedItem: '{res} ของ {role} เป็น {level}',
          add: '+ เพิ่มบทบาท',
          panel: {
            addTitle: 'เพิ่มบทบาท', editTitle: 'บทบาท {name}', name: 'ชื่อบทบาท', description: 'คำอธิบาย',
            copyFrom: 'คัดลอกสิทธิ์จาก (ไม่บังคับ)', copyNone: 'ไม่คัดลอก (ดู ทุกหน้า)',
            home: 'หน้าเริ่มต้น', homeAuto: 'อัตโนมัติ ({page})',
            homeTip: 'หน้าที่เปิดเมื่อเข้าเว็บหรือสลับเป็นบทบาทนี้ · ผู้ใช้หลายบทบาทใช้หน้าเริ่มต้นของบทบาทแรกตามลำดับ · เลือกจากหน้าที่บทบาทนี้เห็น',
            save: 'ใช้ค่านี้', cancel: 'ยกเลิก',
            errors: { name: 'กรุณากรอกชื่อบทบาท', duplicate: 'มีบทบาทชื่อนี้แล้ว' }
          }
        },
        usersTab: {
          columns: { name: 'ชื่อ', roles: 'บทบาท', person: 'บุคลากร', teams: 'ทีม' },
          // CR-32: บุคลากรของผู้ใช้ = person.userId (1:1 · บุคคลเท่านั้น)
          personEmpty: '–', personPick: 'เลือกบุคลากรของ {name}',
          personErrors: { taken: 'บุคลากรนี้ผูกกับผู้ใช้คนอื่นแล้ว', team: 'บุคลากรประเภททีมผูกบัญชีผู้ใช้ไม่ได้', missing: 'ไม่พบบุคลากร' },
          search: 'ค้นหาชื่อ', moduleFilter: 'Module',
          roleFilter: 'บทบาท', roleAll: 'ทุกบทบาท', roleSelected: '{n} บทบาท',
          channelFilter: 'Channel ของทีม', channelAll: 'ทุก Channel', channelNone: 'ไม่อยู่ในทีม',
          statusFilter: 'สถานะ', statuses: { all: 'ทุกสถานะ', active: 'ใช้งาน', inactive: 'ปิดใช้งาน' },
          groupHead: '{role} · {n} คน', noRolesGroup: 'ยังไม่มีบทบาท',
          teamLine: '{channel} · {role}', teamRoles: { MANAGER: 'Manager', OFFICER: 'Officer' }, teamTip: 'เปิด Sales Person Management · {name}',
          fromTip: 'ได้จากบทบาท: {roles}', inactiveTip: 'ผู้ใช้ปิดใช้งาน · ไม่มีสิทธิ์',
          mainCol: 'หน้า',
          rolesEdit: 'เลือกบทบาทของ {name}', rolesNone: 'ยังไม่มีบทบาท',
          rowMenu: 'คำสั่งของ {name}', deactivate: 'ปิดใช้งาน', activate: 'เปิดใช้งาน',
          add: '+ เพิ่มผู้ใช้', addTitle: 'เพิ่มผู้ใช้', name: 'ชื่อผู้ใช้', person: 'เชื่อมกับบุคลากร (ไม่บังคับ)', personNone: 'ไม่เชื่อม', rolesLabel: 'บทบาท',
          errors: { name: 'กรุณากรอกชื่อผู้ใช้ หรือเลือกบุคลากร', roles: 'กรุณาเลือกบทบาทอย่างน้อย 1 บทบาท', duplicate: 'บุคลากรนี้เป็นผู้ใช้อยู่แล้ว' },
          empty: 'ไม่มีผู้ใช้ตามตัวกรอง',
          drawerTabs: { info: 'ข้อมูล', effective: 'สิทธิ์ที่มีผลจริง', history: 'ประวัติ' },
          info: { name: 'ชื่อ', roles: 'บทบาท', team: 'ทีม', home: 'หน้าเริ่มต้นที่มีผล', status: 'สถานะ', person: 'บุคลากร' },
          effectiveLead: 'รวมทุกบทบาทแบบสิทธิ์สูงสุด (แก้ไข > ดู > ไม่เห็น · ทุก Channel > เฉพาะทีม) · ผู้ใช้ที่ปิดใช้งาน = ไม่เห็นทุกหน้า',
          effectiveCols: { res: 'หน้า / สิทธิ์', level: 'สิทธิ์', from: 'ได้จากบทบาท' },
          historyEmpty: 'ยังไม่มีประวัติของผู้ใช้นี้',
          exportFile: 'Users-Permissions_{module}_{date}', exportSheet: 'สิทธิ์ของผู้ใช้'
        },
        save: {
          summary: 'เปลี่ยน {cells} ช่อง ใน {roles} บทบาท · กระทบผู้ใช้ {users} คน',
          roleChanges: 'แก้ข้อมูลบทบาท {n} รายการ',
          userChanges: 'แก้ผู้ใช้ {n} คน',
          title: 'บันทึกบทบาทและสิทธิ์',
          noAdminTitle: 'บันทึกไม่ได้',
          noAdmin: 'ต้องมีผู้ใช้ที่เปิดใช้งานและมีสิทธิ์ แก้ไข หน้า Role Management อย่างน้อย 1 คน',
          selfTitle: 'ยืนยันอีกครั้ง: เอาสิทธิ์แก้ไขหน้านี้ออกจากตัวเอง',
          selfLine: 'หลังบันทึก {name} จะแก้หน้า Role Management ต่อไม่ได้ (ผู้ใช้อื่นที่มีสิทธิ์ยังแก้ได้)',
          confirm: 'บันทึก'
        },
        audit: { permission: 'สิทธิ์', role: 'บทบาท', user: 'ผู้ใช้', fields: { level: 'สิทธิ์', name: 'ชื่อ', description: 'คำอธิบาย', order: 'ลำดับ', homePageId: 'หน้าเริ่มต้น', roleIds: 'บทบาท', active: 'สถานะ', create: 'เพิ่ม', 'delete': 'ลบ' } },
        exportSpec: { file: 'Roles-Permissions_{date}', sheet: 'สิทธิ์ตามหน้า', cols: { group: 'Module', page: 'หน้า', res: 'สิทธิ์', id: 'รหัสสิทธิ์' } }
      },
      // CR-31: หน้า Roles ซ่อน (ลิงก์เดิมพาไปหน้า Permissions) · ฟังก์ชันเดิมอยู่ที่เมนู ⋯ ของหัวคอลัมน์บทบาท
      roleRoles: {
        title: 'Roles',
        short: 'Roles',
        titleTip: 'ย้ายไปหน้า Permissions (เมนู ⋯ ของหัวคอลัมน์บทบาท)',
        lead: ['จัดการบทบาทได้ที่หน้า Permissions'],
        moved: 'จัดการบทบาทย้ายไปหน้า Permissions แล้ว'
      },
      roleUsers: {
        title: 'Users',
        short: 'Users',
        titleTip: 'บทบาทของผู้ใช้และสิทธิ์ที่มีผลจริง',
        lead: ['บทบาทของผู้ใช้และสิทธิ์ที่มีผลจริง']
      },

      // CR-29: หน้าบุคลากรและทีม (ใหม่ · แทนหน้าผู้รับผิดชอบและทีมขายเดิม) — บุคคล / ทีม · ทีมตามช่วงเวลา · สิ้นสุดการรับผิดชอบ · ผู้รับผิดชอบรายเดือน
      // CR-32: เปลี่ยนชื่อเป็น Sales Person Management · ตัดคำอธิบายใต้หัวข้อ · บัญชีผู้ใช้ (person.userId) · ข้อมูลที่ต้องตรวจมาตรฐานใหม่
      people: {
        // CR-35: แท็บรายชื่อและทีม (โหมดแก้ไข) = ปุ่ม แก้ไข ขวาสุดทุกแถว · คลิกแถวเพื่อแก้ไข
        rowEdit: 'แก้ไข', rowEditTip: 'แก้ไข {name}', listEditHint: 'คลิกแถวเพื่อแก้ไขบุคลากร', openTip: 'ดูรายละเอียด {name}',
        title: 'Sales Person Management',
        short: 'Sales Person Management',
        titleTip: 'บุคลากรและทีมขาย · ผู้รับผิดชอบหน่วยขายรายเดือน',
        tabLabel: 'มุมมอง',
        tabs: { list: 'รายชื่อและทีม', monthly: 'ผู้รับผิดชอบรายเดือน' },
        search: 'ค้นหาชื่อ',
        filters: { channel: 'Channel', channelAll: 'ทุก Channel', role: 'บทบาทในทีม', roleAll: 'ทุกบทบาท', status: 'สถานะ', person: 'คน', personAll: 'ทุกคน' },
        statusOptions: { active: 'ใช้งาน', ended: 'สิ้นสุดแล้ว', all: 'ทั้งหมด' },
        roles: { MANAGER: 'Sales Manager', OFFICER: 'Sales Officer' },
        groupBy: 'จัดกลุ่มตาม Channel',
        columns: { name: 'ชื่อ', teams: 'ทีม', units: 'ดูแลอยู่ ณ {month}', account: 'บัญชีผู้ใช้', status: 'สถานะ' },
        teamChip: '{channel} · {role}',
        teamTip: '{channel} · {role} · {period}',
        moreUnits: '+{n}',
        noUnits: '–',
        teamIcon: 'ทีม (รับผิดชอบหน่วยขายได้เหมือนบุคคล)', teamBadge: 'ทีม',
        types: { person: 'บุคคล', team: 'ทีม' },
        status: { active: 'ใช้งาน', ending: 'ใช้งาน', ended: 'สิ้นสุด {month}', none: 'ยังไม่ได้รับมอบหมาย' },
        endingTag: 'จะสิ้นสุด {month}',
        group: {
          managers: 'Sales Manager {n}', officers: 'Sales Officer {n}', units: '{unit} {n}', noManager: '⚠ ไม่มี Sales Manager',
          allChannels: 'ทุก Channel', allChannelsNote: 'บุคลากรที่ไม่อยู่ทีมขายของ Channel ใด (เช่น ทีม KAM กลาง)'
        },
        checks: {
          title: 'ข้อมูลที่ต้องตรวจ {from} – {to} (ถึงสิ้นสุดแผน)',
          types: {
            vacant: 'หน่วยขายใช้งานที่ไม่มีผู้รับผิดชอบในบางเดือน', handover: 'ผู้รับผิดชอบจะสิ้นสุดแต่ไม่มีคนรับช่วง',
            idleOfficer: 'Sales Officer ที่ไม่ได้รับผิดชอบหน่วยขายใด', endedUser: 'บุคลากรที่สิ้นสุดแล้วแต่บัญชีผู้ใช้ยังใช้งาน'
          },
          vacantItem: '{channel} · {unit} · {from} – {to}', handoverItem: '{channel} · {unit} · {name} ถึง {month}', personItem: '{name}', endedUserItem: '{name} · {user}'
        },
        add: '+ เพิ่มบุคลากร',
        addDialog: { title: 'เพิ่มบุคลากร', name: 'ชื่อ', type: 'ประเภท', channel: 'ทีม (Channel)', role: 'บทบาทในทีม', from: 'เดือนเริ่ม', noTeam: 'ทุก Channel (ทีมกลาง)',
          confirm: 'เพิ่ม', errors: { name: 'กรุณากรอกชื่อ', duplicate: 'มีบุคลากรชื่อนี้อยู่แล้ว', userName: 'กรุณากรอกชื่อผู้ใช้', roles: 'เลือกบทบาทอย่างน้อย 1 บทบาท', taken: 'บัญชีผู้ใช้นี้ผูกกับบุคลากรคนอื่นแล้ว', team: 'บุคลากรประเภททีมผูกบัญชีผู้ใช้ไม่ได้' } },
        account: {
          title: 'บัญชีผู้ใช้', none: '–', pick: 'บัญชีผู้ใช้', pickNone: 'ไม่ผูกบัญชีผู้ใช้', create: 'สร้างบัญชีผู้ใช้ด้วย', userName: 'ชื่อผู้ใช้', email: 'อีเมล',
          roles: 'บทบาท', rolesHint: 'ค่าตั้งต้นตามบทบาทในทีม (Sales Manager → Sales Manager · Sales Officer → Sales Officer) แก้ได้',
          team: 'บุคลากรประเภททีมผูกบัญชีผู้ใช้ไม่ได้', inactive: '(ปิดใช้งาน)', openUsers: 'เปิดหน้า Users',
          createTitle: 'สร้างบัญชีผู้ใช้ของ {name}', createConfirm: 'สร้าง', createNote: 'บันทึกลงรายชื่อผู้ใช้เดียวกับหน้า Users เมื่อกด บันทึก ของหน้านี้',
          change: 'เปลี่ยน…', unlink: 'ยกเลิกการผูก'
        },
        drawer: {
          label: 'รายละเอียดบุคลากร', tabs: { info: 'ข้อมูล', history: 'ประวัติการเปลี่ยนแปลง' },
          fields: { name: 'ชื่อ', type: 'ประเภท' },
          teamsTitle: 'ทีม', teamsEmpty: 'ทุก Channel (ไม่อยู่ทีมขายของ Channel ใด)', period: '{from} – {to}', since: 'ตั้งแต่ {from}',
          endMember: 'สิ้นสุดสมาชิก…', addTeam: '+ เพิ่มทีม',
          unitsTitle: 'หน่วยขายที่ดูแล', unitsEmpty: 'ยังไม่ได้ดูแลหน่วยขาย', unitLine: '{unit} · {period}',
          perfTitle: 'ผลงาน', perf: 'ผลงาน YTD {year}: {pct} ของเป้าหมาย', perfNone: 'ผลงาน YTD {year}: ยังไม่มียอดขายจริง', perfActual: 'Actual ปี {year} (ถึง {month}) {amount} ล้านบาท',
          perfLink: 'ดูใน Plan Summary →',
          end: 'สิ้นสุดการรับผิดชอบ…', cancelEnd: 'ยกเลิกการสิ้นสุด', cancelEndTip: 'คืนช่วงทีมและผู้รับผิดชอบเดิม (ทำได้ก่อนเดือนสิ้นสุดมาถึง)',
          ended: 'สิ้นสุดการรับผิดชอบแล้วเมื่อ {month}', ending: 'ตั้งเดือนสุดท้ายที่รับผิดชอบไว้ {month}',
          remove: 'นำออก', removeConfirm: 'นำ {name} ออกจากรายชื่อบุคลากร', removeBlocked: 'นำออกไม่ได้เพราะมีประวัติทีมหรือผู้รับผิดชอบ · ให้ใช้สิ้นสุดการรับผิดชอบแทน'
        },
        endFlow: {
          title: 'สิ้นสุดการรับผิดชอบ: {name}',
          step1: '1. เดือนสุดท้ายที่รับผิดชอบ', step2: '2. หน่วยขายที่ดูแลหลังเดือนนั้น', step3: '3. ผู้รับช่วงต่อ', step4: '4. สรุป',
          noUnits: 'ไม่มีหน่วยขายที่ต้องส่งต่อหลังเดือนนี้', giveAll: 'ให้', giveAllApply: 'รับทั้งหมด', undecided: 'ยังไม่กำหนด',
          unitRow: '{unit} ({period})',
          summaryUnits: 'หน่วยขาย {n} หน่วย', summaryTo: '{unit} → {to}', summaryMembers: 'สมาชิกทีมที่จะสิ้นสุด: {list}', summaryNoMembers: 'ไม่มีสมาชิกทีมที่ต้องสิ้นสุด',
          summaryNote: 'ร้านค้าไม่ย้าย (ผูกกับเขต) · เป้าหมายและแผนไม่เปลี่ยน',
          confirm: 'ยืนยันการสิ้นสุด', cancel: 'ยกเลิก', errors: { past: 'เลือกเดือนที่ผ่านไปแล้วไม่ได้', range: 'ช่วงเดือนไม่ถูกต้อง', missing: 'ไม่พบบุคลากร' }
        },
        teamDialog: {
          addTitle: 'เพิ่มทีมของ {name}', endTitle: 'สิ้นสุดสมาชิก {channel} · {role}', channel: 'Channel', role: 'บทบาทในทีม', from: 'เดือนเริ่ม', to: 'เดือนสุดท้าย',
          confirmAdd: 'เพิ่ม', confirmEnd: 'สิ้นสุดสมาชิก', clash: 'ช่วงนี้ซ้อนกับช่วงเดิมในทีมเดียวกัน', endError: 'เดือนสุดท้ายเร็วเกินไป (เลือกได้ตั้งแต่เดือนก่อนเดือนปัจจุบัน)',
          note: 'สมาชิกทีมเป็นผู้มีสิทธิ์แก้ไขแผนยอดขายราย SKU ของ Channel นั้น'
        },
        monthly: {
          title: 'ผู้รับผิดชอบรายเดือน {year}', year: 'ปี', unit: 'หน่วยขาย', hint: 'คลิกเดือนแรกและเดือนสุดท้ายของหน่วยขายเดียวกัน แล้วเลือกคนหรือทีม',
          // CR-35: สัญญาณโหมดแก้ไข (แถบโหมดแก้ไขมีคำอธิบาย · ขวาบนเหลือสิ้นสุดแผน · โหมดดูบอกผู้มีสิทธิ์ให้กด แก้ไข)
          viewHint: 'กด แก้ไข เพื่อเปลี่ยนผู้รับผิดชอบ', startTag: 'เริ่ม', cancelPick: 'กด Esc หรือคลิกนอกตารางเพื่อยกเลิกการเลือก',
          past: 'เดือนที่ผ่านไปแล้ว แก้ไม่ได้', none: 'ไม่มีผู้รับผิดชอบ', ended: '{name} (สิ้นสุดแล้ว)',
          assignFor: '{unit}: {months}', person: 'ผู้รับผิดชอบ', vacant: 'ยังไม่กำหนด (ว่าง)', apply: 'กำหนด', clear: 'ยกเลิกการเลือก',
          note: 'การเปลี่ยนผู้รับผิดชอบไม่เปลี่ยนเป้าหมายและแผนยอดขาย', errors: { past: 'แก้เดือนที่ผ่านไปแล้วไม่ได้', range: 'ช่วงเดือนไม่ถูกต้อง' },
          empty: 'ไม่มีหน่วยขายตามตัวกรอง',
          // CR-32: ปุ่มปีถึงสุดแผน · ตามหน่วยขาย | ตามบุคคล · กล่องถามการแทนที่
          horizon: 'สิ้นสุดแผน {month}', viewLabel: 'มุมมอง', views: { unit: 'ตามหน่วยขาย', person: 'ตามบุคคล' },
          byPerson: {
            actualTitle: 'ยอดจริง {year} (พันบาท)', targetTitle: 'เป้าหมายรายเดือน {year} (พันบาท)', notAllocated: 'ยังไม่ได้จัดสรรเป้ารายเดือน {year}',
            person: 'ผู้รับผิดชอบ / หน่วยขาย', yearTotal: 'รวมปี', vacant: 'ไม่มีผู้รับผิดชอบ',
            // CR-35: พันบาท ไม่มีทศนิยม (Tooltip = บาทเต็ม) · โหมดแก้ไข = ดูอย่างเดียว + ปุ่มสลับ
            cellTip: '{name} · {month} · {amount} บาท', noTarget: 'ไม่มีเป้าหมายในปีนี้', readOnly: 'มุมมองนี้ดูอย่างเดียว', switchUnit: 'สลับเป็นตามหน่วยขาย'
          },
          replace: {
            title: 'เปลี่ยนผู้รับผิดชอบ {unit}', line1: '{name} จะรับผิดชอบช่วง {range}', line2: '{name} ยังรับผิดชอบต่อหลังจากนั้น ({from} – {to})',
            endOthers: 'สิ้นสุดการรับผิดชอบของ {name} ในหน่วยขายอื่นด้วย ตั้งแต่ {month} ({units})',
            rest: 'แทนที่ช่วงที่เหลือด้วย {name}', only: 'เฉพาะช่วงที่เลือก', cancel: 'ยกเลิก'
          }
        },
        exportFile: 'People_{date}', exportSheet: 'บุคลากร', exportMonthlySheet: 'ผู้รับผิดชอบรายเดือน',
        exportColumns: { name: 'ชื่อ', type: 'ประเภท', teams: 'ทีม', units: 'ดูแลอยู่ ณ {month}', account: 'บัญชีผู้ใช้', status: 'สถานะ' },
        exportHeader: { month: 'ข้อมูล ณ เดือน' }
      },

      // CR-29: หน้าผู้รับผิดชอบ / ทีมขายเดิม — ซ่อนแล้ว เปิดลิงก์เดิมพาไปแท็บที่ตรงกันของหน้าบุคลากรและทีม
      salesTeam: {
        title: 'ทีมขาย',
        moved: 'หน้านี้ย้ายไปที่ Sales Person Management › รายชื่อและทีม (จัดกลุ่มตาม Channel)', go: 'ไปที่หน้า Sales Person Management'
      },
      salespeople: {
        title: 'ผู้รับผิดชอบ',
        moved: 'หน้านี้ย้ายไปที่ Sales Person Management › ผู้รับผิดชอบรายเดือน · ผลงานรายบุคคลอยู่ที่ Plan Summary', go: 'ไปที่หน้า Sales Person Management'
      },

      // ขั้นที่ 4 (CR-12): แท็บติดตามสถานะ (งานที่ต้องทำ ไม่พิมพ์) | รายงานสรุปแผน (ประกาศและหลักฐานข้อตกลง พิมพ์ได้)
      summary: {
        title: 'Plan Summary',
        short: 'Plan Summary',
        titleTip: 'รายงานสรุปแผน',
        lead: ['ติดตามรายการที่ต้องดำเนินการ และสรุปแผนสำหรับประกาศและเป็นหลักฐานข้อตกลง'],
        tabLabel: 'มุมมองของขั้นที่ 4',
        tabs: { report: 'รายงานสรุปแผน', status: 'ติดตามสถานะ', statusCount: 'ติดตามสถานะ ({n})' },
        tabTips: {
          status: 'รายการที่ต้องดำเนินการก่อนล็อก Baseline (ไม่ใช่เอกสารสำหรับพิมพ์)',
          statusLite: 'หน่วยขายที่แผนยังมีส่วนต่างหรือยังไม่มีผู้รับผิดชอบ (ไม่ใช่เอกสารสำหรับพิมพ์)',
          report: 'รายงานสำหรับประกาศและเป็นหลักฐานข้อตกลง พิมพ์ / บันทึก PDF ได้'
        },
        tabCountTip: 'หน่วยขายที่มีประเด็น {n} หน่วย',
        statusNoPrint: 'แท็บติดตามสถานะไม่ใช่เอกสารสำหรับพิมพ์ · พิมพ์ได้จากแท็บรายงานสรุปแผน',
        channelFilter: 'Channel',
        channelAll: 'ทุก Channel',
        channelSelected: '{n} Channel',
        channelClear: 'ล้างที่เลือก',
        channelEmpty: 'ไม่พบ Channel',
        millionUnit: 'ล้านบาท',
        totalRow: 'Total',
        print: 'พิมพ์ / บันทึก PDF',

        // ---------- แท็บติดตามสถานะ ----------
        yearTitle: 'สถานะทั้งปี',
        yearLines: {
          topDown: 'Annual Target: {status}',
          topDownApproved: 'Annual Target: อนุมัติแล้ว · {by} · {at}',
          notLocked: 'Baseline: ยังไม่ล็อก',
          locked: 'Baseline: ล็อกแล้ว {code} · {at}',
          versions: 'รายงานที่เคยล็อก: {list}',
          storesMoved: 'ร้านค้าย้ายเขตหลังอนุมัติเป้าหมาย: {n} ร้าน · ยอดอ้างอิง {amount} บาท',
          storesMovedTip: 'เป้าหมายของเขตไม่เปลี่ยน · Sales Director ตัดสินใจว่าจะปรับ Sub-channel Allocation หรือไม่',
          storesMovedItem: '{name} ({id}) · {from} → {to} · มีผลตั้งแต่ {month} · {amount} บาท',
          storesMovedMore: 'และอีก {n} ร้าน',
          storesMovedLink: 'ไปที่หน้า {page}',
          unassigned: 'ยังไม่จัดสรร'
        },
        lockButton: 'ล็อก Baseline {year}',
        lockConfirm: 'ล็อก Baseline ปี {year}',
        lockLines: [
          'แผน SKU ที่อนุมัติแล้วทุกรายการจะเป็น Baseline ทั้งปี ใช้วัดผลงานตลอดปี',
          'หลังล็อก Annual Target · Sub-channel Allocation และแผนครั้งแรกจะแก้ไขไม่ได้',
          'ระหว่างปีปรับได้เฉพาะ Re-forecast (ล็อก M+1 ถึง M+3)',
          'รายงานสรุปแผนฉบับที่ {code} จะใช้ตัวเลข ณ เวลาที่ล็อก'
        ],
        lockTotals: 'Total Target {target} บาท · แผนรวม {plan} บาท · {n} หน่วยขาย',
        lockPending: 'แผน SKU ยังไม่อนุมัติ {n} หน่วยขาย',
        lockTopDownPending: 'Annual Target ยังไม่ได้รับอนุมัติ',
        lockDirectorOnly: 'เฉพาะ Sales Director',
        unlockButton: 'ปลดล็อก Baseline',
        unlockConfirm: 'ปลดล็อก Baseline ปี {year}',
        unlockLines: [
          'รายงานฉบับที่ {code} ยังอยู่ในประวัติ',
          'เปิดให้แก้ไขแผนได้อีกครั้ง เมื่อล็อกใหม่จะเป็นรายงานฉบับถัดไป'
        ],
        unlockNote: 'เหตุผลที่ปลดล็อก (จำเป็น)',
        unlockNoteRequired: 'กรุณาระบุเหตุผลก่อนปลดล็อก',
        actionsTitle: 'สถานะและการอนุมัติรายหน่วยขาย',
        actionsTitleLite: 'รายการที่ต้องดำเนินการรายหน่วยขาย',
        actionsCount: 'ยังจัดสรรไม่ครบ {n} จาก {total} หน่วยขาย',   // CR-28
        actionFilters: {
          channel: 'Channel', channelAll: 'ทุก Channel',
          owner: 'ผู้รับผิดชอบ', ownerAll: 'ทุกคน', ownerNone: 'ยังไม่มีผู้รับผิดชอบ',
          // CR-28: แท็บตัวกรองพร้อมจำนวน (แทน Checkbox เฉพาะที่มีส่วนต่าง / แสดงเฉพาะที่มีประเด็น)
          tabsLabel: 'กรองตามสถานะ',
          tabs: { all: 'ทั้งหมด', short: 'ขาด', over: 'เกิน', ok: 'จัดสรรครบ', vacant: 'ไม่มีผู้รับผิดชอบ' },
          tabCount: '({n})',
          tabTips: { all: 'ทุกหน่วยขาย', short: 'แผนต่ำกว่าเป้าหมายเกิน ±1 บาท', over: 'แผนสูงกว่าเป้าหมายเกิน ±1 บาท', ok: 'แผนเท่าเป้าหมาย (±1 บาท)', vacant: 'ยังไม่มีผู้รับผิดชอบ (นับซ้อนกับสถานะส่วนต่างได้)' }
        },
        gapWithPct: '{text} ล้าน ({pct})',
        goFix: 'ไปแก้ไข →',
        goAssign: 'กำหนดผู้รับผิดชอบ →',
        allDone: 'ทุกหน่วยขายจัดสรรครบแล้ว',
        actionColumns: {
          channel: 'Channel', unit: 'หน่วยขาย', owner: 'ผู้รับผิดชอบ', gap: 'ส่วนต่าง', phasing: 'เป้าหมายรายเดือน', sku: 'แผน SKU',
          status: 'สถานะ', approvedBy: 'ผู้อนุมัติ', approvedAt: 'วันที่อนุมัติ', next: 'การดำเนินการถัดไป'
        },
        noIssue: '–',
        historyTitle: '{step} · {unit}',
        historyOpen: 'ดูประวัติการอนุมัติ',
        historyGo: 'ไปที่หน้า {page}',
        statusShort: { draft: 'ยังไม่ส่ง', submitted: 'รออนุมัติ', approved: 'อนุมัติแล้ว', returned: 'ส่งกลับแก้ไข', review: 'ต้องตรวจสอบใหม่', locked: 'ล็อกแล้ว' },
        next: {
          assignOwner: 'กำหนดผู้รับผิดชอบ',
          fixPhasing: 'แก้ไขแล้วส่งใหม่',
          reviewPhasing: 'ตรวจสอบแล้วส่งใหม่',
          waitTopDown: 'รออนุมัติเป้าหมายประจำปี',
          submitPhasing: 'ส่งเป้าหมายรายเดือน',
          waitDirector: 'รออนุมัติจาก Director',
          fixSku: 'แก้ไขแผนแล้วส่งใหม่',
          reviewSku: 'ตรวจสอบแผนแล้วส่งใหม่',
          closeGap: 'ปิดส่วนต่าง',
          submitSku: 'ส่งอนุมัติ',
          checkOver: 'ตรวจสอบแผนที่เกิน'
        },
        nextTip: 'ไปที่หน้า {page} · {name}',
        openPlan: 'เปิดหน้า SKU Planning ของ {name}',
        actionsNoneFiltered: 'ไม่มีรายการตามตัวกรองที่เลือก',

        // ---------- แท็บรายงานสรุปแผน ----------
        docTitle: 'รายงานสรุปแผน {year}',
        version: 'ฉบับที่ {code}',
        statusLocked: 'สถานะ: อนุมัติแล้ว · ล็อก Baseline {at} โดย {by}',
        statusDraft: 'สถานะ: ฉบับร่าง · ยังไม่ได้รับอนุมัติ',
        topDownLine: {
          approved: 'Annual Target: อนุมัติแล้ว {at} โดย {by}',
          submitted: 'Annual Target: รออนุมัติ · ส่งเมื่อ {at} โดย {by}',
          other: 'Annual Target: {status}'
        },
        printedAt: 'พิมพ์เมื่อ {at}',
        snapshotNote: 'ตัวเลขในรายงานนี้มาจาก Baseline ที่ล็อกไว้',
        draftNote: 'ฉบับร่าง: ตัวเลขเป็นข้อมูลล่าสุดที่ยังแก้ไขได้',
        watermark: 'ฉบับร่าง · ยังไม่ได้รับอนุมัติ',
        kpi: {
          target: 'Total Target',
          targetSub: 'การเติบโตเทียบ L12M {growth}',
          plan: 'แผน Bottom-up รวม',
          planSub: '{pct} ของเป้าหมาย',
          gap: 'ส่วนต่างจากเป้าหมาย',
          approval: 'ความคืบหน้าการอนุมัติ',
          approvalValue: '{done} / {total}',
          approvalSub: 'หน่วยขายที่แผน SKU อนุมัติแล้ว',
          // CR-17 ปิด approvalWorkflow
          allocated: 'หน่วยขายที่จัดสรรครบ',
          allocatedSub: 'แผน SKU เท่าเป้าหมาย (±1 บาท)'
        },
        monthlyTitle: 'เป้าหมายเทียบแผน รายเดือน (ล้านบาท)',
        // CR-34: แท่งซ้อนแผนตามประเภท (labels.planTypes) · ขีดเป้าหมาย · เส้นประยอดขายอ้างอิง (CR-24 ยอดจริงล่าสุดของแต่ละเดือน) · แถวส่วนต่าง · สรุปทั้งปีหัวกราฟ
        monthlyLegend: { target: 'เป้าหมาย Top-down', reference: 'ยอดขายอ้างอิง', refToggle: 'กดเพื่อซ่อน / แสดงเส้นยอดขายอ้างอิง', diff: 'ส่วนต่าง' },
        monthlyDiffOk: 'ครบ',
        monthlyAnnual: 'ทั้งปี · เป้าหมาย {target} · แผน {plan} · {gap}',
        monthlyClearance: ' · Clearance {value} (ไม่นับในเป้า)',   // CR-36 ต่อท้ายเมื่อมีแผน Clearance
        monthlyGap: { ok: 'ครบ', short: 'ขาด {amount} ({pct})', over: 'เกิน {amount} ({pct})', empty: 'ยังไม่มีเป้าหมาย' },
        monthlyTip: { target: 'เป้าหมาย Top-down', plan: 'แผนรวม', existingListing: '{label} (Listing ใหม่ {value})', gap: 'ส่วนต่าง', prior: 'ยอดขายอ้างอิง' },
        wfAxis: 'แกนเริ่มที่ {value} ล้านบาท',
        tableTitle: 'เป้าหมายและแผนราย Channel และหน่วยขาย (ล้านบาท)',
        // CR-26: ตารางแผนตามสินค้าและช่องทาง (report.pivotPlan)
        pivot: {
          title: 'แผนตามสินค้าและช่องทาง ({unit})',
          moneyUnit: '{value} · ล้านบาท',
          rowsLabel: 'แถว', rowsOptions: { series: 'Series › SKU', category: 'Category › Sub Category › SKU', status: 'Status › SKU' },
          colsLabel: 'คอลัมน์', colsOptions: { channel: 'Channel', unit: 'หน่วยขาย', month: 'เดือน', quarter: 'ไตรมาส' },
          valueLabel: 'ค่า', valueOptions: { net: 'Net Sales', sale: 'Sale Amount', units: 'จำนวนชิ้น' },
          showLabel: 'แสดงเป็น', showOptions: { value: 'ค่า', rowPct: '% ของแถว', colPct: '% ของคอลัมน์' },
          channelFilter: 'Channel', unitFilter: 'หน่วยขาย', statusFilter: 'Status', all: 'ทั้งหมด', selected: '{n} รายการ', unitSearch: 'ค้นหาหน่วยขาย',
          search: 'ค้นหา SKU',
          expandAll: 'กางทั้งหมด', collapseAll: 'พับทั้งหมด',
          total: 'รวม', count: '{n} SKU', quarter: 'Q{n}',
          none: '(ไม่ระบุ)', noSeries: '(ไม่ระบุ Series)', noCategory: '(ไม่ระบุ Category)', noSub: '(ไม่ระบุ Sub Category)',
          legendLow: 'น้อย', legendHigh: 'มาก', legendNote: 'สีพื้นเข้มตามค่าในช่อง เทียบเฉพาะแถวระดับเดียวกัน · ช่องว่าง = 0',
          clickNote: 'คลิกตัวเลขของ SKU เพื่อเปิด SKU Planning ของหน่วยขายนั้น',
          clickTip: 'เปิด SKU Planning ของ {unit} และค้นหา {sku}',
          empty: 'ไม่มีรายการตามตัวกรอง',
          printView: 'มุมมอง: {view}',
          viewText: '{rows} × {cols} · {value} · แสดงเป็น{show}',
          exportSpec: {
            file: 'Plan-by-SKU_{year}_{date}', sheet: 'แผนราย SKU', headerView: 'มุมมอง', headerUnit: 'หน่วยค่า',
            cols: { series: 'Series', category: 'Category', sub: 'Sub Category', status: 'Status', sku: 'SKU', name: 'ชื่อสินค้า' }
          }
        },
        tableColumns: { name: 'Channel / หน่วยขาย', target: 'เป้าหมาย', pctOfTotal: '% ของ Total', plan: 'แผน Bottom-up', gap: 'ส่วนต่าง', approval: 'สถานะอนุมัติ', owner: 'ผู้รับผิดชอบ' },
        pctOfTotalTip: 'สัดส่วนเป้าหมายเทียบ Total Target',
        approvalHeadTip: 'ไอคอนซ้าย = เป้าหมายรายเดือน (Sub-channel Allocation) · ไอคอนขวา = แผน SKU',
        approvalTip: 'Phasing: {phasing} · แผน SKU: {sku}',
        approvalIcons: { draft: '○', submitted: '◐', approved: '●', returned: '↩', review: '!' },
        approvalLegend: 'สถานะอนุมัติ (Phasing · แผน SKU):',
        channelApproved: 'อนุมัติแล้ว {done}/{total}',
        collapseTitle: 'ย่อหรือขยายรายการใน Channel นี้',
        mixTitle: 'สัดส่วนแผนตามกลุ่มสินค้า (ล้านบาท)',
        // CR-34: ซ้าย = ตามประเภทแผน (แทนแท่ง ตาม Status) · ขวา = ตามกลุ่มสินค้าซ้อนตามประเภท
        mixByType: 'ตามประเภทแผน',
        mixSkus: '{n} SKU',
        mixListing: '{n} SKU · รวม Listing ใหม่ {value} · {m} SKU',
        mixClearanceNote: 'ไม่นับในเป้าหมาย',   // CR-36 แถวแผน Clearance
        mixNewTotal: 'สินค้าใหม่รวม {value} · {pct} ของแผน',
        mixGap: 'ช่องว่างที่สินค้าใหม่ต้องปิด {value}',
        mixNewTip: 'สินค้าใหม่ = Listing ใหม่ + NPD ยืนยันแล้ว + ขอ NPD · ช่องว่าง = เป้าหมาย − สินค้าเดิม (ไม่รวม Listing ใหม่)',
        mixPartsTip: '{label}: {parts}',
        // CR-34 ส่วน 5: ข้อมูลที่ต้องตรวจของรายงาน (ตาม Channel ที่เลือก)
        checks: { title: 'ข้อมูลที่ต้องตรวจ', types: { clearance: 'มีแผนสินค้า Clearance' }, item: '{sku} {name} · {unit}', criteria: ['มีแผนสินค้า Clearance (จำนวนในแผนมากกว่า 0)'] },
        mixGroupLabel: 'ตามกลุ่มสินค้า',
        mixBy: { series: 'Series', category: 'Category' },
        mixNoCategory: '(ไม่ระบุ Category)',
        mixText: '{value} · {pct}',
        mixOther: 'อื่นๆ',
        peopleTitle: 'เป้าหมายรายผู้รับผิดชอบ (ล้านบาท)',
        peopleColumns: { name: 'ผู้รับผิดชอบ', units: 'หน่วยขายที่ดูแล', target: 'เป้าหมาย', plan: 'แผน', bar: 'เป้าหมายเทียบแผน', gap: 'ส่วนต่าง',
          ytdTarget: 'เป้าหมาย YTD', ytdActual: 'Actual YTD', ytdPct: '% ความสำเร็จ' },
        // CR-29: ผลงาน YTD (ย้ายจากหน้าผู้รับผิดชอบเดิม) ณ เดือนปิดล่าสุด · ดูผลงานปีปัจจุบัน
        ytd: {
          label: 'ผลงาน', plan: 'ผลงานปีแผน {year}', current: 'ดูผลงานปี {year}',
          tipNone: 'ยังไม่มียอดขายจริงของปี {year}', tipAt: 'ผลงาน YTD ถึง {month} (เดือนปิดล่าสุด)',
          tipCurrent: 'Actual ปี {year} ถึง {month} · ไม่มีเป้าหมายปี {year} ในข้อมูล (เป้าหมาย YTD และ % เป็น –)'
        },
        // CR-27: แท่งเป้าหมายเทียบแผน (ความยาว = เป้าหมาย · ขีด = แผน · สเกลร่วม)
        peopleBarHeadTip: 'ความยาวแท่ง = เป้าหมาย · ขีดตั้ง = แผน · สีตามสถานะ (ขาด / เกิน / ครบ) · ทุกแถวใช้สเกลเดียวกันเริ่มที่ 0',
        peopleBarTip: 'เป้าหมาย {target} · แผน {plan} ล้านบาท · {status}',
        peopleNote: 'คำนวณเฉพาะเดือนที่แต่ละคนรับผิดชอบ',
        vacantRow: 'ไม่มีผู้รับผิดชอบ',
        resignedTag: 'สิ้นสุดการรับผิดชอบ {month}',   // CR-29
        approvalsTitle: 'การอนุมัติ',
        approvalLine: 'การอนุมัติ: อนุมัติครบแล้ว {done}/{total} หน่วยขาย',
        approvalsTopDown: 'Annual Target: อนุมัติแล้ว · {by} · {at}',
        approvalsColumns: { unit: 'หน่วยขาย', phasing: 'เป้าหมายรายเดือน', sku: 'แผน SKU', approvedBy: 'ผู้อนุมัติ', approvedAt: 'วันที่อนุมัติ' },
        signTitle: 'ลงนามรับทราบและอนุมัติ',
        signFields: { name: 'ชื่อ', signature: 'ลายมือชื่อ', date: 'วันที่' }
      },

      // เกี่ยวกับ Prototype: ขอบเขต, Decision log, คำถามค้าง, ขั้นต่อไป (แยกออกจากรายงาน)
      // CR-28: คู่มือการใช้งาน (แทนเกี่ยวกับ Prototype · id เดิม) — ป้ายบนหน้าจอเท่านั้น เนื้อหาคู่มืออยู่ใน data/guide.js
      //   ขอบเขต · สิ่งที่ตัดออก · Decision log · คำถามที่ค้าง · ขั้นต่อไป · สิ่งที่ขออนุมัติ อยู่ใน docs/DECISIONS.md และ docs/spec/open-items.md เท่านั้น
      aboutPrototype: {
        title: 'คู่มือการใช้งาน',
        short: 'คู่มือการใช้งาน',
        lead: ['ภาพรวมระบบ ลำดับการทำงาน และคำศัพท์ที่ใช้'],
        tabLabel: 'หัวข้อในคู่มือ',
        tabs: { overview: 'ภาพรวมและลำดับงาน', glossary: 'คำศัพท์และสูตร' },   // CR-36 ตัดแท็บทดสอบ
        overviewTitle: 'ภาพรวม',
        flowTitle: 'ลำดับการทำงาน',
        flow: {
          step: 'ขั้นที่ {n}', go: 'ไปหน้านี้', goTip: 'เปิดหน้า {page}', noAccess: 'บทบาทปัจจุบันไม่เห็นหน้านี้',
          yourRole: 'บทบาทของคุณ', allRoles: 'ทุกบทบาท', result: 'ผลลัพธ์', does: 'สิ่งที่ทำ', loopTip: 'กลับมาที่ขั้นนี้จนแผนครบตามเป้าหมาย'
        },
        rolesTitle: 'บทบาทและหน้าที่',
        rolesNote: 'สร้างจากสิทธิ์ปัจจุบันในหน้า {page_roleManagement}',   // CR-36 ชื่อหน้าจากเมนู
        // CR-31: ข้อมูลบทบาทย้ายมาจากหน้า Roles (สร้างจากข้อมูลจริง รวมบทบาทที่สร้างเอง)
        rolesColumns: { role: 'บทบาท', description: 'คำอธิบาย', edit: 'แก้ไขได้ที่', home: 'หน้าเริ่มต้น', users: 'จำนวนผู้ใช้' },
        usersCount: '{n} คน', customRole: 'สร้างเอง',
        allPages: 'ทุกหน้า',
        allExcept: 'ทุกหน้า ยกเว้น {pages}',
        viewOnly: 'ดูอย่างเดียว',
        testTitle: 'สำหรับการทดสอบ',
        glossaryTitle: 'คำศัพท์',
        glossaryColumns: { term: 'คำ', meaning: 'ความหมาย' },
        formulaSale: 'Sale Amount = จำนวนชิ้น × ราคาขาย (รวม VAT)',
        formulaNetGp: '{channel} Net Sales = Sale Amount ÷ {vat} × (1 − {gp})',
        formulaNet: '{channel} Net Sales = Sale Amount ÷ {vat}',
        // CR-36: สูตร Net Sales ของแผน Clearance (ราคา Clearance · GP / Platform Fee ตาม Channel)
        formulaClearance: 'Clearance Net Sales = จำนวน × ราคา Clearance ÷ {vat} × (1 − {gp} ตาม Channel)'
      }
    }
  };
})(window.SP);

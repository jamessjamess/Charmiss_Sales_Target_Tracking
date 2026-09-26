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

  // CR-18: ชื่อหน้า Promotion Price / ราคาขายต่อ Account ตาม Flag (core/features.js โหลดก่อนไฟล์นี้)
  var PROMO_CALENDAR = !!(SP.core.features && SP.core.features.isOn('promotionCalendar'));

  SP.data.content = {

    site: {
      name: 'Sales Target Planning',
      badge: 'Prototype',
      aboutLink: 'เกี่ยวกับ Prototype',
      menu: 'เมนู',
      menuOpen: 'เปิดเมนู',
      collapse: 'พับเมนู',
      expand: 'ขยายเมนู',
      groups: { 'sales-planning': 'Sales Planning', 'product-master': 'Product Master', 'account-master': 'Account Master', 'role-management': 'Role Management', 'project-info': 'ข้อมูลโครงการ' },
      // CR-21: เปิดหน้าที่มุมมองผู้ใช้นี้ไม่เห็น (สิทธิ์ ไม่เห็น) ตรงด้วย URL
      accessDenied: 'ไม่มีสิทธิ์เข้าถึงหน้านี้',
      accessDeniedText: 'บทบาทของมุมมองผู้ใช้นี้ไม่เห็นหน้านี้ · เปลี่ยนมุมมองผู้ใช้ที่ Header หรือกลับไปหน้าที่เห็น',
      accessDeniedLink: 'ไปที่หน้าเริ่มต้น: {page}',
      // CR-25: สลับมุมมองผู้ใช้แล้วหน้าปัจจุบันถูกซ่อน → ไปหน้าเริ่มต้นของบทบาท (Toast หลังโหลดหน้า)
      switchToast: 'สลับเป็น {role} · ไปที่ {page}',
      toastClose: 'ปิดข้อความ',
      reset: 'รีเซ็ตข้อมูล',
      resetConfirm: 'ล้างข้อมูลที่แก้ไขทั้งหมดรวมถึงสถานะการอนุมัติ และกลับไปใช้ข้อมูลตั้งต้นหรือไม่',
      storeWarning: 'เบราว์เซอร์นี้ไม่ส่งต่อข้อมูลที่แก้ไขข้ามหน้า',
      prev: 'ก่อนหน้า',
      next: 'ถัดไป',
      finish: 'กลับขั้นแรก',
      stepOf: 'ขั้นที่ {n}/{total}',
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
      remainingText: { ok: 'จัดสรรครบ', short: 'ขาด {amount}', over: 'เกิน {amount}', empty: 'ยังไม่กำหนด' },
      // Status สินค้า (calc.productStatus) ชุดเดียวทั้งระบบ คำนวณจากวันที่
      status: { planned: 'Planned', 'new': 'New', active: 'Active', clearance: 'Clearance', discontinued: 'Discontinued' },
      statusHint: { planned: 'ก่อนวันเริ่มขาย', 'new': '3 เดือนแรกนับจากวันเริ่มขาย', active: 'พ้นช่วง New แล้ว', clearance: 'อยู่ในช่วง Clearance', discontinued: 'หลังเดือนเลิกขาย' },
      itemTypes: { SALE: 'ขายจริง', TESTER: 'Tester', GIFT: 'Gift', PREMIUM: 'Premium' },
      inactive: 'ปิดใช้งาน',
      // รายการสินค้า / ความครบถ้วน (components.productThumb, completenessBadge)
      product: {
        noImage: 'ยังไม่มีรูปสินค้า',
        complete: 'ครบ',
        completeTitle: 'ข้อมูลครบทุกฟิลด์',
        missingRequired: 'ขาดจำเป็น {n}',
        missingRecommended: 'ขาดที่ควรมี {n}',
        missingRequiredTitle: 'ขาดข้อมูลจำเป็น: {fields}',
        missingRecommendedTitle: 'ขาดข้อมูลที่ควรมี: {fields}',
        tempTag: 'ชั่วคราว',
        blockedIncomplete: 'ขาดข้อมูลจำเป็น: {fields} · แก้ไขได้ที่รายการสินค้า',
        // CR-11: หมวดสินค้าที่ระบบกำหนดจากคำในชื่อสินค้า (inferred)
        inferredTag: 'ระบบกำหนด',
        inferredTitle: 'หมวดสินค้ากำหนดจากคำในชื่อสินค้า (Excel ยังไม่มี Category) ควรตรวจสอบ'
      },
      // ปุ่ม "ส่งออก ▾" (components.exportButton + core/export.js)
      // CR-21: ระดับสิทธิ์ (components.permChip)
      perm: {
        levels: { NONE: 'ไม่เห็น', VIEW: 'ดู', EDIT: 'แก้ไข' },
        allowed: '✓', denied: '–', allowedText: 'อนุญาต', deniedText: 'ไม่อนุญาต',
        team: 'ทีม', teamText: 'เฉพาะ Channel ในทีม', changed: 'ต่างจากค่าตั้งต้น'
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
      total: 'รวม',
      other: 'อื่นๆ',
      yes: 'ใช่',
      no: 'ไม่ใช่',
      unitAllText: 'รวมทั้ง {unit}',
      // ปุ่มเพิ่มหน่วยขายในแถว Channel ({unit} = unitLabel ของ Channel เช่น Account, เขตการขาย, Platform)
      addUnitButton: '+ {unit}',
      noUnitsOf: 'ยังไม่มี {unit}',
      noMoreUnitsOf: 'เพิ่ม {unit} ที่เปิดใช้งานครบแล้ว · เปิดใช้งาน {unit} ใหม่ได้ที่ {master}',
      masterOf: { ACCOUNT: 'Account Master', TERRITORY: 'หน้าเขตการขาย' },
      // ชื่อฟิลด์ของสินค้า (ความครบถ้วน, Audit log, ฟอร์ม)
      productFields: {
        code: 'รหัส', trCode: 'TR Code', tempCode: 'รหัสชั่วคราว', internalCode: 'Internal Code', barcode: 'Barcode',
        name: 'ชื่อ', nameEn: 'ชื่อภาษาอังกฤษ', shortName: 'ชื่อย่อ', inferred: 'หมวดสินค้าที่ระบบกำหนด', categoryId: 'Category', subCategoryId: 'Sub Category', typeId: 'Type',
        seriesId: 'Series', subSeriesId: 'Sub Series', itemType: 'Item Type', packSize: 'ขนาดบรรจุ', uom: 'หน่วย', image: 'รูป',
        rsp: 'RSP', launchDate: 'วันเริ่มขาย', discontinueMonth: 'เดือนเลิกขาย', clearance: 'Clearance', note: 'หมายเหตุ',
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
        resigned: '{name} (ลาออกแล้ว)',
        historyTitle: 'ประวัติผู้รับผิดชอบ',
        historyEmpty: 'ยังไม่เคยกำหนดผู้รับผิดชอบ',
        now: 'ปัจจุบัน',
        tip: 'ผู้รับผิดชอบ: {name}'
      },
      personStatus: { active: 'ทำงานอยู่', leaving: 'ลาออก {month}', resigned: 'ลาออก {month}', future: 'เริ่มงาน {month}' },
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
          { status: 'new', text: '3 เดือนแรกนับจากวันเริ่มขาย (เดือนที่เริ่มขายนับเป็นเดือนที่ 1)' },
          { status: 'active', text: 'พ้นช่วง New แล้ว' },
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
        priceOrder: 'ราคาขาย = ราคาต่อ Account ถ้ามี ไม่มีใช้ RSP ตามวันที่มีผล',
        priceOrderDealer: 'ราคาขาย = ราคาต่อ Account ถ้ามี ไม่มีใช้ราคา Dealer (ไม่มีราคา Dealer ใช้ RSP)',
        promoNote: 'เดือนที่มี Promo บางวัน ใช้ราคาเฉลี่ยถ่วงตามจำนวนวัน',
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
        priceSource: { account: 'ราคาต่อ Account', dealer: 'ราคา Dealer', rsp: 'RSP', promo: 'ราคาเฉลี่ยรวม Promotion' },
        source: 'ที่มา',
        actual: 'Actual (ยอดขายจริง)',
        override: 'Override (ค่าระบบ {value})',
        promo: 'Promo {days}/{total} วัน (ราคาเฉลี่ย)',
        noGP: 'ไม่มี GP',
        lockReasons: {
          notListed: 'ไม่ได้ Listing',
          beforeStart: 'ก่อนเดือนเริ่มขาย',
          planned: 'Planned (ก่อนวันเริ่มขายใน Product Master)',
          discontinued: 'Discontinued (เลิกขายแล้ว)'
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
        wfAxis: 'แกนเริ่มที่ {value} ล้านบาท · ตัวเลขท้ายแท่ง = ส่วนต่างเทียบ L12M',
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
          manage: 'จัดการ'
        },
        aggregateRow: 'รวมทั้ง {channel}',
        aggregateRowTip: 'ดูเป้าหมายรายเดือนรวมทั้ง Channel (อ่านอย่างเดียว)',
        selectTip: 'คลิกเพื่อดูเป้าหมายรายเดือนของ {name}',
        monthlyStatus: 'เป้าหมายรายเดือน: {status}',
        remainingIn: 'คงเหลือใน {channel}',
        noUnits: 'ยังไม่มี {unit}',
        noUnitsHint: 'กด แก้ไข แล้ว + {unit} เพื่อเพิ่มจาก Account Master',
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
            pctOfTotal: '% ของ Total', growth: 'การเติบโต (%)', growthAmount: 'การเติบโต (บาท)', total: 'รวมทั้งปี (บาท)', remaining: 'คงเหลือรายเดือน (บาท)'
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
        title: 'รายการสินค้า',
        lead: ['ข้อมูลหลักของสินค้า ราคา และสถานะความครบถ้วนของข้อมูล'],
        kpi: { all: 'ทั้งหมด', active: 'Active', 'new': 'New', required: 'ขาดข้อมูลจำเป็น', recommended: 'ขาดข้อมูลที่ควรมี', unit: 'SKU', title: 'กดเพื่อกรองตาราง' },
        searchPlaceholder: 'ค้นหา TR Code / รหัสชั่วคราว / Internal Code / Barcode / ชื่อ',
        viewLabel: 'มุมมอง',
        views: { list: 'รายการ', group: 'จัดกลุ่ม' },
        filters: {
          status: 'Status', statusAll: 'ทุก Status', category: 'หมวดสินค้า', categoryAll: 'ทุกหมวดสินค้า',
          channel: 'Channel', channelAll: 'ทุก Channel', itemType: 'Item Type', itemTypeAll: 'ทุกประเภท',
          completeness: 'ความครบถ้วน', completenessAll: 'ทุกระดับ',
          // CR-20: สินค้าที่ Sales สร้างจากหน้าวางแผน SKU
          source: 'ที่มา', sourceAll: 'ทุกที่มา', sourceOptions: { product: 'ทีม Product', sales: 'จาก Sales' },
          fromSales: 'จาก Sales', fromSalesTip: 'คำขอจาก Sales · ผู้ขอ {by} · {date} · หน่วยขาย {units} · หมายเหตุ {note}',
          completenessOptions: { ok: 'ครบ', required: 'ขาดข้อมูลจำเป็น', recommended: 'ขาดข้อมูลที่ควรมี' }
        },
        statusAsOf: 'Status ณ {month}',
        columnsButton: 'เลือกคอลัมน์',
        columnsTitle: 'คอลัมน์เพิ่มเติม',
        exportCsv: 'ส่งออก CSV',
        compareErp: 'เปรียบเทียบกับ ERP',
        addSku: '+ เพิ่ม SKU',
        filterSummary: 'ตัวกรองที่ใช้: {list}',
        clearFilters: 'ล้างตัวกรอง',
        resultCount: 'แสดง {n} จาก {total} SKU',
        columns: {
          image: 'รูป', code: 'TR Code', name: 'ชื่อสินค้า', status: 'Status', categoryGroup: 'หมวดสินค้า',
          category: 'Category', subCategory: 'Sub Category', type: 'Type', series: 'Series', subSeries: 'Sub Series',
          rsp: 'RSP (บาท)', completeness: 'ความครบถ้วน', manage: 'จัดการ',
          internalCode: 'Internal Code', barcode: 'Barcode', itemType: 'Item Type', packSize: 'ขนาดบรรจุ', launchDate: 'วันเริ่มขาย',
          listedCount: 'Listing (หน่วยขาย)', sellIn: 'ราคา Dealer {channel} (บาท)', updatedAt: 'แก้ไขล่าสุด'
        },
        groupHead: '{name} · {n} SKU',
        noSeries: '(ไม่ระบุ Series)',
        noSubSeries: '(ไม่ระบุ Sub Series)',
        empty: 'ไม่พบสินค้าตามตัวกรอง',
        viewDetail: 'ดูรายละเอียด',
        removeTitle: 'ลบ SKU',
        removeConfirm: 'ลบ {code} ออกจาก Product Master',
        removeBlocked: 'ลบได้เฉพาะ SKU ที่ยังไม่มี Listing ราคา Promotion หรือแผน NPD · ปิดการขายด้วยเดือนเลิกขายแทน',
        csvFile: 'Product-List_{date}',
        tabs: { general: 'ข้อมูลทั่วไป', price: 'ราคา', listing: 'Listing และวงจรสินค้า', history: 'ประวัติการแก้ไข' },
        edit: 'แก้ไข',
        completenessPct: 'ความครบถ้วน {pct}',
        general: {
          codes: 'รหัส', names: 'ชื่อสินค้า', category: 'หมวดสินค้า', series: 'Series', other: 'ประเภทและขนาดบรรจุ', image: 'รูปสินค้า',
          placeholder: 'เลือก', imageUpload: 'เลือกรูปจากเครื่อง', imageRemove: 'ลบรูป',
          imageNote: 'ระบบย่อรูปให้ด้านยาวไม่เกิน {px}px ก่อนเก็บ (ไม่เก็บไฟล์ต้นฉบับ)', imageError: 'อ่านไฟล์รูปไม่ได้',
          useTemp: 'ใช้รหัสชั่วคราว', tempNote: 'ระบบสร้างรหัสรูปแบบ NPD_{ปี}Q{ไตรมาส}_{ลำดับ} ตามวันเริ่มขาย',
          tempHistory: 'รหัสชั่วคราวเดิม: {code}', note: 'หมายเหตุ'
        },
        bind: {
          button: 'ผูกรหัสจริง', label: 'TR Code จริง', title: 'ผูกรหัส {temp} กับ TR Code {code}',
          lines: ['ย้าย Listing ราคา Promotion แผน NPD และแผน SKU ทุกปีไปใช้ TR Code', 'เก็บรหัสชั่วคราวไว้เป็นประวัติ'],
          errors: { empty: 'กรุณากรอก TR Code', duplicate: 'มี TR Code นี้แล้ว', notFound: 'ไม่พบรหัสชั่วคราวนี้' },
          editingHint: 'บันทึกหรือยกเลิกการแก้ไขก่อนผูกรหัสจริง'
        },
        price: {
          historyTitle: 'ประวัติราคา', noPrice: 'ยังไม่มีราคา',
          columns: { type: 'ประเภท', channel: 'Channel', from: 'วันที่มีผล', to: 'ถึง', price: 'ราคา (บาท)', by: 'ผู้แก้ไข' },
          types: { RSP: 'RSP', SELL_IN: 'ราคา Dealer' }, allChannels: 'ทุก Channel', accountOnly: 'เฉพาะ {unit}', open: 'ปัจจุบัน',
          add: '+ ราคาใหม่', addTitle: 'เพิ่มราคาใหม่ (ราคาเดิมปิดช่วงให้อัตโนมัติ)', addSubmit: 'เพิ่มราคา',
          errors: { price: 'ราคาต้องมากกว่า 0', date: 'วันที่มีผลต้องหลังราคาเดิมทุกรายการ' },
          promosTitle: 'Promotion ที่เกี่ยวข้อง', promosEmpty: 'ยังไม่มี Promotion ของ SKU นี้', promoLink: 'เปิดหน้า Promotion Price',
          accountTitle: 'ราคาต่อ Account (รวม VAT ราคาเดียวทั้งปี)', accountEmpty: 'ยังไม่มีราคาต่อ Account · ทุก Account ใช้ RSP',
          accountLine: '{unit}: {price} บาท{diff}', vsRsp: 'เทียบ RSP {rsp}', accountLink: 'เปิดหน้าราคาขายต่อ Account',
          promoLine: '{name} · {dates} · {value} · {status}'
        },
        listing: {
          launch: 'วันเริ่มขาย', listedTitle: 'หน่วยขายที่ Listing ({n})', listedEmpty: 'ยังไม่ได้ Listing',
          listingLink: 'แก้ไข Listing ที่หน้า Listing และวันเริ่มขาย', clearance: 'Clearance', clearanceNone: 'ไม่มี',
          clearanceText: '{from} – {to} · Stock {stock} ชิ้น', discontinue: 'เดือนเลิกขาย', discontinueNone: 'ยังขายอยู่',
          timelineTitle: 'Status ปี {year}', npdLink: 'แผน NPD: {stage} · {status}', npdLinkStage: 'แผน NPD: {stage}'
        },
        history: { columns: { at: 'วันเวลา', by: 'ผู้แก้ไข', field: 'ฟิลด์', change: 'ค่าเดิม → ค่าใหม่' }, empty: 'ยังไม่มีประวัติการแก้ไข', imageYes: 'มีรูป', imageNo: 'ไม่มีรูป' },
        create: { title: 'เพิ่ม SKU ใหม่', submit: 'เพิ่ม SKU', codeRequired: 'กรุณากรอก TR Code หรือเลือกใช้รหัสชั่วคราว', duplicate: 'มีรหัสนี้แล้ว', nameRequired: 'กรุณากรอกชื่อสินค้า', rspLabel: 'RSP (บาท)', rspFrom: 'RSP มีผลตั้งแต่' },
        erp: {
          title: 'เปรียบเทียบกับ ERP', note: 'เทียบกับข้อมูลตัวอย่าง (data/erp-snapshot.js) เฉพาะสินค้าที่มี TR Code',
          groups: { onlyErp: 'มีใน ERP แต่ไม่มีใน Master', onlyMaster: 'มีใน Master แต่ไม่มีใน ERP', mismatches: 'ฟิลด์ไม่ตรงกัน' },
          fields: { name: 'ชื่อ', barcode: 'Barcode', rsp: 'RSP' }, master: 'Master', erpValue: 'ERP',
          use: 'ใช้ค่าจาก ERP', useHint: 'ใช้ค่าจาก ERP ได้ในโหมดแก้ไข', none: 'ไม่มีรายการ', applied: 'ใช้ค่าจาก ERP แล้ว (ยังไม่บันทึก)'
        }
      },

      // Product Master · แผน NPD (modules/npd-plan)
      npdPlan: {
        title: 'แผนการเปิดตัวสินค้าใหม่ (NPD)',
        lead: ['กำหนดการเปิดตัวสินค้าใหม่ตาม Series และหน่วยขายที่วางแผนจำหน่าย'],
        kpi: { inYear: 'NPD ในปี {year}', bySeries: 'ตาม Series', pending: 'ยังไม่อนุมัติ', missing: 'หน่วยขายที่วางแผนแล้วแต่ยังไม่อยู่ในแผน SKU' },
        viewLabel: 'มุมมอง',
        views: { timeline: 'Timeline', table: 'ตาราง' },
        yearPrev: 'ปีก่อนหน้า', yearNext: 'ปีถัดไป', yearLabel: 'ปี {year}',
        stages: { plan: 'วางแผน', concept: 'สรุปแนวคิด', production: 'เตรียมผลิต', ready: 'พร้อมขาย', launched: 'เปิดตัวแล้ว' },
        stageAuto: 'ระบบตั้งให้เมื่อถึงวันเปิดตัว',
        // CR-20: สินค้าที่ Sales สร้างจากหน้าวางแผน SKU
        requests: {
          title: 'คำขอจาก Sales ({n})',
          lead: 'สร้างจากหน้าวางแผน SKU ใช้วางแผนได้ทันทีด้วยรหัสชั่วคราว · เติมข้อมูลที่รายการสินค้า (ตัวกรอง ที่มา: จาก Sales) และผูกรหัสจริงได้ตามเดิม',
          empty: 'ยังไม่มีคำขอจาก Sales ในปีนี้',
          columns: { sku: 'SKU', by: 'ผู้ขอ', units: 'หน่วยขาย', start: 'เดือนเริ่มขาย', price: 'ราคาที่ Sales กรอก (บาท)', note: 'หมายเหตุ', data: 'ข้อมูลสินค้า' },
          complete: 'ข้อมูลครบ', missing: 'ขาดข้อมูลจำเป็น {n} รายการ'
        },
        columns: { sku: 'SKU', series: 'Series', stage: 'ขั้น', launch: 'วันเปิดตัวตามแผน', accounts: 'หน่วยขายที่วางแผน', inPlan: 'อยู่ในแผน SKU แล้ว', approval: 'สถานะอนุมัติ' },
        accountsCount: '{n} หน่วย',
        inPlanText: '{x} / {y}',
        pin: 'เปิดตัว {date}',
        newBand: 'ช่วง New 3 เดือน',
        empty: 'ไม่มีแผน NPD ที่เปิดตัวในปีนี้',
        create: '+ สร้างแผน NPD',
        createTitle: 'สร้างแผน NPD',
        pickSku: 'SKU ที่ยังไม่มีแผน NPD',
        pickPlaceholder: 'เลือก SKU',
        orNew: 'หรือสร้าง SKU ใหม่ด้วยรหัสชั่วคราว',
        newName: 'ชื่อสินค้าใหม่',
        newSubmit: 'สร้าง SKU และแผน NPD',
        createSubmit: 'สร้างแผน NPD',
        nameRequired: 'กรุณาเลือก SKU หรือกรอกชื่อสินค้าใหม่',
        drawerTitle: 'แผน NPD · {name}',
        workflowTitle: 'แผน NPD ของ {name}',
        fields: { product: 'SKU', series: 'Series', stage: 'ขั้น', launch: 'วันเปิดตัวตามแผน', accounts: 'หน่วยขายที่วางแผนและเดือนเริ่มขาย', note: 'หมายเหตุ' },
        addAccount: '+ หน่วยขาย',
        startMonth: 'เดือนเริ่มขาย',
        removeAccount: 'นำหน่วยขายออกจากแผน NPD',
        noAccounts: 'ยังไม่มีหน่วยขายที่วางแผน',
        inSkuPlan: 'อยู่ในแผน SKU แล้ว',
        notInSkuPlan: 'ยังไม่อยู่ในแผน SKU',
        openSkuPlan: 'เปิดหน้า SKU Planning ของ {unit}',
        productLink: 'เปิดรายละเอียดสินค้า',
        approvedEffect: 'อนุมัติแล้ว: ตั้งวันเริ่มขายและ Listing ให้อัตโนมัติ และเดือนเริ่มขายเป็นค่าตั้งต้นในหน้า SKU Planning',
        // CR-17 ปิด npdApproval
        saveEffect: 'บันทึกแล้วมีผลทันที: แผนที่มีวันเปิดตัวและหน่วยขายจะตั้งวันเริ่มขายและ Listing ให้ และเดือนเริ่มขายเป็นค่าตั้งต้นในหน้า SKU Planning',
        launchMovedNote: 'เลื่อนวันเปิดตัวหลังอนุมัติ: แผนกลับเป็นฉบับร่าง และแผน SKU ที่อนุมัติแล้วของหน่วยขายที่วางแผนเป็น "ต้องตรวจสอบใหม่"',
        summaryLines: { launch: 'วันเปิดตัว {date}', accounts: 'หน่วยขายที่วางแผน {n} หน่วย', stage: 'ขั้น {stage}' },
        editHint: 'กดแก้ไขที่หัวหน้าเพื่อแก้แผน NPD'
      },

      // Product Master · Promotion Price (modules/promotions)
      // CR-18: Flag promotionCalendar ปิด (ค่าตั้งต้น) = ราคาขายต่อ Account (accountPrices) / เปิด = ปฏิทิน Promotion รายเดือนเดิม (ข้อความด้านล่าง)
      promotionPrice: {
        title: PROMO_CALENDAR ? 'Promotion Price' : 'ราคาขายต่อ Account',
        short: PROMO_CALENDAR ? 'Promotion Price' : 'ราคาขายต่อ Account',
        lead: [PROMO_CALENDAR ? 'ราคาโปรโมชันราย SKU รายหน่วยขาย ตามช่วงเวลา' : 'ราคาขายรวม VAT ของแต่ละ Account ราคาเดียวทั้งปี ช่องว่างใช้ RSP'],
        accountPrices: {
          search: 'ค้นหา SKU',
          columns: { sku: 'SKU', rsp: 'RSP', rspTitle: 'RSP รวม VAT ณ 1 ม.ค. {year}' },
          legend: { rsp: 'ใช้ RSP', custom: 'ราคาต่อ Account (−x% เทียบ RSP)', unlisted: 'ไม่ได้ Listing', warn: 'ควรตรวจสอบ' },
          rspChange: '{price} ตั้งแต่ {month}',
          noChannels: 'แผนปีนี้ยังไม่มี Channel ที่แบ่งตาม Account',
          noUnits: 'Channel นี้ยังไม่มี {unit} ที่เปิดใช้งาน',
          noSkus: 'ไม่มี SKU ตามตัวกรอง',
          editHint: 'โหมดแก้ไข: กรอกราคารวม VAT ในช่อง · ลบค่า = ใช้ RSP · เลือกหลายช่อง (ลากหรือ Shift+คลิก) แล้วใช้เครื่องมือ · วางจาก Excel ได้ (ปัดเป็นบาทเต็ม) · Ctrl+Z ย้อนกลับ',
          baselineNote: 'ล็อก Baseline แล้ว: ราคาที่แก้มีผลกับ Forecast เท่านั้น Target Baseline ไม่เปลี่ยน',
          warnNote: 'มีราคาที่ควรตรวจสอบ {n} ช่อง (สูงกว่า RSP หรือต่ำกว่า RSP เกิน {pct}) · บันทึกได้ตามปกติ',
          warnings: { aboveRsp: 'ราคาสูงกว่า RSP', belowRsp: 'ราคาต่ำกว่า RSP เกิน 50%' },
          tools: {
            selected: 'เลือก {n} ช่อง', none: 'ยังไม่ได้เลือกช่อง',
            set: 'ตั้งราคา…', discount: 'ลด x% จาก RSP', rsp: 'ใช้ RSP',
            setTitle: 'ตั้งราคาต่อ Account', setLabel: 'ราคาขาย (รวม VAT)',
            discountTitle: 'ลดราคาจาก RSP', discountLabel: 'ส่วนลดจาก RSP',
            hint: 'ใช้กับ {n} ช่องที่เลือก (ข้ามช่องที่ไม่ได้ Listing)', invalid: 'กรุณากรอกตัวเลขมากกว่า 0'
          },
          tip: {
            rsp: 'RSP {price} บาท ณ 1 ม.ค. {year}', rspChange: 'RSP เปลี่ยนเป็น {price} บาท ตั้งแต่ {month}',
            account: 'ราคาต่อ Account {price} บาท', vsRsp: '{pct} เทียบ RSP {rsp} บาท', useRsp: 'ใช้ RSP {price} บาท',
            unlisted: 'ไม่ได้ Listing ใน {unit} · แก้ไม่ได้', year: 'ราคารวม VAT ใช้ทั้งปี {year}'
          }
        },
        viewLabel: 'มุมมอง',
        views: { calendar: 'ปฏิทินรายเดือน', list: 'รายการ' },
        accountsLabel: 'หน่วยขาย',
        accountsAll: 'ทุก {unit}',
        accountsSelected: '{n} หน่วย',
        search: 'ค้นหา SKU',
        legend: { rsp: 'ไม่มี Promotion (RSP)', promo: 'มี Promotion', partial: 'Promotion บางวัน', draft: 'ฉบับร่าง (ไม่นับในแผน)', multi: 'หลายราคา' },
        multiPrice: 'หลายราคา',
        cellTip: { month: '{sku} · {month}', rsp: 'RSP {rsp} บาท', price: 'ราคาที่มีผลเฉลี่ย {price} บาท', promo: '{name} · {days} วัน · {price} บาท', draft: 'ฉบับร่าง: {name} · {days} วัน (ไม่นับ)', unit: '{unit}: {price} บาท' },
        editHint: 'โหมดแก้ไข: คลิกช่องในปฏิทินเพื่อสร้าง Promotion ของเดือนนั้น',
        columns: { name: 'ชื่อ Promotion', sku: 'SKU', accounts: 'หน่วยขาย', dates: 'ช่วงวันที่', value: 'ราคา / ส่วนลด', gp: 'GP ช่วง Promotion', status: 'สถานะ', manage: 'จัดการ' },
        statuses: { DRAFT: 'ฉบับร่าง', CONFIRMED: 'ยืนยันแล้ว' },
        modes: { PRICE: 'ราคาโปรโมชัน', DISCOUNT_PCT: 'ส่วนลด %' },
        valueText: { PRICE: '{value} บาท', DISCOUNT_PCT: 'ลด {value}' },
        gpDefault: 'GP ปกติ',
        empty: 'ไม่มี Promotion ตามตัวกรอง',
        noSkus: 'ไม่มี SKU ตามตัวกรอง',
        add: '+ สร้าง Promotion',
        editButton: 'แก้ไข',
        baselineNote: 'ล็อก Baseline แล้ว: Promotion ที่เพิ่มหรือแก้ไขมีผลกับ Forecast เท่านั้น Target Baseline ไม่เปลี่ยน',
        form: {
          newTitle: 'สร้าง Promotion', editTitle: 'แก้ไข Promotion', name: 'ชื่อ Promotion', skus: 'SKU', skusAll: 'เลือก SKU',
          skusSelected: '{n} SKU', accounts: 'หน่วยขาย', start: 'วันที่เริ่ม', end: 'วันที่สิ้นสุด', mode: 'รูปแบบ', value: 'ค่า',
          valueSuffix: { PRICE: 'บาท', DISCOUNT_PCT: '%' }, gp: 'GP ช่วง Promotion (%)', gpNote: 'ไม่บังคับ (ว่าง = GP ปกติของหน่วยขาย)',
          status: 'สถานะ', preview: 'ตัวอย่าง: {sku} ราคาหลังคำนวณ {price} บาท (RSP {rsp} · {pct})', previewNone: 'เลือก SKU และหน่วยขายเพื่อดูตัวอย่างราคา',
          save: 'ใช้ค่านี้', selectSeries: 'ทั้ง Series {name}', previewMore: 'และอีก {n} SKU',
          existingTitle: 'Promotion ที่มีอยู่ของ SKU นี้', copyApply: 'คัดลอก', remove: 'ลบ Promotion', copyNext: 'คัดลอกไปเดือนถัดไป', copyAccounts: 'คัดลอกไปหน่วยขายอื่น',
          copyAccountsTitle: 'เลือกหน่วยขายที่ต้องการคัดลอก', copied: 'คัดลอกแล้ว {n} รายการ',
          nameRequired: 'กรุณากรอกชื่อ Promotion', skusRequired: 'กรุณาเลือก SKU อย่างน้อย 1 รายการ',
          errors: { dates: 'วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด', accounts: 'กรุณาเลือกหน่วยขายอย่างน้อย 1 หน่วย', price: 'ราคาโปรโมชันต้องมากกว่า 0', overlap: '{sku} ซ้อนกับ Promotion: {names}' },
          warnAboveRsp: 'ราคาโปรโมชันของ {sku} สูงกว่า RSP'
        },
        removeConfirm: 'ลบ Promotion {name} ({sku})'
      },

      // Product Master · Listing และวันเริ่มขาย (modules/product-master)
      productMaster: {
        title: 'Listing และวันเริ่มขาย',
        lead: ['กำหนดหน่วยขายที่จำหน่ายสินค้าได้ และช่วง Clearance'],
        searchPlaceholder: 'ค้นหา SKU ชื่อ หรือ Series',
        statusFilter: 'Status',
        statusAll: 'ทุก Status',
        itemTypeFilter: 'Item Type',
        itemTypeAll: 'ทุกประเภท',
        columns: { sku: 'SKU / ชื่อ / Series', launch: 'วันเริ่มขาย', status: 'Status {year}', listing: 'Listing ต่อ {unit} · {channel}', clearance: 'Clearance', discontinue: 'เลิกขาย' },
        clearanceOwner: 'Supply Chain',
        clearanceFrom: 'ตั้งแต่',
        clearanceTo: 'ถึง',
        clearanceStock: 'Stock (ชิ้น)',
        clearanceStockNote: 'Prototype แบ่ง Stock เท่ากันทุกหน่วยขายที่ Listing',
        clearanceNone: '–',
        clearanceText: '{from}–{to} · {stock}',
        clearanceEdit: 'แก้ไข Clearance',
        clearanceTitle: 'Clearance · {sku}',
        clearanceSave: 'ใช้ค่านี้',
        clearanceClear: 'ไม่มี Clearance',
        clearanceError: 'กรุณาระบุเดือนเริ่มและเดือนสิ้นสุด (เดือนสิ้นสุดต้องไม่ก่อนเดือนเริ่ม)',
        discontinueNone: 'ยังขายอยู่',
        listedMark: '✓',
        bySales: 'Listing โดย Sales',
        bySalesTip: 'Listing โดย Sales · {unit} · เพิ่มโดย {by} · {date} · เริ่มขาย {from} · ทีม Product ตรวจสอบได้ที่นี่',
        selectRow: 'เลือกทั้งแถว',
        selectColumn: 'เลือกทั้งคอลัมน์ {unit} (เฉพาะแถวที่แสดง)',
        noMatch: 'ไม่พบ SKU ตามเงื่อนไข',
        noUnits: 'Channel นี้ยังไม่มีหน่วยขายใน Master',
        listedCount: 'Listing {n} หน่วย',
        roleHint: { product: 'ทีม Product: แก้ไข Listing', supply: 'Supply Chain: แก้ไข Clearance' },
        launchHint: 'แก้ไขวันเริ่มขายได้ที่รายการสินค้าหรือแผน NPD'
      },

      // Product Master · หมวดสินค้าและ Series (modules/taxonomy)
      // CR-15: มุมมองแบบคอลัมน์ (Category → Sub Category → Type | Series → Sub Series) + แผงรายละเอียด + ตัวกรอง + ตารางไขว้
      taxonomy: {
        title: 'หมวดสินค้าและ Series',
        lead: ['รายการหมวดสินค้าและ Series ที่ใช้อ้างอิงในข้อมูลสินค้า'],
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
        warn: { dupParent: 'ชื่อซ้ำกับรายการแม่ ({parent})', childDup: 'มีรายการย่อยชื่อเดียวกัน ({name})', noSku: 'ยังไม่มี SKU ใช้รายการนี้', expired: 'Series สิ้นสุดแล้ว ({date})' },
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
        data: { label: 'ข้อมูล', all: 'ทั้งหมด', noSku: 'ไม่มี SKU', dupParent: 'ชื่อซ้ำกับระดับบน', expired: 'Series สิ้นสุดแล้ว' },
        showZero: 'แสดงรายการที่ไม่มี SKU ตามตัวกรอง',
        chipStatus: 'สถานะ: {v}',
        chipData: 'ข้อมูล: {v}',
        detail: {
          empty: 'เลือกรายการเพื่อดูรายละเอียด',
          status: 'สถานะ', active: 'ใช้งานอยู่', inactive: 'ปิดใช้งาน', switchTip: 'เปิดหรือปิดใช้งาน',
          skuCount: 'SKU {n} รายการ', skuFiltered: 'ตามตัวกรอง {n} รายการ', skuMore: 'และอีก {n} รายการ', noSku: 'ยังไม่มี SKU ใช้รายการนี้',
          openProducts: 'ดูทั้งหมดในรายการสินค้า ›',
          period: 'ช่วงเวลาของ Series', start: 'วันเริ่ม', end: 'วันสิ้นสุด', noDate: 'ไม่กำหนด', periodNote: 'ไม่บังคับ · ใช้กับ Series คอลแลบ',
          warnings: 'คำเตือน', close: 'ปิดแผงรายละเอียด', label: 'รายละเอียด'
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
          accountPrice: 'ราคาต่อ Account ({unit})', dealer: 'ราคา Dealer', status: 'Status ปี {year}'
        },
        // CR-11: แถบเครื่องมือตาราง (แถวที่ 2)
        searchPlaceholder: 'ค้นหา SKU / ชื่อ',
        searchLabel: 'ค้นหา SKU หรือชื่อสินค้า',
        searchEmpty: 'ไม่พบ SKU ที่ตรงกับคำค้น',
        groupLabel: 'จัดกลุ่ม',
        groupBy: { series: 'Series', status: 'Status', none: 'ไม่จัดกลุ่ม' },
        collapseAll: 'พับทั้งหมด',
        expandAll: 'กางทั้งหมด',
        sortLabel: 'เรียง',
        sorts: { total: 'ยอดทั้งปีมากไปน้อย', code: 'TR Code', name: 'ชื่อ', growth: 'การเติบโต' },
        // CR-24: ยอดอ้างอิง = ยอดจริงล่าสุดของแต่ละเดือน · คอลัมน์ L12M = ผลรวมยอดอ้างอิง 12 เดือน
        showLastYear: 'แสดงยอดอ้างอิง',
        showLastYearTip: 'แสดงยอดอ้างอิงของเดือนนั้นใต้ตัวเลข และคอลัมน์ L12M / การเติบโต',
        lyColumn: 'L12M',
        lyColumnTip: 'ยอดขาย L12M ({range}) ของ SKU ในแผน = ผลรวมยอดอ้างอิง 12 เดือน (ไม่รวม SKU ที่ไม่อยู่ในแผน)',
        growthColumn: 'การเติบโต',
        groupRows: { active: 'สินค้าที่วางขายแล้ว', 'new': 'สินค้าใหม่ (New) ปี {year}', clearance: 'Clearance', discontinued: 'เลิกขายระหว่างปี', all: 'ทุก SKU', noSeries: '(ไม่ระบุ Series)' },
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
        remHint: 'ขาด {amount} ล้านบาท · ปรับจำนวน หรือเพิ่ม NPD',
        remHintSmall: 'ขาด {amount} บาท · ปรับจำนวน หรือเพิ่ม NPD',
        // CR-20: + เพิ่ม SKU จาก Product Master (Drawer)
        addDrawer: {
          title: 'เพิ่ม SKU ในแผน · {unit}',
          lead: 'เลือกจาก Product Master · SKU ที่ยังไม่ได้ Listing ระบบสร้าง Listing ให้เมื่อบันทึกแผน (Listing โดย Sales ทีม Product ตรวจสอบภายหลัง)',
          month: 'เดือนเริ่มขาย',
          groups: { listed: 'Listing แล้วใน {unit}', unlisted: 'ยังไม่ได้ Listing' },
          unlistedNote: 'เลือกแล้วระบบสร้าง Listing ให้หน่วยขายนี้ตั้งแต่เดือนเริ่มขายที่เลือก',
          selectAll: 'เลือกทั้งหมดในกลุ่ม {group}',
          selected: 'เลือก {n} รายการ',
          confirm: 'เพิ่ม {n} SKU'
        },
        fromSales: 'จาก Sales',
        // CR-20: + สร้าง NPD (Sales Manager / Officer ของ Channel)
        npdForm: {
          button: '+ สร้าง NPD',
          title: 'สร้าง NPD · {unit}',
          lead: 'บันทึกแล้วใช้วางแผนได้ทันทีด้วยรหัสชั่วคราว · ทีม Product เติมข้อมูลและผูกรหัสจริงภายหลัง',
          fields: { name: 'ชื่อสินค้า (ชั่วคราว)', series: 'Series', category: 'หมวดสินค้า', price: 'ราคาขายที่ {unit} (รวม VAT)', month: 'เดือนเริ่มขาย',
            units: 'หน่วยขายอื่นใน {channel} ที่จะขาย', note: 'หมายเหตุถึงทีม Product' },
          seriesPlaceholder: 'เลือก Series', seriesNone: 'ยังไม่ระบุ', categoryPlaceholder: 'ยังไม่ระบุ',
          noOtherUnits: 'ไม่มีหน่วยขายอื่นในแผนของ Channel นี้',
          hint: '* = ต้องกรอก · ราคาบันทึกเป็นราคาต่อ Account ของหน่วยขายนี้ และใช้เป็น RSP ชั่วคราว · เดือนก่อนเดือนเริ่มขายล็อก 0',
          save: 'บันทึก NPD', cancel: 'ยกเลิก',
          errors: { name: 'กรุณากรอกชื่อสินค้า', series: 'กรุณาเลือก Series (หรือเลือก ยังไม่ระบุ)', price: 'ราคาขายต้องมากกว่า 0', month: 'กรุณาเลือกเดือนเริ่มขายในปีแผน' }
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
            price: 'ราคาขาย (รวม VAT)', priceSource: 'ที่มาของราคา', sale: 'Sale Amount ทั้งปี (บาท)', gp: '{gpLabel} %', net: 'Net Sales ทั้งปี (บาท)' },
          priceVaries: 'ราคาเปลี่ยนระหว่างปี (ราคาเฉลี่ย)',
          rowTypes: { sku: 'SKU', planUnits: 'รวมแผน (ชิ้น)', planMoney: 'รวมแผน {money} (บาท)', target: 'เป้าหมาย {money} (บาท)', remaining: 'คงเหลือ (ค่าบวก = ขาด ค่าลบ = เกิน)' }
        },
        modes: { initial: 'สร้างแผนครั้งแรก', reforecast: 'ปรับแผน (Re-forecast)' },
        reforecastLocked: 'ใช้งานได้หลังจากล็อก Baseline',
        noGP: 'ไม่มี GP',
        currentMonthLabel: 'เดือนปัจจุบัน (จำลอง)',
        skuColumn: 'SKU',
        totalColumn: 'ทั้งปี',
        groups: { selling: 'สินค้าที่วางขายแล้ว', npd: 'สินค้าใหม่ (New) ปี {year}' },
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
        startMonthLabel: 'เริ่มขาย',
        startMonthInvalid: 'เลือกเดือนก่อนวันเริ่มขายใน Product Master ไม่ได้',
        addSku: '+ เพิ่ม SKU',
        addNpd: '+ เพิ่มสินค้าใหม่',
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
        resetRowTitle: 'คืนค่าระบบเติมและ Clearance ของแถวนี้ (ล้าง Override)',
        cellReasons: { locked: 'ล็อก 0', actual: 'Actual', frozen: 'ล็อก (M+1 ถึง M+3)', open: 'ปรับได้' },
        legend: { override: 'Override', actual: 'Actual', frozen: 'ล็อก M+1–M+3', promo: 'มี Promo บางวัน', dirty: 'ยังไม่บันทึก', anomaly: 'ต่างจากยอดอ้างอิงเกิน ±{pct}',
          estimated: 'ยอดอ้างอิงเป็นประมาณการ (ไม่มียอดจริงเดือนนี้)' },
        sellOutNote: 'Sale Amount รวม VAT · เป้าหมาย = Net Sales ÷ (1 − GP) × 1.07',
        summaryLines: { plan: 'แผนทั้งปี {plan} บาท', target: 'เป้าหมายทั้งปี {target} บาท', remaining: 'คงเหลือ: {remaining}', skus: '{n} SKU ในแผน' }
      },

      // Account Master (workflowBar แบบง่าย)
      accounts: {
        title: 'Account',
        lead: ['ข้อมูล Account และ GP / Platform Fee ต่อ Account (ค่าเดียวทั้งปี)'],
        filterAll: 'ทุก Channel',
        gpColumn: '{label} %',
        columns: { name: 'ชื่อ Account', channel: 'Channel', gp: 'GP % / Platform Fee %', active: 'การใช้งาน', owner: 'ผู้รับผิดชอบปัจจุบัน', inPlan: 'แผนปี {year}', manage: 'จัดการ' },
        noGP: 'Channel นี้ไม่หัก GP',
        gpMissing: 'ยังไม่กำหนด',
        gpMissingText: 'ยังไม่ได้กำหนด {label}',
        activeYes: 'ใช้งาน',
        activeNo: 'ปิดใช้งาน',
        inPlanYes: 'อยู่ในแผน',
        addButton: '+ เพิ่ม Account',
        addTitle: 'เพิ่ม Account ใหม่',
        addFields: { name: 'ชื่อ Account', channel: 'Channel', gp: 'GP % / Platform Fee %' },
        addSubmit: 'เพิ่ม',
        addCancel: 'ยกเลิก',
        addErrorRequired: 'กรุณากรอกชื่อ Account',
        addErrorDuplicate: 'มี Account ชื่อนี้ใน Channel นี้แล้ว',
        empty: 'ไม่มี Account ใน Channel นี้',
        ownerHint: 'กำหนดผู้รับผิดชอบที่หน้าผู้รับผิดชอบ',
        removeTitle: 'ลบ Account',
        removeConfirm: 'ลบ {name} ออกจาก Account Master',
        removeBlocked: 'Account นี้อยู่ในแผน มียอดขายย้อนหลัง หรือมีประวัติผู้รับผิดชอบ ให้ปิดใช้งานแทนการลบ'
      },

      // CR-16: หน้าเขตการขายและร้านค้า (แทนหน้าเขตการขายเดิม) — ร้านค้า → เขตการขาย → ผู้รับผิดชอบ ตามช่วงเดือน
      territories: {
        title: 'เขตการขายและร้านค้า ({territoryChannels})',
        short: 'เขตการขายและร้านค้า ({territoryChannels})',
        titleTip: 'เขตการขาย = กลุ่มร้านค้า · จังหวัดใช้แนะนำเขตเท่านั้น',
        lead: ['จัดสรรร้านค้า {territoryChannelsFull} ให้แต่ละเขตการขายและผู้รับผิดชอบ'],
        empty: 'ยังไม่มีข้อมูลร้านค้าของ Channel ที่แบ่งเป้าตามเขต',
        month: { label: 'ข้อมูล ณ เดือน', tip: 'ตัวเลขและการจัดสรรทั้งหน้าแสดงตามเดือนที่เลือก', current: 'เดือนปัจจุบัน' },
        summary: {
          stores: 'ร้านค้า {n}', active: 'ใช้งาน {n}', unassigned: 'ยังไม่จัดสรร {n}', outside: 'อยู่นอกจังหวัดของเขต {n}', noProvince: 'ไม่ระบุจังหวัด {n}',
          unassignedTip: 'ร้านที่ยังไม่อยู่ในเขตใดในเดือนนี้ · กดเพื่อดูรายการ',
          outsideTip: 'ร้านที่จังหวัดไม่อยู่ในรายชื่อจังหวัดแนะนำของเขตที่ร้านอยู่ · กดเพื่อกรอง',
          noProvinceTip: 'ร้านที่ไม่มีจังหวัดในข้อมูลต้นทาง · กดเพื่อกรอง', activeTip: 'ร้านที่สถานะใช้งาน'
        },
        panel: {
          title: 'เขตการขาย', all: 'ทั้งหมด', unassigned: 'ยังไม่จัดสรร', noOwner: 'ไม่มีผู้รับผิดชอบ',
          count: '{n} ร้าน', share: '{pct}', shareTip: 'สัดส่วนยอดอ้างอิงใน {channel} (ร้านทุกสถานะในเขต ณ เดือนที่เลือก)',
          countTip: 'จำนวนร้านตามตัวกรองสถานะ ({status})',
          until: '{name} ถึง {month}', from: '{name} ตั้งแต่ {month}', inactive: 'ปิดใช้งาน',
          more: 'จัดการเขต', transfer: 'โอนทั้งเขต…', provinces: 'แก้จังหวัดแนะนำ…', rename: 'เปลี่ยนชื่อ', deactivate: 'ปิดใช้งาน', activate: 'เปิดใช้งาน',
          deactivateBlocked: 'ปิดใช้งานได้เฉพาะเขตที่ไม่มีร้าน', add: '+ เพิ่มเขต', dropHint: 'ลากร้านมาวางบนเขตเพื่อย้าย',
          ownerNote: 'ผู้รับผิดชอบของทุก Channel อยู่ที่หน้าผู้รับผิดชอบ · โอนทั้งเขตในหน้านี้ใช้ข้อมูลชุดเดียวกัน'
        },
        tableTitle: { all: 'ร้านค้าทั้งหมด', unassigned: 'ร้านค้าที่ยังไม่จัดสรร', territory: 'ร้านค้าใน: {name}' },
        search: 'ค้นหา System ID / ชื่อร้าน',
        filters: {
          storeType: 'ประเภทร้าน', priceType: 'ประเภทราคา', province: 'จังหวัด', status: 'สถานะ', channels: 'Export/Online', data: 'ข้อมูล',
          all: 'ทั้งหมด', selected: '{n} รายการ', clear: 'ล้าง', empty: 'ไม่พบรายการ', find: 'ค้นหา', none: 'ไม่ระบุ',
          statusOptions: { active: 'ใช้งาน', cancelled: 'ยกเลิกการขาย', all: 'ทั้งหมด' },
          channelOptions: { export: 'Export', online: 'Online' },
          dataOptions: { outside: 'อยู่นอกจังหวัดของเขต', noProvince: 'ไม่ระบุจังหวัด', moved: 'ย้ายเขตในปีนี้' },
          chipSearch: 'ค้นหา: {q}', chip: '{label}: {value}'
        },
        columns: {
          select: 'เลือก', selectAll: 'เลือกทั้งหมดตามตัวกรอง', id: 'System ID', name: 'ชื่อร้าน', storeType: 'ประเภทร้าน', priceType: 'ประเภทราคา',
          province: 'จังหวัด', export: 'Export', online: 'Online', status: 'สถานะ', salesRef: 'ยอดอ้างอิง (บาท)', territory: 'เขตการขาย',
          owner: 'ผู้รับผิดชอบ', suggested: 'เขตแนะนำ'
        },
        tips: {
          salesRef: 'ยอดอ้างอิงปี {year} ของร้าน · ยอดขายของเขต (ใช้คำนวณ L12M) = ผลรวมยอดอ้างอิงของร้านที่อยู่ในเขต ณ เดือนแรกของปีแผน',
          suggested: 'เขตที่จังหวัดของร้านอยู่ในรายชื่อจังหวัดแนะนำ (แสดงเมื่อต่างจากเขตปัจจุบัน หรือยังไม่จัดสรร) · จังหวัดที่อยู่หลายเขตหรือไม่ระบุ = –',
          export: 'ร้านที่ขายส่งออก', online: 'ร้านที่ขายออนไลน์', has: 'มี',
          masked: 'ชื่อบุคคลธรรมดา · ซ่อนเพื่อคุ้มครองข้อมูลส่วนบุคคล',
          duplicate: 'ID ซ้ำ', duplicateTip: 'System ID นี้มี {n} แถวในไฟล์ต้นทาง · ยอดอ้างอิงนับแยกแต่ละแถว',
          outside: 'นอกจังหวัด', outsideTip: 'จังหวัดของร้านไม่อยู่ในรายชื่อจังหวัดแนะนำของ {territory}', sort: 'เรียงตาม{name}'
        },
        status: { active: 'ใช้งาน', cancelled: 'ยกเลิกการขาย' },
        unassignedCell: 'ยังไม่จัดสรร',
        footer: '{n} ร้าน · ยอดอ้างอิงรวม {amount} บาท',
        emptyRows: 'ไม่มีร้านค้าตามตัวกรอง',
        clearFilters: 'ล้างตัวกรอง',
        selection: {
          text: 'เลือก {n} ร้าน · ยอดอ้างอิง {amount} ล้านบาท', move: 'ย้ายไปเขต…', unassign: 'นำออกจากเขต', suggest: 'จัดสรรตามเขตแนะนำ',
          clear: 'ยกเลิกการเลือก', noneAssigned: 'ร้านที่เลือกยังไม่อยู่ในเขตใด', noneSuggested: 'ร้านที่เลือกไม่มีเขตแนะนำ'
        },
        move: {
          title: 'ย้ายร้านไปเขตอื่น', target: 'เขตปลายทาง', targetOption: '{name} · {owner}', fromMonth: 'มีผลตั้งแต่เดือน',
          count: '{n} ร้าน · ยอดอ้างอิงที่ย้าย {amount} บาท', fromTo: '{from} ({fromOwner}) → {to} ({toOwner}): {n} ร้าน',
          outside: 'อยู่นอกจังหวัดแนะนำของปลายทาง {n} ร้าน', noChange: 'ร้านที่เลือกอยู่ในเขตนี้แล้วตั้งแต่เดือนที่เลือก ไม่มีรายการที่เปลี่ยน',
          approved: 'เป้าหมายปี {year} อนุมัติแล้ว · การย้ายนี้ไม่เปลี่ยนเป้าหมายของเขต ยอดอ้างอิงที่ย้าย {amount} บาท',
          draftYear: 'เป้าหมายปี {year} ไม่เปลี่ยน · ยอดขาย L12M ของเขตคำนวณใหม่ตามร้านที่อยู่ในเขต ณ ม.ค. {year}',
          confirm: 'ย้าย', pastNote: 'เลือกได้ตั้งแต่เดือนปัจจุบัน ({month}) เป็นต้นไป'
        },
        unassign: {
          title: 'นำร้านออกจากเขต', text: 'ร้านจะเป็น "ยังไม่จัดสรร" ตั้งแต่เดือนที่เลือก', count: '{n} ร้าน · ยอดอ้างอิง {amount} บาท',
          from: 'จาก {from} ({owner}): {n} ร้าน', confirm: 'นำออกจากเขต'
        },
        suggest: {
          title: 'จัดสรรตามเขตแนะนำ', item: '{name} ({owner}): {n} ร้าน · ยอดอ้างอิง {amount} บาท',
          skipped: 'ไม่มีเขตแนะนำ {n} ร้าน (ไม่ระบุจังหวัด หรือจังหวัดอยู่หลายเขต) ร้านเหล่านี้ไม่ถูกจัดสรร', confirm: 'จัดสรร'
        },
        transfer: {
          title: 'โอนทั้งเขต: {name}', current: 'ผู้รับผิดชอบ ณ {month}: {name}', person: 'ผู้รับผิดชอบใหม่', fromMonth: 'มีผลตั้งแต่เดือน',
          note: 'ร้านค้าในเขตไม่ย้าย · เป้าหมายและยอดขายอยู่กับเขต ไม่เปลี่ยนตามคน', gap: 'เขตว่าง {from} – {to} เพราะ {name} ลาออก {month}',
          backdate: 'ให้ {name} รับผิดชอบย้อนหลังตั้งแต่ {month}', backdateNote: 'รับย้อนหลังได้เฉพาะเดือนที่ยังไม่ผ่าน',
          noPeople: 'ไม่มี Sales Person ที่ทำงานอยู่ใน Channel นี้ในเดือนที่เลือก', same: 'เลือกผู้รับผิดชอบคนใหม่ที่ไม่ใช่คนเดิม',
          confirm: 'โอนทั้งเขต', errors: { past: 'เลือกเดือนที่ผ่านไปแล้วไม่ได้', range: 'ช่วงเดือนไม่ถูกต้อง' }
        },
        provinces: {
          title: 'จังหวัดแนะนำ: {name}', hint: 'ใช้แนะนำเขตให้ร้านที่ยังไม่จัดสรร และเตือนร้านที่อยู่นอกจังหวัดของเขต ไม่ได้บังคับว่าร้านต้องอยู่เขตนี้',
          search: 'ค้นหาจังหวัด', also: 'อยู่ในรายชื่อของ {names} ด้วย', count: 'เลือกไว้ {n} จังหวัด', confirm: 'ใช้รายชื่อนี้'
        },
        rename: { title: 'เปลี่ยนชื่อเขต', label: 'ชื่อเขต', empty: 'กรุณากรอกชื่อเขต', duplicate: 'มีเขตชื่อนี้อยู่แล้ว' },
        add: { title: 'เพิ่มเขตการขาย', label: 'ชื่อเขต', hint: 'เขตใหม่ยังไม่มีร้าน ย้ายร้านเข้าเขตได้หลังเพิ่ม · เพิ่มเขตในแผนได้ที่หน้าจัดสรรเป้าหมายประจำปี' },
        deactivate: { title: 'ปิดใช้งาน {name}', lines: ['เขตที่ปิดใช้งานไม่แสดงในรายการเพิ่มหน่วยขายของหน้าจัดสรรเป้าหมายประจำปี', 'เปิดใช้งานใหม่ได้ภายหลัง'] },
        drawer: {
          label: 'รายละเอียดร้านค้า', info: 'ข้อมูลร้าน', history: 'ประวัติเขตและผู้รับผิดชอบรายเดือน', prevYear: 'ปีก่อนหน้า', nextYear: 'ปีถัดไป',
          fields: { id: 'System ID', storeType: 'ประเภทร้าน', tags: 'Tag', priceType: 'ประเภทราคา', province: 'จังหวัด', channels: 'Export / Online', status: 'สถานะ', salesRef: 'ยอดอ้างอิง (บาท)', suggested: 'เขตแนะนำ', territory: 'เขต ณ {month}' },
          rows: { territory: 'เขตการขาย', owner: 'ผู้รับผิดชอบ', ref: 'ยอดอ้างอิงรายเดือน (บาท)' },
          refNote: 'ยอดอ้างอิงรายเดือน = ยอดอ้างอิงทั้งปี × Seasonality ของ {channel} · ยอดของเดือนที่ร้านอยู่ในเขตนับเป็นผลงานของผู้รับผิดชอบเขตในเดือนนั้น',
          vacant: 'ว่าง', none: '–'
        },
        exportSheet: 'ร้านค้า', exportFile: 'Stores_{channel}_{month}_{date}',
        exportHeader: { month: 'ข้อมูล ณ เดือน', view: 'รายการ', filters: 'ตัวกรอง', noFilters: 'ไม่มี' },
        exportColumns: { outside: 'อยู่นอกจังหวัดของเขต', yes: 'ใช่' }
      },

      // CR-21: หน้าบทบาทและสิทธิ์ (modules/role-management) — ผู้ดูแลระบบ
      //   CR-25: แยก 3 หน้าในกลุ่ม Role Management — Permissions (id เดิม roleManagement · ข้อความที่ใช้ร่วมกันอยู่ที่นี่) · Roles (roleRoles) · Users (roleUsers)
      roleManagement: {
        title: 'Permissions',
        short: 'Permissions',
        titleTip: 'สิทธิ์ตามหน้า · สิทธิ์ใน Prototype ทำงานเฉพาะฝั่งหน้าจอ (ซ่อนปุ่มและเมนู) ระบบจริงต้องตรวจสิทธิ์ที่ Backend ด้วย',
        lead: ['กำหนดสิทธิ์การเข้าถึงแต่ละหน้าของแต่ละบทบาท (หน้าที่ ไม่เห็น ไม่แสดงในเมนูข้าง)'],
        limitNote: 'สิทธิ์ใน Prototype ทำงานเฉพาะฝั่งหน้าจอ (ซ่อนปุ่มและเมนู) ไม่ใช่การป้องกันข้อมูลจริง ระบบจริงต้องตรวจสิทธิ์ที่ Backend ด้วย',
        history: 'ประวัติการแก้ไข',
        historyEmpty: 'ยังไม่มีการแก้ไขสิทธิ์ บทบาท หรือผู้ใช้',
        historyLine: '{key} · {field}: {old} → {next}',
        matrix: {
          pageColumn: 'หน้า / สิทธิ์',
          globalGroup: 'ทุกหน้า',
          moduleFilter: 'Module', moduleAll: 'ทุก Module',
          roleFilter: 'บทบาท', roleAll: 'ทุกบทบาท', roleSelected: '{n} บทบาท',
          diffOnly: 'เฉพาะที่ต่างจากค่าตั้งต้น',
          resetAll: 'คืนค่าตั้งต้นทั้งตาราง',
          resetAllConfirm: 'คืนค่าตั้งต้นของสิทธิ์ทุกบทบาท',
          resetAllLine: 'สิทธิ์ของบทบาทตั้งต้นกลับเป็นค่าตั้งต้น · บทบาทที่สร้างเองกลับเป็น ดู ทุกหน้า',
          empty: 'ไม่มีรายการตามตัวกรอง',
          legend: 'จุดมุมช่อง = ต่างจากค่าตั้งต้น · ช่องเทาว่าง = ไม่เห็น',
          // CR-25: แถวสรุปใต้หัวคอลัมน์ (หน้าในเมนูข้างที่บทบาทเห็น ไม่นับเกี่ยวกับ Prototype)
          summary: 'เห็น {n} หน้า · แก้ไข {m} หน้า',
          summaryTip: 'หน้าในเมนูข้างที่บทบาท {role} เห็น (ไม่นับหน้าเกี่ยวกับ Prototype ที่ทุกบทบาทเห็น) · แก้ไข = แก้ได้อย่างน้อยบางส่วนของหน้า',
          cellTitle: '{role} · {res}',
          choices: { NONE: 'ไม่เห็น', VIEW: 'ดู', EDIT: 'แก้ไข', EDIT_ALL: 'แก้ไข · ทุก Channel', EDIT_TEAM: 'แก้ไข · เฉพาะทีม',
            ALLOW: '✓ อนุญาต', ALLOW_ALL: '✓ อนุญาต · ทุก Channel', ALLOW_TEAM: '✓ อนุญาต · เฉพาะทีม', DENY: '– ไม่อนุญาต' },
          columnMenu: 'คำสั่งของบทบาท {role}',
          setColumn: 'ตั้งทั้งคอลัมน์: {level}',
          resetColumn: 'คืนค่าตั้งต้นของบทบาทนี้',
          preview: 'ดูตัวอย่างในมุมมองนี้ (ไปหน้าเริ่มต้นของบทบาท)',
          previewNone: 'ยังไม่มีผู้ใช้ที่เปิดใช้งานในบทบาทนี้',
          moduleMenu: 'ตั้งทั้ง Module {group}',
          setModule: 'ตั้งทั้ง Module: {level} ({n} บทบาทที่แสดง)',
          adjusted: 'ปรับสิทธิ์ย่อยให้ไม่สูงกว่าหน้าหลัก: {items}',
          adjustedItem: '{res} ของ {role} เป็น {level}'
        },
        rolesTab: {
          columns: { order: 'ลำดับ', name: 'ชื่อ', description: 'คำอธิบาย', home: 'หน้าเริ่มต้น', users: 'จำนวนผู้ใช้', type: 'ประเภท', manage: 'จัดการ' },
          // CR-25: หน้าเริ่มต้นของบทบาท (index.html · สลับมุมมองผู้ใช้ · ดูตัวอย่าง) เลือกจากหน้าที่บทบาทนั้นเห็น
          homePick: 'หน้าเริ่มต้นของ {role}', homeAuto: 'อัตโนมัติ ({page})', homeNone: '–',
          homeTip: 'หน้าที่เปิดเมื่อเข้าเว็บหรือสลับเป็นบทบาทนี้ · ผู้ใช้หลายบทบาทใช้หน้าเริ่มต้นของบทบาทแรกตามลำดับ',
          types: { system: 'ตั้งต้น', custom: 'สร้างเอง' },
          add: '+ เพิ่มบทบาท', addTitle: 'เพิ่มบทบาท', name: 'ชื่อบทบาท', description: 'คำอธิบาย', copyFrom: 'คัดลอกสิทธิ์จาก…', copyNone: 'ไม่คัดลอก (ดู ทุกหน้า)',
          dragTitle: 'ลากเพื่อจัดลำดับ (ลำดับของคอลัมน์ในหน้า Permissions · ตัวเลือกมุมมองผู้ใช้ · หน้าเริ่มต้นของผู้ใช้หลายบทบาท)', up: 'เลื่อนขึ้น', down: 'เลื่อนลง',
          remove: 'ลบบทบาท', removeConfirm: 'ลบบทบาท {name}', removeBlocked: { system: 'บทบาทตั้งต้นลบไม่ได้ (แก้ชื่อและคำอธิบายได้)', hasUsers: 'บทบาทนี้มีผู้ใช้ เอาบทบาทออกจากผู้ใช้ก่อน' },
          usersCount: '{n} คน',
          errors: { name: 'กรุณากรอกชื่อบทบาท', duplicate: 'มีบทบาทชื่อนี้แล้ว' }
        },
        usersTab: {
          columns: { name: 'ชื่อ', roles: 'บทบาท', teams: 'ทีมขาย', status: 'สถานะ', manage: 'จัดการ' },
          search: 'ค้นหาชื่อ', roleFilter: 'บทบาท', roleAll: 'ทุกบทบาท', roleSelected: '{n} บทบาท',
          channelFilter: 'Channel ของทีม', channelAll: 'ทุก Channel', channelNone: 'ไม่อยู่ในทีม',
          statusFilter: 'สถานะ', statuses: { all: 'ทุกสถานะ', active: 'ใช้งาน', inactive: 'ปิดใช้งาน' },
          teamLine: '{channel} · {role}', noTeam: '–', noRoles: 'ยังไม่มีบทบาท',
          rolesPick: 'บทบาท', rolesPickAll: 'เลือกบทบาท', rolesPicked: '{n} บทบาท',
          activeLabel: 'ใช้งาน',
          add: '+ เพิ่มผู้ใช้', addTitle: 'เพิ่มผู้ใช้', source: 'ผู้ใช้', sourceSales: 'Sales Person Master', sourceOther: 'ผู้ใช้ที่ไม่ใช่ฝ่ายขาย',
          person: 'Sales Person', personPlaceholder: 'เลือก Sales Person', name: 'ชื่อผู้ใช้',
          errors: { person: 'กรุณาเลือก Sales Person', name: 'กรุณากรอกชื่อผู้ใช้', duplicate: 'Sales Person นี้เป็นผู้ใช้อยู่แล้ว', roles: 'กรุณาเลือกบทบาทอย่างน้อย 1 บทบาท' },
          empty: 'ไม่มีผู้ใช้ตามตัวกรอง',
          effectiveTitle: 'สิทธิ์ที่มีผลจริง · {name}',
          effectiveLead: 'รวมทุกบทบาทแบบสิทธิ์สูงสุด (แก้ไข > ดู > ไม่เห็น · ทุก Channel > เฉพาะทีม) · ผู้ใช้ที่ปิดใช้งาน = ไม่เห็นทุกหน้า',
          effectiveCols: { res: 'หน้า / สิทธิ์', level: 'สิทธิ์', from: 'ได้มาจากบทบาท' },
          inactiveNote: 'ผู้ใช้นี้ปิดใช้งานอยู่'
        },
        save: {
          summary: 'เปลี่ยน {cells} ช่อง ใน {roles} บทบาท · กระทบผู้ใช้ {users} คน',
          roleChanges: 'แก้ข้อมูลบทบาท {n} รายการ',
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
      // CR-25: หน้า Roles และ Users (ข้อความอื่นใช้ร่วมกับ pages.roleManagement)
      roleRoles: {
        title: 'Roles',
        short: 'Roles',
        titleTip: 'บทบาท · ชื่อ คำอธิบาย ลำดับ และหน้าเริ่มต้นของแต่ละบทบาท',
        lead: ['จัดการบทบาท ลำดับ และหน้าเริ่มต้นที่เปิดเมื่อเข้าเว็บหรือสลับเป็นบทบาทนั้น']
      },
      roleUsers: {
        title: 'Users',
        short: 'Users',
        titleTip: 'ผู้ใช้ · บทบาทของผู้ใช้ และสิทธิ์ที่มีผลจริง',
        lead: ['กำหนดบทบาทของผู้ใช้ และดูสิทธิ์ที่มีผลจริงของแต่ละคน (คลิกชื่อ)']
      },

      // CR-19: หน้าทีมขาย (modules/sales-team) — สมาชิกทีมต่อ Channel ใช้กำหนดสิทธิ์แก้ไขแผนยอดขายราย SKU
      salesTeam: {
        title: 'ทีมขาย',
        short: 'ทีมขาย',
        titleTip: 'Sales Manager และ Sales Officer ของแต่ละ Channel',
        lead: ['สมาชิกทีมขายของแต่ละ Channel ซึ่งใช้กำหนดสิทธิ์แก้ไขแผนยอดขายราย SKU'],
        note: 'สิทธิ์แก้ไขแผนยอดขายราย SKU มาจากสมาชิกทีม ณ เดือนปัจจุบัน ({month}) · ผู้รับผิดชอบรายหน่วยขายใช้แสดงผลและคำนวณผลงานรายคน',
        ownerLink: 'กำหนดผู้รับผิดชอบรายหน่วยขายที่หน้าผู้รับผิดชอบ',
        units: '{n} {unit}',
        roles: { MANAGER: 'Sales Manager', OFFICER: 'Sales Officer' },
        empty: 'ยังไม่มีสมาชิก',
        emptyTeam: 'ยังไม่มีทีมขาย · แผนยอดขายราย SKU ของ Channel นี้ยังไม่มีผู้แก้ไข',
        period: { since: 'ตั้งแต่ {from}', range: '{from} – {to}' },
        status: { ended: 'สิ้นสุดแล้ว', future: 'เริ่ม {from}' },
        add: '+ เพิ่มสมาชิก',
        addTitle: 'เพิ่มสมาชิกทีม {channel}',
        fields: { person: 'Sales Person', role: 'บทบาท', from: 'เดือนเริ่ม', to: 'เดือนสุดท้ายที่เป็นสมาชิก' },
        personPlaceholder: 'เลือก Sales Person',
        personHint: 'เลือกจาก Sales Person Master (คนที่ทำงานอยู่ในเดือนปัจจุบัน) · เริ่มได้ตั้งแต่เดือนปัจจุบัน',
        end: 'สิ้นสุดการเป็นสมาชิก',
        endTitle: 'สิ้นสุดการเป็นสมาชิกของ {name} · ทีม {channel}',
        endHint: 'เลือก {prev} = ไม่มีสิทธิ์แก้ไขตั้งแต่ {month} · แก้ไขเดือนที่ผ่านไปแล้วไม่ได้',
        remove: 'นำออกจากทีม',
        removeConfirm: 'นำ {name} ออกจากทีม {channel}',
        removeLine: 'เริ่มเป็นสมาชิก {from} ยังไม่มีเดือนที่ผ่านไปแล้ว จึงนำออกได้',
        errors: {
          person: 'กรุณาเลือก Sales Person', role: 'กรุณาเลือกบทบาท', past: 'แก้ไขเดือนที่ผ่านไปแล้วไม่ได้', range: 'เดือนสุดท้ายต้องไม่ก่อนเดือนเริ่ม',
          overlap: '{name} เป็นสมาชิกทีมนี้ในช่วงเดือนดังกล่าวอยู่แล้ว', notFound: 'ไม่พบสมาชิก', started: 'สมาชิกที่เริ่มแล้วให้ใช้สิ้นสุดการเป็นสมาชิก'
        }
      },

      salespeople: {
        title: 'ผู้รับผิดชอบ',
        lead: ['ผู้รับผิดชอบของหน่วยขายรายเดือน และผลงานรายบุคคล'],
        currentMonthLabel: 'เดือนปัจจุบัน (จำลอง)',
        alertsTitle: 'รายการที่ต้องดำเนินการ',
        alertVacant: '{unit} ไม่มีผู้รับผิดชอบ {months}',
        alertResigned: 'มีรายการที่ยังผูกกับผู้ที่ลาออก: {unit} ผูกกับ {name} {months}',
        noAlerts: 'ทุกรายการในแผนมีผู้รับผิดชอบครบทุกเดือน',
        peopleTitle: 'Sales Person',
        peopleColumns: { name: 'ชื่อ', channel: 'Channel', start: 'เริ่มงาน', end: 'ลาออก', status: 'สถานะ', manage: 'จัดการ' },
        allChannels: 'ทุก Channel',
        resignButton: 'บันทึกการลาออก',
        resignLabel: 'เดือนสุดท้ายที่ทำงาน',
        resignApply: 'บันทึก',
        resignCancel: 'ยกเลิก',
        resignErrors: { past: 'บันทึกการลาออกย้อนหลังเดือนปัจจุบันไม่ได้', range: 'เดือนลาออกต้องไม่ก่อนเดือนเริ่มงาน' },
        addPerson: '+ เพิ่ม Sales Person',
        addFields: { name: 'ชื่อ', channel: 'Channel', start: 'เริ่มงาน' },
        addSubmit: 'เพิ่ม',
        addErrorRequired: 'กรุณากรอกชื่อและเดือนเริ่มงาน',
        removeTitle: 'ลบ Sales Person',
        removeConfirm: 'ลบ {name} ออกจาก Master',
        removeBlocked: 'มีประวัติผู้รับผิดชอบ ให้บันทึกการลาออกแทนการลบ',
        timelineTitle: 'ผู้รับผิดชอบรายเดือน ปี {year}',
        timelineHint: 'โหมดแก้ไข: เลือกเดือนแรกและเดือนสุดท้ายของรายการเดียวกัน แล้วเลือกผู้รับผิดชอบ',
        timelineUnit: 'หน่วยขาย',
        pastTitle: 'เดือนที่ผ่านไปแล้วเป็นประวัติ แก้ไขไม่ได้',
        assignFor: '{unit} · {months}',
        assignPerson: 'ผู้รับผิดชอบ',
        assignVacant: '— ไม่มีผู้รับผิดชอบ —',
        assignApply: 'กำหนด',
        assignClear: 'ยกเลิกที่เลือก',
        assignErrors: { past: 'แก้ไขเดือนที่ผ่านไปแล้วไม่ได้', range: 'ช่วงเดือนไม่ถูกต้อง' },
        assignNote: 'การเปลี่ยนผู้รับผิดชอบไม่เปลี่ยนเป้าหมายและแผนยอดขาย',
        perfTitle: 'ผลงานรายบุคคล ปี {year}',
        perfColumns: { name: 'Sales Person', months: 'ช่วงที่รับผิดชอบ', units: 'รายการที่ดูแล', target: 'เป้าหมาย (บาท)', targetToDate: 'เป้าหมายถึง {month} (บาท)', actual: 'Actual ถึง {month} (บาท)', achievement: '% ความสำเร็จ' },
        perfNote: 'คำนวณเฉพาะเดือนที่แต่ละคนรับผิดชอบ · Actual นับถึงเดือนปัจจุบันจำลอง',
        perfEmpty: 'ยังไม่มีผู้รับผิดชอบในปีนี้'
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
        actionsCount: 'มีประเด็น {n} จาก {total} หน่วยขาย',
        actionFilters: {
          channel: 'Channel', channelAll: 'ทุก Channel',
          owner: 'ผู้รับผิดชอบ', ownerAll: 'ทุกคน', ownerNone: 'ยังไม่มีผู้รับผิดชอบ',
          gapOnly: 'เฉพาะที่มีส่วนต่าง', issuesOnly: 'แสดงเฉพาะที่มีประเด็น'
        },
        actionColumns: {
          channel: 'Channel', unit: 'หน่วยขาย', owner: 'ผู้รับผิดชอบ', gap: 'ส่วนต่าง (ล้านบาท)', phasing: 'เป้าหมายรายเดือน', sku: 'แผน SKU',
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
        actionsNone: 'ไม่มีหน่วยขายที่มีประเด็น',
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
        // CR-24: เส้นประ = ยอดขายอ้างอิงรายเดือน (ยอดจริงล่าสุดของแต่ละเดือน)
        monthlyLegend: { bar: 'เป้าหมาย (Top-down Phasing)', line: 'แผน Bottom-up', dashed: 'ยอดขายอ้างอิง' },
        monthlyEnd: { line: 'แผน', dashed: 'อ้างอิง' },
        monthlyTip: { target: 'เป้าหมาย', plan: 'แผน', gap: 'ส่วนต่าง', prior: 'ยอดขายอ้างอิง' },
        wfAxis: 'แกนเริ่มที่ {value} ล้านบาท',
        tableTitle: 'เป้าหมายและแผนราย Channel และหน่วยขาย (ล้านบาท)',
        tableColumns: { name: 'Channel / หน่วยขาย', target: 'เป้าหมาย', pctOfTotal: '% ของ Total', plan: 'แผน Bottom-up', gap: 'ส่วนต่าง', approval: 'สถานะอนุมัติ', owner: 'ผู้รับผิดชอบ' },
        pctOfTotalTip: 'สัดส่วนเป้าหมายเทียบ Total Target',
        approvalHeadTip: 'ไอคอนซ้าย = เป้าหมายรายเดือน (Sub-channel Allocation) · ไอคอนขวา = แผน SKU',
        approvalTip: 'Phasing: {phasing} · แผน SKU: {sku}',
        approvalIcons: { draft: '○', submitted: '◐', approved: '●', returned: '↩', review: '!' },
        approvalLegend: 'สถานะอนุมัติ (Phasing · แผน SKU):',
        channelApproved: 'อนุมัติแล้ว {done}/{total}',
        collapseTitle: 'ย่อหรือขยายรายการใน Channel นี้',
        mixTitle: 'สัดส่วนแผนตามกลุ่มสินค้า (ล้านบาท)',
        mixByStatus: 'ตาม Status',
        mixGroupLabel: 'ตามกลุ่มสินค้า',
        mixBy: { series: 'Series', category: 'Category' },
        mixNoCategory: '(ไม่ระบุ Category)',
        mixText: '{value} · {pct}',
        mixOther: 'อื่นๆ',
        peopleTitle: 'เป้าหมายรายผู้รับผิดชอบ (ล้านบาท)',
        peopleColumns: { name: 'ผู้รับผิดชอบ', units: 'หน่วยขายที่ดูแล', target: 'เป้าหมาย', plan: 'แผน', gap: 'ส่วนต่าง' },
        peopleNote: 'คำนวณเฉพาะเดือนที่แต่ละคนรับผิดชอบ',
        vacantRow: 'ไม่มีผู้รับผิดชอบ',
        resignedTag: 'ลาออก {month}',
        approvalsTitle: 'การอนุมัติ',
        approvalLine: 'การอนุมัติ: อนุมัติครบแล้ว {done}/{total} หน่วยขาย',
        approvalsTopDown: 'Annual Target: อนุมัติแล้ว · {by} · {at}',
        approvalsColumns: { unit: 'หน่วยขาย', phasing: 'เป้าหมายรายเดือน', sku: 'แผน SKU', approvedBy: 'ผู้อนุมัติ', approvedAt: 'วันที่อนุมัติ' },
        signTitle: 'ลงนามรับทราบและอนุมัติ',
        signFields: { name: 'ชื่อ', signature: 'ลายมือชื่อ', date: 'วันที่' }
      },

      // เกี่ยวกับ Prototype: ขอบเขต, Decision log, คำถามค้าง, ขั้นต่อไป (แยกออกจากรายงาน)
      aboutPrototype: {
        title: 'เกี่ยวกับ Prototype',
        lead: ['ขอบเขต ข้อสรุปที่ตกลงแล้ว และคำถามที่ต้องการคำตอบก่อนพัฒนาระบบจริง'],
        tabs: { scope: 'ขอบเขต', decisions: 'Decision log', questions: 'คำถามที่ค้าง', next: 'ขั้นต่อไป' },
        scopeTitle: 'ขอบเขต',
        scope: [
          'ตั้งเป้าหมาย Top-down เป็น Net Sales: Total → Channel → หน่วยขาย → รายเดือน',
          'วางแผน Bottom-up เป็นจำนวนชิ้น ต่อ SKU × หน่วยขาย × เดือน',
          { text: 'อนุมัติทีละขั้น (Top-down, Phasing, แผน SKU) แล้วล็อก Baseline ทั้งปี และ Re-forecast รายเดือน', feature: 'approvalWorkflow' },
          { text: 'แก้ไขและบันทึกแผนทุกขั้นได้ทันทีตามบทบาท (Phase 1 ไม่มีขั้นตอนระหว่างทาง)', feature: '!approvalWorkflow' },
          'ข้อมูลหลัก 3 ระบบ: Sales Planning, Product Master และ Account Master (Account, เขตการขายและร้านค้า, ผู้รับผิดชอบรายเดือน, ทีมขาย)',
          'สิทธิ์แก้ไขแยกตาม Module และบทบาท: Management · Sales Director · Sales Manager / Officer ตามทีมขายของ Channel · ทีม Product · Supply Chain · ผู้ดูรายงาน · ผู้ดูแลระบบ (กลุ่ม Role Management: Permissions · Roles · Users กำหนดได้เองโดยไม่แก้โค้ด)',
          'ข้อจำกัดของ Prototype: สิทธิ์ทำงานเฉพาะฝั่งหน้าจอ (ซ่อนปุ่มและเมนู) ไม่ใช่การป้องกันข้อมูลจริง ระบบจริงต้องตรวจสิทธิ์ที่ Backend ด้วย',
          'จัดสรรร้านค้า Traditional Trade ให้เขตการขายและผู้รับผิดชอบตามช่วงเดือน (ร้านค้าจริง 220 ร้าน)',
          'ยอดคงเหลือและสถานะทุกชั้น ทุกเดือน และรายงานสรุปแผนสำหรับผู้บริหาร'
        ],
        cutTitle: 'สิ่งที่ตัดออกโดยตั้งใจ',
        cut: [
          'Ramp-up ของ NPD',
          'Cannibalization ระหว่าง SKU',
          'เกณฑ์ % คงเหลือที่ตั้งค่าได้เอง',
          'การแยกสินค้า Core / Steady'
        ],
        decisionColumns: { topic: 'เรื่อง', decision: 'ข้อสรุป' },
        decisions: [
          { topic: 'หน่วยของเป้าหมาย', decision: 'ตั้งเป้าหมายเป็น Net Sales (บาท) / Bottom-up เป็นจำนวนชิ้น มาเจอกันที่ยอดคงเหลือ' },
          { topic: 'การแบ่งเป้า', decision: 'แบ่ง 3 ชั้น: Total → Channel → หน่วยขาย เป็นสัดส่วนของชั้นบน แก้ไขได้ทั้ง % และบาท (เก็บเป็น %) ทุกกลุ่มมีแถวคงเหลือ' },
          { topic: 'สถานะคงเหลือ', decision: 'จัดสรรครบ (±1 บาท) = เขียว / ขาด = แดง / เกิน = เหลือง / ยังไม่กำหนด = เทา ทุกสถานะมีข้อความกำกับ การกระจายยอดคงเหลือต้องกดเองเท่านั้น' },
          { topic: 'Channel แบบ Config', decision: 'Channel อยู่ใน Channel Master: หน่วยแบ่งเป้า (Account หรือเขต), วิธีนับ Sell-out, มี GP หรือไม่ และสี เพิ่ม Channel ใหม่ (เช่น Export) ได้โดยไม่แก้โค้ด' },
          { topic: 'TT ตามเขต', decision: 'TT แบ่งเป้าตามเขตการขาย เป้าหมายของเขต = Quota ของเขต / เขตการขาย = กลุ่มร้านค้า (ไม่ได้กำหนดด้วยจังหวัด) ระบบไม่แบ่งเป้าลงถึงร้าน' },
          { topic: 'เป้าหมายผูกกับ หน่วยขาย', decision: 'เป้าหมาย ยอดขาย และยอดขาย L12M ผูกกับ Account หรือเขต ไม่ผูกกับบุคคล การเปลี่ยนผู้รับผิดชอบไม่เปลี่ยนเป้าหมายและแผนยอดขาย' },
          { topic: 'ผู้รับผิดชอบ', decision: 'เก็บเป็นช่วงเดือน 1 รายการ 1 เดือนมีได้ 1 คน ช่วงห้ามทับกัน แก้ไขเดือนที่ผ่านไปแล้วไม่ได้ ผู้ที่ลาออกแล้วนับเป็นไม่มีผู้รับผิดชอบ · ใช้แสดงผลและคำนวณผลงานรายคน ไม่ใช้กำหนดสิทธิ์แก้ไข' },
          { topic: 'ทีมขายต่อ Channel', decision: 'แต่ละ Channel มี Sales Manager และ Sales Officer ได้หลายคน 1 คนอยู่ได้หลาย Channel เก็บเป็นช่วงเดือน · สิทธิ์แก้ไขแผนยอดขายราย SKU มาจากการเป็นสมาชิกทีม ณ เดือนปัจจุบัน · สมาชิกที่สิ้นสุดแล้วแก้ไม่ได้ · Sales Director จัดการทีมที่หน้าทีมขาย' },
          { topic: 'สิทธิ์เป็นข้อมูลที่แก้ได้', decision: 'ผู้ดูแลระบบกำหนดสิทธิ์ของแต่ละบทบาทต่อหน้าได้ที่หน้า Permissions: ไม่เห็น · ดู · แก้ไข (+ ขอบเขต ทุก Channel / เฉพาะทีม) และปุ่มเฉพาะ อนุญาต / ไม่อนุญาต · ผู้ใช้หลายบทบาทได้สิทธิ์สูงสุด · หน้าที่ไม่เห็นไม่อยู่ในเมนู · สิทธิ์ใน Prototype ทำงานเฉพาะฝั่งหน้าจอ' },
          { topic: 'สิทธิ์แยกตาม Module', decision: 'Management กำหนด Total Target และแบ่งลง Channel · Sales Director แบ่งเป้าลงหน่วยขาย กำหนดเป้ารายเดือน และจัดการ Account Master · Sales Manager / Officer วางแผนราย SKU ของ Channel ในทีม · ทีม Product จัดการ Product Master · Supply Chain จัดการ Clearance · ผู้ดูรายงานดูได้ทุกหน้า แก้ไขไม่ได้' },
          { topic: 'ผลงานรายบุคคล', decision: 'รวมเป้าหมายและยอดขายของทุกรายการ เฉพาะเดือนที่บุคคลนั้นรับผิดชอบ รวมถึงผู้ที่ลาออกแล้ว' },
          { topic: 'ปีแผน', decision: 'ข้อมูลแผนแยกตามปี ทุกแถวแสดงยอดขาย L12M และการเติบโต และเติมสัดส่วนตามยอดขาย L12M ได้' },
          { topic: 'ยอดขาย L12M และยอดอ้างอิง', decision: 'ฐานเทียบการเติบโต = ยอดขายจริง 12 เดือนล่าสุดที่ปิดแล้ว (L12M ก.ย. 2025 – ส.ค. 2026 ตามเดือนปัจจุบันกลาง) ไม่ใช้ประมาณการ · ยอดอ้างอิงรายเดือน = ยอดจริงล่าสุดของแต่ละเดือน (ม.ค.–ส.ค. ปี 2026 · ก.ย.–ธ.ค. ปี 2025) รวม 12 เดือน = L12M ใช้เป็นค่าตั้งต้นของเป้าหมายรายเดือนและแผน SKU' },
          { topic: 'หน่วยขายในแผน', decision: 'เพิ่มหรือนำออกจากแผนได้จาก Account Master หรือ Territory Master เท่านั้น ไม่พิมพ์ชื่อเอง' },
          { topic: 'Phasing', decision: 'ค่าตั้งต้นของเป้าหมายรายเดือน = เป้าหมายทั้งปี × สัดส่วนยอดขายอ้างอิงรายเดือน (ไม่มีข้อมูลใช้สัดส่วนของ Channel) ไม่ปรับเดือนอื่นอัตโนมัติ แต่ผลรวมต้องเท่าเป้าหมายทั้งปี' },
          { topic: 'อนุมัติต่อขั้น', decision: 'Top-down: Sales Director จัดทำ → Management อนุมัติ / Phasing และแผน SKU: ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ / ขั้นล่างจัดทำฉบับร่างได้ก่อน แต่ส่งได้เมื่อขั้นบนอนุมัติแล้ว / ขั้นบนอนุมัติใหม่และเป้าหมายเปลี่ยน → ขั้นล่างเป็น "ต้องตรวจสอบใหม่"', feature: 'approvalWorkflow' },
          { topic: 'แก้ไข / บันทึก / ยืนยัน', decision: 'ทุกหน้าเปิดเป็นโหมดดู ต้องกดแก้ไขก่อน แล้วบันทึกหรือยกเลิก / ส่งอนุมัติและอนุมัติมีกล่องยืนยันที่สรุปตัวเลข / ส่งไม่ได้หากยังจัดสรรไม่ครบ / ส่งกลับแก้ไขต้องระบุเหตุผล / บทบาทที่แก้ไขไม่ได้เห็นข้อความอ่านอย่างเดียว', feature: 'approvalWorkflow' },
          { topic: 'แก้ไข / บันทึก', decision: 'ทุกหน้าเปิดเป็นโหมดดู ต้องกดแก้ไขก่อน แล้วบันทึกหรือยกเลิก / บทบาทที่แก้ไขไม่ได้เห็นข้อความอ่านอย่างเดียว', feature: '!approvalWorkflow' },
          { topic: 'Baseline', decision: 'แผนผ่านการอนุมัติครั้งเดียว แล้ว Sales Director ล็อกเป็น Baseline ทั้งปีในรายงานสรุปแผนเมื่อแผน SKU ทุกรายการอนุมัติแล้ว พร้อม Snapshot ราคาและ GP', feature: 'baseline' },
          { topic: 'Forecast', decision: 'หลังล็อก Baseline ปรับได้เฉพาะ Re-forecast (มี Workflow แยก) ล็อก M+1 ถึง M+3 ปรับได้ตั้งแต่ M+4 เดือนที่ผ่านแล้วใช้ Actual ขอแก้ไขเดือนที่ล็อกเป็น Exception ผ่าน Director', feature: 'reforecast' },
          { topic: 'Status สินค้า', decision: 'Planned / New (3 เดือนนับจากวันเริ่มขาย) / Active / Clearance (มาก่อนเสมอ) / Discontinued คำนวณจากวันที่เท่านั้น' },
          { topic: 'Clearance', decision: 'มาก่อน Status อื่นเสมอ แบ่ง Stock เท่ากันทุกเดือน ผลรวมเท่า Stock' },
          { topic: 'วิธีเติมยอด', decision: 'ดูที่ SKU × หน่วยขาย มี 4 แบบ: ล็อก 0 / กรอกเอง / ระบบเติม / Clearance สีของช่องบอกที่มาของตัวเลข' },
          { topic: 'แผนราย SKU', decision: 'กรอกเป็นจำนวนชิ้น ระบบแปลงเป็น Sale Amount และ Net Sales แก้ไขช่องระบบเติมและ Clearance ได้ (Override) ยกเว้นช่องล็อก 0 / คงเหลือรายเดือน = เป้าหมาย − แผน' },
          { topic: 'Series', decision: 'จัดกลุ่มตาม Series (หน่วยขายที่มีเกิน 20 SKU) หรือ Status พับได้ มีผลรวมของกลุ่มที่หัวกลุ่ม · Filter Series เลือกได้หลายค่า · คงเหลือเทียบกับเป้าหมายทั้ง Account เสมอ / "เพิ่มทั้ง Series" เพิ่มทุก SKU ของ Series ที่ Listing แล้ว' },
          { topic: 'Product Master', decision: 'ทีม Product กำหนดวันเริ่มขาย Listing และเดือนเลิกขาย / Supply Chain กำหนด Clearance / ทีมขายเห็นเฉพาะ SKU ที่ Listing แล้ว' },
          { topic: 'ข้อมูลสินค้า', decision: 'Product Master เป็นแหล่งข้อมูลเดียว 5 หน้า: รายการสินค้า แผน NPD ' + (PROMO_CALENDAR ? 'Promotion Price' : 'ราคาขายต่อ Account') + ' Listing และหมวดสินค้า/Series / สินค้าที่ขาดข้อมูลจำเป็นใช้ในแผน SKU ไม่ได้' },
          { topic: 'รหัสสินค้า', decision: 'สินค้าใหม่ใช้รหัสชั่วคราวได้ เมื่อได้ TR Code จริงกดผูกรหัส ระบบย้าย Listing ราคา Promotion แผน NPD และแผน SKU ให้ทั้งหมด' },
          { topic: 'แผน NPD', decision: 'ทีม Product ส่ง → Sales Director อนุมัติ / อนุมัติแล้วตั้งวันเริ่มขายและ Listing ให้ และเดือนเริ่มขายเป็นค่าตั้งต้นในแผน SKU', feature: 'npdApproval' },
          { topic: 'แผน NPD', decision: 'ทีม Product บันทึกแผนแล้วมีผลทันที: ตั้งวันเริ่มขายและ Listing ให้ และเดือนเริ่มขายเป็นค่าตั้งต้นในแผน SKU', feature: '!npdApproval' },
          { topic: 'ราคาและ Promotion', decision: 'ราคามีวันที่มีผล / ราคาที่ใช้ในแผน = ราคาเฉลี่ยถ่วงตามจำนวนวันของ Promotion ที่ยืนยันแล้ว / แก้ราคาหลังล็อก Baseline ไม่เปลี่ยน Baseline แต่มีผลกับ Forecast', feature: 'baseline' },
          { topic: 'ราคาและ Promotion', decision: 'ราคามีวันที่มีผล / ราคาที่ใช้ในแผน = ราคาเฉลี่ยถ่วงตามจำนวนวันของ Promotion ที่ยืนยันแล้ว', feature: 'promotionCalendar' },
          { topic: 'ราคาขาย', decision: 'ราคาขายรวม VAT = ราคาต่อ Account ถ้ามี (ราคาเดียวทั้งปี ไม่แยกเดือน) ไม่มีใช้ RSP ตามวันที่มีผล · TT ใช้ราคา Dealer เป็นค่าตั้งต้น · ทีม Product กำหนดที่หน้าราคาขายต่อ Account', feature: '!promotionCalendar' },
          { topic: 'โหมดแผน', decision: 'สร้างแผนครั้งแรกแก้ไขได้ทุกเดือน / ปรับแผนแก้ไขได้ตั้งแต่ M+4 เดือนที่ผ่านแล้วใช้ Actual และไม่เขียนทับ Baseline', feature: 'reforecast' },
          { topic: 'SKU ใหม่', decision: 'กรอกเองทั้งปีในแผนรายปี' },
          { topic: 'ระบบเติม', decision: 'ค่าตั้งต้น = ยอดอ้างอิงของ SKU ในหน่วยขายนั้น (ยอดจริงล่าสุดของเดือนนั้น · ไม่มียอดจริงใช้ประมาณการปีล่าสุดและติดจุดที่ช่อง) · SKU ที่เลิกขายได้ 0 · SKU ไม่มียอดอ้างอิง = กรอกเอง · ส่วนต่างปิดด้วยปรับทั้งหน่วยขาย ±% · ปรับให้ครบตามเป้าหมาย หรือเพิ่ม NPD' },
          { topic: 'เพิ่ม SKU และ NPD จาก Sales', decision: 'เพิ่ม SKU ได้จาก Product Master ทั้งหมด SKU ที่ยังไม่ได้ Listing ระบบสร้าง Listing ให้ (Listing โดย Sales) · Sales Manager / Officer สร้าง NPD ได้ทันทีด้วยรหัสชั่วคราว (ราคาต่อ Account + RSP ชั่วคราว) ไม่ติดกฎขาดข้อมูลจำเป็น · ทีม Product เห็นคำขอจาก Sales เติมข้อมูลและผูกรหัสจริงภายหลัง' },
          { topic: 'ข้อมูลสินค้าจริง', decision: 'ใช้รายการสินค้าจริง 117 SKU จาก Excel · ยอดขายราย SKU ปี 2026 ของ 7-Eleven และ EVEANDBOY ปรับสัดส่วนให้ตรงกับยอดขายรายเดือนของหน่วยขายใน Prototype · หน่วยขายอื่นใช้รูปแบบของ EVEANDBOY · หมวดสินค้ากำหนดจากคำในชื่อสินค้า (ควรตรวจสอบ) · สินค้าใหม่ปี 2027 เป็นชื่อชั่วคราว' },
          { topic: 'ราคาต่อ Account', decision: 'ลำดับราคา: ราคาต่อ Account → ราคา Dealer (TT) → RSP (เช่น Juicy Pop Tint 02 และ 05 ที่ 7-Eleven 149 บาท) · TT ไม่หัก GP · GP และ Platform Fee เป็นค่าเดียวทั้งปีต่อ Account' },
          { topic: 'เครื่องมือช่วยกรอก', decision: 'กรอกยอดทั้งปี · เลือกหลายแถวแล้วปรับ ±% · ตั้งเท่ายอดอ้างอิง · ปิดส่วนต่างตามสัดส่วน Net Sales (แสดงก่อน/หลัง ต้องกดยืนยัน) · คัดลอก/วางกับ Excel และย้อนกลับ · ▲/▼ เมื่อต่างจากยอดอ้างอิงเกิน 50% · ทุกเครื่องมือไม่แก้ช่องที่ล็อก' },
          { topic: 'Promo บางวัน', decision: 'ใช้ราคาเฉลี่ยถ่วงตามจำนวนวัน', feature: 'promotionCalendar' },
          { topic: 'สูตร Net Sales', decision: 'Sale Amount = จำนวนชิ้น × ราคาขาย (รวม VAT) · MT: Net Sales = Sale Amount ÷ 1.07 × (1 − GP) · ECOM: ÷ 1.07 × (1 − Platform Fee) · TT: ÷ 1.07 · Account ที่ยังไม่มี GP คำนวณไม่ได้ ดูสูตรได้ที่ ⓘ และ Tooltip รายช่องในหน้าวางแผนราย SKU' },
          { topic: 'VAT', decision: 'ราคาใน Product Master และราคาต่อ Account รวม VAT แล้ว (ได้คำตอบแล้ว CR-18)' },
          { topic: 'เมนู', decision: 'เมนูข้าง 5 กลุ่ม: Sales Planning (Annual Target → Sub-channel Allocation → SKU Planning → Plan Summary) / Product Master / Account Master / Role Management (Permissions · Roles · Users) / ข้อมูลโครงการ' },
          { topic: 'เมนูตามบทบาท', decision: 'ค่าตั้งต้นซ่อนหน้าที่ไม่เกี่ยวกับบทบาท (ไม่เห็น = ไม่อยู่ในเมนู · กลุ่มที่ไม่เหลือหน้าไม่มีหัวกลุ่ม) · เกี่ยวกับ Prototype เห็นทุกบทบาท · เลขขั้นของ Sales Planning คงที่ ปุ่มก่อนหน้า/ถัดไปข้ามขั้นที่มองไม่เห็น' },
          { topic: 'หน้าเริ่มต้นของบทบาท', decision: 'แต่ละบทบาทมีหน้าเริ่มต้น (แก้ได้ที่หน้า Roles) ใช้เมื่อเข้าเว็บ สลับมุมมองผู้ใช้แล้วหน้าเดิมถูกซ่อน (มี Toast) และดูตัวอย่างในมุมมองนี้ · ผู้ใช้หลายบทบาทใช้ของบทบาทแรกตามลำดับ' },
          { topic: 'เมนูข้าง', decision: 'เปิดเป็นค่าเริ่มต้นทุกหน้า (รวม SKU Planning) ผู้ใช้พับเองได้และจำค่าไว้ · ตาราง SKU พอดีความกว้างที่เหลือ ถ้าไม่พอเลื่อนแนวนอนภายในตาราง (คอลัมน์ชื่อ SKU ติดซ้าย)' },
          { topic: 'ชื่อขั้นตอน', decision: 'ชื่อ 4 ขั้นเป็นภาษาอังกฤษ: Annual Target / Sub-channel Allocation / SKU Planning / Plan Summary · Tooltip ของชื่อหน้าและข้อความในหน้าเป็นภาษาไทย · ชื่อหน้าใน Product Master และ Account Master เป็นภาษาไทยตามเดิม' },
          { topic: 'แยกเป้าหมาย Channel กับหน่วยขาย', decision: 'Annual Target = Management ตั้ง Total Target และแบ่งลง Channel · Sub-channel Allocation = Sales Director แบ่งเป้าของ Channel ลงหน่วยขาย และกระจายเป็นรายเดือนในหน้าเดียว (คลิกหน่วยขายเพื่อดูรายเดือน) · Channel ที่ยังไม่มีเป้าหมายจัดสรรไม่ได้ · เป้าหมาย Channel เปลี่ยนหลังจัดสรรแล้ว = หน่วยขายคง % เดิม และมีบรรทัดแจ้ง' },
          { topic: 'ยอดขายย้อนหลัง', decision: 'ตารางเป้าหมายแสดงยอดขายจริงทั้งปี 2 ปี + L12M (ปีแผน 2027 → 2024 · 2025 · L12M ก.ย. 25 – ส.ค. 26) · การเติบโตและแท่งเทียบกับยอดขาย L12M' },
          { topic: 'ปีแผน', decision: 'เลือกปีแผนที่แถวหัวข้อของหน้าที่อิงปี (ต่อท้ายชื่อหน้า) ไม่อยู่ใน Header / เปลี่ยนในหน้าใดมีผลทุกหน้า / มีรายการที่ยังไม่บันทึกต้องยืนยันก่อนเปลี่ยนปี' },
          { topic: 'สัดส่วนเป้าหมาย', decision: 'แยกฐานชัดเจน: % ของ Total (กรอกที่แถว Channel ในหน้า Annual Target) และ % ใน Channel (กรอกที่แถวหน่วยขายในหน้า Sub-channel Allocation) / ค่าตั้งต้นตามสัดส่วนยอดขาย L12M' },
          { topic: 'กราฟการเติบโต', decision: 'หน้า Annual Target มีกราฟ 2 ใบใต้ตาราง: ยอดขายและเป้าหมายราย Channel (แท่งซ้อน 2024 · 2025 · L12M · เป้าหมาย) และที่มาของการเติบโต (Waterfall จากยอดขาย L12M อัปเดตทันทีเมื่อแก้) · รายงานสรุปแผนมี Waterfall และสัดส่วน Channel L12M เทียบเป้าหมาย' },
          { topic: 'เป้าหมายเทียบ L12M', decision: 'แท่งใช้สเกลจริงเดียวกันทั้งตาราง เริ่มที่ 0 ค่าสูงสุด = เป้าหมายหรือยอดขาย L12M ที่มากที่สุดปัดเป็นเลขกลม · ความยาวแท่ง = เป้าหมาย ขีดตั้ง = ยอดขาย L12M · มีแกน 0 ถึงค่าสูงสุดที่หัวคอลัมน์ · ใช้ในหน้า Annual Target · Sub-channel Allocation และรายงานสรุปแผน' },
          { topic: 'ชื่อหน่วยขาย', decision: 'แต่ละ Channel เรียกหน่วยขายและ GP ตาม Channel Master: Account / เขตการขาย / Platform และ GP / Platform Fee' },
          { topic: 'ส่งออกข้อมูล', decision: 'ส่งออก Excel และ CSV ได้จากหน้า Annual Target · Sub-channel Allocation และ SKU Planning ตัวเลขคำนวณต่อได้' },
          { topic: 'รายงานสรุปแผน', decision: 'สำหรับผู้บริหาร: KPI, เป้าหมายเทียบแผนรายเดือน, ตารางราย Channel และ หน่วยขาย, สัดส่วนแผนตามกลุ่มสินค้า, เป้าหมายรายผู้รับผิดชอบ และการอนุมัติ พิมพ์เป็น PDF ได้', feature: 'approvalWorkflow' },
          { topic: 'รายงานสรุปแผน', decision: 'สำหรับผู้บริหาร: KPI, เป้าหมายเทียบแผนรายเดือน, ตารางราย Channel และ หน่วยขาย, สัดส่วนแผนตามกลุ่มสินค้า และเป้าหมายรายผู้รับผิดชอบ พิมพ์เป็น PDF ได้', feature: '!approvalWorkflow' },
          { topic: 'ติดตามสถานะแยกจากรายงาน', decision: 'ขั้นที่ 4 มี 2 แท็บ: รายงานสรุปแผน (แท็บแรกและค่าเริ่มต้นเสมอ ประกาศและหลักฐานข้อตกลง — พิมพ์ได้) กับติดตามสถานะ (ตารางเดียว 1 แถวต่อหน่วยขาย รวมประเด็นที่ต้องดำเนินการ ผู้อนุมัติและวันที่อนุมัติ พร้อมประวัติ และปุ่มล็อก Baseline — ไม่พิมพ์)', feature: 'approvalWorkflow' },
          { topic: 'ติดตามสถานะแยกจากรายงาน', decision: 'ขั้นที่ 4 มี 2 แท็บ: รายงานสรุปแผน (แท็บแรกและค่าเริ่มต้นเสมอ ประกาศและหลักฐานข้อตกลง — พิมพ์ได้) กับติดตามสถานะ (ตารางเดียว 1 แถวต่อหน่วยขาย: ส่วนต่าง · ผู้รับผิดชอบ · การดำเนินการถัดไป — ไม่พิมพ์)', feature: '!approvalWorkflow' },
          { topic: 'หมวดสินค้าและ Series', decision: 'ดูเป็นคอลัมน์ต่อระดับพร้อมแผงรายละเอียด แก้ทีละรายการ · ย้าย SKU หรือรวมรายการที่จัดหมวดผิดได้ · ลบได้เฉพาะรายการที่ไม่มี SKU และไม่มีรายการย่อย · Series คอลแลบมีวันเริ่มและวันสิ้นสุด · ตารางไขว้ Series × หมวดสินค้าใช้หาช่องที่ผิดปกติ' },
          { topic: 'มุมมองรวมรายเดือน', decision: 'หน้า Sub-channel Allocation ดูเป้าหมายรายเดือนรวมทั้ง Channel ได้ (แถว รวมทั้ง {Channel}) แบบอ่านอย่างเดียว (แท่งซ้อนตามหน่วยขาย) · เป้าหมายรายเดือนและคงเหลือคิดต่อหน่วยขาย' },
          { topic: 'แกนกราฟ', decision: 'กราฟรายเดือนเริ่มที่ 0 ค่าสูงสุดเผื่อ 10% แล้วปัดเป็นเลขกลม · แผน = เส้นทึบมีจุด ยอดขายอ้างอิง = เส้นประ · Waterfall เริ่มแกนที่เลขกลม (เช่น 100 ล้านบาท) แท่งยอดขาย L12M และ Total Target เริ่มจุดเดียวกัน และมีสัญลักษณ์ตัดแกน' },
          { topic: 'รายงานเป็นหลักฐาน', decision: 'ทุกครั้งที่ล็อก Baseline ได้รายงานฉบับใหม่ (2027-BL-01, 02 …) ตัวเลขทั้งหมดมาจาก Baseline ที่ล็อกไว้ พร้อมตารางผู้อนุมัติรายหน่วยขายและช่องลงนาม · ก่อนล็อกเป็นฉบับร่างมีลายน้ำทุกหน้า · ปลดล็อกได้โดย Sales Director พร้อมเหตุผล', feature: 'baseline' },
          { topic: 'ร้านค้าและเขตการขาย', decision: 'ร้านค้าอยู่ในเขตตามช่วงเดือน: ย้ายร้านบางร้าน = ย้ายเขตตั้งแต่เดือนที่เลือก (เดือนที่ผ่านแล้วแก้ไม่ได้) / คนลาออก = โอนทั้งเขต ร้านไม่ย้าย / ยอดขายของเขต = ยอดอ้างอิงของร้านที่อยู่ในเขต ณ เดือนแรกของปีแผน (เทียบแบบร้านเดียวกัน · ใช้คำนวณ L12M ของเขต)' },
          { topic: 'จังหวัดของเขต', decision: 'รายชื่อจังหวัดของเขตใช้แนะนำเขตให้ร้านที่ยังไม่จัดสรร และเตือนร้านที่อยู่นอกจังหวัดของเขตเท่านั้น เพราะผู้รับผิดชอบ 2 คนดูแลจังหวัดเดียวกันได้' },
          { topic: 'ย้ายร้านหลังอนุมัติเป้าหมาย', decision: 'เป้าหมายและยอดขาย L12M ของเขตไม่เปลี่ยน กล่องยืนยันแจ้งยอดอ้างอิงที่ย้าย และแท็บติดตามสถานะแสดงรายการร้านให้ Sales Director ตัดสินใจว่าจะเปิดให้แก้ไขเป้าหมายหรือไม่', feature: 'approvalWorkflow' },
          { topic: 'ข้อมูลส่วนบุคคล', decision: 'ร้านค้าที่ชื่อเป็นบุคคลธรรมดาแสดงเป็น "ร้านค้า {System ID} (บุคคลธรรมดา)" ทุกหน้าและไฟล์ส่งออก / ไม่นำเข้าเงื่อนไขเครดิต วงเงินเครดิต และช่องทางชำระ' },
          { topic: 'Phase 1 ตาม Flow ใหม่', decision: 'แก้ไขและบันทึกแผนได้ทันทีตามบทบาท / รายการที่ต้องดำเนินการ = หน่วยขายที่ยังมีส่วนต่างหรือยังไม่มีผู้รับผิดชอบ / แผน NPD บันทึกแล้วมีผลทันที / ตัวเลขทุกขั้นแก้ได้ตลอดปีแผน', feature: '!approvalWorkflow' }
        ],
        openQuestions: [
          'Chayamiss เป็น Channel หรือ Account (Export ตั้งเป็น Channel ตัวอย่างแล้ว)',
          'ระบบจริงใช้งานหลายคนพร้อมกัน ต้องมี Backend',
          'Stock Clearance ระดับ SKU แบ่งให้แต่ละ หน่วยขายอย่างไร (Prototype แบ่งเท่ากันทุกรายการที่ Listing)',
          'แผน SKU ของ TT จัดทำที่ระดับเขตใช่หรือไม่',
          'CN% ของ TT กำหนดต่อเขตหรือทั้ง Channel',
          { text: 'การเปลี่ยนผู้รับผิดชอบต้องมีผู้อนุมัติหรือไม่', feature: 'approvalWorkflow' },
          'ร้านค้าที่ System ID ซ้ำกันในไฟล์ต้นทาง (8 ID · 9 แถว) เป็นร้านเดียวกันหรือไม่ (Prototype นับยอดอ้างอิงแยกทุกแถว)',
          'รายชื่อจังหวัดแนะนำ: TT เขต 2 ยังไม่มี ลาว / TT เขต 4 ยังไม่มีจังหวัดภาคตะวันตก (ราชบุรี นครปฐม สุพรรณบุรี กาญจนบุรี) / TT เขต 3 เป็นค่าสมมติ',
          'ร้านที่ยังไม่จัดสรร 9 ร้านไม่มีจังหวัด ควรอยู่เขตใด'
        ],
        nextSteps: [
          'ตอบคำถามที่ค้าง และยืนยันเจ้าของข้อมูลแต่ละรายการ',
          'กำหนดรูปแบบ Product Master, Account Master และแหล่งข้อมูลยอดขายย้อนหลัง',
          'ออกแบบระบบจริง: Backend สำหรับหลายผู้ใช้ สิทธิ์ผู้ใช้ตามบทบาท และการนำเข้าข้อมูลจาก Excel เดิม',
          'ทดลองใช้กับ 1–2 หน่วยขาย ก่อนขยายทั้งบริษัท',
          { text: 'Phase 2 (Sales Planning Revision): ขั้นตอนอนุมัติ ล็อก Baseline และปรับแผนระหว่างปี', feature: '!approvalWorkflow' }
        ],
        approveTitle: 'สิ่งที่ขออนุมัติ',
        approve: [
          'อนุมัติแนวคิดโดยรวมตามขอบเขตและ Decision log',
          'ตอบคำถามที่ค้าง เพื่อเริ่มออกแบบระบบจริง'
        ]
      }
    }
  };
})(window.SP);

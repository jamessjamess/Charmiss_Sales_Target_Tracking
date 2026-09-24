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
      aboutLink: 'เกี่ยวกับ Prototype',
      menu: 'เมนู',
      menuOpen: 'เปิดเมนู',
      collapse: 'พับเมนู',
      expand: 'ขยายเมนู',
      groups: { 'sales-planning': 'Sales Planning', 'product-master': 'Product Master', 'account-master': 'Account Master', 'project-info': 'ข้อมูลโครงการ' },
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
      roleGroupSales: 'Sales Person',
      roleGroupProduct: 'ทีมดูแลข้อมูลสินค้า',
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
      // แท่งเป้าหมายเทียบปีก่อน (charts.vsLastYearBar) หน้าจัดสรรเป้าหมายประจำปีและรายงานสรุปแผน
      vsLastYear: {
        header: 'เป้าหมายเทียบปีก่อน',
        headerTip: 'ความยาวแท่ง = เป้าหมาย · ขีดตั้ง = ยอดขายปีก่อน · ทุกแถวใช้สเกลเดียวกัน',
        tip: 'เป้าหมาย {target} บาท · ยอดขายปี {year} {prior} บาท · {pct}',
        newTip: 'เป้าหมาย {target} บาท · ไม่มียอดขายปี {year}',
        newTag: 'ใหม่',
        axisUnit: 'ล้าน'
      },
      // ⓘ ของยอดขายปีก่อน (components.priorLabel) — เดือนตัดยอดคำนวณจาก history.actualMonths
      priorInfo: {
        label: 'ยอดขายปี {year}',
        column: 'ยอดขายปี {year} (ล้านบาท)',
        columnBaht: 'ยอดขายปี {year} (บาท)',
        mixed: 'ยอดขายปี {year} = ยอดขายจริง {actual} + ประมาณการ {estimate}',
        actual: 'ยอดขายปี {year} = ยอดขายจริงทั้งปี',
        estimate: 'ยอดขายปี {year} = ประมาณการทั้งปี',
        none: 'ไม่มีข้อมูลยอดขายปี {year}'
      },
      views: { units: 'จำนวนชิ้น', sellOut: 'Sell-out Amount', net: 'Net Sales' },
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
      prior: 'ยอดขายปีก่อน',
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
      picker: {
        channel: 'Channel',
        unit: 'หน่วยขาย',
        search: 'ค้นหาชื่อหรือผู้รับผิดชอบ',
        noMatch: 'ไม่พบรายการ',
        prev: 'รายการก่อนหน้าใน Channel นี้',
        next: 'รายการถัดไปใน Channel นี้'
      },
      context: { annual: 'เป้าหมายทั้งปี', prior: 'ยอดขายปีก่อน', growth: 'การเติบโต', gp: 'GP' },
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
      roles: { management: 'Management', director: 'Sales Director', sales: 'Sales Person', product: 'ทีม Product', supply: 'Supply Chain', trade: 'Trade Marketing' },
      // Workflow ต่อขั้น (core/workflow.js + components.workflowBar)
      workflow: {
        status: { draft: 'ฉบับร่าง', submitted: 'รออนุมัติ', approved: 'อนุมัติแล้ว', returned: 'ส่งกลับแก้ไข', review: 'ต้องตรวจสอบใหม่', locked: 'ล็อกแล้ว' },
        icon: { draft: '○', submitted: '◔', approved: '✓', returned: '↩', review: '!', locked: '🔒' },
        actions: { edit: 'แก้ไข', submit: 'ส่งอนุมัติ', save: 'บันทึก', cancel: 'ยกเลิก', recall: 'ดึงกลับ', approve: 'อนุมัติ', 'return': 'ส่งกลับแก้ไข', reopen: 'เปิดให้แก้ไข', lock: 'ล็อก Baseline' },
        events: { submit: 'ผู้ส่ง:', recall: 'ดึงกลับโดย', approve: 'ผู้อนุมัติ:', 'return': 'ส่งกลับแก้ไขโดย', reopen: 'เปิดให้แก้ไขโดย', invalidate: 'เปลี่ยนเป็นต้องตรวจสอบใหม่ ·', lock: 'ล็อกโดย' },
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
          { source: 'manual', text: 'ยังไม่มียอดขายปีก่อนในหน่วยขายนี้ (รวมถึง SKU ใหม่ทั้งปี) ทีมขายเป็นผู้กรอก' },
          { source: 'system', text: 'มียอดขายปีก่อนในหน่วยขายนี้ ระบบคำนวณตามวิธีค่าตั้งต้นของหน่วยขาย (ยอดปีก่อน × การเติบโต หรือ Run-rate × Seasonality) และแก้ไขได้ (Override)' },
          { source: 'clearance', text: 'อยู่ในช่วง Clearance ระบบคำนวณจาก Stock ÷ จำนวนเดือน และแก้ไขได้ (Override)' }
        ]
      },
      // คำอธิบายการคำนวณ (ⓘ ในหน้าวางแผน SKU)
      explain: {
        button: 'วิธีคำนวณตัวเลข',
        title: 'วิธีคำนวณ',
        formulas: [
          ['Sell-out Amount ก่อน VAT', '= จำนวนชิ้น × ราคา'],
          ['Net Sales', '= Sell-out Amount ก่อน VAT × (1 − GP)'],
          ['Sell-out Amount รวม VAT', '= Sell-out Amount ก่อน VAT × {vatFactor}']
        ],
        promoNote: 'เดือนที่มี Promo บางวัน ใช้ราคาเฉลี่ยถ่วงตามจำนวนวัน',
        splitTitle: 'สัดส่วนเงินที่ลูกค้าจ่าย · {unit} ทั้งปีตามแผน',
        splitParts: { net: 'Net Sales (บริษัท)', gp: 'GP (ร้านค้า)', vat: 'VAT' },
        valuesTitle: 'ค่าที่ใช้กับรายการนี้',
        gp: 'GP ที่มีผล',
        gpFrom: 'ตั้งแต่ {date}',
        noGP: 'Channel นี้ไม่มี GP (รอยืนยัน)',
        vat: 'VAT',
        priceVat: { excl: 'ราคาใน Price List: ไม่รวม VAT', incl: 'ราคาใน Price List: รวม VAT' },
        vatQuestion: 'คำถามที่ค้าง: ราคารวม VAT หรือไม่',
        sellOutMethod: { ACTUAL: 'Sell-out = ยอดขายจริงของร้านค้า', SELL_IN_MINUS_CN: 'Sell-out = Sell-in − CN (รอกำหนด CN%)' }
      },
      // Tooltip รายช่อง (components.cellBreakdown)
      breakdown: {
        sellOutEx: 'Sell-out ก่อน VAT',
        net: 'Net Sales',
        incVat: 'รวม VAT',
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
        // CR-11: ที่มาของช่องระบบเติม และยอดปีก่อนของช่อง
        fill: {
          lastYear: 'ยอดปีก่อน × การเติบโต ({ly} × {g})',
          runRate: 'Run-rate × Seasonality ({rr} × {si})'
        },
        prior: 'ปีก่อน {ly} ชิ้น · {diff}',
        priorNone: 'ไม่มียอดขายปีก่อนในหน่วยขายนี้',
        anomaly: { up: 'สูงกว่าเดือนเดียวกันปีก่อนเกิน {pct}', down: 'ต่ำกว่าเดือนเดียวกันปีก่อนเกิน {pct}' },
        gpPromo: 'GP ช่วง Promotion ถ่วงแล้ว {gp}'
      }
    },

    pages: {

      template: {
        title: 'Module ใหม่ (Template)',
        lead: ['โครงตั้งต้นสำหรับสร้าง Module ใหม่ ดูขั้นตอนใน README.md'],
        approve: ['ตัวอย่างกล่องสิ่งที่ต้องการให้อนุมัติ']
      },

      // Workflow ทั้งหน้า: Sales Director จัดทำ → Management อนุมัติ
      topDown: {
        title: 'จัดสรรเป้าหมายประจำปี',
        short: 'เป้าหมายประจำปี',
        titleTip: 'การจัดสรรแบบ Top-down',
        lead: ['กำหนดเป้าหมาย Net Sales ประจำปี และจัดสรรให้แต่ละ Channel และหน่วยขาย'],
        workflowTitle: 'แผน Top-down ปี {year}',
        totalLabel: 'Total Target',
        columns: {
          name: 'ชื่อ',
          pctTotal: '% ของ Total',
          pctTotalTip: 'สัดส่วนเทียบกับ Total Target · แถว Channel กรอกที่คอลัมน์นี้ · แถวหน่วยขาย = % ใน Channel × % ของ Total ของ Channel',
          pctChannel: '% ใน Channel',
          pctChannelTip: 'สัดส่วนของหน่วยขายเทียบกับเป้าหมายของ Channel นั้น',
          amount: 'เป้าหมาย (บาท)',
          growth: 'การเติบโต',
          manage: 'จัดการ'
        },
        remainingTotal: 'คงเหลือระดับ Total',
        remainingIn: 'คงเหลือใน {channel}',
        usePriorShares: 'เติมตามสัดส่วนปีก่อน',
        usePriorSharesTitle: 'กำหนดสัดส่วนตามยอดขายปีก่อน (รายการที่ไม่มียอดขายปีก่อนได้ 0%)',
        normalize: 'กระจายตามสัดส่วนปัจจุบัน',
        normalizeTitle: 'ปรับสัดส่วนของทุกรายการในกลุ่มตามสัดส่วนเดิมให้รวมเป็น 100%',
        addChannel: '+ เพิ่ม Channel',
        addChannelPlaceholder: 'เลือก Channel',
        noMoreChannels: 'Channel ใน Channel Master อยู่ในแผนครบแล้ว',
        addPlaceholder: 'เลือกจาก Master',
        noMoreUnits: 'เพิ่มจาก Master ครบแล้ว',
        removeUnitConfirm: 'นำ {name} ออกจากแผนปี {year}',
        removeUnitLine: 'สัดส่วน {pct} · เป้าหมาย {amount} บาท จะถูกนำออกจากแผน',
        removeChannel: 'นำ Channel ออกจากแผน',
        removeChannelConfirm: 'นำ {name} และทุกรายการใน Channel นี้ออกจากแผนปี {year}',
        removeChannelLine: 'เป้าหมาย {amount} บาท · {count} รายการ จะถูกนำออกจากแผน',
        collapseTitle: 'ย่อหรือขยายรายการใน Channel นี้',
        wfTitle: 'ที่มาของการเติบโต (ล้านบาท)',
        wfStart: 'ยอดขายปี {year}',
        wfEnd: 'Total Target {year}',
        wfTip: '{name}: เป้าหมาย {target} · ยอดขายปี {year} {prior} ล้านบาท',
        wfAxis: 'แกนเริ่มที่ {value} ล้านบาท · ตัวเลขท้ายแท่ง = ส่วนต่างเทียบปีก่อน',
        shareTitle: 'สัดส่วน Channel ปี {prior} เทียบปี {year}',
        shareTip: '{name} {pct}',
        unallocated: 'ยังไม่จัดสรร',
        overAllocated: 'จัดสรรเกิน',
        exportSpec: {
          file: 'Top-down_{year}_{status}_{date}', sheet: 'Top-down',
          cols: { channel: 'Channel', level: 'ระดับ', unitType: 'ประเภทหน่วย', unit: 'หน่วยขาย', owner: 'ผู้รับผิดชอบปัจจุบัน', prior: 'ยอดขายปี {year} (บาท)',
            pctOfTotal: '% ของ Total', pctInChannel: '% ใน Channel', amount: 'เป้าหมาย (บาท)', growth: 'การเติบโต (%)', growthAmount: 'การเติบโต (บาท)' },
          levels: { channel: 'Channel', unit: 'หน่วยขาย', total: 'Total', remaining: 'คงเหลือ' }
        },
        summaryLines: {
          total: 'Total Target {amount} บาท',
          channel: '{name} {pct} = {amount} บาท · {count} รายการ'
        }
      },

      // Workflow ต่อ Account/เขต: ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ
      phasing: {
        title: 'จัดสรรเป้าหมายรายเดือน',
        short: 'เป้าหมายรายเดือน',
        titleTip: 'Phasing',
        lead: ['กระจายเป้าหมายประจำปีของหน่วยขายเป็นรายเดือน โดยใช้สัดส่วนยอดขายปีก่อนเป็นค่าตั้งต้น'],
        workflowTitle: ' Phasing ของ {unit}',
        resetButton: 'คืนค่าตามสัดส่วนปีก่อน',
        exportSpec: { file: 'Phasing_{year}_{unit}_{status}_{date}', sheet: 'Phasing', cols: { month: 'เดือน', growth: 'การเติบโตเทียบปีก่อน (%)' }, remaining: 'คงเหลือ' },
        noChannels: 'แผนของปีนี้ยังไม่มี Channel',
        noUnitsInChannel: 'Channel {channel} ในแผนปี {year} ยังไม่มี {unit}',
        goTopDown: 'ไปที่หน้าจัดสรรเป้าหมายประจำปี',
        rows: { month: 'เดือน', owner: 'ผู้รับผิดชอบ', prior: 'ยอดขายปี {year} (บาท)', pct: 'สัดส่วนรายเดือน (%)', amount: 'เป้าหมาย Net Sales (บาท)', growth: 'การเติบโตเทียบปีก่อน' },
        totalColumn: 'รวมทั้งปี',
        defaultTip: 'ค่าตั้งต้น {pct}',
        legendTarget: 'เป้าหมายปีนี้',
        legendPrior: 'ยอดขายปีก่อน',
        basisTag: { channel: 'ค่าตั้งต้นใช้ Seasonality ของ Channel', flat: 'ไม่มียอดขายปีก่อน ค่าตั้งต้นเท่ากันทุกเดือน' },
        summaryLines: { annual: 'เป้าหมายทั้งปี {amount} บาท', months: 'รวม 12 เดือน {pct} = {sum} บาท', remaining: 'คงเหลือ: {remaining}' }
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
          listedCount: 'Listing (หน่วยขาย)', sellIn: 'ราคาขายเข้า {channel} (บาท)', updatedAt: 'แก้ไขล่าสุด'
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
          types: { RSP: 'RSP', SELL_IN: 'ราคาขายเข้า' }, allChannels: 'ทุก Channel', accountOnly: 'เฉพาะ {unit}', open: 'ปัจจุบัน',
          add: '+ ราคาใหม่', addTitle: 'เพิ่มราคาใหม่ (ราคาเดิมปิดช่วงให้อัตโนมัติ)', addSubmit: 'เพิ่มราคา',
          errors: { price: 'ราคาต้องมากกว่า 0', date: 'วันที่มีผลต้องหลังราคาเดิมทุกรายการ' },
          promosTitle: 'Promotion ที่เกี่ยวข้อง', promosEmpty: 'ยังไม่มี Promotion ของ SKU นี้', promoLink: 'เปิดหน้า Promotion Price',
          promoLine: '{name} · {dates} · {value} · {status}'
        },
        listing: {
          launch: 'วันเริ่มขาย', listedTitle: 'หน่วยขายที่ Listing ({n})', listedEmpty: 'ยังไม่ได้ Listing',
          listingLink: 'แก้ไข Listing ที่หน้า Listing และวันเริ่มขาย', clearance: 'Clearance', clearanceNone: 'ไม่มี',
          clearanceText: '{from} – {to} · Stock {stock} ชิ้น', discontinue: 'เดือนเลิกขาย', discontinueNone: 'ยังขายอยู่',
          timelineTitle: 'Status ปี {year}', npdLink: 'แผน NPD: {stage} · {status}'
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
        stages: { plan: 'วางแผน', concept: 'อนุมัติแนวคิด', production: 'เตรียมผลิต', ready: 'พร้อมขาย', launched: 'เปิดตัวแล้ว' },
        stageAuto: 'ระบบตั้งให้เมื่อถึงวันเปิดตัว',
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
        openSkuPlan: 'เปิดหน้าวางแผนยอดขายราย SKU ของ {unit}',
        productLink: 'เปิดรายละเอียดสินค้า',
        approvedEffect: 'อนุมัติแล้ว: ตั้งวันเริ่มขายและ Listing ให้อัตโนมัติ และเดือนเริ่มขายเป็นค่าตั้งต้นในหน้าวางแผนราย SKU',
        launchMovedNote: 'เลื่อนวันเปิดตัวหลังอนุมัติ: แผนกลับเป็นฉบับร่าง และแผน SKU ที่อนุมัติแล้วของหน่วยขายที่วางแผนเป็น "ต้องตรวจสอบใหม่"',
        summaryLines: { launch: 'วันเปิดตัว {date}', accounts: 'หน่วยขายที่วางแผน {n} หน่วย', stage: 'ขั้น {stage}' },
        editHint: 'กดแก้ไขที่หัวหน้าเพื่อแก้แผน NPD'
      },

      // Product Master · Promotion Price (modules/promotions)
      promotionPrice: {
        title: 'Promotion Price',
        lead: ['ราคาโปรโมชันราย SKU รายหน่วยขาย ตามช่วงเวลา'],
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
        selectRow: 'เลือกทั้งแถว',
        selectColumn: 'เลือกทั้งคอลัมน์ {unit} (เฉพาะแถวที่แสดง)',
        noMatch: 'ไม่พบ SKU ตามเงื่อนไข',
        noUnits: 'Channel นี้ยังไม่มีหน่วยขายใน Master',
        listedCount: 'Listing {n} หน่วย',
        roleHint: { product: 'ทีม Product: แก้ไข Listing', supply: 'Supply Chain: แก้ไข Clearance' },
        launchHint: 'แก้ไขวันเริ่มขายได้ที่รายการสินค้าหรือแผน NPD'
      },

      // Product Master · หมวดสินค้าและ Series (modules/taxonomy)
      taxonomy: {
        title: 'หมวดสินค้าและ Series',
        lead: ['รายการหมวดสินค้าและ Series ที่ใช้อ้างอิงในข้อมูลสินค้า'],
        tabs: { category: 'หมวดสินค้า', series: 'Series' },
        hint: 'ลำดับชั้น: {levels}',
        levels: { CATEGORY: 'Category', SUB_CATEGORY: 'Sub Category', TYPE: 'Type', SERIES: 'Series', SUB_SERIES: 'Sub Series' },
        columns: { name: 'ชื่อ', level: 'ระดับ', count: 'จำนวน SKU', active: 'การใช้งาน', order: 'ลำดับ', manage: 'จัดการ' },
        addRoot: { category: '+ เพิ่ม Category', series: '+ เพิ่ม Series' },
        addChild: '+ {level}',
        addChildTitle: 'เพิ่ม {level} ภายใต้ {name}',
        newName: '{level} ใหม่',
        moveUp: 'เลื่อนขึ้น',
        moveDown: 'เลื่อนลง',
        removeTitle: 'ลบรายการ',
        removeConfirm: 'ลบ {name} ออกจากรายการ',
        cannotRemove: 'ลบ {name} ไม่ได้',
        inUseLine: 'มี SKU ใช้อยู่ {n} รายการ',
        hasChildrenLine: 'มีรายการย่อย {n} รายการ',
        useInactive: 'ปิดใช้งานแทนการลบ: เลือกใหม่ในฟอร์มสินค้าไม่ได้ แต่สินค้าเดิมยังแสดงชื่อได้',
        deactivate: 'ปิดใช้งาน',
        activeYes: 'ใช้งาน',
        activeNo: 'ปิดใช้งาน',
        collapseTitle: 'ย่อหรือขยายรายการย่อย',
        empty: 'ยังไม่มีรายการ'
      },

      // Workflow ต่อ Account/เขต: แผนครั้งแรก (sku) และ Re-forecast (forecast) แยกกัน
      skuPlanning: {
        title: 'วางแผนยอดขายราย SKU',
        short: 'แผนยอดขายราย SKU',
        titleTip: 'การวางแผนแบบ Bottom-up',
        lead: ['วางแผนจำนวนขายราย SKU รายเดือน และเปรียบเทียบกับเป้าหมายรายเดือน'],
        workflowTitle: { initial: 'แผน SKU ของ {unit}', reforecast: 'Re-forecast ของ {unit}' },
        noChannels: 'แผนของปีนี้ยังไม่มี Channel',
        noUnitsInChannel: 'Channel {channel} ในแผนปี {year} ยังไม่มี {unit}',
        goTopDown: 'ไปที่หน้าจัดสรรเป้าหมายประจำปี',
        viewLabel: 'มุมมอง',
        modeLabel: 'โหมด',
        blockedReason: 'ขาดข้อมูลจำเป็น: {fields} · แก้ไขได้ที่รายการสินค้า',
        productTip: {
          category: 'หมวดสินค้า', series: 'Series', rsp: 'RSP', rspValue: '{price} บาท (ณ {date})', noRsp: 'ยังไม่มีราคา',
          accountPrice: 'ราคาเฉพาะ {unit}', dealer: 'ราคา Dealer', status: 'Status ปี {year}'
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
        showLastYear: 'แสดงยอดปีก่อน',
        showLastYearTip: 'แสดงยอดเดือนเดียวกันปีก่อนใต้ตัวเลข และคอลัมน์ปีก่อน / การเติบโต',
        lyColumn: 'ปีก่อน',
        lyColumnTip: 'ยอดขายปี {year} ของ SKU ในแผน (ไม่รวม SKU ที่ไม่อยู่ในแผน)',
        growthColumn: 'การเติบโต',
        groupRows: { active: 'สินค้าที่วางขายแล้ว', 'new': 'สินค้าใหม่ (New) ปี {year}', clearance: 'Clearance', discontinued: 'เลิกขายระหว่างปี', all: 'ทุก SKU', noSeries: '(ไม่ระบุ Series)' },
        groupSearchCount: '{n} จาก {total} รายการ',
        groupToggle: 'พับหรือกางกลุ่ม {group}',
        selectRow: 'เลือก {sku}',
        selectGroup: 'เลือกทุก SKU ในกลุ่ม {group}',
        // CR-11: เครื่องมือช่วยกรอก (โหมดแก้ไข)
        method: {
          button: 'ค่าตั้งต้น: {name} ▾',
          title: 'วิธีเติมยอดของช่องระบบเติม',
          names: { lastYear: 'ยอดปีก่อน × การเติบโต', runRate: 'Run-rate × Seasonality' },
          confirmTitle: 'เปลี่ยนค่าตั้งต้นของ {unit} เป็น {name}',
          confirmLine: 'ค่าในช่องที่ระบบเติมจะถูกคำนวณใหม่ ช่องที่แก้ไขเองจะไม่เปลี่ยน'
        },
        bulk: { selected: 'เลือก {n} รายการ', scale: 'ปรับ ±%', lastYear: 'ตั้งเท่ายอดปีก่อน', reset: 'คืนค่าตั้งต้น', clear: 'ล้างค่า', unselect: 'ยกเลิกการเลือก' },
        rowMenu: { title: 'คำสั่งของ {sku}', reset: 'คืนค่าตั้งต้น', lastYear: 'ตั้งเท่ายอดปีก่อน', scale: 'ปรับเพิ่ม/ลด %', clear: 'ล้างค่า' },
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
        // CR-11: SKU ที่ไม่อยู่ในแผนแต่มียอดขายปีก่อน (ที่มาของส่วนต่าง)
        notInPlan: {
          discontinued: 'เลิกขายก่อนปี {year} {n} รายการ (ยอดขายปี {prior} {amount} บาท)',
          incomplete: 'ขาดข้อมูลจำเป็น {n} รายการ (ยอดขายปี {prior} {amount} บาท · แก้ไขได้ที่รายการสินค้า)',
          title: 'SKU ที่มียอดขายปี {prior} แต่ไม่อยู่ในแผน: {names}'
        },
        priceChanged: 'ราคาเปลี่ยนจาก Baseline {n} เดือน',
        priceChangedTitle: 'ราคาหรือ Promotion ที่มีผลต่างจากตอนล็อก Baseline · Target Baseline และ Plan Baseline ใช้ราคาตอนล็อก แผนล่าสุดใช้ราคาปัจจุบัน',
        exportSpec: {
          file: 'SKU-Plan_{year}_{unit}_{status}_{date}', sheet: 'SKU Plan',
          cols: { rowType: 'ประเภทแถว', sku: 'SKU', name: 'ชื่อสินค้า', series: 'Series', status: 'Status', start: 'เดือนเริ่มขาย', total: 'ทั้งปี' },
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
        addEmpty: 'ไม่มี SKU ที่ Listing แล้วแต่ยังไม่อยู่ในแผน',
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
        legend: { override: 'Override', actual: 'Actual', frozen: 'ล็อก M+1–M+3', promo: 'มี Promo บางวัน', dirty: 'ยังไม่บันทึก', anomaly: 'ต่างจากเดือนเดียวกันปีก่อนเกิน ±{pct}' },
        sellOutNote: 'Sell-out Amount ก่อน VAT · เป้าหมาย = Net Sales ÷ (1 − GP)',
        summaryLines: { plan: 'แผนทั้งปี {plan} บาท', target: 'เป้าหมายทั้งปี {target} บาท', remaining: 'คงเหลือ: {remaining}', skus: '{n} SKU ในแผน' }
      },

      // Account Master (workflowBar แบบง่าย)
      accounts: {
        title: 'Account',
        lead: ['ข้อมูล Account และ GP ตามช่วงเวลาที่มีผล'],
        filterAll: 'ทุก Channel',
        gpColumn: '{label} (%)',
        columns: { name: 'ชื่อ Account', channel: 'Channel', gp: 'GP / ค่าธรรมเนียม (%)', gpFrom: 'มีผลตั้งแต่', active: 'การใช้งาน', owner: 'ผู้รับผิดชอบปัจจุบัน', inPlan: 'แผนปี {year}', manage: 'จัดการ' },
        noGP: 'Channel นี้ไม่มี GP',
        activeYes: 'ใช้งาน',
        activeNo: 'ปิดใช้งาน',
        inPlanYes: 'อยู่ในแผน',
        addButton: '+ เพิ่ม Account',
        addTitle: 'เพิ่ม Account ใหม่',
        addFields: { name: 'ชื่อ Account', channel: 'Channel', gp: 'GP (%)', gpFrom: 'มีผลตั้งแต่' },
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

      territories: {
        title: 'เขตการขาย ({territoryChannels})',
        lead: ['ข้อมูลเขตการขายของ {territoryChannelsFull}'],
        columns: { name: 'ชื่อเขต', channel: 'Channel', active: 'การใช้งาน', owner: 'ผู้รับผิดชอบปัจจุบัน', prior: 'ยอดขายปีก่อน (ล้านบาท)', inPlan: 'แผนปี {year}', manage: 'จัดการ' },
        activeYes: 'ใช้งาน',
        activeNo: 'ปิดใช้งาน',
        inPlanYes: 'อยู่ในแผน',
        addButton: '+ เพิ่มเขต',
        addTitle: 'เพิ่มเขตการขายใหม่',
        addFields: { name: 'ชื่อเขต', channel: 'Channel' },
        addSubmit: 'เพิ่ม',
        addCancel: 'ยกเลิก',
        addErrorRequired: 'กรุณากรอกชื่อเขต',
        empty: 'ยังไม่มี Channel ที่แบ่งเป้าตามเขตใน Channel Master',
        ownerHint: 'กำหนดผู้รับผิดชอบที่หน้าผู้รับผิดชอบ',
        removeTitle: 'ลบเขต',
        removeConfirm: 'ลบ {name} ออกจาก Master',
        removeBlocked: 'เขตนี้อยู่ในแผน มียอดขายย้อนหลัง หรือมีประวัติผู้รับผิดชอบ ให้ปิดใช้งานแทนการลบ'
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
        assignNote: 'การเปลี่ยนผู้รับผิดชอบไม่เปลี่ยนเป้าหมายและ Forecast',
        perfTitle: 'ผลงานรายบุคคล ปี {year}',
        perfColumns: { name: 'Sales Person', months: 'ช่วงที่รับผิดชอบ', units: 'รายการที่ดูแล', target: 'Target Baseline (บาท)', targetToDate: 'เป้าหมายถึง {month} (บาท)', actual: 'Actual ถึง {month} (บาท)', achievement: '% ความสำเร็จ' },
        perfNote: 'คำนวณเฉพาะเดือนที่แต่ละคนรับผิดชอบ · Actual นับถึงเดือนปัจจุบันจำลอง',
        perfEmpty: 'ยังไม่มีผู้รับผิดชอบในปีนี้'
      },

      // ขั้นที่ 4 (CR-12): แท็บติดตามสถานะ (งานที่ต้องทำ ไม่พิมพ์) | รายงานสรุปแผน (ประกาศและหลักฐานข้อตกลง พิมพ์ได้)
      summary: {
        title: 'รายงานสรุปแผน',
        short: 'รายงานสรุปแผน',
        lead: ['ติดตามสถานะการอนุมัติ และสรุปแผนสำหรับประกาศและเป็นหลักฐานข้อตกลง'],
        tabLabel: 'มุมมองของขั้นที่ 4',
        tabs: { status: 'ติดตามสถานะ', report: 'รายงานสรุปแผน' },
        tabTips: {
          status: 'รายการที่ต้องดำเนินการก่อนล็อก Baseline (ไม่ใช่เอกสารสำหรับพิมพ์)',
          report: 'รายงานสำหรับประกาศและเป็นหลักฐานข้อตกลง พิมพ์ / บันทึก PDF ได้'
        },
        tabCountTip: 'รายการที่ต้องดำเนินการ {n} รายการ',
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
          topDownPending: 'จัดสรรเป้าหมายประจำปียังไม่ได้รับอนุมัติ ({status})',
          topDownApproved: 'จัดสรรเป้าหมายประจำปี: อนุมัติแล้ว {at} โดย {by}',
          notLocked: 'ยังไม่ล็อก Baseline · แผน SKU อนุมัติแล้ว {done}/{total} หน่วยขาย',
          locked: 'ล็อก Baseline แล้ว {at} โดย {by} · รายงานฉบับที่ {code}',
          versions: 'รายงานที่เคยล็อก: {list}'
        },
        lockButton: 'ล็อก Baseline {year}',
        lockConfirm: 'ล็อก Baseline ปี {year}',
        lockLines: [
          'แผน SKU ที่อนุมัติแล้วทุกรายการจะเป็น Baseline ทั้งปี ใช้วัดผลงานตลอดปี',
          'หลังล็อก จัดสรรเป้าหมายประจำปี จัดสรรเป้าหมายรายเดือน และแผนครั้งแรกจะแก้ไขไม่ได้',
          'ระหว่างปีปรับได้เฉพาะ Re-forecast (ล็อก M+1 ถึง M+3)',
          'รายงานสรุปแผนฉบับที่ {code} จะใช้ตัวเลข ณ เวลาที่ล็อก'
        ],
        lockTotals: 'Total Target {target} บาท · แผนรวม {plan} บาท · {n} หน่วยขาย',
        lockPending: 'แผน SKU ยังไม่อนุมัติ {n} หน่วยขาย',
        lockTopDownPending: 'จัดสรรเป้าหมายประจำปียังไม่ได้รับอนุมัติ',
        lockDirectorOnly: 'เฉพาะ Sales Director',
        unlockButton: 'ปลดล็อก Baseline',
        unlockConfirm: 'ปลดล็อก Baseline ปี {year}',
        unlockLines: [
          'รายงานฉบับที่ {code} ยังอยู่ในประวัติ',
          'เปิดให้แก้ไขแผนได้อีกครั้ง เมื่อล็อกใหม่จะเป็นรายงานฉบับถัดไป'
        ],
        unlockNote: 'เหตุผลที่ปลดล็อก (จำเป็น)',
        unlockNoteRequired: 'กรุณาระบุเหตุผลก่อนปลดล็อก',
        actionsTitle: 'รายการที่ต้องดำเนินการ',
        actionsCount: '{n} หน่วยขาย',
        actionFilters: {
          channel: 'Channel', channelAll: 'ทุก Channel',
          owner: 'ผู้รับผิดชอบ', ownerAll: 'ทุกคน', ownerNone: 'ยังไม่มีผู้รับผิดชอบ',
          gapOnly: 'เฉพาะที่มีส่วนต่าง'
        },
        actionColumns: { channel: 'Channel', unit: 'หน่วยขาย', owner: 'ผู้รับผิดชอบ', gap: 'ส่วนต่าง (ล้านบาท)', phasing: 'เป้าหมายรายเดือน', sku: 'แผน SKU', next: 'การดำเนินการถัดไป' },
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
        nextTip: 'ไปที่หน้า{page} · {name}',
        openPlan: 'เปิดหน้าวางแผนยอดขายราย SKU ของ {name}',
        actionsNone: 'ไม่มีรายการที่ต้องดำเนินการ',
        actionsNoneFiltered: 'ไม่มีรายการตามตัวกรองที่เลือก',

        // ---------- แท็บรายงานสรุปแผน ----------
        docTitle: 'รายงานสรุปแผน {year}',
        version: 'ฉบับที่ {code}',
        statusLocked: 'สถานะ: อนุมัติแล้ว · ล็อก Baseline {at} โดย {by}',
        statusDraft: 'สถานะ: ฉบับร่าง · ยังไม่ได้รับอนุมัติ',
        topDownLine: {
          approved: 'จัดสรรเป้าหมายประจำปี: อนุมัติแล้ว {at} โดย {by}',
          submitted: 'จัดสรรเป้าหมายประจำปี: รออนุมัติ · ส่งเมื่อ {at} โดย {by}',
          other: 'จัดสรรเป้าหมายประจำปี: {status}'
        },
        printedAt: 'พิมพ์เมื่อ {at}',
        snapshotNote: 'ตัวเลขในรายงานนี้มาจาก Baseline ที่ล็อกไว้',
        draftNote: 'ฉบับร่าง: ตัวเลขเป็นข้อมูลล่าสุดที่ยังแก้ไขได้',
        watermark: 'ฉบับร่าง · ยังไม่ได้รับอนุมัติ',
        kpi: {
          target: 'Total Target',
          targetSub: 'การเติบโตเทียบปีก่อน {growth}',
          plan: 'แผน Bottom-up รวม',
          planSub: '{pct} ของเป้าหมาย',
          gap: 'ส่วนต่างจากเป้าหมาย',
          approval: 'ความคืบหน้าการอนุมัติ',
          approvalValue: '{done} / {total}',
          approvalSub: 'หน่วยขายที่แผน SKU อนุมัติแล้ว'
        },
        monthlyTitle: 'เป้าหมายเทียบแผน รายเดือน (ล้านบาท)',
        monthlyLegend: { bar: 'เป้าหมาย (Top-down Phasing)', line: 'แผน Bottom-up', dashed: 'ยอดขายปี {year}' },
        monthlyEnd: { line: 'แผน', dashed: 'ปี {year}' },
        monthlyTip: { target: 'เป้าหมาย', plan: 'แผน', gap: 'ส่วนต่าง', prior: 'ยอดขายปี {year}' },
        wfAxis: 'แกนเริ่มที่ {value} ล้านบาท',
        tableTitle: 'เป้าหมายและแผนราย Channel และหน่วยขาย (ล้านบาท)',
        tableColumns: { name: 'Channel / หน่วยขาย', target: 'เป้าหมาย', pctOfTotal: '% ของ Total', plan: 'แผน Bottom-up', gap: 'ส่วนต่าง', approval: 'สถานะอนุมัติ', owner: 'ผู้รับผิดชอบ' },
        pctOfTotalTip: 'สัดส่วนเป้าหมายเทียบ Total Target',
        approvalHeadTip: 'ไอคอนซ้าย = จัดสรรเป้าหมายรายเดือน (Phasing) · ไอคอนขวา = แผน SKU',
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
        approvalsNote: 'จากประวัติการอนุมัติของแต่ละขั้นตอน · รายการที่ยังไม่อนุมัติแสดงสถานะแทนผู้อนุมัติ',
        approvalsColumns: { step: 'ขั้นตอน', unit: 'หน่วยขาย', submittedBy: 'ผู้ส่ง', submittedAt: 'วันที่ส่ง', approvedBy: 'ผู้อนุมัติ', approvedAt: 'วันที่อนุมัติ' },
        approvalsAll: 'ทุกหน่วยขาย',
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
          'อนุมัติทีละขั้น (Top-down, Phasing, แผน SKU) แล้วล็อก Baseline ทั้งปี และ Re-forecast รายเดือน',
          'ข้อมูลหลัก 3 ระบบ: Sales Planning, Product Master และ Account Master (Account, เขตการขาย, ผู้รับผิดชอบรายเดือน)',
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
          { topic: 'TT ตามเขต', decision: 'TT แบ่งเป้าตามเขตการขาย เป้าหมายของเขต = Quota การแบ่งลงร้านค้าหรือสาขาเป็นงานของ Sales Person' },
          { topic: 'เป้าหมายผูกกับ หน่วยขาย', decision: 'เป้าหมาย ยอดขาย และยอดขายปีก่อนผูกกับ Account หรือเขต ไม่ผูกกับบุคคล การเปลี่ยนผู้รับผิดชอบไม่เปลี่ยน Target และ Forecast' },
          { topic: 'ผู้รับผิดชอบ', decision: 'เก็บเป็นช่วงเดือน 1 รายการ 1 เดือนมีได้ 1 คน ช่วงห้ามทับกัน แก้ไขเดือนที่ผ่านไปแล้วไม่ได้ ผู้ที่ลาออกแล้วนับเป็นไม่มีผู้รับผิดชอบ' },
          { topic: 'ผลงานรายบุคคล', decision: 'รวมเป้าหมายและยอดขายของทุกรายการ เฉพาะเดือนที่บุคคลนั้นรับผิดชอบ รวมถึงผู้ที่ลาออกแล้ว' },
          { topic: 'ปีแผน', decision: 'ข้อมูลแผนแยกตามปี ทุกแถวแสดงยอดขายปีก่อนและการเติบโต และเติมสัดส่วนตามยอดขายปีก่อนได้' },
          { topic: 'หน่วยขายในแผน', decision: 'เพิ่มหรือนำออกจากแผนได้จาก Account Master หรือ Territory Master เท่านั้น ไม่พิมพ์ชื่อเอง' },
          { topic: 'Phasing', decision: 'ค่าตั้งต้นของเป้าหมายรายเดือน = เป้าหมายทั้งปี × สัดส่วนยอดขายรายเดือนของปีก่อน (ไม่มีข้อมูลใช้ Seasonality ของ Channel) ไม่ปรับเดือนอื่นอัตโนมัติ แต่ผลรวมต้องเท่าเป้าหมายทั้งปี' },
          { topic: 'อนุมัติต่อขั้น', decision: 'Top-down: Sales Director จัดทำ → Management อนุมัติ / Phasing และแผน SKU: ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ / ขั้นล่างจัดทำฉบับร่างได้ก่อน แต่ส่งได้เมื่อขั้นบนอนุมัติแล้ว / ขั้นบนอนุมัติใหม่และเป้าหมายเปลี่ยน → ขั้นล่างเป็น "ต้องตรวจสอบใหม่"' },
          { topic: 'แก้ไข / บันทึก / ยืนยัน', decision: 'ทุกหน้าเปิดเป็นโหมดดู ต้องกดแก้ไขก่อน แล้วบันทึกหรือยกเลิก / ส่งอนุมัติและอนุมัติมีกล่องยืนยันที่สรุปตัวเลข / ส่งไม่ได้หากยังจัดสรรไม่ครบ / ส่งกลับแก้ไขต้องระบุเหตุผล / บทบาทที่แก้ไขไม่ได้เห็นข้อความอ่านอย่างเดียว' },
          { topic: 'Baseline', decision: 'แผนผ่านการอนุมัติครั้งเดียว แล้ว Sales Director ล็อกเป็น Baseline ทั้งปีในรายงานสรุปแผนเมื่อแผน SKU ทุกรายการอนุมัติแล้ว พร้อม Snapshot ราคาและ GP' },
          { topic: 'Forecast', decision: 'หลังล็อก Baseline ปรับได้เฉพาะ Re-forecast (มี Workflow แยก) ล็อก M+1 ถึง M+3 ปรับได้ตั้งแต่ M+4 เดือนที่ผ่านแล้วใช้ Actual ขอแก้ไขเดือนที่ล็อกเป็น Exception ผ่าน Director' },
          { topic: 'Status สินค้า', decision: 'Planned / New (3 เดือนนับจากวันเริ่มขาย) / Active / Clearance (มาก่อนเสมอ) / Discontinued คำนวณจากวันที่เท่านั้น' },
          { topic: 'Clearance', decision: 'มาก่อน Status อื่นเสมอ แบ่ง Stock เท่ากันทุกเดือน ผลรวมเท่า Stock' },
          { topic: 'วิธีเติมยอด', decision: 'ดูที่ SKU × หน่วยขาย มี 4 แบบ: ล็อก 0 / กรอกเอง / ระบบเติม / Clearance สีของช่องบอกที่มาของตัวเลข' },
          { topic: 'แผนราย SKU', decision: 'กรอกเป็นจำนวนชิ้น ระบบแปลงเป็น Sell-out Amount และ Net Sales แก้ไขช่องระบบเติมและ Clearance ได้ (Override) ยกเว้นช่องล็อก 0 / คงเหลือรายเดือน = เป้าหมาย − แผน' },
          { topic: 'Series', decision: 'จัดกลุ่มตาม Series (หน่วยขายที่มีเกิน 20 SKU) หรือ Status พับได้ มีผลรวมของกลุ่มที่หัวกลุ่ม · Filter Series เลือกได้หลายค่า · คงเหลือเทียบกับเป้าหมายทั้ง Account เสมอ / "เพิ่มทั้ง Series" เพิ่มทุก SKU ของ Series ที่ Listing แล้ว' },
          { topic: 'Product Master', decision: 'ทีม Product กำหนดวันเริ่มขาย Listing และเดือนเลิกขาย / Supply Chain กำหนด Clearance / ทีมขายเห็นเฉพาะ SKU ที่ Listing แล้ว' },
          { topic: 'ข้อมูลสินค้า', decision: 'Product Master เป็นแหล่งข้อมูลเดียว 5 หน้า: รายการสินค้า แผน NPD Promotion Price Listing และหมวดสินค้า/Series / สินค้าที่ขาดข้อมูลจำเป็นใช้ในแผน SKU ไม่ได้' },
          { topic: 'รหัสสินค้า', decision: 'สินค้าใหม่ใช้รหัสชั่วคราวได้ เมื่อได้ TR Code จริงกดผูกรหัส ระบบย้าย Listing ราคา Promotion แผน NPD และแผน SKU ให้ทั้งหมด' },
          { topic: 'แผน NPD', decision: 'ทีม Product ส่ง → Sales Director อนุมัติ / อนุมัติแล้วตั้งวันเริ่มขายและ Listing ให้ และเดือนเริ่มขายเป็นค่าตั้งต้นในแผน SKU' },
          { topic: 'ราคาและ Promotion', decision: 'ราคามีวันที่มีผล / ราคาที่ใช้ในแผน = ราคาเฉลี่ยถ่วงตามจำนวนวันของ Promotion ที่ยืนยันแล้ว / แก้ราคาหลังล็อก Baseline ไม่เปลี่ยน Baseline แต่มีผลกับ Forecast' },
          { topic: 'โหมดแผน', decision: 'สร้างแผนครั้งแรกแก้ไขได้ทุกเดือน / ปรับแผนแก้ไขได้ตั้งแต่ M+4 เดือนที่ผ่านแล้วใช้ Actual และไม่เขียนทับ Baseline' },
          { topic: 'SKU ใหม่', decision: 'กรอกเองทั้งปีในแผนรายปี' },
          { topic: 'ระบบเติม', decision: 'ค่าตั้งต้น = ยอดขายเดือนเดียวกันปีก่อนของ SKU × การเติบโตของหน่วยขาย (เป้าหมายทั้งปี ÷ ยอดขายปีก่อน) คงรูปแบบรายเดือนและสัดส่วน SKU ของปีก่อน · เลือก Run-rate × Seasonality ได้ต่อหน่วยขาย · SKU ที่เลิกขายได้ 0 ส่วนต่างที่เหลือปิดด้วยสินค้าใหม่หรือการปรับเพิ่ม' },
          { topic: 'ข้อมูลสินค้าจริง', decision: 'ใช้รายการสินค้าจริง 117 SKU จาก Excel · ยอดขายปี 2026 ราย SKU ของ 7-Eleven และ EVEANDBOY ปรับสัดส่วนให้ตรงกับยอดขายปีก่อนของ Prototype · หน่วยขายอื่นใช้รูปแบบของ EVEANDBOY · หมวดสินค้ากำหนดจากคำในชื่อสินค้า (ควรตรวจสอบ) · สินค้าใหม่ปี 2027 เป็นชื่อชั่วคราว' },
          { topic: 'ราคาเฉพาะ Account', decision: 'ลำดับราคา: Promotion ที่ยืนยันแล้ว → ราคาเฉพาะ Account → ราคาทั่วไป (เช่น Juicy Pop Tint 02 และ 05 ที่ 7-Eleven 149 บาท) · TT ใช้ราคา Dealer และไม่หัก GP' },
          { topic: 'เครื่องมือช่วยกรอก', decision: 'กรอกยอดทั้งปี · เลือกหลายแถวแล้วปรับ ±% · ตั้งเท่ายอดปีก่อน · ปิดส่วนต่างตามสัดส่วน Net Sales (แสดงก่อน/หลัง ต้องกดยืนยัน) · คัดลอก/วางกับ Excel และย้อนกลับ · ▲/▼ เมื่อต่างจากปีก่อนเกิน 50% · ทุกเครื่องมือไม่แก้ช่องที่ล็อก' },
          { topic: 'Promo บางวัน', decision: 'ใช้ราคาเฉลี่ยถ่วงตามจำนวนวัน' },
          { topic: 'สูตร Net Sales', decision: 'Net Sales = Sell-out Amount ก่อน VAT × (1 − GP) ดูสูตรและค่าที่ใช้ได้ที่ ⓘ และ Tooltip รายช่องในหน้าวางแผนราย SKU' },
          { topic: 'VAT', decision: 'ค่าตั้งต้น: ราคาใน Price List ไม่รวม VAT (รอยืนยัน)' },
          { topic: 'เมนู', decision: 'เมนูข้าง 4 กลุ่ม: Sales Planning (จัดสรรเป้าหมายประจำปี → จัดสรรเป้าหมายรายเดือน → วางแผนยอดขายราย SKU → รายงานสรุปแผน) / Product Master / Account Master / ข้อมูลโครงการ' },
          { topic: 'ชื่อขั้นตอน', decision: 'ชื่อหน้าเป็นภาษาไทยที่สื่อความหมาย: จัดสรรเป้าหมายประจำปี / จัดสรรเป้าหมายรายเดือน / วางแผนยอดขายราย SKU / รายงานสรุปแผน · คำว่า Top-down, Phasing, Bottom-up อยู่ใน Tooltip ของชื่อหน้า · เมนูและปุ่มก่อนหน้า/ถัดไปใช้ชื่อย่อ' },
          { topic: 'ปีแผน', decision: 'เลือกปีแผนที่แถวหัวข้อของหน้าที่อิงปี (ต่อท้ายชื่อหน้า) ไม่อยู่ใน Header / เปลี่ยนในหน้าใดมีผลทุกหน้า / มีรายการที่ยังไม่บันทึกต้องยืนยันก่อนเปลี่ยนปี' },
          { topic: 'สัดส่วนใน Top-down', decision: 'แยก 2 คอลัมน์ที่ฐานชัดเจน: % ของ Total (กรอกที่แถว Channel) และ % ใน Channel (กรอกที่แถวหน่วยขาย) / ค่าตั้งต้นตามสัดส่วนยอดขายปีก่อน' },
          { topic: 'กราฟการเติบโต', decision: 'ที่มาของการเติบโต (Waterfall) และสัดส่วน Channel ปีก่อนเทียบปีนี้ อยู่ในรายงานสรุปแผน · หน้าจัดสรรเป้าหมายประจำปีไม่มีแผงกราฟ ตารางเต็มความกว้าง' },
          { topic: 'เป้าหมายเทียบปีก่อน', decision: 'แท่งใช้สเกลจริงเดียวกันทั้งตาราง เริ่มที่ 0 ค่าสูงสุด = เป้าหมายหรือยอดขายปีก่อนที่มากที่สุดปัดเป็นเลขกลม · ความยาวแท่ง = เป้าหมาย ขีดตั้ง = ยอดขายปีก่อน · มีแกน 0 ถึงค่าสูงสุดที่หัวคอลัมน์ · ใช้ทั้งหน้าจัดสรรเป้าหมายประจำปีและรายงานสรุปแผน' },
          { topic: 'ชื่อหน่วยขาย', decision: 'แต่ละ Channel เรียกหน่วยขายและ GP ตาม Channel Master: Account / เขตการขาย / Platform และ GP / ค่าธรรมเนียม Platform' },
          { topic: 'ส่งออกข้อมูล', decision: 'ส่งออก Excel และ CSV ได้จากหน้าจัดสรรเป้าหมายประจำปี จัดสรรเป้าหมายรายเดือน และวางแผนยอดขายราย SKU ตัวเลขคำนวณต่อได้' },
          { topic: 'รายงานสรุปแผน', decision: 'สำหรับผู้บริหาร: KPI, เป้าหมายเทียบแผนรายเดือน, ตารางราย Channel และ หน่วยขาย, สัดส่วนแผนตามกลุ่มสินค้า, เป้าหมายรายผู้รับผิดชอบ และการอนุมัติ พิมพ์เป็น PDF ได้' },
          { topic: 'ติดตามสถานะแยกจากรายงาน', decision: 'ขั้นที่ 4 มี 2 แท็บ: ติดตามสถานะ (รายการที่ต้องดำเนินการ 1 แถวต่อหน่วยขาย เรียงตามความรุนแรง และปุ่มล็อก Baseline — ไม่พิมพ์) กับรายงานสรุปแผน (ประกาศและหลักฐานข้อตกลง — พิมพ์ได้)' },
          { topic: 'แกนกราฟ', decision: 'กราฟรายเดือนเริ่มที่ 0 ค่าสูงสุดเผื่อ 10% แล้วปัดเป็นเลขกลม · แผน = เส้นทึบมีจุด ยอดปีก่อน = เส้นประ · Waterfall เริ่มแกนที่เลขกลม (เช่น 100 ล้านบาท) แท่งยอดปีก่อนและ Total Target เริ่มจุดเดียวกัน และมีสัญลักษณ์ตัดแกน' },
          { topic: 'รายงานเป็นหลักฐาน', decision: 'ทุกครั้งที่ล็อก Baseline ได้รายงานฉบับใหม่ (2027-BL-01, 02 …) ตัวเลขทั้งหมดมาจาก Baseline ที่ล็อกไว้ พร้อมประวัติการอนุมัติและช่องลงนาม · ก่อนล็อกเป็นฉบับร่างมีลายน้ำทุกหน้า · ปลดล็อกได้โดย Sales Director พร้อมเหตุผล' }
        ],
        openQuestions: [
          'ราคาใน Price List รวม VAT หรือไม่ (ไฟล์ Excel เดิมคำนวณแบบรวม VAT)',
          'TT มี GP หรือไม่ (Channel Master ตั้ง TT เป็นไม่มี GP ไว้ก่อน)',
          'Chayamiss เป็น Channel หรือ Account (Export ตั้งเป็น Channel ตัวอย่างแล้ว)',
          'ระบบจริงใช้งานหลายคนพร้อมกัน ต้องมี Backend',
          'Stock Clearance ระดับ SKU แบ่งให้แต่ละ หน่วยขายอย่างไร (Prototype แบ่งเท่ากันทุกรายการที่ Listing)',
          'แผน SKU ของ TT จัดทำที่ระดับเขตใช่หรือไม่',
          'CN% ของ TT กำหนดต่อเขตหรือทั้ง Channel',
          'การเปลี่ยนผู้รับผิดชอบต้องมีผู้อนุมัติหรือไม่'
        ],
        nextSteps: [
          'ตอบคำถามที่ค้าง และยืนยันเจ้าของข้อมูลแต่ละรายการ',
          'กำหนดรูปแบบ Product Master, Account Master และแหล่งข้อมูลยอดขายย้อนหลัง',
          'ออกแบบระบบจริง: Backend สำหรับหลายผู้ใช้ สิทธิ์ผู้ใช้ตามบทบาท และการนำเข้าข้อมูลจาก Excel เดิม',
          'ทดลองใช้กับ 1–2 หน่วยขาย ก่อนขยายทั้งบริษัท'
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

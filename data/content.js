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
      roleLabel: 'มุมมองผู้ใช้',
      roleNote: '(จำลองสำหรับการนำเสนอ)',
      roleGroupSales: 'Sales Person',
      approveTitle: 'สิ่งที่ต้องการให้อนุมัติ',
      leaveConfirm: 'มีรายการที่ยังไม่บันทึก หากออกจากหน้านี้ รายการดังกล่าวจะหายไป',
      discardConfirm: 'มีรายการที่ยังไม่บันทึก {n} รายการ ต้องการยกเลิกรายการดังกล่าวหรือไม่'
    },

    labels: {
      source: { locked: 'ล็อก 0', manual: 'กรอกเอง', system: 'ระบบเติม', clearance: 'Clearance' },
      sourceShort: { locked: '0', manual: 'กรอก', system: 'ระบบ', clearance: 'Clear' },
      // สถานะคงเหลือ: ขาด = แดง, เกิน = เหลือง, จัดสรรครบ = เขียว, ยังไม่กำหนด = เทา
      alert: { ok: 'จัดสรรครบ', short: 'ขาด', over: 'เกิน', empty: 'ยังไม่กำหนด' },
      remainingText: { ok: 'จัดสรรครบ', short: 'ขาด {amount}', over: 'เกิน {amount}', empty: 'ยังไม่กำหนด' },
      status: { upcoming: 'ยังไม่วางขาย', npd: 'NPD', existing: 'Existing', clearance: 'Clearance', ended: 'เลิกขาย' },
      window: { past: 'ผ่านไปแล้ว', current: 'เดือนปัจจุบัน', locked: 'ล็อก', open: 'ปรับได้' },
      views: { units: 'จำนวนชิ้น', sellOut: 'Sell-out Amount', net: 'Net Sales' },
      remaining: 'คงเหลือ',
      allocated: 'จัดสรรแล้ว',
      target: 'เป้าหมาย',
      of: 'จาก',
      baht: 'บาท',
      units: 'ชิ้น',
      million: 'ล้าน',
      millionBaht: 'ล้านบาท',
      pending: 'รอยืนยัน',
      edited: 'แก้ไขแล้ว',
      defaultValue: 'ค่าตั้งต้น',
      prior: 'ยอดขายปีก่อน',
      growth: 'การเติบโต',
      growthNew: 'ใหม่',
      total: 'รวม',
      other: 'อื่นๆ',
      yes: 'ใช่',
      no: 'ไม่ใช่',
      // ป้ายปีของยอดขายปีก่อน: {year} = ปี, {n} = จำนวนเดือนที่เป็นยอดจริง
      historyTag: { actual: '{year}', actualEst: '{year} (Actual {n}M + Est.)', none: 'ไม่มีข้อมูลปี {year}' },
      // Account หรือเขตการขาย ตาม allocationUnit ของ Channel
      unitType: { ACCOUNT: 'Account', TERRITORY: 'เขต' },
      unitTypeFull: { ACCOUNT: 'Account', TERRITORY: 'เขตการขาย' },
      unitAll: { ACCOUNT: 'รวมทั้ง Account', TERRITORY: 'รวมทั้งเขต' },
      addUnit: { ACCOUNT: '+ Account', TERRITORY: '+ เขต' },
      noUnits: { ACCOUNT: 'ยังไม่มี Account', TERRITORY: 'ยังไม่มีเขตการขาย' },
      unitGeneric: 'Account / เขตการขาย',
      // แถบบริบท (subChannelPicker) หน้า Phasing และวางแผน SKU
      picker: {
        channel: 'Channel',
        unit: 'Account / เขตการขาย',
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
      roles: { management: 'Management', director: 'Sales Director', sales: 'Sales Person' },
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
        waiting: 'อ่านอย่างเดียว · รอผู้จัดทำส่งอนุมัติ (ผู้จัดทำคือ {name})',
        switchToPreparer: 'สลับเป็นมุมมองผู้จัดทำ',
        switchToApprover: 'สลับเป็นมุมมองผู้อนุมัติ',
        switchTitle: 'เปลี่ยนมุมมองผู้ใช้เป็น {name} เพื่อการนำเสนอ',
        reasons: {
          upstream: { phasing: 'ส่งอนุมัติได้หลังจาก Top-down ได้รับอนุมัติ', sku: 'ส่งอนุมัติได้หลังจาก Phasing ของรายการนี้ได้รับอนุมัติ' },
          remaining: { topDown: 'ส่งอนุมัติไม่ได้ เนื่องจากยังจัดสรรไม่ครบ', phasing: 'ส่งอนุมัติไม่ได้ เนื่องจากยังจัดสรรไม่ครบ', sku: 'ส่งอนุมัติไม่ได้ เนื่องจากแผนต่ำกว่าเป้าหมาย' },
          baseline: 'ใช้งานได้หลังจากล็อก Baseline'
        },
        confirm: {
          submit: 'ส่ง{title} ให้ {approver} อนุมัติ',
          approve: 'อนุมัติ{title}',
          'return': 'ส่ง{title} กลับแก้ไข',
          reopen: 'เปิด{title} ให้แก้ไข สถานะจะกลับเป็นฉบับร่าง',
          recall: 'ดึง{title} กลับเป็นฉบับร่าง'
        },
        approveNote: 'หากเป้าหมายของ Account / เขตการขายใดเปลี่ยนจากการอนุมัติครั้งก่อน ขั้นถัดไปของรายการนั้นจะเปลี่ยนเป็น "ต้องตรวจสอบใหม่"',
        returnNote: 'เหตุผลที่ส่งกลับแก้ไข (จำเป็น)',
        noteRequired: 'กรุณาระบุเหตุผลก่อนส่งกลับแก้ไข',
        invalidateNote: { topDown: 'เป้าหมายจาก Top-down เปลี่ยน', phasing: 'เป้าหมายรายเดือนจาก Phasing เปลี่ยน' },
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
        statusTitle: 'Status ระดับ SKU (เหมือนกันทุก Account / เขตการขาย)',
        statusRules: [
          { status: 'npd', text: '3 เดือนแรกนับจากวันเริ่มขาย (เดือนที่เริ่มขายนับเป็นเดือนที่ 1)' },
          { status: 'existing', text: 'พ้นช่วง NPD แล้ว' },
          { status: 'clearance', text: 'ช่วงระบายสต็อกที่ Supply Chain กำหนด มาก่อน Status อื่นเสมอ' },
          { status: 'ended', text: 'หลังเดือนเลิกขาย มีค่าเป็น 0' },
          { status: 'upcoming', text: 'ก่อนวันเริ่มขาย มีค่าเป็น 0' }
        ],
        sourceTitle: 'วิธีเติมยอด ระดับ SKU × Account / เขตการขาย',
        sourceRules: [
          { source: 'locked', text: 'ยังไม่วางขาย ก่อนเดือนเริ่มขาย เลิกขายแล้ว หรือไม่ได้ Listing มีค่าเป็น 0 และแก้ไขไม่ได้' },
          { source: 'manual', text: 'ยังไม่มียอดขายจริง (รวมถึง SKU ใหม่ทั้งปี) ทีมขายเป็นผู้กรอก' },
          { source: 'system', text: 'มียอดขายจริงแล้ว ระบบคำนวณจาก Run-rate × Seasonality Index และแก้ไขได้ (Override)' },
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
          upcoming: 'ยังไม่วางขาย (ก่อนวันเริ่มขายใน Product Master)',
          ended: 'เลิกขายแล้ว'
        }
      }
    },

    // TODO(ร่าง): Claude ร่างไว้ ให้ทีมแก้ให้ตรงกับปัญหาจริงของไฟล์ Excel ปัจจุบัน
    excelProblems: [
      'ไฟล์ Excel แยกต่อ Sub-channel ต้องรวมด้วยมือเพื่อดูภาพรวมทั้งบริษัท',
      'ราคา GP และ Listing ถูกคัดลอกไว้หลายไฟล์ ไม่ทราบว่าไฟล์ใดล่าสุดและใครเป็นเจ้าของ',
      'แยกไม่ออกว่าช่องใดกรอกเองและช่องใดเป็นสูตร สูตรถูกพิมพ์ทับได้ง่าย',
      'ไม่มีจุดแสดงว่าแบ่งเป้าครบแล้วหรือยัง และขาดหรือเกินเท่าใด',
      'ไม่มี Baseline ที่ล็อกไว้ แผนที่อนุมัติแล้วปนกับ Forecast ที่แก้ไขระหว่างปี'
    ],

    pages: {

      template: {
        title: 'Module ใหม่ (Template)',
        lead: ['โครงตั้งต้นสำหรับสร้าง Module ใหม่ ดูขั้นตอนใน README.md'],
        approve: ['ตัวอย่างกล่องสิ่งที่ต้องการให้อนุมัติ']
      },

      home: {
        title: 'ระบบตั้ง Sales Target แบบใหม่',
        lead: [
          'แทนไฟล์ Excel แยกต่อ Sub-channel ด้วยระบบเดียว ที่ทุกทีมใช้ข้อมูลชุดเดียวกัน',
          'เป้าหมายจากผู้บริหาร (Top-down) และแผนจากทีมขาย (Bottom-up) มาเจอกันที่ยอดคงเหลือ'
        ],
        problemsTitle: 'ปัญหาของวิธีปัจจุบัน',
        conceptTitle: 'แนวคิดหลัก: สองทางมาเจอกันที่ยอดคงเหลือ',
        topDown: { title: 'Top-down', unit: 'Net Sales (บาท)', who: 'ผู้บริหาร / Sales Director', steps: ['Total Target', 'Channel', 'Account / เขตการขาย', 'รายเดือน'] },
        bottomUp: { title: 'Bottom-up', unit: 'จำนวนชิ้น', who: 'ทีมขาย / KAM', steps: ['SKU × เดือน (ชิ้น)', '× ราคา = Sell-out Amount', '× (1 − GP) = Net Sales'] },
        meet: { title: 'คงเหลือ', formula: 'เป้าหมาย − แผน', note: 'ดูได้ทุกชั้น ทุกเดือน' },
        tourTitle: 'เนื้อหาใน Tour (10–15 นาที)',
        startTour: 'เริ่ม Tour'
      },

      masterData: {
        title: 'ใครดูแลข้อมูลอะไร',
        lead: [
          'ทุกทีมใช้ข้อมูลหลักชุดเดียวกัน และแต่ละข้อมูลมีเจ้าของเพียงทีมเดียว',
          'ทีมขายไม่ต้องคัดลอกราคา GP หรือ Listing ไว้ในไฟล์ของตนเอง ระบบดึงข้อมูลให้'
        ],
        owners: { product: 'ทีม Product', supply: 'Supply Chain', kam: 'Sales/KAM + Finance', trade: 'Sales/Trade Marketing' },
        rows: [
          { key: 'status', item: 'Status สินค้า', owner: 'product', source: 'Product Master', usedIn: ['productMaster', 'skuPlanning'] },
          { key: 'firstSale', item: 'วันเริ่มขาย', owner: 'product', source: 'Product Master', usedIn: ['productMaster', 'skuPlanning'] },
          { key: 'listing', item: 'Listing ต่อ Account / เขตการขาย', owner: 'product', source: 'Product Master', usedIn: ['productMaster', 'skuPlanning'] },
          { key: 'priceList', item: 'Price List', owner: 'product', source: 'Product Master', usedIn: ['skuPlanning'] },
          { key: 'clearance', item: 'Clearance (Stock และช่วงเดือน)', owner: 'supply', source: 'แผน Clearance', usedIn: ['productMaster', 'skuPlanning'] },
          { key: 'gp', item: 'GP ต่อ Account', owner: 'kam', source: 'Account Master', usedIn: ['accounts', 'skuPlanning'] },
          { key: 'promotion', item: 'Promotion', owner: 'trade', source: 'ปฏิทิน Promotion', usedIn: ['skuPlanning'] }
        ],
        columns: { item: 'ข้อมูล', owner: 'เจ้าของ', source: 'เก็บที่', example: 'ตัวอย่างในเว็บนี้', usedIn: 'ใช้ในหน้า' },
        flowTitle: 'ข้อมูลไหลไปที่แผนของทีมขาย',
        planLabel: 'แผน SKU ของทีมขาย'
      },

      // Workflow ทั้งหน้า: Sales Director จัดทำ → Management อนุมัติ
      topDown: {
        title: 'แบ่งเป้า Top-down',
        lead: ['กำหนดเป้าหมาย Net Sales ประจำปี และจัดสรรให้แต่ละ Channel และ Account / เขตการขาย'],
        workflowTitle: 'แผน Top-down ปี {year}',
        totalLabel: 'Total Target',
        columns: {
          name: 'ชื่อ',
          prior: 'ยอดขายปีก่อน (ล้านบาท)',
          pct: 'สัดส่วน (%)',
          pctTip: 'แถว Channel เทียบกับ Total Target · แถว Account/เขต เทียบกับ Channel',
          amount: 'เป้าหมาย (บาท)',
          growth: 'การเติบโต',
          compare: 'เทียบปีก่อน',
          compareTip: 'ความยาวแท่ง = เป้าหมาย · ขีดตั้ง = ยอดขายปีก่อน · แถว Channel และแถว Account/เขต ใช้สเกลแยกกัน',
          manage: 'จัดการ'
        },
        remainingTotal: 'คงเหลือระดับ Total',
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
        donutTitle: 'สัดส่วน Channel',
        donutRings: 'วงนอก = ปีนี้ · วงใน = ปีก่อน',
        donutCenter: 'จัดสรรแล้ว',
        donutTip: '{name} · ปีนี้ {pct} ({amount} บาท) · ปีก่อน {prior}',
        unallocated: 'ยังไม่จัดสรร',
        summaryLines: {
          total: 'Total Target {amount} บาท',
          channel: '{name} {pct} = {amount} บาท · {count} รายการ'
        }
      },

      // Workflow ต่อ Account/เขต: ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ
      phasing: {
        title: 'กระจายเป้ารายเดือน',
        lead: ['จัดสรรเป้าหมายรายปีเป็นรายเดือน โดยใช้สัดส่วนยอดขายปีก่อนเป็นค่าตั้งต้น'],
        workflowTitle: ' Phasing ของ {unit}',
        resetButton: 'คืนค่าตามสัดส่วนปีก่อน',
        noChannels: 'แผนของปีนี้ยังไม่มี Channel',
        noUnitsInChannel: 'Channel {channel} ในแผนปี {year} ยังไม่มี Account / เขตการขาย',
        goTopDown: 'ไปที่หน้า Top-down',
        rows: { month: 'เดือน', owner: 'ผู้รับผิดชอบ', prior: 'ยอดขายปีก่อน (บาท)', pct: 'สัดส่วนรายเดือน (%)', amount: 'เป้าหมาย Net Sales (บาท)', growth: 'การเติบโตเทียบปีก่อน' },
        totalColumn: 'รวมทั้งปี',
        defaultTip: 'ค่าตั้งต้น {pct}',
        legendTarget: 'เป้าหมายปีนี้',
        legendPrior: 'ยอดขายปีก่อน',
        basisTag: { channel: 'ค่าตั้งต้นใช้ Seasonality ของ Channel', flat: 'ไม่มียอดขายปีก่อน ค่าตั้งต้นเท่ากันทุกเดือน' },
        summaryLines: { annual: 'เป้าหมายทั้งปี {amount} บาท', months: 'รวม 12 เดือน {pct} = {sum} บาท', remaining: 'คงเหลือ: {remaining}' }
      },

      skuStatus: {
        title: 'Status สินค้า กับ วิธีเติมยอด เป็นคนละเรื่อง',
        lead: [
          'Status บอกว่าสินค้าอยู่ช่วงใดของวงจรชีวิต ดูที่ระดับ SKU และเหมือนกันทุกช่องทาง',
          'วิธีเติมยอดดูที่ระดับ SKU × Account / เขตการขาย เพราะ SKU เดียวกันเข้าแต่ละร้านไม่พร้อมกัน'
        ],
        statusTitle: 'Status ระดับ SKU',
        statusRules: [
          { status: 'npd', text: '3 เดือนแรกนับจากวันเริ่มขาย (เดือนที่เริ่มขายนับเป็นเดือนที่ 1)' },
          { status: 'existing', text: 'พ้นช่วง NPD แล้ว' },
          { status: 'clearance', text: 'ช่วงระบายสต็อกที่ Supply Chain กำหนด มาก่อน Status อื่นเสมอ' }
        ],
        sourceTitle: 'วิธีเติมยอด ระดับ SKU × Account / เขตการขาย',
        sourceRules: [
          { source: 'locked', text: 'ยังไม่ Listing หรือเลิกขายแล้ว มีค่าเป็น 0 และแก้ไขไม่ได้' },
          { source: 'manual', text: 'ยังไม่มียอดขายจริง ทีมขายเป็นผู้กรอก' },
          { source: 'system', text: 'มียอดขายจริงแล้ว คำนวณจาก Run-rate × Seasonality Index' },
          { source: 'clearance', text: 'อยู่ในช่วง Clearance คำนวณจาก Stock ÷ จำนวนเดือน' }
        ],
        exampleTitle: 'ตัวอย่าง: SKU A สินค้าใหม่',
        notListedOption: 'ไม่วางขาย',
        exampleHint: 'เปลี่ยนเดือนเริ่มขายหรือเดือน Listing เพื่อดูการเปลี่ยนสี',
        exampleSku: 'A',
        exampleSubChannels: ['shopee', 'watsons', 'tt-north'],
        firstSaleLabel: 'เริ่มขาย',
        listingLabel: 'Listing',
        statusRowLabel: 'Status ของ SKU',
        clearanceTitle: 'ตัวอย่าง: SKU D Clearance มาก่อนเสมอ',
        clearanceSku: 'D',
        clearanceSubChannel: 'shopee',
        conclusionTitle: 'ข้อสรุป: SKU ใหม่ต้องกรอกเองทั้งปีในแผนรายปี',
        conclusion: 'ขณะจัดทำแผนรายปี SKU ใหม่ยังไม่มียอดขายจริงสำหรับคำนวณ Run-rate แม้พ้นช่วง NPD แล้วก็ยังเติมอัตโนมัติไม่ได้ เมื่อมียอดขายจริงแล้วจึงใช้ระบบเติมในรอบ Forecast'
      },

      // โหมดดู/แก้ไข (workflowBar แบบง่าย ไม่มีขั้นอนุมัติ)
      productMaster: {
        title: 'Listing และวันเริ่มขาย',
        lead: ['กำหนดวันเริ่มขายและ Account ที่จำหน่ายสินค้าได้'],
        searchPlaceholder: 'ค้นหา SKU ชื่อ หรือ Series',
        statusFilter: 'Status',
        statusAll: 'ทุก Status',
        columns: { sku: 'SKU / ชื่อ / Series', launch: 'วันเริ่มขาย', status: 'Status ปีแผน', listing: 'Listing ต่อ{unitType}', clearance: 'Clearance', discontinue: 'เลิกขาย', manage: 'จัดการ' },
        clearanceOwner: 'Supply Chain',
        clearanceFrom: 'ตั้งแต่',
        clearanceTo: 'ถึง',
        clearanceStock: 'Stock (ชิ้น)',
        clearanceStockNote: 'Prototype แบ่ง Stock เท่ากันทุกรายการที่ Listing',
        clearanceNone: '–',
        discontinueNone: 'ยังขายอยู่',
        listedMark: '✓',
        noMatch: 'ไม่พบ SKU ตามเงื่อนไข',
        noUnits: 'Channel นี้ยังไม่มีรายการใน Master',
        listedCount: 'Listing {n} รายการ',
        addSku: '+ เพิ่ม SKU',
        addTitle: 'เพิ่ม SKU ใหม่',
        addFields: { sku: 'รหัส SKU', name: 'ชื่อ', series: 'Series', launch: 'วันเริ่มขาย', price: 'ราคา (บาท)' },
        addSubmit: 'เพิ่ม',
        addCancel: 'ยกเลิก',
        addErrorRequired: 'กรุณากรอกรหัส ชื่อ และวันเริ่มขาย',
        addErrorDuplicate: 'มีรหัส SKU นี้แล้ว',
        addedNote: 'SKU ใหม่ยังไม่มี Listing กรุณาเลือก Listing แล้วบันทึก เพื่อให้ทีมขายเห็นในหน้าวางแผน',
        removeSku: 'ลบ SKU',
        removeSkuConfirm: 'ลบ {sku} ออกจาก Product Master',
        removeSkuBlocked: 'ลบได้เฉพาะ SKU ที่ยังไม่มี Listing'
      },

      // Workflow ต่อ Account/เขต: แผนครั้งแรก (sku) และ Re-forecast (forecast) แยกกัน
      skuPlanning: {
        title: 'วางแผนราย SKU',
        lead: ['วางแผนจำนวนขายราย SKU รายเดือน ระบบคำนวณเป็น Net Sales และเปรียบเทียบกับเป้าหมายรายเดือน'],
        workflowTitle: { initial: 'แผน SKU ของ {unit}', reforecast: 'Re-forecast ของ {unit}' },
        noChannels: 'แผนของปีนี้ยังไม่มี Channel',
        noUnitsInChannel: 'Channel {channel} ในแผนปี {year} ยังไม่มี Account / เขตการขาย',
        goTopDown: 'ไปที่หน้า Top-down',
        viewLabel: 'มุมมอง',
        modeLabel: 'โหมด',
        modes: { initial: 'สร้างแผนครั้งแรก', reforecast: 'ปรับแผน (Re-forecast)' },
        reforecastLocked: 'ใช้งานได้หลังจากล็อก Baseline',
        noGP: 'ไม่มี GP',
        currentMonthLabel: 'เดือนปัจจุบัน (จำลอง)',
        skuColumn: 'SKU',
        totalColumn: 'ทั้งปี',
        groups: { selling: 'SKU ที่ขายอยู่', npd: 'NPD' },
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
          remainingNote: 'เป้าหมาย − แผน เทียบกับเป้าหมายทั้ง Account / เขตการขายเสมอ (ค่าบวก = ขาด ค่าลบ = เกิน)'
        },
        startMonthLabel: 'เริ่มขาย',
        startMonthInvalid: 'เลือกเดือนก่อนวันเริ่มขายใน Product Master ไม่ได้',
        addSku: '+ เพิ่ม SKU',
        addNpd: '+ เพิ่ม NPD',
        addSearch: 'ค้นหา SKU',
        addEmpty: 'ไม่มี SKU ที่ Listing แล้วแต่ยังไม่อยู่ในแผน',
        npdEmpty: 'ยังไม่มี NPD ในแผน',
        npdAvailable: 'มี NPD ที่ Listing แล้วแต่ยังไม่อยู่ในแผน {n} รายการ',
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
        legend: { override: 'Override', actual: 'Actual', frozen: 'ล็อก M+1–M+3', promo: 'มี Promo บางวัน', dirty: 'ยังไม่บันทึก' },
        sellOutNote: 'Sell-out Amount ก่อน VAT · เป้าหมาย = Net Sales ÷ (1 − GP)',
        summaryLines: { plan: 'แผนทั้งปี {plan} บาท', target: 'เป้าหมายทั้งปี {target} บาท', remaining: 'คงเหลือ: {remaining}', skus: '{n} SKU ในแผน' }
      },

      measureChain: {
        title: 'จากจำนวนชิ้นถึง Net Sales',
        lead: [
          'ทุกตัวเลขในระบบใช้สูตรชุดเดียวกัน: จำนวนชิ้น × ราคา ได้ Sell-out Amount แล้วหัก GP ของร้านค้า ได้ Net Sales ของบริษัท',
          'แสดงสูตรกลับด้าน จาก Net Sales หา Sell-out Amount'
        ],
        forwardTitle: 'จำนวนชิ้น → Net Sales',
        reverseTitle: 'กลับด้าน: Net Sales → Sell-out Amount',
        unitsLabel: 'จำนวนชิ้น',
        priceLabel: 'ราคาต่อชิ้น (บาท)',
        gpLabel: 'GP ของร้านค้า (%)',
        netLabel: 'Net Sales ที่ต้องการ (บาท)',
        vatToggle: 'ราคานี้รวม VAT แล้ว',
        steps: { sellOutEx: 'Sell-out Amount ก่อน VAT', net: 'Net Sales', sellOutInc: 'Sell-out Amount รวม VAT (แสดงผล)' },
        splitTitle: 'สัดส่วนเงินที่ลูกค้าจ่าย',
        vatQuestion: 'คำถามที่ค้าง: ราคาใน Price List รวม VAT หรือไม่',
        vatDiff: 'หากราคารวม VAT อยู่แล้วแต่คำนวณเหมือนไม่รวม Net Sales จะสูงกว่าความจริง',
        vatCompare: { excl: 'Net Sales หากราคาไม่รวม VAT:', incl: 'Net Sales หากราคารวม VAT:' },
        defaults: { units: 100, price: 50, gp: 0.45, net: 100 }
      },

      approval: {
        title: 'อนุมัติ ล็อกเป้า และ Forecast',
        lead: [
          'แผนผ่านการอนุมัติครั้งเดียว แล้วล็อกเป็น Baseline ทั้งปี ใช้วัดผลงานได้ตลอดปี',
          'ระหว่างปีปรับได้เฉพาะ Forecast โดยล็อก 3 เดือนข้างหน้าไว้เสมอ'
        ],
        timelineTitle: 'ขั้นตอนของแผน',
        steps: [
          { id: 'draft', title: 'Draft', who: 'ทีมขาย / KAM', desc: 'กรอกและแก้ไขแผน' },
          { id: 'submitted', title: 'Submitted', who: 'ทีมขาย / KAM', desc: 'ส่งแผนแล้ว แก้ไขไม่ได้ระหว่างรออนุมัติ' },
          { id: 'approved', title: 'Director อนุมัติ', who: 'Sales Director', desc: 'อนุมัติ หรือส่งกลับแก้ไข' },
          { id: 'baseline', title: 'Baseline ล็อกทั้งปี', who: 'ระบบ', desc: 'เก็บ Snapshot ราคาและ GP ณ วันอนุมัติ' },
          { id: 'forecast', title: 'Forecast รายเดือน', who: 'ทีมขาย / KAM', desc: 'ล็อก M+1 ถึง M+3 ปรับได้ตั้งแต่ M+4' }
        ],
        actions: { submit: 'ส่งแผน', approve: 'อนุมัติ', sendBack: 'ส่งกลับแก้ไข', lock: 'ล็อก Baseline', forecast: 'เริ่มรอบ Forecast', restart: 'เริ่มใหม่' },
        windowTitle: 'Forecast: เดือนที่ปรับได้',
        currentMonthLabel: 'เดือนปัจจุบัน (จำลอง)',
        windowNotes: {
          past: 'ใช้ยอดขายจริง',
          current: 'กำลังขายอยู่ ล็อก',
          locked: 'ล็อก M+1 ถึง M+3 ขอแก้ไขเป็น Exception ผ่าน Director',
          open: 'ปรับ Forecast ได้'
        }
      },

      // Account Master (workflowBar แบบง่าย)
      accounts: {
        title: 'Account',
        lead: ['ข้อมูล Account และ GP ตามช่วงเวลาที่มีผล'],
        filterAll: 'ทุก Channel',
        columns: { name: 'ชื่อ Account', channel: 'Channel', gp: 'GP (%)', gpFrom: 'มีผลตั้งแต่', active: 'การใช้งาน', owner: 'ผู้รับผิดชอบปัจจุบัน', inPlan: 'แผนปี {year}', manage: 'จัดการ' },
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
        lead: ['ผู้รับผิดชอบ Account / เขตการขายรายเดือน และผลงานรายบุคคล'],
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
        timelineUnit: 'Account / เขตการขาย',
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

      // รายงานสรุปแผน (ผู้บริหารดูภาพรวมและล็อก Baseline)
      summary: {
        title: 'รายงานสรุปแผน {year}',
        lead: ['สรุปเป้าหมาย แผนการขาย และสถานะการอนุมัติ'],
        channelFilter: 'Channel',
        channelAll: 'ทุก Channel',
        channelSelected: '{n} Channel',
        channelClear: 'ล้างที่เลือก',
        channelEmpty: 'ไม่พบ Channel',
        millionUnit: 'ล้านบาท',
        totalRow: 'Total',
        print: 'พิมพ์ / บันทึก PDF',
        printHeader: 'รายงานสรุปแผน {year} · พิมพ์เมื่อ {at}',
        lockButton: 'ล็อก Baseline {year}',
        lockConfirm: 'ล็อก Baseline ปี {year}',
        lockLines: [
          'แผน SKU ที่อนุมัติแล้วทุกรายการจะเป็น Baseline ทั้งปี ใช้วัดผลงานตลอดปี',
          'หลังล็อก Top-down, Phasing และแผนครั้งแรกจะแก้ไขไม่ได้',
          'ระหว่างปีปรับได้เฉพาะ Re-forecast (ล็อก M+1 ถึง M+3)'
        ],
        lockTotals: 'Total Target {target} บาท · แผนรวม {plan} บาท · {n} รายการ',
        lockedAt: 'ล็อก Baseline แล้ว เมื่อ {at} โดย {by}',
        lockPending: 'แผน SKU ยังไม่อนุมัติ {n} รายการ',
        lockTopDownPending: 'Top-down ยังไม่ได้รับอนุมัติ',
        lockDirectorOnly: 'เฉพาะ Sales Director',
        kpi: {
          target: 'Total Target',
          targetSub: 'การเติบโตเทียบปีก่อน {growth}',
          plan: 'แผน Bottom-up รวม',
          planSub: '{pct} ของเป้าหมาย',
          gap: 'ส่วนต่างจากเป้าหมาย',
          approval: 'ความคืบหน้าการอนุมัติ',
          approvalValue: '{done} / {total}',
          approvalSub: 'Account / เขตการขายที่แผน SKU อนุมัติแล้ว'
        },
        monthlyTitle: 'เป้าหมายเทียบแผน รายเดือน (ล้านบาท)',
        monthlyLegend: { bar: 'เป้าหมาย (Top-down Phasing)', line: 'แผน Bottom-up', dashed: 'ยอดขายปีก่อน' },
        tableTitle: 'เป้าหมายและแผนราย Channel และ Account / เขตการขาย (ล้านบาท)',
        tableColumns: { name: 'Channel / Account / เขตการขาย', prior: 'ยอดขายปีก่อน', target: 'เป้าหมาย', plan: 'แผน Bottom-up', gap: 'ส่วนต่าง', topDown: 'Top-down', phasing: 'Phasing', sku: 'SKU', owner: 'ผู้รับผิดชอบ' },
        approvalHead: 'สถานะอนุมัติ',
        openPlan: 'เปิดหน้าวางแผนราย SKU ของ {name}',
        collapseTitle: 'ย่อหรือขยายรายการใน Channel นี้',
        mixTitle: 'สัดส่วนแผนตามกลุ่มสินค้า (ล้านบาท)',
        mixByStatus: 'ตาม Status',
        mixBySeries: 'ตาม Series',
        mixText: '{value} · {pct}',
        mixOther: 'อื่นๆ',
        channelApproved: 'อนุมัติแล้ว {done}/{total}',
        peopleTitle: 'เป้าหมายรายผู้รับผิดชอบ (ล้านบาท)',
        peopleColumns: { name: 'ผู้รับผิดชอบ', units: 'Account / เขตการขายที่ดูแล', target: 'เป้าหมาย', plan: 'แผน', gap: 'ส่วนต่าง' },
        peopleNote: 'คำนวณเฉพาะเดือนที่แต่ละคนรับผิดชอบ',
        vacantRow: 'ไม่มีผู้รับผิดชอบ',
        resignedTag: 'ลาออก {month}',
        actionLine: '{unit}: {text}',
        actionsTitle: 'รายการที่ต้องดำเนินการ',
        actions: {
          topDown: 'Top-down ยังไม่ได้รับอนุมัติ ({status})',
          short: 'แผนต่ำกว่าเป้าหมาย ({amount})',
          over: 'แผนสูงกว่าเป้าหมาย ({amount})',
          draftPhasing: 'Phasing ยังไม่ส่งอนุมัติ',
          draftSku: 'แผน SKU ยังไม่ส่งอนุมัติ',
          returned: 'ส่งกลับแก้ไข',
          review: 'ต้องตรวจสอบใหม่',
          vacant: 'ยังไม่มีผู้รับผิดชอบ'
        },
        actionsNone: 'ไม่มีรายการที่ต้องดำเนินการ'
      },

      // เกี่ยวกับ Prototype: ขอบเขต, Decision log, คำถามค้าง, ขั้นต่อไป (แยกออกจากรายงาน)
      aboutPrototype: {
        title: 'เกี่ยวกับ Prototype',
        lead: ['ขอบเขต ข้อสรุปที่ตกลงแล้ว และคำถามที่ต้องการคำตอบก่อนพัฒนาระบบจริง'],
        tabs: { scope: 'ขอบเขต', decisions: 'Decision log', questions: 'คำถามที่ค้าง', next: 'ขั้นต่อไป' },
        scopeTitle: 'ขอบเขต',
        scope: [
          'ตั้งเป้าหมาย Top-down เป็น Net Sales: Total → Channel → Account / เขตการขาย → รายเดือน',
          'วางแผน Bottom-up เป็นจำนวนชิ้น ต่อ SKU × Account / เขตการขาย × เดือน',
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
          { topic: 'การแบ่งเป้า', decision: 'แบ่ง 3 ชั้น: Total → Channel → Account / เขตการขาย เป็นสัดส่วนของชั้นบน แก้ไขได้ทั้ง % และบาท (เก็บเป็น %) ทุกกลุ่มมีแถวคงเหลือ' },
          { topic: 'สถานะคงเหลือ', decision: 'จัดสรรครบ (±1 บาท) = เขียว / ขาด = แดง / เกิน = เหลือง / ยังไม่กำหนด = เทา ทุกสถานะมีข้อความกำกับ การกระจายยอดคงเหลือต้องกดเองเท่านั้น' },
          { topic: 'Channel แบบ Config', decision: 'Channel อยู่ใน Channel Master: หน่วยแบ่งเป้า (Account หรือเขต), วิธีนับ Sell-out, มี GP หรือไม่ และสี เพิ่ม Channel ใหม่ (เช่น Export) ได้โดยไม่แก้โค้ด' },
          { topic: 'TT ตามเขต', decision: 'TT แบ่งเป้าตามเขตการขาย เป้าหมายของเขต = Quota การแบ่งลงร้านค้าหรือสาขาเป็นงานของ Sales Person' },
          { topic: 'เป้าหมายผูกกับ Account / เขต', decision: 'เป้าหมาย ยอดขาย และยอดขายปีก่อนผูกกับ Account หรือเขต ไม่ผูกกับบุคคล การเปลี่ยนผู้รับผิดชอบไม่เปลี่ยน Target และ Forecast' },
          { topic: 'ผู้รับผิดชอบ', decision: 'เก็บเป็นช่วงเดือน 1 รายการ 1 เดือนมีได้ 1 คน ช่วงห้ามทับกัน แก้ไขเดือนที่ผ่านไปแล้วไม่ได้ ผู้ที่ลาออกแล้วนับเป็นไม่มีผู้รับผิดชอบ' },
          { topic: 'ผลงานรายบุคคล', decision: 'รวมเป้าหมายและยอดขายของทุกรายการ เฉพาะเดือนที่บุคคลนั้นรับผิดชอบ รวมถึงผู้ที่ลาออกแล้ว' },
          { topic: 'ปีแผน', decision: 'ข้อมูลแผนแยกตามปี ทุกแถวแสดงยอดขายปีก่อนและการเติบโต และเติมสัดส่วนตามยอดขายปีก่อนได้' },
          { topic: 'Account / เขตในแผน', decision: 'เพิ่มหรือนำออกจากแผนได้จาก Account Master หรือ Territory Master เท่านั้น ไม่พิมพ์ชื่อเอง' },
          { topic: 'Phasing', decision: 'ค่าตั้งต้นของเป้าหมายรายเดือน = เป้าหมายทั้งปี × สัดส่วนยอดขายรายเดือนของปีก่อน (ไม่มีข้อมูลใช้ Seasonality ของ Channel) ไม่ปรับเดือนอื่นอัตโนมัติ แต่ผลรวมต้องเท่าเป้าหมายทั้งปี' },
          { topic: 'อนุมัติต่อขั้น', decision: 'Top-down: Sales Director จัดทำ → Management อนุมัติ / Phasing และแผน SKU: ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ / ขั้นล่างจัดทำฉบับร่างได้ก่อน แต่ส่งได้เมื่อขั้นบนอนุมัติแล้ว / ขั้นบนอนุมัติใหม่และเป้าหมายเปลี่ยน → ขั้นล่างเป็น "ต้องตรวจสอบใหม่"' },
          { topic: 'แก้ไข / บันทึก / ยืนยัน', decision: 'ทุกหน้าเปิดเป็นโหมดดู ต้องกดแก้ไขก่อน แล้วบันทึกหรือยกเลิก / ส่งอนุมัติและอนุมัติมีกล่องยืนยันที่สรุปตัวเลข / ส่งไม่ได้หากยังจัดสรรไม่ครบ / ส่งกลับแก้ไขต้องระบุเหตุผล / บทบาทที่แก้ไขไม่ได้เห็นข้อความอ่านอย่างเดียว' },
          { topic: 'Baseline', decision: 'แผนผ่านการอนุมัติครั้งเดียว แล้ว Sales Director ล็อกเป็น Baseline ทั้งปีในรายงานสรุปแผนเมื่อแผน SKU ทุกรายการอนุมัติแล้ว พร้อม Snapshot ราคาและ GP' },
          { topic: 'Forecast', decision: 'หลังล็อก Baseline ปรับได้เฉพาะ Re-forecast (มี Workflow แยก) ล็อก M+1 ถึง M+3 ปรับได้ตั้งแต่ M+4 เดือนที่ผ่านแล้วใช้ Actual ขอแก้ไขเดือนที่ล็อกเป็น Exception ผ่าน Director' },
          { topic: 'NPD', decision: '3 เดือนนับจากวันเริ่มขาย' },
          { topic: 'Clearance', decision: 'มาก่อน Status อื่นเสมอ แบ่ง Stock เท่ากันทุกเดือน ผลรวมเท่า Stock' },
          { topic: 'วิธีเติมยอด', decision: 'ดูที่ SKU × Account / เขตการขาย มี 4 แบบ: ล็อก 0 / กรอกเอง / ระบบเติม / Clearance สีของช่องบอกที่มาของตัวเลข' },
          { topic: 'แผนราย SKU', decision: 'กรอกเป็นจำนวนชิ้น ระบบแปลงเป็น Sell-out Amount และ Net Sales แก้ไขช่องระบบเติมและ Clearance ได้ (Override) ยกเว้นช่องล็อก 0 / คงเหลือรายเดือน = เป้าหมาย − แผน' },
          { topic: 'Series', decision: 'Filter Series เลือกได้หลายค่า แสดงรวม Series ที่เลือกคู่กับรวมทั้ง Account และคงเหลือเทียบกับเป้าหมายทั้ง Account เสมอ / "เพิ่มทั้ง Series" เพิ่มทุก SKU ของ Series ที่ Listing แล้ว' },
          { topic: 'Product Master', decision: 'ทีม Product กำหนดวันเริ่มขาย Listing และเดือนเลิกขาย / Supply Chain กำหนด Clearance / ทีมขายเห็นเฉพาะ SKU ที่ Listing แล้ว' },
          { topic: 'โหมดแผน', decision: 'สร้างแผนครั้งแรกแก้ไขได้ทุกเดือน / ปรับแผนแก้ไขได้ตั้งแต่ M+4 เดือนที่ผ่านแล้วใช้ Actual และไม่เขียนทับ Baseline' },
          { topic: 'SKU ใหม่', decision: 'กรอกเองทั้งปีในแผนรายปี' },
          { topic: 'ระบบเติม', decision: 'Run-rate × Seasonality Index ของเดือนนั้น' },
          { topic: 'Promo บางวัน', decision: 'ใช้ราคาเฉลี่ยถ่วงตามจำนวนวัน' },
          { topic: 'สูตร Net Sales', decision: 'Net Sales = Sell-out Amount ก่อน VAT × (1 − GP) ดูสูตรและค่าที่ใช้ได้ที่ ⓘ และ Tooltip รายช่องในหน้าวางแผนราย SKU' },
          { topic: 'VAT', decision: 'ค่าตั้งต้น: ราคาใน Price List ไม่รวม VAT (รอยืนยัน)' },
          { topic: 'เมนู', decision: 'เมนูข้าง 4 กลุ่ม: Sales Planning (Top-down → Phasing → วางแผนราย SKU → รายงานสรุปแผน) / Product Master / Account Master / ข้อมูลโครงการ' },
          { topic: 'รายงานสรุปแผน', decision: 'สำหรับผู้บริหาร: KPI, เป้าหมายเทียบแผนรายเดือน, ตารางราย Channel และ Account / เขตการขาย, สัดส่วนแผนตามกลุ่มสินค้า, เป้าหมายรายผู้รับผิดชอบ และรายการที่ต้องดำเนินการ พิมพ์เป็น PDF ได้' }
        ],
        openQuestions: [
          'ราคาใน Price List รวม VAT หรือไม่ (ไฟล์ Excel เดิมคำนวณแบบรวม VAT)',
          'TT มี GP หรือไม่ (Channel Master ตั้ง TT เป็นไม่มี GP ไว้ก่อน)',
          'Chayamiss เป็น Channel หรือ Account (Export ตั้งเป็น Channel ตัวอย่างแล้ว)',
          'ระบบจริงใช้งานหลายคนพร้อมกัน ต้องมี Backend',
          'Stock Clearance ระดับ SKU แบ่งให้แต่ละ Account / เขตการขายอย่างไร (Prototype แบ่งเท่ากันทุกรายการที่ Listing)',
          'แผน SKU ของ TT จัดทำที่ระดับเขตใช่หรือไม่',
          'CN% ของ TT กำหนดต่อเขตหรือทั้ง Channel',
          'การเปลี่ยนผู้รับผิดชอบต้องมีผู้อนุมัติหรือไม่'
        ],
        nextSteps: [
          'ตอบคำถามที่ค้าง และยืนยันเจ้าของข้อมูลแต่ละรายการ',
          'กำหนดรูปแบบ Product Master, Account Master และแหล่งข้อมูลยอดขายย้อนหลัง',
          'ออกแบบระบบจริง: Backend สำหรับหลายผู้ใช้ สิทธิ์ผู้ใช้ตามบทบาท และการนำเข้าข้อมูลจาก Excel เดิม',
          'ทดลองใช้กับ 1–2 Account / เขตการขาย ก่อนขยายทั้งบริษัท'
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

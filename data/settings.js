/*
 * data/settings.js — ค่าคงที่ของระบบ (ข้อมูลเท่านั้น ไม่มี Logic)
 */
(function (SP) {
  'use strict';

  SP.data.settings = {
    // ปีที่เลือกได้ใน Header และปีตั้งต้น (ปีที่เลือกเก็บใน store: app.planYear)
    PLAN_YEARS: [2026, 2027, 2028],
    DEFAULT_PLAN_YEAR: 2027,

    // CR-17 Feature Flags — Phase 1 ตาม Flow ใหม่ปิดทั้งหมด (เปิดกลับใน Phase 2 · Sales Planning Revision)
    //   อ่านผ่าน SP.core.features.isOn(name) เท่านั้น ห้ามเช็กค่านี้ตรงๆ / ปิดแล้วโค้ดและ Test ของ Workflow ยังอยู่ครบ
    FEATURES: {
      approvalWorkflow: false,   // ส่งอนุมัติ / อนุมัติ / ส่งกลับแก้ไข / ต้องตรวจสอบใหม่ (ป้ายสถานะ ประวัติ ไอคอนในเมนูและ Dropdown)
      baseline: false,           // ล็อก Baseline, Snapshot, เลขฉบับ, ช่องลงนาม
      reforecast: false,         // โหมดปรับแผน, ล็อก M+1–M+3, Actual ในตาราง
      sellIn: false,             // ข้อความและมุมมอง Sell-in (TT ยังคำนวณด้วยราคา Dealer)
      npdApproval: false,        // การอนุมัติแผน NPD โดย Sales Director (ปิด = บันทึกแล้วมีผลทันที)
      promotionCalendar: false   // CR-18 ปฏิทิน Promotion รายเดือน (ปิด = ไม่นับ Promotion ในราคา ใช้ราคาต่อ Account แทน)
    },

    VAT: 0.07,
    // ราคาใน Product Master และราคาต่อ Account รวม VAT (CR-18 ได้คำตอบแล้ว): Net Sales = Sale Amount ÷ (1 + VAT) × (1 − GP)
    PRICE_INCLUDES_VAT: true,
    // ราคาต่อ Account: เตือน (ไม่บล็อก) เมื่อสูงกว่า RSP หรือต่ำกว่า RSP เกินสัดส่วนนี้
    ACCOUNT_PRICE_WARN_BELOW: 0.5,

    // Status "New" = จำนวนเดือนแรกนับจากวันเริ่มขาย (นับเดือนที่เริ่มขายเป็นเดือนที่ 1)
    NPD_MONTHS: 3,

    // ความครบถ้วนของข้อมูลสินค้า (calc.productCompleteness)
    //   จำเป็น: ขาดแล้วใช้ในหน้าวางแผน SKU ไม่ได้ / ควรมี: แสดงเป็นข้อมูลที่ควรเติม
    //   code = TR Code หรือรหัสชั่วคราว / rsp = มี RSP ใน Price List
    PRODUCT_REQUIRED: ['code', 'name', 'categoryId', 'subCategoryId', 'typeId', 'seriesId', 'itemType', 'rsp', 'launchDate'],
    PRODUCT_RECOMMENDED: ['barcode', 'image', 'subSeriesId', 'internalCode', 'packSize'],

    // ประเภทสินค้า (หน้าวางแผน SKU ใช้เฉพาะ SALE) / หน่วยของขนาดบรรจุ
    ITEM_TYPES: ['SALE', 'TESTER', 'GIFT', 'PREMIUM'],
    UOMS: ['g', 'ml', 'ชิ้น'],

    // รูปสินค้า: ย่อด้วย Canvas ให้ด้านยาวไม่เกินค่านี้ (px) แล้วเก็บเป็น data URL
    IMAGE_MAX_PX: 320,

    // หน้าหมวดสินค้าและ Series (CR-15): จำนวน SKU ที่แสดงในแผงรายละเอียด (ที่เหลือดูในรายการสินค้า)
    TAXONOMY_SKU_LIST_MAX: 10,

    // Forecast: ล็อก M+1 ถึง M+FROZEN_MONTHS ปรับได้ตั้งแต่เดือนถัดไป
    FROZEN_MONTHS: 3,

    // วิธีเติมยอดของช่อง "ระบบเติม" ในแผน SKU — CR-20: หน้าจอไม่มีเมนูเลือกวิธีแล้ว ใช้ DEFAULT_FILL_METHOD (plan.method ที่เก็บไว้จากรุ่นก่อนยังมีผล)
    //   'priorYear' = ยอดขายเดือนเดียวกันปีก่อนของ SKU ในหน่วยขายนั้นตรงๆ (CR-20 ค่าเริ่มต้น)
    //   'lastYear' = ยอดขายเดือนเดียวกันปีก่อนของ SKU × การเติบโตของหน่วยขาย (เป้าหมายทั้งปี ÷ ยอดขายปีก่อน) — CR-11
    //   'runRate'  = Run-rate × Seasonality Index (Run-rate = ยอดเฉลี่ยของ RUN_RATE_MONTHS เดือนจริงล่าสุดของปีก่อน)
    FILL_METHODS: ['priorYear', 'lastYear', 'runRate'],
    DEFAULT_FILL_METHOD: 'priorYear',   // CR-20: ค่าตั้งต้น = ยอดขายเดือนเดียวกันปีก่อนตรงๆ (lastYear × การเติบโต / runRate คงไว้ใน calc ไม่ใช้ในหน้าจอ)
    RUN_RATE_MONTHS: 3,

    // หน้าวางแผน SKU: จัดกลุ่มตาม Series เป็นค่าเริ่มต้นเมื่อหน่วยขายมี SKU มากกว่าค่านี้ (น้อยกว่านั้นจัดกลุ่มตาม Status)
    GROUP_BY_SERIES_ABOVE: 20,
    // ตรวจความผิดปกติ: ช่องที่ต่างจากเดือนเดียวกันปีก่อนเกิน ± ค่านี้ (สัดส่วน 0.5 = 50%) แสดง ▲/▼ (ไม่บล็อกการบันทึก)
    ANOMALY_PCT: 0.5,
    // ย้อนกลับ (Ctrl+Z) ได้สูงสุดกี่ครั้งต่อรอบแก้ไข
    UNDO_LIMIT: 50,

    // แท่ง "เป้าหมายเทียบปีก่อน" (charts.vsLastYearBar): สเกลจริงร่วมกันทั้งตาราง เริ่มที่ 0
    //   ค่าสูงสุดของสเกล (calc.niceScaleMax) ปัดขึ้นขั้นละ 10 ล้าน / ค่าสูงสุดน้อยกว่า 30 ล้าน ปัดขึ้นขั้นละ 5 ล้าน
    SCALE_STEP_BAHT: 10000000,
    SCALE_STEP_SMALL_BAHT: 5000000,
    SCALE_SMALL_BELOW_BAHT: 30000000,

    // แกนกราฟในรายงานสรุปแผน (CR-12): เส้นแบ่งแกน 4–6 เส้น ขั้นละ 1 / 2 / 2.5 / 5 × 10^n (calc.niceAxis)
    //   กราฟรายเดือนเริ่มที่ 0 ค่าสูงสุด = ค่ามากที่สุด × (1 + CHART_HEADROOM) ปัดขึ้นเป็นเลขกลม
    CHART_TICKS_MIN: 4,
    CHART_TICKS_MAX: 6,
    CHART_STEPS: [1, 2, 2.5, 5],
    CHART_HEADROOM: 0.10,
    // จุดเริ่มแกน Waterfall (calc.axisStart): ค่าต่ำสุด ≥ from → ปัดลงขั้นละ step / ต่ำกว่าทุกเกณฑ์ → เริ่มที่ 0
    //   113.2 ล้าน → 100 ล้าน · 245 ล้าน → 200 ล้าน · 40 ล้าน → 0
    AXIS_START_RULES: [
      { from: 200000000, step: 100000000 },
      { from: 50000000, step: 50000000 }
    ],

    // เลขฉบับของรายงานสรุปแผน (CR-12): ล็อก Baseline ครั้งที่ n = {year}-BL-{nn} / ยังไม่ล็อก = {year}-DRAFT
    //   ประวัติเลขฉบับเก็บที่ store: plan.<ปี>.baselineVersions
    BASELINE_CODE: '{year}-BL-{nn}',
    BASELINE_DRAFT_CODE: '{year}-DRAFT',

    // Remaining ถือว่า "ครบ" เมื่ออยู่ในช่วง ± ค่านี้ (บาท) — ค่าคงที่ตามสูตร ไม่ใช่ค่าที่ผู้ใช้ปรับ
    ALERT_TOLERANCE_BAHT: 1,

    // หน่วยแบ่งเป้าที่เปิดเป็นค่าตั้งต้นในหน้า Phasing และวางแผน SKU
    DEFAULT_UNIT: 'shopee',

    // บทบาทจำลองตั้งต้นใน Header ('management' | 'director' | 'sales' | 'product' | 'supply' | 'trade')
    DEFAULT_ROLE: 'director',

    // "เดือนปัจจุบัน (จำลอง)" ของปีแผน (2 = มี.ค.) ใช้ร่วมกัน:
    //   หน้าวางแผน SKU โหมดปรับแผน → ม.ค.–มี.ค. Actual, เม.ย.–มิ.ย. ล็อก
    //   ผู้รับผิดชอบ → แก้ได้ตั้งแต่เดือนนี้ เดือนก่อนหน้าเป็นประวัติ / Performance นับ Actual ถึงเดือนนี้
    DEMO_FORECAST_MONTH: 2,

    // CR-24: เดือนปัจจุบันกลาง (core/clock.js) — ยอดขาย L12M = 12 เดือนที่ปิดแล้วก่อนเดือนนี้ (ก.ย. 2025 – ส.ค. 2026) ·
    //   ยอดอ้างอิงรายเดือน (ม.ค.–ส.ค. ปี 2026 · ก.ย.–ธ.ค. ปี 2025) · หน้าร้านค้า TT "ข้อมูล ณ เดือน" / ลบค่า = ใช้เดือนจริงของเครื่อง
    DEMO_CURRENT_MONTH: '2026-09'
  };
})(window.SP);

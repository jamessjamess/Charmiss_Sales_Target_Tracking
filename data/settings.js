/*
 * data/settings.js — ค่าคงที่ของระบบ (ข้อมูลเท่านั้น ไม่มี Logic)
 */
(function (SP) {
  'use strict';

  SP.data.settings = {
    // ปีที่เลือกได้ใน Header และปีตั้งต้น (ปีที่เลือกเก็บใน store: app.planYear)
    PLAN_YEARS: [2026, 2027, 2028],
    DEFAULT_PLAN_YEAR: 2027,

    VAT: 0.07,
    // ราคาใน Price List รวม VAT แล้วหรือไม่ (คำถามที่ค้างข้อ 1 — ค่าตั้งต้น: ไม่รวม)
    PRICE_INCLUDES_VAT: false,

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

    // Forecast: ล็อก M+1 ถึง M+FROZEN_MONTHS ปรับได้ตั้งแต่เดือนถัดไป
    FROZEN_MONTHS: 3,

    // Remaining ถือว่า "ครบ" เมื่ออยู่ในช่วง ± ค่านี้ (บาท) — ค่าคงที่ตามสูตร ไม่ใช่ค่าที่ผู้ใช้ปรับ
    ALERT_TOLERANCE_BAHT: 1,

    // หน่วยแบ่งเป้าที่เปิดเป็นค่าตั้งต้นในหน้า Phasing และวางแผน SKU
    DEFAULT_UNIT: 'shopee',

    // บทบาทจำลองตั้งต้นใน Header ('management' | 'director' | 'sales' | 'product' | 'supply' | 'trade')
    DEFAULT_ROLE: 'director',

    // หน้า approval: เดือนที่สมมติว่าเป็น "ตอนนี้" (0 = ม.ค., 5 = มิ.ย.)
    DEMO_CURRENT_MONTH: 5,

    // "เดือนปัจจุบัน (จำลอง)" ของปีแผน (2 = มี.ค.) ใช้ร่วมกัน:
    //   หน้าวางแผน SKU โหมดปรับแผน → ม.ค.–มี.ค. Actual, เม.ย.–มิ.ย. ล็อก
    //   ผู้รับผิดชอบ → แก้ได้ตั้งแต่เดือนนี้ เดือนก่อนหน้าเป็นประวัติ / Performance นับ Actual ถึงเดือนนี้
    DEMO_FORECAST_MONTH: 2
  };
})(window.SP);

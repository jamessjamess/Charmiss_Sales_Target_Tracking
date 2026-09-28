/*
 * data/pricing.js — ราคาหลักรายเดือนและ Promotion Price (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * CR-30 (แทน Price List ตามวันที่ · ราคาต่อ Account ราคาเดียวทั้งปี · ปฏิทิน Promotion):
 *   หลังนำเข้า (core/seed.js)
 *   SP.data.basePrices  = [{ productKey, priceType: 'RSP' | 'TT_DEALER' | 'TT_WHOLESALE', effectiveMonth: 'YYYY-MM', price, by, at }]
 *                         ราคาหลักเปลี่ยนได้รายเดือน มีผลวันที่ 1 · ราคาที่มีผล ณ เดือน M = รายการล่าสุดที่ effectiveMonth ≤ M
 *                         เจ้าของข้อมูล: ทีม Product · ค่าที่แก้เก็บที่ store: master.basePrices · ประเภทราคาอยู่ใน settings.PRICE_TYPES
 *   SP.data.promoPrices = [{ productKey, channelId, unitId | null (ทั้ง Channel), month: 'YYYY-MM', price, by, at }]
 *                         เจ้าของข้อมูล: Sales Director (ทุก Channel) · Sales Manager / Officer (Channel ในทีม) · store: master.promoPrices
 *   ลำดับการหาราคา (calc.resolvePrice): Promotion Price ของหน่วยขาย → ของ Channel → ราคาหลักของ Channel (MT / ECOM / Export = RSP · TT = TT_DEALER)
 *   ราคารวม VAT (PRICE_INCLUDES_VAT = true) · GP ต่อ Account อยู่ใน data/accounts.js
 *
 * ที่มาของราคา (core/seed.js):
 *   data/seed/ products.rsp → RSP · products.dealerPrice → TT_DEALER (effectiveMonth = baseFrom)
 *   data/seed/ accountPrices (Juicy Pop Tint 02, 05 ที่ 7-Eleven 149 บาท · ราคาต่อ Account เดิมของ CR-18)
 *     → Promotion Price ระดับหน่วยขาย ทุกเดือนตั้งแต่ promoFrom ถึง ธ.ค. ของปีแผนสุดท้าย (ตัวเลขยอดขายย้อนหลังและแผนเท่าเดิม)
 *   changes = ราคาหลักที่เปลี่ยนในปีแผน (ตัวอย่าง "ราคาตามรอบเวลา")
 */
(function (SP) {
  'use strict';

  SP.data.priceImport = {
    baseFrom: '2024-01',
    promoFrom: '2024-01',
    // นำเข้าราคาหลักจาก Excel (หน้าราคาและ Promotion): ชื่อหัวคอลัมน์ที่รับได้ (ไม่สนตัวพิมพ์) · คอลัมน์ราคาว่าง = ไม่เปลี่ยน
    columns: {
      code: ['Product Code', 'รหัสสินค้า', 'Code'],
      RSP: ['RSP', 'RSP (บาท)'],
      TT_DEALER: ['TT Dealer', 'TT Dealer (บาท)', 'ราคา Dealer'],
      TT_WHOLESALE: ['TT Wholesale', 'TT Wholesale (บาท)']
    },
    changes: [
      { productKey: '12160', priceType: 'RSP', effectiveMonth: '2027-07', price: 429, by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12170', priceType: 'RSP', effectiveMonth: '2027-07', price: 429, by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12180', priceType: 'RSP', effectiveMonth: '2027-07', price: 429, by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12220', priceType: 'RSP', effectiveMonth: '2027-07', price: 429, by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12160', priceType: 'TT_DEALER', effectiveMonth: '2027-07', price: 240, by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12170', priceType: 'TT_DEALER', effectiveMonth: '2027-07', price: 240, by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12180', priceType: 'TT_DEALER', effectiveMonth: '2027-07', price: 240, by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12220', priceType: 'TT_DEALER', effectiveMonth: '2027-07', price: 240, by: 'ทีม Product', at: '2027-02-10T11:00:00' }
    ]
  };

  // เติมโดย core/seed.js ตอนโหลด
  SP.data.basePrices = [];
  SP.data.promoPrices = [];
})(window.SP);

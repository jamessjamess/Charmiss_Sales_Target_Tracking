/*
 * data/pricing.js — Price List ตามวันที่มีผล (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * หลังนำเข้า (core/seed.js) SP.data.priceList =
 *   [{ productKey, priceType: 'RSP' | 'SELL_IN', channelId | null, accountId | null, price, effectiveFrom, effectiveTo | null, by, at }]
 *   เจ้าของข้อมูล: ทีม Product / ค่าที่แก้เก็บที่ store: master.priceList / ราคาใหม่ปิดช่วงของราคาเดิม ไม่เขียนทับ (calc.addPrice)
 *   RSP = ราคาขายปลีกรวม VAT (ใช้คำนวณ Sale Amount) / SELL_IN = ราคาขายเข้า (ราคา Dealer)
 *   Channel ที่ priceBasis = 'SELL_IN' (TT) ใช้ราคา SELL_IN ของ Channel นั้นคำนวณยอดขาย และไม่หัก GP (data/channels.js)
 *   ลำดับการเลือกราคา: Promotion ที่ยืนยันแล้ว → ราคาเฉพาะ Account (accountId) → ราคาของ Channel → ราคาทั่วไป
 *   ราคารวม VAT (CR-18 PRICE_INCLUDES_VAT = true) / Promotion มีผลเฉพาะเมื่อเปิด FEATURES.promotionCalendar
 * CR-18 ราคาต่อ Account: SP.data.accountPrices = [{ productKey, accountId (= unitId), price }] ราคาเดียวทั้งปี รวม VAT (แทนราคาเฉพาะ Account ใน Price List)
 *   ลำดับ: ราคาต่อ Account → ราคาของ Channel (ราคา Dealer ของ TT) → RSP ตามวันที่มีผล / ค่าที่แก้เก็บที่ store: master.accountPrices
 *
 * CR-11 ที่มาของราคา:
 *   data/seed/ products.rsp → RSP ทั่วไป / products.dealerPrice → SELL_IN ของ Channel ใน dealerChannels
 *   data/seed/ accountPrices → ราคาต่อ Account (Juicy Pop Tint 02, 05 ที่ 7-Eleven 149 บาท) → SP.data.accountPrices
 *   changes = ราคาที่เปลี่ยนในปีแผน (ตัวอย่างสำหรับเดโม "ราคาตามวันที่มีผล") เพิ่มด้วย calc.addPrice ตอนนำเข้า
 * GP ต่อ Account อยู่ใน data/accounts.js / Promotion อยู่ใน data/promotions.js
 */
(function (SP) {
  'use strict';

  SP.data.priceImport = {
    dealerChannels: ['tt'],
    changes: [
      { productKey: '12160', priceType: 'RSP', channelId: null, accountId: null, price: 429, effectiveFrom: '2027-07-01', by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12170', priceType: 'RSP', channelId: null, accountId: null, price: 429, effectiveFrom: '2027-07-01', by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12180', priceType: 'RSP', channelId: null, accountId: null, price: 429, effectiveFrom: '2027-07-01', by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12220', priceType: 'RSP', channelId: null, accountId: null, price: 429, effectiveFrom: '2027-07-01', by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12160', priceType: 'SELL_IN', channelId: 'tt', accountId: null, price: 240, effectiveFrom: '2027-07-01', by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12170', priceType: 'SELL_IN', channelId: 'tt', accountId: null, price: 240, effectiveFrom: '2027-07-01', by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12180', priceType: 'SELL_IN', channelId: 'tt', accountId: null, price: 240, effectiveFrom: '2027-07-01', by: 'ทีม Product', at: '2027-02-10T11:00:00' },
      { productKey: '12220', priceType: 'SELL_IN', channelId: 'tt', accountId: null, price: 240, effectiveFrom: '2027-07-01', by: 'ทีม Product', at: '2027-02-10T11:00:00' }
    ]
  };

  // เติมโดย core/seed.js ตอนโหลด
  SP.data.priceList = [];
  SP.data.accountPrices = [];
})(window.SP);

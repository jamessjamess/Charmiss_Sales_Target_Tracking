/*
 * data/promotions.js — Promotion Price (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * เจ้าของข้อมูล: Trade Marketing / ค่าที่แก้ในหน้า Promotion Price เก็บที่ store: master.promotions
 *   { id, name, productKey, accountIds: [หน่วยขาย], startDate, endDate (รวมวันปลาย),
 *     mode: 'PRICE' (value = ราคาโปรโมชัน) | 'DISCOUNT_PCT' (value = ส่วนลดเป็นสัดส่วน 0.2 = 20%),
 *     promoGpPct: GP ช่วง Promotion | null (ใช้ GP ปกติ), status: 'DRAFT' | 'CONFIRMED', createdBy }
 * เฉพาะ CONFIRMED ที่ใช้คำนวณในหน้าวางแผน SKU (calc.effectivePrice) / ห้ามซ้อนกันใน SKU × Account เดียวกัน
 * CR-11: สินค้าเป็นสินค้าจริง (TR Code จาก data/seed/) แต่ Promotion ทั้งหมดเป็นตัวอย่างสำหรับเดโม ยังไม่ใช่แผนจริง
 */
(function (SP) {
  'use strict';

  SP.data.promotions = [
    {"id":"promo-01","name":"Mid-year Sale","productKey":"33390","accountIds":["shopee","lazada"],"startDate":"2027-06-01","endDate":"2027-06-10","mode":"PRICE","value":139,"promoGpPct":null,"status":"CONFIRMED","createdBy":"Trade Marketing"},
    {"id":"promo-02","name":"Watsons Member Week","productKey":"12170","accountIds":["watsons"],"startDate":"2027-06-01","endDate":"2027-06-15","mode":"PRICE","value":329,"promoGpPct":0.48,"status":"CONFIRMED","createdBy":"Trade Marketing"},
    {"id":"promo-03","name":"Songkran Deal","productKey":"33430","accountIds":["seven"],"startDate":"2027-04-10","endDate":"2027-04-20","mode":"PRICE","value":129,"promoGpPct":null,"status":"CONFIRMED","createdBy":"Trade Marketing"},
    {"id":"promo-04","name":"11.11 Mega Sale","productKey":"16190","accountIds":["shopee","lazada"],"startDate":"2027-11-01","endDate":"2027-11-11","mode":"DISCOUNT_PCT","value":0.2,"promoGpPct":null,"status":"CONFIRMED","createdBy":"Trade Marketing"},
    {"id":"promo-05","name":"Blooming Heart Launch","productKey":"NPD_2027Q2_01","accountIds":["seven","eveandboy"],"startDate":"2027-06-01","endDate":"2027-06-30","mode":"DISCOUNT_PCT","value":0.15,"promoGpPct":null,"status":"CONFIRMED","createdBy":"Trade Marketing"},
    {"id":"promo-06","name":"Back to School","productKey":"33400","accountIds":["tt-north","tt-northeast","tt-central"],"startDate":"2027-06-15","endDate":"2027-07-15","mode":"PRICE","value":80,"promoGpPct":null,"status":"DRAFT","createdBy":"Trade Marketing"},
    {"id":"promo-07","name":"Payday Deal","productKey":"12070","accountIds":["shopee"],"startDate":"2027-08-25","endDate":"2027-08-31","mode":"PRICE","value":199,"promoGpPct":null,"status":"DRAFT","createdBy":"Trade Marketing"}
  ];
})(window.SP);

/*
 * data/pricing.js — Price List และ Promotion (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * เจ้าของข้อมูล:
 *   priceList  → ทีม Product (Product Master) บาท/ชิ้น ดู PRICE_INCLUDES_VAT ใน settings.js
 *   promotions → Sales/Trade Marketing (start/end รวมวันปลาย / subChannel = id ของหน่วยแบ่งเป้า)
 * GP ต่อ Account ย้ายไปอยู่ใน data/accounts.js (gp, gpFrom) / Channel ที่ hasGP = false ไม่มี GP
 */
(function (SP) {
  'use strict';

  SP.data.pricing = {
    priceList: { A: 159, B: 49, C: 100, D: 129, E: 89, F: 259, G: 199, H: 189 },

    promotions: [
      { sku: 'C', subChannel: 'shopee', start: '2027-06-01', end: '2027-06-10', price: 70, name: 'Mid-year Sale' },
      { sku: 'C', subChannel: 'lazada', start: '2027-06-01', end: '2027-06-10', price: 70, name: 'Mid-year Sale' },
      { sku: 'B', subChannel: 'watsons', start: '2027-11-01', end: '2027-11-15', price: 39, name: 'Watsons Member Week' },
      { sku: 'E', subChannel: 'seven', start: '2027-04-10', end: '2027-04-20', price: 75, name: 'Songkran Deal' }
    ]
  };
})(window.SP);

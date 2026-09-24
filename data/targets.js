/*
 * data/targets.js — ค่าตั้งต้นของแผน Top-down ต่อปี (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * years.<ปี> = ค่าตั้งต้นของ plan.<ปี>.topDown ใน store
 *   total    = Net Sales ทั้งปี (บาท)
 *   channels = Channel ที่อยู่ในแผนของปี (id จาก data/channels.js ตามลำดับที่แสดง)
 *   pct      = สัดส่วน: Channel = % ของ Total / หน่วยขาย = % ใน Channel
 *   units    = หน่วยขายที่อยู่ในแผน ต่อ Channel (id จาก data/accounts.js หรือ data/territories.js)
 * ปีที่ไม่มีใน years เริ่มจาก 0 ใช้ defaultChannels และ defaultUnits
 * ผู้รับผิดชอบแต่ละหน่วยอยู่ใน data/assignments.js (ไม่ผูกกับแผนของปี)
 *
 * ปี 2027: Channel 45 / 20 / 35 และหน่วยขายตามสัดส่วนยอดขายปี 2026 ปัดเป็น % เต็ม รวม 100% (calc.roundShares)
 *   ตัวอย่างขาดและเกินอยู่ที่แผน SKU: MT แผนต่ำกว่าเป้า / TT แผนสูงกว่าเป้า / TT เขต 3 จัดสรรครบ (ดู data/plan-seeds.js)
 */
(function (SP) {
  'use strict';

  var CHANNELS = ['mt', 'tt', 'ecom'];
  var UNITS = {
    mt: ["seven","watsons","eveandboy"],
    tt: ["tt-north","tt-northeast","tt-central"],
    ecom: ["shopee","lazada","tiktok"]
  };

  SP.data.targets = {
    defaultChannels: CHANNELS,
    defaultUnits: UNITS,

    years: {
      2027: {
        total: 120000000,
        channels: CHANNELS,
        pct: { "mt": 0.45, "tt": 0.2, "ecom": 0.35, "seven": 0.41, "watsons": 0.39, "eveandboy": 0.2, "tt-north": 0.34, "tt-northeast": 0.38, "tt-central": 0.28, "shopee": 0.45, "lazada": 0.25, "tiktok": 0.3 },
        units: UNITS
      }
    }
  };
})(window.SP);

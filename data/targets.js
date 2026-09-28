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
 * ปี 2027 (CR-27): Channel 48 / 20 / 32 ให้ทุก Channel โตกว่า L12M (MT +1.4% · TT +5.2% · ECOM +10.4%) และหน่วยขายตามสัดส่วนยอดขาย L12M
 *   ปัดเป็น % เต็ม รวม 100% (calc.roundShares = ปุ่ม เติมตามสัดส่วน L12M) — MT 46 / 35 / 19 · TT 34 / 29 / 19 / 18 · ECOM 46 / 27 / 27
 *   ตัวอย่างขาดและเกินอยู่ที่แผน SKU: MT แผนต่ำกว่าเป้า / TT เขต 1 แผนสูงกว่าเป้า / TT เขต 3 จัดสรรครบ (ดู data/plan-seeds.js)
 *   CR-16: TT 4 เขต (TT-01 … TT-04) ยอดปีก่อนจากร้านค้า 7.79 / 6.59 / 4.27 / 4.24 ล้าน → 34 / 29 / 19 / 18%
 */
(function (SP) {
  'use strict';

  var CHANNELS = ['mt', 'tt', 'ecom'];
  var UNITS = {
    mt: ["seven","watsons","eveandboy"],
    tt: ["TT-01","TT-02","TT-03","TT-04"],
    ecom: ["shopee","lazada","tiktok"]
  };

  SP.data.targets = {
    defaultChannels: CHANNELS,
    defaultUnits: UNITS,

    years: {
      2027: {
        total: 120000000,
        channels: CHANNELS,
        pct: { "mt": 0.48, "tt": 0.2, "ecom": 0.32, "seven": 0.46, "watsons": 0.35, "eveandboy": 0.19, "TT-01": 0.34, "TT-02": 0.29, "TT-03": 0.19, "TT-04": 0.18, "shopee": 0.46, "lazada": 0.27, "tiktok": 0.27 },
        units: UNITS
      }
    }
  };
})(window.SP);

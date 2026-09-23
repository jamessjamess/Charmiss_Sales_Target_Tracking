/*
 * data/targets.js — ค่าตั้งต้นของแผน Top-down ต่อปี (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * years.<ปี> = ค่าตั้งต้นของ plan.<ปี>.topDown ใน store
 *   total    = Net Sales ทั้งปี (บาท)
 *   channels = Channel ที่อยู่ในแผนของปี (id จาก data/channels.js ตามลำดับที่แสดง)
 *   pct      = สัดส่วนของชั้นบน: Channel เทียบกับ Total, หน่วยแบ่งเป้าเทียบกับ Channel
 *   units    = หน่วยแบ่งเป้าที่อยู่ในแผน ต่อ Channel (id จาก data/accounts.js หรือ data/territories.js)
 * ปีที่ไม่มีใน years เริ่มจาก 0 ใช้ defaultChannels และ defaultUnits
 * ผู้รับผิดชอบแต่ละหน่วยอยู่ใน data/assignments.js (ไม่ผูกกับแผนของปี)
 *
 * ปี 2027 ตั้งใจให้มี Alert ครบทั้ง 3 แบบ:
 *   Total: 45 + 20 + 35 = 100%  → ครบ
 *   MT:    40 + 35 + 20 = 95%   → ยังจัดสรรไม่ครบ
 *   TT:    35 + 40 + 30 = 105%  → เกินเป้า (3 เขต)
 *   ECOM:  45 + 25 + 30 = 100%  → ครบ
 */
(function (SP) {
  'use strict';

  var CHANNELS = ['mt', 'tt', 'ecom'];
  var UNITS = {
    mt: ['seven', 'watsons', 'eveandboy'],
    tt: ['tt-north', 'tt-northeast', 'tt-central'],
    ecom: ['shopee', 'lazada', 'tiktok']
  };

  SP.data.targets = {
    defaultChannels: CHANNELS,
    defaultUnits: UNITS,

    years: {
      2027: {
        total: 120000000,
        channels: CHANNELS,
        pct: {
          mt: 0.45, tt: 0.20, ecom: 0.35,
          seven: 0.40, watsons: 0.35, eveandboy: 0.20,
          'tt-north': 0.35, 'tt-northeast': 0.40, 'tt-central': 0.30,
          shopee: 0.45, lazada: 0.25, tiktok: 0.30
        },
        units: UNITS
      }
    }
  };
})(window.SP);

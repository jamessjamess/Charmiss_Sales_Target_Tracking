/*
 * data/salespeople.js — Sales Person Master (ข้อมูลเท่านั้น ไม่มี Logic) ชื่อทั้งหมดเป็นชื่อสมมติ
 *
 *   channelId  = id ใน data/channels.js หรือ null = ดูแลได้ทุก Channel (เช่น ทีม KAM กลาง)
 *   startMonth = เดือนเริ่มงาน 'YYYY-MM' / endMonth = เดือนสุดท้ายที่ทำงาน (ลาออก) 'YYYY-MM' | null
 * เป้าและยอดขายไม่ผูกกับคน: ใครรับผิดชอบหน่วยไหนเดือนไหนอยู่ใน data/assignments.js
 * หลัง endMonth ถ้ายังผูกกับหน่วยอยู่ ระบบนับเดือนนั้นเป็น "ว่าง" และแสดง Alert
 * ค่าที่แก้ในหน้า Sales Person เก็บที่ store: master.salespeople
 */
(function (SP) {
  'use strict';

  SP.data.salespeople = [
    { id: 'sp-anan',  name: 'อนันต์ ศรีสว่าง',   channelId: 'mt',   startMonth: '2022-03', endMonth: null },
    { id: 'sp-pim',   name: 'พิมพ์ลดา ใจดี',     channelId: 'mt',   startMonth: '2023-01', endMonth: null },
    { id: 'sp-wit',   name: 'วิทยา สมใจ',       channelId: 'mt',   startMonth: '2021-05', endMonth: '2027-02' },
    { id: 'sp-korn',  name: 'กรวิชญ์ ทองคำ',    channelId: 'tt',   startMonth: '2020-08', endMonth: null },
    { id: 'sp-nuch',  name: 'นุชนาฏ บุญมา',     channelId: 'tt',   startMonth: '2024-02', endMonth: null },
    { id: 'sp-thana', name: 'ธนพล ใจเย็น',      channelId: 'tt',   startMonth: '2026-06', endMonth: null },
    { id: 'sp-ploy',  name: 'พลอยไพลิน ดีงาม',  channelId: 'tt',   startMonth: '2027-04', endMonth: null },
    { id: 'sp-mild',  name: 'มิลิน แก้วใส',      channelId: 'ecom', startMonth: '2023-09', endMonth: null },
    { id: 'sp-ton',   name: 'ต้นกล้า รักเรียน',   channelId: 'ecom', startMonth: '2025-01', endMonth: null },
    { id: 'sp-kam',   name: 'ทีม KAM กลาง',      channelId: null,   startMonth: '2020-01', endMonth: null }
  ];
})(window.SP);

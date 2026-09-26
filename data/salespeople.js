/*
 * data/salespeople.js — Sales Person Master (ข้อมูลเท่านั้น ไม่มี Logic) ชื่อทั้งหมดเป็นชื่อสมมติ
 *
 *   channelId  = id ใน data/channels.js หรือ null = ดูแลได้ทุก Channel (เช่น ทีม KAM กลาง)
 *   startMonth = เดือนเริ่มงาน 'YYYY-MM' / endMonth = เดือนสุดท้ายที่ทำงาน (ลาออก) 'YYYY-MM' | null
 * เป้าและยอดขายไม่ผูกกับคน: ใครรับผิดชอบหน่วยไหนเดือนไหนอยู่ใน data/assignments.js
 * หลัง endMonth ถ้ายังผูกกับหน่วยอยู่ ระบบนับเดือนนั้นเป็น "ว่าง" และแสดง Alert
 * ค่าที่แก้ในหน้า Sales Person เก็บที่ store: master.salespeople
 * CR-16: Sales Person ของ TT (4 คน + อัมพร สีดาเสถียร ลาออก ก.ค. 2026) มาจาก data/seed/seed-tt-stores.js (core/stores.js นำเข้าตอนโหลด)
 *   แทน Sales Person TT สมมติเดิม
 * CR-19: เพิ่ม Sales Manager ของ ECOM (ณัฐวุฒิ) และ TT (ประเสริฐ) ชื่อสมมติ / ทีมขายต่อ Channel อยู่ใน data/teams.js
 */
(function (SP) {
  'use strict';

  SP.data.salespeople = [
    { id: 'sp-anan',  name: 'อนันต์ ศรีสว่าง',   channelId: 'mt',   startMonth: '2022-03', endMonth: null },
    { id: 'sp-pim',   name: 'พิมพ์ลดา ใจดี',     channelId: 'mt',   startMonth: '2023-01', endMonth: null },
    { id: 'sp-wit',   name: 'วิทยา สมใจ',       channelId: 'mt',   startMonth: '2021-05', endMonth: '2027-02' },
    { id: 'sp-mild',  name: 'มิลิน แก้วใส',      channelId: 'ecom', startMonth: '2023-09', endMonth: null },
    { id: 'sp-ton',   name: 'ต้นกล้า รักเรียน',   channelId: 'ecom', startMonth: '2025-01', endMonth: null },
    { id: 'sp-nat',   name: 'ณัฐวุฒิ ปัญญาดี',    channelId: 'ecom', startMonth: '2024-06', endMonth: null },
    { id: 'sp-pra',   name: 'ประเสริฐ วงศ์ไทย',   channelId: 'tt',   startMonth: '2023-04', endMonth: null },
    { id: 'sp-kam',   name: 'ทีม KAM กลาง',      channelId: null,   startMonth: '2020-01', endMonth: null }
  ];
})(window.SP);

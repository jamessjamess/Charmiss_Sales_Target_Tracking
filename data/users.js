/*
 * data/users.js — ผู้ใช้จำลองของตัวเลือกมุมมองผู้ใช้ และบทบาทของผู้ใช้ (ข้อมูลเท่านั้น ไม่มี Logic) — CR-21 ชื่อทั้งหมดเป็นชื่อสมมติ
 *
 * SP.data.users = [{ id, name, salesPersonId | null, roleIds: [roleId], active }]
 *   salesPersonId = id ใน Sales Person Master (ทีมขายและสิทธิ์เฉพาะทีมอ่านจาก master.teams ของคนนี้) / null = ผู้ใช้ที่ไม่ใช่ฝ่ายขาย
 *   roleIds = บทบาทใน data/permissions.js (หลายบทบาท = รวมสิทธิ์แบบสูงสุด) / บทบาทแรก = กลุ่มในตัวเลือกมุมมองผู้ใช้
 *   active = false → ไม่อยู่ในตัวเลือกมุมมองผู้ใช้และไม่มีสิทธิ์ใด (ผู้ที่ลาออกแล้ว: วิทยา ก.พ. 2027 · อัมพร ก.ค. 2026)
 * ค่าตั้งต้น: 1 คนต่อบทบาท (Management · Sales Director · ทีม Product · Supply Chain · ผู้ดูรายงาน · ผู้ดูแลระบบ)
 *   + Sales Person ทุกคนที่อยู่ในทีมขาย (data/teams.js) บทบาท Sales Manager / Sales Officer ตามทีม
 * ค่าที่แก้ในหน้าบทบาทและสิทธิ์ (แท็บผู้ใช้) เก็บที่ store: master.users
 */
(function (SP) {
  'use strict';

  SP.data.users = [
    { id: 'u-mgmt',     name: 'วรวุฒิ ธนากร',      salesPersonId: null, roleIds: ['management'], active: true },
    { id: 'u-director', name: 'ปรียา วัฒนกุล',      salesPersonId: null, roleIds: ['director'],   active: true },
    { id: 'u-sp-anan',  name: 'อนันต์ ศรีสว่าง',    salesPersonId: 'sp-anan',  roleIds: ['manager'], active: true },
    { id: 'u-sp-nat',   name: 'ณัฐวุฒิ ปัญญาดี',    salesPersonId: 'sp-nat',   roleIds: ['manager'], active: true },
    { id: 'u-sp-pra',   name: 'ประเสริฐ วงศ์ไทย',   salesPersonId: 'sp-pra',   roleIds: ['manager'], active: true },
    { id: 'u-sp-pim',   name: 'พิมพ์ลดา ใจดี',      salesPersonId: 'sp-pim',   roleIds: ['officer'], active: true },
    { id: 'u-sp-wit',   name: 'วิทยา สมใจ',        salesPersonId: 'sp-wit',   roleIds: ['officer'], active: false },
    { id: 'u-sp-mild',  name: 'มิลิน แก้วใส',       salesPersonId: 'sp-mild',  roleIds: ['officer'], active: true },
    { id: 'u-sp-ton',   name: 'ต้นกล้า รักเรียน',    salesPersonId: 'sp-ton',   roleIds: ['officer'], active: true },
    { id: 'u-tt-01',    name: 'สิริกาญจน์ ขุนเสนา',  salesPersonId: 'SP-TT-01', roleIds: ['officer'], active: true },
    { id: 'u-tt-02',    name: 'ฝนเทพ ออกผล',       salesPersonId: 'SP-TT-02', roleIds: ['officer'], active: true },
    { id: 'u-tt-03',    name: 'อภิญญา นามประภา',    salesPersonId: 'SP-TT-03', roleIds: ['officer'], active: true },
    { id: 'u-tt-04',    name: 'กฤษดา นารี',        salesPersonId: 'SP-TT-04', roleIds: ['officer'], active: true },
    { id: 'u-tt-05',    name: 'อัมพร สีดาเสถียร',    salesPersonId: 'SP-TT-05', roleIds: ['officer'], active: false },
    { id: 'u-product',  name: 'ชนิดา พรหมมา',      salesPersonId: null, roleIds: ['product'],  active: true },
    { id: 'u-supply',   name: 'ธีรพล แสงทอง',      salesPersonId: null, roleIds: ['supply'],   active: true },
    { id: 'u-viewer',   name: 'กมลวรรณ ศรีสุข',     salesPersonId: null, roleIds: ['viewer'],   active: true },
    { id: 'u-admin',    name: 'ศิริพร ใจมั่น',      salesPersonId: null, roleIds: ['admin'],    active: true }
  ];
})(window.SP);

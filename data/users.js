/*
 * data/users.js — ผู้ใช้จำลองของตัวเลือกมุมมองผู้ใช้ และบทบาทของผู้ใช้ (ข้อมูลเท่านั้น ไม่มี Logic) — CR-21 ชื่อทั้งหมดเป็นชื่อสมมติ
 *
 * SP.data.users = [{ id, name, roleIds: [roleId], active, email }]
 *   CR-32: การผูกผู้ใช้กับบุคลากรอยู่ที่ person.userId (master.salespeople) ที่เดียว (1:1 · เฉพาะบุคลากรประเภทบุคคล) — ผู้ใช้ไม่มี salesPersonId แล้ว
 *   SP.data.personUsers = ค่าตั้งต้นของ person.userId { <personId>: userId } (บุคลากร TT มาจาก seed จึงผูกตอนโหลดที่ core/permissions.js)
 *   ทีมขายและสิทธิ์เฉพาะทีมอ่านจาก master.teams ของบุคลากรที่ผูกกับผู้ใช้
 *   roleIds = บทบาทใน data/permissions.js (หลายบทบาท = รวมสิทธิ์แบบสูงสุด) / บทบาทแรก = กลุ่มในตัวเลือกมุมมองผู้ใช้
 *   active = false → ไม่อยู่ในตัวเลือกมุมมองผู้ใช้และไม่มีสิทธิ์ใด (ผู้ที่ลาออกแล้ว: วิทยา ก.พ. 2027 · อัมพร ก.ค. 2026)
 * ค่าตั้งต้น: 1 คนต่อบทบาท (Management · Sales Director · ทีม Product · Supply Chain · ผู้ดูรายงาน · ผู้ดูแลระบบ)
 *   + Sales Person ทุกคนที่อยู่ในทีมขาย (data/teams.js) บทบาท Sales Manager / Sales Officer ตามทีม
 * ค่าที่แก้ในหน้าบทบาทและสิทธิ์ (แท็บผู้ใช้) เก็บที่ store: master.users
 */
(function (SP) {
  'use strict';

  SP.data.users = [
    { id: 'u-mgmt',     name: 'วรวุฒิ ธนากร',      roleIds: ['management'], active: true },
    { id: 'u-director', name: 'ปรียา วัฒนกุล',      roleIds: ['director'],   active: true },
    { id: 'u-sp-anan',  name: 'อนันต์ ศรีสว่าง',    roleIds: ['manager'], active: true },
    { id: 'u-sp-nat',   name: 'ณัฐวุฒิ ปัญญาดี',    roleIds: ['manager'], active: true },
    { id: 'u-sp-pra',   name: 'ประเสริฐ วงศ์ไทย',   roleIds: ['manager'], active: true },
    { id: 'u-sp-pim',   name: 'พิมพ์ลดา ใจดี',      roleIds: ['officer'], active: true },
    { id: 'u-sp-wit',   name: 'วิทยา สมใจ',        roleIds: ['officer'], active: false },
    { id: 'u-sp-mild',  name: 'มิลิน แก้วใส',       roleIds: ['officer'], active: true },
    { id: 'u-sp-ton',   name: 'ต้นกล้า รักเรียน',    roleIds: ['officer'], active: true },
    { id: 'u-tt-01',    name: 'สิริกาญจน์ ขุนเสนา',  roleIds: ['officer'], active: true },
    { id: 'u-tt-02',    name: 'ฝนเทพ ออกผล',       roleIds: ['officer'], active: true },
    { id: 'u-tt-03',    name: 'อภิญญา นามประภา',    roleIds: ['officer'], active: true },
    { id: 'u-tt-04',    name: 'กฤษดา นารี',        roleIds: ['officer'], active: true },
    { id: 'u-tt-05',    name: 'อัมพร สีดาเสถียร',    roleIds: ['officer'], active: false },
    { id: 'u-product',  name: 'ชนิดา พรหมมา',      roleIds: ['product'],  active: true },
    { id: 'u-supply',   name: 'ธีรพล แสงทอง',      roleIds: ['supply'],   active: true },
    { id: 'u-viewer',   name: 'กมลวรรณ ศรีสุข',     roleIds: ['viewer'],   active: true },
    { id: 'u-admin',    name: 'ศิริพร ใจมั่น',      roleIds: ['admin'],    active: true }
  ];

  // CR-32: ค่าตั้งต้นของ person.userId (บุคลากร → ผู้ใช้) · แก้ได้ที่หน้า Sales Person Management (บัญชีผู้ใช้) และหน้า Users (บุคลากร)
  SP.data.personUsers = {
    'sp-anan': 'u-sp-anan',
    'sp-nat': 'u-sp-nat',
    'sp-pra': 'u-sp-pra',
    'sp-pim': 'u-sp-pim',
    'sp-wit': 'u-sp-wit',
    'sp-mild': 'u-sp-mild',
    'sp-ton': 'u-sp-ton',
    'SP-TT-01': 'u-tt-01',
    'SP-TT-02': 'u-tt-02',
    'SP-TT-03': 'u-tt-03',
    'SP-TT-04': 'u-tt-04',
    'SP-TT-05': 'u-tt-05'
  };
})(window.SP);

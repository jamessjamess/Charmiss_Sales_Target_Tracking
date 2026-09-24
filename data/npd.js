/*
 * data/npd.js — แผนการเปิดตัวสินค้าใหม่ (NPD) (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * เจ้าของข้อมูล: ทีม Product / ค่าที่แก้ในหน้าแผน NPD เก็บที่ store: master.npdPlans
 *   { id, productKey, seriesId, stage: 'plan' | 'concept' | 'production' | 'ready' | 'launched' (ระบบตั้งเมื่อถึงวันเปิดตัว),
 *     plannedLaunchDate, plannedAccounts: [{ accountId, plannedStartMonth 'YYYY-MM' }], note,
 *     workflow: { status, history } } — ทีม Product ส่ง → Sales Director อนุมัติ (core/workflow.js step 'npd')
 * อนุมัติแล้ว = ตั้งวันเริ่มขายและ Listing ให้ และเดือนเริ่มขายต่อหน่วยเป็นค่าตั้งต้นในหน้าวางแผน SKU
 * CR-11: สินค้าใหม่ปี 2027 ใช้รหัสชั่วคราว (data/products.js productImport.newProducts) seriesId = id ที่ core/seed.js สร้างจากชื่อ Series
 *   NPD_2027Q2_01 และ _03 อนุมัติแล้ว (อยู่ในแผน SKU ตั้งต้นของ 7-Eleven และ EVEANDBOY) / _02 รออนุมัติ
 */
(function (SP) {
  'use strict';

  SP.data.npdPlans = [
    {"id":"npd-01","productKey":"NPD_2027Q2_01","seriesId":"ser-sanrio-blooming-heart","stage":"production","plannedLaunchDate":"2027-06-01","plannedAccounts":[{"accountId":"seven","plannedStartMonth":"2027-06"},{"accountId":"eveandboy","plannedStartMonth":"2027-06"}],"note":"ต่อยอด Blooming Heart Glitter Lip Gloss (สีใหม่)","workflow":{"status":"approved","history":[{"action":"submit","by":"ทีม Product","at":"2026-12-10T10:00:00","note":""},{"action":"approve","by":"Sales Director","at":"2026-12-15T15:30:00","note":""}]}},
    {"id":"npd-02","productKey":"NPD_2027Q2_02","seriesId":"ser-sanrio-blooming-heart","stage":"concept","plannedLaunchDate":"2027-06-01","plannedAccounts":[{"accountId":"seven","plannedStartMonth":"2027-06"},{"accountId":"eveandboy","plannedStartMonth":"2027-07"}],"note":"","workflow":{"status":"submitted","history":[{"action":"submit","by":"ทีม Product","at":"2027-01-20T09:30:00","note":""}]}},
    {"id":"npd-03","productKey":"NPD_2027Q2_03","seriesId":"ser-charming-lips","stage":"ready","plannedLaunchDate":"2027-06-01","plannedAccounts":[{"accountId":"seven","plannedStartMonth":"2027-06"},{"accountId":"eveandboy","plannedStartMonth":"2027-06"}],"note":"สีใหม่ของ Juicy Pop Tint","workflow":{"status":"approved","history":[{"action":"submit","by":"ทีม Product","at":"2026-12-10T10:00:00","note":""},{"action":"approve","by":"Sales Director","at":"2026-12-15T15:30:00","note":""}]}}
  ];
})(window.SP);

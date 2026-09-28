/*
 * data/npd.js — แผนการเปิดตัวสินค้าใหม่ (NPD) (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * เจ้าของข้อมูล: ทีม Product / ค่าที่แก้ในหน้าแผน NPD เก็บที่ store: master.npdPlans
 *   { id, productKey, seriesId, stage: 'plan' | 'concept' | 'production' | 'ready' (ขั้นปัจจุบัน · 'เปิดตัวแล้ว' ระบบตั้งเมื่อถึงเดือนเปิดตัว),
 *     plannedLaunchDate ('YYYY-MM-01' เดือนเปิดตัวแน่นอน) | launchQuarter ('YYYY-Qn' แผนที่ยังไม่ชัด · CR-30),
 *     stageTargets: { plan, concept, production, ready: 'YYYY-MM' } (CR-30 เดือนเป้าหมายที่ขั้นนั้นควรเสร็จ ไม่บังคับ),
 *     plannedAccounts: [{ accountId, plannedStartMonth 'YYYY-MM' }], expectedRsp (ราคา RSP ที่คาด ไม่บังคับ), owner (ผู้รับผิดชอบฝั่ง Product),
 *     source: 'PRODUCT' | 'SALES' (ที่มา), note, workflow: { status, history },
 *     CR-34 คำขอจาก Sales: requestedBy (ผู้ขอ) · reason (เหตุผล / แนวคิดสินค้า) · confirmedAt / confirmedBy (ทีม Product ยืนยันที่หน้าแผน NPD · ว่าง = ขอ NPD) }
 *   Phase 2: ทีม Product ส่ง → Sales Director อนุมัติ (core/workflow.js step 'npd') · Phase 1 บันทึกแล้วมีผลทันที (status approved ภายใน)
 * มีผลแล้ว = ตั้งเดือนเปิดตัวและ Listing ให้ และเดือนเริ่มขายต่อหน่วยเป็นค่าตั้งต้นในหน้าวางแผน SKU (แผนแบบไตรมาส: สินค้าเป็น Planned จนกว่าจะระบุเดือน)
 * CR-11: สินค้าใหม่ (data/products.js productImport.newProducts) seriesId = id ที่ core/seed.js สร้างจากชื่อ Series
 * CR-30: productKey ด้านล่างเป็นรหัสอ้างอิงในไฟล์ข้อมูล core/seed.js แปลงเป็น Product Code ระบบตอนโหลด (32210 · 34150 · 33480 · 22110 · 16490)
 *   npd-02 = ขั้นสรุปแนวคิดเลยเดือนเป้าหมาย (ส.ค. 2026) แล้วยังไม่เสร็จ · npd-04 = แผนแบบไตรมาส Q2 2028 · npd-05 = เปิดตัว ก.พ. 2028 ที่ ECOM
 */
(function (SP) {
  'use strict';

  SP.data.npdPlans = [
    {"id":"npd-01","productKey":"NPD_2027Q2_01","seriesId":"ser-sanrio-blooming-heart","stage":"production","plannedLaunchDate":"2027-06-01","launchQuarter":null,
     "stageTargets":{"plan":"2026-05","concept":"2026-07","production":"2027-02","ready":"2027-05"},
     "plannedAccounts":[{"accountId":"seven","plannedStartMonth":"2027-06"},{"accountId":"eveandboy","plannedStartMonth":"2027-06"}],"expectedRsp":199,"owner":"ชนิดา พรหมมา","source":"PRODUCT",
     "note":"ต่อยอด Blooming Heart Glitter Lip Gloss (สีใหม่)","workflow":{"status":"approved","history":[{"action":"submit","by":"ทีม Product","at":"2026-12-10T10:00:00","note":""},{"action":"approve","by":"Sales Director","at":"2026-12-15T15:30:00","note":""}]}},
    {"id":"npd-02","productKey":"NPD_2027Q2_02","seriesId":"ser-sanrio-blooming-heart","stage":"concept","plannedLaunchDate":"2027-06-01","launchQuarter":null,
     "stageTargets":{"plan":"2026-06","concept":"2026-08","production":"2027-02","ready":"2027-05"},
     "plannedAccounts":[{"accountId":"seven","plannedStartMonth":"2027-06"},{"accountId":"eveandboy","plannedStartMonth":"2027-07"}],"expectedRsp":239,"owner":"ชนิดา พรหมมา","source":"PRODUCT",
     "note":"","workflow":{"status":"submitted","history":[{"action":"submit","by":"ทีม Product","at":"2027-01-20T09:30:00","note":""}]}},
    {"id":"npd-03","productKey":"NPD_2027Q2_03","seriesId":"ser-charming-lips","stage":"ready","plannedLaunchDate":"2027-06-01","launchQuarter":null,
     "stageTargets":{"plan":"2026-04","concept":"2026-06","production":"2026-08","ready":"2027-04"},
     "plannedAccounts":[{"accountId":"seven","plannedStartMonth":"2027-06"},{"accountId":"eveandboy","plannedStartMonth":"2027-06"}],"expectedRsp":199,"owner":"ชนิดา พรหมมา","source":"PRODUCT",
     "note":"สีใหม่ของ Juicy Pop Tint","workflow":{"status":"approved","history":[{"action":"submit","by":"ทีม Product","at":"2026-12-10T10:00:00","note":""},{"action":"approve","by":"Sales Director","at":"2026-12-15T15:30:00","note":""}]}},
    {"id":"npd-04","productKey":"NPD_2028Q2_01","seriesId":"ser-charming-glow","stage":"plan","plannedLaunchDate":null,"launchQuarter":"2028-Q2",
     "stageTargets":{"plan":"2026-11","concept":"2027-03"},
     "plannedAccounts":[{"accountId":"eveandboy","plannedStartMonth":null},{"accountId":"watsons","plannedStartMonth":null}],"expectedRsp":459,"owner":"ชนิดา พรหมมา","source":"PRODUCT",
     "note":"Palette ใหม่ รอยืนยันเดือนเปิดตัว","workflow":{"status":"draft","history":[]}},
    {"id":"npd-05","productKey":"NPD_2028Q1_01","seriesId":"ser-perfect-heart","stage":"concept","plannedLaunchDate":"2028-02-01","launchQuarter":null,
     "stageTargets":{"plan":"2026-08","concept":"2026-10","production":"2027-08","ready":"2028-01"},
     "plannedAccounts":[{"accountId":"shopee","plannedStartMonth":"2028-02"},{"accountId":"lazada","plannedStartMonth":"2028-02"}],"expectedRsp":259,"owner":"ชนิดา พรหมมา","source":"PRODUCT",
     "note":"เปิดตัวที่ ECOM ก่อน","workflow":{"status":"approved","history":[{"action":"apply","by":"ทีม Product","at":"2026-09-10T10:00:00","note":""}]}},
    {"id":"npd-06","productKey":"NPD_2027Q2_04","seriesId":"ser-charming-lips","stage":"plan","plannedLaunchDate":"2027-06-01","launchQuarter":null,"stageTargets":{},
     "plannedAccounts":[{"accountId":"watsons","plannedStartMonth":"2027-06"}],"expectedRsp":199,"owner":"","source":"SALES","requestedBy":"พิมพ์ลดา ใจดี",
     "reason":"Watsons ขอสีส้มอิฐสำหรับแคมเปญหน้าร้อน · ลูกค้าถามหาสีใกล้ Tint 05","note":"","workflow":{"status":"approved","history":[{"action":"apply","by":"พิมพ์ลดา ใจดี","at":"2026-09-18T11:00:00","note":""}]}},
    {"id":"npd-07","productKey":"NPD_2027Q3_01","seriesId":"ser-perfect-heart","stage":"plan","plannedLaunchDate":"2027-07-01","launchQuarter":null,"stageTargets":{},
     "plannedAccounts":[{"accountId":"shopee","plannedStartMonth":"2027-07"}],"expectedRsp":259,"owner":"","source":"SALES","requestedBy":"มิลิน แก้วใส",
     "reason":"สีชมพูพีชสำหรับ Live ขายบน Shopee (ขนาดพกพา)","note":"","workflow":{"status":"approved","history":[{"action":"apply","by":"มิลิน แก้วใส","at":"2026-09-19T15:00:00","note":""}]}}
  ];
})(window.SP);

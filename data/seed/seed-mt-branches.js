/*
 * data/seed/seed-mt-branches.js — คู่ค้า (รหัส TRCLOUD) ของหน่วยขายที่แบ่งเป้าตาม Account (CR-32 ส่วน 2.3)
 *
 * **ข้อมูลตัวอย่าง** ยังไม่มีข้อมูลสาขา MT จริงจาก TRCLOUD (open-items) · ห้ามแก้ด้วยมือเมื่อได้ไฟล์จริงแล้ว ให้สร้างไฟล์ใหม่แทนทั้งไฟล์
 *   Beautrium · EVEANDBOY = รายชื่อตาม CR-32 (รหัส TRCLOUD · ชื่อ · Tax ID จริงตามที่ได้รับ)
 *   Account อื่นของ MT = สำนักงานใหญ่ 1 + สาขา 3 (`isSample: true` · รหัส 90001 ขึ้นไป) · ECOM = Platform ละ 1 รายการ (`kind: 'platform'` · รหัส 95001 ขึ้นไป)
 *   กรณีทดสอบ: สาขาที่ยังไม่จัดสรร 3 รายการ (unitId: null · ยอดอ้างอิงเล็ก ไม่นับในยอดหน่วยขาย)
 * ร้านค้า TT อยู่ที่ data/seed/seed-tt-stores.js (ไม่อยู่ในไฟล์นี้)
 *
 *   customers[] = { trcloudId, name, legalName, taxId, trcloudType, kind: headOffice | branch | platform, channelId, unitId | null,
 *                   warehouse (คลังสินค้า · ได้สัดส่วน split.warehouse), refL12M (เฉพาะรายการที่ยังไม่จัดสรร), isSample }
 *   assignFrom  = เดือนแรกที่คู่ค้าอยู่ในหน่วยขาย (เดียวกับร้านค้า TT และผู้รับผิดชอบตั้งต้น)
 *   split       = สัดส่วนยอดอ้างอิง L12M ของหน่วยขาย: สำนักงานใหญ่ 5% · คลังสินค้า 20% · ที่เหลือแบ่งให้สาขาแบบลดหลั่นตามลำดับในไฟล์
 *                 core/units.js คำนวณตอนโหลดจากยอด L12M ของหน่วยขาย (history จาก seed-charmiss.js) ผลรวมเท่ายอดหน่วยขายพอดี (เศษลงรายการสุดท้าย)
 */
(function (SP) {
  'use strict';

  var BEAUTRIUM_TAX = '0105555002130';
  var SPECIALTY = 'Modern Trade - Specialty Store';   // CR-32 ระบุของ Beautrium · EVEANDBOY ใช้ค่าเดียวกัน (สมมติ)
  var EVE_BRANCH_TAX = '0107569000187';
  var HQ_TYPE = 'ผู้ขาย';

  function hq(id, name, channelId, unitId, extra) { return row(id, name, 'headOffice', channelId, unitId, HQ_TYPE, extra); }
  function branch(id, name, channelId, unitId, type, extra) { return row(id, name, 'branch', channelId, unitId, type, extra); }
  function row(id, name, kind, channelId, unitId, type, extra) {
    var r = { trcloudId: String(id), name: name, legalName: null, taxId: null, trcloudType: type, kind: kind, channelId: channelId, unitId: unitId };
    Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
    return r;
  }
  function samples(start, prefix, unitId) {
    var out = [hq(start, prefix + ' สำนักงานใหญ่', 'mt', unitId, { isSample: true })];
    for (var n = 1; n <= 3; n++) out.push(branch(start + n, prefix + '_สาขาตัวอย่าง ' + n, 'mt', unitId, 'Modern Trade', { isSample: true }));
    return out;
  }
  var B = { legalName: 'บริษัท บิวเทรี่ยม จำกัด', taxId: BEAUTRIUM_TAX };
  function bx(extra) { var o = { legalName: B.legalName, taxId: B.taxId }; Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; }); return o; }

  SP.data.seedMtBranches = {
    source: 'ตัวอย่าง CR-32 · รอข้อมูลสาขาจริงจาก TRCLOUD',
    assignFrom: '2026-01',
    split: { headOffice: 0.05, warehouse: 0.20 },
    customers: [].concat(
      // Beautrium (U-MT-004)
      [
        hq(6300, 'BEAUTRIUM (บริษัท บิวเทรี่ยม จำกัด 00026)', 'mt', 'beautrium', bx()),
        branch(3346, 'BEAUTRIUM_คลังสินค้า(00026)', 'mt', 'beautrium', SPECIALTY, bx({ warehouse: true })),
        branch(3107, 'BEAUTRIUM_สาขาอัศวรรณหนองคาย(ST047)', 'mt', 'beautrium', SPECIALTY, bx()),
        branch(3108, 'BEAUTRIUM_สาขามาร์เก็ตวิลเลจสุวรรณภูมิ(ST048)', 'mt', 'beautrium', SPECIALTY, bx()),
        branch(3109, 'BEAUTRIUM_สาขาโลตัสสงขลา(ST049)', 'mt', 'beautrium', SPECIALTY, bx()),
        branch(3110, 'BEAUTRIUM_สาขาเอเชียทีค(ST050)', 'mt', 'beautrium', SPECIALTY, bx()),
        branch(3111, 'BEAUTRIUM_สาขาเซ็นทรัลแจ้งวัฒนะ(ST051)', 'mt', 'beautrium', SPECIALTY, bx()),
        branch(3112, 'BEAUTRIUM_สาขาศูนย์การค้าสีลมคอมเพล็กซ์(ST052)', 'mt', 'beautrium', SPECIALTY, bx()),
        branch(3113, 'BEAUTRIUM_สาขาศูนย์การค้าเกตเวย์บางซื่อ(ST054)', 'mt', 'beautrium', SPECIALTY, bx()),
        branch(3114, 'BEAUTRIUM_สาขาไอเซียน ชุมพร(ST055)', 'mt', 'beautrium', SPECIALTY, bx())
      ],
      // EVEANDBOY (U-MT-003) · สาขาใช้ Tax ID ต่างจากสำนักงานใหญ่ (ใช้ Tax ID แนะนำหน่วยขายไม่ได้)
      [
        hq(8458, 'EVEANDBOY สำนักงานใหญ่', 'mt', 'eveandboy', { taxId: '0445559000295' }),
        branch(8125, 'EVEANDBOY_00086 (BIG C BANGPHLI)', 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX }),
        branch(8262, 'EVEANDBOY_00089 (MAJOR RATCHAYOTHIN)', 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX }),
        branch(8300, 'EVEANDBOY_00093 (ZEER RANGSIT)', 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX }),
        branch(8476, 'EVEANDBOY_00095 (PHITSANULOK)', 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX }),
        branch(8477, 'EVEANDBOY_00092 FULFILLMENT BLC (BANG NA)', 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX }),
        branch(8761, 'EVEANDBOY_00094 KAMPAENGPETCH', 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX }),
        branch(8762, "EVEANDBOY_00087 LOTUS'S THALANG", 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX }),
        branch(8763, 'EVEANDBOY_00097 YING CHAROEN SQUARE', 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX }),
        branch(8764, 'EVEANDBOY_00099 Big C Pattaya 2', 'mt', 'eveandboy', SPECIALTY, { taxId: EVE_BRANCH_TAX })
      ],
      // Account อื่นของ MT (ตัวอย่าง · คำนำหน้า = ชื่อ Account ตัวพิมพ์ใหญ่ ไม่มีช่องว่างและเครื่องหมาย)
      samples(90001, '7ELEVEN', 'seven'),
      samples(90005, 'WATSONS', 'watsons'),
      samples(90009, 'CJEXPRESS', 'cjexpress'),
      samples(90013, 'KONVY', 'konvy'),
      samples(90017, 'LOTUSS', 'lotuss'),
      samples(90021, 'TSURUHA', 'tsuruha'),
      samples(90025, 'MRDIY', 'mrdiy'),
      // กรณีทดสอบ: ยังไม่จัดสรร (แนะนำ Beautrium · แนะนำ EVEANDBOY · ไม่มีคำนำหน้าที่ตรงกับหน่วยขายใด)
      [
        branch(90901, 'BEAUTRIUM_สาขาตัวอย่างใหม่ 1', 'mt', null, SPECIALTY, { taxId: BEAUTRIUM_TAX, refL12M: 12000, isSample: true }),
        branch(90902, 'EVEANDBOY_สาขาตัวอย่างใหม่ 1', 'mt', null, SPECIALTY, { taxId: EVE_BRANCH_TAX, refL12M: 8000, isSample: true }),
        branch(90903, 'NEWACCOUNT_สาขาตัวอย่าง 1', 'mt', null, 'Modern Trade', { refL12M: 5000, isSample: true })
      ],
      // ECOM: 1 Platform = 1 รหัสคู่ค้า
      [
        row(95001, 'Shopee', 'platform', 'ecom', 'shopee', 'E-Commerce', { isSample: true }),
        row(95002, 'Lazada', 'platform', 'ecom', 'lazada', 'E-Commerce', { isSample: true }),
        row(95003, 'Tiktok', 'platform', 'ecom', 'tiktok', 'E-Commerce', { isSample: true }),
        row(95004, 'Website (Own)', 'platform', 'ecom', 'website', 'E-Commerce', { isSample: true }),
        row(95005, 'LINE Shop', 'platform', 'ecom', 'lineshop', 'E-Commerce', { isSample: true })
      ]
    )
  };
})(window.SP);

/*
 * core/loader.js — จุดเริ่มต้นของทุกหน้า
 *
 * วิธีใช้ (บรรทัดเดียวในแต่ละหน้า):
 *   <script src="../../core/loader.js" data-module="top-down.js"></script>
 *
 * - สร้าง window.SP ซึ่งเป็นตัวแปร Global ตัวเดียวของเว็บ
 * - โหลดไฟล์ใน FILES ตามลำดับ (async = false รักษาลำดับ) แล้วโหลด JS ของ Module
 *   ที่ระบุใน data-module (Path เทียบกับหน้านั้น · CR-39 หลายไฟล์ของหน้าเดียวกันคั่นด้วยช่องว่าง ตามลำดับ)
 * - โหลดครบแล้วเรียก SP.core.layout.boot()
 *
 * รายการไฟล์ core/ และ data/ อยู่ที่นี่ที่เดียว ถ้าเพิ่มไฟล์ใน core/ หรือ data/ ให้เพิ่มใน FILES
 * data/seed/ (ข้อมูลจริงจาก Excel ห้ามแก้ด้วยมือ) โหลดก่อน data/products.js แล้ว core/seed.js แปลงเข้าโครง Product Master
 * หลัง core/calc.js และก่อน core/store.js
 * CR-16: data/seed/seed-tt-stores.js + data/stores.js (กฎนำเข้า) → core/stores.js นำเข้าร้านค้า TT หลัง core/calc.js และก่อน core/seed.js
 * CR-19: data/teams.js (ทีมขายต่อ Channel) หลัง data/salespeople.js · core/permissions.js (สิทธิ์) หลัง core/workflow.js
 * CR-21: data/permissions.js (บทบาท + ค่าตั้งต้นของสิทธิ์) · data/users.js (ผู้ใช้จำลอง) หลัง data/teams.js
 * CR-24: core/clock.js (เดือนปัจจุบันกลาง · L12M) หลัง core/features.js
 * CR-29: core/master.js (ฟังก์ชันล้วนของ Account Master) หลัง core/guide.js
 * CR-28: data/guide.js (คู่มือ · ปุ่ม ? ของแต่ละหน้า · CR-36 ไม่มีสถานการณ์ทดสอบ) หลัง data/content.js · core/guide.js (ฟังก์ชันล้วนของคู่มือ) หลัง core/registry.js
 * CR-38: data/revisions.js (รอบตั้งต้น · ข้อมูลตัวอย่าง Revision) หลัง data/users.js · core/revision.js หลัง core/store.js
 * CR-39: data/approvals.js (ตั้งค่าขั้นอนุมัติ · ตัวอย่างคำขอ) หลัง data/revisions.js · core/approval.js (คำขออนุมัติ) หลัง core/revision.js
 * CR-40: assets/icons.js (ไอคอนเส้นของ Lucide · ข้อมูลเท่านั้น) หลัง data/guide.js — components.icon อ่านตอนวาดหน้า
 * CR-41: data/scenarios.js (สถานการณ์ Demo) หลัง data/settings.js ก่อน core/clock.js (นาฬิกาอ่านสถานการณ์ตอนโหลด) ·
 *        core/scenario.js หลัง core/seed.js ก่อน core/units.js (ยอดจริงตัวอย่างของสถานการณ์ต้องมีก่อนคำนวณยอดอ้างอิงของคู่ค้า)
 * CR-32: data/seed/seed-mt-branches.js (คู่ค้าของ Account / Platform ตัวอย่าง) หลัง data/stores.js · core/units.js (หน่วยขายและคู่ค้า) หลัง core/seed.js
 *   (แบ่งยอดอ้างอิงของคู่ค้าจากยอด L12M ของหน่วยขาย จึงต้องมี history ก่อน)
 *   (ยอดขายปีก่อนของเขตต้องมีก่อน core/seed.js สร้างยอดขายปีก่อนราย SKU ของเขต)
 */
(function () {
  'use strict';

  var FILES = [
    'core/paths.js',
    'core/format.js',
    'data/settings.js',
    'data/scenarios.js',   // CR-41 สถานการณ์ Demo (นาฬิกากลาง)
    'core/features.js',
    'core/clock.js',
    'data/channels.js',
    'data/accounts.js',
    'data/territories.js',
    'data/salespeople.js',
    'data/teams.js',
    'data/permissions.js',
    'data/users.js',
    'data/revisions.js',   // CR-38
    'data/approvals.js',   // CR-39
    'data/assignments.js',
    'data/seed/seed-tt-stores.js',
    'data/stores.js',
    'data/seed/seed-mt-branches.js',
    'data/taxonomy.js',
    'data/seed/seed-charmiss.js',
    'data/products.js',
    'data/listings.js',
    'data/pricing.js',
    'data/npd.js',
    'data/targets.js',
    'data/history.js',
    'data/actuals.js',
    'data/plan-seeds.js',
    'data/erp-snapshot.js',
    'data/content.js',
    'data/guide.js',
    'assets/icons.js',     // CR-40 ไอคอนเมนู แถบบน และปุ่ม (Lucide · ISC)
    'core/calc.js',
    'core/catalog.js',
    'core/stores.js',
    'core/seed.js',
    'core/scenario.js',    // CR-41 ยอดจริงตัวอย่างของสถานการณ์ (ก่อน units) · โหลดสถานการณ์ (ใช้ store ตอนเรียก)
    'core/units.js',
    'core/plan-edits.js',   // CR-34: เพิ่ม / ขอ / นำสินค้าออกจากแผน SKU (ตรวจสิทธิ์ในฟังก์ชัน)
    'core/taxonomy.js',
    'core/workflow.js',
    'core/permissions.js',
    'core/registry.js',
    'core/guide.js',
    'core/master.js',
    'core/store.js',
    'core/revision.js',    // CR-38 Revision (หลัง store · ใช้ report / permissions ตอนเรียก)
    'core/approval.js',    // CR-39 คำขออนุมัติ (หลัง revision · store เรียก guardWrite)
    'core/components.js',
    'core/charts.js',
    'core/export.js',
    'core/report.js',
    'core/layout.js'
  ];

  var SP = window.SP = window.SP || {};
  SP.core = SP.core || {};
  SP.data = SP.data || {};
  SP.modules = SP.modules || {};

  var me = document.currentScript;
  var rootRel = me.getAttribute('src').replace(/core\/loader\.js(?:[?#].*)?$/, '');
  var moduleFile = me.getAttribute('data-module');

  var loader = SP.core.loader = {
    script: me,
    rootRel: rootRel,
    moduleFile: moduleFile,
    errors: []
  };

  var target = document.head || document.documentElement;

  function showError(url) {
    var root = document.getElementById('module-root') || document.body;
    var box = document.createElement('p');
    box.className = 'load-error';
    box.textContent = 'โหลดไฟล์ไม่ได้: ' + url;
    root.appendChild(box);
  }

  function add(url, isLast) {
    var s = document.createElement('script');
    s.src = url;
    s.async = false;
    s.onerror = function () {
      loader.errors.push(url);
      showError(url);
      if (isLast) boot();
    };
    if (isLast) s.onload = boot;
    target.appendChild(s);
  }

  function boot() {
    if (SP.core.layout && SP.core.layout.boot) SP.core.layout.boot();
  }

  // CR-39: data-module มีได้หลายไฟล์ของหน้าเดียวกัน คั่นด้วยช่องว่าง (เช่น Plan Summary = summary.js summary-revision.js) · boot หลังไฟล์สุดท้าย
  var moduleFiles = String(moduleFile || '').split(/[\s,]+/).filter(Boolean);
  FILES.forEach(function (f, i) {
    add(rootRel + f, !moduleFiles.length && i === FILES.length - 1);
  });
  moduleFiles.forEach(function (f, i) { add(f, i === moduleFiles.length - 1); });
})();

/*
 * core/loader.js — จุดเริ่มต้นของทุกหน้า
 *
 * วิธีใช้ (บรรทัดเดียวในแต่ละหน้า):
 *   <script src="../../core/loader.js" data-module="top-down.js"></script>
 *
 * - สร้าง window.SP ซึ่งเป็นตัวแปร Global ตัวเดียวของเว็บ
 * - โหลดไฟล์ใน FILES ตามลำดับ (async = false รักษาลำดับ) แล้วโหลด JS ของ Module
 *   ที่ระบุใน data-module (Path เทียบกับหน้านั้น)
 * - โหลดครบแล้วเรียก SP.core.layout.boot()
 *
 * รายการไฟล์ core/ และ data/ อยู่ที่นี่ที่เดียว ถ้าเพิ่มไฟล์ใน core/ หรือ data/ ให้เพิ่มใน FILES
 * data/seed/ (ข้อมูลจริงจาก Excel ห้ามแก้ด้วยมือ) โหลดก่อน data/products.js แล้ว core/seed.js แปลงเข้าโครง Product Master
 * หลัง core/calc.js และก่อน core/store.js
 * CR-16: data/seed/seed-tt-stores.js + data/stores.js (กฎนำเข้า) → core/stores.js นำเข้าร้านค้า TT หลัง core/calc.js และก่อน core/seed.js
 * CR-19: data/teams.js (ทีมขายต่อ Channel) หลัง data/salespeople.js · core/permissions.js (สิทธิ์) หลัง core/workflow.js
 * CR-21: data/permissions.js (บทบาท + ค่าตั้งต้นของสิทธิ์) · data/users.js (ผู้ใช้จำลอง) หลัง data/teams.js
 * CR-24: core/clock.js (เดือนปัจจุบันกลาง · L12M) หลัง core/features.js
 *   (ยอดขายปีก่อนของเขตต้องมีก่อน core/seed.js สร้างยอดขายปีก่อนราย SKU ของเขต)
 */
(function () {
  'use strict';

  var FILES = [
    'core/paths.js',
    'core/format.js',
    'data/settings.js',
    'core/features.js',
    'core/clock.js',
    'data/channels.js',
    'data/accounts.js',
    'data/territories.js',
    'data/salespeople.js',
    'data/teams.js',
    'data/permissions.js',
    'data/users.js',
    'data/assignments.js',
    'data/seed/seed-tt-stores.js',
    'data/stores.js',
    'data/taxonomy.js',
    'data/seed/seed-charmiss.js',
    'data/products.js',
    'data/listings.js',
    'data/pricing.js',
    'data/promotions.js',
    'data/npd.js',
    'data/targets.js',
    'data/history.js',
    'data/actuals.js',
    'data/plan-seeds.js',
    'data/erp-snapshot.js',
    'data/content.js',
    'core/calc.js',
    'core/stores.js',
    'core/seed.js',
    'core/taxonomy.js',
    'core/workflow.js',
    'core/permissions.js',
    'core/registry.js',
    'core/store.js',
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

  FILES.forEach(function (f, i) {
    add(rootRel + f, !moduleFile && i === FILES.length - 1);
  });
  if (moduleFile) add(moduleFile, true);
})();

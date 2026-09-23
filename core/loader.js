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
 */
(function () {
  'use strict';

  var FILES = [
    'core/paths.js',
    'core/format.js',
    'data/settings.js',
    'data/channels.js',
    'data/accounts.js',
    'data/territories.js',
    'data/salespeople.js',
    'data/assignments.js',
    'data/products.js',
    'data/listings.js',
    'data/pricing.js',
    'data/targets.js',
    'data/history.js',
    'data/actuals.js',
    'data/plan-seeds.js',
    'data/content.js',
    'core/calc.js',
    'core/workflow.js',
    'core/registry.js',
    'core/store.js',
    'core/components.js',
    'core/charts.js',
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

/*
 * modules/revision-compare/revision-compare.js — หน้าเดิมของ CR-38 (CR-39 เป็นแท็บเปรียบเทียบของ Plan Summary · registry visible: false · ใช้สิทธิ์ของ Plan Summary)
 *
 * หน้าที่:        ลิงก์เดิมพาไป Plan Summary แท็บเปรียบเทียบทันที (โค้ดเดิมอยู่ที่ modules/summary/summary-revision.js · ui.revisionCompare ยังส่งต่อได้)
 * อ่านจาก data/:  content (pages.revisionCompare.moved · go) · store เขียน: ui.summaryTab
 */
(function (SP) {
  'use strict';

  function render(root, ctx) {
    var C = SP.core.components;
    var href = SP.core.paths.to(SP.core.registry.byId('summary').path) + '#compare';
    SP.core.store.set('ui.summaryTab', 'compare');
    root.appendChild(C.h('p', { class: 'callout callout-info' }, ctx.page.moved, ' · ', C.h('a', { href: href }, ctx.page.go)));
    location.replace(href);
  }

  SP.modules.revisionCompare = { render: render };
})(window.SP);

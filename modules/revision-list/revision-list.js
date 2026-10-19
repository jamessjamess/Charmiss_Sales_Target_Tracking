/*
 * modules/revision-list/revision-list.js — หน้าเดิมของ CR-38 (CR-39 เป็นแท็บ Revision ของ Plan Summary · registry visible: false · ใช้สิทธิ์ของ Plan Summary)
 *
 * หน้าที่:        ลิงก์เดิมพาไป Plan Summary แท็บ Revision ทันที (โค้ดเดิมอยู่ที่ modules/summary/summary-revision.js)
 * อ่านจาก data/:  content (pages.revisionList.moved · go) · store เขียน: ui.summaryTab
 */
(function (SP) {
  'use strict';

  function render(root, ctx) {
    var C = SP.core.components;
    var href = SP.core.paths.to(SP.core.registry.byId('summary').path) + '#revision';
    SP.core.store.set('ui.summaryTab', 'revision');
    root.appendChild(C.h('p', { class: 'callout callout-info' }, ctx.page.moved, ' · ', C.h('a', { href: href }, ctx.page.go)));
    location.replace(href);
  }

  SP.modules.revisionList = { render: render };
})(window.SP);

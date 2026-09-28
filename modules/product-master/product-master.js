/*
 * modules/product-master/product-master.js — หน้าเดิมของ Product Master (CR-35 รวมเป็น Launch & Listing · registry visible: false · ใช้สิทธิ์ของ launchListing)
 *
 * หน้าที่:        ลิงก์เดิมพาไปหน้า Launch & Listing แท็บ Listing ทันที (โค้ดเดิมอยู่ที่ modules/launch-listing/launch-listing.js)
 * อ่านจาก data/:  content (moved · go) · store: ui.launchTab
 */
(function (SP) {
  'use strict';

  function render(root, ctx) {
    var C = SP.core.components;
    var href = SP.core.paths.to(SP.core.registry.byId('launchListing').path) + '#listing';
    SP.core.store.set('ui.launchTab', 'listing');
    root.appendChild(C.h('p', { class: 'callout callout-info' }, ctx.page.moved, ' · ', C.h('a', { href: href }, ctx.page.go)));
    location.replace(href);
  }

  SP.modules.productMaster = { render: render };
})(window.SP);

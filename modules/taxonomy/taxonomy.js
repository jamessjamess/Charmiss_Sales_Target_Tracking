/*
 * modules/taxonomy/taxonomy.js — หน้าเดิมของ Product Master (CR-36 ย้ายเป็นแท็บ Product Level ของ Product List · registry visible: false · perm productList)
 *
 * หน้าที่:        ลิงก์เดิมพาไปหน้า Product List แท็บ Product Level ทันที (โค้ดเดิมอยู่ที่ modules/products/products.js · renderLevel)
 * อ่านจาก data/:  content (moved · go) · store: ui.productListTab
 */
(function (SP) {
  'use strict';

  function render(root, ctx) {
    var C = SP.core.components;
    var href = SP.core.paths.to(SP.core.registry.byId('productList').path) + '#level';
    SP.core.store.set('ui.productListTab', 'level');
    root.appendChild(C.h('p', { class: 'callout callout-info' }, ctx.page.moved, ' · ', C.h('a', { href: href }, ctx.page.go)));
    location.replace(href);
  }

  SP.modules.taxonomy = { render: render };
})(window.SP);

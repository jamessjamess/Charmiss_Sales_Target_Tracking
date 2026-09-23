/*
 * core/paths.js — หา Root ของเว็บจาก src ของ loader.js
 *
 * ใช้สร้างลิงก์แบบ relative ที่ถูกทั้งตอนเปิดจากเครื่อง (file://) และบน GitHub Pages
 *   SP.core.paths.to('modules/top-down/index.html')  → '../../modules/top-down/index.html'
 *   SP.core.paths.current()                          → 'modules/top-down/index.html'
 */
(function (SP) {
  'use strict';

  var loader = SP.core.loader;
  var rootRel = loader.rootRel;
  var rootAbs = loader.script.src.replace(/core\/loader\.js(?:[?#].*)?$/, '');

  function clean(url) {
    var u = url.split('#')[0].split('?')[0];
    try { return decodeURIComponent(u); } catch (e) { return u; }
  }

  // Path ของหน้าปัจจุบันเทียบกับ Root เช่น 'index.html' หรือ 'modules/phasing/index.html'
  function current() {
    var here = clean(location.href);
    var base = clean(rootAbs);
    var p = here.indexOf(base) === 0 ? here.slice(base.length) : here;
    if (p === '' || p.charAt(p.length - 1) === '/') p += 'index.html';
    return p;
  }

  SP.core.paths = {
    root: rootRel,
    to: function (path) { return rootRel + path; },
    current: current
  };
})(window.SP);

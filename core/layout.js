/*
 * core/layout.js — Header, Side Menu, เลือกปี, บทบาทจำลอง, ปุ่มรีเซ็ต, ปุ่มก่อนหน้า/ถัดไป (ที่เดียวทั้งเว็บ)
 *
 * boot() ถูกเรียกจาก loader.js เมื่อโหลดไฟล์ครบ:
 *   1. หา Module ของหน้านี้จาก registry (เทียบ Path) และจาก SP.modules
 *      index.html ที่ Root (ไม่มี Module) → พาไปหน้าแรกของ Sales Planning ตามลำดับ Tour ใน registry
 *   2. Header แถวเดียว: ชื่อระบบ + Prototype · มุมมองผู้ใช้ (จำลอง) · เกี่ยวกับ Prototype · รีเซ็ตข้อมูล (+ ☰ เมื่อจอแคบกว่า 1024px)
 *      ปีแผนไม่อยู่ใน Header (CR-10): อยู่ต่อท้ายชื่อหน้า (components.planYearPicker) เฉพาะหน้าที่ registry ตั้ง year: true
 *   3. Side Menu ซ้าย 4 กลุ่มจาก registry (group) พับเหลือไอคอนได้ (ui.sidebarCollapsed)
 *      หน้าวางแผน SKU พับให้เองเมื่อจอกว้างน้อยกว่า 2200px (รวมจอ 1920px — CR-11) / ไอคอนสถานะ Workflow ข้างหน้าใน Sales Planning
 *      (ขั้นที่ 4 = จำนวนรายการที่ต้องดำเนินการจาก core/report.js คำนวณหลังหน้าแสดงแล้ว — CR-12)
 *   4. หัวข้อ (+ Tooltip pages.<id>.titleTip) ปีแผน และคำอธิบาย (จาก content.js) — แถวหัวข้อส่งให้ Module ใส่ workflowBar ได้ (ctx.intro)
 *      ชื่อในเมนูของ Sales Planning = ชื่อเต็ม ถ้ายาวเกินบรรทัดเดียวใช้ชื่อย่อ (pages.<id>.short) / ปุ่มก่อนหน้า/ถัดไปใช้ชื่อย่อ
 *      กล่องสิ่งที่ต้องการให้อนุมัติ (เฉพาะหน้าที่มี approve ใน content.js ตอนนี้คือหน้าเกี่ยวกับ Prototype)
 *   5. เรียก SP.modules.<id>.render(bodyElement, ctx)
 *   6. แถบก่อนหน้า/ถัดไปติดล่างจอ และปุ่มลูกศรซ้าย/ขวา เฉพาะหน้าในกลุ่ม Sales Planning
 * store อ่าน: app.planYear, ui.role, ui.sidebarCollapsed, ui.selection, ui.planMode, plan.<ปี>.workflow.*, master.salespeople
 * store เขียน: app.planYear, ui.role, ui.sidebarCollapsed
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var h = C.h;
  var menuState = { entry: null, links: {} };

  function link(entry) { return SP.core.paths.to(entry.path); }

  // ค่าที่เติมในชื่อหน้า/เมนู: {territoryChannels} = ชื่อ Channel ที่แบ่งเป้าตามเขต (จาก Channel Master),
  // {territoryChannelsFull} = ชื่อเต็ม, {year} = ปีแผน
  function titleVars() {
    var tt = SP.data.channels.filter(function (c) { return c.allocationUnit === 'TERRITORY'; });
    return {
      territoryChannels: tt.map(function (c) { return c.name; }).join(', '),
      territoryChannelsFull: tt.map(function (c) { return c.fullName; }).join(', '),
      year: SP.core.store.year()
    };
  }
  function fillTitle(text) { return C.fill(text, titleVars()).replace(/\s*\(\)$/, ''); }
  // ชื่อหน้า: เต็ม = pages.<id>.title / ย่อ = pages.<id>.short (ค่าสำรองจาก registry) — Module ไม่เขียนชื่อหน้าเอง
  function pageOf(e) { return SP.data.content.pages[e.id] || {}; }
  function fullLabel(e) { return fillTitle(pageOf(e).title || e.title); }
  function shortLabel(e) { return fillTitle(pageOf(e).short || e.short || pageOf(e).title || e.title); }
  function menuLabel(e) { return e.group === 'sales-planning' ? fullLabel(e) : shortLabel(e); }

  // บทบาทจำลอง: Management / Sales Director / Sales Person (เลือกชื่อ ที่ยังทำงานอยู่ในเดือนปัจจุบันจำลอง)
  function buildRolePicker() {
    var store = SP.core.store;
    var calc = SP.core.calc;
    var site = SP.data.content.site;
    var R = SP.data.content.labels.roles;
    var role = store.role();
    var key = store.currentKey();
    var people = store.get('master.salespeople').filter(function (p) { return calc.employedIn(p, key) || (role.type === 'sales' && role.personId === p.id); });
    var value = role.type === 'sales' ? 'sales:' + role.personId : role.type;
    var options = [{ value: 'management', label: R.management }, { value: 'director', label: R.director }]
      .concat(['product', 'supply', 'trade'].map(function (t) { return { value: t, label: R[t], group: site.roleGroupProduct }; }))
      .concat(people.map(function (p) { return { value: 'sales:' + p.id, label: p.name, group: site.roleGroupSales }; }));
    return h('div', { class: 'role-picker' },
      h('label', { class: 'role-field' },
        h('span', { class: 'field-label' }, site.roleLabel),
        C.select({
          label: site.roleLabel, value: value, options: options, className: 'role-select',
          onChange: function (v) {
            var parts = v.split(':');
            store.set('ui.role', { type: parts[0], personId: parts[1] || null });
            location.reload();
          }
        })),
      h('span', { class: 'role-note' }, site.roleNote));
  }

  function buildHeader() {
    var site = SP.data.content.site;
    var store = SP.core.store;

    var reset = h('button', {
      type: 'button', class: 'btn btn-ghost btn-sm header-reset',
      onClick: function () {
        if (window.confirm(site.resetConfirm)) { C.guardUnsaved(null); store.reset(); location.reload(); }
      }
    }, site.reset);

    var warning = store.status.crossPage ? null : h('span', { class: 'store-warning', role: 'status' }, site.storeWarning);
    var burger = h('button', {
      type: 'button', class: 'btn btn-ghost btn-sm menu-burger', 'aria-label': site.menuOpen, 'aria-controls': 'side-menu', 'aria-expanded': 'false',
      onClick: function () {
        var open = !document.body.classList.contains('sidebar-open');
        document.body.classList.toggle('sidebar-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    }, '☰');

    var about = SP.core.registry.byId('aboutPrototype');
    return h('header', { class: 'site-header' },
      h('div', { class: 'header-bar' },
        burger,
        h('a', { class: 'brand', href: SP.core.paths.to('index.html') },
          h('span', { class: 'brand-name' }, site.name),
          h('span', { class: 'brand-badge' }, site.badge)),
        h('div', { class: 'header-actions' }, warning, buildRolePicker(),
          about ? h('a', { class: 'header-link', href: link(about) }, site.aboutLink) : null, reset)));
  }

  // ---------------------------------------------------------------------
  // Side Menu
  // ---------------------------------------------------------------------

  // สถานะ Workflow ของหน้าใน Sales Planning ตามหน่วยที่เลือกอยู่ (null = ไม่แสดงไอคอน)
  function workflowOfEntry(e) {
    var store = SP.core.store;
    var W = SP.core.workflow;
    var calc = SP.core.calc;
    var states = store.workflowStates();
    if (e.id === 'topDown') return W.stateOf(states, 'topDown').status;
    if (e.id === 'summary') return null;
    if (e.id !== 'phasing' && e.id !== 'skuPlanning') return null;
    var tree = calc.topDown(store.data(), store.get(store.planKey('topDown')), store.year());
    var unit = calc.resolveSelection(tree, store.get('ui.selection')).unit;
    if (!unit) return null;
    var step = e.id === 'phasing' ? 'phasing' : W.isLocked(states) && store.get('ui.planMode') === 'reforecast' ? 'forecast' : 'sku';
    return W.stateOf(states, step, unit.id).status;
  }

  // ไอคอนสถานะข้างชื่อ (เมื่อขยายเมนู) และสถานะใน Tooltip ของลิงก์ (ทั้งพับและขยาย)
  // ขั้นที่ 4 (CR-12) = จำนวนรายการที่ต้องดำเนินการ (core/report.js) คำนวณหลังหน้าแสดงแล้ว / ไม่มีรายการ + ล็อก Baseline แล้ว = ไอคอนล็อก
  var countTimer = null;
  function refreshMenu() {
    var W = SP.data.content.labels.workflow;
    Object.keys(menuState.links).forEach(function (id) {
      var ref = menuState.links[id];
      if (id === 'summary' && ref.status) { scheduleCount(ref); return; }
      var st = ref.status ? workflowOfEntry(ref.entry) : null;
      ref.link.title = ref.label + (st ? ' · ' + W.status[st] : '');
      if (!ref.status) return;
      C.clear(ref.status);
      if (st) ref.status.appendChild(C.wfIcon(st));
    });
  }
  function scheduleCount(ref) {
    if (countTimer) clearTimeout(countTimer);
    countTimer = setTimeout(function () {
      countTimer = null;
      var site = SP.data.content.site;
      var n = SP.core.report ? SP.core.report.actionCount() : 0;
      var locked = SP.core.workflow.isLocked(SP.core.store.workflowStates());
      var text = n ? C.fill(site.actionCount, { n: n }) : locked ? SP.data.content.labels.workflow.status.locked : '';
      ref.link.title = ref.label + (text ? ' · ' + text : '');
      C.clear(ref.status);
      if (n) ref.status.appendChild(h('span', { class: 'side-count', title: text, 'aria-label': text }, String(n)));
      else if (locked) ref.status.appendChild(C.wfIcon('locked'));
    }, 0);
  }

  function buildSideMenu(entry) {
    var site = SP.data.content.site;
    var store = SP.core.store;
    var registry = SP.core.registry;
    var tour = registry.tour();
    menuState.entry = entry;
    menuState.links = {};

    var nav = h('nav', { class: 'side-menu', id: 'side-menu', 'aria-label': site.menu });
    registry.menu().forEach(function (g) {
      var planning = g.id === 'sales-planning';
      nav.appendChild(h('div', { class: 'side-group' },
        h('div', { class: 'side-group-title' }, site.groups[g.id] || g.id),
        h('ol', { class: 'side-list' + (planning ? ' is-steps' : '') }, g.entries.map(function (e) {
          var current = e === entry;
          var label = menuLabel(e);
          var status = planning ? h('span', { class: 'side-status' }) : null;
          var icon = planning ? String(tour.indexOf(e) + 1) : (e.icon || label.charAt(0));
          var a = h('a', { href: link(e), class: 'side-link' + (current ? ' is-current' : ''), 'aria-current': current ? 'page' : null, title: label },
            h('span', { class: 'side-icon' + (planning ? ' is-step' : '') }, icon),
            h('span', { class: 'side-label' }, label),
            status);
          menuState.links[e.id] = { entry: e, status: status, link: a, label: label, short: planning ? shortLabel(e) : null };
          return h('li', null, a);
        }))));
    });

    var collapse = h('button', {
      type: 'button', class: 'side-collapse no-print',
      onClick: function () {
        var collapsed = !document.body.classList.contains('sidebar-collapsed');
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        store.set('ui.sidebarCollapsed', collapsed);
        setCollapseLabel();
        nav.fitLabels();
      }
    });
    function setCollapseLabel() {
      var collapsed = document.body.classList.contains('sidebar-collapsed');
      C.clear(collapse).appendChild(document.createTextNode(collapsed ? '»' : '« ' + site.collapse));
      collapse.title = collapsed ? site.expand : site.collapse;
      collapse.setAttribute('aria-label', collapse.title);
    }
    nav.appendChild(collapse);
    nav.setCollapseLabel = setCollapseLabel;
    // ชื่อเต็มยาวเกินบรรทัดเดียว → ใช้ชื่อย่อ (เรียกหลังวางเมนูในหน้าแล้ว และเมื่อ Font โหลดเสร็จ)
    nav.fitLabels = function () {
      if (document.body.classList.contains('sidebar-collapsed')) return;
      Object.keys(menuState.links).forEach(function (id) {
        var ref = menuState.links[id];
        if (!ref.short) return;
        var span = ref.link.querySelector('.side-label');
        span.textContent = ref.label;
        if (span.scrollWidth > span.clientWidth + 1) span.textContent = ref.short;
      });
    };
    return nav;
  }

  // หน้าที่ไม่มีหัวข้อใน content.js และไม่อยู่ใน registry (เช่น tests) ให้ Module สร้างหัวข้อเอง
  function buildIntro(page, entry, tour, idx) {
    var site = SP.data.content.site;
    var title = page.title || (entry && entry.title);
    if (!title) return null;
    var line = h('div', { class: 'intro-line' },
      idx >= 0 ? h('span', { class: 'eyebrow' }, C.fill(site.stepOf, { n: idx + 1, total: tour.length })) : null,
      h('h1', { title: page.titleTip || null }, fillTitle(title)),
      entry && entry.year ? C.planYearPicker() : null);
    var intro = h('div', { class: 'page-intro' }, line, (page.lead || []).slice(0, 1).map(function (t) { return h('p', { class: 'lead' }, fillTitle(t)); }));
    intro.line = line;
    return intro;
  }

  function buildTourNav(tour, idx) {
    var site = SP.data.content.site;
    var prev = tour[idx - 1];
    var next = tour[idx + 1];
    return h('nav', { class: 'tour-nav', 'aria-label': site.prev + ' / ' + site.next },
      h('div', { class: 'tour-nav-inner' },
        prev ? h('a', { class: 'btn btn-secondary btn-sm tour-prev', href: link(prev), rel: 'prev', title: fullLabel(prev) }, '← ' + site.prev + ': ' + shortLabel(prev)) : h('span'),
        next ? h('a', { class: 'btn btn-primary btn-sm tour-next', href: link(next), rel: 'next', title: fullLabel(next) }, site.next + ': ' + shortLabel(next) + ' →')
          : h('a', { class: 'btn btn-primary btn-sm tour-next', href: link(tour[0]) }, site.finish + ' ↺')));
  }

  function isTyping(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable;
  }

  function bindKeyboard(tour, idx) {
    if (idx < 0) return;
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isTyping(document.activeElement) || document.querySelector('dialog[open]')) return;
      var go = null;
      if (e.key === 'ArrowLeft' && idx > 0) go = tour[idx - 1];
      if (e.key === 'ArrowRight' && idx < tour.length - 1) go = tour[idx + 1];
      if (go) { e.preventDefault(); location.href = link(go); }
    });
  }

  function boot() {
    var registry = SP.core.registry;
    var content = SP.data.content;
    var store = SP.core.store;
    var entry = registry.byPath(SP.core.paths.current());
    var tour = registry.tour();

    // index.html ที่ Root → ไปหน้าแรกของ Sales Planning
    if (!entry && SP.core.paths.current() === 'index.html' && tour.length) {
      location.replace(link(tour[0]));
      return;
    }

    var ids = Object.keys(SP.modules);
    var moduleId = entry && SP.modules[entry.id] ? entry.id : ids[0];
    var mod = SP.modules[moduleId];
    var page = content.pages[entry ? entry.id : moduleId] || {};
    var idx = entry ? tour.indexOf(entry) : -1;

    // หน้าที่ไม่มีหัวข้อใน content.js (เช่น หน้า Test) ใช้ <title> เดิมของไฟล์
    var pageTitle = page.title || (entry && entry.title);
    if (pageTitle) document.title = fillTitle(pageTitle) + ' · ' + content.site.name;

    var root = document.getElementById('module-root');
    if (!root) { root = h('main', { id: 'module-root' }); document.body.appendChild(root); }
    var errors = Array.prototype.slice.call(root.querySelectorAll('.load-error'));
    C.clear(root);
    root.classList.add('page');
    if (entry) document.body.classList.add('page-' + entry.id);
    if (entry && entry.fit) document.body.classList.add('fit-screen');

    // พับเมนู: ค่าที่จำไว้ / หน้าวางแผน SKU พับเองเมื่อจอกว้างน้อยกว่า 2200px (รวมจอ 1920px) ให้ 12 เดือน + ยอดปีก่อนพอดีจอ (CR-11)
    var autoCollapse = entry && entry.id === 'skuPlanning' && window.innerWidth < 2200;
    if (store.get('ui.sidebarCollapsed') || autoCollapse) document.body.classList.add('sidebar-collapsed');

    var header = buildHeader();
    var side = entry ? buildSideMenu(entry) : null;
    var mainCol = h('div', { class: 'app-main' });
    var shell = h('div', { class: 'app-shell' }, side, mainCol,
      side ? h('div', { class: 'side-backdrop', onClick: function () { document.body.classList.remove('sidebar-open'); } }) : null);
    document.body.insertBefore(header, root);
    document.body.insertBefore(shell, root);
    mainCol.appendChild(root);
    if (side) {
      side.setCollapseLabel();
      side.fitLabels();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(side.fitLabels);
    }

    var body = h('div', { class: 'module-body' });
    var intro = buildIntro(page, entry, tour, idx);
    if (intro) root.appendChild(intro);
    errors.forEach(function (e) { root.appendChild(e); });
    root.appendChild(body);
    if (page.approve && page.approve.length) root.appendChild(C.approveBox(page.approve, page.approveTitle));
    if (idx >= 0) mainCol.appendChild(buildTourNav(tour, idx));

    bindKeyboard(tour, idx);
    refreshMenu();

    if (mod && typeof mod.render === 'function') {
      mod.render(body, { entry: entry, page: page, content: content, year: store.year(), intro: intro ? intro.line : null, refreshMenu: refreshMenu });
    }
  }

  SP.core.layout = { boot: boot, refreshMenu: refreshMenu };
})(window.SP);

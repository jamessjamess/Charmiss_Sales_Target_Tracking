/*
 * core/layout.js — Header, Side Menu, เลือกปี, บทบาทจำลอง, ปุ่มรีเซ็ต, ปุ่มก่อนหน้า/ถัดไป (ที่เดียวทั้งเว็บ)
 *
 * boot() ถูกเรียกจาก loader.js เมื่อโหลดไฟล์ครบ:
 *   1. หา Module ของหน้านี้จาก registry (เทียบ Path) และจาก SP.modules
 *      index.html ที่ Root (ไม่มี Module) → พาไปหน้าแรกของ Sales Planning ตามลำดับ Tour ใน registry
 *   2. Header แถวเดียว: ชื่อระบบ + Prototype · มุมมองผู้ใช้ (จำลอง) · เกี่ยวกับ Prototype · รีเซ็ตข้อมูล (+ ☰ เมื่อจอแคบกว่า 1024px)
 *      ปีแผนไม่อยู่ใน Header (CR-10): อยู่ต่อท้ายชื่อหน้า (components.planYearPicker) เฉพาะหน้าที่ registry ตั้ง year: true
 *   3. Side Menu ซ้าย 4 กลุ่มจาก registry (group) พับเหลือไอคอนได้ (ui.sidebarCollapsed)
 *      CR-24: ไม่พับเองในหน้าใด (เลิกกฎพับหน้าวางแผน SKU ของ CR-11) / ไอคอนสถานะ Workflow ข้างหน้าใน Sales Planning
 *      (ขั้นที่ 4 = จำนวนรายการที่ต้องดำเนินการจาก core/report.js คำนวณหลังหน้าแสดงแล้ว — CR-12)
 *   4. หัวข้อ (+ Tooltip pages.<id>.titleTip) ปีแผน และคำอธิบาย (จาก content.js) — แถวหัวข้อส่งให้ Module ใส่ workflowBar ได้ (ctx.intro)
 *      ชื่อในเมนูของ Sales Planning = ชื่อเต็ม ถ้ายาวเกินบรรทัดเดียวใช้ชื่อย่อ (pages.<id>.short) / ปุ่มก่อนหน้า/ถัดไปใช้ชื่อย่อ
 *      กล่องสิ่งที่ต้องการให้อนุมัติ (เฉพาะหน้าที่มี approve ใน content.js ตอนนี้คือหน้าเกี่ยวกับ Prototype)
 *   5. เรียก SP.modules.<id>.render(bodyElement, ctx)
 *   6. แถบก่อนหน้า/ถัดไปติดล่างจอ และปุ่มลูกศรซ้าย/ขวา เฉพาะหน้าในกลุ่ม Sales Planning
 *   CR-19: มุมมองผู้ใช้ = รายชื่อคนจัดกลุ่มตามบทบาท (core/permissions.js directory) · currentPage() = id ของหน้า (workflowBar ใช้ตัดสินสิทธิ์)
 *   CR-21: รายชื่อจาก master.users จัดกลุ่มตามบทบาทแรก / เมนูข้าง Stepper ก่อนหน้า-ถัดไป และหน้าแรกของ Tour นับเฉพาะหน้าที่ผู้ใช้เห็น
 *     (permissions.pageVisible) / เปิดหน้าที่ไม่เห็นตรงด้วย URL = "ไม่มีสิทธิ์เข้าถึงหน้านี้" (ไม่เรียก Module) / ลิงก์ไปหน้าที่ไม่เห็นซ่อนอัตโนมัติ
 *     (MutationObserver ทั้งหน้า) / ไม่มีสิทธิ์ export = body.perm-no-export (styles/components.css ซ่อนปุ่มส่งออก CSV และพิมพ์)
 *   CR-25: กลุ่ม Role Management (Permissions · Roles · Users) · กลุ่มที่ไม่เหลือหน้าไม่มีหัวกลุ่ม · เกี่ยวกับ Prototype เห็นเสมอ ·
 *     เลขขั้นคงที่ (registry.step) ปุ่มก่อนหน้า/ถัดไปและลูกศรข้ามขั้นที่มองไม่เห็น · index.html / ไม่มีสิทธิ์ → หน้าเริ่มต้นของบทบาท (permissions.homePage) ·
 *     สลับมุมมองผู้ใช้แล้วหน้าปัจจุบันถูกซ่อน → ไปหน้าเริ่มต้น + Toast (ข้อความพักที่ ui.toast แสดงหลังโหลดหน้าใหม่ครั้งเดียว)
 * store อ่าน: app.planYear, ui.role, ui.sidebarCollapsed, ui.selection, ui.planMode, ui.toast, plan.<ปี>.workflow.*, master.salespeople, master.teams,
 *             master.users, master.roles, master.permissions (ผ่าน core/permissions.js)
 * store เขียน: app.planYear, ui.role, ui.sidebarCollapsed, ui.selection (เลือก Sales Manager / Officer → หน่วยขายแรกของทีม), ui.toast
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var h = C.h;
  var menuState = { entry: null, links: {} };
  var currentEntry = null;

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

  // มุมมองผู้ใช้ (CR-21): ผู้ใช้ที่เปิดใช้งานจาก master.users จัดกลุ่มตามบทบาทแรก (ลำดับบทบาทจากหน้าบทบาทและสิทธิ์)
  //   ป้าย = {บทบาทแรก} · {Channel ของทีม} · {ชื่อ} / เลือกผู้ใช้ที่อยู่ในทีมขาย → ui.selection ไปหน่วยขายแรกของทีม
  function buildRolePicker() {
    var store = SP.core.store;
    var P = SP.core.permissions;
    var site = SP.data.content.site;
    var user = P.user();
    var list = P.directory(null, user);
    var current = list.filter(function (u) { return u.userId && u.userId === user.id; })[0];
    var select = C.select({
      label: site.roleLabel, value: current ? current.userId : '', className: 'role-select',
      options: list.map(function (u) { return { value: u.userId, label: C.roleName(u), group: u.group }; }),
      onChange: function (v) {
        var u = list.filter(function (x) { return x.userId === v; })[0];
        if (!u) return;
        store.set('ui.role', { userId: u.userId, type: u.type, personId: u.personId || null, channelId: u.channelId || null });
        if (u.personId && u.channelId) selectTeamUnit(u.channelId);
        // CR-25: หน้าปัจจุบันยังเห็น = อยู่หน้าเดิม / ถูกซ่อน = ไปหน้าเริ่มต้นของบทบาท + Toast
        var go = P.switchTarget(currentPage(), P.user());
        var home = go.stay ? null : SP.core.registry.byId(go.pageId);
        if (!home) { location.reload(); return; }
        var nu = P.user();
        var role = P.rolesNow().filter(function (r) { return r.id === nu.type; })[0];
        store.set('ui.toast', C.fill(site.switchToast, { role: role ? role.name : nu.type, page: fullLabel(home) }));
        C.guardUnsaved(null);
        location.href = link(home);
      }
    });
    select.title = current ? C.roleName(current) : '';
    return h('div', { class: 'role-picker' },
      h('label', { class: 'role-field' }, h('span', { class: 'field-label' }, site.roleLabel), select),
      h('span', { class: 'role-note' }, site.roleNote));
  }

  // หน่วยขายแรกของ Channel ในแผนปีนี้ (ไม่มี = หน่วยแรกใน Master) → ui.selection (หน้าเป้าหมายรายเดือนและวางแผน SKU ใช้ร่วมกัน)
  function selectTeamUnit(channelId) {
    var store = SP.core.store;
    var sel = store.get('ui.selection') || {};
    if (!channelId || (sel.channel === channelId && !sel.aggregate)) return;
    var plan = store.get(store.planKey('topDown')) || {};
    var units = (plan.units || {})[channelId] || [];
    var unit = units[0] || (SP.core.calc.unitsOfChannel(store.data(), channelId, true)[0] || {}).id;
    if (unit) store.set('ui.selection', { channel: channelId, unit: unit });
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
    if (about && !allowed(about)) about = null;
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
    var FT = SP.core.features;
    var step = e.id === 'phasing' ? 'phasing' : FT.isOn('reforecast') && FT.isOn('baseline') && W.isLocked(states) && store.get('ui.planMode') === 'reforecast' ? 'forecast' : 'sku';
    return W.stateOf(states, step, unit.id).status;
  }

  // ไอคอนสถานะข้างชื่อ (เมื่อขยายเมนู) และสถานะใน Tooltip ของลิงก์ (ทั้งพับและขยาย)
  // ขั้นที่ 4 (CR-12) = จำนวนรายการที่ต้องดำเนินการ (core/report.js) คำนวณหลังหน้าแสดงแล้ว / ไม่มีรายการ + ล็อก Baseline แล้ว = ไอคอนล็อก
  // CR-17: ปิด approvalWorkflow = ไม่มีวงกลมสถานะ Workflow (คงตัวเลขของขั้นที่ 4) / ปิด baseline = ไม่มีไอคอนล็อก
  var countTimer = null;
  function refreshMenu() {
    var W = SP.data.content.labels.workflow;
    Object.keys(menuState.links).forEach(function (id) {
      var ref = menuState.links[id];
      if (id === 'summary' && ref.status) { scheduleCount(ref); return; }
      var st = ref.status && SP.core.features.isOn('approvalWorkflow') ? workflowOfEntry(ref.entry) : null;
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
      var locked = SP.core.features.isOn('baseline') && SP.core.workflow.isLocked(SP.core.store.workflowStates());
      var text = n ? C.fill(site.actionCount, { n: n }) : locked ? SP.data.content.labels.workflow.status.locked : '';
      ref.link.title = ref.label + (text ? ' · ' + text : '');
      C.clear(ref.status);
      if (n) ref.status.appendChild(h('span', { class: 'side-count', title: text, 'aria-label': text }, String(n)));
      else if (locked) ref.status.appendChild(C.wfIcon('locked'));
    }, 0);
  }

  // CR-21: หน้าที่ผู้ใช้ปัจจุบันเห็น (ระดับสิทธิ์สูงสุดของหน้า ≠ NONE)
  function allowed(entry) { return !entry || SP.core.permissions.pageVisible(SP.core.permissions.user(), entry.id); }

  function buildSideMenu(entry) {
    var site = SP.data.content.site;
    var store = SP.core.store;
    var registry = SP.core.registry;
    menuState.entry = entry;
    menuState.links = {};

    var nav = h('nav', { class: 'side-menu', id: 'side-menu', 'aria-label': site.menu });
    registry.menu(allowed).forEach(function (g) {
      var planning = g.id === 'sales-planning';
      nav.appendChild(h('div', { class: 'side-group' },
        h('div', { class: 'side-group-title' }, site.groups[g.id] || g.id),
        h('ol', { class: 'side-list' + (planning ? ' is-steps' : '') }, g.entries.map(function (e) {
          var current = e === entry;
          var label = menuLabel(e);
          var status = planning ? h('span', { class: 'side-status' }) : null;
          var icon = planning ? String(e.tour) : (e.icon || label.charAt(0));   // CR-25: เลขขั้นคงที่
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
  function buildIntro(page, entry, step) {
    var site = SP.data.content.site;
    var title = page.title || (entry && entry.title);
    if (!title) return null;
    var line = h('div', { class: 'intro-line' },
      step ? h('span', { class: 'eyebrow' }, C.fill(site.stepOf, { n: step.n, total: step.total })) : null,
      h('h1', { title: page.titleTip || null }, fillTitle(title)),
      entry && entry.year ? C.planYearPicker() : null);
    var intro = h('div', { class: 'page-intro' }, line, (page.lead || []).slice(0, 1).map(function (t) { return h('p', { class: 'lead' }, fillTitle(t)); }));
    intro.line = line;
    return intro;
  }

  // CR-25: ขั้นก่อนหน้า/ถัดไป = ขั้นที่ผู้ใช้เห็น (ข้ามขั้นที่มองไม่เห็น) · ขั้นสุดท้าย = กลับขั้นแรกที่เห็น (ไม่แสดงถ้าขั้นแรกคือหน้านี้)
  function buildTourNav(step, entry) {
    var site = SP.data.content.site;
    var prev = step.prev;
    var next = step.next;
    var first = step.first && step.first !== entry ? step.first : null;
    return h('nav', { class: 'tour-nav', 'aria-label': site.prev + ' / ' + site.next },
      h('div', { class: 'tour-nav-inner' },
        prev ? h('a', { class: 'btn btn-secondary btn-sm tour-prev', href: link(prev), rel: 'prev', title: fullLabel(prev) }, '← ' + site.prev + ': ' + shortLabel(prev)) : h('span'),
        next ? h('a', { class: 'btn btn-primary btn-sm tour-next', href: link(next), rel: 'next', title: fullLabel(next) }, site.next + ': ' + shortLabel(next) + ' →')
          : first ? h('a', { class: 'btn btn-primary btn-sm tour-next', href: link(first) }, site.finish + ' ↺') : h('span')));
  }

  function isTyping(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable;
  }

  function bindKeyboard(step) {
    if (!step) return;
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isTyping(document.activeElement) || document.querySelector('dialog[open]')) return;
      var go = null;
      if (e.key === 'ArrowLeft') go = step.prev;
      if (e.key === 'ArrowRight') go = step.next;
      if (go) { e.preventDefault(); location.href = link(go); }
    });
  }

  function boot() {
    var registry = SP.core.registry;
    var content = SP.data.content;
    var store = SP.core.store;
    var entry = registry.byPath(SP.core.paths.current());
    currentEntry = entry || null;

    // index.html ที่ Root → หน้าเริ่มต้นของบทบาทที่เลือกอยู่ (CR-25)
    if (!entry && SP.core.paths.current() === 'index.html') {
      var first = homeEntry();
      if (first) { location.replace(link(first)); return; }
    }
    var denied = entry && !allowed(entry);

    var ids = Object.keys(SP.modules);
    var moduleId = entry && SP.modules[entry.id] ? entry.id : ids[0];
    var mod = SP.modules[moduleId];
    var page = content.pages[entry ? entry.id : moduleId] || {};
    var step = entry && !denied ? registry.step(entry, allowed) : null;

    // หน้าที่ไม่มีหัวข้อใน content.js (เช่น หน้า Test) ใช้ <title> เดิมของไฟล์
    var pageTitle = page.title || (entry && entry.title);
    if (pageTitle) document.title = fillTitle(pageTitle) + ' · ' + content.site.name;

    var root = document.getElementById('module-root');
    if (!root) { root = h('main', { id: 'module-root' }); document.body.appendChild(root); }
    var errors = Array.prototype.slice.call(root.querySelectorAll('.load-error'));
    C.clear(root);
    root.classList.add('page');
    if (entry) document.body.classList.add('page-' + entry.id);
    if (entry && entry.fit && !denied) document.body.classList.add('fit-screen');
    // CR-21: ไม่มีสิทธิ์ส่งออก → ซ่อนปุ่มส่งออก / CSV / พิมพ์ (styles/components.css)
    if (!SP.core.permissions.can(SP.core.permissions.user(), 'export')) document.body.classList.add('perm-no-export');

    // พับเมนู: ค่าที่ผู้ใช้จำไว้เท่านั้น (CR-24: เลิกพับเองในหน้าวางแผน SKU — เมนูเปิดเป็นค่าเริ่มต้นทุกหน้า)
    if (store.get('ui.sidebarCollapsed')) document.body.classList.add('sidebar-collapsed');

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
    var intro = buildIntro(page, entry, step);
    if (intro) root.appendChild(intro);
    errors.forEach(function (e) { root.appendChild(e); });
    root.appendChild(body);
    if (page.approve && page.approve.length) root.appendChild(C.approveBox(page.approve, page.approveTitle));
    if (step) mainCol.appendChild(buildTourNav(step, entry));

    bindKeyboard(step);
    refreshMenu();
    showToast();

    hideForbiddenLinks(document.body);
    watchLinks();
    if (denied) { body.appendChild(accessDenied()); return; }
    if (mod && typeof mod.render === 'function') {
      mod.render(body, { entry: entry, page: page, content: content, year: store.year(), intro: intro ? intro.line : null, refreshMenu: refreshMenu });
    }
  }

  // CR-25: หน้าเริ่มต้นของผู้ใช้ปัจจุบัน (permissions.homePage) → entry | null
  function homeEntry() { return SP.core.registry.byId(SP.core.permissions.homePage(SP.core.permissions.user())); }

  // CR-21: เปิดหน้าที่ไม่มีสิทธิ์ตรงด้วย URL → ข้อความแทนเนื้อหา + CR-25 ปุ่มไปหน้าเริ่มต้นของบทบาท
  function accessDenied() {
    var site = SP.data.content.site;
    var home = homeEntry();
    return h('div', { class: 'callout callout-info perm-denied', role: 'alert' },
      h('strong', { class: 'callout-title' }, site.accessDenied),
      h('p', null, site.accessDeniedText),
      home ? h('p', null, h('a', { class: 'btn btn-primary btn-sm perm-home', href: link(home) }, C.fill(site.accessDeniedLink, { page: fullLabel(home) }))) : null);
  }

  // CR-25: Toast ครั้งเดียวหลังโหลดหน้า (ข้อความจาก ui.toast) · หายเองหลัง TOAST_MS หรือกดปิด
  var TOAST_MS = 4500;
  function showToast() {
    var store = SP.core.store;
    var text = store.get('ui.toast');
    if (!text) return;
    store.set('ui.toast', null);
    var box = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' },
      h('span', { class: 'toast-text' }, text),
      h('button', { type: 'button', class: 'toast-close', 'aria-label': SP.data.content.site.toastClose, onClick: function () { close(); } }, '×'));
    function close() { if (box.parentNode) box.parentNode.removeChild(box); }
    document.body.appendChild(box);
    setTimeout(function () { box.classList.add('is-leaving'); setTimeout(close, 300); }, TOAST_MS);
  }

  // CR-21: ลิงก์ไปหน้าที่ผู้ใช้ไม่เห็น (ในทุก Module และ Header) ซ่อน — เฝ้าดูหน้าที่วาดใหม่ด้วย MutationObserver
  function entryOfHref(href) {
    if (!href || href.charAt(0) === '#' || /^(mailto|javascript|data):/i.test(href)) return null;
    var path;
    try { path = decodeURIComponent(new URL(href, location.href).pathname); } catch (e) { return null; }
    return SP.core.registry.list.filter(function (e) { return path.slice(-(e.path.length + 1)) === '/' + e.path || path === e.path; })[0] || null;
  }
  function hideForbiddenLinks(root) {
    if (!root || !root.querySelectorAll) return;
    var list = root.tagName === 'A' ? [root] : Array.prototype.slice.call(root.querySelectorAll('a[href]'));
    list.forEach(function (a) {
      var e = entryOfHref(a.getAttribute('href'));
      if (e && !allowed(e)) { a.hidden = true; a.classList.add('perm-hidden-link'); }
    });
  }
  function watchLinks() {
    if (typeof MutationObserver === 'undefined') return;
    new MutationObserver(function (records) {
      records.forEach(function (r) { Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) hideForbiddenLinks(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // id ของหน้าที่เปิดอยู่ (registry) — workflowBar ใช้หาสิทธิ์ของหน้า (core/permissions.js pageModules) / หน้า Test = null
  function currentPage() { return currentEntry ? currentEntry.id : null; }

  SP.core.layout = { boot: boot, refreshMenu: refreshMenu, currentPage: currentPage };
})(window.SP);

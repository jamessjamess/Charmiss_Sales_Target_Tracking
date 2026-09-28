/*
 * modules/sales-units/sales-units.js — Account Master · Partner List (CR-36 ชื่อหน้า · CR-32 รวมหน้า Account & Platform + เขตและร้านค้า (TT) · CR-33 แก้ไขรายรายการ)
 *
 * แนวคิด: Channel → หน่วยขาย (Account · Platform · เขต) → คู่ค้า (รหัสคู่ค้า = รหัสใน TRCLOUD) · คู่ค้าอยู่ในหน่วยขายตามช่วงเดือน (กลไกเดียวกับร้านค้า TT เดิม ทุก Channel)
 *   ข้อมูล / กฎทั้งหมดจาก core/units.js (หน่วยขาย · คู่ค้า · ช่วง · ย้าย · ข้อมูลที่ต้องตรวจ · คำสั่งแก้ไขที่ตรวจสิทธิ์ในฟังก์ชัน) + core/stores.js + core/master.js
 *   + calc.suggestSalesUnit · Module ไม่คำนวณหน่วยขายแนะนำ ผู้รับผิดชอบ หรือยอดเอง · ป้ายหน่วยขายใช้ unitLabel / gpLabel ของ Channel Master
 *
 * CR-33:          ไม่มีโหมดแก้ไขทั้งหน้า (ข้อยกเว้นของมาตรฐานโหมดดู → แก้ไข) · ทุกการแก้บันทึกทันทีที่ Drawer / Dialog ของรายการนั้น + Toast
 *                 คำสั่งแก้ไขเรียก units.command* (ผู้ไม่มีสิทธิ์ = error 'permission') แล้วเขียน changes ลง store + master.audit
 * หน้าที่:        หัวหน้า: ข้อมูล ณ เดือน [▾] (ค่าเริ่มต้น = SP.core.clock) · ส่งออก ▾
 *                 แถวตัวกรอง: แท็บ Channel ที่ใช้งาน (ทั้งหมด + จำนวนคู่ค้า + จุดเหลืองเมื่อมีข้อมูลที่ต้องตรวจ · จำที่ ui.salesUnitsTab · #<channelId> เปิดแท็บ) ·
 *                   ค้นหารหัสคู่ค้า / ชื่อ · สถานะ (ค่าเริ่มต้น ใช้งาน) · ข้อมูลที่ต้องตรวจ (components.dataCheck · units.checks) · ตัวกรองเพิ่มเติม (กางในหน้า + Chip) ·
 *                   ตั้งค่า Channel (สิทธิ์ย่อย salesUnits.channelSettings · Drawer บันทึกของตัวเอง)
 *                 ซ้าย (~28%): หน่วยขาย — ทั้งหมด · หัวกลุ่ม Channel (แท็บทั้งหมด) · ยังไม่จัดสรร (แดงเมื่อ > 0) · หน่วยขายบรรทัดเดียว
 *                   (ชื่อ · {gpLabel} xx% | ป้าย ปิดใช้งาน · คู่ค้า n | ร้าน n (units.unitCounts ตามตัวกรองสถานะ) · ปุ่ม แก้ไข / รายละเอียด เมื่อ Hover หรือเลือก) ·
 *                   คลิก = กรองขวา · ลากคู่ค้ามาวาง = กล่องย้าย · + เพิ่มหน่วยขาย (ผู้มีสิทธิ์) = Drawer เปล่า
 *                 ขวา: คู่ค้า · <หน่วยขาย | ทั้งหมด> · คอลัมน์ ▾ (columnPicker · ค่าเริ่มต้นตามแท็บ units.columnPresetFor · Preset แยกตามแท็บ
 *                   ui.columnPresets.<user>.salesUnits.<แท็บ> · เวอร์ชัน settings.SALES_UNIT_COLUMN_VERSION) · ตารางเรียงได้ทุกคอลัมน์ (ค่าเริ่มต้นยอดอ้างอิงมากไปน้อย) ·
 *                   คอลัมน์หน่วยขายซ่อนเมื่อเลือกหน่วยขาย · หน่วยขายแนะนำแสดงในช่องหน่วยขาย · แถวท้าย n ราย (+ ยอดอ้างอิงรวม · ข้อมูลตัวอย่าง)
 *                   ผู้มีสิทธิ์: ช่องติ๊ก → แถบคำสั่งแทนหัวแผง: ย้ายไปหน่วยขาย… · นำออกจากหน่วยขาย · ใช้หน่วยขายแนะนำ · เปลี่ยนสถานะ… · ยกเลิกการเลือก ·
 *                   นำเข้าร้านค้า (แท็บเขต) · คลิกแถว = Drawer คู่ค้า (สถานะแก้ได้ · ย้ายหน่วยขาย… · Timeline 12 เดือน)
 *                 Drawer หน่วยขาย: ชื่อ · รหัส (เทาใต้หัว) · Channel · GP / Fee (สิทธิ์ย่อย salesUnits.gp) · สถานะ · หมายเหตุ · เกณฑ์แนะนำ ·
 *                   ผู้รับผิดชอบ ปีปัจจุบัน – สุดแผน (อ่านอย่างเดียว + ลิงก์ Sales Person Management) | ประวัติ · บันทึก / ยกเลิก ของ Drawer · ปิดขณะยังไม่บันทึก = ถามก่อน
 * อ่านจาก data/:  channels, settings (SALES_UNIT_COLUMN_PRESETS · SALES_UNIT_COLUMN_VERSION · PLAN_YEARS), targets, storeImport, content (pages.salesUnits, labels)
 *                 + Master ผ่าน store.data()
 * store อ่าน:     master.accounts · territories · provinceSuggestions · channels · stores · storeAssignments · storeMoves · customers · customerAssignments ·
 *                 master.assignments · master.salespeople · master.audit · plan.<ปี>.topDown / sku.<id> / workflow · ui.salesUnitsTab · ui.columnPresets
 * store เขียน:    master.* ข้างบน + master.audit (ทุกคำสั่งที่ยืนยัน) · ui.salesUnitsTab · ui.columnPresets
 *                 ตัวกรอง เดือนที่เลือก การเรียง แถวที่เลือก และตัวกรองเพิ่มเติมที่กาง เป็นตัวแปรใน Module (ไม่เก็บ)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var S = SP.core.stores;
  var M = SP.core.master;
  var U = SP.core.units;
  var P = SP.core.permissions;
  var CAT = SP.core.catalog;
  var h = C.h;
  var fill = C.fill;

  var NONE = '__none';
  var KEYS = ['accounts', 'territories', 'provinceSuggestions', 'channels', 'stores', 'storeAssignments', 'storeMoves', 'customers', 'customerAssignments'];
  var SELECTABLE = ['kind', 'trcloudType', 'storeType', 'priceType', 'province', 'export', 'online', 'status', 'unit', 'refL12M', 'taxId', 'legalName', 'period'];
  var CHECK_KEYS = ['unassigned', 'noOwner', 'prefix', 'noProvince', 'noCustomers'];   // CR-35 ตัด System ID ซ้ำ
  var filters = defaultFilters();
  var sort = { key: 'refL12M', dir: -1 };
  var panelSel = 'all';          // 'all' | 'unassigned' (ทุก Channel ของแท็บ) | 'unassigned:<channelId>' | unitId
  var moreOpen = false;

  function defaultFilters() { return { q: '', status: 'active', kind: [], trcloudType: [], priceType: [], province: [], channels: [], data: [] }; }
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function thai(a, b) { return String(a).localeCompare(String(b), 'th'); }
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function firstName(name) { return String(name || '').split(' ')[0]; }
  function isTerritory(ch) { return !!ch && (ch.allocationUnit || 'ACCOUNT') === 'TERRITORY'; }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var K = SP.core.clock;
    var me = P.user();
    var canEdit = U.canEdit(me);
    var canGp = U.canEdit(me, 'gp');
    var chLevel = P.level(me, 'salesUnits.channelSettings');
    var canCh = U.canEdit(me, 'channels');
    var base = store.data();
    var nowKey = K.currentMonth();
    var firstKey = (base.storeAssignments || []).concat(base.customerAssignments || []).reduce(function (m, a) { return !m || a.fromMonth < m ? a.fromMonth : m; }, null) || nowKey;
    var lastKey = calc.monthKey(Math.max.apply(null, SP.data.settings.PLAN_YEARS), 11);
    var months = S.monthsBetween(firstKey < nowKey ? firstKey : nowKey, lastKey);
    var futureMonths = S.monthsBetween(nowKey, lastKey);
    var month = nowKey;
    var refYear = SP.data.settings.DEFAULT_PLAN_YEAR - 1;
    var peopleEntry = SP.core.registry.byId('people');
    var peopleTitle = (SP.data.content.pages.people && SP.data.content.pages.people.title) || (peopleEntry && peopleEntry.title) || '';
    var saved = snapshot();
    var selected = {};
    var dragIds = null;
    var model = null;

    // #<channelId> (ลิงก์เดิมของหน้าเขต) = เปิดแท็บนั้นครั้งเดียว
    var hash = /^#([a-z][a-z0-9-]*)$/.exec(location.hash || '');
    if (hash && calc.findById(saved.channels, hash[1])) { store.set('ui.salesUnitsTab', hash[1]); panelSel = 'all'; }
    if (hash) history.replaceState(null, '', location.pathname + location.search);

    function snapshot() { var o = {}; KEYS.forEach(function (k) { o[k] = store.get('master.' + k); }); return o; }
    function cur() { return saved; }
    function dataOf(c) {
      var d = {};
      Object.keys(base).forEach(function (k) { d[k] = base[k]; });
      Object.keys(c).forEach(function (k) { d[k] = c[k]; });
      return d;
    }
    function build(c) {
      var d = dataOf(c);
      var units = U.salesUnits(d, month);
      var all = U.customers(d);
      var o = { d: d, units: units, unitById: {}, all: all, byId: {}, mem: U.membership(d, month), checks: U.checks(d, month) };
      units.forEach(function (u) { o.unitById[u.id] = u; });
      all.forEach(function (x) { o.byId[x.id] = x; });
      return o;
    }
    function channelsOn(c) { return (c.channels || []).filter(function (ch) { return ch.active !== false; }).slice().sort(byOrder); }
    function channel(id) { return calc.findById(cur().channels, id); }
    function roleName() { return C.roleName(store.role()); }
    function ownerName(d, unitId, key) {
      var o = C.ownerInfo(d, unitId, key);
      return o.vacant && o.name === L.owner.none ? page.panel.noOwner : o.name;
    }
    function unitName(id) { var u = model && model.unitById[id]; return u ? u.name : id; }
    // ชื่อสั้นในตาราง (เขต 'TT เขต 1 · เหนือ–กลาง–กทม.' → 'TT เขต 1') · ชื่อเต็มอยู่ใน Tooltip
    function shortUnit(id) { return String(unitName(id)).split(' · ')[0]; }
    function nextMonth() { var k = calc.addMonths(nowKey, 1); return futureMonths.indexOf(k) >= 0 ? k : nowKey; }
    function monthSelect(value, onChange) {
      return C.select({ label: page.move.fromMonth, value: value, className: 'su-dlg-month',
        options: futureMonths.map(function (k) { return { value: k, label: F.date(k) + (k === nowKey ? ' (' + page.month.current + ')' : '') }; }), onChange: onChange });
    }
    function field(label, control, hint) { return h('label', { class: 'su-field' }, h('span', { class: 'field-label' }, label), control, hint ? h('span', { class: 'su-hint' }, hint) : null); }
    function peopleHref() { return peopleEntry ? SP.core.paths.to(peopleEntry.path) + '#monthly' : null; }
    function peopleLink(text, cls, title) {
      var href = peopleHref();
      if (!href || !P.pageVisible(me, 'people')) return h('span', { class: cls || null, title: title || null }, text);
      return h('a', { class: 'su-people-link ' + (cls || ''), href: href, title: title || fill(page.panel.ownerTip, { page: peopleTitle }) }, text);
    }
    function chTag(ch) { return h('span', { class: 'ch-tag', style: ch ? { '--c': C.tokenVar(calc.channelColor(ch)) } : null }, ch ? ch.name : ''); }

    // ---------- การแก้ที่ยังไม่บันทึก = เฉพาะใน Drawer ที่เปิดอยู่ ----------
    function dirty() { return (unitDirty() ? 1 : 0) + (custDirty() ? 1 : 0) + (chDirty() ? 1 : 0); }
    C.guardUnsaved(dirty);

    // ---------- หัวหน้า: ข้อมูล ณ เดือน · ส่งออก (CR-33 ไม่มีปุ่ม แก้ไข) ----------
    var picker = C.monthPicker({
      label: page.month.label, tip: page.month.tip, value: month, months: months, current: nowKey, currentLabel: page.month.current,
      onChange: function (k) { month = k; draw(); drawUnit(); drawCustomer(); }
    });
    var exportBtn = C.exportButton({ unsaved: function () { return 0; }, build: exportSpec });
    if (ctx.intro) {
      var h1 = ctx.intro.querySelector('h1');
      ctx.intro.insertBefore(picker, h1 ? h1.nextSibling : ctx.intro.firstChild);
      // CR-35: ผู้ไม่มีสิทธิ์แก้ = ข้อความอ่านอย่างเดียวข้างปุ่มส่งออก (ชื่อบทบาทจากตารางสิทธิ์)
      ctx.intro.appendChild(h('div', { class: 'su-head-tools' }, C.viewOnlyNote(['salesUnits']), exportBtn));
    }

    // ---------- บันทึกทันที: changes จาก units.command* → store + Audit log + Toast ----------
    function auditEntries(before, after) {
      var meta = { by: roleName(), at: new Date().toISOString() };
      var codes = M.unitCodes(after.accounts, after.channels);
      after.accounts.forEach(function (a) { if (!a.code) a.code = codes[a.id]; });
      var provinces = function (c) { return c.territories.map(function (t) { return { id: t.id, provinces: (c.provinceSuggestions[t.id] || []).slice().sort() }; }); };
      return M.auditDiff('account', before.accounts, after.accounts, ['name', 'code', 'gp', 'note', 'active', 'inactiveFrom', 'suggest'], meta)
        .filter(function (e) { return !(e.field === 'code' && e.oldValue == null && codes[e.key] === e.newValue); })
        .concat(M.auditDiff('territory', before.territories, after.territories, ['name', 'active', 'note'], meta))
        .concat(M.auditDiff('territory', provinces(before), provinces(after), ['provinces'], meta).filter(function (e) { return e.field === 'provinces'; }))
        .concat(M.auditDiff('channel', before.channels, after.channels, ['name', 'fullName', 'allocationUnit', 'unitLabel', 'hasGP', 'gpLabel', 'colorToken', 'active', 'order'], meta))
        .concat(M.auditDiff('store', before.stores, after.stores, ['name', 'storeType', 'priceType', 'province', 'hasExport', 'hasOnline', 'active'], meta))
        .concat(M.auditDiff('customer', before.customers, after.customers, ['active'], meta))
        .concat(U.auditCustomerAssignments(before.customerAssignments, after.customerAssignments, meta));
    }
    function commit(changes, message) {
      var next = clone(saved);
      Object.keys(changes || {}).forEach(function (k) { if (KEYS.indexOf(k) >= 0) next[k] = clone(changes[k]); });
      var entries = auditEntries(saved, next);
      KEYS.forEach(function (k) { if (!same(saved[k], next[k])) store.set('master.' + k, next[k]); });
      store.appendAudit(entries);
      saved = next;
      draw(); drawUnit(); drawCustomer(); redrawChannels();
      C.toast(message || page.toast.saved);
    }
    function errorText(code) { return page.errors[code] || page.move.errors[code] || page.errors.failed; }
    // res = ผลของ units.command* → true เมื่อบันทึกแล้ว · ไม่ผ่าน = Toast ข้อความผิดพลาด (ไม่เขียน store)
    function run(res, message) {
      if (!res || !res.ok) { C.toast(res && res.error === 'duplicateCode' ? fill(page.errors.duplicateCode, res) : errorText(res && res.error)); return false; }
      commit(res.changes, message);
      return true;
    }
    function current() { return dataOf(saved); }

    // ---------- แท็บ ----------
    function tabIds(c) { return ['all'].concat(channelsOn(c).map(function (ch) { return ch.id; })); }
    function currentTab() {
      var t = store.get('ui.salesUnitsTab');
      return tabIds(cur()).indexOf(t) >= 0 ? t : 'all';
    }
    function tabChannels(tab) { return channelsOn(cur()).filter(function (ch) { return tab === 'all' || ch.id === tab; }); }
    function inTab(x, tab) { return tabChannels(tab).some(function (ch) { return ch.id === x.channelId; }); }

    // ---------- แถวของตาราง ----------
    function statusOk(x) { return filters.status === 'all' || (filters.status === 'active' ? x.active : !x.active); }
    function inPanel(x) {
      var u = model.mem[x.id];
      if (panelSel === 'all') return true;
      if (panelSel === 'unassigned') return !u;
      if (panelSel.indexOf('unassigned:') === 0) return !u && x.channelId === panelSel.slice(11);
      return u === panelSel;
    }
    function unitOfPanel() { return panelSel === 'all' || panelSel.indexOf('unassigned') === 0 ? null : model.unitById[panelSel] || null; }
    function provincesOf(x) { return S.provincesOf(x); }
    function outside(x) {
      var u = model.mem[x.id];
      var unit = u ? model.unitById[u] : null;
      return !!unit && unit.kind === 'territory' && S.outOfProvince(x, u, model.d.provinceSuggestions);
    }
    function suggestOf(x) { return calc.suggestSalesUnit(x, model.units); }
    function periodOf(x) {
      var u = model.mem[x.id];
      if (!u) return null;
      var a = U.assignments(model.d).filter(function (r) { return r.customerId === x.id && r.salesUnitId === u && r.fromMonth <= month && (r.toMonth == null || month <= r.toMonth); })[0];
      return a ? fill(page.tips.period, { from: F.date(a.fromMonth), to: a.toMonth ? F.date(a.toMonth) : page.tips.periodNow }) : null;
    }
    function rowsOf(tab) {
      var q = filters.q.trim().toLowerCase();
      var year = Number(month.slice(0, 4));
      var rows = model.all.filter(function (x) {
        if (!inTab(x, tab) || !inPanel(x) || !statusOk(x)) return false;
        if (q && String(x.trcloudId).toLowerCase().indexOf(q) < 0 && String(x.name).toLowerCase().indexOf(q) < 0) return false;
        if (filters.kind.length && filters.kind.indexOf(x.kind) < 0) return false;
        if (filters.trcloudType.length && filters.trcloudType.indexOf(x.trcloudType || NONE) < 0) return false;
        if (filters.priceType.length && filters.priceType.indexOf(x.priceType || NONE) < 0) return false;
        if (filters.province.length) {
          var ps = provincesOf(x);
          if (!(ps.length ? ps : [NONE]).some(function (p) { return filters.province.indexOf(p) >= 0; })) return false;
        }
        if (filters.channels.length && !filters.channels.some(function (k) { return k === 'export' ? x.isExport : x.isOnline; })) return false;
        if (filters.data.length && !filters.data.some(function (k) {
          if (k === 'outside') return outside(x);
          if (k === 'noProvince') return x.kind === 'store' && !provincesOf(x).length;
          return U.movedInYear(model.d, x.id, year);
        })) return false;
        return true;
      });
      var defs = columnDefs();
      var def = defs[sort.key] || defs.refL12M;
      rows.sort(function (a, b) {
        var x = def.sortValue ? def.sortValue(a) : def.value(a), y = def.sortValue ? def.sortValue(b) : def.value(b);
        var c = typeof x === 'number' && typeof y === 'number' ? x - y : thai(x == null ? '~' : x, y == null ? '~' : y);
        return c * sort.dir || (b.refL12M || 0) - (a.refL12M || 0) || thai(a.trcloudId, b.trcloudId);
      });
      return rows;
    }

    // คอลัมน์ทั้งหมด (ตาราง · เรียง · ส่งออก) → { <key>: { key, label, cls, tip, value(x), cell(x) } }
    function columnDefs() {
      var X = page.columns, T = page.tips;
      var tab = currentTab();
      var terrTab = isTerritory(channel(tab));
      function mark(on, tip) { return on ? h('span', { class: 'su-mark', title: tip, 'aria-label': T.has }, '●') : ''; }
      // ช่องหน่วยขาย: แท็บทั้งหมดมี Badge Channel · ยังไม่จัดสรร + หน่วยขายแนะนำ · หน่วยขายแนะนำต่างจากปัจจุบัน = ป้ายเล็ก
      function unitCell(x) {
        var id = model.mem[x.id];
        var u = id ? model.unitById[id] : null;
        var s = suggestOf(x);
        var sugName = s ? shortUnit(s) : null;
        var badge = tab === 'all' ? chTag(channel(x.channelId)) : null;
        if (!u) {
          return [badge, h('span', { class: 'text-short', title: s ? unitName(s) : null }, s ? fill(T.unassignedSuggest, { name: sugName }) : page.unassignedCell)];
        }
        return [badge, h('span', { title: u.code + ' · ' + u.name }, shortUnit(id)),
          s && s !== id ? h('span', { class: 'su-sug-tag', title: fill(T.suggestTip, { name: unitName(s) }) }, fill(T.suggestTag, { name: sugName })) : null];
      }
      return {
        trcloudId: { key: 'trcloudId', label: X.trcloudId, cls: 'su-id', value: function (x) { return x.trcloudId; },
          sortValue: function (x) { return Number(x.trcloudId) || 0; } },
        name: { key: 'name', label: terrTab ? X.nameStore : X.name, cls: 'su-name', value: function (x) { return x.name; },
          cell: function (x) { return [h('span', { class: 'su-name-text', title: x.name }, x.name), x.masked ? C.privacyMark(T.masked) : null]; } },
        kind: { key: 'kind', label: X.kind, value: function (x) { return page.kinds[x.kind] || x.kind; } },
        trcloudType: { key: 'trcloudType', label: X.trcloudType, tip: T.trcloudType, value: function (x) { return x.trcloudType || ''; },
          cell: function (x) { return h('span', { class: 'su-type', title: x.trcloudType || '' }, x.trcloudType || '–'); } },
        storeType: { key: 'storeType', label: X.storeType, value: function (x) { return x.storeType || ''; },
          cell: function (x) { return h('span', { class: 'su-type is-short', title: x.storeType || '' }, M.shortStoreType(x.storeType) || '–'); } },
        priceType: { key: 'priceType', label: X.priceType, value: function (x) { return x.priceType || ''; }, cell: function (x) { return x.priceType || '–'; } },
        province: { key: 'province', label: X.province, cls: 'su-province', value: function (x) { return x.province || ''; },
          cell: function (x) {
            var u = model.mem[x.id];
            return [h('span', { class: 'su-province-text', title: x.province || '' }, x.province ? x.province.split(',').join(', ') : '–'),
              outside(x) ? h('span', { class: 'badge tag-muted su-outside', title: fill(T.outsideTip, { territory: unitName(u) }) }, T.outside) : null];
          } },
        export: { key: 'export', label: X.export, cls: 'su-mark-col', tip: T.export, value: function (x) { return x.isExport ? 1 : 0; }, cell: function (x) { return mark(x.isExport, T.export); } },
        online: { key: 'online', label: X.online, cls: 'su-mark-col', tip: T.online, value: function (x) { return x.isOnline ? 1 : 0; }, cell: function (x) { return mark(x.isOnline, T.online); } },
        status: { key: 'status', label: X.status, value: function (x) { return x.active ? 0 : 1; },
          cell: function (x) { return h('span', { class: 'badge ' + (x.active ? 'tag-ok' : 'tag-muted') }, x.active ? page.status.active : page.status.inactive); } },
        refL12M: { key: 'refL12M', label: X.refL12M, cls: 'num', tip: fill(T.refL12M, { year: refYear }), value: function (x) { return x.refL12M || 0; }, cell: function (x) { return F.baht(x.refL12M || 0); } },
        unit: { key: 'unit', label: tabUnitLabel(tab), cls: 'su-unit-col', value: function (x) { return model.mem[x.id] ? unitName(model.mem[x.id]) : null; }, cell: unitCell },
        suggested: { key: 'suggested', label: X.suggested, value: function (x) { var s = suggestOf(x); var u = model.mem[x.id]; return !u ? (s ? unitName(s) : null) : s && s !== u ? unitName(s) : null; } },
        taxId: { key: 'taxId', label: X.taxId, value: function (x) { return x.taxId || ''; }, cell: function (x) { return x.taxId || '–'; } },
        legalName: { key: 'legalName', label: X.legalName, value: function (x) { return x.legalName || ''; }, cell: function (x) { return h('span', { class: 'su-type', title: x.legalName || '' }, x.legalName || '–'); } },
        period: { key: 'period', label: X.period, value: function (x) { return periodOf(x) || ''; }, cell: function (x) { return periodOf(x) || '–'; } }
      };
    }
    // หัวคอลัมน์หน่วยขายของแท็บ = unitLabel ของ Channel (แท็บทั้งหมด = หน่วยขาย)
    function tabUnitLabel(tab) { var ch = tab === 'all' ? null : channel(tab); return ch && ch.unitLabel ? ch.unitLabel : page.columns.unit; }

    // ---------- คอลัมน์ + Preset ส่วนตัว (แยกตามแท็บ · ค่าเริ่มต้นตามแท็บ) ----------
    function uid() { return (me && me.id) || 'default'; }
    function tableId() { return 'salesUnits.' + currentTab(); }
    function presetAll() { return store.get('ui.columnPresets') || {}; }
    // CR-33: เวอร์ชัน Preset เปลี่ยน = ล้าง Preset / คอลัมน์ที่เลือกไว้ของทุกแท็บ 1 ครั้ง
    (function () {
      var all = presetAll(), changed = false;
      tabIds(saved).forEach(function (t) {
        var r = CAT.ensureVersion(all, uid(), 'salesUnits.' + t, SP.data.settings.SALES_UNIT_COLUMN_VERSION);
        if (r.all !== all) { all = r.all; changed = true; }
      });
      if (changed) store.set('ui.columnPresets', all);
    })();
    function systemPresets() {
      var tab = currentTab();
      var list = SP.data.settings.SALES_UNIT_COLUMN_PRESETS || [];
      var first = U.columnPresetFor(dataOf(cur()), tab === 'all' ? null : tab);
      return list.filter(function (p) { return p.id === first; }).concat(list.filter(function (p) { return p.id !== first && p.id === 'full'; }));
    }
    function shownKeys() { return CAT.currentColumns(presetAll(), uid(), tableId(), systemPresets(), SELECTABLE); }
    function columnsNow() {
      var defs = columnDefs();
      var hideUnit = !!unitOfPanel();
      return ['trcloudId', 'name'].concat(shownKeys().filter(function (k) { return !(hideUnit && k === 'unit'); })).map(function (k) { return defs[k]; });
    }
    function pickerState() {
      var all = presetAll();
      return {
        value: shownKeys(),
        presets: CAT.presetsFor(all, uid(), tableId(), systemPresets()).map(function (p) { return { id: p.id, name: p.system ? page.presets[p.id] : p.name, columns: p.columns, system: p.system }; }),
        defaultId: CAT.tableState(all, uid(), tableId()).defaultId
      };
    }
    function onPreset(action, arg) {
      var all = presetAll();
      var list = CAT.presetsFor(all, uid(), tableId(), systemPresets());
      if (action === 'pick') { var p = list.filter(function (x) { return x.id === arg; })[0]; if (p) all = CAT.setColumns(all, uid(), tableId(), p.columns); }
      else if (action === 'save') all = CAT.savePreset(all, uid(), tableId(), arg, shownKeys()).all;
      else if (action === 'remove') all = CAT.removePreset(all, uid(), tableId(), arg);
      else if (action === 'default') all = CAT.setDefaultPreset(all, uid(), tableId(), arg);
      else if (action === 'reset') all = CAT.resetColumns(all, uid(), tableId());
      store.set('ui.columnPresets', all);
      draw();
    }

    // =====================================================================
    function draw() {
      C.clear(root);
      model = build(cur());
      var tab = currentTab();
      if (panelSel !== 'all' && panelSel !== 'unassigned' && panelSel.indexOf('unassigned:') !== 0 && !model.unitById[panelSel]) panelSel = 'all';
      if (unitOfPanel() && !inTab(unitOfPanel(), tab)) panelSel = 'all';
      root.appendChild(toolbar(tab));
      if (moreOpen) root.appendChild(moreFilters(tab));
      var chips = filterChips();
      if (chips) root.appendChild(chips);
      var rows = rowsOf(tab);
      Object.keys(selected).forEach(function (id) { if (!rows.some(function (x) { return x.id === id; })) delete selected[id]; });
      root.appendChild(h('div', { class: 'card fit-card su-card' + (canEdit ? ' can-edit' : '') },
        h('div', { class: 'su-layout' }, panel(tab), tablePane(tab, rows))));
    }

    // ---------- แถวตัวกรอง ----------
    function toolbar(tab) {
      var Fl = page.filters;
      var c = cur();
      var tabCtl = C.segmented({
        label: page.tabLabel, value: tab,
        options: tabIds(c).map(function (id) {
          var ch = id === 'all' ? null : channel(id);
          var n = model.all.filter(function (x) { return id === 'all' ? inTab(x, 'all') : x.channelId === id; }).length;
          var w = id === 'all' ? model.checks.total : model.checks.byChannel[id] || 0;
          return { value: id, title: w ? fill(page.tabWarn, { n: w }) : (ch ? ch.fullName : null),
            label: [fill(page.tabCount, { name: ch ? ch.name : page.tabAll, n: F.number(n) }), w ? h('span', { class: 'su-tab-dot', 'aria-label': fill(page.tabWarn, { n: w }) }) : null] };
        }),
        onChange: function (v) { store.set('ui.salesUnitsTab', v); panelSel = 'all'; selected = {}; draw(); }
      });
      var search = h('input', { type: 'search', class: 'search-input su-search', placeholder: page.search, 'aria-label': page.search, value: filters.q });
      var timer = null;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          filters.q = search.value;
          var pos = search.selectionStart;
          draw();
          var n = root.querySelector('.su-search');
          if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
        }, 200);
      });
      var status = C.select({ label: Fl.status, value: filters.status, className: 'su-status',
        options: ['active', 'inactive', 'all'].map(function (v) { return { value: v, label: Fl.status + ': ' + Fl.statusOptions[v] }; }),
        onChange: function (v) { filters.status = v; draw(); } });
      var nMore = ['kind', 'trcloudType', 'priceType', 'province', 'channels', 'data'].filter(function (k) { return filters[k].length; }).length;
      var moreBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-more-btn' + (moreOpen ? ' is-open' : ''), 'aria-expanded': moreOpen ? 'true' : 'false',
        onClick: function () { moreOpen = !moreOpen; draw(); } }, (nMore ? fill(Fl.moreOn, { n: nMore }) : Fl.more) + (moreOpen ? ' ▴' : ' ▾'));
      var chBtn = chLevel !== 'NONE' ? h('button', { type: 'button', class: 'link-btn su-ch-settings', onClick: openChannels }, page.channelSettings) : null;
      return h('div', { class: 'tool-row su-toolbar' }, tabCtl, search, status, checksChip(tab), moreBtn, h('span', { class: 'su-tools-end' }, chBtn));
    }
    function moreFilters(tab) {
      var X = page.filters;
      var list = model.all.filter(function (x) { return inTab(x, tab); });
      function uniq(fn) {
        var seen = {}, out = [];
        list.forEach(function (x) { (fn(x) || [NONE]).forEach(function (v) { if (!seen[v]) { seen[v] = true; out.push(v); } }); });
        return out.sort(function (a, b) { return a === NONE ? 1 : b === NONE ? -1 : thai(a, b); });
      }
      var noneLabel = function (v) { return v === NONE ? X.none : v; };
      function multi(key, label, options) {
        return C.multiSelect({ label: label, allLabel: X.all, selected: X.selected, clear: X.clear, empty: X.empty, search: options.length > 8 ? X.find : null,
          options: options, value: filters[key], onChange: function (v) { filters[key] = v; draw(); } });
      }
      var kinds = ['headOffice', 'branch', 'store', 'platform'].filter(function (k) { return list.some(function (x) { return x.kind === k; }); });
      return h('div', { class: 'tool-row su-more' },
        multi('kind', X.kind, kinds.map(function (k) { return { value: k, label: page.kinds[k] }; })),
        multi('trcloudType', X.trcloudType, uniq(function (x) { return x.trcloudType ? [x.trcloudType] : null; }).map(function (v) { return { value: v, label: noneLabel(v) }; })),
        multi('priceType', X.priceType, uniq(function (x) { return x.priceType ? [x.priceType] : null; }).map(function (v) { return { value: v, label: noneLabel(v) }; })),
        multi('province', X.province, uniq(function (x) { var p = provincesOf(x); return p.length ? p : null; }).map(function (v) { return { value: v, label: noneLabel(v) }; })),
        multi('channels', X.channels, ['export', 'online'].map(function (v) { return { value: v, label: X.channelOptions[v] }; })),
        multi('data', X.data, ['outside', 'noProvince', 'moved'].map(function (v) { return { value: v, label: X.dataOptions[v] }; })));
    }
    function filterChips() {
      var X = page.filters;
      var items = [];
      if (filters.q.trim()) items.push({ label: fill(X.chipSearch, { q: filters.q.trim() }), onRemove: function () { filters.q = ''; draw(); } });
      function add(key, label, labelOf) {
        filters[key].forEach(function (v) {
          items.push({ label: fill(X.chip, { label: label, value: labelOf(v) }), onRemove: function () { filters[key] = filters[key].filter(function (x) { return x !== v; }); draw(); } });
        });
      }
      var noneLabel = function (v) { return v === NONE ? X.none : v; };
      add('kind', X.kind, function (v) { return page.kinds[v]; });
      add('trcloudType', X.trcloudType, noneLabel);
      add('priceType', X.priceType, noneLabel);
      add('province', X.province, noneLabel);
      add('channels', X.channels, function (v) { return X.channelOptions[v]; });
      add('data', X.data, function (v) { return X.dataOptions[v]; });
      if (filters.status !== 'active') items.push({ label: fill(X.chip, { label: X.status, value: X.statusOptions[filters.status] }), onRemove: function () { filters.status = 'active'; draw(); } });
      if (!items.length) return null;
      return C.filterChips(items, function () { filters = defaultFilters(); draw(); });
    }

    // ---------- ข้อมูลที่ต้องตรวจ (components.dataCheck) ----------
    function checksChip(tab) {
      var X = page.checks;
      function reveal(ch) { if (currentTab() !== 'all' && currentTab() !== ch) store.set('ui.salesUnitsTab', ch); }
      function goCustomer(x, sel) {
        reveal(x.channelId);
        var q = filters.status;
        filters = defaultFilters();
        filters.status = q === 'inactive' ? 'active' : q;
        panelSel = sel;
        draw();
        C.flashRow(root.querySelector('tr[data-customer="' + CSS.escape(x.id) + '"]'));
      }
      function goUnit(x) {
        reveal(x.channelId);
        panelSel = x.id;
        draw();
        C.flashRow(root.querySelector('li[data-unit="' + CSS.escape(x.id) + '"]'));
      }
      function text(x) {
        if (x.kind === 'unit') { var u = model.unitById[x.id]; var ch = channel(x.channelId); return fill(X.unitItem, { channel: ch ? ch.name : x.channelId, name: u ? u.name : x.id }); }
        var c = model.byId[x.id];
        var nm = c ? c.trcloudId + ' ' + c.name : x.id;
        return x.suggested ? fill(X.prefixItem, { name: nm, unit: unitName(x.suggested) }) : fill(X.item, { name: nm });
      }
      var groups = model.checks.groups.map(function (g) {
        var items = g.items.filter(function (x) { return tab === 'all' || x.channelId === tab; });
        return {
          key: g.key, label: X.types[g.key],
          items: items.map(function (x) {
            return { text: text(x), go: function () {
              if (x.kind === 'unit') { goUnit(x); return; }
              if (g.key === 'unassigned') goCustomer(x, 'unassigned:' + x.channelId);
              else if (g.key === 'prefix') goCustomer(x, x.unitId);
              else goCustomer(x, 'all');
            } };
          }),
          more: g.key === 'unassigned' ? function () { panelSel = tab === 'all' ? 'unassigned' : 'unassigned:' + tab; filters.status = 'active'; draw(); }
            : g.key === 'noProvince' ? function () { panelSel = 'all'; filters.data = ['noProvince']; draw(); } : null
        };
      });
      return C.dataCheck({ title: fill(X.title, { month: F.date(month) }), groups: groups, moreLabel: X.showAll,
        criteria: CHECK_KEYS.map(function (k) { return X.types[k]; }) });
    }

    // =====================================================================
    // แผงหน่วยขาย (CR-33: แถวบรรทัดเดียว · ป้ายกำกับทุกตัวเลข · ปุ่ม แก้ไข / รายละเอียด)
    // =====================================================================
    function panel(tab) {
      var X = page.panel;
      var statusName = page.filters.statusOptions[filters.status];
      var counts = U.unitCounts(model.d, month, filters.status);
      var nAll = tabChannels(tab).reduce(function (s, ch) { return s + (counts.byChannel[ch.id] || 0); }, 0);
      function simple(key, label, n, cls, tip) {
        return h('li', { class: 'su-item su-item-simple' + (panelSel === key ? ' is-selected' : '') + (cls ? ' ' + cls : ''), dataset: { panel: key } },
          h('button', { type: 'button', class: 'su-item-main', 'aria-pressed': panelSel === key ? 'true' : 'false', title: tip || fill(X.countTip, { status: statusName }),
            onClick: function () { panelSel = key; draw(); } },
            h('span', { class: 'su-item-name' }, label), h('span', { class: 'su-item-count' }, F.number(n))));
      }
      var items = [simple('all', X.all, nAll)];
      tabChannels(tab).forEach(function (ch) {
        if (tab === 'all') items.push(h('li', { class: 'su-ch-head' }, chTag(ch), h('span', { class: 'su-ch-name' }, ch.fullName || ch.name)));
        else items.push(h('li', { class: 'su-sep', role: 'separator' }));
        var n = counts.unassigned[ch.id] || 0;
        items.push(simple('unassigned:' + ch.id, X.unassigned, n, n ? 'is-danger' : null, X.unassignedTip));
        model.units.filter(function (u) { return u.channelId === ch.id; }).forEach(function (u) {
          items.push(unitItem(u, counts.byUnit[u.id] || 0, statusName));
        });
      });
      return h('aside', { class: 'su-panel', 'aria-label': X.title },
        h('h2', { class: 'su-panel-title' }, X.title),
        h('div', { class: 'su-panel-scroll' }, h('ul', { class: 'su-list' }, items)),
        canEdit ? h('div', { class: 'su-panel-foot' },
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm su-add', onClick: function () { openNewUnit(tab === 'all' ? null : tab); } }, X.add),
          h('span', { class: 'su-hint' }, X.dropHint))
          : h('p', { class: 'su-hint su-panel-note' }, peopleLink(fill(X.ownerNote, { page: peopleTitle }), 'su-note-link')));
    }

    // ค่าอัตรา: {gpLabel} xx% (ป้ายเทา · ตัวเลขปกติ) · Channel ที่ไม่มี GP = ไม่แสดง · ปิดใช้งาน = ป้าย ปิดใช้งาน แทนค่าอัตรา
    function rateText(u) {
      if (!u.active) return h('span', { class: 'badge tag-muted su-inactive' }, page.panel.inactive);
      if (!u.hasGP) return null;
      return h('span', { class: 'su-item-rate', title: u.gpLabel || null }, h('span', { class: 'su-lbl' }, u.gpLabel || ''), ' ',
        u.gp == null ? h('span', { class: 'text-short' }, page.panel.gpMissing) : F.pct(u.gp, 1).replace('.0%', '%'));
    }
    function unitItem(u, n, statusName) {
      var X = page.panel;
      var countLabel = u.kind === 'territory' ? X.countLabels.stores : X.countLabels.customers;
      var li = h('li', { class: 'su-item su-unit' + (panelSel === u.id ? ' is-selected' : '') + (u.active ? '' : ' is-inactive'), dataset: { unit: u.id } },
        h('div', { class: 'su-item-body' },
          h('div', { class: 'su-line' },
            h('button', { type: 'button', class: 'su-item-main su-unit-name', 'aria-pressed': panelSel === u.id ? 'true' : 'false', title: u.name,
              onClick: function () { panelSel = u.id; draw(); } }, h('span', { class: 'su-item-name' }, u.name)),
            h('span', { class: 'su-item-stat' }, rateText(u),
              h('span', { class: 'su-item-count', title: fill(X.countTip, { status: statusName }) }, h('span', { class: 'su-lbl' }, countLabel), ' ', F.number(n))),
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-unit-edit', title: fill(canEdit ? X.editTip : X.detailsTip, { name: u.name }),
              onClick: function (e) { e.stopPropagation(); openUnit(u.id); } }, canEdit ? X.edit : X.details)),
          u.note ? h('span', { class: 'su-item-note' }, u.note) : null));
      li.addEventListener('click', function (e) { if (e.target.closest('a, button')) return; panelSel = u.id; draw(); });
      if (canEdit && u.active) {
        li.addEventListener('dragover', function (e) { if (dragIds && dragOk(u)) { e.preventDefault(); li.classList.add('is-drop'); } });
        li.addEventListener('dragleave', function () { li.classList.remove('is-drop'); });
        li.addEventListener('drop', function (e) { e.preventDefault(); li.classList.remove('is-drop'); var ids = dragIds; dragIds = null; if (ids && ids.length && dragOk(u, ids)) moveDialog(ids, u.id); });
      }
      return li;
    }
    function dragOk(u, ids) { return (ids || dragIds || []).every(function (id) { var x = model.byId[id]; return x && x.channelId === u.channelId; }); }

    // =====================================================================
    // ตารางคู่ค้า
    // =====================================================================
    function tablePane(tab, rows) {
      var X = page.columns, T = page.tips;
      var cols = columnsNow();
      var unit = unitOfPanel();
      var title = unit ? fill(page.tableTitle.unit, { name: unit.name })
        : panelSel === 'all' ? page.tableTitle.all
        : fill(page.tableTitle.unassigned, { channel: panelSel === 'unassigned' ? page.tabAll : (channel(panelSel.slice(11)) || {}).name || '' });
      var all = rows.length > 0 && rows.every(function (x) { return selected[x.id]; });
      var headBox = canEdit ? h('input', { type: 'checkbox', checked: all, 'aria-label': X.selectAll, title: X.selectAll, onChange: function (e) {
        rows.forEach(function (x) { if (e.target.checked) selected[x.id] = true; else delete selected[x.id]; });
        draw();
      } }) : null;
      var span = String(cols.length + (canEdit ? 1 : 0));
      var thead = h('thead', null, h('tr', null,
        canEdit ? h('th', { scope: 'col', class: 'su-check' }, headBox) : null,
        cols.map(function (c) {
          var on = sort.key === c.key;
          return h('th', { scope: 'col', class: (c.cls || '') + (on ? ' is-sorted' : ''), 'aria-sort': on ? (sort.dir > 0 ? 'ascending' : 'descending') : null },
            h('button', { type: 'button', class: 'su-sort', title: c.tip || fill(T.sort, { name: c.label }), onClick: function () {
              if (sort.key === c.key) sort.dir = -sort.dir; else { sort.key = c.key; sort.dir = c.key === 'refL12M' ? -1 : 1; }
              draw();
            } }, c.label, h('span', { class: 'su-sort-mark', 'aria-hidden': 'true' }, on ? (sort.dir > 0 ? '▲' : '▼') : '')));
        })));
      var body = h('tbody');
      if (!rows.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: span }, page.emptyRows)));
      rows.forEach(function (x) { body.appendChild(customerRow(x, cols)); });
      var tfoot = h('tfoot', null, h('tr', null, h('td', { colspan: span }, footerText(rows, cols))));
      var picker = C.columnPicker({
        label: page.columnsButton, fixedNote: page.fixedColumns,
        columns: SELECTABLE.map(function (k) { return { key: k, label: k === 'unit' ? tabUnitLabel(tab) : X[k] }; }),
        state: pickerState,
        onChange: function (keys) { store.set('ui.columnPresets', CAT.setColumns(presetAll(), uid(), tableId(), keys)); draw(); },
        onPreset: onPreset
      });
      var importBtn = canEdit && isTerritory(channel(tab)) ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm su-import', title: page.importTip, onClick: pickFile }, page.importButton) : null;
      var ids = Object.keys(selected);
      var head = ids.length ? selectionBar(ids)
        : h('div', { class: 'su-main-head' }, h('h2', { class: 'su-main-title', title: title }, title), h('span', { class: 'su-main-tools' }, importBtn, picker));
      return h('section', { class: 'su-main' }, head,
        h('div', { class: 'fit-scroll su-scroll' }, h('table', { class: 'data-grid su-table' + (canEdit ? ' can-edit' : '') }, thead, body, tfoot)));
    }
    // แถวท้าย: n ราย · ยอดอ้างอิงรวม (เมื่อแสดงคอลัมน์ยอดอ้างอิง) · ข้อมูลตัวอย่าง n ราย (Channel ของรายการตัวอย่าง)
    function footerText(rows, cols) {
      var Ft = page.footer;
      var out = [fill(Ft.count, { n: F.number(rows.length) })];
      if (cols.some(function (c) { return c.key === 'refL12M'; })) out.push(fill(Ft.ref, { amount: F.baht(calc.sum(rows.map(function (x) { return x.refL12M || 0; }))) }));
      var sample = rows.filter(function (x) { return x.isSample; });
      if (!sample.length) return out.join('');
      var chs = [];
      sample.forEach(function (x) { var ch = channel(x.channelId); var n = ch ? ch.name : x.channelId; if (chs.indexOf(n) < 0) chs.push(n); });
      return [out.join(''), h('span', { class: 'su-foot-sample' }, fill(Ft.sample, { n: F.number(sample.length), channels: chs.join(Ft.and) }))];
    }

    function customerRow(x, cols) {
      var tr = h('tr', { class: 'is-clickable' + (x.active ? '' : ' is-inactive') + (selected[x.id] ? ' is-selected' : ''),
        dataset: { customer: x.id }, draggable: canEdit ? 'true' : null },
        canEdit ? h('td', { class: 'su-check' }, h('input', { type: 'checkbox', checked: !!selected[x.id], 'aria-label': page.columns.select + ' ' + x.trcloudId, onChange: function (e) {
          if (e.target.checked) selected[x.id] = true; else delete selected[x.id];
          draw();
        } })) : null,
        cols.map(function (c) { return h('td', { class: c.cls || null }, c.cell ? c.cell(x) : c.value(x)); }));
      tr.addEventListener('click', function (e) {
        if (e.target.closest('input, button, label, a')) return;
        openCustomer(x.id);
      });
      if (canEdit) {
        tr.addEventListener('dragstart', function (e) {
          dragIds = selected[x.id] ? Object.keys(selected) : [x.id];
          try { e.dataTransfer.setData('text/plain', dragIds.join(',')); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* ignore */ }
          root.classList.add('is-dragging');
        });
        tr.addEventListener('dragend', function () { root.classList.remove('is-dragging'); setTimeout(function () { dragIds = null; }, 0); });
      }
      return tr;
    }

    // ---------- แถบคำสั่ง (แทนหัวแผงขวาเมื่อเลือกตั้งแต่ 1 แถว) ----------
    function selectionBar(ids) {
      var X = page.selection;
      var list = ids.map(function (id) { return model.byId[id]; }).filter(Boolean);
      var chs = {};
      list.forEach(function (x) { chs[x.channelId] = true; });
      var mixed = Object.keys(chs).length > 1;
      var assigned = list.filter(function (x) { return model.mem[x.id]; }).length;
      var suggestable = list.filter(function (x) { var s = suggestOf(x); return s && s !== model.mem[x.id]; }).length;
      return h('div', { class: 'su-main-head su-selection', role: 'status' },
        h('span', { class: 'su-selection-text' }, fill(X.text, { n: F.number(list.length) })),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm su-move', disabled: mixed, title: mixed ? X.mixed : null, onClick: function () { moveDialog(ids, null); } }, X.move),
        h('button', { type: 'button', class: 'btn btn-secondary btn-sm su-unassign', disabled: !assigned, title: assigned ? null : X.noneAssigned, onClick: function () { unassignDialog(ids); } }, X.unassign),
        h('button', { type: 'button', class: 'btn btn-secondary btn-sm su-suggest', disabled: !suggestable, title: suggestable ? null : X.noneSuggested, onClick: function () { suggestDialog(ids); } }, X.suggest),
        h('button', { type: 'button', class: 'btn btn-secondary btn-sm su-status-btn', onClick: function () { statusDialog(ids); } }, X.status),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-clear-sel', onClick: function () { selected = {}; draw(); } }, X.clear));
    }

    // =====================================================================
    // กล่องยืนยัน (ย้าย · นำออก · ใช้หน่วยขายแนะนำ · เปลี่ยนสถานะ) — ยืนยันแล้วบันทึกทันที (units.command*)
    // =====================================================================
    function yearNotes(ch, fromKey, amount) {
      var X = page.move;
      if (!isTerritory(ch)) return [h('li', { class: 'su-dlg-info' }, X.accountNote)];
      var out = [];
      SP.data.settings.PLAN_YEARS.forEach(function (y) {
        if (fromKey > calc.monthKey(y, 11)) return;
        var at = S.approvedAt(store.workflowStates(y)['topDown.all']);
        if (at) out.push(h('li', { class: 'su-dlg-warn' }, fill(X.approved, { year: y, amount: F.baht(amount) })));
        else if (SP.data.targets.years[y] && fromKey <= calc.monthKey(y, 0)) out.push(h('li', { class: 'su-dlg-info' }, fill(X.draftYear, { year: y, prior: y - 1 })));
      });
      return out;
    }
    function stamp() { return { current: nowKey, at: new Date().toISOString(), by: roleName() }; }
    function done() { selected = {}; }

    function moveDialog(ids, target) {
      var X = page.move;
      var dm = build(cur());
      var list = ids.map(function (id) { return dm.byId[id]; }).filter(Boolean);
      if (!list.length) return;
      var ch = channel(list[0].channelId);
      var options = dm.units.filter(function (u) { return u.channelId === ch.id && u.active; });
      if (!options.length) return;
      var fromKey = nextMonth();
      var to = target || (options.filter(function (u) { return u.id !== panelSel && u.id !== dm.mem[list[0].id]; })[0] || options[0]).id;
      var targetSel = C.select({ label: X.target, value: to, className: 'su-dlg-target', options: options.map(function (u) { return { value: u.id, label: u.name }; }),
        onChange: function (v) { to = v; refresh(); } });
      var monthSel = monthSelect(fromKey, function (v) { fromKey = v; refresh(); });
      var summary = h('ul', { class: 'dlg-lines su-dlg-lines' });
      function refresh() {
        Array.prototype.forEach.call(targetSel.options, function (o) { o.textContent = fill(X.targetOption, { name: dm.unitById[o.value].name, owner: ownerName(dm.d, o.value, fromKey) }); });
        C.clear(summary);
        var res = U.moveCustomers(dm.d, ids, to, fromKey, {});
        if (!res.ok) { summary.appendChild(h('li', { class: 'su-dlg-warn' }, X.errors[res.error] || X.errors.range)); return; }
        var moved = res.moved.map(function (id) { return dm.byId[id]; });
        if (!moved.length) { summary.appendChild(h('li', null, X.noChange)); return; }
        var amount = calc.sum(moved.map(function (x) { return x.refL12M || 0; }));
        summary.appendChild(h('li', null, fill(X.count, { n: F.number(moved.length), amount: F.baht(amount) })));
        var groups = {};
        moved.forEach(function (x) { var f = U.unitOf(dm.d, x.id, fromKey) || ''; groups[f] = (groups[f] || 0) + 1; });
        Object.keys(groups).forEach(function (f) {
          summary.appendChild(h('li', null, fill(X.fromTo, { from: f ? dm.unitById[f].name : page.unassignedCell, fromOwner: f ? ownerName(dm.d, f, fromKey) : '–',
            to: dm.unitById[to].name, toOwner: ownerName(dm.d, to, fromKey), n: F.number(groups[f]) })));
        });
        if (isTerritory(ch)) {
          var out = moved.filter(function (x) { return S.outOfProvince(x, to, dm.d.provinceSuggestions); }).length;
          if (out) summary.appendChild(h('li', { class: 'su-dlg-info' }, fill(X.outside, { n: F.number(out) })));
        }
        yearNotes(ch, fromKey, amount).forEach(function (n) { summary.appendChild(n); });
      }
      refresh();
      C.dialog({
        title: X.title, wide: true, confirmLabel: X.confirm,
        body: h('div', { class: 'su-dlg' }, h('div', { class: 'su-dlg-fields' }, field(X.target, targetSel), field(X.fromMonth, monthSel)),
          h('p', { class: 'su-hint' }, fill(X.channelOnly, { channel: ch.name }) + ' · ' + fill(X.pastNote, { month: F.date(nowKey) })), summary)
      }).then(function (r) {
        if (!r.ok) return;
        var res = U.commandMove(current(), me, ids, to, fromKey, stamp());
        if (res.ok && !res.moved.length) return;
        done();
        run(res, res.ok ? fill(page.toast.moved, { n: F.number(res.moved.length), unit: dm.unitById[to].name }) : null);
      });
    }

    function unassignDialog(ids) {
      var X = page.unassign;
      var dm = build(cur());
      var fromKey = nextMonth();
      var monthSel = monthSelect(fromKey, function (v) { fromKey = v; refresh(); });
      var summary = h('ul', { class: 'dlg-lines su-dlg-lines' });
      var ch = null;
      function refresh() {
        C.clear(summary);
        var res = U.moveCustomers(dm.d, ids, null, fromKey, {});
        var moved = res.ok ? res.moved.map(function (id) { return dm.byId[id]; }) : [];
        if (!moved.length) { summary.appendChild(h('li', null, page.move.noChange)); return; }
        ch = channel(moved[0].channelId);
        var amount = calc.sum(moved.map(function (x) { return x.refL12M || 0; }));
        summary.appendChild(h('li', null, fill(X.count, { n: F.number(moved.length), amount: F.baht(amount) })));
        var groups = {};
        moved.forEach(function (x) { var f = U.unitOf(dm.d, x.id, fromKey); if (f) groups[f] = (groups[f] || 0) + 1; });
        Object.keys(groups).forEach(function (f) { summary.appendChild(h('li', null, fill(X.from, { from: dm.unitById[f].name, owner: ownerName(dm.d, f, fromKey), n: F.number(groups[f]) }))); });
        yearNotes(ch, fromKey, amount).forEach(function (n) { summary.appendChild(n); });
      }
      refresh();
      C.dialog({
        title: X.title, confirmLabel: X.confirm, wide: true,
        body: h('div', { class: 'su-dlg' }, h('p', { class: 'dlg-text' }, X.text), h('div', { class: 'su-dlg-fields' }, field(page.move.fromMonth, monthSel)), summary)
      }).then(function (r) {
        if (!r.ok) return;
        var res = U.commandMove(current(), me, ids, null, fromKey, stamp());
        if (res.ok && !res.moved.length) return;
        done();
        run(res, res.ok ? fill(page.toast.unassigned, { n: F.number(res.moved.length) }) : null);
      });
    }

    function suggestDialog(ids) {
      var X = page.suggest;
      var dm = build(cur());
      var memNow = U.membership(dm.d, month);
      var groups = {}, skipped = 0;
      ids.forEach(function (id) {
        var x = dm.byId[id];
        if (!x) return;
        var s = calc.suggestSalesUnit(x, dm.units);
        if (s && s !== memNow[id] && dm.unitById[s] && dm.unitById[s].active) (groups[s] = groups[s] || []).push(x); else skipped++;
      });
      var fromKey = nextMonth();
      var monthSel = monthSelect(fromKey, function (v) { fromKey = v; refresh(); });
      var summary = h('ul', { class: 'dlg-lines su-dlg-lines' });
      function refresh() {
        C.clear(summary);
        var amount = 0, ch = null;
        Object.keys(groups).forEach(function (u) {
          var a = calc.sum(groups[u].map(function (x) { return x.refL12M || 0; }));
          amount += a;
          ch = channel(dm.unitById[u].channelId);
          summary.appendChild(h('li', null, fill(X.item, { name: dm.unitById[u].name, owner: ownerName(dm.d, u, fromKey), n: F.number(groups[u].length), amount: F.baht(a) })));
        });
        if (skipped) summary.appendChild(h('li', { class: 'su-dlg-info' }, fill(X.skipped, { n: F.number(skipped) })));
        if (ch) yearNotes(ch, fromKey, amount).forEach(function (n) { summary.appendChild(n); });
      }
      refresh();
      C.dialog({
        title: X.title, confirmLabel: X.confirm, wide: true,
        body: h('div', { class: 'su-dlg' }, h('div', { class: 'su-dlg-fields' }, field(page.move.fromMonth, monthSel)), summary)
      }).then(function (r) {
        if (!r.ok) return;
        var res = U.commandSuggest(current(), me, ids, fromKey, stamp(), month);
        if (res.ok && !res.moved.length) return;
        done();
        run(res, res.ok ? fill(page.toast.moved, { n: F.number(res.moved.length), unit: page.toast.suggested }) : null);
      });
    }

    // CR-33: เปลี่ยนสถานะคู่ค้าหลายราย (ข้อมูลอื่นจาก TRCLOUD ไม่เปลี่ยน)
    function statusDialog(ids) {
      var X = page.statusDialog;
      var dm = build(cur());
      var list = ids.map(function (id) { return dm.byId[id]; }).filter(Boolean);
      var to = list.some(function (x) { return x.active; }) ? 'inactive' : 'active';
      var summary = h('ul', { class: 'dlg-lines su-dlg-lines' });
      function refresh() {
        C.clear(summary);
        var change = list.filter(function (x) { return !!x.active !== (to === 'active'); }).length;
        summary.appendChild(h('li', null, change ? fill(X.count, { n: F.number(change) }) : X.none));
        if (list.length - change) summary.appendChild(h('li', { class: 'su-dlg-info' }, fill(X.same, { n: F.number(list.length - change) })));
      }
      var seg = C.segmented({ label: X.label, value: to, options: ['active', 'inactive'].map(function (v) { return { value: v, label: page.status[v] }; }),
        onChange: function (v) { to = v; refresh(); } });
      refresh();
      C.dialog({ title: X.title, confirmLabel: X.confirm,
        body: h('div', { class: 'su-dlg' }, h('div', { class: 'su-field' }, h('span', { class: 'field-label' }, X.label), seg), summary, h('p', { class: 'su-hint' }, X.note)) })
        .then(function (r) {
          if (!r.ok) return;
          var res = U.commandStatus(current(), me, ids, to === 'active');
          if (res.ok && !res.changed) return;
          done();
          run(res, res.ok ? fill(page.toast.status, { n: F.number(res.changed) }) : null);
        });
    }

    // =====================================================================
    // นำเข้าร้านค้าจาก Excel (แท็บ Channel ที่แบ่งเป้าตามเขต · CR-29 เดิม) → ตรวจก่อนยืนยัน → บันทึกทันที
    // =====================================================================
    function pickFile() {
      var input = h('input', { type: 'file', accept: '.xlsx,.xls,.csv', hidden: true });
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (input.parentNode) input.parentNode.removeChild(input);
        if (!f) return;
        SP.core['export'].readTable(f).then(function (table) { importReview(f.name, table); }, function () {
          C.dialog({ title: page.import.failed, confirmLabel: L.dialog.confirm });
        });
      });
      document.body.appendChild(input);
      input.click();
    }
    function importReview(fileName, table) {
      var X = page.import;
      var rules = SP.data.storeImport || {};
      var parsed = M.importRows(table, rules.importColumns);
      if (parsed.header < 0) { C.dialog({ title: X.noHeader, confirmLabel: L.dialog.confirm }); return; }
      var d = current();
      var fromKey = nextMonth();
      var diff = M.importDiff(d, parsed.rows, fromKey, rules.importRules);
      var pick = { added: diff.added.map(function (a) { return a.store.id; }), changed: diff.changed.map(function (c) { return c.storeId; }), missing: [] };
      var MAX = 60;
      function terrName(id) { var t = calc.findById(d.territories, id); return t ? t.name : page.unassignedCell; }
      function fmt(f, v) {
        if (f === 'territory') return v ? terrName(v) : page.unassignedCell;
        if (f === 'hasExport' || f === 'hasOnline') return v ? X.yes : X.no;
        if (f === 'active') return v ? page.status.active : page.status.inactive;
        return v === '' || v == null ? X.none : String(v);
      }
      function box(group, id) {
        return h('input', { type: 'checkbox', checked: pick[group].indexOf(id) >= 0, 'aria-label': id, onChange: function (e) {
          pick[group] = pick[group].filter(function (x) { return x !== id; });
          if (e.target.checked) pick[group].push(id);
        } });
      }
      function section(group, items, renderItem) {
        var sec;
        var all = h('input', { type: 'checkbox', checked: group !== 'missing' && items.length > 0, 'aria-label': X.selectAll, onChange: function (e) {
          pick[group] = e.target.checked ? items.map(function (x) { return x.id; }) : [];
          Array.prototype.forEach.call(sec.querySelectorAll('.su-imp-list input'), function (b) { b.checked = e.target.checked; });
        } });
        sec = h('section', { class: 'su-imp-group', dataset: { group: group } },
          h('h3', { class: 'su-imp-head' }, h('label', null, items.length ? all : null, ' ', fill(X.groups[group], { n: F.number(items.length) }))),
          group === 'missing' && items.length ? h('p', { class: 'su-hint' }, X.missingNote) : null,
          items.length ? h('ul', { class: 'su-imp-list' }, items.slice(0, MAX).map(function (x) { return h('li', null, h('label', null, box(group, x.id), ' ', renderItem(x))); }),
            items.length > MAX ? h('li', { class: 'muted' }, fill(X.more, { n: F.number(items.length - MAX) })) : null) : null);
        return sec;
      }
      var monthSel = monthSelect(fromKey, function (v) { fromKey = v; });
      var body = h('div', { class: 'su-dlg su-import-dlg' },
        h('p', { class: 'dlg-text' }, fill(X.rows, { n: F.number(parsed.rows.length) })),
        diff.unknownTerritories.length ? h('p', { class: 'su-dlg-warn' }, fill(X.unknownTerritory, { names: diff.unknownTerritories.join(', ') })) : null,
        // CR-35: แถวที่รหัสคู่ค้าซ้ำ = ไม่นำเข้า
        (diff.rejected || []).length ? h('div', { class: 'su-dlg-warn su-imp-rejected' }, h('strong', null, fill(X.rejected, { n: F.number(diff.rejected.length) })),
          h('ul', null, diff.rejected.slice(0, MAX).map(function (x) { return h('li', null, fill(page.errors.duplicateCode, { code: x.code, name: x.name })); }))) : null,
        field(X.fromMonth, monthSel),
        section('added', diff.added.map(function (a) { return { id: a.store.id, a: a }; }), function (x) {
          var s = x.a.store;
          return [h('strong', null, s.systemId), ' ' + s.name, s.masked ? h('span', { class: 'muted' }, ' · ' + X.masked) : null, x.a.territoryId ? h('span', { class: 'muted' }, ' → ' + fmt('territory', x.a.territoryId)) : null];
        }),
        section('changed', diff.changed.map(function (c) { return { id: c.storeId, c: c }; }), function (x) {
          var s = calc.findById(d.stores, x.c.storeId);
          return [h('strong', null, s.systemId), ' ' + s.name + ': ', x.c.fields.map(function (f) { return X.fields[f.field] + ' ' + fmt(f.field, f.before) + ' → ' + fmt(f.field, f.after); }).join(' · ')];
        }),
        section('missing', diff.missing.map(function (id) { return { id: id }; }), function (x) { var s = calc.findById(d.stores, x.id); return [h('strong', null, s.systemId), ' ' + s.name]; }));
      if (!diff.added.length && !diff.changed.length && !diff.missing.length) body.appendChild(h('p', null, X.nothing));
      C.dialog({ title: fill(X.title, { file: fileName }), wide: true, confirmLabel: X.confirm, body: body }).then(function (r) {
        if (!r.ok) return;
        done();
        run(U.commandImport(current(), me, diff, pick, fromKey, stamp()), page.toast.imported);
      });
    }

    // =====================================================================
    // Drawer ที่มีบันทึก / ยกเลิกของตัวเอง · ปิดขณะยังไม่บันทึก = ถามก่อน
    // =====================================================================
    function guardedDrawer(opts, isDirty) {
      var force = false;
      var ctl = C.drawer({ label: opts.label, className: opts.className, onClose: opts.onClose, beforeClose: function () {
        if (force || !isDirty()) return true;
        var A = page.drawerActions;
        C.dialog({ title: A.discardTitle, lines: [A.discardText], confirmLabel: A.discardConfirm, cancelLabel: A.keepEditing, danger: true }).then(function (r) {
          if (!r.ok) return;
          force = true;
          ctl.close();
          force = false;
        });
        return false;
      } });
      ctl.forceClose = function () { force = true; ctl.close(); force = false; };
      return ctl;
    }
    function drawerFoot(isDirty, onSave, onCancel, err) {
      var A = page.drawerActions;
      return h('div', { class: 'su-d-foot' },
        err ? h('p', { class: 'dlg-error su-d-error', role: 'alert' }, err) : null,
        h('span', { class: 'su-d-foot-note' }, isDirty ? A.dirty : ''),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-d-cancel', onClick: onCancel }, A.cancel),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm su-d-save', disabled: !isDirty, onClick: onSave }, A.save));
    }

    // =====================================================================
    // Drawer หน่วยขาย (แก้ไขรายรายการ · Drawer เปล่า = เพิ่มหน่วยขาย)
    // =====================================================================
    var unitId = null, unitTab = 'info', unitNew = null, unitForm = null, unitInit = null, unitErr = null;
    var unitCtl = guardedDrawer({ label: page.unitDrawer.label, className: 'su-unit-drawer', onClose: function () { unitId = null; unitNew = null; unitForm = unitInit = null; unitErr = null; } }, function () { return unitDirty(); });
    function unitDirty() { return !!unitForm && !same(unitForm, unitInit); }
    function rawUnit(c, id) { return calc.findById(c.accounts, id) || calc.findById(c.territories, id); }
    function formOf(id) {
      var raw = rawUnit(saved, id);
      if (!raw) return null;
      return { name: raw.name, note: raw.note || '', gp: raw.gp == null ? null : raw.gp, active: raw.active !== false, inactiveFrom: raw.inactiveFrom || null,
        suggest: (raw.suggest || []).slice(), provinces: ((saved.provinceSuggestions || {})[id] || []).slice() };
    }
    function openUnit(id) { unitId = id; unitNew = null; unitTab = 'info'; unitForm = formOf(id); unitInit = clone(unitForm); unitErr = null; drawUnit(); unitCtl.open(); }
    function openNewUnit(channelId) {
      if (!canEdit) return;
      var chs = channelsOn(saved);
      unitId = null; unitTab = 'info'; unitErr = null;
      unitNew = { channelId: channelId || chs[0].id };
      unitForm = { channelId: unitNew.channelId, name: '', note: '', gp: null, suggest: [], provinces: [] };
      unitInit = clone(unitForm);
      drawUnit();
      unitCtl.open();
    }
    function statusBadge(u, raw) {
      var St = page.status;
      if (u.kind === 'account') {
        var s = M.unitStatus(raw, month);
        if (s.scheduled) return h('span', { class: 'badge tag-warn' }, fill(St.scheduled, { month: F.date(s.from) }));
        return h('span', { class: 'badge ' + (s.active ? 'tag-ok' : 'tag-muted') }, s.active ? St.active : s.from ? fill(St.inactiveFrom, { month: F.date(s.from) }) : St.inactive);
      }
      return h('span', { class: 'badge ' + (raw.active !== false ? 'tag-ok' : 'tag-muted') }, raw.active !== false ? page.status.active : page.status.inactive);
    }
    // ค่าในฟอร์มรวมกับข้อมูลเดิม (ใช้แสดงสถานะก่อนบันทึก)
    function previewRaw(raw) {
      var o = clone(raw);
      o.active = unitForm.active;
      if (unitForm.inactiveFrom) o.inactiveFrom = unitForm.inactiveFrom; else delete o.inactiveFrom;
      return o;
    }
    function drawUnit() {
      if (!unitId && !unitNew) return;
      if (unitNew) { drawNewUnit(); return; }
      var X = page.unitDrawer, Fd = X.fields;
      var c = cur();
      var mdl = build(c);
      var u = mdl.unitById[unitId];
      var raw = rawUnit(c, unitId);
      if (!u || !raw) { unitCtl.forceClose(); return; }
      if (!unitForm) { unitForm = formOf(unitId); unitInit = clone(unitForm); }
      var ch = channel(u.channelId);
      var edit = canEdit;
      var shown = edit ? previewRaw(raw) : raw;
      C.clear(unitCtl.head);
      C.clear(unitCtl.body);
      unitCtl.head.appendChild(h('div', { class: 'su-d-head' }, h('h2', { class: 'su-d-title' }, edit ? unitForm.name || u.name : u.name),
        h('p', { class: 'su-d-code' }, u.code),
        h('div', { class: 'su-d-meta' }, chTag(ch), statusBadge(u, shown))));
      unitCtl.body.appendChild(C.segmented({ label: X.label, value: unitTab, options: ['info', 'history'].map(function (t) { return { value: t, label: X.tabs[t] }; }),
        onChange: function (v) { unitTab = v; drawUnit(); } }));
      if (unitTab === 'history') { unitCtl.body.appendChild(unitHistory(u, mdl.d)); return; }
      var inUnit = mdl.all.filter(function (x) { return mdl.mem[x.id] === u.id; });
      function row(label, value) { return h('div', { class: 'su-field' }, h('span', { class: 'field-label' }, label), h('span', { class: 'su-value' }, value)); }
      var box = h('div', { class: 'su-d-info' });
      var suggestLabel = u.kind === 'territory' ? Fd.suggestTerritory : Fd.suggestAccount;
      var countLabel = u.kind === 'territory' ? Fd.stores : Fd.customers;
      var gpShown = edit ? unitForm.gp : raw.gp;
      var gpRow = u.hasGP ? (edit && canGp ? field(fill(Fd.gp, { label: u.gpLabel || '' }), gpInput(u, raw, ch))
        : row(fill(Fd.gp, { label: u.gpLabel || '' }), gpShown == null ? h('span', { class: 'text-short' }, page.panel.gpMissing) : F.pct(gpShown, 1).replace('.0%', '%'))) : null;
      if (edit) {
        var name = h('input', { type: 'text', class: 'pm-input su-in-name', value: unitForm.name, 'aria-label': Fd.name });
        name.addEventListener('input', function () { unitForm.name = name.value; refreshFoot(); });
        name.addEventListener('change', function () { drawUnit(); });
        var note = h('input', { type: 'text', class: 'pm-input su-in-note', value: unitForm.note || '', 'aria-label': Fd.note });
        note.addEventListener('input', function () { unitForm.note = note.value; refreshFoot(); });
        var suggestCtl;
        if (u.kind === 'territory') {
          suggestCtl = h('span', { class: 'su-suggest-edit' }, h('span', null, unitForm.provinces.length ? unitForm.provinces.join(', ') : X.suggestNone),
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-provinces', onClick: function () { provincesDialog(u.id); } }, X.editProvinces));
        } else {
          suggestCtl = h('input', { type: 'text', class: 'pm-input su-in-suggest', value: unitForm.suggest.join(', '), 'aria-label': suggestLabel });
          suggestCtl.addEventListener('input', function () {
            unitForm.suggest = suggestCtl.value.split(',').map(function (s) { return s.trim().toUpperCase(); }).filter(Boolean)
              .filter(function (s, i, a) { return a.indexOf(s) === i; });
            refreshFoot();
          });
        }
        box.appendChild(h('div', { class: 'su-d-grid' },
          h('label', { class: 'su-field' }, h('span', { class: 'field-label' }, Fd.name), name),
          row(Fd.channel, ch ? ch.name + ' · ' + ch.fullName : u.channelId), gpRow,
          field(Fd.note, note),
          h('div', { class: 'su-field' }, h('span', { class: 'field-label' }, Fd.status), h('span', { class: 'su-status-edit' }, statusBadge(u, shown), statusButton(u, raw))),
          h('div', { class: 'su-field su-field-wide' }, h('span', { class: 'field-label' }, suggestLabel), suggestCtl, u.kind === 'territory' ? null : h('span', { class: 'su-hint' }, X.suggestHint)),
          row(countLabel, F.number(inUnit.filter(function (x) { return x.active; }).length))));
      } else {
        var suggestText = u.kind === 'territory' ? ((raw && (saved.provinceSuggestions || {})[u.id]) || []).join(', ') || X.suggestNone : (u.suggest || []).length ? u.suggest.join(', ') : X.suggestNone;
        box.appendChild(h('div', { class: 'su-d-grid' },
          row(Fd.name, u.name), row(Fd.channel, ch ? ch.name + ' · ' + ch.fullName : u.channelId), gpRow,
          row(Fd.status, statusBadge(u, raw)), row(Fd.note, u.note || '–'), row(suggestLabel, suggestText),
          row(countLabel, F.number(inUnit.filter(function (x) { return x.active; }).length))));
        box.appendChild(h('p', { class: 'su-hint' }, X.readonly));
      }
      box.appendChild(ownerSection(u, mdl.d));
      if (edit && u.kind === 'account') {
        var plan = store.get(store.planKey('topDown'));
        var inPlan = {};
        Object.keys(plan.units || {}).forEach(function (k) { (plan.units[k] || []).forEach(function (id) { inPlan[id] = true; }); });
        var removable = calc.canRemoveUnit(mdl.d, u.id, inPlan);
        box.appendChild(h('div', { class: 'su-d-remove' }, C.trashButton({ label: X.remove, disabled: !removable, disabledTitle: X.removeBlocked,
          confirmTitle: fill(X.removeConfirm, { name: u.name }), onConfirm: function () {
            var res = U.commandRemoveUnit(current(), me, u.id, inPlan);
            if (!res.ok) { C.toast(errorText(res.error)); return; }
            unitForm = unitInit = null;
            unitCtl.forceClose();
            panelSel = 'all';
            run(res, fill(page.toast.removed, { name: u.name }));
          } }), h('span', { class: 'su-hint' }, removable ? X.remove : X.removeBlocked)));
      }
      unitCtl.body.appendChild(box);
      var footSlot = h('div', { class: 'su-d-foot-slot' });
      function refreshFoot() { C.clear(footSlot).appendChild(drawerFoot(unitDirty(), saveUnit, cancelUnit, unitErr)); }
      if (edit) { refreshFoot(); unitCtl.body.appendChild(footSlot); }
    }
    // ผู้รับผิดชอบ (อ่านอย่างเดียว): ช่วงของปีปัจจุบัน – เดือนสุดแผน (clock.horizonEnd) + ช่วงที่ไม่มีผู้รับผิดชอบ · แก้ที่ Sales Person Management
    function ownerSection(u, d) {
      var X = page.unitDrawer;
      var from = SP.core.clock.currentMonth().slice(0, 4) + '-01';
      var to = SP.core.clock.horizonEnd();
      var runs = [];
      calc.unitAssignments(d.assignments, u.id).forEach(function (a) {
        var p = calc.findById(d.salespeople, a.salesPersonId);
        var end = a.toMonth || null;
        if (p && p.endMonth && (!end || p.endMonth < end)) end = p.endMonth;
        if ((end && end < from) || a.fromMonth > to) return;
        var f = a.fromMonth < from ? from : a.fromMonth;
        runs.push({ from: f, to: end && end < to ? end : null, name: C.personName(d.salespeople, a.salesPersonId), open: !end || end >= to });
      });
      (calc.ownerGaps(d.assignments, d.salespeople, [u.id], from, to)[0] || { runs: [] }).runs.forEach(function (g) {
        runs.push({ from: g.from, to: g.to >= to ? null : g.to, name: X.ownerNone, vacant: true, open: g.to >= to });
      });
      runs.sort(function (a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : 0; });
      function range(r) {
        var R = X.ownerRange;
        if (r.open) return fill(R.open, { from: F.date(r.from) });
        if (r.from === r.to) return F.date(r.from);
        if (r.from.slice(0, 4) === r.to.slice(0, 4)) return fill(R.sameYear, { from: F.MONTHS[Number(r.from.slice(5, 7)) - 1], to: F.MONTHS[Number(r.to.slice(5, 7)) - 1], year: r.from.slice(0, 4) });
        return fill(R.span, { from: F.date(r.from), to: F.date(r.to) });
      }
      return h('section', { class: 'su-d-owner' },
        h('div', { class: 'su-d-sec-head' }, h('h3', null, fill(X.ownerTitle, { from: F.date(from), to: F.date(to) })),
          peopleLink(fill(X.ownerEdit, { page: peopleTitle }), 'su-owner-edit')),
        runs.length ? h('ul', { class: 'su-owner-runs' }, runs.map(function (r) {
          return h('li', { class: r.vacant ? 'text-short' : null }, fill(X.ownerRun, { name: r.name, range: range(r) }));
        })) : h('p', { class: 'su-hint' }, X.ownerNone));
    }
    function patchOf(isAccount) {
      var keys = isAccount ? ['name', 'note', 'gp', 'active', 'inactiveFrom', 'suggest'] : ['name', 'note', 'active', 'provinces'];
      var out = {};
      keys.forEach(function (k) { if (!same(unitForm[k], unitInit[k])) out[k] = clone(unitForm[k]); });
      return out;
    }
    function saveUnit() {
      var raw = rawUnit(saved, unitId);
      var res = U.commandSaveUnit(current(), me, unitId, patchOf(!!calc.findById(saved.accounts, unitId)));
      if (!res.ok) { unitErr = errorText(res.error); drawUnit(); return; }
      unitErr = null;
      commit(res.changes, fill(page.toast.unitSaved, { name: String(unitForm.name || raw.name).trim() }));
      unitForm = formOf(unitId);
      unitInit = clone(unitForm);
      drawUnit();
    }
    function cancelUnit() { unitForm = unitInit = null; unitErr = null; unitCtl.forceClose(); }
    function statusButton(u, raw) {
      var X = page.unitDrawer;
      if (u.kind === 'account') {
        var preview = previewRaw(raw);
        return M.unitActiveAt(preview, nowKey) && !preview.inactiveFrom
          ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-deactivate', onClick: function () { deactivateDialog(u, raw); } }, X.deactivate)
          : h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-activate', onClick: function () { setFormActive(raw, true); } }, X.activate);
      }
      if (unitForm.active) {
        var busy = !M.canDeactivateTerritory(current(), u.id, nowKey);
        return h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-deactivate', disabled: busy, title: busy ? X.deactivateBlocked : null, onClick: function () {
          C.dialog({ title: fill(page.deactivateDialog.title, { name: u.name }), lines: page.deactivateDialog.territoryLines, confirmLabel: page.deactivateDialog.confirm, danger: true })
            .then(function (r) { if (r.ok) { unitForm.active = false; drawUnit(); } });
        } }, X.deactivate);
      }
      return h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-activate', onClick: function () { unitForm.active = true; drawUnit(); } }, X.activate);
    }
    function setFormActive(raw, on, from) {
      var r = M.setUnitActive(previewRaw(raw), on, from, nowKey);
      unitForm.active = r.active !== false;
      unitForm.inactiveFrom = r.inactiveFrom || null;
      drawUnit();
    }
    function gpInput(u, raw, ch) {
      var val = function () { return unitForm.gp == null ? '' : String(Math.round(unitForm.gp * 10000) / 100); };
      var gp = h('input', { type: 'number', class: 'pm-input pm-stock su-in-gp', min: '0', max: '99', step: '0.5', value: val(),
        placeholder: page.panel.gpMissing, 'aria-label': ch.gpLabel || '' });
      gp.addEventListener('change', function () {
        var v = gp.value === '' ? null : Number(gp.value) / 100;
        if (v != null && (isNaN(v) || v < 0 || v >= 1)) { gp.value = val(); return; }
        if (v === unitForm.gp) return;
        gpDialog(u, raw, ch, v).then(function (ok) { if (!ok) { gp.value = val(); return; } unitForm.gp = v; drawUnit(); });
      });
      return h('span', { class: 'num-input' }, gp, h('span', { class: 'num-suffix' }, '%'));
    }
    // ผลต่อ Net Sales ของแผนปีที่เลือก (แจ้งเท่านั้น)
    function gpDialog(u, raw, ch, v) {
      var G = page.gpDialog;
      var label = ch.gpLabel || '';
      var year = store.year();
      var plan = store.get('plan.' + year + '.topDown');
      var inPlan = ((plan.units || {})[u.channelId] || []).indexOf(u.id) >= 0;
      var oldGp = unitForm.gp;
      var lines = [fill(G.line, { label: label, from: oldGp == null ? page.panel.gpMissing : F.pct(oldGp, 1), to: v == null ? page.panel.gpMissing : F.pct(v, 1) })];
      if (!inPlan) lines.push(fill(G.noPlan, { year: year }));
      else {
        var net = calc.skuPlanNet(current(), store.master(), u.id, store.get('plan.' + year + '.sku.' + u.id), year);
        var diff = M.gpImpact(net, oldGp, v);
        lines.push(diff == null ? fill(G.noBase, { label: label }) : fill(G.impact, { year: year, amount: (diff >= 0 ? '+' : '−') + F.millionPlain(Math.abs(diff), 2) }));
      }
      return C.dialog({ title: fill(G.title, { label: label, name: u.name }), lines: lines, confirmLabel: G.confirm }).then(function (r) { return r.ok; });
    }
    function targetLines(u) {
      var X = page.deactivateDialog;
      var out = [];
      SP.data.settings.PLAN_YEARS.forEach(function (y) {
        var plan = store.get('plan.' + y + '.topDown');
        if (((plan.units || {})[u.channelId] || []).indexOf(u.id) < 0) return;
        var tree = calc.topDown(store.data(), plan, y);
        var t = calc.findById(calc.planUnits(tree), u.id);
        if (t && t.amount > 0.5) out.push(fill(X.target, { year: y, amount: F.millionPlain(t.amount, 2) }));
      });
      return out.length ? out : [X.noTarget];
    }
    function deactivateDialog(u, raw) {
      var X = page.deactivateDialog;
      var from = calc.addMonths(nowKey, 1);
      var opts = [];
      for (var i = 0; i < 24; i++) { var k = calc.addMonths(nowKey, i); opts.push({ value: k, label: F.date(k) }); }
      var sel = C.select({ label: X.fromMonth, value: from, className: 'su-dlg-month', options: opts, onChange: function (v) { from = v; } });
      C.dialog({ title: fill(X.title, { name: u.name }), confirmLabel: X.confirm, danger: true,
        body: h('div', { class: 'su-dlg' }, field(X.fromMonth, sel), h('ul', { class: 'dlg-lines' }, X.lines.concat(targetLines(u)).map(function (t) { return h('li', null, t); }))) })
        .then(function (r) { if (r.ok) setFormActive(raw, false, from); });
    }
    function provincesDialog(tid) {
      var X = page.provinces;
      var d = current();
      var t = calc.findById(d.territories, tid);
      var chosen = unitForm ? unitForm.provinces.slice() : ((saved.provinceSuggestions || {})[tid] || []).slice();
      var all = {};
      Object.keys(d.provinceSuggestions).forEach(function (k) { (d.provinceSuggestions[k] || []).forEach(function (p) { all[p] = true; }); });
      d.stores.forEach(function (s) { S.provincesOf(s).forEach(function (p) { all[p] = true; }); });
      var names = Object.keys(all).sort(thai);
      var search = h('input', { type: 'search', class: 'ss-search', placeholder: X.search, 'aria-label': X.search });
      var count = h('p', { class: 'su-hint' });
      var list = h('ul', { class: 'su-prov-list' });
      function others(p) {
        return S.storeTerritories(d).filter(function (x) { return x.id !== tid && (d.provinceSuggestions[x.id] || []).indexOf(p) >= 0; }).map(function (x) { return String(x.name).split(' · ')[0]; });
      }
      function renderList() {
        var q = search.value.trim();
        C.clear(list);
        names.filter(function (p) { return !q || p.indexOf(q) >= 0; }).forEach(function (p) {
          var box = h('input', { type: 'checkbox', checked: chosen.indexOf(p) >= 0, 'aria-label': p, onChange: function (e) {
            chosen = chosen.filter(function (x) { return x !== p; });
            if (e.target.checked) chosen.push(p);
            count.textContent = fill(X.count, { n: chosen.length });
          } });
          var o = others(p);
          list.appendChild(h('li', null, h('label', { class: 'series-option' }, box, h('span', { class: 'series-name' }, p),
            o.length ? h('span', { class: 'su-prov-also' }, fill(X.also, { names: o.join(', ') })) : null)));
        });
        count.textContent = fill(X.count, { n: chosen.length });
      }
      search.addEventListener('input', renderList);
      renderList();
      C.dialog({ title: fill(X.title, { name: t ? t.name : '' }), confirmLabel: X.confirm, wide: true,
        body: h('div', { class: 'su-dlg' }, h('p', { class: 'dlg-text' }, X.hint), search, count, list) }).then(function (r) {
        if (!r.ok || !unitForm) return;
        unitForm.provinces = names.filter(function (p) { return chosen.indexOf(p) >= 0; });
        drawUnit();
      });
    }
    function unitHistory(u, d) {
      var entity = u.kind === 'territory' ? 'territory' : 'account';
      var list = M.historyOf(store.get('master.audit'), [{ entity: entity, key: u.id }, { entity: 'assignment', key: u.id }]);
      return h('div', { class: 'su-d-history' }, C.historyList(list, { value: function (e, which) {
        var v = which === 'old' ? e.oldValue : e.newValue;
        if (e.field === 'gp') return v == null ? page.panel.gpMissing : F.pct(v, 1);
        if (e.field === 'active') return v === false ? page.status.inactive : page.status.active;
        if (e.field === 'inactiveFrom') return v ? F.date(v) : '–';
        if (e.field === 'suggest' || e.field === 'provinces') return (v || []).join(', ') || '–';
        if (e.field === 'owner') return (v || []).map(function (r) { return F.keyRange(r.fromMonth, r.toMonth, L.owner.now) + ' · ' + (r.salesPersonId ? C.personName(d.salespeople, r.salesPersonId) : L.owner.none); }).join(' / ') || '–';
        return null;
      } }));
    }

    // Drawer เปล่า = เพิ่มหน่วยขาย: Channel · ชื่อ · รหัสระบบสร้าง · GP (Channel ที่มี GP · สิทธิ์ย่อย) · จังหวัดแนะนำ (Channel ที่แบ่งเป้าตามเขต) · หมายเหตุ
    function drawNewUnit() {
      var X = page.addDialog;
      var d = current();
      var chs = channelsOn(saved);
      var ch = channel(unitForm.channelId);
      C.clear(unitCtl.head);
      C.clear(unitCtl.body);
      var code = isTerritory(ch) ? S.nextTerritoryId(d, ch.id) : M.nextUnitCode(saved.accounts, saved.channels, ch.id);
      unitCtl.head.appendChild(h('div', { class: 'su-d-head' }, h('h2', { class: 'su-d-title' }, X.title), h('p', { class: 'su-d-code' }, fill(X.codeNote, { code: code })),
        h('div', { class: 'su-d-meta' }, chTag(ch))));
      var chSel = C.select({ label: X.channel, value: ch.id, className: 'su-add-channel', options: chs.map(function (c) { return { value: c.id, label: c.name + ' · ' + c.fullName }; }),
        onChange: function (v) { unitForm.channelId = v; unitForm.gp = null; unitForm.provinces = []; drawUnit(); } });
      var name = h('input', { type: 'text', class: 'pm-input su-add-name', value: unitForm.name, 'aria-label': X.name });
      name.addEventListener('input', function () { unitForm.name = name.value; refreshFoot(); });
      var note = h('input', { type: 'text', class: 'pm-input su-in-note', value: unitForm.note, 'aria-label': page.unitDrawer.fields.note });
      note.addEventListener('input', function () { unitForm.note = note.value; refreshFoot(); });
      var grid = h('div', { class: 'su-d-grid' }, field(X.channel, chSel), h('label', { class: 'su-field' }, h('span', { class: 'field-label' }, X.name), name));
      if (!isTerritory(ch) && ch.hasGP !== false && canGp) {
        var gp = h('input', { type: 'number', class: 'pm-input pm-stock su-add-gp', min: '0', max: '99', step: '0.5', value: unitForm.gp == null ? '' : String(Math.round(unitForm.gp * 10000) / 100), 'aria-label': fill(X.gp, { label: ch.gpLabel || '' }) });
        gp.addEventListener('input', function () { var v = gp.value === '' ? null : Math.min(99, Math.max(0, Number(gp.value))) / 100; unitForm.gp = isNaN(v) ? null : v; refreshFoot(); });
        grid.appendChild(field(fill(X.gp, { label: ch.gpLabel || '' }), h('span', { class: 'num-input' }, gp, h('span', { class: 'num-suffix' }, '%'))));
      }
      if (isTerritory(ch)) {
        var names = {};
        Object.keys(d.provinceSuggestions).forEach(function (k) { (d.provinceSuggestions[k] || []).forEach(function (p) { names[p] = true; }); });
        d.stores.forEach(function (s) { S.provincesOf(s).forEach(function (p) { names[p] = true; }); });
        var Fl = page.filters;
        grid.appendChild(field(X.provinces, C.multiSelect({ label: X.provinces, allLabel: Fl.all, selected: Fl.selected, clear: Fl.clear, empty: Fl.empty, search: Fl.find,
          options: Object.keys(names).sort(thai).map(function (p) { return { value: p, label: p }; }), value: unitForm.provinces, onChange: function (v) { unitForm.provinces = v; refreshFoot(); } })));
      }
      grid.appendChild(field(page.unitDrawer.fields.note, note));
      unitCtl.body.appendChild(h('div', { class: 'su-d-info' }, grid, h('p', { class: 'su-hint' }, fill(X.hint, { page: peopleTitle }))));
      var footSlot = h('div', { class: 'su-d-foot-slot' });
      function refreshFoot() { C.clear(footSlot).appendChild(drawerFoot(!!String(unitForm.name || '').trim(), saveNewUnit, cancelUnit, unitErr)); }
      refreshFoot();
      unitCtl.body.appendChild(footSlot);
      setTimeout(function () { try { name.focus(); } catch (e) { /* ignore */ } }, 0);
    }
    function saveNewUnit() {
      var chId = unitForm.channelId;
      var res = U.commandAddUnit(current(), me, chId, { name: unitForm.name, gp: unitForm.gp, note: unitForm.note, provinces: unitForm.provinces }, { id: 'acc-' + Date.now().toString(36) });
      if (!res.ok) { unitErr = errorText(res.error); drawUnit(); return; }
      var nm = String(unitForm.name).trim();
      unitErr = null;
      if (currentTab() !== 'all') store.set('ui.salesUnitsTab', chId);
      panelSel = res.id;
      unitNew = null;
      commit(res.changes, fill(page.toast.added, { name: nm }));
      unitId = res.id;
      unitForm = formOf(res.id);
      unitInit = clone(unitForm);
      drawUnit();
    }

    // =====================================================================
    // Drawer คู่ค้า + Timeline 12 เดือน · แก้สถานะได้ · ย้ายหน่วยขาย… (ข้อมูลจาก TRCLOUD อ่านอย่างเดียว)
    // =====================================================================
    var custId = null, custYear = null, custForm = null, custInit = null;
    var custCtl = guardedDrawer({ label: page.customerDrawer.label, className: 'su-cust-drawer', onClose: function () { custId = null; custForm = custInit = null; } }, function () { return custDirty(); });
    function custDirty() { return !!custForm && !same(custForm, custInit); }
    function openCustomer(id) {
      custId = id; custYear = Number(month.slice(0, 4));
      var x = model && model.byId[id];
      custForm = x ? { active: !!x.active } : null;
      custInit = clone(custForm);
      drawCustomer();
      custCtl.open();
    }
    function drawCustomer() {
      if (!custId) return;
      var R = page.customerDrawer, Fd = R.fields;
      var mdl = build(cur());
      var x = mdl.byId[custId];
      if (!x) { custCtl.forceClose(); return; }
      if (!custForm) { custForm = { active: !!x.active }; custInit = clone(custForm); }
      var d = mdl.d;
      var u = mdl.mem[x.id];
      var unit = u ? mdl.unitById[u] : null;
      var ch = channel(x.channelId);
      var sug = calc.suggestSalesUnit(x, mdl.units);
      var active = canEdit ? custForm.active : x.active;
      C.clear(custCtl.head);
      C.clear(custCtl.body);
      custCtl.head.appendChild(h('div', { class: 'su-d-head' },
        h('h2', { class: 'su-d-title' }, x.name, x.masked ? C.privacyMark(page.tips.masked) : null),
        h('div', { class: 'su-d-meta' }, chTag(ch), h('span', null, x.trcloudId),
          h('span', { class: 'badge ' + (active ? 'tag-ok' : 'tag-muted') }, active ? page.status.active : page.status.inactive),
          x.isSample ? h('span', { class: 'su-hint' }, page.tips.sample) : null)));
      function row(label, value) { return h('div', { class: 'su-field' }, h('span', { class: 'field-label' }, label), h('span', { class: 'su-value' }, value)); }
      var isOut = !!unit && unit.kind === 'territory' && S.outOfProvince(x, u, d.provinceSuggestions);
      var status = [h('span', { class: 'badge ' + (active ? 'tag-ok' : 'tag-muted') }, active ? page.status.active : page.status.inactive)];
      if (canEdit) status.push(h('button', { type: 'button', class: 'btn btn-ghost btn-sm su-cust-status', onClick: function () { custForm.active = !custForm.active; drawCustomer(); } }, active ? R.deactivate : R.activate));
      var moveBtn = canEdit ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm su-cust-move', onClick: function () { moveDialog([x.id], null); } }, R.move) : null;
      custCtl.body.appendChild(h('section', { class: 'su-d-section' }, h('h3', null, R.info),
        h('div', { class: 'su-d-grid' },
          row(Fd.trcloudId, x.trcloudId), row(Fd.kind, page.kinds[x.kind] || x.kind), row(x.kind === 'store' ? Fd.storeType : Fd.trcloudType, x.kind === 'store' ? x.storeType || '–' : x.trcloudType || '–'),
          x.kind !== 'store' ? row(Fd.legalName, x.legalName || '–') : row(Fd.priceType, x.priceType || '–'),
          x.kind !== 'store' ? row(Fd.taxId, x.taxId || '–') : null,
          row(Fd.province, [x.province ? x.province.split(',').join(', ') : '–', isOut ? h('span', { class: 'badge tag-muted su-outside', title: fill(page.tips.outsideTip, { territory: unit.name }) }, page.tips.outside) : null]),
          row(Fd.channels, [x.isExport ? page.filters.channelOptions.export : null, x.isOnline ? page.filters.channelOptions.online : null].filter(Boolean).join(' · ') || '–'),
          row(Fd.status, status),
          row(fill(Fd.unit, { month: F.date(month) }), [unit ? [unit.name + ' · ', ownerLinkOf(d, u)] : page.unassignedCell, moveBtn ? ' ' : null, moveBtn]),
          row(Fd.suggested, sug ? mdl.unitById[sug].name : '–'),
          row(Fd.refL12M, F.baht(x.refL12M || 0))),
        h('p', { class: 'su-hint' }, canEdit ? R.trcloudNote : R.readonly)));
      // Timeline: หน่วยขาย · ผู้รับผิดชอบ · ยอดอ้างอิงรายเดือน (ร้านค้าของเขต)
      var years = [];
      months.forEach(function (k) { var y = Number(k.slice(0, 4)); if (years.indexOf(y) < 0) years.push(y); });
      var y = custYear || Number(month.slice(0, 4));
      var line = U.timeline(d, x.id, y);
      function segments(fn) {
        var out = [];
        for (var m = 0; m < 12; m++) {
          var v = fn(m), last = out[out.length - 1];
          if (last && last.key === v.key) last.span++; else out.push({ key: v.key, text: v.text, title: v.title, cls: v.cls, style: v.style, span: 1 });
        }
        return out;
      }
      var unitSegs = segments(function (m) {
        var id = line[m];
        var uu = id ? mdl.unitById[id] : null;
        return { key: id || '', text: uu ? String(uu.name).split(' · ')[0] : R.none, title: uu ? uu.name : page.unassignedCell, cls: id ? null : 'is-empty' };
      });
      var ownerSegs = segments(function (m) {
        var id = line[m];
        var key = calc.monthKey(y, m);
        var pid = id ? calc.ownerOf(d.assignments, d.salespeople, id, key) : null;
        if (!id) return { key: '', text: R.none, cls: 'is-empty' };
        if (!pid) return { key: 'vacant', text: R.vacant, title: page.panel.noOwner, cls: 'owner-seg is-vacant' };
        var nm = C.personName(d.salespeople, pid);
        return { key: pid, text: firstName(nm), title: nm, style: { '--seg': C.tokenVar(C.personColor(d.salespeople, pid)) }, cls: 'owner-seg' };
      });
      function cellsOf(segs, cls) {
        return segs.map(function (g) {
          var style = { gridColumn: 'span ' + g.span };
          Object.keys(g.style || {}).forEach(function (k) { style[k] = g.style[k]; });
          return h('div', { class: 'su-tl-seg ' + cls + ' ' + (g.cls || ''), style: style, title: g.title || g.text }, h('span', null, g.text));
        });
      }
      var yi = years.indexOf(y);
      var storeObj = x.source === 'store' ? calc.findById(d.stores, x.id) : null;
      var refM = storeObj ? S.storeMonthly(d, storeObj) : null;
      custCtl.body.appendChild(h('section', { class: 'su-d-section' },
        h('div', { class: 'su-d-hist-head' }, h('h3', null, R.history + ' ' + y),
          h('span', { class: 'su-d-years' },
            h('button', { type: 'button', class: 'icon-btn', disabled: yi <= 0, title: R.prevYear, 'aria-label': R.prevYear, onClick: function () { custYear = years[yi - 1]; drawCustomer(); } }, '‹'),
            h('button', { type: 'button', class: 'icon-btn', disabled: yi < 0 || yi >= years.length - 1, title: R.nextYear, 'aria-label': R.nextYear, onClick: function () { custYear = years[yi + 1]; drawCustomer(); } }, '›'))),
        h('div', { class: 'su-tl' },
          h('span', { class: 'su-tl-label' }), F.MONTHS.map(function (n, m) { return h('span', { class: 'su-tl-month' + (calc.monthKey(y, m) === month ? ' is-current' : '') }, n); }),
          h('span', { class: 'su-tl-label' }, R.rows.unit), h('div', { class: 'su-tl-row' }, cellsOf(unitSegs, 'is-unit')),
          h('span', { class: 'su-tl-label' }, R.rows.owner), h('div', { class: 'su-tl-row' }, cellsOf(ownerSegs, 'is-owner')),
          refM ? [h('span', { class: 'su-tl-label' }, R.rows.ref), refM.map(function (v) { return h('span', { class: 'su-tl-ref num' }, F.number(v)); })] : null),
        refM ? h('p', { class: 'su-hint' }, fill(R.refNote, { channel: ch ? ch.name : '' })) : null));
      if (canEdit) custCtl.body.appendChild(drawerFoot(custDirty(), saveCustomer, function () { custForm = custInit = null; custCtl.forceClose(); }, null));
    }
    function saveCustomer() {
      var x = model.byId[custId];
      var res = U.commandStatus(current(), me, [custId], custForm.active);
      if (!res.ok) { C.toast(errorText(res.error)); return; }
      commit(res.changes, fill(page.toast.customerSaved, { name: x ? x.name : custId }));
      custInit = clone(custForm);
      drawCustomer();
    }
    function ownerLinkOf(d, u) {
      var id = calc.ownerOf(d.assignments, d.salespeople, u, month);
      return id ? C.personLink(d.salespeople, id) : h('span', { class: 'text-short' }, ownerName(d, u, month));
    }

    // =====================================================================
    // ตั้งค่า Channel (Drawer · สิทธิ์ย่อย salesUnits.channelSettings · บันทึก / ยกเลิก ของตัวเอง)
    // =====================================================================
    var chForm = null, chInit = null, chErr = null;
    var chCtl = guardedDrawer({ label: page.channelPanel.title, className: 'su-ch-drawer', onClose: function () { chForm = chInit = null; chErr = null; } }, function () { return chDirty(); });
    function chDirty() { return !!chForm && !same(chForm, chInit); }
    function openChannels() { chForm = canCh ? clone(saved.channels) : null; chInit = clone(chForm); chErr = null; redrawChannels(true); chCtl.open(); }
    function redrawChannels(force) {
      if (!force && !chCtl.isOpen()) return;
      var X = page.channelPanel, Cl = X.columns;
      var d = current();
      var can = canCh && !!chForm;
      var list = can ? chForm : saved.channels || [];
      C.clear(chCtl.head);
      C.clear(chCtl.body);
      chCtl.head.appendChild(h('h2', { class: 'su-d-title' }, X.title));
      chCtl.body.appendChild(h('p', { class: 'su-hint' }, X.note));
      if (!can) chCtl.body.appendChild(h('p', { class: 'su-hint' }, X.readonly));
      var tokens = ['--ch-1', '--ch-2', '--ch-3', '--ch-4', '--ch-5', '--ch-6', '--ch-7', '--ch-8'];
      function upd(id, key, value) { var x = calc.findById(chForm, id); x[key] = value; redrawChannels(); }
      var rows = list.slice().sort(byOrder).map(function (ch) {
        var locked = M.channelAllocationLocked(d, ch.id);
        var tt = isTerritory(ch);
        function text(key, cls) {
          if (!can) return h('span', null, ch[key] == null ? '–' : String(ch[key]));
          var i = h('input', { type: key === 'order' ? 'number' : 'text', class: 'pm-input su-ch-in ' + (cls || ''), value: ch[key] == null ? '' : String(ch[key]), 'aria-label': Cl[key] + ' ' + ch.name });
          i.addEventListener('change', function () { upd(ch.id, key, key === 'order' ? Number(i.value) || 0 : i.value.trim()); });
          return i;
        }
        function check(key) {
          if (!can) return h('span', null, ch[key] !== false ? X.yes : X.no);
          return h('input', { type: 'checkbox', checked: ch[key] !== false, 'aria-label': Cl[key] + ' ' + ch.name, onChange: function (e) { upd(ch.id, key, e.target.checked); } });
        }
        var alloc = can && !locked ? C.select({ label: Cl.allocationUnit, value: ch.allocationUnit || 'ACCOUNT', className: 'su-ch-alloc',
          options: ['ACCOUNT', 'TERRITORY'].map(function (v) { return { value: v, label: X.allocation[v] }; }), onChange: function (v) { upd(ch.id, 'allocationUnit', v); } })
          : h('span', { title: locked ? X.locked : null }, X.allocation[ch.allocationUnit || 'ACCOUNT']);
        var color = can ? C.select({ label: Cl.color, value: calc.channelColor(ch), className: 'su-ch-color',
          options: tokens.map(function (t) { return { value: t, label: t.replace('--', '') }; }), onChange: function (v) { upd(ch.id, 'colorToken', v); } })
          : chTag(ch);
        return h('tr', { class: ch.active === false ? 'is-inactive' : null },
          h('td', { class: 'su-code' }, ch.id), h('td', null, text('name', 'is-short')), h('td', null, text('fullName')), h('td', null, alloc),
          h('td', null, text('unitLabel', 'is-short')), h('td', { class: 'su-center' }, tt ? h('span', { class: 'muted' }, X.no) : check('hasGP')),
          h('td', null, tt ? h('span', { class: 'muted' }, X.no) : text('gpLabel', 'is-short')), h('td', null, color), h('td', { class: 'su-center' }, check('active')),
          h('td', null, text('order', 'is-num')));
      });
      chCtl.body.appendChild(h('div', { class: 'table-scroll' }, h('table', { class: 'data-table su-ch-table' },
        h('thead', null, h('tr', null, ['id', 'name', 'fullName', 'allocationUnit', 'unitLabel', 'hasGP', 'gpLabel', 'color', 'active', 'order'].map(function (k) { return h('th', { scope: 'col' }, Cl[k]); }))),
        h('tbody', null, rows))));
      if (can) {
        var err = h('p', { class: 'dlg-error', hidden: true });
        var idIn = h('input', { type: 'text', class: 'pm-input su-ch-new-id', placeholder: Cl.id, 'aria-label': Cl.id });
        chCtl.body.appendChild(h('div', { class: 'su-ch-add' }, idIn, h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onClick: function () {
          var id = idIn.value.trim().toLowerCase();
          if (!/^[a-z][a-z0-9-]*$/.test(id) || calc.findById(chForm, id)) { err.textContent = X.idError; err.hidden = false; return; }
          var order = chForm.reduce(function (m, x) { return Math.max(m, x.order || 0); }, 0) + 1;
          chForm.push({ id: id, name: id.toUpperCase(), fullName: X.newName, colorToken: tokens[(order - 1) % tokens.length], allocationUnit: 'ACCOUNT', sellOutMethod: 'ACTUAL',
            hasGP: true, active: true, order: order, unitLabel: X.allocation.ACCOUNT, gpLabel: 'GP' });
          redrawChannels();
        } }, X.add), err));
        chCtl.body.appendChild(drawerFoot(chDirty(), function () {
          var res = U.commandChannels(current(), me, chForm);
          if (!res.ok) { chErr = errorText(res.error); redrawChannels(); return; }
          chErr = null;
          commit(res.changes, page.toast.channels);
          chInit = clone(chForm);
          redrawChannels();
        }, function () { chForm = chInit = null; chCtl.forceClose(); }, chErr));
      }
    }

    // =====================================================================
    // ส่งออก: หน่วยขาย · คู่ค้า (ตามตัวกรองปัจจุบัน) · ประวัติการจัดสรรตามช่วงเดือน
    // =====================================================================
    function exportSpec() {
      var X = page.exportColumns, E = page.exportHeader;
      var keep = model;
      model = build(saved);
      var tab = currentTab();
      var tabName = tab === 'all' ? page.tabAll : channel(tab).name;
      var d = model.d;
      var units = model.units.filter(function (u) { return inTab(u, tab); });
      var inUnit = {}, refUnit = {};
      model.all.forEach(function (x) { var u = model.mem[x.id]; if (!u) return; refUnit[u] = (refUnit[u] || 0) + (x.refL12M || 0); if (x.active) inUnit[u] = (inUnit[u] || 0) + 1; });
      var rows = rowsOf(tab);
      var defs = columnDefs();
      var chipText = [];
      if (filters.q.trim()) chipText.push(filters.q.trim());
      ['kind', 'trcloudType', 'priceType', 'province', 'channels', 'data'].forEach(function (k) { if (filters[k].length) chipText.push(page.filters[k] + ': ' + filters[k].join(', ')); });
      chipText.push(page.filters.status + ': ' + page.filters.statusOptions[filters.status]);
      var unit = unitOfPanel();
      var view = unit ? fill(page.tableTitle.unit, { name: unit.name }) : panelSel === 'all' ? page.tableTitle.all : fill(page.tableTitle.unassigned, { channel: tabName });
      var hist = U.assignments(d).filter(function (a) { var x = model.byId[a.customerId]; return x && inTab(x, tab); })
        .sort(function (a, b) { return thai(a.customerId, b.customerId) || (a.fromMonth < b.fromMonth ? -1 : 1); });
      var st = C.exportStamp(null);
      var head = C.exportHeader(store.year(), null, [[E.month, F.date(month)], [E.tab, tabName]]);
      var spec = {
        filename: fill(page.exportFile, { tab: C.fileSafe(tabName), month: month, date: st.date }),
        sheets: [
          { name: page.exportSheets.customers, header: head.concat([[E.view, view], [E.filters, chipText.join(' · ') || E.noFilters]]), rows: rows,
            columns: ['trcloudId', 'name'].concat(SELECTABLE).concat(['suggested']).map(function (k) {
              var c = defs[k];
              var val = k === 'export' ? function (x) { return x.isExport ? X.yes : ''; } : k === 'online' ? function (x) { return x.isOnline ? X.yes : ''; }
                : k === 'status' ? function (x) { return x.active ? page.status.active : page.status.inactive; } : function (x) { var v = c.value(x); return v == null ? '' : v; };
              return { key: k, label: c.label, type: k === 'refL12M' ? 'money' : null, value: val, width: k === 'name' ? 36 : 16 };
            })
              .concat([{ key: 'owner', label: fill(X.owner, { month: F.date(month) }), value: function (x) { var u = model.mem[x.id]; return u ? ownerName(d, u, month) : ''; }, width: 20 },
                { key: 'outside', label: X.outside, value: function (x) { return outside(x) ? X.yes : ''; }, width: 12 },
                { key: 'sample', label: X.sample, value: function (x) { return x.isSample ? X.yes : ''; }, width: 12 }]) },
          { name: page.exportSheets.units, header: head, rows: units, columns: [
            { key: 'channel', label: X.channel, value: function (u) { var ch = channel(u.channelId); return ch ? ch.name : u.channelId; }, width: 10 },
            { key: 'code', label: X.code, width: 14 }, { key: 'name', label: X.name, width: 30 },
            { key: 'gp', label: X.gp, type: 'pct', value: function (u) { return u.hasGP && u.gp != null ? u.gp : ''; }, width: 12 },
            { key: 'status', label: X.status, value: function (u) { return u.active ? page.status.active : page.status.inactive; }, width: 12 },
            { key: 'owner', label: fill(X.owner, { month: F.date(month) }), value: function (u) { return u.active ? ownerName(d, u.id, month) : ''; }, width: 22 },
            { key: 'customers', label: X.customers, value: function (u) { return inUnit[u.id] || 0; }, width: 10 },
            { key: 'ref', label: X.ref, type: 'money', value: function (u) { return refUnit[u.id] || 0; }, width: 16 },
            { key: 'suggest', label: X.suggest, value: function (u) { return (u.suggest || []).join(', '); }, width: 30 },
            { key: 'note', label: X.note, value: function (u) { return u.note || ''; }, width: 24 }] },
          { name: page.exportSheets.history, header: head, rows: hist, columns: [
            { key: 'trcloudId', label: page.columns.trcloudId, value: function (a) { return model.byId[a.customerId].trcloudId; }, width: 12 },
            { key: 'name', label: page.columns.name, value: function (a) { return model.byId[a.customerId].name; }, width: 36 },
            { key: 'unitCode', label: X.unitCode, value: function (a) { var u = model.unitById[a.salesUnitId]; return u ? u.code : a.salesUnitId; }, width: 14 },
            { key: 'unitName', label: X.unitName, value: function (a) { return unitName(a.salesUnitId); }, width: 30 },
            { key: 'fromMonth', label: X.fromMonth, value: function (a) { return F.date(a.fromMonth); }, width: 12 },
            { key: 'toMonth', label: X.toMonth, value: function (a) { return a.toMonth ? F.date(a.toMonth) : X.open; }, width: 12 }] }
        ]
      };
      model = keep;
      return spec;
    }

    draw();
  }

  SP.modules.salesUnits = { render: render };
})(window.SP);

/*
 * modules/people/people.js — Account Master · Sales Person Management (CR-29 บุคลากรและทีม · CR-32 เปลี่ยนชื่อ · ไม่มีคำอธิบายใต้หัวข้อ)
 *
 * CR-32: แถว 1 = แท็บ · ค้นหา · Channel · บทบาท · สถานะ (ค่าเริ่มต้น ใช้งาน) · ข้อมูลที่ต้องตรวจ (components.dataCheck · units.personChecks
 *   เดือนปัจจุบัน – สุดแผน ตัวเลขเดียวกันทั้ง 2 แท็บ) · + เพิ่มบุคลากร (แก้ไข) / แถว 2 = จัดกลุ่มตาม Channel (ค่าเริ่มต้นไม่ติ๊ก)
 *   ตาราง: ชื่อ (ป้าย ทีม) · ทีม (Chip · สิ้นสุดแล้ว = ขีดฆ่า) · ดูแลอยู่ (Chip ≤ 3 + n · Tooltip ทั้งหมด) · บัญชีผู้ใช้ · สถานะ
 *   ไม่จัดกลุ่ม = เรียง Channel → Sales Manager ก่อน Sales Officer → ชื่อ · จัดกลุ่ม = หัวกลุ่ม Badge + ชื่อ Channel เต็ม (พับได้ · ไม่มีตัวนับ)
 *   บัญชีผู้ใช้ = person.userId (1:1 · บุคคลเท่านั้น) เลือกผู้ใช้ที่ยังไม่ผูก หรือ สร้างบัญชีผู้ใช้ด้วย (บทบาทตั้งต้นตามบทบาทในทีม) → master.users
 *
 * หน้าที่:        แท็บ รายชื่อและทีม | ผู้รับผิดชอบรายเดือน (จำที่ ui.peopleTab · #list / #monthly / #person-<id> เปิดแท็บ / Drawer ของคน)
 *   รายชื่อและทีม: ชื่อ (+ ไอคอนทีม) · ทีม (Chip Channel · บทบาท + Tooltip ช่วงเวลา) · ดูแลอยู่ ณ เดือนปัจจุบัน (≤ 3 + อีก n) · สถานะ (จากช่วงเวลา)
 *                  ตัวกรอง Channel · บทบาทในทีม · สถานะ · ค้นหา · จัดกลุ่มตาม Channel (ui.peopleGroupByChannel · หัวกลุ่ม Manager / Officer / หน่วยขาย ·
 *                  ⚠ ไม่มี Sales Manager · พับได้ · ทุก Channel ท้ายสุด) · ข้อมูลที่ต้องตรวจ (n) · + เพิ่มบุคลากร (แก้ไข)
 *   ผู้รับผิดชอบรายเดือน: หน่วยขายที่ใช้งาน × 12 เดือน จัดกลุ่มตาม Channel + ตัวเลือกปี · ว่าง = ลายเส้นแดงจาง · แก้ไข: คลิกช่วงเดือน → คนหรือทีม
 *                  (calc.setOwner ห้ามแก้เดือนที่ผ่านไปแล้ว) · ตัวกรอง Channel · คน
 *                  CR-32: ปุ่มปีถึงปีสุดแผน (clock.horizonYears) · ตามหน่วยขาย | ตามบุคคล · เลือกบุคคล = ไฮไลต์ (ช่องของคนอื่นจาง 35% · แถวยังอยู่) ·
 *                  กล่องถามการแทนที่ (calc.ownerReplace: แทนที่ช่วงที่เหลือถึงสุดแผน / เฉพาะช่วงที่เลือก · สิ้นสุดในหน่วยขายอื่นด้วย = master.endResponsibility) ·
 *                  มุมมองตามบุคคล (อ่านอย่างเดียว) = calc.personMonthlyLoad × report.unitMonthlyValues (ปีแผน = เป้าหมายรายเดือน · ปีปัจจุบัน = ยอดจริง)
 *   Drawer ของคน: ข้อมูล (ชื่อ · ประเภท · ทีมตามช่วงเวลา + เพิ่ม / สิ้นสุดสมาชิก · หน่วยขายที่ดูแล · ผลงาน YTD 1 บรรทัด + ลิงก์ Plan Summary ·
 *                  สิ้นสุดการรับผิดชอบ (ทำจบใน Drawer: เดือนสุดท้าย → หน่วยขาย → ผู้รับช่วง → สรุป · core/master.js endResponsibility) ·
 *                  ยกเลิกการสิ้นสุด) | ประวัติการเปลี่ยนแปลง (master.audit)
 *   เดือนปัจจุบัน = SP.core.clock (ไม่มีตัวเลือกเดือนจำลอง) · ไม่เก็บข้อมูลการจ้างงาน (สถานะคำนวณจากช่วงทีมและหน่วยขาย)
 * อ่านจาก data/:  channels, content (pages.people, labels) + Master ผ่าน store.data() · ผลงานจาก core/report.js (เป้าหมายรายเดือน) และ history (Actual ปีปัจจุบัน)
 * store อ่าน:     master.salespeople, master.teams, master.assignments, master.accounts, master.territories, master.users, master.audit, ui.peopleTab, ui.peopleGroupByChannel
 * store เขียน:    master.salespeople, master.teams, master.assignments, master.users (CR-32 บัญชีผู้ใช้), master.audit (ตอนกด บันทึก), ui.peopleTab, ui.peopleGroupByChannel
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var M = SP.core.master;
  var P = SP.core.permissions;
  var U = SP.core.units;
  var h = C.h;
  var fill = C.fill;

  var TABS = ['list', 'monthly'];

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function thai(a, b) { return String(a).localeCompare(String(b), 'th'); }
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var now = SP.core.clock.currentMonth();
    var saved = { people: store.get('master.salespeople'), teams: P.teamsNow(), assignments: store.get('master.assignments'), users: P.usersNow() };
    var horizon = SP.core.clock.horizonEnd();
    var draft = clone(saved);
    var editing = false;
    var hash = /^#(list|monthly|person-(.+))$/.exec(location.hash);
    var tab = hash && hash[1] === 'monthly' ? 'monthly' : hash ? 'list' : store.get('ui.peopleTab');
    if (TABS.indexOf(tab) < 0) tab = 'list';
    var filters = { q: '', channel: '', role: '', status: 'active' };
    // CR-32: view = 'unit' (ตามหน่วยขาย) | 'person' (ตามบุคคล) · CR-35 ปีเริ่มต้น = ปีของเดือนสุดแผน (PLAN_HORIZON_END)
    var monthly = { channel: '', person: '', year: Number(SP.core.clock.horizonEnd().slice(0, 4)), view: 'unit' };
    function canEditPage() { return SP.core.permissions.can(SP.core.permissions.user(), 'people'); }
    var ops = [];                 // CR-32: การยืนยันกล่องแทนที่ 1 ครั้ง = 1 รายการที่ยังไม่บันทึก (Key ของสิ่งที่เปลี่ยนในครั้งนั้น)
    var collapsed = {};
    var sel = null;               // ผู้รับผิดชอบรายเดือน: { unitId, from, to } (index เดือน)
    var message = null;
    var drawerId = null, drawerTab = 'info', endFlow = null;

    function cur() { return editing ? draft : saved; }
    function dataOf(c) { var d = store.data(); d.salespeople = c.people; d.assignments = c.assignments; d.teams = c.teams; d.users = c.users; return d; }
    function userOf(c, p) { return p && p.userId ? calc.findById(c.users, p.userId) : null; }
    // ค่าที่ core/master.js คืน (people · teams · assignments) + ผู้ใช้ใน draft เดิม
    function adopt(st) { if (!st.users) st.users = draft.users; draft = st; }
    function channels() { return SP.data.channels.slice().sort(byOrder); }
    function channel(id) { return calc.findById(SP.data.channels, id); }
    function person(c, id) { return calc.findById(c.people, id); }
    function unitName(d, id) { var i = calc.unitInfo(d, id); return i ? i.unit.name : id; }
    function groupBy() { return store.get('ui.peopleGroupByChannel') === true; }   // CR-32: ค่าเริ่มต้นไม่จัดกลุ่ม
    function monthOptions(from, n) { var out = []; for (var i = 0; i < (n || 24); i++) { var k = calc.addMonths(from, i); out.push({ value: k, label: F.date(k) }); } return out; }
    function period(from, to) { return to ? fill(page.drawer.period, { from: F.date(from), to: F.date(to) }) : fill(page.drawer.since, { from: F.date(from) }); }

    // ---------- รายการที่ยังไม่บันทึก ----------
    // รายการที่ยังไม่บันทึก: 1 ต่อบุคลากร / ทีมของคน / หน่วยขายที่ผู้รับผิดชอบเปลี่ยน / ผู้ใช้ใหม่ · CR-32 สิ่งที่เปลี่ยนจากกล่องแทนที่ 1 ครั้งนับรวมเป็น 1
    function changedKeys() {
      var keys = {};
      draft.people.forEach(function (p) { var o = person(saved, p.id); if (!o || !same(o, p)) keys['p:' + p.id] = true; });
      saved.people.forEach(function (o) { if (!person(draft, o.id)) keys['p:' + o.id] = true; });
      M.auditTeams(saved.teams, draft.teams).forEach(function (e) { keys['t:' + e.key] = true; });
      M.auditAssignments(saved.assignments, draft.assignments).forEach(function (e) { keys['u:' + e.key] = true; });
      draft.users.forEach(function (u) { if (!calc.findById(saved.users, u.id)) keys['n:' + u.id] = true; });
      return keys;
    }
    function dirty() {
      if (!editing) return 0;
      var keys = changedKeys(), covered = {}, n = 0;
      ops.forEach(function (op) { if (op.some(function (k) { return keys[k]; })) { n++; op.forEach(function (k) { covered[k] = true; }); } });
      Object.keys(keys).forEach(function (k) { if (!covered[k]) n++; });
      return n;
    }
    C.guardUnsaved(dirty);

    var exportBtn = C.exportButton({ unsaved: dirty, build: exportSpec });
    var bar = C.workflowBar({
      simple: true, extra: exportBtn,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); ops = []; sel = null; message = null; endFlow = null; draw(); redrawDrawer(); },
      onSave: save,
      onCancel: function () { editing = false; draft = clone(saved); ops = []; sel = null; message = null; endFlow = null; draw(); redrawDrawer(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function save() {
      var meta = { by: C.roleName(store.role()), at: new Date().toISOString() };
      var strip = function (list) { return list.map(function (p) { var c = clone(p); delete c.endUndo; return c; }); };
      var entries = M.auditDiff('person', strip(saved.people), strip(draft.people), ['name', 'type', 'endMonth', 'channelId', 'userId'], meta)
        .concat(M.auditTeams(saved.teams, draft.teams, meta)).concat(M.auditAssignments(saved.assignments, draft.assignments, meta))
        .concat(draft.users.filter(function (u) { return !calc.findById(saved.users, u.id); }).map(function (u) {
          return { entity: 'user', key: u.name, field: 'create', oldValue: null, newValue: (u.roleIds || []).join(', '), by: meta.by, at: meta.at };
        }));
      if (!same(saved.people, draft.people)) store.set('master.salespeople', draft.people);
      if (!same(saved.users, draft.users)) store.set('master.users', draft.users);
      if (!same(saved.teams, draft.teams)) store.set('master.teams', draft.teams);
      if (!same(saved.assignments, draft.assignments)) store.set('master.assignments', draft.assignments);
      store.appendAudit(entries);
      saved = clone(draft);
      editing = false; sel = null; endFlow = null; message = null; ops = [];
      draw();
      redrawDrawer();
    }

    // CR-35: ยกเลิกการเลือกเดือน (Esc · คลิกนอกตารางและแถบกำหนดผู้รับผิดชอบ · ไม่นับกล่องถาม / Popover)
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && editing && sel && !document.querySelector('dialog[open]')) { sel = null; message = null; draw(); } });
    document.addEventListener('mousedown', function (e) {
      if (!editing || !sel || !e.target.closest) return;
      if (e.target.closest('.tl-table, .sp-assign, dialog, .popover, .edit-banner, .wf-bar')) return;
      sel = null; message = null; draw();
    });

    // =====================================================================
    function draw() {
      C.clear(root);
      bar.update();
      var c = cur();
      var d = dataOf(c);
      var tabCtl = C.segmented({ label: page.tabLabel, value: tab, options: TABS.map(function (t) { return { value: t, label: page.tabs[t] }; }),
        onChange: function (v) { tab = v; store.set('ui.peopleTab', v); sel = null; draw(); } });
      root.appendChild(h('div', { class: 'tool-row pp-toolbar' }, tabCtl, tab === 'list' ? listFilters() : monthlyFilters(c), checksChip(c, d),
        h('span', { class: 'pp-tools-end' }, editing && tab === 'list' ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm pp-add', onClick: function () { addDialog(); } }, page.add) : null)));
      if (tab === 'list') root.appendChild(h('div', { class: 'tool-row pp-toolbar-2' },
        h('label', { class: 'pp-group-toggle' }, h('input', { type: 'checkbox', checked: groupBy(), onChange: function (e) { store.set('ui.peopleGroupByChannel', e.target.checked); draw(); } }), page.groupBy)));
      if (editing) {
        // CR-35: ต่อท้ายแถบโหมดแก้ไขด้วยวิธีแก้ไขของแท็บ / มุมมอง (ตามบุคคล = ดูอย่างเดียว + ปุ่มสลับเป็นตามหน่วยขาย)
        var Mo = page.monthly;
        var suffix = tab === 'list' ? page.listEditHint : monthly.view === 'unit' ? Mo.hint
          : h('span', null, ' · ' + Mo.byPerson.readOnly + ' ', h('button', { type: 'button', class: 'link-btn pp-switch-unit', onClick: function () { monthly.view = 'unit'; sel = null; draw(); } }, Mo.byPerson.switchUnit));
        var banner = C.editBanner({ suffix: suffix });
        root.appendChild(banner);
        banner.update(dirty());
      }
      if (message) root.appendChild(h('p', { class: 'pm-msg is-error', role: 'alert' }, message));
      root.appendChild(tab === 'list' ? listCard(c, d) : monthlyCard(c, d));
    }

    function listFilters() {
      var X = page.filters;
      var search = h('input', { type: 'search', class: 'search-input pp-search', placeholder: page.search, 'aria-label': page.search, value: filters.q });
      var timer = null;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { filters.q = search.value; var pos = search.selectionStart; draw(); var n = root.querySelector('.pp-search'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } }, 200);
      });
      return [search,
        C.select({ label: X.channel, value: filters.channel, className: 'pp-f-channel', options: [{ value: '', label: X.channelAll }].concat(channels().map(function (ch) { return { value: ch.id, label: ch.name }; })),
          onChange: function (v) { filters.channel = v; draw(); } }),
        C.select({ label: X.role, value: filters.role, className: 'pp-f-role', options: [{ value: '', label: X.roleAll }].concat(['MANAGER', 'OFFICER'].map(function (r) { return { value: r, label: page.roles[r] }; })),
          onChange: function (v) { filters.role = v; draw(); } }),
        C.select({ label: X.status, value: filters.status, className: 'pp-f-status', options: ['active', 'ended', 'all'].map(function (v) { return { value: v, label: X.status + ': ' + page.statusOptions[v] }; }),
          onChange: function (v) { filters.status = v; draw(); } })];
    }
    // CR-35: ตัวเลือกปี ‹ 2027 ▾ › (components.yearPicker · ปีแรก = ปีเก่าสุดที่มีข้อมูลผู้รับผิดชอบ · ปีสุดท้าย = ปีของ PLAN_HORIZON_END) · ตามหน่วยขาย | ตามบุคคล · Channel · บุคคล
    function monthlyFilters(c) {
      var X = page.filters, Mo = page.monthly;
      var YP = SP.data.content.labels.yearPicker;
      var years = calc.ownerYears(c.assignments);
      if (years.indexOf(monthly.year) < 0) monthly.year = years[years.length - 1];
      return [
        C.yearPicker({ label: Mo.year, years: years, value: monthly.year, tagOf: function (y) { return YP[calc.yearKind(y)]; }, onChange: function (v) { monthly.year = v; sel = null; draw(); } }),
        C.segmented({ label: Mo.viewLabel, value: monthly.view, options: ['unit', 'person'].map(function (v) { return { value: v, label: Mo.views[v] }; }), onChange: function (v) { monthly.view = v; sel = null; draw(); } }),
        C.select({ label: X.channel, value: monthly.channel, className: 'pp-m-channel', options: [{ value: '', label: X.channelAll }].concat(channels().filter(function (ch) { return ch.active !== false; }).map(function (ch) { return { value: ch.id, label: ch.name }; })),
          onChange: function (v) { monthly.channel = v; sel = null; draw(); } }),
        C.select({ label: X.person, value: monthly.person, className: 'pp-m-person', options: [{ value: '', label: X.personAll }].concat(c.people.slice().sort(function (a, b) { return thai(a.name, b.name); }).map(function (p) { return { value: p.id, label: p.name }; })),
          onChange: function (v) { monthly.person = v; sel = null; draw(); } })];
    }

    // CR-32: ข้อมูลที่ต้องตรวจ (units.personChecks · เดือนปัจจุบัน – สุดแผน) · ไปที่รายการ = เลือกแท็บ · กรอง · เลื่อน · ไฮไลต์ 2 วินาที
    function checksChip(c, d) {
      var X = page.checks;
      var k = U.personChecks(d, now, horizon);
      function goUnit(x) {
        tab = 'monthly'; store.set('ui.peopleTab', tab);
        monthly.channel = ''; monthly.person = ''; monthly.year = Number(String(x.from).slice(0, 4)); sel = null;
        draw();
        C.flashRow(root.querySelector('tr[data-unit="' + CSS.escape(x.id) + '"]'));
      }
      function goPerson(x) {
        tab = 'list'; store.set('ui.peopleTab', tab);
        filters = { q: '', channel: '', role: '', status: 'all' };
        draw();
        C.flashRow(root.querySelector('tr[data-person="' + CSS.escape(x.id) + '"]'));
      }
      var groups = k.groups.map(function (g) {
        return { key: g.key, label: X.types[g.key], items: g.items.map(function (x) {
          var ch = x.channelId ? channel(x.channelId) : null;
          var text = g.key === 'vacant' ? fill(X.vacantItem, { channel: ch ? ch.name : '', unit: unitName(d, x.id), from: F.date(x.from), to: F.date(x.to) })
            : g.key === 'handover' ? fill(X.handoverItem, { channel: ch ? ch.name : '', unit: unitName(d, x.id), name: C.personName(c.people, x.personId), month: F.date(calc.addMonths(x.from, -1)) })
            : g.key === 'endedUser' ? fill(X.endedUserItem, { name: C.personName(c.people, x.id), user: (calc.findById(c.users, x.userId) || {}).name || x.userId })
            : fill(X.personItem, { name: C.personName(c.people, x.id) });
          return { text: text, go: function () { if (x.kind === 'unit') goUnit(x); else goPerson(x); } };
        }) };
      });
      return C.dataCheck({ title: fill(X.title, { from: F.date(now), to: F.date(horizon) }), groups: groups,
        criteria: ['vacant', 'handover', 'idleOfficer', 'endedUser'].map(function (key) { return X.types[key]; }) });
    }

    // =====================================================================
    // แท็บรายชื่อและทีม
    // =====================================================================
    function stateOf(c, p) { return M.personState(p, c, now); }
    function passes(c, p) {
      var s = stateOf(c, p);
      if (filters.q.trim() && String(p.name).toLowerCase().indexOf(filters.q.trim().toLowerCase()) < 0) return false;
      if (filters.status === 'active' && s.status === 'ended') return false;
      if (filters.status === 'ended' && s.status !== 'ended') return false;
      if (filters.channel && !s.memberships.some(function (m) { return m.channelId === filters.channel; }) && p.channelId !== filters.channel) return false;
      if (filters.role && !s.memberships.some(function (m) { return m.role === filters.role && (!filters.channel || m.channelId === filters.channel); })) return false;
      return true;
    }
    function statusCell(c, p) {
      var s = stateOf(c, p);
      var S = page.status;
      // CR-32: สถานะค่าเดียว ใช้งาน · จะสิ้นสุด <เดือน> · สิ้นสุด <เดือน>
      if (s.status === 'ending') return h('span', { class: 'badge tag-warn pp-ending' }, fill(page.endingTag, { month: F.date(s.end) }));
      return s.status === 'ended' ? h('span', { class: 'badge tag-muted' }, fill(S.ended, { month: F.date(s.end) }))
        : s.status === 'none' ? h('span', { class: 'badge tag-warn' }, S.none) : h('span', { class: 'badge tag-ok' }, S.active);
    }
    function teamChips(c, p) {
      var s = stateOf(c, p);
      var gone = s.status === 'ended';
      return s.memberships.map(function (m) {
        var ch = channel(m.channelId);
        var ended = gone || (m.toMonth && m.toMonth < now);
        return h('span', { class: 'pp-team-chip' + (ended ? ' is-ended' : ''), style: ch ? { '--c': C.tokenVar(calc.channelColor(ch)) } : null,
          title: fill(page.teamTip, { channel: ch ? ch.fullName : m.channelId, role: page.roles[m.role] || m.role, period: period(m.fromMonth, m.toMonth) }) },
          fill(page.teamChip, { channel: ch ? ch.name : m.channelId, role: page.roles[m.role] || m.role }));
      });
    }
    function unitsCell(c, d, p) {
      var ids = M.unitsAt(c.assignments, p.id, now);
      if (!ids.length) return h('span', { class: 'muted' }, page.noUnits);
      var names = ids.map(function (u) { return unitName(d, u); }).sort(thai);
      var shortOf = function (n) { return String(n).split(' · ')[0]; };
      return h('span', { class: 'pp-unit-chips', title: names.join('\n') }, names.slice(0, 3).map(function (n) { return h('span', { class: 'pp-unit-chip' }, shortOf(n)); }),
        names.length > 3 ? h('span', { class: 'pp-unit-more' }, fill(page.moreUnits, { n: names.length - 3 })) : null);
    }
    function accountCell(c, p) {
      var u = userOf(c, p);
      if (!u) return h('span', { class: 'muted' }, page.account.none);
      return h('span', { class: u.active === false ? 'muted' : null }, u.name, u.active === false ? ' ' + page.account.inactive : '');
    }
    // CR-32: เรียงแบบไม่จัดกลุ่ม: Channel (ลำดับ Channel Master · ทุก Channel ท้ายสุด) → Sales Manager ก่อน Sales Officer → ชื่อ
    function sortKey(c, p) {
      var order = channels().map(function (ch) { return ch.id; });
      var mem = stateOf(c, p).memberships;
      var live = mem.filter(function (m) { return m.toMonth == null || m.toMonth >= now; });
      var list = (live.length ? live : mem).slice().sort(function (a, b) { return order.indexOf(a.channelId) - order.indexOf(b.channelId); });
      var chId = list.length ? list[0].channelId : p.channelId || null;
      var ci = chId ? order.indexOf(chId) : order.length;
      var ri = list.some(function (m) { return m.channelId === chId && m.role === 'MANAGER'; }) ? 0 : 1;
      return [ci < 0 ? order.length : ci, ri];
    }
    function byKey(c) {
      return function (a, b) { var x = sortKey(c, a), y = sortKey(c, b); return x[0] - y[0] || x[1] - y[1] || thai(a.name, b.name); };
    }
    function personRow(c, d, p) {
      var team = M.personType(p) === 'team';
      var original = person(saved, p.id);
      // CR-35: โหมดแก้ไข = ทั้งแถวคลิกได้ (Hover · Cursor มือ) + ปุ่ม แก้ไข ขวาสุด · โหมดดู = ชื่อเป็นลิงก์ดูรายละเอียด (ไม่มี Hover)
      var tr = h('tr', { class: 'pp-row' + (editing ? ' is-editable' : '') + (stateOf(c, p).status === 'ended' ? ' is-inactive' : '') + (drawerId === p.id ? ' is-selected' : '') + (editing && (!original || !same(original, p)) ? ' is-dirty-row' : ''), dataset: { person: p.id } },
        h('th', { scope: 'row' }, h('span', { class: 'pp-name' },
          team ? h('span', { class: 'pp-team-icon', title: page.teamIcon, 'aria-label': page.teamIcon }, page.teamBadge) : h('span', { class: 'sp-person-dot', style: { '--seg': C.tokenVar(C.personColor(c.people, p.id)) } }),
          editing ? h('strong', null, p.name) : h('button', { type: 'button', class: 'link-btn pp-name-link', title: fill(page.openTip, { name: p.name }), onClick: function () { openDrawer(p.id); } }, h('strong', null, p.name)))),
        h('td', null, h('span', { class: 'pp-teams' }, teamChips(c, p))),
        h('td', { class: 'pp-units' }, unitsCell(c, d, p)),
        h('td', { class: 'pp-account' }, accountCell(c, p)),
        h('td', { class: 'pp-status' }, statusCell(c, p)),
        editing ? h('td', { class: 'pp-edit-cell' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm pp-row-edit', title: fill(page.rowEditTip, { name: p.name }), onClick: function (e) { e.stopPropagation(); openDrawer(p.id); } }, page.rowEdit)) : null);
      if (editing) tr.addEventListener('click', function (e) { if (e.target.closest('a, button, input')) return; openDrawer(p.id); });
      return tr;
    }
    function listCard(c, d) {
      var Cl = page.columns;
      var cols = editing ? '6' : '5';
      var head = h('tr', null, h('th', { scope: 'col' }, Cl.name), h('th', { scope: 'col' }, Cl.teams), h('th', { scope: 'col' }, fill(Cl.units, { month: F.date(now) })),
        h('th', { scope: 'col' }, Cl.account), h('th', { scope: 'col' }, Cl.status), editing ? h('th', { scope: 'col', class: 'pp-edit-cell', 'aria-label': page.rowEdit }) : null);
      var body = h('tbody');
      var people = c.people.filter(function (p) { return passes(c, p); });
      if (groupBy()) {
        M.teamGroups(c, SP.data.channels, d, now).forEach(function (g) {
          var list = g.people.map(function (id) { return person(c, id); }).filter(function (p) { return p && people.indexOf(p) >= 0; }).sort(byKey(c));
          if (!list.length && (g.channelId === null || filters.channel)) return;
          var key = g.channelId || '_all';
          var ch = g.channelId ? channel(g.channelId) : null;
          var G = page.group;
          var open = !collapsed[key];
          // CR-32: หัวกลุ่ม = Badge + ชื่อ Channel เต็ม (ไม่มีตัวนับ) · พับได้
          var headRow = h('tr', { class: 'pp-group', style: ch ? { '--c': C.tokenVar(calc.channelColor(ch)) } : null, dataset: { group: key } },
            h('th', { colspan: cols, scope: 'rowgroup' }, h('button', { type: 'button', class: 'pp-group-btn', 'aria-expanded': open ? 'true' : 'false', onClick: function () { collapsed[key] = open; draw(); } },
              h('span', { class: 'pp-caret', 'aria-hidden': 'true' }, open ? '▾' : '▸'),
              ch ? h('span', { class: 'ch-tag' }, ch.name) : null,
              h('strong', { class: 'pp-group-name' }, ch ? ch.fullName : G.allChannels))));
          body.appendChild(headRow);
          if (open) list.forEach(function (p) { body.appendChild(personRow(c, d, p)); });
        });
      } else {
        people.slice().sort(byKey(c)).forEach(function (p) { body.appendChild(personRow(c, d, p)); });
      }
      if (!body.children.length) body.appendChild(h('tr', null, h('td', { colspan: cols, class: 'master-empty' }, page.monthly.empty)));
      return h('div', { class: 'card fit-card master-card pp-card' }, h('div', { class: 'fit-scroll table-scroll' }, h('table', { class: 'data-table master-table pp-table' + (editing ? ' is-editing' : '') }, h('thead', null, head), body)));
    }

    // =====================================================================
    // แท็บผู้รับผิดชอบรายเดือน
    // =====================================================================
    // หน่วยขายที่ใช้งาน จัดกลุ่มตาม Channel (CR-32: เลือกบุคคลแล้วยังแสดงทุกแถว · ใช้ไฮไลต์แทนการกรอง)
    function monthlyUnits(c, d) {
      return channels().filter(function (ch) { return ch.active !== false && (!monthly.channel || ch.id === monthly.channel); }).map(function (ch) {
        return { channel: ch, units: calc.unitsOfChannel(d, ch.id, true) };
      }).filter(function (g) { return g.units.length; });
    }
    function monthlyCard(c, d) { return monthly.view === 'person' ? personCard(c, d) : unitCard(c, d); }
    // CR-35: ขวาบน = สิ้นสุดแผน (โหมดแก้ไข · คำอธิบายย้ายไปแถบโหมดแก้ไข) · โหมดดู = กด แก้ไข เพื่อเปลี่ยนผู้รับผิดชอบ (เฉพาะผู้มีสิทธิ์แก้)
    function hintText(X) { var hz = fill(X.horizon, { month: F.date(horizon) }); return !editing && canEditPage() ? X.viewHint + ' · ' + hz : hz; }

    // ---------- มุมมองตามหน่วยขาย (ตารางเดิม · ช่องเดือนละ 1 ช่อง ช่องไฟเท่ากัน · ไฮไลต์รายบุคคล) ----------
    function unitCard(c, d) {
      var X = page.monthly;
      var year = monthly.year;
      var nowIdx = Number(now.slice(0, 4)) === year ? Number(now.slice(5, 7)) - 1 : Number(now.slice(0, 4)) > year ? 12 : -1;
      var focus = monthly.person || null;
      var head = h('tr', null, h('th', { class: 'tl-unit', scope: 'col' }, X.unit),
        F.MONTHS.map(function (m, i) { return h('th', { scope: 'col', class: 'tl-month' + (i < nowIdx ? ' is-past' : i === nowIdx ? ' is-current' : ''), title: i < nowIdx ? X.past : null }, m); }));
      var body = h('tbody');
      var groups = monthlyUnits(c, d);
      groups.forEach(function (g) {
        body.appendChild(h('tr', { class: 'tl-group', style: { '--c': C.tokenVar(calc.channelColor(g.channel)) } }, h('th', { colspan: '13', scope: 'rowgroup' }, g.channel.name + ' · ' + g.channel.fullName)));
        g.units.forEach(function (u) {
          var tr = h('tr', { class: 'tl-row', style: { '--c': C.tokenVar(calc.channelColor(g.channel)) }, dataset: { unit: u.id } }, h('th', { class: 'tl-unit', scope: 'row', title: C.ownerInfo(d, u.id, now).title }, u.name));
          var months = calc.ownerMonths(d.assignments, d.salespeople, u.id, year);
          months.forEach(function (o, m) {
            var picked = editing && sel && sel.unitId === u.id && m >= Math.min(sel.from, sel.to) && m <= Math.max(sel.from, sel.to);
            var anchor = editing && sel && sel.pending && sel.unitId === u.id && m === sel.from;
            var name = o.state === 'owner' ? C.personName(d.salespeople, o.personId) : o.state === 'resigned' ? fill(X.ended, { name: C.personName(d.salespeople, o.assignedId) }) : X.none;
            var prev = m > 0 ? months[m - 1] : null;
            var startSeg = !prev || prev.personId !== o.personId || prev.state !== o.state;
            var past = m < nowIdx;
            var who = o.personId || o.assignedId || null;
            var mark = focus ? (who === focus ? ' is-focus' : ' is-dim') : '';
            var td = h('td', {
              class: 'owner-seg tl-cell is-' + o.state + (past ? ' is-past' : '') + (picked ? ' is-picked' : '') + (anchor ? ' is-anchor' : '') + (startSeg ? ' is-start' : '') + mark,
              style: o.state === 'owner' ? { '--seg': C.tokenVar(C.personColor(d.salespeople, o.personId)) } : null,
              dataset: { m: String(m) },
              title: (past ? X.past + ' · ' : '') + name + ' · ' + F.monthYear(m, year), tabindex: editing && !past ? '0' : null, role: editing && !past ? 'button' : null
            }, startSeg ? h('span', { class: 'owner-name' }, name) : null, anchor ? h('span', { class: 'tl-start-tag' }, X.startTag) : null);
            if (editing && !past) {
              // CR-35: คลิกแรก = เดือนเริ่ม (ค้างขอบ + ป้าย เริ่ม · ชี้เดือนอื่นในแถวเดียวกัน = ไฮไลต์ช่วง) · คลิกที่สอง = เดือนสุดท้าย
              var pick = function () {
                if (sel && sel.pending && sel.unitId === u.id) { sel.to = m; sel.pending = false; }
                else sel = { unitId: u.id, from: m, to: m, pending: true };
                message = null; draw();
              };
              td.addEventListener('click', pick);
              td.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
            }
            tr.appendChild(td);
          });
          body.appendChild(tr);
        });
      });
      if (!groups.length) body.appendChild(h('tr', null, h('td', { colspan: '13', class: 'master-empty' }, X.empty)));
      var pending = editing && sel && sel.pending;
      var table = h('table', { class: 'tl-table' + (editing ? ' is-editing' : '') + (focus ? ' has-focus' : '') + (pending ? ' is-picking' : ''), dataset: pending ? { pick: sel.unitId } : null }, h('thead', null, head), body);
      if (pending) {
        // ชี้เดือนอื่นในแถวเดียวกัน = ไฮไลต์ตั้งแต่เดือนแรกถึงเดือนที่ชี้ (ไม่วาดตารางใหม่)
        var row = body.querySelector('tr[data-unit="' + sel.unitId + '"]');
        row.classList.add('is-pick-row');
        var preview = function (to) {
          Array.prototype.forEach.call(row.querySelectorAll('td.tl-cell'), function (td) {
            var k = Number(td.dataset.m);
            td.classList.toggle('is-range', to != null && k >= Math.min(sel.from, to) && k <= Math.max(sel.from, to));
          });
        };
        row.addEventListener('mouseover', function (e) { var td = e.target.closest ? e.target.closest('td.tl-cell') : null; if (td && !td.classList.contains('is-past')) preview(Number(td.dataset.m)); });
        row.addEventListener('mouseleave', function () { preview(null); });
      }
      return h('section', { class: 'card fit-card pp-monthly' },
        h('div', { class: 'sp-card-head' }, h('h2', null, fill(X.title, { year: year })), h('span', { class: 'master-hint' }, hintText(X))),
        editing && sel ? assignBar(c, d) : null,
        h('div', { class: 'fit-scroll table-scroll' }, table));
    }

    // ---------- มุมมองตามบุคคล (อ่านอย่างเดียว · calc.personMonthlyLoad) ----------
    function personCard(c, d) {
      var X = page.monthly, B = X.byPerson;
      var year = monthly.year;
      var mv = SP.core.report.unitMonthlyValues(year);
      var load = calc.personMonthlyLoad(d, year, mv.values, { allOwners: true });   // CR-35: ผู้รับผิดชอบหน่วยขายที่ไม่มีเป้า (เช่น ทีม KAM กลาง) = แถว –
      var has = F.MONTHS.map(function (x, m) { return Object.keys(mv.values).some(function (k) { return mv.values[k] && mv.values[k][m] != null; }); });
      var title = mv.kind === 'actual' ? fill(B.actualTitle, { year: year }) : mv.allocated ? fill(B.targetTitle, { year: year }) : fill(B.notAllocated, { year: year });
      // CR-35: พันบาท จำนวนเต็ม (calc คืนบาท · แปลงที่หน้าจอ) · Tooltip = บาทเต็ม · แถวที่ทั้งปีเป็น 0 = – สีเทา
      function k(v) { return F.number(Math.round((v || 0) / 1000)); }
      function num(v, m, blankZero) {
        if (m != null && !has[m]) return '–';
        if (v == null || (blankZero && !v)) return '';
        return k(v);
      }
      function cells(months, total, blankZero, cls, who) {
        var zero = !(total > 0) && !(total < 0);
        return F.MONTHS.map(function (x, m) {
          var v = months[m];
          return h('td', { class: 'num ' + (cls || '') + (zero ? ' is-zero' : ''), title: v ? fill(B.cellTip, { name: who || '', month: F.monthYear(m, year), amount: F.baht(v) }) : null },
            zero ? '–' : num(v, m, blankZero));
        }).concat([h('td', { class: 'num pp-l-total ' + (cls || '') + (zero ? ' is-zero' : ''), title: total ? fill(B.cellTip, { name: who || '', month: String(year), amount: F.baht(total) }) : zero ? B.noTarget : null },
          has.some(Boolean) && !zero ? k(total || 0) : '–')]);
      }
      var head = h('tr', null, h('th', { scope: 'col', class: 'pp-l-name' }, B.person), F.MONTHS.map(function (m) { return h('th', { scope: 'col', class: 'num' }, m); }), h('th', { scope: 'col', class: 'num pp-l-total' }, B.yearTotal));
      var body = h('tbody');
      load.channels.forEach(function (g) {
        if (monthly.channel && g.channelId !== monthly.channel) return;
        var ch = channel(g.channelId);
        body.appendChild(h('tr', { class: 'pp-l-group', style: ch ? { '--c': C.tokenVar(calc.channelColor(ch)) } : null },
          h('th', { scope: 'rowgroup', class: 'pp-l-name' }, h('span', { class: 'ch-tag' }, ch ? ch.name : g.channelId), ' ', ch ? ch.fullName : ''), cells(g.total, g.yearTotal, false, 'is-strong', ch ? ch.name : g.channelId)));
        g.people.forEach(function (p) {
          if (monthly.person && p.personId !== monthly.person) return;
          var pp = person(c, p.personId);
          var team = pp && M.personType(pp) === 'team';
          body.appendChild(h('tr', { class: 'pp-l-person', dataset: { person: p.personId } },
            h('th', { scope: 'row', class: 'pp-l-name' }, team ? h('span', { class: 'pp-team-icon', title: page.teamIcon }, page.teamBadge) : null, ' ', pp ? pp.name : p.personId), cells(p.months, p.total, true, '', pp ? pp.name : p.personId)));
          p.units.forEach(function (u) {
            body.appendChild(h('tr', { class: 'pp-l-unit', dataset: { unit: u.unitId } }, h('th', { scope: 'row', class: 'pp-l-name is-sub' }, unitName(d, u.unitId)), cells(u.months, u.total, true, 'is-sub', unitName(d, u.unitId))));
          });
        });
        if (!monthly.person || g.vacant.total) {
          body.appendChild(h('tr', { class: 'pp-l-vacant' + (g.vacant.total > 0 ? ' has-value' : '') }, h('th', { scope: 'row', class: 'pp-l-name' }, B.vacant), cells(g.vacant.months, g.vacant.total, true, 'is-vacant', B.vacant)));
        }
      });
      return h('section', { class: 'card fit-card pp-monthly pp-load' },
        h('div', { class: 'sp-card-head' }, h('h2', null, title), h('span', { class: 'master-hint' }, fill(X.horizon, { month: F.date(horizon) }))),
        h('div', { class: 'fit-scroll table-scroll' }, h('table', { class: 'data-table pp-load-table' }, h('thead', null, head), body)));
    }

    // ---------- แก้ไข: เลือกช่วงเดือน → คนหรือทีม · กล่องถามการแทนที่ (ส่วนที่ 4.4) ----------
    function assignBar(c, d) {
      var X = page.monthly;
      var info = calc.unitInfo(d, sel.unitId);
      var year = monthly.year;
      var from = Math.min(sel.from, sel.to), to = Math.max(sel.from, sel.to);
      var list = calc.eligiblePeople(d.salespeople, info.channel.id, calc.monthKey(year, from));
      var who = C.select({ label: X.person, value: '', className: 'pp-assign-person', onChange: function () {},
        options: [{ value: '', label: X.vacant }].concat(list.map(function (p) { return { value: p.id, label: p.name + (M.personType(p) === 'team' ? ' (' + page.types.team + ')' : '') }; })) });
      return h('div', { class: 'sp-assign' },
        h('strong', null, fill(X.assignFor, { unit: info.unit.name, months: F.monthRange(from, to) + ' ' + year })),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, X.person), who),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm pp-assign-apply', onClick: function () { applyOwner(d, sel.unitId, who.value || null, calc.monthKey(year, from), calc.monthKey(year, to), to === 11); } }, X.apply),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { sel = null; draw(); } }, X.clear));
    }
    function applyOwner(d, unitId, pid, start, end, toDec) {
      var X = page.monthly;
      var plan = calc.ownerReplace(draft.assignments, unitId, pid, start, end, horizon);
      function done(list, extra) {
        draft.assignments = list;
        if (extra) extra();
        sel = null; message = null; draw(); redrawDrawer();
      }
      if (!plan.ask) {
        // เดิม: เลือกถึง ธ.ค. = รับผิดชอบต่อไป (ไม่กำหนดเดือนสุดท้าย)
        var res0 = calc.setOwner(draft.assignments, unitId, pid, start, toDec ? null : end, now);
        if (!res0.ok) { message = X.errors[res0.error] || X.errors.range; draw(); return; }
        ops.push(['u:' + unitId]);
        done(res0.list);
        return;
      }
      replaceDialog(d, unitId, pid, start, end, plan).then(function (r) {
        if (!r) return;
        var endAt = r.choice === 'rest' ? plan.replaceEnd : end;
        var res = calc.setOwner(draft.assignments, unitId, pid, start, endAt, now);
        if (!res.ok) { message = X.errors[res.error] || X.errors.range; draw(); return; }
        var keys = ['u:' + unitId];
        draft.assignments = res.list;
        if (r.choice === 'rest' && r.endOthers) {
          var last = calc.addMonths(start, -1);
          var handover = {};
          M.endPreview(draft, plan.current, last).forEach(function (x) { handover[x.unitId] = null; keys.push('u:' + x.unitId); });
          var st = M.endResponsibility({ people: draft.people, teams: draft.teams, assignments: draft.assignments }, plan.current, last, handover, now);
          if (st.ok) { adopt(st.state); keys.push('p:' + plan.current, 't:' + plan.current); }
        }
        ops.push(keys);
        done(draft.assignments);
      });
    }
    // กล่องถาม: {P} จะรับผิดชอบช่วงที่เลือก · {Q} ยังรับผิดชอบต่อหลังจากนั้น · ช่องติ๊กสิ้นสุดในหน่วยขายอื่น (ค่าเริ่มต้นไม่ติ๊ก · ใช้กับปุ่มหลักเท่านั้น)
    function replaceDialog(d, unitId, pid, start, end, plan) {
      var R = page.monthly.replace;
      var pName = C.personName(d.salespeople, pid), qName = C.personName(d.salespeople, plan.current);
      var range = start === end ? F.date(start) : F.date(start) + ' – ' + F.date(end);
      var q = person(draft, plan.current);
      var last = calc.addMonths(start, -1);
      var others = q && M.personType(q) !== 'team' && last >= now ? M.endPreview(draft, plan.current, last).filter(function (x) { return x.unitId !== unitId; }) : [];
      var box = others.length ? h('input', { type: 'checkbox', class: 'pp-replace-end', checked: false }) : null;
      var body = box ? h('label', { class: 'pp-replace-check' }, box, ' ', fill(R.endOthers, { name: qName, month: F.date(start), units: others.map(function (x) { return unitName(d, x.unitId); }).join(', ') })) : null;
      return C.choiceDialog({
        title: fill(R.title, { unit: unitName(d, unitId) }),
        lines: [fill(R.line1, { name: pName, range: range }), fill(R.line2, { name: qName, from: F.date(plan.after.from), to: F.date(plan.after.to) })],
        body: body, cancelLabel: R.cancel,
        choices: [{ value: 'rest', label: fill(R.rest, { name: pName }), primary: true }, { value: 'only', label: R.only }]
      }).then(function (v) { return v ? { choice: v, endOthers: !!(box && box.checked && v === 'rest') } : null; });
    }

    // =====================================================================
    // Drawer ของบุคลากร
    // =====================================================================
    var drawerCtl = C.drawer({ label: page.drawer.label, className: 'pp-drawer', onClose: function () { drawerId = null; endFlow = null; if (location.hash) history.replaceState(null, '', location.pathname + location.search); draw(); } });
    function openDrawer(id) { drawerId = id; drawerTab = 'info'; endFlow = null; redrawDrawer(); drawerCtl.open(); draw(); }
    function redrawDrawer() {
      if (!drawerId) return;
      var D = page.drawer;
      var c = cur();
      var d = dataOf(c);
      var p = person(c, drawerId);
      if (!p) { drawerCtl.close(); return; }
      C.clear(drawerCtl.head);
      C.clear(drawerCtl.body);
      var team = M.personType(p) === 'team';
      drawerCtl.head.appendChild(h('div', { class: 'am-d-head' },
        h('h2', { class: 'am-d-title' }, team ? h('span', { class: 'pp-team-icon', title: page.teamIcon }, page.teamBadge) : null, p.name),
        h('div', { class: 'am-d-meta' }, h('span', { class: 'badge tag-muted' }, page.types[M.personType(p)]), statusCell(c, p))));
      drawerCtl.body.appendChild(C.segmented({ label: D.label, value: drawerTab, options: ['info', 'history'].map(function (t) { return { value: t, label: D.tabs[t] }; }),
        onChange: function (v) { drawerTab = v; endFlow = null; redrawDrawer(); } }));
      drawerCtl.body.appendChild(drawerTab === 'history' ? historyTab(p) : endFlow ? endFlowBox(c, d, p) : infoTab(c, d, p));
    }
    function field(label, control) { return h('label', { class: 'am-field' }, h('span', { class: 'field-label' }, label), control); }
    function infoTab(c, d, p) {
      var D = page.drawer;
      var s = stateOf(c, p);
      var box = h('div', { class: 'am-d-info pp-d-info' });
      if (editing) {
        var name = h('input', { type: 'text', class: 'pm-input pp-in-name', value: p.name, 'aria-label': D.fields.name });
        name.addEventListener('change', function () { if (!name.value.trim()) { name.value = p.name; return; } person(draft, p.id).name = name.value.trim(); draw(); redrawDrawer(); });
        var type = C.select({ label: D.fields.type, value: M.personType(p), className: 'pp-in-type', options: ['person', 'team'].map(function (t) { return { value: t, label: page.types[t] }; }),
          onChange: function (v) { person(draft, p.id).type = v; draw(); redrawDrawer(); } });
        box.appendChild(h('div', { class: 'am-d-grid' }, field(D.fields.name, name), field(D.fields.type, type)));
      }
      // ทีม
      var mem = s.memberships;
      box.appendChild(h('section', { class: 'pp-d-sec' },
        h('div', { class: 'am-d-sec-head' }, h('h3', null, D.teamsTitle), editing && s.status !== 'ended' ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm pp-add-team', onClick: function () { addTeamDialog(p); } }, D.addTeam) : null),
        mem.length ? h('ul', { class: 'pp-d-list' }, mem.map(function (m) {
          var ch = channel(m.channelId);
          var live = m.toMonth == null || m.toMonth >= now;
          return h('li', { class: live ? null : 'is-ended' }, h('span', { class: 'ch-tag', style: ch ? { '--c': C.tokenVar(calc.channelColor(ch)) } : null }, ch ? ch.name : m.channelId),
            h('span', null, ' ' + (page.roles[m.role] || m.role) + ' · ' + period(m.fromMonth, m.toMonth)),
            editing && live ? h('button', { type: 'button', class: 'link-btn pp-end-member', onClick: function () { endTeamDialog(p, m); } }, D.endMember) : null);
        })) : h('p', { class: 'muted' }, D.teamsEmpty)));
      // CR-32: บัญชีผู้ใช้ (person.userId · 1:1 · บุคคลเท่านั้น)
      box.appendChild(accountSection(c, p));
      // หน่วยขายที่ดูแล
      var ranges = c.assignments.filter(function (a) { return a.salesPersonId === p.id; }).sort(function (a, b) { return a.fromMonth < b.fromMonth ? -1 : 1; });
      box.appendChild(h('section', { class: 'pp-d-sec' }, h('h3', null, D.unitsTitle),
        ranges.length ? h('ul', { class: 'pp-d-list' }, ranges.map(function (a) {
          var past = a.toMonth && a.toMonth < now;
          return h('li', { class: past ? 'is-ended' : null }, fill(D.unitLine, { unit: unitName(d, a.unitId), period: period(a.fromMonth, a.toMonth) }));
        })) : h('p', { class: 'muted' }, D.unitsEmpty)));
      // ผลงาน YTD
      box.appendChild(h('section', { class: 'pp-d-sec' }, h('h3', null, D.perfTitle), perfLine(c, d, p)));
      // สิ้นสุดการรับผิดชอบ
      if (editing) {
        var actions = h('div', { class: 'pp-d-actions' });
        if (s.status !== 'ended' && !p.endMonth) actions.appendChild(h('button', { type: 'button', class: 'btn btn-secondary btn-sm pp-end', onClick: function () { endFlow = { month: now, handover: {}, all: '' }; redrawDrawer(); } }, D.end));
        // นำออกได้เฉพาะบุคลากรที่ไม่มีประวัติทีมหรือผู้รับผิดชอบ นอกนั้นใช้สิ้นสุดการรับผิดชอบ
        var used = c.assignments.some(function (a) { return a.salesPersonId === p.id; }) || M.memberships(c.teams, p.id).length > 0;
        actions.appendChild(C.trashButton({ label: D.remove, disabled: used, disabledTitle: D.removeBlocked, confirmTitle: fill(D.removeConfirm, { name: p.name }),
          onConfirm: function () { draft.people = draft.people.filter(function (x) { return x.id !== p.id; }); drawerCtl.close(); draw(); } }));
        if (p.endMonth && p.endMonth >= now) actions.appendChild(h('button', { type: 'button', class: 'btn btn-ghost btn-sm pp-cancel-end', title: D.cancelEndTip, onClick: function () {
          var res = M.cancelEnd(draft, p.id, now);
          if (!res.ok) return;
          adopt(res.state); draw(); redrawDrawer();
        } }, D.cancelEnd));
        box.appendChild(actions);
      }
      if (p.endMonth) box.appendChild(h('p', { class: 'am-hint muted' }, fill(p.endMonth < now ? D.ended : D.ending, { month: F.date(p.endMonth) })));
      return box;
    }
    function accountSection(c, p) {
      var A = page.account;
      var u = userOf(c, p);
      var team = M.personType(p) === 'team';
      var usersPage = SP.core.registry.byId('roleUsers');
      var view = u ? [h('span', null, u.name, u.active === false ? ' ' + A.inactive : ''),
        usersPage && P.pageVisible(P.user(), 'roleUsers') ? h('a', { class: 'pp-account-link', href: SP.core.paths.to(usersPage.path) }, A.openUsers) : null] : h('span', { class: 'muted' }, team ? A.team : A.none);
      var sec = h('section', { class: 'pp-d-sec pp-d-account' }, h('div', { class: 'am-d-sec-head' }, h('h3', null, A.title)), h('p', { class: 'pp-account-line' }, view));
      if (!editing || team) return sec;
      var free = draft.users.filter(function (x) { return x.id === p.userId || !draft.people.some(function (q) { return q.userId === x.id; }); })
        .sort(function (a, b) { return thai(a.name, b.name); });
      var pick = C.select({ label: A.pick, value: p.userId || '', className: 'pp-account-pick',
        options: [{ value: '', label: A.pickNone }].concat(free.map(function (x) { return { value: x.id, label: x.name + (x.active === false ? ' ' + A.inactive : '') }; })),
        onChange: function (v) { var r = P.linkUser(draft.people, p.id, v || null); if (r.ok) { draft.people = r.people; draw(); redrawDrawer(); } } });
      sec.appendChild(h('div', { class: 'pp-account-edit' }, pick,
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm pp-account-create', onClick: function () { createUserDialog(p); } }, A.create)));
      return sec;
    }
    // สร้างบัญชีผู้ใช้ของบุคลากร (บทบาทตั้งต้นตามบทบาทในทีม · แก้ได้) → draft.users + person.userId
    function createUserDialog(p, err, prev) {
      var A = page.account;
      prev = prev || {};
      var name = h('input', { type: 'text', class: 'pm-input pp-user-name', value: prev.name != null ? prev.name : p.name, 'aria-label': A.userName });
      var email = h('input', { type: 'email', class: 'pm-input pp-user-email', value: prev.email || '', 'aria-label': A.email });
      var def = prev.roleIds || P.defaultRolesFor(draft.teams, p.id, now);
      var boxes = P.rolesNow().slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).map(function (r) {
        return h('label', { class: 'pr-check' }, h('input', { type: 'checkbox', value: r.id, checked: def.indexOf(r.id) >= 0, class: 'pp-user-role' }), h('span', null, r.name));
      });
      C.dialog({ title: fill(A.createTitle, { name: p.name }), confirmLabel: A.createConfirm, wide: true,
        body: h('div', { class: 'am-dlg' }, h('div', { class: 'am-dlg-fields' }, field(A.userName, name), field(A.email, email)),
          h('div', { class: 'am-field' }, h('span', { class: 'field-label' }, A.roles), h('span', { class: 'pp-role-boxes' }, boxes), h('span', { class: 'am-hint muted' }, A.rolesHint)),
          h('p', { class: 'am-hint muted' }, A.createNote), err ? h('p', { class: 'dlg-error', role: 'alert' }, err) : null) }).then(function (r) {
        if (!r.ok) return;
        var roleIds = boxes.map(function (l) { return l.querySelector('input'); }).filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
        var v = { name: name.value.trim(), email: email.value.trim(), roleIds: roleIds };
        if (!v.name) { createUserDialog(p, page.addDialog.errors.userName, v); return; }
        if (!roleIds.length) { createUserDialog(p, page.addDialog.errors.roles, v); return; }
        var id = 'u-' + Date.now().toString(36);
        var user = { id: id, name: v.name, roleIds: roleIds, active: true };
        if (v.email) user.email = v.email;
        var old = person(draft, p.id).userId;
        var people = draft.people;
        if (old) { var r0 = P.linkUser(people, p.id, null); if (r0.ok) people = r0.people; }
        var lr = P.linkUser(people, p.id, id);
        if (!lr.ok) { createUserDialog(p, page.addDialog.errors[lr.error] || lr.error, v); return; }
        draft.users = draft.users.concat([user]);
        draft.people = lr.people;
        draw(); redrawDrawer();
      });
    }

    // ผลงาน YTD 1 บรรทัด: ปีแผน (เป้าหมายจาก report · Actual ถึงเดือนปิดล่าสุด) · ปีแผนยังไม่เริ่ม = Actual ของปีปัจจุบัน
    function perfLine(c, d, p) {
      var D = page.drawer;
      var year = store.year();
      var K = SP.core.clock;
      var lc = K.lastClosedMonth();
      var upto = Number(lc.slice(0, 4)) === year ? Number(lc.slice(5, 7)) - 1 : Number(lc.slice(0, 4)) > year ? 11 : -1;
      var summary = SP.core.registry.byId('summary');
      var link = summary ? h('a', { href: SP.core.paths.to(summary.path), class: 'pp-perf-link', onClick: function () { store.set('ui.summaryTab', 'report'); } }, D.perfLink) : null;
      var text;
      if (upto >= 0 && SP.core.report) {
        var rep = SP.core.report.build();
        var targets = {}, actuals = {};
        rep.units.forEach(function (u) { targets[u.id] = u.targetM || u.targetMonthly || []; actuals[u.id] = calc.actualNetByUnit(d, store.master(), u.id, year, upto); });
        var t = calc.personYtd(c.assignments, c.people, p.id, year, targets, upto);
        var a = calc.personYtd(c.assignments, c.people, p.id, year, actuals, upto);
        text = fill(D.perf, { year: year, pct: t > 0 ? F.pct(a / t, 1) : '–' });
      } else {
        var ly = Number(lc.slice(0, 4));
        var hist = (d.history && d.history.years[ly] && d.history.years[ly].monthly) || {};
        var amount = calc.personYtd(c.assignments, c.people, p.id, ly, hist, Number(lc.slice(5, 7)) - 1);
        text = fill(D.perfNone, { year: year }) + ' · ' + fill(D.perfActual, { year: ly, month: F.date(lc), amount: F.millionPlain(amount || 0, 2) });
      }
      return h('p', { class: 'pp-perf' }, text, ' ', link);
    }

    // ---------- สิ้นสุดการรับผิดชอบ (ทำจบใน Drawer) ----------
    function endFlowBox(c, d, p) {
      var X = page.endFlow;
      var box = h('div', { class: 'pp-end-flow' }, h('h3', null, fill(X.title, { name: p.name })));
      var monthSel = C.select({ label: X.step1, value: endFlow.month, className: 'pp-end-month', options: monthOptions(now), onChange: function (v) { endFlow.month = v; redrawDrawer(); } });
      box.appendChild(field(X.step1, monthSel));
      var preview = M.endPreview(draft, p.id, endFlow.month);
      var nextKey = calc.addMonths(endFlow.month, 1);
      function candidates(unitId) {
        var info = calc.unitInfo(d, unitId);
        return calc.eligiblePeople(d.salespeople, info && info.channel ? info.channel.id : null, nextKey).filter(function (x) { return x.id !== p.id && !(x.endMonth && x.endMonth < nextKey); });
      }
      box.appendChild(h('h4', { class: 'pp-step' }, X.step2));
      if (!preview.length) box.appendChild(h('p', { class: 'muted' }, X.noUnits));
      else {
        var all = {};
        preview.forEach(function (r) { candidates(r.unitId).forEach(function (x) { all[x.id] = x; }); });
        var allList = Object.keys(all).map(function (k) { return all[k]; }).sort(function (a, b) { return thai(a.name, b.name); });
        var allSel = C.select({ label: X.giveAll, value: endFlow.all, className: 'pp-end-all', options: [{ value: '', label: '–' }].concat(allList.map(function (x) { return { value: x.id, label: x.name }; })), onChange: function (v) { endFlow.all = v; } });
        box.appendChild(h('div', { class: 'pp-end-all-row' }, h('span', null, X.giveAll), allSel, h('button', { type: 'button', class: 'btn btn-ghost btn-sm pp-end-all-apply', onClick: function () {
          preview.forEach(function (r) { if (!endFlow.all || candidates(r.unitId).some(function (x) { return x.id === endFlow.all; })) endFlow.handover[r.unitId] = endFlow.all || null; });
          redrawDrawer();
        } }, X.giveAllApply)));
        box.appendChild(h('h4', { class: 'pp-step' }, X.step3));
        box.appendChild(h('ul', { class: 'pp-end-units' }, preview.map(function (r) {
          var opts = [{ value: '', label: X.undecided }].concat(candidates(r.unitId).map(function (x) { return { value: x.id, label: x.name + (M.personType(x) === 'team' ? ' (' + page.types.team + ')' : '') }; }));
          return h('li', { dataset: { unit: r.unitId } }, h('span', { class: 'pp-end-unit' }, fill(X.unitRow, { unit: unitName(d, r.unitId), period: period(r.fromMonth, r.toMonth) })),
            C.select({ label: X.step3, value: endFlow.handover[r.unitId] || '', className: 'pp-end-to', options: opts, onChange: function (v) { endFlow.handover[r.unitId] = v || null; redrawDrawer(); } }));
        })));
      }
      // สรุป
      var mem = M.memberships(draft.teams, p.id).filter(function (m) { return m.toMonth == null || m.toMonth > endFlow.month; });
      var lines = [fill(X.summaryUnits, { n: preview.length })].concat(preview.map(function (r) {
        var to = endFlow.handover[r.unitId];
        return fill(X.summaryTo, { unit: unitName(d, r.unitId), to: to ? C.personName(d.salespeople, to) : X.undecided });
      })).concat([mem.length ? fill(X.summaryMembers, { list: mem.map(function (m) { var ch = channel(m.channelId); return (ch ? ch.name : m.channelId) + ' · ' + (page.roles[m.role] || m.role); }).join(', ') }) : X.summaryNoMembers, X.summaryNote]);
      box.appendChild(h('h4', { class: 'pp-step' }, X.step4));
      box.appendChild(h('ul', { class: 'dlg-lines pp-end-summary' }, lines.map(function (t) { return h('li', null, t); })));
      var err = endFlow.error ? h('p', { class: 'dlg-error', role: 'alert' }, X.errors[endFlow.error] || endFlow.error) : null;
      box.appendChild(h('div', { class: 'pp-d-actions' },
        h('button', { type: 'button', class: 'btn btn-primary btn-sm pp-end-confirm', onClick: function () {
          var res = M.endResponsibility(draft, p.id, endFlow.month, endFlow.handover, now);
          if (!res.ok) { endFlow.error = res.error; redrawDrawer(); return; }
          adopt(res.state); endFlow = null; draw(); redrawDrawer();
        } }, X.confirm),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { endFlow = null; redrawDrawer(); } }, X.cancel)), err);
      return box;
    }

    // ---------- ทีม: เพิ่ม / สิ้นสุดสมาชิก ----------
    function addTeamDialog(p, err) {
      var X = page.teamDialog;
      var chs = channels().filter(function (ch) { return ch.active !== false; });
      var ch = C.select({ label: X.channel, value: p.channelId || chs[0].id, className: 'pp-team-channel', options: chs.map(function (x) { return { value: x.id, label: x.name + ' · ' + x.fullName }; }), onChange: function () {} });
      var role = C.select({ label: X.role, value: 'OFFICER', className: 'pp-team-role', options: ['MANAGER', 'OFFICER'].map(function (r) { return { value: r, label: page.roles[r] }; }), onChange: function () {} });
      var from = C.select({ label: X.from, value: now, className: 'pp-team-from', options: monthOptions(now), onChange: function () {} });
      C.dialog({ title: fill(X.addTitle, { name: p.name }), confirmLabel: X.confirmAdd,
        body: h('div', { class: 'am-dlg' }, field(X.channel, ch), field(X.role, role), field(X.from, from), h('p', { class: 'am-hint muted' }, X.note), err ? h('p', { class: 'dlg-error', role: 'alert' }, err) : null) })
        .then(function (r) {
          if (!r.ok) return;
          var teams = M.addMembership(draft.teams, ch.value, { salesPersonId: p.id, role: role.value, fromMonth: from.value, toMonth: null });
          if (!teams) { addTeamDialog(p, X.clash); return; }
          draft.teams = teams;
          var x = person(draft, p.id);
          if (!x.channelId) x.channelId = ch.value;
          draw(); redrawDrawer();
        });
    }
    function endTeamDialog(p, m, err) {
      var X = page.teamDialog;
      var ch = channel(m.channelId);
      var start = calc.addMonths(now, -1) > m.fromMonth ? calc.addMonths(now, -1) : m.fromMonth;
      var to = C.select({ label: X.to, value: start, className: 'pp-team-to', options: monthOptions(start), onChange: function () {} });
      C.dialog({ title: fill(X.endTitle, { channel: ch ? ch.name : m.channelId, role: page.roles[m.role] || m.role }), confirmLabel: X.confirmEnd,
        body: h('div', { class: 'am-dlg' }, field(X.to, to), err ? h('p', { class: 'dlg-error', role: 'alert' }, err) : null) })
        .then(function (r) {
          if (!r.ok) return;
          var teams = M.endMembership(draft.teams, m.channelId, { salesPersonId: p.id, fromMonth: m.fromMonth }, to.value, now);
          if (!teams) { endTeamDialog(p, m, X.endError); return; }
          draft.teams = teams; draw(); redrawDrawer();
        });
    }
    // ---------- เพิ่มบุคลากร ----------
    function addDialog(err, prev) {
      var X = page.addDialog;
      prev = prev || {};
      var name = h('input', { type: 'text', class: 'pm-input pp-add-name', value: prev.name || '', 'aria-label': X.name });
      var type = C.select({ label: X.type, value: prev.type || 'person', className: 'pp-add-type', options: ['person', 'team'].map(function (t) { return { value: t, label: page.types[t] }; }), onChange: function () {} });
      var ch = C.select({ label: X.channel, value: prev.channelId || '', className: 'pp-add-channel',
        options: [{ value: '', label: X.noTeam }].concat(channels().filter(function (x) { return x.active !== false; }).map(function (x) { return { value: x.id, label: x.name + ' · ' + x.fullName }; })), onChange: function () {} });
      var role = C.select({ label: X.role, value: prev.role || 'OFFICER', className: 'pp-add-role', options: ['MANAGER', 'OFFICER'].map(function (r) { return { value: r, label: page.roles[r] }; }), onChange: function () {} });
      var from = C.select({ label: X.from, value: prev.fromMonth || now, className: 'pp-add-from', options: monthOptions(now), onChange: function () {} });
      // CR-32: บัญชีผู้ใช้ (บุคคลเท่านั้น): เลือกผู้ใช้ที่ยังไม่ผูก หรือ สร้างบัญชีผู้ใช้ด้วย (ชื่อผู้ใช้ · อีเมล · บทบาทตั้งต้นตามบทบาทในทีม)
      var A = page.account;
      var free = draft.users.filter(function (x) { return !draft.people.some(function (q) { return q.userId === x.id; }); }).sort(function (a, b) { return thai(a.name, b.name); });
      var pick = C.select({ label: A.pick, value: prev.userId || '', className: 'pp-add-user', options: [{ value: '', label: A.pickNone }].concat(free.map(function (x) { return { value: x.id, label: x.name }; })), onChange: function () {} });
      var createBox = h('input', { type: 'checkbox', class: 'pp-add-create', checked: !!prev.create });
      var uName = h('input', { type: 'text', class: 'pm-input pp-add-uname', value: prev.userName || '', 'aria-label': A.userName, placeholder: A.userName });
      var uEmail = h('input', { type: 'email', class: 'pm-input pp-add-email', value: prev.email || '', 'aria-label': A.email, placeholder: A.email });
      var createFields = h('div', { class: 'am-dlg-fields pp-add-create-fields', hidden: !prev.create }, field(A.userName, uName), field(A.email, uEmail), h('span', { class: 'am-hint muted' }, A.rolesHint));
      createBox.addEventListener('change', function () { createFields.hidden = !createBox.checked; pick.disabled = createBox.checked; });
      pick.disabled = !!prev.create;
      var accountRow = h('div', { class: 'pp-add-account' }, h('div', { class: 'am-dlg-fields' }, field(A.pick, pick), h('label', { class: 'pp-group-toggle' }, createBox, A.create)), createFields);
      C.dialog({ title: X.title, confirmLabel: X.confirm, wide: true,
        body: h('div', { class: 'am-dlg' }, h('div', { class: 'am-dlg-fields' }, field(X.name, name), field(X.type, type)), h('div', { class: 'am-dlg-fields' }, field(X.channel, ch), field(X.role, role), field(X.from, from)),
          accountRow, err ? h('p', { class: 'dlg-error', role: 'alert' }, err) : null) })
        .then(function (r) {
          if (!r.ok) return;
          var input = { name: name.value, type: type.value, channelId: ch.value || null, role: ch.value ? role.value : null, fromMonth: from.value,
            userId: pick.value || null, create: createBox.checked, userName: uName.value, email: uEmail.value };
          var wantsUser = input.create || input.userId;
          if (wantsUser && input.type === 'team') { addDialog(X.errors.team, input); return; }
          if (input.create && !String(input.userName || input.name).trim()) { addDialog(X.errors.userName, input); return; }
          var res = M.addPerson(draft, input);
          if (!res.ok) { addDialog(X.errors[res.error], input); return; }
          var next = res.state;
          var uid = input.userId;
          if (input.create) {
            uid = 'u-' + Date.now().toString(36);
            var roleIds = input.role === 'MANAGER' ? ['manager'] : input.role === 'OFFICER' ? ['officer'] : P.defaultRolesFor(next.teams, res.id, now);
            var user = { id: uid, name: String(input.userName || input.name).trim(), roleIds: roleIds.length ? roleIds : ['viewer'], active: true };
            if (String(input.email || '').trim()) user.email = String(input.email).trim();
            next.users = (next.users || draft.users).concat([user]);
          }
          if (uid) { var lr = P.linkUser(next.people, res.id, uid); if (!lr.ok) { addDialog(X.errors[lr.error] || lr.error, input); return; } next.people = lr.people; }
          adopt(next); draw(); openDrawer(res.id);
        });
    }

    function historyTab(p) {
      var list = M.historyOf(store.get('master.audit'), [{ entity: 'person', key: p.id }, { entity: 'team', key: p.id }]);
      var d = dataOf(cur());
      return h('div', { class: 'am-d-history' }, C.historyList(list, { value: function (e, which) {
        var v = which === 'old' ? e.oldValue : e.newValue;
        if (e.field === 'members') return (v || []).map(function (m) { var ch = channel(m.channelId); return (ch ? ch.name : m.channelId) + ' · ' + (page.roles[m.role] || m.role) + ' · ' + period(m.fromMonth, m.toMonth); }).join(' / ') || '–';
        if (e.field === 'endMonth') return v ? F.date(v) : '–';
        if (e.field === 'type') return v ? page.types[v] : page.types.person;
        if (e.field === 'channelId') { var ch = v ? channel(v) : null; return ch ? ch.name : '–'; }
        return null;
      } }));
    }

    // =====================================================================
    // ส่งออก (รายชื่อตามตัวกรอง + ผู้รับผิดชอบรายเดือนของปีที่เลือก)
    // =====================================================================
    function exportSpec(source) {
      var c = source === 'draft' && editing ? draft : saved;
      var d = dataOf(c);
      var X = page.exportColumns;
      var st = C.exportStamp(null);
      var rows = c.people.filter(function (p) { return passes(c, p); }).sort(byKey(c));
      var year = monthly.year;
      var units = [];
      monthlyUnits(c, d).forEach(function (g) { g.units.forEach(function (u) { units.push({ unit: u, channel: g.channel }); }); });
      var monthCols = F.MONTHS.map(function (m, i) {
        return { key: 'm' + i, label: m + ' ' + year, width: 14, value: function (r) {
          var o = calc.ownerMonths(d.assignments, d.salespeople, r.unit.id, year)[i];
          return o.state === 'owner' ? C.personName(d.salespeople, o.personId) : o.state === 'resigned' ? fill(page.monthly.ended, { name: C.personName(d.salespeople, o.assignedId) }) : page.monthly.none;
        } };
      });
      return {
        filename: fill(page.exportFile, { date: st.date }),
        sheets: [{
          name: page.exportSheet,
          header: C.exportHeader(store.year(), null, [[page.exportHeader.month, F.date(now)]]),
          columns: [
            { key: 'name', label: X.name, width: 24 },
            { key: 'type', label: X.type, value: function (p) { return page.types[M.personType(p)]; }, width: 10 },
            { key: 'teams', label: X.teams, value: function (p) { return stateOf(c, p).memberships.map(function (m) { var ch = channel(m.channelId); return (ch ? ch.name : m.channelId) + ' · ' + (page.roles[m.role] || m.role) + ' · ' + period(m.fromMonth, m.toMonth); }).join(' / '); }, width: 40 },
            { key: 'units', label: fill(X.units, { month: F.date(now) }), value: function (p) { return M.unitsAt(c.assignments, p.id, now).map(function (u) { return unitName(d, u); }).join(', '); }, width: 36 },
            { key: 'account', label: X.account, value: function (p) { var u = userOf(c, p); return u ? u.name : ''; }, width: 22 },
            { key: 'status', label: X.status, value: function (p) { var s = stateOf(c, p); return s.status === 'ended' ? fill(page.status.ended, { month: F.date(s.end) }) : s.status === 'ending' ? page.status.active + ' · ' + fill(page.endingTag, { month: F.date(s.end) }) : page.status[s.status]; }, width: 26 }
          ],
          rows: rows
        }, {
          name: page.exportMonthlySheet,
          header: [[page.exportHeader.month, F.date(now)]],
          columns: [{ key: 'channel', label: page.filters.channel, value: function (r) { return r.channel.name; }, width: 10 }, { key: 'unit', label: page.monthly.unit, value: function (r) { return r.unit.name; }, width: 28 }].concat(monthCols),
          rows: units
        }]
      };
    }

    draw();
    if (hash && hash[2]) {
      var id = decodeURIComponent(hash[2]);
      if (person(saved, id)) openDrawer(id);
    }
    // ลิงก์ในหน้าเดียวกัน (#list / #monthly / #person-<id>) = เปลี่ยนแท็บ / เปิด Drawer
    window.addEventListener('hashchange', function () {
      var m = /^#(list|monthly|person-(.+))$/.exec(location.hash);
      if (!m) return;
      if (m[1] === 'monthly' || m[1] === 'list') { tab = m[1]; store.set('ui.peopleTab', tab); sel = null; draw(); return; }
      var pid = decodeURIComponent(m[2]);
      if (person(cur(), pid)) { tab = 'list'; openDrawer(pid); }
    });
  }

  SP.modules.people = { render: render };
})(window.SP);

/*
 * modules/role-management/role-management.js — Role Management (CR-21 · CR-25 · CR-31) · แก้ได้เฉพาะผู้ดูแลระบบ (ค่าตั้งต้น)
 *
 * CR-31: 2 หน้าในเมนู (ใช้สิทธิ์ roleManagement ร่วมกัน · ข้อความร่วมที่ content pages.roleManagement)
 *   Permissions = index.html (id roleManagement · รวมการจัดการบทบาทที่หัวคอลัมน์) · Users = users/index.html (roleUsers)
 *   Roles = roles/index.html (roleRoles · visible: false) พาไปหน้า Permissions
 * หน้าที่:        ข้อมูลสิทธิ์และกฎทั้งหมดอยู่ใน core/permissions.js · ช่องสิทธิ์ = components.permissionCell (ข้อความ ไม่มีสัญลักษณ์) + permissionLegend
 *                 Permissions: แถว = หน้า (หัวกลุ่ม Module พับได้ · สิทธิ์ย่อยย่อหน้า · กลุ่มสุดท้าย ทั้งระบบ) × คอลัมน์ = บทบาท (ลำดับบทบาท)
 *                   หัวคอลัมน์: ชื่อ (+ Chip สร้างเอง) · ⋯ (ข้อมูลบทบาท · สิทธิ์ · อื่นๆ · อันตราย) · จำนวนผู้ใช้ (ลิงก์ Users ที่กรองบทบาทนั้น)
 *                   โหมดแก้ไข: คลิกช่อง → ตัวเลือกในช่อง (ไม่เห็น | ดู | แก้ไข · ทุก Channel | เฉพาะทีม) · คีย์ลูกศร / 1 / 2 / 3 / T ·
 *                   คลิกชื่อหน้า = ตั้งทั้งแถว · + เพิ่มบทบาท (แผงด้านข้าง) · คืนค่าตั้งต้นทั้งหมด (เมนู ⋯ ที่หัวหน้า) · กฎสิทธิ์ย่อย (enforceRules) ปรับเองพร้อมแจ้ง
 *                 Users: ตัวกรอง ค้นหา · Module (ตัวเลือกเดี่ยว จำที่ ui.usersModule) · บทบาท · Channel · สถานะ (ค่าเริ่มต้น ใช้งาน)
 *                   ตาราง: ชื่อ · บทบาท · บุคลากร · ทีม (ติดซ้าย) + คอลัมน์สิทธิ์ของหน้าใน Module (สิทธิ์ย่อยเป็นคอลัมน์ย่อย) = สิทธิ์ที่มีผลจริง (อ่านอย่างเดียว)
 *                   CR-32: บุคลากรของผู้ใช้ = person.userId (master.salespeople · 1:1 · บุคคลเท่านั้น) · แก้ไข: เลือกบุคลากรที่ยังไม่ผูก / ยกเลิกการผูก
 *                   จัดกลุ่มตามบทบาทแรก (พับได้) · ผู้ใช้ปิดใช้งาน = แถวจาง ช่องว่าง · แก้ไข: บทบาทหลายค่าในช่อง · ปิด / เปิดใช้งาน · + เพิ่มผู้ใช้ (หัวหน้า)
 *                   คลิกชื่อ = Drawer (ข้อมูล · สิทธิ์ที่มีผลจริงทุก Module · ประวัติ)
 *                 บันทึก: permissions.validate → สรุปผลกระทบ (saveSummary) → store + master.audit → โหลดหน้าใหม่ / ส่งออก ▾ / ประวัติการแก้ไข ▾
 * อ่านจาก data/:  roles, permissions, permissionResources, users, teams, channels, content (pages.roleManagement, labels) + registry
 * store อ่าน:     master.roles, master.permissions, master.users, master.teams, master.salespeople, master.audit, ui.role, ui.currentMonth,
 *                 ui.usersModule, ui.usersRoleFilter (หน้า Permissions ส่งมา อ่านครั้งเดียวแล้วลบ)
 * store เขียน:    master.roles, master.permissions, master.users, master.salespeople (CR-32 person.userId), master.audit (ตอนกด บันทึก) · ui.role (ดูตัวอย่างในมุมมองนี้) · ui.usersModule · ui.usersRoleFilter
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var P = SP.core.permissions;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  var AUDIT_OF = { matrix: ['permission', 'role'], users: ['user'] };
  var filters = { module: '', roles: [] };
  var userFilters = { q: '', roles: [], channel: '', status: 'active' };
  var collapsed = {};       // หัวกลุ่ม Module ที่พับ (หน้า Permissions)
  var userCollapsed = {};   // หัวกลุ่มบทบาทที่พับ (หน้า Users)

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function render(root, ctx) {
    var entryId = ctx.entry && ctx.entry.id;
    // CR-31: หน้า Roles ซ่อน · ลิงก์เดิมพาไปหน้า Permissions
    if (entryId === 'roleRoles') { location.replace(SP.core.paths.to(SP.core.registry.byId('roleManagement').path)); return; }
    var tab = entryId === 'roleUsers' ? 'users' : 'matrix';
    var page = SP.data.content.pages.roleManagement;   // ข้อความที่ใช้ร่วมกัน
    var M = page.matrix, U = page.usersTab;
    var L = SP.data.content.labels;
    var list = SP.core.registry.list;
    var month = store.currentKey();
    var saved = { roles: P.rolesNow(), perms: P.permsNow(), users: P.usersNow(), people: P.peopleNow() };
    var draft = clone(saved);
    var editing = false;
    var notice = null;
    var focusKey = null;   // ช่องที่ต้องโฟกัสหลังวาดใหม่ 'r:c'
    var drawerCtl = C.drawer({ label: page.history, className: 'rm-drawer' });
    var panelCtl = C.drawer({ label: M.panel.addTitle, className: 'rm-panel' });
    var userTab = 'info';

    if (tab === 'users') {
      var handoff = store.get('ui.usersRoleFilter');
      if (handoff) { store.remove('ui.usersRoleFilter'); userFilters.roles = [handoff]; userFilters.status = 'all'; }
    }

    function cur() { return editing ? draft : saved; }
    function sortedRoles(state) { return (state || cur()).roles.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
    function context(state) { state = state || cur(); return { roles: state.roles, perms: state.perms, users: state.users, people: state.people, list: list, month: month, teams: P.teamsNow() }; }
    // CR-32: บุคลากรที่ผูกกับผู้ใช้ (person.userId)
    function personIdOf(u, state) { return P.personOfUser((state || cur()).people, u.id); }
    function personOf(u, state) { var id = personIdOf(u, state); return id ? SP.core.calc.findById((state || cur()).people, id) : null; }
    function peopleChanged() {
      return draft.people.filter(function (p) { var o = SP.core.calc.findById(saved.people, p.id); return !o || (o.userId || null) !== (p.userId || null); }).length;
    }
    function roleName(id) { var r = cur().roles.filter(function (x) { return x.id === id; })[0]; return r ? r.name : id; }
    function levelText(c, res) { return res.action ? (c.level === 'EDIT' ? L.perm.allowedText : L.perm.deniedText) : L.perm.levels[c.level] + (c.level === 'EDIT' && c.scope === 'TEAM' ? ' · ' + L.perm.teamText : ''); }
    function kindOf(res) { return res.action ? 'action' : 'page'; }
    function usersChanged() {
      var n = 0;
      draft.users.forEach(function (u) { var o = saved.users.filter(function (x) { return x.id === u.id; })[0]; if (!o || JSON.stringify(o) !== JSON.stringify(u)) n++; });
      return n;
    }
    function diffCount() { var s = P.saveSummary(saved, draft, list); return s.cells + s.roleChanges + usersChanged() + peopleChanged(); }
    function dirty() { return editing ? diffCount() : 0; }
    C.guardUnsaved(dirty);

    var headMenu = C.menuButton(function () {
      return [{ label: page.resetAll, danger: true, onClick: function () {
        C.dialog({ title: page.resetAllConfirm, lines: [page.resetAllLine], confirmLabel: page.resetAll }).then(function (r) { if (r.ok) applyPerms(P.resetMatrix(draft.perms)); });
      } }];
    }, page.headMenu, { className: 'rm-head-menu', text: '⋯' });
    // หน้า Users: + เพิ่มผู้ใช้ อยู่ที่หัวหน้า (โหมดแก้ไข)
    var addUserBtn = h('button', { type: 'button', class: 'btn btn-primary btn-sm rm-add-user', hidden: true, onClick: function () { addUserDialog(); } }, U.add);
    var bar = C.workflowBar({
      simple: true,
      extra: h('span', { class: 'rm-head-tools' }, historyButton(), C.exportButton({ unsaved: dirty, build: exportSpec }), addUserBtn, headMenu),
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); notice = null; draw(); },
      onSave: save,
      onCancel: function () { editing = false; draft = clone(saved); notice = null; panelCtl.close(); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    // ------------------------------------------------------------------ ประวัติการแก้ไข ▾ (master.audit ของหน้านี้)
    function historyButton() {
      var btn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm rm-history' }, page.history + ' ▾');
      C.popover(btn, function () {
        var A = page.audit;
        var rows = (store.get('master.audit') || []).filter(function (e) { return AUDIT_OF[tab].indexOf(e.entity) >= 0; }).slice(-40).reverse();
        return [h('h3', { class: 'popover-title' }, page.history),
          rows.length ? h('ol', { class: 'wf-history rm-history-list' }, rows.map(historyItem)) : h('p', { class: 'muted small' }, page.historyEmpty)];
      }, { className: 'wf-history-popover', label: page.history, align: 'right' });
      return btn;
    }
    function historyItem(e) {
      var A = page.audit;
      return h('li', null, h('span', { class: 'wf-history-when' }, e.at ? F.dateTime(e.at) : ''),
        h('span', { class: 'wf-history-what' }, (A[e.entity] || e.entity) + ' · ' + fill(page.historyLine, { key: e.key, field: A.fields[e.field] || e.field, old: e.oldValue == null ? '–' : e.oldValue, next: e.newValue == null ? '–' : e.newValue })),
        h('span', { class: 'muted small' }, e.by || ''));
    }

    // ------------------------------------------------------------------ วาดหน้า
    function draw() {
      C.clear(root);
      bar.update();
      headMenu.hidden = !(editing && tab === 'matrix');
      addUserBtn.hidden = !(editing && tab === 'users');
      if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); }
      if (tab === 'matrix') matrixTab(); else usersTab();
      if (focusKey) {
        var td = root.querySelector('td.rm-cell[data-rc="' + focusKey + '"]');
        focusKey = null;
        if (td) td.focus();
      }
    }

    // ------------------------------------------------------------------ แถวของตารางสิทธิ์
    // กลุ่มเมนู → หน้า (สิทธิ์ของหน้า หรือหัวข้อของหน้าที่มีเฉพาะสิทธิ์ย่อย) → สิทธิ์ย่อย / ท้ายสุด = ทั้งระบบ (ส่งออก)
    function rowsModel() {
      var res = P.resources(list);
      var tour = SP.core.registry.tour();
      var out = [];
      SP.core.registry.groups.concat(['*']).forEach(function (g) {
        var items = res.filter(function (r) { return g === '*' ? r.pageId === '*' : r.group === g; });
        if (!items.length) return;
        var pagesSeen = {};
        var rows = [];
        items.forEach(function (r) {
          if (g !== '*' && !pagesSeen[r.pageId]) {
            pagesSeen[r.pageId] = true;
            var e = SP.core.registry.byId(r.pageId);
            var step = tour.indexOf(e);
            var hasMain = items.some(function (x) { return x.pageId === r.pageId && x.main; });
            if (!hasMain) rows.push({ kind: 'page', pageId: r.pageId, label: (step >= 0 ? (step + 1) + ' ' : '') + pageLabel(r.pageId) });
          }
          var e2 = SP.core.registry.byId(r.pageId);
          var st = e2 ? tour.indexOf(e2) : -1;
          rows.push({ kind: 'res', res: r, label: r.main ? (st >= 0 ? (st + 1) + ' ' : '') + resPageLabel(r.pageId) : r.label, indent: r.sub || !r.main && g !== '*' });
        });
        out.push({ group: g, label: groupLabel(g), rows: rows });
      });
      return out;
    }
    function groupLabel(g) { return g === '*' ? M.globalGroup : (SP.data.content.site.groups[g] || g); }
    function pageLabel(pageId) {
      var p = SP.data.content.pages[pageId];
      var e = SP.core.registry.byId(pageId);
      var t = (p && (p.short || p.title)) || (e && e.title) || pageId;
      return t.replace('{territoryChannels}', SP.data.channels.filter(function (c) { return c.allocationUnit === 'TERRITORY'; }).map(function (c) { return c.name; }).join(', '));
    }
    // CR-25: หน้าที่หน้าอื่นใช้สิทธิ์ร่วม (Permissions ← Users) ใช้ชื่อสิทธิ์ในเมทริกซ์ Drawer Audit และไฟล์ส่งออก
    function resPageLabel(pageId) {
      var shared = SP.core.registry.list.some(function (e) { return e.perm === pageId; });
      var main = shared ? P.resources(list).filter(function (r) { return r.pageId === pageId && r.main; })[0] : null;
      return main ? main.label : pageLabel(pageId);
    }
    function resLabel(r) { return r.pageId === '*' ? r.label : r.main ? resPageLabel(r.pageId) : resPageLabel(r.pageId) + ' › ' + r.label; }
    function shownRoles() { var r = sortedRoles(); return filters.roles.length ? r.filter(function (x) { return filters.roles.indexOf(x.id) >= 0; }) : r; }

    function applyPerms(next) {
      var res = P.enforceRules(next, draft.roles, list);
      draft.perms = res.perms;
      notice = res.adjusted.length ? fill(M.adjusted, { items: res.adjusted.map(function (a) {
        var r = P.resourceById(list, a.resId);
        return fill(M.adjustedItem, { res: r ? r.label : a.resId, role: roleName(a.roleId), level: levelText(a.to, r || {}) });
      }).join(' · ') }) : null;
      draw();
    }
    // ค่าของช่องตามระดับที่เลือก (ปุ่มเฉพาะ: แก้ไข = อนุญาต · อื่นๆ = ไม่อนุญาต)
    function cellValue(res, level, scope) {
      if (res.action) return { level: level === 'EDIT' ? 'EDIT' : 'NONE', scope: level === 'EDIT' && res.scopable ? scope || 'ALL' : 'ALL' };
      return { level: level, scope: level === 'EDIT' && res.scopable ? scope || 'ALL' : 'ALL' };
    }
    function setColumn(roleId, level) {
      var next = draft.perms;
      P.resources(list).forEach(function (r) { next = P.setCell(next, roleId, r.id, cellValue(r, level)); });
      applyPerms(next);
    }
    function setRow(res, level) {
      var next = draft.perms;
      shownRoles().forEach(function (role) { next = P.setCell(next, role.id, res.id, cellValue(res, level)); });
      applyPerms(next);
    }
    function preview(roleId) {
      var u = cur().users.filter(function (x) { return x.active !== false && (x.roleIds || [])[0] === roleId; })[0]
        || cur().users.filter(function (x) { return x.active !== false && (x.roleIds || []).indexOf(roleId) >= 0; })[0];
      if (!u) { C.dialog({ title: M.previewNone, confirmLabel: L.dialog.confirm }); return; }
      if (!C.confirmDiscard(dirty())) return;
      editing = false;
      C.guardUnsaved(null);
      store.set('ui.role', P.ref(P.normalize(u, context(saved))));
      // CR-25: ไปหน้าเริ่มต้นของบทบาทนั้น (ไม่มี = หน้าเริ่มต้นของผู้ใช้ที่ index.html)
      var home = SP.core.registry.byId(P.roleHome(roleId, context(saved)));
      location.href = SP.core.paths.to(home ? home.path : 'index.html');
    }
    function goUsers(roleId) {
      if (editing && !C.confirmDiscard(dirty())) return;
      editing = false;
      C.guardUnsaved(null);
      store.set('ui.usersRoleFilter', roleId);
      location.href = SP.core.paths.to(SP.core.registry.byId('roleUsers').path);
    }

    // ================================================================== หน้า Permissions
    function matrixTab() {
      var roles = shownRoles();
      var groups = SP.core.registry.groups.filter(function (g) { return P.resources(list).some(function (r) { return r.group === g; }); });
      root.appendChild(h('div', { class: 'tool-row rm-toolbar' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, M.moduleFilter), C.select({ label: M.moduleFilter, value: filters.module, className: 'rm-module',
          options: [{ value: '', label: M.moduleAll }].concat(groups.map(function (g) { return { value: g, label: groupLabel(g) }; })).concat([{ value: '*', label: M.globalGroup }]),
          onChange: function (v) { filters.module = v; draw(); } })),
        C.multiSelect({ label: M.roleFilter, allLabel: M.roleAll, selected: M.roleSelected, clear: L.series.clear, empty: L.series.empty,
          options: sortedRoles().map(function (r) { return { value: r.id, label: r.name }; }), value: filters.roles, onChange: function (v) { filters.roles = v; draw(); } }),
        editing ? h('span', { class: 'muted small rm-keys' }, M.keysHint) : null,
        h('span', { class: 'tool-right' }, C.permissionLegend())));
      if (notice) root.appendChild(h('p', { class: 'callout callout-info rm-notice', role: 'status' }, notice));

      var cols = roles.length + (editing ? 1 : 0);
      var head = h('tr', null, h('th', { class: 'rm-page-col', scope: 'col' }, M.pageColumn), roles.map(function (role, ci) { return roleHead(role, ci); }),
        editing ? h('th', { class: 'rm-add-col', scope: 'col' }, h('button', { type: 'button', class: 'btn btn-secondary btn-sm rm-add-role', onClick: function () { openPanel(null); } }, M.add)) : null);
      var body = h('tbody');
      var st = cur();
      var total = 0, r = 0;
      rowsModel().forEach(function (g) {
        if (filters.module && filters.module !== g.group) return;
        var closed = !!collapsed[g.group];
        body.appendChild(h('tr', { class: 'rm-group' }, h('th', { class: 'rm-page-col', scope: 'rowgroup', colspan: String(cols + 1) },
          h('button', { type: 'button', class: 'rm-group-toggle', 'aria-expanded': closed ? 'false' : 'true', title: fill(M.groupToggle, { group: g.label }),
            onClick: function () { collapsed[g.group] = !closed; draw(); } }, h('span', { class: 'rm-caret', 'aria-hidden': 'true' }, closed ? '▸' : '▾'), h('span', { class: 'rm-group-name' }, g.label)))));
        if (closed) return;
        g.rows.forEach(function (row) {
          if (row.kind === 'page') { body.appendChild(h('tr', { class: 'rm-page-head' }, h('th', { class: 'rm-page-col', scope: 'row' }, row.label), h('td', { colspan: String(cols) }))); return; }
          total++;
          var ri = r++;
          var res = row.res;
          var label = editing ? rowMenu(res, row.label) : row.label;
          body.appendChild(h('tr', { class: 'rm-row' + (row.indent ? ' is-sub' : '') },
            h('th', { class: 'rm-page-col', scope: 'row', title: res.id }, label),
            roles.map(function (role, ci) { return matrixCell(st, role, res, row.label, ri, ci); }),
            editing ? h('td', { class: 'rm-add-col' }) : null));
        });
      });
      var card = h('div', { class: 'card fit-card rm-card' });
      if (!total && !Object.keys(collapsed).some(function (k) { return collapsed[k]; })) card.appendChild(h('p', { class: 'grid-empty' }, M.empty));
      else {
        var tbl = h('table', { class: 'data-grid rm-matrix', style: { '--rm-cols': String(roles.length) } }, h('thead', null, head), body);
        bindMatrix(tbl);
        card.appendChild(h('div', { class: 'fit-scroll rm-scroll' }, tbl));
      }
      root.appendChild(card);
    }

    // หัวคอลัมน์บทบาท: ชื่อ (+ สร้างเอง) · ⋯ / จำนวนผู้ใช้ (ลิงก์ Users ที่กรองบทบาทนั้น)
    function roleHead(role, ci) {
      var n = cur().users.filter(function (u) { return (u.roleIds || []).indexOf(role.id) >= 0; }).length;
      var btn = h('button', { type: 'button', class: 'icon-btn rm-role-menu', title: fill(M.roleMenu, { role: role.name }), 'aria-label': fill(M.roleMenu, { role: role.name }) }, '⋯');
      C.popover(btn, function (close) { return roleMenu(role, close); }, { className: 'menu-popover rm-role-popover', label: fill(M.roleMenu, { role: role.name }), align: 'left' });
      return h('th', { class: 'rm-role-col', scope: 'col', 'data-c': String(ci), title: role.description || role.name },
        h('div', { class: 'rm-role-line' }, h('span', { class: 'rm-role-name' }, role.name), role.system ? null : h('span', { class: 'rm-custom' }, M.customChip), btn),
        h('button', { type: 'button', class: 'link-btn rm-role-users', title: fill(M.usersTip, { role: role.name }), onClick: function () { goUsers(role.id); } }, fill(M.usersCount, { n: n })));
    }

    // เมนู ⋯ ของบทบาท (แทนหน้า Roles เดิม): ข้อมูลบทบาท · สิทธิ์ (โหมดแก้ไข) · อื่นๆ (ทุกโหมด) · อันตราย (บทบาทที่สร้างเอง · โหมดแก้ไข)
    function roleMenu(role, close) {
      var G = M.menuGroups, X = M.menu;
      var all = sortedRoles();
      var idx = all.map(function (r) { return r.id; }).indexOf(role.id);
      function item(label, fn, opts) {
        opts = opts || {};
        return h('li', null, h('button', { type: 'button', class: 'menu-item' + (opts.danger ? ' is-danger' : '') + (opts.cls ? ' ' + opts.cls : ''), disabled: !!opts.disabled,
          onClick: function () { close(); fn(); } }, label));
      }
      function group(title, items) { return [h('li', { class: 'menu-heading' }, title)].concat(items); }
      var out = [];
      if (editing) {
        out = out.concat(group(G.info, [item(X.rename, function () { openPanel(role.id); }, { cls: 'rm-m-rename' }), item(X.home, function () { openPanel(role.id, 'home'); }, { cls: 'rm-m-home' }),
          item(X.left, function () { draft.roles = P.reorderRoles(draft.roles, role.id, idx - 1); draw(); }, { disabled: idx <= 0, cls: 'rm-m-left' }),
          item(X.right, function () { draft.roles = P.reorderRoles(draft.roles, role.id, idx + 1); draw(); }, { disabled: idx >= all.length - 1, cls: 'rm-m-right' })]));
        out = out.concat(group(G.perms, [item(X.setColumn, function () { setColumnDialog(role); }, { cls: 'rm-m-column' }), item(X.copyFrom, function () { copyDialog(role); }, { cls: 'rm-m-copy' }),
          item(X.reset, function () { applyPerms(P.resetMatrix(draft.perms, role.id)); }, { cls: 'rm-m-reset' })]));
      }
      out = out.concat(group(G.other, [item(X.preview, function () { preview(role.id); }, { cls: 'rm-m-preview' }), item(X.users, function () { goUsers(role.id); }, { cls: 'rm-m-users' })]));
      if (editing && !role.system) out = out.concat(group(G.danger, [item(X.remove, function () { removeRoleFlow(role); }, { danger: true, cls: 'rm-m-remove' })]));
      return h('ul', { class: 'menu-list rm-role-menu-list' }, out);
    }
    function removeRoleFlow(role) {
      var n = draft.users.filter(function (u) { return (u.roleIds || []).indexOf(role.id) >= 0; }).length;
      if (n) { C.dialog({ title: fill(M.removeHasUsers, { name: role.name, n: n }), confirmLabel: L.dialog.confirm }); return; }
      C.dialog({ title: fill(M.removeConfirm, { name: role.name }), confirmLabel: M.menu.remove, danger: true }).then(function (r) {
        if (!r.ok) return;
        var res = P.removeRole(draft, role.id);
        if (!res.ok) return;
        draft.roles = res.roles; draft.perms = res.perms; draw();
      });
    }
    function levelSelect(value, cls) {
      return C.select({ label: M.setColumnLabel, value: value, className: cls, onChange: function () {},
        options: ['NONE', 'VIEW', 'EDIT'].map(function (lv) { return { value: lv, label: M.levels[lv] }; }) });
    }
    function setColumnDialog(role) {
      var sel = levelSelect('VIEW', 'rm-set-column');
      C.dialog({ title: fill(M.setColumnTitle, { role: role.name }), lines: [fill(M.setColumnLine, { role: role.name })], body: h('label', { class: 'field' }, h('span', { class: 'field-label' }, M.setColumnLabel), sel),
        confirmLabel: M.panel.save }).then(function (r) { if (r.ok) setColumn(role.id, sel.value); });
    }
    function copyDialog(role) {
      var others = sortedRoles().filter(function (r) { return r.id !== role.id; });
      var sel = C.select({ label: M.copyLabel, value: others[0] ? others[0].id : '', className: 'rm-copy-from', onChange: function () {}, options: others.map(function (r) { return { value: r.id, label: r.name }; }) });
      C.dialog({ title: fill(M.copyTitle, { role: role.name }), lines: [fill(M.copyLine, { role: role.name })], body: h('label', { class: 'field' }, h('span', { class: 'field-label' }, M.copyLabel), sel),
        confirmLabel: M.panel.save }).then(function (r) { if (r.ok && sel.value) applyPerms(P.copyRole(draft.perms, draft.roles, sel.value, role.id, list)); });
    }

    // แผงด้านข้าง: เพิ่มบทบาท (roleId null) · แก้ชื่อ คำอธิบาย และหน้าเริ่มต้น
    function openPanel(roleId, focus) {
      var X = M.panel;
      var role = roleId ? draft.roles.filter(function (r) { return r.id === roleId; })[0] : null;
      C.clear(panelCtl.head);
      C.clear(panelCtl.body);
      panelCtl.head.appendChild(h('div', { class: 'pd-title' }, h('h2', null, role ? fill(X.editTitle, { name: role.name }) : X.addTitle)));
      var name = h('input', { type: 'text', class: 'pm-input rm-panel-name', value: role ? role.name : '', 'aria-label': X.name });
      var desc = h('input', { type: 'text', class: 'pm-input rm-panel-desc', value: role ? role.description || '' : '', 'aria-label': X.description });
      var from = role ? null : C.select({ label: X.copyFrom, value: '', className: 'rm-panel-copy', onChange: function () { fillHome(); },
        options: [{ value: '', label: X.copyNone }].concat(sortedRoles().map(function (r) { return { value: r.id, label: r.name }; })) });
      var homeSlot = h('span', { class: 'rm-panel-home-slot' });
      var home = null;
      var err = h('p', { class: 'dlg-error', role: 'alert', hidden: true });
      // หน้าที่บทบาทนี้เห็น (บทบาทใหม่ = ตามสิทธิ์ที่จะคัดลอก)
      function fillHome() {
        var c, id;
        if (role) { c = context(draft); id = role.id; }
        else {
          var tmp = P.addRole(draft, (name.value || X.addTitle) + ' ' + Date.now(), '', from.value || null, list);
          c = { roles: tmp.roles, perms: tmp.perms, users: draft.users, list: list, month: month, teams: P.teamsNow() };
          id = tmp.id;
        }
        var pages = P.rolePages(id, c).filter(function (e) { return !e.open; });
        var set = role ? P.homeIdOf(role) : '';
        var auto = P.roleHome(id, c);
        home = C.select({ label: X.home, value: pages.some(function (e) { return e.id === set; }) ? set : '', className: 'rm-panel-home', onChange: function () {},
          options: [{ value: '', label: fill(X.homeAuto, { page: auto ? pageLabel(auto) : '–' }) }].concat(pages.map(function (e) { return { value: e.id, label: pageLabel(e.id) }; })) });
        C.clear(homeSlot).appendChild(home);
      }
      fillHome();
      panelCtl.body.appendChild(h('div', { class: 'pd-body rm-panel-form' },
        h('label', { class: 'pd-field' }, h('span', { class: 'pd-label' }, X.name), name),
        h('label', { class: 'pd-field' }, h('span', { class: 'pd-label' }, X.description), desc),
        from ? h('label', { class: 'pd-field' }, h('span', { class: 'pd-label' }, X.copyFrom), from) : null,
        h('label', { class: 'pd-field', title: X.homeTip }, h('span', { class: 'pd-label' }, X.home), homeSlot),
        h('p', { class: 'muted small' }, X.homeTip),
        err,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost', onClick: function () { panelCtl.close(); } }, X.cancel),
          h('button', { type: 'button', class: 'btn btn-primary rm-panel-save', onClick: function () {
            var res;
            if (role) res = P.renameRole(draft.roles, role.id, name.value, desc.value);
            else res = P.addRole(draft, name.value, desc.value, from.value || null, list);
            if (!res.ok) { err.textContent = X.errors[res.error]; err.hidden = false; name.focus(); return; }
            var id = role ? role.id : res.id;
            draft.roles = res.roles;
            if (res.perms) draft.perms = res.perms;
            draft.roles = P.setRoleHome(draft.roles, id, home ? home.value : '');
            panelCtl.close();
            applyPerms(draft.perms);
          } }, X.save))));
      panelCtl.open();
      (focus === 'home' && home ? home : name).focus();
    }

    // ชื่อหน้า (โหมดแก้ไข) = ปุ่มเมนู ตั้งทั้งแถวเป็น…
    function rowMenu(res, label) {
      var levels = res.action ? ['NONE', 'EDIT'] : ['NONE', 'VIEW', 'EDIT'];
      return C.menuButton(levels.map(function (lv) {
        return { label: fill(M.setRow, { level: res.action ? M.actionLevels[lv] : M.levels[lv] }), onClick: function () { setRow(res, lv); } };
      }), fill(M.rowMenu, { res: label }), { className: 'rm-row-menu', text: label, align: 'left' });
    }

    function matrixCell(st, role, res, label, ri, ci) {
      var c = P.cell(st.perms, role, res);
      var savedRole = saved.roles.filter(function (x) { return x.id === role.id; })[0];
      var before = savedRole ? P.cell(saved.perms, savedRole, res) : null;
      var isDirty = editing && (!before || before.level !== c.level || before.scope !== c.scope);
      var title = fill(M.cellTitle, { role: role.name, res: label }) + ' · ' + levelText(c, res);
      var td = h('td', { class: 'rm-cell' + (editing ? ' is-editable' : '') + (isDirty ? ' is-dirty' : ''), tabindex: '0', title: title, dataset: { r: String(ri), c: String(ci), rc: ri + ':' + ci, role: role.id, res: res.id } },
        C.permissionCell(c.level, c.scope, kindOf(res), { title: title, dirty: isDirty }));
      if (editing) td.addEventListener('click', function () { openChoice(td, role, res, c, ri, ci); });
      return td;
    }

    // ตัวเลือกในช่อง (Popover เล็กชิดช่อง): ไม่เห็น | ดู | แก้ไข (+ ทุก Channel | เฉพาะทีม) · ปุ่มเฉพาะ: ไม่อนุญาต | อนุญาต · กดแล้วปิดทันที
    function openChoice(td, role, res, c, ri, ci) {
      if (td.dataset.pop) return;
      td.dataset.pop = '1';
      var pop = C.popover(td, function (close) {
        function set(v) { close(); focusKey = ri + ':' + ci; applyPerms(P.setCell(draft.perms, role.id, res.id, v)); }
        var levels = res.action ? ['NONE', 'EDIT'] : ['NONE', 'VIEW', 'EDIT'];
        var rows = [h('div', { class: 'segmented rm-choice rm-choice-level', role: 'group' }, levels.map(function (lv) {
          return h('button', { type: 'button', class: 'seg' + (c.level === lv ? ' is-active' : ''), dataset: { level: lv },
            onClick: function () { set(cellValue(res, lv, c.level === 'EDIT' ? c.scope : 'ALL')); } }, res.action ? M.actionLevels[lv] : M.levels[lv]);
        }))];
        if (res.scopable) rows.push(h('div', { class: 'segmented rm-choice rm-choice-scope', role: 'group' }, ['ALL', 'TEAM'].map(function (sc) {
          return h('button', { type: 'button', class: 'seg' + (c.level === 'EDIT' && c.scope === sc ? ' is-active' : ''), dataset: { scope: sc },
            onClick: function () { set(cellValue(res, 'EDIT', sc)); } }, M.scopes[sc]);
        })));
        return h('div', { class: 'rm-choice-box' }, rows);
      }, { className: 'rm-choice-popover', label: fill(M.cellTitle, { role: role.name, res: res.label }), align: 'left' });
      pop.open();
    }

    // คีย์บอร์ด: ลูกศรเลื่อนช่อง · 1 ไม่เห็น · 2 ดู · 3 แก้ไข · T สลับเฉพาะทีม · Hover = พื้นจางทั้งแถวและทั้งคอลัมน์
    function bindMatrix(tbl) {
      tbl.addEventListener('keydown', function (e) {
        var td = e.target.closest && e.target.closest('td.rm-cell');
        if (!td) return;
        var r = Number(td.dataset.r), c = Number(td.dataset.c);
        var mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
        if (mv) {
          var n = tbl.querySelector('td.rm-cell[data-rc="' + (r + mv[0]) + ':' + (c + mv[1]) + '"]');
          if (n) { n.focus(); e.preventDefault(); }
          return;
        }
        if (!editing) return;
        var role = cur().roles.filter(function (x) { return x.id === td.dataset.role; })[0];
        var res = P.resourceById(list, td.dataset.res);
        if (!role || !res) return;
        var cell = P.cell(draft.perms, role, res);
        var v = null;
        if (e.key === '1') v = cellValue(res, 'NONE');
        else if (e.key === '2' && !res.action) v = cellValue(res, 'VIEW');
        else if (e.key === '3') v = cellValue(res, 'EDIT', cell.level === 'EDIT' ? cell.scope : 'ALL');
        else if ((e.key === 't' || e.key === 'T') && res.scopable && cell.level === 'EDIT') v = cellValue(res, 'EDIT', cell.scope === 'TEAM' ? 'ALL' : 'TEAM');
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); td.click(); return; }
        if (!v) return;
        e.preventDefault();
        focusKey = r + ':' + c;
        applyPerms(P.setCell(draft.perms, role.id, res.id, v));
      });
      function hoverCol(c, on) { Array.prototype.forEach.call(tbl.querySelectorAll('[data-c="' + c + '"]'), function (el) { el.classList.toggle('is-hover-col', on); }); }
      tbl.addEventListener('mouseover', function (e) { var td = e.target.closest && e.target.closest('[data-c]'); if (td) hoverCol(td.dataset.c, true); });
      tbl.addEventListener('mouseout', function (e) { var td = e.target.closest && e.target.closest('[data-c]'); if (td) hoverCol(td.dataset.c, false); });
    }

    // ================================================================== หน้า Users
    function moduleNow() {
      var v = store.get('ui.usersModule');
      var ok = v === '*' || SP.core.registry.groups.indexOf(v) >= 0 && P.resources(list).some(function (r) { return r.group === v; });
      return ok ? v : 'sales-planning';
    }
    // คอลัมน์สิทธิ์ของ Module: หน้า → [resource หลัก, สิทธิ์ย่อย…]
    function modulePages(module) {
      var res = P.resources(list).filter(function (r) { return module === '*' ? r.pageId === '*' : r.group === module; });
      var out = [];
      res.forEach(function (r) {
        var g = out.filter(function (x) { return x.pageId === r.pageId; })[0];
        if (!g) { g = { pageId: r.pageId, label: r.pageId === '*' ? M.globalGroup : resPageLabel(r.pageId), res: [] }; out.push(g); }
        if (r.main) g.res.unshift(r); else g.res.push(r);
      });
      return out;
    }
    function teamsOf(u) {
      var pid = personIdOf(u);
      if (!pid) return [];
      var out = [];
      P.teamsNow().forEach(function (t) {
        P.membersOf([t], t.channelId, month).forEach(function (m) {
          if (m.salesPersonId !== pid) return;
          var ch = SP.data.channels.filter(function (c) { return c.id === t.channelId; })[0];
          out.push(fill(U.teamLine, { channel: ch ? ch.name : t.channelId, role: U.teamRoles[m.role === 'MANAGER' ? 'MANAGER' : 'OFFICER'] }));
        });
      });
      return out;
    }
    function teamCell(u) {
      var teams = teamsOf(u);
      if (!teams.length) return null;
      var people = SP.core.registry.byId('people');
      var text = teams.join(' · ');
      if (!people || people.visible === false) return h('span', { class: 'rm-team' }, text);
      return h('a', { class: 'rm-team rm-team-link', href: SP.core.paths.to(people.path) + '#person-' + encodeURIComponent(personIdOf(u)), title: fill(U.teamTip, { name: u.name }) }, text);
    }
    // CR-32: คอลัมน์ บุคลากร · โหมดแก้ไข = เลือกบุคลากรประเภทบุคคลที่ยังไม่ผูก (1:1) หรือยกเลิกการผูก
    function personCell(u) {
      var p = personOf(u);
      if (!editing) return p ? h('span', { class: 'rm-person' }, p.name) : h('span', { class: 'muted' }, U.personEmpty);
      var free = cur().people.filter(function (x) { return x.type !== 'team' && (!x.userId || x.userId === u.id); }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'th'); });
      return C.select({ label: fill(U.personPick, { name: u.name }), value: p ? p.id : '', className: 'rm-person-pick',
        options: [{ value: '', label: U.personNone }].concat(free.map(function (x) { return { value: x.id, label: x.name }; })),
        onChange: function (v) { linkPerson(u.id, v || null); } });
    }
    function linkPerson(userId, personId) {
      var people = draft.people;
      var old = P.personOfUser(people, userId);
      if (old) { var r0 = P.linkUser(people, old, null); if (r0.ok) people = r0.people; }
      if (personId) {
        var r = P.linkUser(people, personId, userId);
        if (!r.ok) { C.dialog({ title: U.personErrors[r.error] || r.error, confirmLabel: L.dialog.confirm }); draw(); return; }
        people = r.people;
      }
      draft.people = people;
      draw();
      if (drawerCtl.isOpen()) renderUser(userId);
    }
    function firstRole(u) {
      var order = sortedRoles().map(function (r) { return r.id; });
      return (u.roleIds || []).filter(function (id) { return order.indexOf(id) >= 0; }).sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); })[0] || null;
    }
    function filteredUsers() {
      var q = userFilters.q.trim().toLowerCase();
      return cur().users.filter(function (u) {
        if (q && u.name.toLowerCase().indexOf(q) < 0) return false;
        if (userFilters.roles.length && !(u.roleIds || []).some(function (id) { return userFilters.roles.indexOf(id) >= 0; })) return false;
        if (userFilters.status === 'active' && u.active === false) return false;
        if (userFilters.status === 'inactive' && u.active !== false) return false;
        if (userFilters.channel) {
          var pid = personIdOf(u);
          var chs = pid ? P.teamChannels(P.teamsNow(), pid, month) : [];
          if (userFilters.channel === '-' ? chs.length : chs.indexOf(userFilters.channel) < 0) return false;
        }
        return true;
      });
    }
    function effectiveOf(u) {
      var map = {};
      P.effectiveRows(u, context()).forEach(function (r) { map[r.res.id] = r; });
      return map;
    }

    function usersTab() {
      var module = moduleNow();
      var groups = SP.core.registry.groups.filter(function (g) { return P.resources(list).some(function (r) { return r.group === g; }); });
      var search = h('input', { type: 'search', class: 'search-input rm-user-search', placeholder: U.search, 'aria-label': U.search, value: userFilters.q });
      search.addEventListener('change', function () { userFilters.q = search.value; draw(); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') { userFilters.q = search.value; draw(); } });
      var channels = SP.data.channels.filter(function (c) { return P.teamsNow().some(function (t) { return t.channelId === c.id && t.members.length; }); });
      root.appendChild(h('div', { class: 'tool-row rm-toolbar' }, search,
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, U.moduleFilter), C.select({ label: U.moduleFilter, value: module, className: 'rm-users-module',
          options: groups.map(function (g) { return { value: g, label: groupLabel(g) }; }).concat([{ value: '*', label: M.globalGroup }]),
          onChange: function (v) { store.set('ui.usersModule', v); draw(); } })),
        C.multiSelect({ label: U.roleFilter, allLabel: U.roleAll, selected: U.roleSelected, clear: L.series.clear, empty: L.series.empty,
          options: sortedRoles().map(function (r) { return { value: r.id, label: r.name }; }), value: userFilters.roles, onChange: function (v) { userFilters.roles = v; draw(); } }),
        C.select({ label: U.channelFilter, value: userFilters.channel, className: 'rm-users-channel' + (userFilters.channel ? ' is-active' : ''),
          options: [{ value: '', label: U.channelAll }].concat(channels.map(function (c) { return { value: c.id, label: c.name }; })).concat([{ value: '-', label: U.channelNone }]),
          onChange: function (v) { userFilters.channel = v; draw(); } }),
        C.select({ label: U.statusFilter, value: userFilters.status, className: 'rm-users-status', options: ['active', 'inactive', 'all'].map(function (k) { return { value: k, label: U.statuses[k] }; }),
          onChange: function (v) { userFilters.status = v; draw(); } }),
        h('span', { class: 'tool-right' }, C.permissionLegend())));

      var pages = modulePages(module);
      var nCols = 4 + pages.reduce(function (s, p) { return s + p.res.length; }, 0);
      var hasSub = pages.some(function (p) { return p.res.length > 1; });
      var head1 = [h('th', { class: 'rm-u-name', scope: 'col', rowspan: hasSub ? '2' : null }, U.columns.name), h('th', { class: 'rm-u-roles', scope: 'col', rowspan: hasSub ? '2' : null }, U.columns.roles),
        h('th', { class: 'rm-u-person', scope: 'col', rowspan: hasSub ? '2' : null }, U.columns.person),
        h('th', { class: 'rm-u-team', scope: 'col', rowspan: hasSub ? '2' : null }, U.columns.teams)];
      var head2 = [];
      pages.forEach(function (p) {
        if (p.res.length === 1) head1.push(h('th', { class: 'rm-u-perm', scope: 'col', rowspan: hasSub ? '2' : null, title: resLabel(p.res[0]) }, p.label));
        else {
          head1.push(h('th', { class: 'rm-u-perm rm-u-page', scope: 'colgroup', colspan: String(p.res.length) }, p.label));
          p.res.forEach(function (r) { head2.push(h('th', { class: 'rm-u-perm rm-u-sub', scope: 'col', title: resLabel(r) }, r.main ? U.mainCol : r.label)); });
        }
      });
      var body = h('tbody');
      var users = filteredUsers();
      var byRole = {};
      users.forEach(function (u) { var k = firstRole(u) || ''; (byRole[k] = byRole[k] || []).push(u); });
      sortedRoles().map(function (r) { return r.id; }).concat(['']).forEach(function (rid) {
        var list2 = byRole[rid];
        if (!list2 || !list2.length) return;
        var closed = !!userCollapsed[rid];
        var gName = rid ? roleName(rid) : U.noRolesGroup;
        body.appendChild(h('tr', { class: 'rm-u-group' }, h('th', { scope: 'rowgroup', colspan: String(nCols) },
          h('button', { type: 'button', class: 'rm-group-toggle', 'aria-expanded': closed ? 'false' : 'true', onClick: function () { userCollapsed[rid] = !closed; draw(); } },
            h('span', { class: 'rm-caret', 'aria-hidden': 'true' }, closed ? '▸' : '▾'), h('span', { class: 'rm-group-name' }, fill(U.groupHead, { role: gName, n: list2.length }))))));
        if (closed) return;
        list2.forEach(function (u) { body.appendChild(userRow(u, pages, rid)); });
      });
      if (!users.length) body.appendChild(h('tr', null, h('td', { colspan: String(nCols), class: 'master-empty' }, U.empty)));
      root.appendChild(h('div', { class: 'card fit-card rm-card' }, h('div', { class: 'fit-scroll rm-u-scroll' }, h('table', { class: 'data-grid rm-users' },
        h('thead', null, h('tr', null, head1), head2.length ? h('tr', { class: 'rm-u-head2' }, head2) : null), body))));
    }

    function userRow(u, pages, groupRole) {
      var inactive = u.active === false;
      var eff = effectiveOf(u);
      var o = saved.users.filter(function (x) { return x.id === u.id; })[0];
      var changed = editing && (!o || JSON.stringify(o) !== JSON.stringify(u) || personIdOf(u, draft) !== personIdOf(u, saved));
      var others = sortedRoles().filter(function (r) { return (u.roleIds || []).indexOf(r.id) >= 0 && r.id !== groupRole; });
      var roleCell = h('span', { class: 'rm-u-rolecell' }, groupRole ? h('span', { class: 'rm-u-role' }, roleName(groupRole)) : h('span', { class: 'text-short' }, U.rolesNone),
        others.map(function (r) { return h('span', { class: 'badge tag-muted rm-role-chip' }, r.name); }));
      if (editing) {
        var rb = h('button', { type: 'button', class: 'rm-u-roles-btn', title: fill(U.rolesEdit, { name: u.name }), 'aria-label': fill(U.rolesEdit, { name: u.name }) }, roleCell, h('span', { class: 'rm-caret', 'aria-hidden': 'true' }, '▾'));
        C.popover(rb, function () { return rolesPicker(u); }, { className: 'rm-roles-popover', label: fill(U.rolesEdit, { name: u.name }), align: 'left' });
        roleCell = rb;
      }
      var nameCell = [h('button', { type: 'button', class: 'rm-user-name', onClick: function () { openUser(u.id); } }, u.name)];
      if (editing) nameCell.push(C.menuButton([{ label: inactive ? U.activate : U.deactivate, onClick: function () { setUser(u.id, { active: inactive }); } }],
        fill(U.rowMenu, { name: u.name }), { className: 'rm-u-row-menu', text: '⋯' }));
      var cells = [];
      pages.forEach(function (p) {
        p.res.forEach(function (r) {
          var e = eff[r.id] || { level: 'NONE', scope: 'ALL', from: [] };
          var title = inactive ? U.inactiveTip : e.level === 'NONE' ? resLabel(r) + ' · ' + levelText(e, r) : resLabel(r) + ' · ' + levelText(e, r) + ' · ' + fill(U.fromTip, { roles: e.from.map(roleName).join(', ') });
          cells.push(h('td', { class: 'rm-cell rm-u-cell', title: title }, inactive ? null : C.permissionCell(e.level, e.scope, kindOf(r), { title: title })));
        });
      });
      return h('tr', { class: 'rm-user-row' + (inactive ? ' is-inactive' : '') + (changed ? ' is-dirty-row' : ''), dataset: { user: u.id } },
        h('th', { class: 'rm-u-name', scope: 'row' }, h('span', { class: 'rm-u-name-line' }, nameCell)),
        h('td', { class: 'rm-u-roles' }, roleCell), h('td', { class: 'rm-u-person' }, personCell(u)), h('td', { class: 'rm-u-team' }, teamCell(u)), cells);
    }

    // เลือกบทบาทของผู้ใช้ (Checkbox) · สิทธิ์ในแถวเปลี่ยนตามทันที
    function rolesPicker(u) {
      var cur0 = (draft.users.filter(function (x) { return x.id === u.id; })[0] || u).roleIds || [];
      return [h('h3', { class: 'popover-title' }, fill(U.rolesEdit, { name: u.name })), h('ul', { class: 'series-list rm-roles-list' }, sortedRoles().map(function (r) {
        var box = h('input', { type: 'checkbox', checked: cur0.indexOf(r.id) >= 0, value: r.id, class: 'rm-role-box', 'aria-label': r.name });
        box.addEventListener('change', function () {
          var now = ((draft.users.filter(function (x) { return x.id === u.id; })[0] || u).roleIds || []).filter(function (id) { return id !== r.id; });
          if (box.checked) now.push(r.id);
          setUser(u.id, { roleIds: sortedRoles().map(function (x) { return x.id; }).filter(function (id) { return now.indexOf(id) >= 0; }) });
        });
        return h('li', null, h('label', { class: 'series-option' }, box, h('span', { class: 'series-name' }, r.name)));
      }))];
    }
    function setUser(id, patch) {
      draft.users = draft.users.map(function (u) { if (u.id !== id) return u; var n = clone(u); Object.keys(patch).forEach(function (k) { n[k] = patch[k]; }); return n; });
      draw();
      if (drawerCtl.isOpen()) renderUser(id);
    }
    // + เพิ่มผู้ใช้: ชื่อ · เชื่อมกับบุคลากร (ไม่บังคับ) · บทบาท
    function addUserDialog(prev, err) {
      prev = prev || { roleIds: [] };
      var people = draft.people.filter(function (p) { return p.type !== 'team' && !p.userId && SP.core.calc.employedIn(p, month); });
      var name = h('input', { type: 'text', class: 'pm-input rm-user-new-name', value: prev.name || '', 'aria-label': U.name });
      var person = C.select({ label: U.person, value: prev.salesPersonId || '', className: 'rm-user-person', onChange: function (v) { if (v && !name.value.trim()) { var p = SP.core.calc.findById(people, v); if (p) name.value = p.name; } },
        options: [{ value: '', label: U.personNone }].concat(people.map(function (p) { return { value: p.id, label: p.name }; })) });
      var boxes = sortedRoles().map(function (r) {
        return h('label', { class: 'pr-check' }, h('input', { type: 'checkbox', value: r.id, checked: (prev.roleIds || []).indexOf(r.id) >= 0, class: 'rm-user-role' }), h('span', null, r.name));
      });
      var body = h('div', { class: 'rm-form' },
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, U.name), name),
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, U.person), person),
        h('div', { class: 'pd-field' }, h('span', { class: 'field-label' }, U.rolesLabel), h('span', { class: 'rm-role-boxes' }, boxes)),
        err ? h('p', { class: 'dlg-error', role: 'alert' }, err) : null);
      C.dialog({ title: U.addTitle, body: body, confirmLabel: U.add.replace(/^\+\s*/, '') }).then(function (r) {
        if (!r.ok) return;
        var roleIds = boxes.map(function (l) { return l.querySelector('input'); }).filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
        var p = person.value ? SP.core.calc.findById(people, person.value) : null;
        var v = { name: name.value.trim() || (p ? p.name : ''), salesPersonId: p ? p.id : '', roleIds: roleIds };
        if (!v.name) { addUserDialog(v, U.errors.name); return; }
        if (!roleIds.length) { addUserDialog(v, U.errors.roles); return; }
        var nid = 'u-' + Date.now().toString(36);
        draft.users = draft.users.concat([{ id: nid, name: v.name,
          roleIds: sortedRoles().map(function (x) { return x.id; }).filter(function (id) { return roleIds.indexOf(id) >= 0; }), active: true }]);
        if (p) { var lr = P.linkUser(draft.people, p.id, nid); if (lr.ok) draft.people = lr.people; }
        draw();
      });
    }

    // Drawer ผู้ใช้: ข้อมูล · สิทธิ์ที่มีผลจริง (ทุก Module) · ประวัติ
    function openUser(id) { userTab = 'info'; renderUser(id); drawerCtl.open(); }
    function renderUser(id) {
      var u = cur().users.filter(function (x) { return x.id === id; })[0];
      if (!u) { drawerCtl.close(); return; }
      C.clear(drawerCtl.head);
      C.clear(drawerCtl.body);
      var roles = sortedRoles().filter(function (r) { return (u.roleIds || []).indexOf(r.id) >= 0; });
      drawerCtl.head.appendChild(h('div', { class: 'pd-head' }, h('div', { class: 'pd-title' }, h('h2', null, u.name),
        h('div', { class: 'pd-meta' }, roles.map(function (r) { return h('span', { class: 'badge tag-muted' }, r.name); }),
          h('span', { class: 'badge ' + (u.active === false ? 'tag-muted' : 'tag-ok') }, U.statuses[u.active === false ? 'inactive' : 'active'])))));
      drawerCtl.body.appendChild(C.segmented({ label: u.name, value: userTab, options: ['info', 'effective', 'history'].map(function (t) { return { value: t, label: U.drawerTabs[t] }; }),
        onChange: function (v) { userTab = v; renderUser(id); } }));
      var body = h('div', { class: 'pd-body rm-user-body' });
      drawerCtl.body.appendChild(body);
      function field(label, content) { return h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, label), h('span', { class: 'pd-value' }, content)); }
      var I = U.info;
      if (userTab === 'info') {
        var homeId = u.active === false ? null : P.homePage(u, context());
        var person = personOf(u);
        body.appendChild(h('section', { class: 'pd-section' },
          field(I.name, u.name), field(I.roles, roles.map(function (r) { return r.name; }).join(' · ') || U.rolesNone),
          field(I.person, person ? person.name : '–'), field(I.team, teamCell(u) || '–'),
          field(I.home, homeId ? pageLabel(homeId) : '–'),
          field(I.status, [U.statuses[u.active === false ? 'inactive' : 'active'],
            editing ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm rm-u-toggle', onClick: function () { setUser(u.id, { active: u.active === false }); } }, u.active === false ? U.activate : U.deactivate) : null])));
      } else if (userTab === 'effective') {
        body.appendChild(h('p', { class: 'muted small' }, U.effectiveLead));
        var eff = effectiveOf(u);
        var EC = U.effectiveCols;
        SP.core.registry.groups.concat(['*']).forEach(function (g) {
          var res = P.resources(list).filter(function (r) { return g === '*' ? r.pageId === '*' : r.group === g; });
          if (!res.length) return;
          body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, groupLabel(g)), h('table', { class: 'data-table rm-effective' },
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, EC.res), h('th', { scope: 'col' }, EC.level), h('th', { scope: 'col' }, EC.from))),
            h('tbody', null, res.map(function (r) {
              var e = eff[r.id] || { level: 'NONE', scope: 'ALL', from: [] };
              return h('tr', { class: r.main || r.pageId === '*' ? null : 'is-sub' }, h('td', null, r.main || r.pageId === '*' ? resLabel(r) : r.label),
                h('td', { class: 'rm-cell' }, C.permissionCell(e.level, e.scope, kindOf(r))), h('td', null, e.from.map(roleName).join(', ') || '–'));
            })))));
        });
      } else {
        var list3 = (store.get('master.audit') || []).filter(function (e) { return e.entity === 'user' && e.key === u.name; }).reverse();
        body.appendChild(list3.length ? h('ol', { class: 'wf-history rm-history-list' }, list3.map(historyItem)) : h('p', { class: 'muted small' }, U.historyEmpty));
      }
    }

    // ------------------------------------------------------------------ บันทึก
    function save() {
      var S = page.save;
      var me = P.user();
      var v = P.validate(draft, me.id, list);
      if (!v.ok) { C.dialog({ title: S.noAdminTitle, lines: [S.noAdmin], confirmLabel: L.dialog.confirm }); return; }
      var sum = P.saveSummary(saved, draft, list);
      var lines = [fill(S.summary, { cells: sum.cells, roles: sum.roles, users: sum.users })];
      if (sum.roleChanges) lines.push(fill(S.roleChanges, { n: sum.roleChanges }));
      if (usersChanged()) lines.push(fill(S.userChanges, { n: usersChanged() }));
      C.dialog({ title: S.title, lines: lines, confirmLabel: S.confirm }).then(function (r) {
        if (!r.ok) return;
        if (!v.selfLockout) { commit(sum); return; }
        C.dialog({ title: S.selfTitle, lines: [fill(S.selfLine, { name: me.name })], confirmLabel: S.confirm, danger: true }).then(function (r2) { if (r2.ok) commit(sum); });
      });
    }
    function commit(sum) {
      var by = C.roleName(store.role()), at = SP.core.clock.now();
      var entries = [];
      var res = P.resources(list);
      sum.diffs.forEach(function (d) {
        var r = res.filter(function (x) { return x.id === d.resId; })[0] || { label: d.resId, pageId: d.resId };
        entries.push({ entity: 'permission', key: roleName(d.roleId) + ' · ' + resLabel(r), field: 'level', oldValue: levelText(d.from, r), newValue: levelText(d.to, r), by: by, at: at });
      });
      var byId = function (list2, id) { return list2.filter(function (x) { return x.id === id; })[0]; };
      draft.roles.forEach(function (role) {
        var o = byId(saved.roles, role.id);
        if (!o) { entries.push({ entity: 'role', key: role.name, field: 'create', oldValue: null, newValue: role.name, by: by, at: at }); return; }
        ['name', 'description', 'order'].forEach(function (f) { if ((o[f] || '') !== (role[f] || '')) entries.push({ entity: 'role', key: role.name, field: f, oldValue: o[f] == null ? null : String(o[f]), newValue: role[f] == null ? null : String(role[f]), by: by, at: at }); });
        var oh = P.homeIdOf(o), nh = P.homeIdOf(role);
        if (oh !== nh) entries.push({ entity: 'role', key: role.name, field: 'homePageId', oldValue: oh ? pageLabel(oh) : null, newValue: nh ? pageLabel(nh) : null, by: by, at: at });
      });
      saved.roles.forEach(function (o) { if (!byId(draft.roles, o.id)) entries.push({ entity: 'role', key: o.name, field: 'delete', oldValue: o.name, newValue: null, by: by, at: at }); });
      draft.users.forEach(function (u) {
        var o = byId(saved.users, u.id);
        if (!o) { entries.push({ entity: 'user', key: u.name, field: 'create', oldValue: null, newValue: (u.roleIds || []).map(roleName).join(', '), by: by, at: at }); return; }
        if (JSON.stringify(o.roleIds) !== JSON.stringify(u.roleIds)) entries.push({ entity: 'user', key: u.name, field: 'roleIds', oldValue: (o.roleIds || []).map(roleName).join(', '), newValue: (u.roleIds || []).map(roleName).join(', '), by: by, at: at });
        if ((o.active !== false) !== (u.active !== false)) entries.push({ entity: 'user', key: u.name, field: 'active', oldValue: U.statuses[o.active !== false ? 'active' : 'inactive'], newValue: U.statuses[u.active !== false ? 'active' : 'inactive'], by: by, at: at });
      });
      // CR-32: การผูกบุคลากร (person.userId)
      draft.people.forEach(function (p) {
        var o = byId(saved.people, p.id);
        if (o && (o.userId || null) !== (p.userId || null)) {
          var un = function (id) { var x = id ? byId(draft.users, id) || byId(saved.users, id) : null; return x ? x.name : null; };
          entries.push({ entity: 'person', key: p.id, field: 'userId', oldValue: un(o.userId), newValue: un(p.userId), by: by, at: at });
        }
      });
      store.set('master.roles', draft.roles);
      store.set('master.permissions', draft.perms);
      store.set('master.users', draft.users);
      if (JSON.stringify(saved.people) !== JSON.stringify(draft.people)) store.set('master.salespeople', draft.people);
      if (entries.length) store.appendAudit(entries);
      editing = false;
      C.guardUnsaved(null);
      location.reload();
    }

    // ------------------------------------------------------------------ ส่งออก ▾ (Permissions = เมทริกซ์ · Users = ผู้ใช้ × สิทธิ์ของ Module ที่เลือก)
    function exportSpec(source) {
      var X = page.exportSpec;
      var st = source === 'draft' && editing ? draft : saved;
      var roles = sortedRoles(st);
      var stamp = C.exportStamp(null);
      if (tab === 'users') {
        var module = moduleNow();
        var cols = [{ key: 'name', label: U.columns.name, value: function (u) { return u.name; }, width: 24 },
          { key: 'roles', label: U.columns.roles, value: function (u) { return roles.filter(function (r) { return (u.roleIds || []).indexOf(r.id) >= 0; }).map(function (r) { return r.name; }).join(', '); }, width: 24 },
          { key: 'person', label: U.columns.person, value: function (u) { var p = personOf(u, st); return p ? p.name : ''; }, width: 20 },
          { key: 'teams', label: U.columns.teams, value: function (u) { return teamsOf(u).join(', '); }, width: 20 },
          { key: 'status', label: U.statusFilter, value: function (u) { return U.statuses[u.active === false ? 'inactive' : 'active']; } }];
        modulePages(module).forEach(function (p) {
          p.res.forEach(function (r) {
            cols.push({ key: r.id, label: resLabel(r), width: 18, value: function (u) {
              var e = P.effectiveRows(u, context(st)).filter(function (x) { return x.res.id === r.id; })[0] || { level: 'NONE', scope: 'ALL' };
              return levelText(e, r);
            } });
          });
        });
        return { filename: fill(U.exportFile, { module: C.fileSafe(groupLabel(module)), date: stamp.date }),
          sheets: [{ name: U.exportSheet, header: C.exportHeader(store.year(), null, [[U.moduleFilter, groupLabel(module)]]), rows: filteredUsers(), columns: cols }] };
      }
      var rows = [];
      rowsModel().forEach(function (g) {
        g.rows.forEach(function (row) {
          if (row.kind !== 'res') return;
          var out = { group: g.label, page: row.res.pageId === '*' ? g.label : resPageLabel(row.res.pageId), res: row.res.main ? '' : row.res.label, id: row.res.id };
          roles.forEach(function (role) { out[role.id] = levelText(P.cell(st.perms, role, row.res), row.res); });
          rows.push(out);
        });
      });
      return {
        filename: fill(X.file, { date: stamp.date }),
        sheets: [{ name: X.sheet, header: C.exportHeader(store.year(), null), rows: rows,
          columns: [{ key: 'group', label: X.cols.group }, { key: 'page', label: X.cols.page, width: 30 }, { key: 'res', label: X.cols.res, width: 24 }, { key: 'id', label: X.cols.id }]
            .concat(roles.map(function (role) { return { key: role.id, label: role.name }; })) }]
      };
    }

    draw();
  }

  // CR-31: Permissions · Users ใช้ render เดียวกัน (เนื้อหาตาม id ของหน้า) · Roles = พาไปหน้า Permissions
  SP.modules.roleManagement = { render: render };
  SP.modules.roleRoles = { render: render };
  SP.modules.roleUsers = { render: render };
})(window.SP);

/*
 * modules/role-management/role-management.js — Role Management (CR-21 · CR-25) · แก้ได้เฉพาะผู้ดูแลระบบ (ค่าตั้งต้น)
 *
 * CR-25: 1 ไฟล์ 3 หน้าในกลุ่ม Role Management (ใช้สิทธิ์ roleManagement ร่วมกัน · ข้อความร่วมที่ content pages.roleManagement)
 *   Permissions = index.html (id roleManagement · เดิมแท็บสิทธิ์ตามหน้า) · Roles = roles/index.html (roleRoles) · Users = users/index.html (roleUsers)
 * หน้าที่:        Permissions · Roles · Users — ข้อมูลสิทธิ์และกฎทั้งหมดอยู่ใน core/permissions.js
 *                 Permissions: เมทริกซ์ แถว = หน้า (กลุ่มตามเมนูข้าง สิทธิ์ย่อยย่อหน้าเข้า + ส่งออก) × คอลัมน์ = บทบาท (ลำดับจากหน้า Roles)
 *                   หัวคอลัมน์มีบรรทัด เห็น {n} หน้า · แก้ไข {m} หน้า (permissions.roleSummary)
 *                   ช่อง = components.permChip (ดู · แก้ไข · ทีม / ✓ – ของปุ่มเฉพาะ) · ไม่เห็น = ช่องเทาว่าง · จุดมุม = ต่างจากค่าตั้งต้น
 *                   โหมดแก้ไข: คลิกช่อง → เมนูระดับ (+ ทุก Channel / เฉพาะทีม) · เมนูหัวคอลัมน์ ตั้งทั้งคอลัมน์ · คืนค่าตั้งต้นของบทบาท ·
 *                   หัวกลุ่ม ตั้งทั้ง Module · คืนค่าตั้งต้นทั้งตาราง / กฎสิทธิ์ย่อย (permissions.enforceRules) ปรับเองพร้อมแจ้ง
 *                   ตัวกรอง Module · บทบาท · เฉพาะที่ต่างจากค่าตั้งต้น / ดูตัวอย่างในมุมมองนี้ (เมนูหัวคอลัมน์ ทุกโหมด → หน้าเริ่มต้นของบทบาท)
 *                 Roles: ชื่อ · คำอธิบาย · หน้าเริ่มต้น · จำนวนผู้ใช้ · ประเภท / แก้ไข: + เพิ่มบทบาท (คัดลอกสิทธิ์) · แก้ชื่อ คำอธิบาย ·
 *                   หน้าเริ่มต้น (เลือกจากหน้าที่บทบาทเห็น permissions.rolePages) · ลบ (สร้างเอง ไม่มีผู้ใช้) · ลากจัดลำดับ
 *                 Users: ชื่อ · บทบาท (Chip) · ทีมขาย (master.teams ณ เดือนปัจจุบันจำลอง) · สถานะ / ตัวกรอง / แก้ไข: บทบาทหลายค่า · + เพิ่มผู้ใช้ · ปิดใช้งาน /
 *                   คลิกผู้ใช้ = Drawer สิทธิ์ที่มีผลจริง (permissions.effectiveRows)
 *                 บันทึก: permissions.validate (ต้องมีผู้แก้หน้านี้ได้ ≥ 1 คน · เอาสิทธิ์ตัวเองออก = ยืนยันซ้ำ) → สรุปผลกระทบ (saveSummary) →
 *                   store + master.audit → โหลดหน้าใหม่ (เมนู ตัวเลือกมุมมองผู้ใช้ และปุ่มทุกหน้าตามสิทธิ์ใหม่) / ส่งออก ▾ เมทริกซ์ (หน้า Permissions) /
 *                   ประวัติการแก้ไข ▾ (เฉพาะเรื่องของหน้านั้น: สิทธิ์ · บทบาท · ผู้ใช้)
 * อ่านจาก data/:  roles, permissions, permissionResources, users, teams, channels, content (pages.roleManagement, labels) + registry
 * store อ่าน:     master.roles, master.permissions, master.users, master.teams, master.salespeople, master.audit, ui.role, ui.currentMonth
 * store เขียน:    master.roles, master.permissions, master.users, master.audit (ตอนกด บันทึก) · ui.role (ดูตัวอย่างในมุมมองนี้)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var P = SP.core.permissions;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  // CR-25: หน้า → เนื้อหา (แท็บเดิมของ CR-21) · ประวัติการแก้ไขของหน้า
  var TAB_OF = { roleManagement: 'matrix', roleRoles: 'roles', roleUsers: 'users' };
  var AUDIT_OF = { matrix: ['permission'], roles: ['role'], users: ['user'] };
  var filters = { module: '', roles: [], diffOnly: false };
  var userFilters = { q: '', roles: [], channel: '', status: 'all' };

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function render(root, ctx) {
    var page = SP.data.content.pages.roleManagement;   // ข้อความที่ใช้ร่วมกันทั้ง 3 หน้า
    var tab = TAB_OF[ctx.entry && ctx.entry.id] || 'matrix';
    var M = page.matrix;
    var L = SP.data.content.labels;
    var list = SP.core.registry.list;
    var month = store.currentKey();
    var saved = { roles: P.rolesNow(), perms: P.permsNow(), users: P.usersNow() };
    var draft = clone(saved);
    var editing = false;
    var notice = null;
    var drawerCtl = C.drawer({ label: page.usersTab.effectiveTitle, className: 'rm-drawer' });

    function cur() { return editing ? draft : saved; }
    function sortedRoles() { return cur().roles.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
    function context(state) { state = state || cur(); return { roles: state.roles, perms: state.perms, users: state.users, list: list, month: month, teams: P.teamsNow() }; }
    function roleName(id) { var r = cur().roles.filter(function (x) { return x.id === id; })[0]; return r ? r.name : id; }
    function levelText(c, res) { return res.action ? (c.level === 'EDIT' ? L.perm.allowedText : L.perm.deniedText) : L.perm.levels[c.level] + (c.level === 'EDIT' && c.scope === 'TEAM' ? ' · ' + L.perm.teamText : ''); }
    function diffCount() {
      var s = P.saveSummary(saved, draft, list);
      return s.cells + s.roleChanges + usersChanged();
    }
    function usersChanged() {
      var n = 0;
      draft.users.forEach(function (u) { var o = saved.users.filter(function (x) { return x.id === u.id; })[0]; if (!o || JSON.stringify(o) !== JSON.stringify(u)) n++; });
      return n;
    }
    function dirty() { return editing ? diffCount() : 0; }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true,
      extra: h('span', { class: 'rm-head-tools' }, historyButton(), tab === 'matrix' ? C.exportButton({ unsaved: dirty, build: exportSpec }) : null),
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); notice = null; draw(); },
      onSave: save,
      onCancel: function () { editing = false; draft = clone(saved); notice = null; draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    // ------------------------------------------------------------------ ประวัติการแก้ไข ▾ (master.audit ของหน้านี้)
    function historyButton() {
      var btn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm rm-history' }, page.history + ' ▾');
      C.popover(btn, function () {
        var A = page.audit;
        var rows = (store.get('master.audit') || []).filter(function (e) { return AUDIT_OF[tab].indexOf(e.entity) >= 0; }).slice(-40).reverse();
        return [h('h3', { class: 'popover-title' }, page.history),
          rows.length ? h('ol', { class: 'wf-history rm-history-list' }, rows.map(function (e) {
            return h('li', null, h('span', { class: 'wf-history-when' }, e.at ? F.dateTime(e.at) : ''),
              h('span', { class: 'wf-history-what' }, (A[e.entity] || e.entity) + ' · ' + fill(page.historyLine, { key: e.key, field: A.fields[e.field] || e.field, old: e.oldValue == null ? '–' : e.oldValue, next: e.newValue == null ? '–' : e.newValue })),
              h('span', { class: 'muted small' }, e.by || ''));
          })) : h('p', { class: 'muted small' }, page.historyEmpty)];
      }, { className: 'wf-history-popover', label: page.history, align: 'right' });
      return btn;
    }

    // ------------------------------------------------------------------ วาดหน้า
    function draw() {
      C.clear(root);
      bar.update();
      root.appendChild(h('div', { class: 'tool-row rm-tabs' }, h('span', { class: 'master-hint rm-limit' }, page.limitNote)));
      if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); }
      if (tab === 'matrix') matrixTab();
      else if (tab === 'roles') rolesTab();
      else usersTab();
    }

    // ------------------------------------------------------------------ แท็บสิทธิ์ตามหน้า
    // แถว: กลุ่มเมนู → หน้า (สิทธิ์ของหน้า หรือหัวข้อของหน้าที่มีเฉพาะสิทธิ์ย่อย) → สิทธิ์ย่อย / ท้ายสุด = ทุกหน้า (ส่งออก)
    function rowsModel() {
      var res = P.resources(list);
      var groups = SP.core.registry.groups;
      var tour = SP.core.registry.tour();
      var out = [];
      groups.concat(['*']).forEach(function (g) {
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
          rows.push({ kind: 'res', res: r, label: r.main ? (st >= 0 ? (st + 1) + ' ' : '') + pageLabel(r.pageId) : r.label, indent: r.sub || !r.main && g !== '*' });
        });
        out.push({ group: g, label: g === '*' ? M.globalGroup : (SP.data.content.site.groups[g] || g), rows: rows });
      });
      return out;
    }
    function pageLabel(pageId) {
      var p = SP.data.content.pages[pageId];
      var e = SP.core.registry.byId(pageId);
      var t = (p && (p.short || p.title)) || (e && e.title) || pageId;
      return t.replace('{territoryChannels}', SP.data.channels.filter(function (c) { return c.allocationUnit === 'TERRITORY'; }).map(function (c) { return c.name; }).join(', '));
    }
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
    function choicesFor(res) {
      var X = M.choices;
      if (res.action) return res.scopable
        ? [['ALLOW_ALL', { level: 'EDIT', scope: 'ALL' }], ['ALLOW_TEAM', { level: 'EDIT', scope: 'TEAM' }], ['DENY', { level: 'NONE', scope: 'ALL' }]]
        : [['ALLOW', { level: 'EDIT', scope: 'ALL' }], ['DENY', { level: 'NONE', scope: 'ALL' }]];
      var base = [['NONE', { level: 'NONE', scope: 'ALL' }], ['VIEW', { level: 'VIEW', scope: 'ALL' }]];
      return base.concat(res.scopable ? [['EDIT_ALL', { level: 'EDIT', scope: 'ALL' }], ['EDIT_TEAM', { level: 'EDIT', scope: 'TEAM' }]] : [['EDIT', { level: 'EDIT', scope: 'ALL' }]]);
    }
    function setColumn(roleId, level) {
      var next = draft.perms;
      P.resources(list).forEach(function (r) {
        var v = r.action ? { level: level === 'EDIT' ? 'EDIT' : 'NONE', scope: 'ALL' } : { level: level, scope: 'ALL' };
        next = P.setCell(next, roleId, r.id, v);
      });
      applyPerms(next);
    }
    function setModule(group, level) {
      var next = draft.perms;
      var res = P.resources(list).filter(function (r) { return group === '*' ? r.pageId === '*' : r.group === group; });
      shownRoles().forEach(function (role) {
        res.forEach(function (r) { next = P.setCell(next, role.id, r.id, r.action ? { level: level === 'EDIT' ? 'EDIT' : 'NONE', scope: 'ALL' } : { level: level, scope: 'ALL' }); });
      });
      applyPerms(next);
    }
    function preview(roleId) {
      var u = cur().users.filter(function (x) { return x.active !== false && (x.roleIds || [])[0] === roleId; })[0]
        || cur().users.filter(function (x) { return x.active !== false && (x.roleIds || []).indexOf(roleId) >= 0; })[0];
      if (!u) { C.dialog({ title: M.previewNone, confirmLabel: L.dialog.confirm }); return; }
      if (!C.confirmDiscard(dirty())) return;
      editing = false;
      C.guardUnsaved(null);
      var n = P.normalize(u, context(saved));
      store.set('ui.role', P.ref(n));
      // CR-25: ไปหน้าเริ่มต้นของบทบาทนั้น (ไม่มี = หน้าเริ่มต้นของผู้ใช้ที่ index.html)
      var home = SP.core.registry.byId(P.roleHome(roleId, context(saved)));
      location.href = SP.core.paths.to(home ? home.path : 'index.html');
    }

    function matrixTab() {
      var roles = shownRoles();
      var roleOptions = sortedRoles().map(function (r) { return { value: r.id, label: r.name }; });
      var groups = SP.core.registry.groups.filter(function (g) { return P.resources(list).some(function (r) { return r.group === g; }); });
      var diffBox = h('input', { type: 'checkbox', checked: filters.diffOnly });
      diffBox.addEventListener('change', function () { filters.diffOnly = diffBox.checked; draw(); });
      root.appendChild(h('div', { class: 'tool-row rm-toolbar' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, M.moduleFilter), C.select({ label: M.moduleFilter, value: filters.module, className: 'rm-module',
          options: [{ value: '', label: M.moduleAll }].concat(groups.map(function (g) { return { value: g, label: SP.data.content.site.groups[g] || g }; })).concat([{ value: '*', label: M.globalGroup }]),
          onChange: function (v) { filters.module = v; draw(); } })),
        C.multiSelect({ label: M.roleFilter, allLabel: M.roleAll, selected: M.roleSelected, clear: L.series.clear, empty: L.series.empty, options: roleOptions, value: filters.roles,
          onChange: function (v) { filters.roles = v; draw(); } }),
        h('label', { class: 'rm-check' }, diffBox, h('span', null, M.diffOnly)),
        h('span', { class: 'tool-right' },
          h('span', { class: 'legend rm-legend' }, h('span', { class: 'rm-none rm-none-legend', 'aria-label': L.perm.levels.NONE }), h('span', { class: 'small' }, L.perm.levels.NONE), C.permChip({ level: 'VIEW' }), C.permChip({ level: 'EDIT' }), C.permChip({ level: 'EDIT', scope: 'TEAM' }),
            C.permChip({ level: 'EDIT', action: true }), C.permChip({ level: 'NONE', action: true }), h('span', { class: 'muted small' }, M.legend)),
          editing ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm rm-reset-all', onClick: function () {
            C.dialog({ title: M.resetAllConfirm, lines: [M.resetAllLine], confirmLabel: M.resetAll }).then(function (r) { if (r.ok) applyPerms(P.resetMatrix(draft.perms)); });
          } }, M.resetAll) : null)));
      if (notice) root.appendChild(h('p', { class: 'callout callout-info rm-notice', role: 'status' }, notice));

      var head = h('tr', null, h('th', { class: 'rm-page-col', scope: 'col' }, M.pageColumn), roles.map(function (role) {
        var menu = C.menuButton(function () {
          return [
            editing ? { label: fill(M.setColumn, { level: L.perm.levels.NONE }), onClick: function () { setColumn(role.id, 'NONE'); } } : null,
            editing ? { label: fill(M.setColumn, { level: L.perm.levels.VIEW }), onClick: function () { setColumn(role.id, 'VIEW'); } } : null,
            editing ? { label: fill(M.setColumn, { level: L.perm.levels.EDIT }), onClick: function () { setColumn(role.id, 'EDIT'); } } : null,
            editing ? { label: M.resetColumn, onClick: function () { applyPerms(P.resetMatrix(draft.perms, role.id)); } } : null,
            { label: M.preview, onClick: function () { preview(role.id); } }
          ];
        }, fill(M.columnMenu, { role: role.name }), { className: 'rm-col-menu', text: role.name + ' ▾', align: 'left' });
        var sum = P.roleSummary(role.id, context());
        return h('th', { class: 'rm-role-col', scope: 'col', title: role.description || role.name }, menu,
          h('small', { class: 'rm-role-sum', title: fill(M.summaryTip, { role: role.name }) }, fill(M.summary, { n: sum.seen, m: sum.edit })));
      }));
      var body = h('tbody');
      var st = cur();
      var total = 0;
      rowsModel().forEach(function (g) {
        if (filters.module && filters.module !== g.group) return;
        var rows = g.rows.filter(function (row) {
          if (!filters.diffOnly || row.kind === 'page') return true;
          return roles.some(function (role) { return !P.isDefault(st.perms, role, row.res); });
        });
        if (filters.diffOnly) rows = rows.filter(function (row, i) { return row.kind !== 'page' || (rows[i + 1] && rows[i + 1].kind === 'res' && rows[i + 1].res.pageId === row.pageId); });
        if (!rows.length) return;
        var gm = editing ? C.menuButton(['NONE', 'VIEW', 'EDIT'].map(function (lv) {
          return { label: fill(M.setModule, { level: L.perm.levels[lv], n: roles.length }), onClick: function () { setModule(g.group, lv); } };
        }), fill(M.moduleMenu, { group: g.label }), { className: 'rm-group-menu', text: '⋯' }) : null;
        body.appendChild(h('tr', { class: 'rm-group' }, h('th', { class: 'rm-page-col', scope: 'rowgroup' }, h('span', { class: 'rm-group-label' }, h('span', null, g.label), gm)), h('td', { colspan: String(roles.length) })));
        rows.forEach(function (row) {
          if (row.kind === 'page') { body.appendChild(h('tr', { class: 'rm-page-head' }, h('th', { class: 'rm-page-col', scope: 'row' }, row.label), h('td', { colspan: String(roles.length) }))); return; }
          total++;
          var res = row.res;
          body.appendChild(h('tr', { class: 'rm-row' + (row.indent ? ' is-sub' : '') },
            h('th', { class: 'rm-page-col', scope: 'row', title: res.id }, row.label),
            roles.map(function (role) {
              var c = P.cell(st.perms, role, res);
              var changed = !P.isDefault(st.perms, role, res);
              var cellTitle = fill(M.cellTitle, { role: role.name, res: row.label }) + ' · ' + levelText(c, res);
              // CR-25: ไม่เห็น (หน้าและสิทธิ์ย่อย) = ช่องเทาว่าง · ปุ่มเฉพาะยังเป็น ✓ / –
              var none = !res.action && c.level === 'NONE';
              var chip = none ? h('span', { class: 'rm-none' + (changed ? ' is-changed' : ''), title: cellTitle, 'aria-label': cellTitle })
                : C.permChip({ level: c.level, scope: c.scope, action: res.action, changed: changed, title: cellTitle });
              var tdCls = 'rm-cell' + (none ? ' is-none' : '');
              if (!editing) return h('td', { class: tdCls }, chip);
              var btn = C.menuButton(function () {
                return choicesFor(res).map(function (ch) {
                  var v = ch[1];
                  return { label: M.choices[ch[0]], current: v.level === c.level && v.scope === c.scope, onClick: function () { applyPerms(P.setCell(draft.perms, role.id, res.id, v)); } };
                });
              }, fill(M.cellTitle, { role: role.name, res: row.label }) + ' · ' + levelText(c, res), { className: 'rm-cell-btn', align: 'left' });
              C.clear(btn).appendChild(chip);
              return h('td', { class: tdCls + ' is-editable' }, btn);
            })));
        });
      });
      var card = h('div', { class: 'card fit-card rm-card' });
      card.appendChild(total ? h('div', { class: 'fit-scroll rm-scroll' }, h('table', { class: 'data-grid rm-matrix', style: { '--rm-cols': String(roles.length) } }, h('thead', null, head), body))
        : h('p', { class: 'grid-empty' }, M.empty));
      root.appendChild(card);
    }

    // ------------------------------------------------------------------ แท็บบทบาท
    function rolesTab() {
      var R = page.rolesTab;
      var roles = sortedRoles();
      var st = cur();
      var tools = editing ? h('div', { class: 'tool-row' }, h('button', { type: 'button', class: 'btn btn-primary btn-sm rm-add-role', onClick: addRoleDialog }, R.add)) : null;
      if (tools) root.appendChild(tools);
      var dragId = null;
      var body = h('tbody', null, roles.map(function (role, i) {
        var n = st.users.filter(function (u) { return (u.roleIds || []).indexOf(role.id) >= 0; }).length;
        var nameCell = role.name, descCell = role.description || '–';
        if (editing) {
          var nm = h('input', { type: 'text', class: 'pm-input rm-role-name', value: role.name, 'aria-label': R.name + ' ' + role.name });
          nm.addEventListener('change', function () {
            var res = P.renameRole(draft.roles, role.id, nm.value, null);
            if (!res.ok) { window.alert(R.errors[res.error]); nm.value = role.name; return; }
            draft.roles = res.roles; draw();
          });
          var ds = h('input', { type: 'text', class: 'pm-input rm-role-desc', value: role.description || '', 'aria-label': R.description + ' ' + role.name });
          ds.addEventListener('change', function () { draft.roles = P.renameRole(draft.roles, role.id, role.name, ds.value).roles; draw(); });
          nameCell = nm; descCell = ds;
        }
        var homeCell = homeOf(role);
        var blocked = role.system ? R.removeBlocked.system : n ? R.removeBlocked.hasUsers : null;
        var tr = h('tr', { class: 'rm-role-row', dataset: { id: role.id }, draggable: editing ? 'true' : null },
          h('td', { class: 'rm-order' }, editing ? h('span', { class: 'rm-drag', title: R.dragTitle, 'aria-hidden': 'true' }, '⋮⋮') : null, String(i + 1),
            editing ? h('span', { class: 'rm-move' },
              h('button', { type: 'button', class: 'icon-btn rm-up', title: R.up, 'aria-label': R.up + ' ' + role.name, disabled: i === 0, onClick: function () { draft.roles = P.reorderRoles(draft.roles, role.id, i - 1); draw(); } }, '↑'),
              h('button', { type: 'button', class: 'icon-btn rm-down', title: R.down, 'aria-label': R.down + ' ' + role.name, disabled: i === roles.length - 1, onClick: function () { draft.roles = P.reorderRoles(draft.roles, role.id, i + 1); draw(); } }, '↓')) : null),
          h('td', null, nameCell), h('td', null, descCell), h('td', { class: 'rm-home' }, homeCell),
          h('td', { class: 'num' }, fill(R.usersCount, { n: n })),
          h('td', null, h('span', { class: 'badge ' + (role.system ? 'tag-muted' : 'tag-ok') }, R.types[role.system ? 'system' : 'custom'])),
          editing ? h('td', { class: 'master-manage' }, C.trashButton({ label: R.remove, disabled: !!blocked, disabledTitle: blocked, confirmTitle: fill(R.removeConfirm, { name: role.name }),
            onConfirm: function () { var res = P.removeRole(draft, role.id); if (res.ok) { draft.roles = res.roles; draft.perms = res.perms; draw(); } } })) : null);
        if (editing) {
          tr.addEventListener('dragstart', function (e) { dragId = role.id; tr.classList.add('is-dragging'); if (e.dataTransfer) e.dataTransfer.setData('text/plain', role.id); });
          tr.addEventListener('dragend', function () { tr.classList.remove('is-dragging'); });
          tr.addEventListener('dragover', function (e) { e.preventDefault(); });
          tr.addEventListener('drop', function (e) {
            e.preventDefault();
            var id = dragId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
            if (id && id !== role.id) { draft.roles = P.reorderRoles(draft.roles, id, i); draw(); }
          });
        }
        return tr;
      }));
      var Cl = R.columns;
      root.appendChild(h('div', { class: 'card fit-card rm-card' }, h('div', { class: 'fit-scroll' }, h('table', { class: 'data-table rm-roles' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, Cl.order), h('th', { scope: 'col' }, Cl.name), h('th', { scope: 'col' }, Cl.description),
          h('th', { scope: 'col', title: R.homeTip }, h('span', { class: 'has-tip' }, Cl.home)),
          h('th', { scope: 'col', class: 'num' }, Cl.users), h('th', { scope: 'col' }, Cl.type), editing ? h('th', { scope: 'col' }, Cl.manage) : null)), body))));
    }
    // CR-25: หน้าเริ่มต้นของบทบาท — ดู: ชื่อหน้า (ค่าที่ตั้งไว้ใช้ไม่ได้ = อัตโนมัติ) / แก้ไข: Dropdown จากหน้าที่บทบาทเห็น (ตามสิทธิ์ใน draft)
    function homeOf(role) {
      var R = page.rolesTab;
      var c = context();
      var pages = P.rolePages(role.id, c);
      var set = P.homeIdOf(role);
      var ok = pages.some(function (e) { return e.id === set; });
      var auto = P.roleHome(role.id, c);
      if (!editing) return ok ? pageLabel(set) : auto ? fill(R.homeAuto, { page: pageLabel(auto) }) : R.homeNone;
      if (!pages.length) return R.homeNone;
      return C.select({ label: fill(R.homePick, { role: role.name }), value: ok ? set : auto || '', className: 'rm-home-select',
        options: pages.map(function (e) { return { value: e.id, label: pageLabel(e.id) }; }),
        onChange: function (v) { draft.roles = P.setRoleHome(draft.roles, role.id, v); draw(); } });
    }
    function addRoleDialog(prev, err) {
      var R = page.rolesTab;
      prev = prev || {};
      var name = h('input', { type: 'text', class: 'pm-input rm-new-name', value: prev.name || '', 'aria-label': R.name });
      var desc = h('input', { type: 'text', class: 'pm-input rm-new-desc', value: prev.description || '', 'aria-label': R.description });
      var from = C.select({ label: R.copyFrom, value: prev.copyFrom || '', className: 'rm-copy-from', onChange: function () {},
        options: [{ value: '', label: R.copyNone }].concat(sortedRoles().map(function (r) { return { value: r.id, label: r.name }; })) });
      var body = h('div', { class: 'rm-form' },
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, R.name), name),
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, R.description), desc),
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, R.copyFrom), from),
        err ? h('p', { class: 'dlg-error', role: 'alert' }, err) : null);
      C.dialog({ title: R.addTitle, body: body, confirmLabel: R.add.replace(/^\+\s*/, '') }).then(function (r) {
        if (!r.ok) return;
        var v = { name: name.value, description: desc.value, copyFrom: from.value };
        var res = P.addRole(draft, v.name, v.description, v.copyFrom || null, list);
        if (!res.ok) { addRoleDialog(v, R.errors[res.error]); return; }
        draft.roles = res.roles;
        draft.perms = res.perms;
        draw();
      });
    }

    // ------------------------------------------------------------------ แท็บผู้ใช้
    function teamText(u) {
      var U = page.usersTab;
      if (!u.salesPersonId) return U.noTeam;
      var parts = [];
      P.teamsNow().forEach(function (t) {
        P.membersOf([t], t.channelId, month).forEach(function (m) {
          if (m.salesPersonId !== u.salesPersonId) return;
          var ch = SP.data.channels.filter(function (c) { return c.id === t.channelId; })[0];
          parts.push(fill(U.teamLine, { channel: ch ? ch.name : t.channelId, role: L.roles[m.role === 'MANAGER' ? 'manager' : 'officer'] }));
        });
      });
      return parts.join(' · ') || U.noTeam;
    }
    function usersTab() {
      var U = page.usersTab;
      var st = cur();
      var roleOptions = sortedRoles().map(function (r) { return { value: r.id, label: r.name }; });
      var search = h('input', { type: 'search', class: 'search-input rm-user-search', placeholder: U.search, 'aria-label': U.search, value: userFilters.q });
      search.addEventListener('change', function () { userFilters.q = search.value; draw(); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') { userFilters.q = search.value; draw(); } });
      var channels = SP.data.channels.filter(function (c) { return P.teamsNow().some(function (t) { return t.channelId === c.id && t.members.length; }); });
      root.appendChild(h('div', { class: 'tool-row rm-toolbar' }, search,
        C.multiSelect({ label: U.roleFilter, allLabel: U.roleAll, selected: U.roleSelected, clear: L.series.clear, empty: L.series.empty, options: roleOptions, value: userFilters.roles,
          onChange: function (v) { userFilters.roles = v; draw(); } }),
        C.select({ label: U.channelFilter, value: userFilters.channel, className: userFilters.channel ? 'is-active' : '',
          options: [{ value: '', label: U.channelAll }].concat(channels.map(function (c) { return { value: c.id, label: c.name }; })).concat([{ value: '-', label: U.channelNone }]),
          onChange: function (v) { userFilters.channel = v; draw(); } }),
        C.select({ label: U.statusFilter, value: userFilters.status, options: ['all', 'active', 'inactive'].map(function (k) { return { value: k, label: U.statuses[k] }; }),
          onChange: function (v) { userFilters.status = v; draw(); } }),
        editing ? h('span', { class: 'tool-right' }, h('button', { type: 'button', class: 'btn btn-primary btn-sm rm-add-user', onClick: function () { addUserDialog(); } }, U.add)) : null));
      var q = userFilters.q.trim().toLowerCase();
      var rows = st.users.filter(function (u) {
        if (q && u.name.toLowerCase().indexOf(q) < 0) return false;
        if (userFilters.roles.length && !(u.roleIds || []).some(function (id) { return userFilters.roles.indexOf(id) >= 0; })) return false;
        if (userFilters.status === 'active' && u.active === false) return false;
        if (userFilters.status === 'inactive' && u.active !== false) return false;
        if (userFilters.channel) {
          var chs = u.salesPersonId ? P.teamChannels(P.teamsNow(), u.salesPersonId, month) : [];
          if (userFilters.channel === '-' ? chs.length : chs.indexOf(userFilters.channel) < 0) return false;
        }
        return true;
      });
      var Cl = U.columns;
      var body = h('tbody', null, rows.length ? rows.map(function (u) {
        var roleCell = (u.roleIds || []).length ? h('span', { class: 'rm-role-chips' }, sortedRoles().filter(function (r) { return (u.roleIds || []).indexOf(r.id) >= 0; }).map(function (r) {
          return h('span', { class: 'badge tag-muted rm-role-chip' }, r.name);
        })) : h('span', { class: 'text-short' }, U.noRoles);
        var statusCell = h('span', { class: 'badge ' + (u.active !== false ? 'tag-ok' : 'tag-muted') }, U.statuses[u.active !== false ? 'active' : 'inactive']);
        if (editing) {
          roleCell = C.multiSelect({ label: U.rolesPick, allLabel: U.rolesPickAll, selected: U.rolesPicked, clear: L.series.clear, empty: L.series.empty, options: roleOptions, value: (u.roleIds || []).slice(),
            onChange: function (v) { setUser(u.id, { roleIds: sortedRoles().map(function (r) { return r.id; }).filter(function (id) { return v.indexOf(id) >= 0; }) }); } });
          var box = h('input', { type: 'checkbox', checked: u.active !== false, 'aria-label': U.activeLabel + ' ' + u.name });
          box.addEventListener('change', function () { setUser(u.id, { active: box.checked }); });
          statusCell = h('label', { class: 'pm-check' }, box, h('span', null, U.activeLabel));
        }
        var o = saved.users.filter(function (x) { return x.id === u.id; })[0];
        var changed = editing && (!o || JSON.stringify(o) !== JSON.stringify(u));
        return h('tr', { class: 'rm-user-row' + (u.active === false ? ' is-inactive' : '') + (changed ? ' is-dirty-row' : '') },
          h('td', null, h('button', { type: 'button', class: 'link-btn rm-user-name', onClick: function () { openEffective(u.id); } }, u.name)),
          h('td', null, roleCell), h('td', null, teamText(u)), h('td', null, statusCell));
      }) : h('tr', null, h('td', { colspan: '4', class: 'master-empty' }, U.empty)));
      root.appendChild(h('div', { class: 'card fit-card rm-card' }, h('div', { class: 'fit-scroll' }, h('table', { class: 'data-table rm-users' },
        h('thead', null, h('tr', null, ['name', 'roles', 'teams', 'status'].map(function (k) { return h('th', { scope: 'col' }, Cl[k]); }))), body))));
    }
    function setUser(id, patch) {
      draft.users = draft.users.map(function (u) { if (u.id !== id) return u; var n = clone(u); Object.keys(patch).forEach(function (k) { n[k] = patch[k]; }); return n; });
      draw();
    }
    function addUserDialog(prev, err) {
      var U = page.usersTab;
      prev = prev || { source: 'sales', roleIds: [] };
      var taken = draft.users.map(function (u) { return u.salesPersonId; }).filter(Boolean);
      var people = (store.get('master.salespeople') || []).filter(function (p) { return taken.indexOf(p.id) < 0 && SP.core.calc.employedIn(p, month); });
      var srcSel = C.select({ label: U.source, value: prev.source, className: 'rm-user-source', onChange: function (v) { personWrap.hidden = v !== 'sales'; nameWrap.hidden = v === 'sales'; },
        options: [{ value: 'sales', label: U.sourceSales }, { value: 'other', label: U.sourceOther }] });
      var person = C.select({ label: U.person, value: prev.salesPersonId || '', className: 'rm-user-person', onChange: function () {},
        options: [{ value: '', label: U.personPlaceholder }].concat(people.map(function (p) { return { value: p.id, label: p.name }; })) });
      var name = h('input', { type: 'text', class: 'pm-input rm-user-new-name', value: prev.name || '', 'aria-label': U.name });
      var picked = (prev.roleIds || []).slice();
      var boxes = sortedRoles().map(function (r) {
        var b = h('input', { type: 'checkbox', value: r.id, checked: picked.indexOf(r.id) >= 0, class: 'rm-user-role' });
        return h('label', { class: 'pr-check' }, b, h('span', null, r.name));
      });
      var personWrap = h('label', { class: 'pd-field', hidden: prev.source !== 'sales' }, h('span', { class: 'field-label' }, U.person), person);
      var nameWrap = h('label', { class: 'pd-field', hidden: prev.source === 'sales' }, h('span', { class: 'field-label' }, U.name), name);
      var body = h('div', { class: 'rm-form' },
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, U.source), srcSel), personWrap, nameWrap,
        h('div', { class: 'pd-field' }, h('span', { class: 'field-label' }, U.rolesPick), h('span', { class: 'rm-role-boxes' }, boxes)),
        err ? h('p', { class: 'dlg-error', role: 'alert' }, err) : null);
      C.dialog({ title: U.addTitle, body: body, confirmLabel: U.add.replace(/^\+\s*/, '') }).then(function (r) {
        if (!r.ok) return;
        var roleIds = boxes.map(function (l) { return l.querySelector('input'); }).filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
        var v = { source: srcSel.value, salesPersonId: person.value, name: name.value, roleIds: roleIds };
        var p = SP.core.calc.findById(store.get('master.salespeople'), v.salesPersonId);
        if (v.source === 'sales' && !p) { addUserDialog(v, U.errors.person); return; }
        if (v.source === 'other' && !v.name.trim()) { addUserDialog(v, U.errors.name); return; }
        if (!roleIds.length) { addUserDialog(v, U.errors.roles); return; }
        draft.users = draft.users.concat([{ id: 'u-' + Date.now().toString(36), name: v.source === 'sales' ? p.name : v.name.trim(), salesPersonId: v.source === 'sales' ? p.id : null,
          roleIds: sortedRoles().map(function (x) { return x.id; }).filter(function (id) { return roleIds.indexOf(id) >= 0; }), active: true }]);
        draw();
      });
    }
    function openEffective(userId) {
      var U = page.usersTab;
      var u = cur().users.filter(function (x) { return x.id === userId; })[0];
      if (!u) return;
      C.clear(drawerCtl.head);
      C.clear(drawerCtl.body);
      drawerCtl.head.appendChild(h('div', { class: 'pd-head' }, h('div', { class: 'pd-title' }, h('h2', null, fill(U.effectiveTitle, { name: u.name })),
        h('p', { class: 'muted small' }, (u.roleIds || []).map(roleName).join(' · ') || U.noRoles))));
      if (u.active === false) drawerCtl.body.appendChild(h('p', { class: 'callout callout-info' }, U.inactiveNote));
      drawerCtl.body.appendChild(h('p', { class: 'muted small' }, U.effectiveLead));
      var rows = P.effectiveRows(u, context());
      var EC = U.effectiveCols;
      drawerCtl.body.appendChild(h('table', { class: 'data-table rm-effective' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, EC.res), h('th', { scope: 'col' }, EC.level), h('th', { scope: 'col' }, EC.from))),
        h('tbody', null, rows.map(function (r) {
          var label = r.res.pageId === '*' ? r.res.label : r.res.main ? pageLabel(r.res.pageId) : pageLabel(r.res.pageId) + ' › ' + r.res.label;
          return h('tr', null, h('td', null, label), h('td', null, C.permChip({ level: r.level, scope: r.scope, action: r.res.action })), h('td', null, r.from.map(roleName).join(', ') || '–'));
        }))));
      drawerCtl.open();
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
      C.dialog({ title: S.title, lines: lines, confirmLabel: S.confirm }).then(function (r) {
        if (!r.ok) return;
        if (!v.selfLockout) { commit(sum); return; }
        C.dialog({ title: S.selfTitle, lines: [fill(S.selfLine, { name: me.name })], confirmLabel: S.confirm, danger: true }).then(function (r2) { if (r2.ok) commit(sum); });
      });
    }
    function commit(sum) {
      var by = C.roleName(store.role()), at = new Date().toISOString();
      var entries = [];
      var res = P.resources(list);
      sum.diffs.forEach(function (d) {
        var r = res.filter(function (x) { return x.id === d.resId; })[0] || { label: d.resId, pageId: d.resId };
        var label = r.pageId === '*' ? r.label : r.main ? pageLabel(r.pageId) : pageLabel(r.pageId) + ' › ' + r.label;
        entries.push({ entity: 'permission', key: roleName(d.roleId) + ' · ' + label, field: 'level', oldValue: levelText(d.from, r), newValue: levelText(d.to, r), by: by, at: at });
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
        if ((o.active !== false) !== (u.active !== false)) entries.push({ entity: 'user', key: u.name, field: 'active', oldValue: page.usersTab.statuses[o.active !== false ? 'active' : 'inactive'], newValue: page.usersTab.statuses[u.active !== false ? 'active' : 'inactive'], by: by, at: at });
      });
      store.set('master.roles', draft.roles);
      store.set('master.permissions', draft.perms);
      store.set('master.users', draft.users);
      if (entries.length) store.appendAudit(entries);
      editing = false;
      C.guardUnsaved(null);
      location.reload();
    }

    // ------------------------------------------------------------------ ส่งออก ▾ (เมทริกซ์)
    function exportSpec(source) {
      var X = page.exportSpec;
      var st = source === 'draft' && editing ? draft : saved;
      var roles = st.roles.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      var rows = [];
      rowsModel().forEach(function (g) {
        g.rows.forEach(function (row) {
          if (row.kind !== 'res') return;
          var out = { group: g.label, page: row.res.pageId === '*' ? g.label : pageLabel(row.res.pageId), res: row.res.main ? '' : row.res.label, id: row.res.id };
          roles.forEach(function (role) { out[role.id] = levelText(P.cell(st.perms, role, row.res), row.res); });
          rows.push(out);
        });
      });
      var stamp = C.exportStamp(null);
      return {
        filename: fill(X.file, { date: stamp.date }),
        sheets: [{ name: X.sheet, header: C.exportHeader(store.year(), null), rows: rows,
          columns: [{ key: 'group', label: X.cols.group }, { key: 'page', label: X.cols.page, width: 30 }, { key: 'res', label: X.cols.res, width: 24 }, { key: 'id', label: X.cols.id }]
            .concat(roles.map(function (role) { return { key: role.id, label: role.name }; })) }]
      };
    }

    draw();
  }

  // CR-25: 3 หน้าใช้ render เดียวกัน (เนื้อหาตาม id ของหน้า)
  SP.modules.roleManagement = { render: render };
  SP.modules.roleRoles = { render: render };
  SP.modules.roleUsers = { render: render };
})(window.SP);

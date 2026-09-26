/*
 * core/permissions.js — บทบาทและสิทธิ์แยกตาม Module ที่เดียวทั้งเว็บ (CR-19 · CR-21 สิทธิ์เป็นข้อมูลที่แก้ได้จากหน้าบทบาทและสิทธิ์)
 *
 * ข้อมูล (store → ค่าตั้งต้นใน data/): master.roles (SP.data.roles) · master.permissions (SP.data.permissions) · master.users (SP.data.users) ·
 *   master.teams (SP.data.teams) / รายการสิทธิ์ (resource) สร้างจาก core/registry.js + SP.data.permissionResources (ห้ามพิมพ์ซ้ำ)
 * ระดับ: NONE (ไม่เห็น) < VIEW (ดู) < EDIT (แก้ไข) · ขอบเขต ALL (ทุก Channel) | TEAM (เฉพาะ Channel ที่เป็นสมาชิกทีม ณ เดือน)
 *   ปุ่มเฉพาะ (action) = NONE | EDIT (ไม่อนุญาต / อนุญาต) / ไม่ระบุ = defaultLevel ของบทบาท (ไม่มี = VIEW · action NONE) — ผู้ดูแลระบบ EDIT ทุกรายการ
 *   ผู้ใช้หลายบทบาท = สิทธิ์สูงสุด (EDIT > VIEW > NONE · ALL > TEAM) / ผู้ใช้ที่ปิดใช้งาน = NONE ทุกรายการ
 *   สิทธิ์ใน Prototype ทำงานเฉพาะฝั่งหน้าจอ (ซ่อนปุ่มและเมนู) ระบบจริงต้องตรวจสิทธิ์ที่ Backend ด้วย
 *   ผู้รับผิดชอบหน่วยขาย (data/assignments.js) ใช้แสดงผลและคำนวณผลงานเท่านั้น ไม่ใช้กำหนดสิทธิ์
 * user = { id, name, roleIds, personId, type (บทบาทแรก), channelId (ทีมแรก), active } — ui.role = { userId, type, personId, channelId }
 *   ค่าจากรุ่นก่อน: { type } → ผู้ใช้คนแรกของบทบาทนั้น · 'sales' → ผู้ใช้ของ Sales Person นั้น · 'trade' (Trade Marketing เลิกใช้) → ทีม Product
 *
 *   can(user, resourceId, context) → bool (แก้ได้) · level(user, resourceId, context) → 'NONE' | 'VIEW' | 'EDIT' (TEAM นอกทีม = VIEW)
 *     context = { channelId, month, teams, roles, perms, users, list } (ไม่ระบุ = ค่าปัจจุบันใน store)
 *     รูปแบบ CR-19 ยังใช้ได้: can(user, 'edit' | 'view', { module }) (topDownTotal · topDownUnits · npdFromSku ฯลฯ แปลงเป็น resource)
 *   CR-23: annualTarget (Annual Target) แทน topdown.channel · unitTargets (Sub-channel Allocation) แทน topdown.unit + phasing —
 *     migratePerms แปลงค่าที่บันทึกไว้เดิม (ค่าที่สูงกว่า) แล้วลบ Key เดิม · permsNow เขียนค่าที่แปลงแล้วกลับ store ครั้งเดียว
 *   canAny · access (ระดับ + ขอบเขต + บทบาทที่ให้สิทธิ์) · pageLevel / pageVisible / visibleEntries (เมนูข้างและ Stepper)
 *   CR-25: หน้าที่ registry ตั้ง perm ใช้สิทธิ์ของหน้านั้น (Roles · Users → roleManagement) · หน้า open เห็นเสมอ ไม่อยู่ในเมทริกซ์ (เกี่ยวกับ Prototype)
 *     menuFor (เมนูข้างตามผู้ใช้ กลุ่มที่ไม่เหลือหน้าไม่แสดง) · homePage (หน้าเริ่มต้น = homePageId ของบทบาทแรกตามลำดับบทบาทที่เห็นได้ →
 *     ขั้นแรกของ Sales Planning ที่เห็น → หน้าแรกในเมนู) · roleHome / rolePages (หน้า Roles) · roleSummary (เห็น n · แก้ไข m หน้า) ·
 *     switchTarget (สลับมุมมองผู้ใช้: หน้าเดิมยังเห็น = อยู่ต่อ ไม่อย่างนั้นไปหน้าเริ่มต้น) · setRoleHome
 *   pageModules(pageId) / stepModules(step) · editors · firstEditor · teamBlocked · user / normalize · directory · roleTitle
 *   resources(list) · cell · defaultCell · isDefault · setCell · enforceRules · copyRole · resetMatrix · diffCells · saveSummary · validate ·
 *   addRole · removeRole · renameRole · reorderRoles · effectiveRows (Pure functions — หน้าบทบาทและสิทธิ์)
 *   ทีมขาย: membersOf · isMember · teamChannels · channelsOf · teamFirst · addMember / endMember / removeMember (CR-19)
 * อ่านจาก data/:  settings (DEFAULT_ROLE), roles, permissions, permissionResources, users, teams, channels, content (ชื่อหน้า)
 * store อ่าน:     master.roles, master.permissions, master.users, master.teams, ui.role, ui.currentMonth (store.currentKey())
 */
(function (SP) {
  'use strict';

  var LEVELS = ['NONE', 'VIEW', 'EDIT'];
  // CR-19 → CR-21: ชื่อ Module เดิมที่ Module ต่างๆ ยังเรียก
  var ALIASES = {
    topDownTotal: 'annualTarget', topDownUnits: 'unitTargets', 'topdown.channel': 'annualTarget', 'topdown.unit': 'unitTargets', phasing: 'unitTargets',
    npdFromSku: 'skuPlan.createNpd', clearance: 'listing.clearance'
  };
  var STEPS = { topDown: ['annualTarget'], phasing: ['unitTargets'], sku: ['skuPlan'], forecast: ['skuPlan'] };
  // CR-23: Key เดิมของสิทธิ์ที่รวมเป็น resource ใหม่
  var LEGACY = { annualTarget: ['topdown.channel'], unitTargets: ['topdown.unit', 'phasing'] };

  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function store() { return SP.core.store; }
  function rank(level) { return Math.max(0, LEVELS.indexOf(level)); }
  function inRange(month, from, to) { return (!from || from <= month) && (!to || month <= to); }
  function addMonths(key, n) {
    var y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7)) - 1 + n;
    y += Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    return y + '-' + (m < 9 ? '0' : '') + (m + 1);
  }
  function fromStore(key, fallback) { var s = store(); var v = s ? s.get(key) : null; return v || copy(fallback); }

  // ---------------------------------------------------------------------
  // แหล่งข้อมูล (context → store → ค่าตั้งต้นใน data/)
  // ---------------------------------------------------------------------
  function rolesNow() { return fromStore('master.roles', SP.data.roles || []); }
  function permsNow() {
    var s = store();
    var v = s ? s.get('master.permissions') : null;
    if (!v) return copy(SP.data.permissions || {});
    var m = migratePerms(v);
    if (m.changed) s.set('master.permissions', m.perms);
    return m.perms;
  }
  // CR-23: สิทธิ์ที่บันทึกก่อน CR-23 → { perms, changed } (Pure) — topdown.channel → annualTarget · topdown.unit / phasing (ค่าที่สูงกว่า) → unitTargets
  //   แล้วลบ Key เดิม / บทบาทที่ตั้งค่าใหม่ไว้แล้วคงค่าใหม่
  function migratePerms(perms) {
    var out = copy(perms || {});
    var changed = false;
    function higher(a, b) {
      if (!a) return b;
      var ra = rank(a.level), rb = rank(b.level);
      if (ra !== rb) return ra > rb ? a : b;
      return a.scope === 'TEAM' ? b : a;
    }
    Object.keys(out).forEach(function (roleId) {
      var row = out[roleId];
      if (!row) return;
      Object.keys(LEGACY).forEach(function (to) {
        var best = null;
        LEGACY[to].forEach(function (from) {
          if (!row[from]) return;
          best = higher(best, row[from]);
          delete row[from];
          changed = true;
        });
        if (best && !row[to]) row[to] = { level: best.level, scope: best.scope || 'ALL' };
      });
    });
    return { perms: out, changed: changed };
  }
  function usersNow() { return fromStore('master.users', SP.data.users || []); }
  function teamsNow() { return fromStore('master.teams', SP.data.teams || []); }
  function monthNow() { var s = store(); return s ? s.currentKey() : null; }
  function listNow() { return SP.core.registry ? SP.core.registry.list : []; }
  function src(context) {
    context = context || {};
    return {
      roles: sortRoles(context.roles || rolesNow()), perms: context.perms || permsNow(), users: context.users || usersNow(),
      teams: context.teams || teamsNow(), month: context.month || monthNow(), list: context.list || listNow(), channelId: context.channelId || null
    };
  }
  function sortRoles(roles) { return (roles || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
  function roleById(roles, id) { return (roles || []).filter(function (r) { return r.id === id; })[0] || null; }

  // ---------------------------------------------------------------------
  // รายการสิทธิ์ (resource) = หน้าใน registry ตามลำดับเมนู + สิทธิ์ย่อย (data/permissions.js) + สิทธิ์ทุกหน้า (ส่งออก)
  // → [{ id, pageId, label, main, parent, scopable, action, group, sub }] label ของหน้า = ชื่อหน้าใน content.js (ไม่มี = ชื่อใน registry)
  // ---------------------------------------------------------------------
  function resources(list) {
    list = list || listNow();
    var cfg = SP.data.permissionResources || { pages: {}, global: [] };
    var groups = SP.core.registry ? SP.core.registry.groups : [];
    var pages = SP.data.content && SP.data.content.pages ? SP.data.content.pages : {};
    // CR-25: หน้าที่ใช้สิทธิ์ของหน้าอื่น (perm) และหน้าที่เห็นเสมอ (open) ไม่มีแถวในเมทริกซ์
    var entries = list.filter(function (e) { return e.group && !e.perm && !e.open; }).slice().sort(function (a, b) {
      return (groups.indexOf(a.group) - groups.indexOf(b.group)) || ((a.tour == null ? 999 : a.tour) - (b.tour == null ? 999 : b.tour)) || (list.indexOf(a) - list.indexOf(b));
    });
    var out = [];
    entries.forEach(function (e) {
      var title = (pages[e.id] && pages[e.id].title) || e.title;
      var subs = cfg.pages[e.id];
      if (!subs) { out.push({ id: e.id, pageId: e.id, label: title, main: true, parent: null, scopable: false, action: false, group: e.group, sub: false }); return; }
      var main = subs.filter(function (s) { return s.main; })[0];
      subs.forEach(function (s) {
        out.push({ id: s.id, pageId: e.id, label: s.label, main: !!s.main, parent: s.main ? null : (main ? main.id : null), scopable: !!s.scopable, action: !!s.action, group: e.group, sub: !s.main });
      });
    });
    (cfg.global || []).forEach(function (s) { out.push({ id: s.id, pageId: '*', label: s.label, main: false, parent: null, scopable: !!s.scopable, action: !!s.action, group: null, sub: false }); });
    return out;
  }
  function resourceById(list, id) { return resources(list).filter(function (r) { return r.id === id; })[0] || null; }

  // ---------------------------------------------------------------------
  // ช่องของเมทริกซ์ (บทบาท × resource)
  // ---------------------------------------------------------------------
  function defaultCell(role, res) {
    if (role && role.defaultLevel === 'EDIT') return { level: 'EDIT', scope: 'ALL' };
    return { level: res && res.action ? 'NONE' : ((role && role.defaultLevel) || 'VIEW'), scope: 'ALL' };
  }
  function normCell(c, res) {
    var level = LEVELS.indexOf(c.level) >= 0 ? c.level : 'VIEW';
    if (res && res.action && level === 'VIEW') level = 'NONE';
    return { level: level, scope: res && res.scopable && c.scope === 'TEAM' && level === 'EDIT' ? 'TEAM' : 'ALL' };
  }
  function cell(perms, role, res) {
    var row = perms && role ? perms[role.id] : null;
    var c = row && res ? row[res.id] : null;
    return normCell(c || defaultCell(role, res), res);
  }
  function defaultPerms() { return copy(SP.data.permissions || {}); }
  function sameCell(a, b) { return a.level === b.level && a.scope === b.scope; }
  function isDefault(perms, role, res) {
    var base = SP.data.roles && roleById(SP.data.roles, role.id) ? cell(defaultPerms(), role, res) : cell({}, role, res);
    return sameCell(cell(perms, role, res), base);
  }

  // ---------------------------------------------------------------------
  // ผู้ใช้
  // ---------------------------------------------------------------------
  function normalize(raw, context) {
    var S = src(context);
    var users = S.users;
    var def = (SP.data.settings && SP.data.settings.DEFAULT_ROLE) || 'director';
    var u = null;
    if (raw && raw.roleIds) u = raw;
    else if (raw && raw.userId) u = users.filter(function (x) { return x.id === raw.userId; })[0] || null;
    if (!u) {
      var type = raw && raw.type ? (raw.type === 'trade' ? 'product' : raw.type) : def;
      if (type !== 'sales' && !roleById(S.roles, type)) type = def;   // บทบาทที่ไม่รู้จัก = บทบาทตั้งต้น
      var pid = raw && raw.personId ? raw.personId : null;
      if (pid) u = users.filter(function (x) { return x.salesPersonId === pid; })[0] || null;
      if (!u && type !== 'sales') u = users.filter(function (x) { return x.active !== false && (x.roleIds || []).indexOf(type) >= 0; })[0] || null;
      if (!u) u = { id: null, name: '', salesPersonId: pid, roleIds: type === 'sales' ? ['officer'] : [type], active: true };
    }
    var personId = u.salesPersonId !== undefined ? u.salesPersonId : (u.personId || null);
    var chs = personId ? teamChannels(S.teams, personId, S.month) : [];
    var anyCh = personId && !chs.length ? (S.teams || []).filter(function (t) { return t.members.some(function (m) { return m.salesPersonId === personId; }); }).map(function (t) { return t.channelId; }) : chs;
    var wantCh = raw && raw.channelId && anyCh.indexOf(raw.channelId) >= 0 ? raw.channelId : (anyCh[0] || null);
    var roleIds = sortRoles((u.roleIds || []).map(function (id) { return roleById(S.roles, id) || { id: id, order: 999 }; })).map(function (r) { return r.id; });
    return { id: u.id || null, name: u.name || '', roleIds: roleIds, personId: personId, type: roleIds[0] || def, channelId: wantCh, active: u.active !== false };
  }
  function user(raw) { return normalize(raw === undefined ? (store() ? store().role() : null) : raw); }
  function ref(u) { return { userId: u.id, type: u.type, personId: u.personId || null, channelId: u.channelId || null }; }

  // ---------------------------------------------------------------------
  // สิทธิ์ของผู้ใช้
  // ---------------------------------------------------------------------
  function resolveId(id) { return ALIASES[id] || id; }
  function lookupRes(S, id) {
    var list = resources(S.list);
    var r = list.filter(function (x) { return x.id === id; })[0];
    if (r) return r;
    // หน้าที่ไม่อยู่ในรายการ (เช่น หน้า Test) = หน้าทั่วไปที่ไม่มีค่ากำหนด
    return { id: id, pageId: id, label: id, main: true, parent: null, scopable: false, action: false, group: null, sub: false };
  }
  // ระดับ + ขอบเขต + บทบาทที่ให้สิทธิ์ (รวมทุกบทบาทแบบสูงสุด) → { level, scope, from: [roleId] }
  function access(raw, resourceId, context) {
    var S = src(context);
    var u = normalize(raw, S);
    var res = lookupRes(S, resolveId(resourceId));
    if (!u.active) return { level: 'NONE', scope: 'ALL', from: [] };
    var best = { level: 'NONE', scope: 'ALL', from: [] };
    u.roleIds.forEach(function (id) {
      var role = roleById(S.roles, id);
      if (!role) return;
      var c = cell(S.perms, role, res);
      var r = rank(c.level), br = rank(best.level);
      if (r > br || (r === br && r === 2 && best.scope === 'TEAM' && c.scope === 'ALL')) best = { level: c.level, scope: c.scope, from: [id] };
      else if (r === br && r > 0 && c.scope === best.scope) best.from.push(id);
    });
    return best;
  }
  // ระดับที่มีผล: EDIT + TEAM ใช้ได้เฉพาะ Channel ที่เป็นสมาชิกทีม ณ เดือน (ไม่ระบุ Channel = ต้องเป็นสมาชิกทีมใดทีมหนึ่ง) นอกทีม = VIEW
  function level(raw, resourceId, context) {
    var S = src(context);
    var u = normalize(raw, S);
    var a = access(u, resourceId, S);
    if (a.level !== 'EDIT' || a.scope !== 'TEAM') return a.level;
    var ok = S.channelId ? isMember(S.teams, S.channelId, u.personId, S.month) : !!(u.personId && teamChannels(S.teams, u.personId, S.month).length);
    return ok ? 'EDIT' : 'VIEW';
  }
  function can(raw, a, b) {
    if (a === 'edit' || a === 'view') {
      var ctx = b || {};
      var lv = level(raw, ctx.module, ctx);
      return a === 'view' ? lv !== 'NONE' : lv === 'EDIT';
    }
    return level(raw, a, b) === 'EDIT';
  }
  function canAny(raw, ids, context) { return (ids || []).some(function (id) { return can(raw, id, context); }); }
  // มีสิทธิ์แก้แบบเฉพาะทีมแต่หน่วยขายนี้อยู่นอกทีม (ข้อความ "หน่วยขายนี้อยู่ในทีม {Channel}")
  function teamBlocked(raw, ids, context) {
    var S = src(context);
    return !!S.channelId && (ids || []).some(function (id) { var a = access(raw, id, S); return a.level === 'EDIT' && a.scope === 'TEAM'; }) && !canAny(raw, ids, S);
  }

  // CR-25: หน้าใน registry ของ context (null = ไม่อยู่ในรายการ เช่น หน้า Test) · id ของหน้าที่ถือสิทธิ์ (perm)
  function entryOf(S, pageId) { return (S.list || []).filter(function (e) { return e.id === pageId; })[0] || null; }
  function permPage(S, pageId) { var e = entryOf(S, pageId); return e && e.perm ? e.perm : pageId; }
  // หน้า: ระดับสูงสุดของสิทธิ์ในหน้า (ไม่นับปุ่มเฉพาะ) / NONE = ไม่แสดงในเมนู Stepper และลิงก์ / หน้า open = VIEW เสมอ
  function pageLevel(raw, pageId, context) {
    var S = src(context);
    var u = normalize(raw, S);
    var entry = entryOf(S, pageId);
    if (entry && entry.open) return 'VIEW';
    var target = permPage(S, pageId);
    var list = resources(S.list).filter(function (r) { return r.pageId === target && !r.action; });
    if (!list.length) list = [lookupRes(S, target)];
    var best = 'NONE';
    list.forEach(function (r) { var lv = access(u, r.id, S).level; if (rank(lv) > rank(best)) best = lv; });
    return best;
  }
  function pageVisible(raw, pageId, context) { return pageLevel(raw, pageId, context) !== 'NONE'; }
  function visibleEntries(list, raw, context) {
    var S = src(context);
    S.list = list || S.list;
    return (list || []).filter(function (e) { return pageVisible(raw, e.id, S); });
  }
  function pageModules(pageId, context) {
    var S = src(context);
    if (!(S.list || []).some(function (e) { return e.id === pageId; })) return null;
    var target = permPage(S, pageId);
    return resources(S.list).filter(function (r) { return r.pageId === target && !r.action; }).map(function (r) { return r.id; });
  }

  // ---------------------------------------------------------------------
  // CR-25: เมนูข้าง · หน้าเริ่มต้นของบทบาท · สรุปต่อบทบาท (Pure — context เหมือน can)
  // ---------------------------------------------------------------------
  function groupsNow() { return SP.core.registry ? SP.core.registry.groups : []; }
  function tourSort(a, b) { return (a.tour == null ? 999 : a.tour) - (b.tour == null ? 999 : b.tour); }
  // เมนูข้าง: [{ id: group, entries }] เฉพาะหน้า visible ที่ผู้ใช้เห็น · กลุ่มที่ไม่เหลือหน้าไม่แสดง (ไม่มีหัวกลุ่ม)
  function menuFor(raw, context) {
    var S = src(context);
    var u = normalize(raw, S);
    return groupsNow().map(function (g) {
      return { id: g, entries: (S.list || []).filter(function (e) { return e.visible && e.group === g && pageVisible(u, e.id, S); }).sort(tourSort) };
    }).filter(function (g) { return g.entries.length; });
  }
  function flat(menu) { return menu.reduce(function (a, g) { return a.concat(g.entries); }, []); }
  // ผู้ใช้สมมติที่มีบทบาทเดียว (หน้า Roles · ดูตัวอย่างในมุมมองนี้)
  function roleUser(roleId) { return { id: null, name: '', salesPersonId: null, roleIds: [roleId], active: true }; }
  // หน้าเริ่มต้นที่บันทึกไว้ของบทบาท (master.roles ที่บันทึกก่อน CR-25 ไม่มีค่า = ค่าตั้งต้นใน data/permissions.js)
  function homeIdOf(role) {
    if (!role) return null;
    if (role.homePageId) return role.homePageId;
    var d = roleById(SP.data.roles || [], role.id);
    return d && d.homePageId ? d.homePageId : null;
  }
  // หน้าเริ่มต้นของผู้ใช้ → pageId | null: homePageId ของบทบาทแรก (ลำดับบทบาท) ที่ผู้ใช้เห็น → ขั้นแรกของ Sales Planning ที่เห็น →
  //   หน้าแรกในเมนู (หน้า open ใช้เมื่อไม่มีหน้าอื่น)
  function homePage(raw, context) {
    var S = src(context);
    var u = normalize(raw, S);
    var seen = flat(menuFor(u, S));
    var ids = seen.map(function (e) { return e.id; });
    for (var i = 0; i < u.roleIds.length; i++) {
      var hp = homeIdOf(roleById(S.roles, u.roleIds[i]));
      if (hp && ids.indexOf(hp) >= 0) return hp;
    }
    var first = seen.filter(function (e) { return !e.open; })[0] || seen[0];
    return first ? first.id : null;
  }
  function rolePages(roleId, context) { var S = src(context); return flat(menuFor(roleUser(roleId), S)); }
  function roleHome(roleId, context) { return homePage(roleUser(roleId), context); }
  // แถวสรุปใต้หัวคอลัมน์ (หน้า Permissions): หน้าในเมนูที่บทบาทเห็น / แก้ไขได้ (สิทธิ์ย่อยแก้ได้ = นับว่าแก้ไข · ไม่นับหน้า open) → { seen, edit }
  function roleSummary(roleId, context) {
    var S = src(context);
    var u = roleUser(roleId);
    var pages = rolePages(roleId, S).filter(function (e) { return !e.open; });
    return { seen: pages.length, edit: pages.filter(function (e) { return pageLevel(u, e.id, S) === 'EDIT'; }).length };
  }
  // สลับมุมมองผู้ใช้: หน้าปัจจุบัน (pageId · null = ไม่อยู่ใน registry) ยังเห็น = อยู่ต่อ / ถูกซ่อน = ไปหน้าเริ่มต้นของผู้ใช้ใหม่
  //   → { stay, pageId }
  function switchTarget(pageId, raw, context) {
    var S = src(context);
    if (!pageId || !entryOf(S, pageId) || pageVisible(raw, pageId, S)) return { stay: true, pageId: pageId };
    return { stay: false, pageId: homePage(raw, S) };
  }
  // หน้าเริ่มต้นของบทบาท (หน้า Roles) → roles ใหม่ (Pure)
  function setRoleHome(roles, id, pageId) {
    return copy(roles).map(function (r) { if (r.id === id) r.homePageId = pageId || null; return r; });
  }
  function stepModules(step) { return STEPS[step] ? STEPS[step].slice() : null; }

  // บทบาทที่แก้รายการเหล่านี้ได้ → [{ roleId, name, team, channelId, everywhere }] (ตามลำดับบทบาท ไม่ซ้ำ)
  //   everywhere = บทบาทที่ค่าตั้งต้นแก้ได้ทุกหน้า (ผู้ดูแลระบบ) — ข้อความอ่านอย่างเดียวไม่แสดงถ้ามีบทบาทอื่น
  function editors(ids, context) {
    var S = src(context);
    var out = [];
    S.roles.forEach(function (role) {
      var team = null;
      var ok = (ids || []).some(function (id) {
        var c = cell(S.perms, role, lookupRes(S, resolveId(id)));
        if (c.level !== 'EDIT') return false;
        team = c.scope === 'TEAM';
        return true;
      });
      if (ok) out.push({ roleId: role.id, name: role.name, team: !!team, channelId: team ? S.channelId : null, everywhere: role.defaultLevel === 'EDIT' });
    });
    return out;
  }
  // ผู้ใช้คนแรก (เปิดใช้งาน) ที่แก้ได้ ตามลำดับบทบาท (ปุ่มสลับมุมมอง) → ui.role | null
  function firstEditor(ids, context) {
    var S = src(context);
    for (var i = 0; i < S.roles.length; i++) {
      var role = S.roles[i];
      var cand = S.users.filter(function (x) { return x.active !== false && (x.roleIds || [])[0] === role.id; })
        .concat(S.users.filter(function (x) { return x.active !== false && (x.roleIds || []).indexOf(role.id) > 0; }));
      for (var j = 0; j < cand.length; j++) {
        var u = normalize(cand[j], S);
        if (canAny(u, ids, S)) { var r = ref(u); if (S.channelId && u.personId && isMember(S.teams, S.channelId, u.personId, S.month)) r.channelId = S.channelId; return r; }
      }
    }
    return null;
  }

  // ชื่อบทบาทแรกของผู้ใช้ (+ Channel ของทีม) — ป้ายปุ่มสลับ / ตัวเลือกมุมมองผู้ใช้
  function roleTitle(raw, context) {
    var S = src(context);
    var u = normalize(raw, S);
    var role = roleById(S.roles, u.type);
    var ch = u.personId && u.channelId ? (SP.data.channels || []).filter(function (c) { return c.id === u.channelId; })[0] : null;
    return (role ? role.name : u.type) + (ch ? ' · ' + ch.name : '');
  }
  function nameOf(raw, context) { return normalize(raw, context).name; }

  // ตัวเลือกมุมมองผู้ใช้: ผู้ใช้ที่เปิดใช้งาน (+ ผู้ใช้ปัจจุบัน) จัดกลุ่มตามบทบาทแรก ตามลำดับบทบาท → [{ userId, name, type, personId, channelId, roleIds, group }]
  function directory(context, current) {
    var S = src(context);
    var cur = current ? normalize(current, S) : null;
    var out = [];
    S.roles.forEach(function (role) {
      S.users.forEach(function (x) {
        var u = normalize(x, S);
        if (u.type !== role.id) return;
        if (!u.active && !(cur && cur.id === u.id)) return;
        var r = ref(u);
        r.name = u.name;
        r.roleIds = u.roleIds;
        r.group = role.name;
        out.push(r);
      });
    });
    return out;
  }

  // ---------------------------------------------------------------------
  // แก้เมทริกซ์ / บทบาท / ผู้ใช้ (หน้าบทบาทและสิทธิ์) — Pure: ไม่แก้ค่าเดิม
  // ---------------------------------------------------------------------
  function setCell(perms, roleId, resId, value) {
    var out = copy(perms || {});
    out[roleId] = out[roleId] || {};
    out[roleId][resId] = { level: value.level, scope: value.scope || 'ALL' };
    return out;
  }
  // กฎสิทธิ์ย่อย: หน้าหลัก NONE → สิทธิ์ย่อยทั้งหมด NONE / ปุ่มเฉพาะ (action) มีได้เมื่อหน้าหลัก EDIT เท่านั้น (ขอบเขตไม่เกินหน้าหลัก)
  //   → { perms, adjusted: [{ roleId, resId, from, to }] } (ข้อความแจ้งผู้ใช้)
  function enforceRules(perms, roles, list) {
    var out = copy(perms || {});
    var adjusted = [];
    var res = resources(list);
    sortRoles(roles).forEach(function (role) {
      res.forEach(function (r) {
        if (!r.parent) return;
        var parent = res.filter(function (x) { return x.id === r.parent; })[0];
        var pc = cell(out, role, parent), c = cell(out, role, r);
        var next = c;
        if (pc.level === 'NONE' && c.level !== 'NONE') next = { level: 'NONE', scope: 'ALL' };
        else if (r.action && c.level === 'EDIT' && pc.level !== 'EDIT') next = { level: 'NONE', scope: 'ALL' };
        else if (r.action && c.level === 'EDIT' && pc.scope === 'TEAM' && c.scope === 'ALL') next = { level: 'EDIT', scope: 'TEAM' };
        if (!sameCell(next, c)) {
          out = setCell(out, role.id, r.id, next);
          adjusted.push({ roleId: role.id, resId: r.id, from: c, to: next });
        }
      });
    });
    return { perms: out, adjusted: adjusted };
  }
  // คัดลอกสิทธิ์: บทบาทปลายทาง = ค่าที่มีผลของบทบาทต้นทางทุกรายการ (เก็บครบ ไม่อิงค่าตั้งต้น)
  function copyRole(perms, roles, fromId, toId, list) {
    var from = roleById(roles, fromId);
    var out = copy(perms || {});
    out[toId] = {};
    resources(list).forEach(function (r) { out[toId][r.id] = cell(perms, from, r); });
    return out;
  }
  // คืนค่าตั้งต้น: ทั้งตาราง (roleId ไม่ระบุ) หรือรายบทบาท (บทบาทที่สร้างเอง = ค่าทั่วไป)
  function resetMatrix(perms, roleId) {
    var base = defaultPerms();
    if (!roleId) {
      var out = copy(base);
      Object.keys(perms || {}).forEach(function (id) { if (!out[id] && !(SP.data.permissions || {})[id]) out[id] = {}; });
      return out;
    }
    var next = copy(perms || {});
    next[roleId] = copy(base[roleId] || {});
    return next;
  }
  // ช่องที่ต่างกัน (ค่าที่มีผล) → [{ roleId, resId, from, to }]
  function diffCells(before, after, roles, list) {
    var out = [];
    var res = resources(list);
    sortRoles(roles).forEach(function (role) {
      res.forEach(function (r) {
        var a = cell(before, role, r), b = cell(after, role, r);
        if (!sameCell(a, b)) out.push({ roleId: role.id, resId: r.id, from: a, to: b });
      });
    });
    return out;
  }
  // สรุปก่อนบันทึก: เปลี่ยน {cells} ช่อง ใน {roles} บทบาท · กระทบผู้ใช้ {users} คน (ผู้ใช้ที่มีบทบาทที่เปลี่ยน หรือบทบาทของตัวเองเปลี่ยน)
  function saveSummary(before, after, list) {
    var roleIds = {};
    var cells = diffCells(before.perms, after.perms, after.roles, list);
    cells.forEach(function (d) { roleIds[d.roleId] = true; });
    var users = {};
    (after.users || []).forEach(function (u) {
      var old = (before.users || []).filter(function (x) { return x.id === u.id; })[0];
      var changedRoles = !old || JSON.stringify(old.roleIds) !== JSON.stringify(u.roleIds) || (old.active !== false) !== (u.active !== false);
      if (changedRoles || (u.roleIds || []).some(function (id) { return roleIds[id]; })) users[u.id] = true;
    });
    var roleChanges = (after.roles || []).filter(function (r) {
      var o = roleById(before.roles, r.id);
      return !o || o.name !== r.name || (o.description || '') !== (r.description || '') || o.order !== r.order || homeIdOf(o) !== homeIdOf(r);
    }).length + (before.roles || []).filter(function (r) { return !roleById(after.roles, r.id); }).length;
    return { cells: cells.length, roles: Object.keys(roleIds).length, users: Object.keys(users).length, roleChanges: roleChanges, diffs: cells };
  }
  // ตรวจก่อนบันทึก: ต้องมีผู้ใช้ที่เปิดใช้งานและแก้หน้าบทบาทและสิทธิ์ได้อย่างน้อย 1 คน / ผู้ใช้ปัจจุบันจะแก้หน้านี้ต่อไม่ได้ = selfLockout (ให้ยืนยันซ้ำ)
  //   state = { roles, perms, users } → { ok, error: 'noAdmin' | null, selfLockout, admins }
  function validate(state, currentUserId, list) {
    var ctx = { roles: state.roles, perms: state.perms, users: state.users, list: list, teams: teamsNow(), month: monthNow() };
    var admins = (state.users || []).filter(function (u) { return u.active !== false && can(u, 'roleManagement', ctx); });
    var me = (state.users || []).filter(function (u) { return u.id === currentUserId; })[0];
    return { ok: admins.length > 0, error: admins.length ? null : 'noAdmin', selfLockout: !!me && !can(me, 'roleManagement', ctx), admins: admins.length };
  }
  function nextRoleId(roles) {
    var n = 1;
    (roles || []).forEach(function (r) { var m = /^role-(\d+)$/.exec(r.id); if (m) n = Math.max(n, Number(m[1]) + 1); });
    return 'role-' + n;
  }
  // เพิ่มบทบาท (ตั้งชื่อ + คัดลอกสิทธิ์จากบทบาทอื่นได้) → { ok, error: 'name' | 'duplicate', roles, perms, id }
  function addRole(state, name, description, copyFrom, list) {
    var n = String(name || '').trim();
    if (!n) return { ok: false, error: 'name', roles: state.roles, perms: state.perms, id: null };
    if ((state.roles || []).some(function (r) { return r.name.trim().toLowerCase() === n.toLowerCase(); })) return { ok: false, error: 'duplicate', roles: state.roles, perms: state.perms, id: null };
    var id = nextRoleId(state.roles);
    var order = Math.max.apply(null, [0].concat((state.roles || []).map(function (r) { return r.order || 0; }))) + 1;
    var roles = copy(state.roles).concat([{ id: id, name: n, description: String(description || '').trim(), system: false, order: order }]);
    var perms = copyFrom ? copyRole(state.perms, state.roles, copyFrom, id, list) : (function () { var p = copy(state.perms || {}); p[id] = {}; return p; })();
    return { ok: true, error: null, roles: roles, perms: perms, id: id };
  }
  // ลบบทบาท: เฉพาะบทบาทที่สร้างเองและไม่มีผู้ใช้ → { ok, error: 'system' | 'hasUsers' | 'notFound', roles, perms }
  function removeRole(state, id) {
    var role = roleById(state.roles, id);
    if (!role) return { ok: false, error: 'notFound', roles: state.roles, perms: state.perms };
    if (role.system) return { ok: false, error: 'system', roles: state.roles, perms: state.perms };
    if ((state.users || []).some(function (u) { return (u.roleIds || []).indexOf(id) >= 0; })) return { ok: false, error: 'hasUsers', roles: state.roles, perms: state.perms };
    var perms = copy(state.perms || {});
    delete perms[id];
    return { ok: true, error: null, roles: copy(state.roles).filter(function (r) { return r.id !== id; }), perms: perms };
  }
  function renameRole(roles, id, name, description) {
    var n = String(name || '').trim();
    if (!n) return { ok: false, error: 'name', roles: roles };
    if ((roles || []).some(function (r) { return r.id !== id && r.name.trim().toLowerCase() === n.toLowerCase(); })) return { ok: false, error: 'duplicate', roles: roles };
    return { ok: true, error: null, roles: copy(roles).map(function (r) { if (r.id === id) { r.name = n; if (description != null) r.description = String(description).trim(); } return r; }) };
  }
  // จัดลำดับ: ย้ายบทบาทไปตำแหน่ง toIndex แล้วเรียงเลข order ใหม่ 1..n
  function reorderRoles(roles, id, toIndex) {
    var list = sortRoles(copy(roles));
    var from = list.findIndex ? list.findIndex(function (r) { return r.id === id; }) : -1;
    if (from < 0) return list;
    var item = list.splice(from, 1)[0];
    list.splice(Math.max(0, Math.min(list.length, toIndex)), 0, item);
    list.forEach(function (r, i) { r.order = i + 1; });
    return list;
  }
  // สิทธิ์ที่มีผลจริงของผู้ใช้ (Drawer) → [{ res, level, scope, from: [roleId] }]
  function effectiveRows(raw, context) {
    var S = src(context);
    var u = normalize(raw, S);
    return resources(S.list).map(function (r) { var a = access(u, r.id, S); return { res: r, level: a.level, scope: a.scope, from: a.level === 'NONE' ? [] : a.from }; });
  }

  // ---------------------------------------------------------------------
  // ทีมขายต่อ Channel (CR-19)
  // ---------------------------------------------------------------------
  function membersOf(teams, channelId, month) {
    var team = (teams || []).filter(function (t) { return t.channelId === channelId; })[0];
    var list = (team ? team.members : []).filter(function (m) { return !month || inRange(month, m.fromMonth, m.toMonth); });
    return list.slice().sort(function (a, b) { return (a.role === 'MANAGER' ? 0 : 1) - (b.role === 'MANAGER' ? 0 : 1); });
  }
  function isMember(teams, channelId, personId, month) {
    return !!personId && membersOf(teams, channelId, month).some(function (m) { return m.salesPersonId === personId; });
  }
  function teamChannels(teams, personId, month) {
    var ids = (teams || []).filter(function (t) { return isMember(teams, t.channelId, personId, month); }).map(function (t) { return t.channelId; });
    var order = (SP.data.channels || []).map(function (c) { return c.id; });
    return ids.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
  }
  function salesRole(teams, personId, month, channelId) {
    var roles = [];
    (teams || []).forEach(function (t) {
      if (channelId && t.channelId !== channelId) return;
      t.members.forEach(function (m) { if (m.salesPersonId === personId && (!month || inRange(month, m.fromMonth, m.toMonth))) roles.push(m.role); });
    });
    if (!roles.length) return null;
    return roles.indexOf('MANAGER') >= 0 ? 'manager' : 'officer';
  }
  // Channel ในทีมของผู้ใช้ ณ เดือน (ผู้ใช้ที่เป็น Sales Person)
  function channelsOf(raw, context) {
    var S = src(context);
    var u = normalize(raw, S);
    return u.personId ? teamChannels(S.teams, u.personId, S.month) : [];
  }
  function teamFirst(tree, raw, context) {
    var mine = channelsOf(raw, context);
    if (!tree || !mine.length) return tree;
    var out = {};
    Object.keys(tree).forEach(function (k) { out[k] = tree[k]; });
    out.children = (tree.children || []).map(function (c, i) { return { c: c, i: i, m: mine.indexOf(c.id) }; })
      .sort(function (a, b) { return (a.m < 0 ? 99 : a.m) - (b.m < 0 ? 99 : b.m) || a.i - b.i; })
      .map(function (x) { return x.c; });
    return out;
  }
  function teamIndex(teams, channelId) {
    for (var i = 0; i < teams.length; i++) if (teams[i].channelId === channelId) return i;
    teams.push({ channelId: channelId, members: [] });
    return teams.length - 1;
  }
  function findMember(team, r) {
    for (var i = 0; i < team.members.length; i++) {
      var m = team.members[i];
      if (m.salesPersonId === r.salesPersonId && m.fromMonth === r.fromMonth) return i;
    }
    return -1;
  }
  function overlaps(a, b) { return a.fromMonth <= (b.toMonth || '9999-12') && b.fromMonth <= (a.toMonth || '9999-12'); }
  function fail(error, teams) { return { ok: false, error: error, teams: teams }; }
  function addMember(teams, channelId, member, month) {
    var out = copy(teams || []);
    if (!member || !member.salesPersonId) return fail('person', teams);
    if (member.role !== 'MANAGER' && member.role !== 'OFFICER') return fail('role', teams);
    if (!member.fromMonth || member.fromMonth < month) return fail('past', teams);
    if (member.toMonth && member.toMonth < member.fromMonth) return fail('range', teams);
    var team = out[teamIndex(out, channelId)];
    var m = { salesPersonId: member.salesPersonId, role: member.role, fromMonth: member.fromMonth, toMonth: member.toMonth || null };
    if (team.members.some(function (x) { return x.salesPersonId === m.salesPersonId && overlaps(x, m); })) return fail('overlap', teams);
    team.members.push(m);
    return { ok: true, error: null, teams: out };
  }
  function endMember(teams, channelId, r, toMonth, month) {
    var out = copy(teams || []);
    var team = out.filter(function (t) { return t.channelId === channelId; })[0];
    var i = team ? findMember(team, r) : -1;
    if (i < 0) return fail('notFound', teams);
    var m = team.members[i];
    if (m.toMonth && m.toMonth < month) return fail('past', teams);
    if (!toMonth || toMonth < addMonths(month, -1)) return fail('past', teams);
    if (toMonth < m.fromMonth) return fail('range', teams);
    m.toMonth = toMonth;
    return { ok: true, error: null, teams: out };
  }
  function removeMember(teams, channelId, r, month) {
    var out = copy(teams || []);
    var team = out.filter(function (t) { return t.channelId === channelId; })[0];
    var i = team ? findMember(team, r) : -1;
    if (i < 0) return fail('notFound', teams);
    if (team.members[i].fromMonth < month) return fail('started', teams);
    team.members.splice(i, 1);
    return { ok: true, error: null, teams: out };
  }

  SP.core.permissions = {
    LEVELS: LEVELS,
    ALIASES: ALIASES,
    resources: resources,
    resourceById: resourceById,
    cell: cell,
    defaultCell: defaultCell,
    defaultPerms: defaultPerms,
    isDefault: isDefault,
    access: access,
    level: level,
    can: can,
    canAny: canAny,
    teamBlocked: teamBlocked,
    pageLevel: pageLevel,
    pageVisible: pageVisible,
    visibleEntries: visibleEntries,
    pageModules: pageModules,
    stepModules: stepModules,
    menuFor: menuFor,
    homePage: homePage,
    homeIdOf: homeIdOf,
    roleHome: roleHome,
    rolePages: rolePages,
    roleSummary: roleSummary,
    switchTarget: switchTarget,
    setRoleHome: setRoleHome,
    editors: editors,
    firstEditor: firstEditor,
    normalize: normalize,
    user: user,
    ref: ref,
    roleTitle: roleTitle,
    nameOf: nameOf,
    directory: directory,
    rolesNow: rolesNow,
    permsNow: permsNow,
    migratePerms: migratePerms,
    usersNow: usersNow,
    teamsNow: teamsNow,
    monthNow: monthNow,
    setCell: setCell,
    enforceRules: enforceRules,
    copyRole: copyRole,
    resetMatrix: resetMatrix,
    diffCells: diffCells,
    saveSummary: saveSummary,
    validate: validate,
    addRole: addRole,
    removeRole: removeRole,
    renameRole: renameRole,
    reorderRoles: reorderRoles,
    effectiveRows: effectiveRows,
    membersOf: membersOf,
    isMember: isMember,
    teamChannels: teamChannels,
    salesRole: salesRole,
    channelsOf: channelsOf,
    teamFirst: teamFirst,
    addMonths: addMonths,
    addMember: addMember,
    endMember: endMember,
    removeMember: removeMember
  };
})(window.SP);

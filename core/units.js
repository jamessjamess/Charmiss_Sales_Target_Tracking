/*
 * core/units.js — หน่วยขายและคู่ค้า ทุก Channel (CR-32: Channel → หน่วยขาย → คู่ค้า รหัส TRCLOUD)
 *
 * แนวคิด: ใช้โครงเดียวทุก Channel โดยไม่เปลี่ยนที่เก็บเดิมที่ Sales Planning อ้างอิง
 *   หน่วยขาย (salesUnit)  = Account / Platform (master.accounts) + เขต TT (master.territories) · id เดิมทุกตัว (Key ของแผน Listing GP ยอดขาย)
 *                           suggest = เกณฑ์แนะนำ: Account = คำนำหน้าชื่อคู่ค้า (accounts[].suggest) · เขต = รายชื่อจังหวัด (master.provinceSuggestions)
 *   คู่ค้า (customer)      = ร้านค้า TT (master.stores · kind 'store') + คู่ค้าของ Account / Platform (master.customers จาก data/seed/seed-mt-branches.js)
 *   ช่วงของคู่ค้า          = [{ customerId, salesUnitId, fromMonth, toMonth | null }] · TT = master.storeAssignments (core/stores.js) ·
 *                           Channel อื่น = master.customerAssignments · คู่ค้า 1 รายอยู่ได้ 1 หน่วยขายต่อเดือน และต้องอยู่ใน Channel เดียวกัน
 *   ย้ายคู่ค้าของ Account / Platform ไม่เปลี่ยนยอดขายปีก่อนของหน่วยขาย (Sales Planning อ่านอย่างเดียว) · TT ใช้กลไกเดิมของ core/stores.js
 *
 * นำเข้าตอนโหลด (หลัง core/seed.js · ต้องมี history ของหน่วยขายแล้ว): SP.data.seedMtBranches →
 *   SP.data.customers = [{ id, trcloudId, name, legalName, taxId, trcloudType, kind, channelId, province, priceType, isExport, isOnline, active,
 *                          refL12M, warehouse, isSample }]
 *   SP.data.customerAssignments = [{ customerId, salesUnitId, fromMonth, toMonth }]
 *   ยอดอ้างอิง (refL12M) ของคู่ค้าที่จัดสรร = แบ่งยอด L12M ของหน่วยขาย (calc.l12m) ตาม split · ผลรวมเท่ายอดหน่วยขายพอดี (เศษลงรายการสุดท้าย)
 *
 * Pure functions — d = ข้อมูลแบบ store.data() (accounts, territories, channels, stores, storeAssignments, storeChannels, provinceSuggestions,
 *   customers, customerAssignments) ไม่แก้ค่าที่ส่งเข้ามา:
 *   splitRef(total, rows, split) → [ยอดต่อแถว] · build(D) → { customers, customerAssignments }
 *   salesUnits(d, month) → [{ id, channelId, code, name, gp, gpLabel, active, status, note, suggest, kind: 'account' | 'territory' }]
 *   customers(d) → คู่ค้าทุก Channel โครงเดียว (ร้านค้า TT: trcloudId = System ID · trcloudType = ประเภทร้านเต็ม · refL12M = ยอดอ้างอิง)
 *   assignments(d) → ช่วงของคู่ค้าทุก Channel · unitOf(d, customerId, month) · customersIn(d, unitId | null, month, channelId)
 *   validate(d) → [{ customerId, type: 'overlap' | 'channel' | 'unknownUnit', salesUnitId }] (ว่าง = ถูกต้อง)
 *   prefixOf(name) → คำนำหน้าก่อน _ ตัวแรก (ตัวพิมพ์ใหญ่) | null
 *   รอบ 2: membership(d, month) → { <customerId>: unitId | null } · timeline(d, customerId, year) → [unitId | null ×12] · movedInYear
 *          moveCustomers(d, ids, toUnitId | null, fromMonth, opts) — กลไกช่วงเดือนเดียวกับร้านค้า TT (stores.moveStores) ทุก Channel
 *            → { ok, storeAssignments, customerAssignments, moved, move (ร้าน TT → storeMoves) } | { ok: false, error: 'past' | 'range' | 'channel' | 'unit' }
 *          checks(d, month) → { groups: [{ key, items: [{ kind: 'customer' | 'unit', id, channelId, unitId, suggested }] }], total, byChannel }
 *            เกณฑ์ (ประเมิน ณ เดือนที่เลือก · Channel ที่ใช้งาน): unassigned · noOwner (calc.ownerGaps) · prefix · noProvince · duplicate (เกณฑ์เดิมของเขต
 *            master.territoryChecks) · noCustomers
 *          customerChanges(before, after) → [customerId ที่ช่วงเปลี่ยน] · auditCustomerAssignments(before, after, meta)
 *   รอบ 3: personChecks(d, from, to) → ข้อมูลที่ต้องตรวจของ Sales Person Management (ช่วง from – to = เดือนปัจจุบัน – สุดแผน · ทั้ง 2 แท็บตัวเลขเดียวกัน)
 *            vacant (หน่วยขายใช้งานที่ไม่มีผู้รับผิดชอบบางเดือน) · handover (ผู้รับผิดชอบจะสิ้นสุดแต่เดือนถัดไปไม่มีคนรับช่วง · ไม่นับซ้ำใน vacant) ·
 *            idleOfficer (Sales Officer บุคคลที่ใช้งานแต่ไม่ได้รับผิดชอบหน่วยขายใดในช่วงนี้ · ไม่นับ Sales Manager และทีม) ·
 *            endedUser (บุคลากรที่สิ้นสุดแล้วแต่บัญชีผู้ใช้ที่ผูกยังใช้งาน) — vacant / handover ใช้ calc.ownerGaps เดียวกับหน้า Sales Unit & Customer
 *   CR-33: แก้ไขรายรายการ (หน้า Sales Unit & Customer ไม่มีโหมดแก้ไขทั้งหน้า) — ทุกคำสั่งตรวจสิทธิ์ในฟังก์ชัน (ผู้ไม่มีสิทธิ์ = { ok: false, error: 'permission' })
 *          → { ok, changes: { <key ของ master>: ค่าใหม่ } } · หน้าจอเขียน changes ลง store + Audit log แล้วแสดง Toast
 *          canEdit(user, 'unit' | 'gp' | 'channels') · commandMove · commandSuggest · commandStatus · commandSaveUnit · commandAddUnit · commandRemoveUnit ·
 *          commandChannels · commandImport · withChanges(d, changes)
 *          unitCounts(d, month, status) → { byUnit, byChannel, unassigned } (จำนวนในแผงหน่วยขาย = จำนวนแถวของตารางเมื่อเลือกหน่วยขายนั้น)
 *          columnPresetFor(d, channelId | null) → 'standard' | 'single' (คู่ค้าประเภทเดียว) | 'territory' (id ของ settings.SALES_UNIT_COLUMN_PRESETS)
 * store: ไม่อ่าน ไม่เขียน
 */
(function (SP) {
  'use strict';

  function calc() { return SP.core.calc; }
  function findById(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0] || null; }
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function covers(a, m) { return a.fromMonth <= m && (a.toMonth == null || m <= a.toMonth); }
  function overlaps(a, b) {
    return a.fromMonth <= (b.toMonth == null ? '9999-12' : b.toMonth) && b.fromMonth <= (a.toMonth == null ? '9999-12' : a.toMonth);
  }

  // =====================================================================
  // นำเข้าคู่ค้าของ Account / Platform ตอนโหลด
  // =====================================================================

  // แบ่งยอดของหน่วยขายให้คู่ค้าตามลำดับ: สำนักงานใหญ่ = split.headOffice · คลังสินค้า = split.warehouse ·
  //   ที่เหลือให้รายการอื่นแบบลดหลั่น (น้ำหนัก n, n−1, …, 1 ตามลำดับ) · ปัดลงเป็นบาท เศษทั้งหมดลงรายการสุดท้าย → ผลรวม = total พอดี
  function splitRef(total, rows, split) {
    split = split || {};
    var t = Number(total) || 0;
    var out = rows.map(function () { return 0; });
    if (!rows.length) return out;
    var fixed = 0;
    rows.forEach(function (r, i) {
      var p = r.kind === 'headOffice' ? split.headOffice : r.warehouse ? split.warehouse : null;
      if (p != null) { out[i] = Math.floor(t * p); fixed += out[i]; }
    });
    var rest = rows.map(function (r, i) { return i; }).filter(function (i) { return !(rows[i].kind === 'headOffice' || rows[i].warehouse); });
    var pool = t - fixed;
    var wsum = rest.reduce(function (s, i, k) { return s + (rest.length - k); }, 0);
    rest.forEach(function (i, k) { out[i] = wsum ? Math.floor(pool * (rest.length - k) / wsum) : 0; });
    var used = out.reduce(function (s, v) { return s + v; }, 0);
    out[out.length - 1] += t - used;
    return out;
  }

  function build(D) {
    var seed = D && D.seedMtBranches;
    if (!seed) return null;
    var byUnit = {};
    (seed.customers || []).forEach(function (r) { if (r.unitId) (byUnit[r.unitId] = byUnit[r.unitId] || []).push(r); });
    var ref = {};
    Object.keys(byUnit).forEach(function (u) {
      var rows = byUnit[u];
      var total = calc().l12m(D, u) || 0;
      splitRef(total, rows, seed.split).forEach(function (v, i) { ref[rows[i].trcloudId] = v; });
    });
    var customers = (seed.customers || []).map(function (r) {
      return {
        id: String(r.trcloudId), trcloudId: String(r.trcloudId), name: r.name, legalName: r.legalName || null, taxId: r.taxId || null,
        trcloudType: r.trcloudType || null, kind: r.kind, channelId: r.channelId, province: r.province || null, priceType: r.priceType || null,
        isExport: !!r.isExport, isOnline: r.kind === 'platform' || !!r.isOnline, active: r.active !== false,
        refL12M: r.unitId ? ref[r.trcloudId] : Number(r.refL12M) || 0, warehouse: !!r.warehouse, isSample: !!r.isSample
      };
    });
    var customerAssignments = (seed.customers || []).filter(function (r) { return r.unitId; }).map(function (r) {
      return { customerId: String(r.trcloudId), salesUnitId: r.unitId, fromMonth: seed.assignFrom, toMonth: null };
    });
    return { customers: customers, customerAssignments: customerAssignments };
  }

  // =====================================================================
  // หน่วยขาย
  // =====================================================================

  function salesUnits(d, month) {
    var M = SP.core.master;
    var channels = (d.channels || SP.data.channels || []).slice().sort(byOrder);
    var codes = M ? M.unitCodes(d.accounts, channels) : {};
    var ps = d.provinceSuggestions || {};
    var out = [];
    channels.forEach(function (ch) {
      (d.accounts || []).filter(function (a) { return a.channelId === ch.id; }).forEach(function (a) {
        var on = M ? M.unitActiveAt(a, month) : a.active !== false;
        out.push({ id: a.id, channelId: ch.id, code: codes[a.id] || a.id, name: a.name, gp: a.gp == null ? null : a.gp, gpLabel: ch.gpLabel || null,
          hasGP: ch.hasGP !== false, active: on, status: on ? 'active' : 'inactive', inactiveFrom: a.inactiveFrom || null, note: a.note || null,
          suggest: (a.suggest || []).slice(), kind: 'account' });
      });
      (d.territories || []).filter(function (t) { return t.channelId === ch.id; }).forEach(function (t) {
        var on = t.active !== false;
        out.push({ id: t.id, channelId: ch.id, code: t.id, name: t.name, gp: null, gpLabel: null, hasGP: false, active: on, status: on ? 'active' : 'inactive',
          inactiveFrom: null, note: t.note || null, suggest: (ps[t.id] || []).slice(), kind: 'territory' });
      });
    });
    return out;
  }

  // =====================================================================
  // คู่ค้า
  // =====================================================================

  function storeChannelOf(d, storeId) {
    var a = (d.storeAssignments || []).filter(function (x) { return x.storeId === storeId; })[0];
    var t = a ? findById(d.territories, a.territoryId) : null;
    return t ? t.channelId : (d.storeChannels || [])[0] || null;
  }
  function fromStore(d, s) {
    return {
      id: s.id, trcloudId: s.systemId || s.id, name: s.name, masked: !!s.masked, legalName: null, taxId: null, trcloudType: s.storeType || null,
      kind: 'store', channelId: storeChannelOf(d, s.id), province: s.province || null, priceType: s.priceType || null,
      isExport: !!s.hasExport, isOnline: !!s.hasOnline, active: s.active !== false, refL12M: Number(s.salesRef) || 0,
      storeType: s.storeType || null, duplicates: s.duplicates || 1, warehouse: false, isSample: false, source: 'store'
    };
  }
  function customers(d) {
    return (d.stores || []).map(function (s) { return fromStore(d, s); })
      .concat((d.customers || []).map(function (c) { var o = JSON.parse(JSON.stringify(c)); o.source = 'customer'; return o; }));
  }
  function assignments(d) {
    return (d.storeAssignments || []).map(function (a) { return { customerId: a.storeId, salesUnitId: a.territoryId, fromMonth: a.fromMonth, toMonth: a.toMonth == null ? null : a.toMonth }; })
      .concat((d.customerAssignments || []).map(function (a) { return { customerId: a.customerId, salesUnitId: a.salesUnitId, fromMonth: a.fromMonth, toMonth: a.toMonth == null ? null : a.toMonth }; }));
  }
  function unitOf(d, customerId, month, list) {
    var hit = (list || assignments(d)).filter(function (a) { return a.customerId === customerId && covers(a, month); })[0];
    return hit ? hit.salesUnitId : null;
  }
  // คู่ค้าในหน่วยขาย ณ เดือน (unitId null = ยังไม่จัดสรร · channelId = จำกัด Channel)
  function customersIn(d, unitId, month, channelId) {
    var list = assignments(d);
    var at = {};
    list.forEach(function (a) { if (covers(a, month)) at[a.customerId] = a.salesUnitId; });
    return customers(d).filter(function (c) {
      if (channelId && c.channelId !== channelId) return false;
      return unitId == null ? !at[c.id] : at[c.id] === unitId;
    });
  }

  // ตรวจความถูกต้องของช่วง: ช่วงทับกัน (อยู่ 2 หน่วยขายในเดือนเดียวกัน) · หน่วยขายต่าง Channel กับคู่ค้า · ไม่พบหน่วยขาย
  function validate(d) {
    var units = {};
    salesUnits(d, SP.core.clock ? SP.core.clock.currentMonth() : '2026-09').forEach(function (u) { units[u.id] = u; });
    var cust = {};
    customers(d).forEach(function (c) { cust[c.id] = c; });
    var byCust = {};
    assignments(d).forEach(function (a) { (byCust[a.customerId] = byCust[a.customerId] || []).push(a); });
    var out = [];
    Object.keys(byCust).forEach(function (id) {
      var list = byCust[id];
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) if (overlaps(list[i], list[j])) { out.push({ customerId: id, type: 'overlap', salesUnitId: list[j].salesUnitId }); }
        var u = units[list[i].salesUnitId];
        if (!u) out.push({ customerId: id, type: 'unknownUnit', salesUnitId: list[i].salesUnitId });
        else if (cust[id] && cust[id].channelId && u.channelId !== cust[id].channelId) out.push({ customerId: id, type: 'channel', salesUnitId: u.id });
      }
    });
    return out;
  }

  // =====================================================================
  // รอบ 2: ช่วงของคู่ค้า · ย้าย · ข้อมูลที่ต้องตรวจ
  // =====================================================================

  function membership(d, month) {
    var at = {};
    assignments(d).forEach(function (a) { if (covers(a, month)) at[a.customerId] = a.salesUnitId; });
    var out = {};
    customers(d).forEach(function (c) { out[c.id] = at[c.id] || null; });
    return out;
  }
  function timeline(d, customerId, year) {
    var list = assignments(d).filter(function (a) { return a.customerId === customerId; });
    var out = [];
    for (var m = 0; m < 12; m++) out.push(unitOf(d, customerId, calc().monthKey(year, m), list));
    return out;
  }
  function movedInYear(d, customerId, year) {
    var t = timeline(d, customerId, year);
    for (var m = 1; m < 12; m++) if (t[m] !== t[m - 1]) return true;
    return false;
  }
  function toStoreShape(list) { return (list || []).map(function (a) { return { storeId: a.customerId, territoryId: a.salesUnitId, fromMonth: a.fromMonth, toMonth: a.toMonth == null ? null : a.toMonth }; }); }
  function fromStoreShape(list) { return (list || []).map(function (a) { return { customerId: a.storeId, salesUnitId: a.territoryId, fromMonth: a.fromMonth, toMonth: a.toMonth == null ? null : a.toMonth }; }); }
  function moveCustomers(d, ids, toUnitId, fromMonth, opts) {
    var S = SP.core.stores;
    var all = {};
    customers(d).forEach(function (c) { all[c.id] = c; });
    var unit = null;
    if (toUnitId) {
      unit = salesUnits(d, fromMonth || '9999-12').filter(function (u) { return u.id === toUnitId; })[0];
      if (!unit) return { ok: false, error: 'unit' };
    }
    var list = (ids || []).map(function (id) { return all[id]; }).filter(Boolean);
    if (unit && list.some(function (c) { return c.channelId && c.channelId !== unit.channelId; })) return { ok: false, error: 'channel' };
    var out = { ok: true, storeAssignments: d.storeAssignments || [], customerAssignments: d.customerAssignments || [], moved: [], move: null };
    var tt = list.filter(function (c) { return c.source === 'store'; }).map(function (c) { return c.id; });
    var other = list.filter(function (c) { return c.source !== 'store'; }).map(function (c) { return c.id; });
    if (tt.length) {
      var r = S.moveStores(d, tt, toUnitId || null, fromMonth, opts);
      if (!r.ok) return r;
      out.storeAssignments = r.storeAssignments;
      out.move = r.move;
      out.moved = out.moved.concat(r.moved);
    }
    if (other.length) {
      var r2 = S.moveStores({ storeAssignments: toStoreShape(d.customerAssignments) }, other, toUnitId || null, fromMonth, opts);
      if (!r2.ok) return r2;
      out.customerAssignments = fromStoreShape(r2.storeAssignments);
      out.moved = out.moved.concat(r2.moved);
    }
    return out;
  }
  function customerChanges(before, after) { return SP.core.stores.changedStores(toStoreShape(before), toStoreShape(after)); }
  function auditCustomerAssignments(before, after, meta) {
    meta = meta || {};
    function ranges(list, id) {
      return (list || []).filter(function (a) { return a.customerId === id; }).sort(function (a, b) { return a.fromMonth < b.fromMonth ? -1 : 1; })
        .map(function (a) { return { salesUnitId: a.salesUnitId, fromMonth: a.fromMonth, toMonth: a.toMonth == null ? null : a.toMonth }; });
    }
    return customerChanges(before, after).map(function (id) {
      return { entity: 'customerAssignment', key: id, field: 'salesUnit', oldValue: ranges(before, id), newValue: ranges(after, id), by: meta.by || null, at: meta.at || null };
    });
  }

  function checks(d, month) {
    var c = calc();
    var M = SP.core.master;
    var chOn = {};
    (d.channels || SP.data.channels || []).forEach(function (ch) { if (ch.active !== false) chOn[ch.id] = true; });
    var units = salesUnits(d, month);
    var active = units.filter(function (u) { return u.active && chOn[u.channelId]; });
    var unitById = {};
    units.forEach(function (u) { unitById[u.id] = u; });
    var mem = membership(d, month);
    var cust = customers(d).filter(function (x) { return x.active && chOn[x.channelId]; });
    var groups = { unassigned: [], noOwner: [], prefix: [], noProvince: [], duplicate: [], noCustomers: [] };
    var perUnit = {};
    cust.forEach(function (x) {
      var u = mem[x.id];
      if (!u) { groups.unassigned.push({ kind: 'customer', id: x.id, channelId: x.channelId, unitId: null }); return; }
      perUnit[u] = (perUnit[u] || 0) + 1;
      var unit = unitById[u];
      if (unit && unit.kind === 'account') {
        var s = c.suggestSalesUnit(x, units);
        if (s && s !== u) groups.prefix.push({ kind: 'customer', id: x.id, channelId: x.channelId, unitId: u, suggested: s });
      }
    });
    c.ownerGaps(d.assignments, d.salespeople, active.map(function (u) { return u.id; }), month, month).forEach(function (g) {
      groups.noOwner.push({ kind: 'unit', id: g.unitId, channelId: unitById[g.unitId].channelId });
    });
    if (M) {
      var tc = M.territoryChecks(d, month);
      var chOf = {};
      cust.forEach(function (x) { chOf[x.id] = x.channelId; });
      tc.noProvince.forEach(function (id) { if (chOf[id]) groups.noProvince.push({ kind: 'customer', id: id, channelId: chOf[id], unitId: mem[id] || null }); });
      tc.duplicate.forEach(function (sid) {
        var s = (d.stores || []).filter(function (x) { return x.systemId === sid; })[0];
        if (s && chOf[s.id]) groups.duplicate.push({ kind: 'customer', id: s.id, channelId: chOf[s.id], unitId: mem[s.id] || null });
      });
    }
    active.forEach(function (u) { if (!perUnit[u.id]) groups.noCustomers.push({ kind: 'unit', id: u.id, channelId: u.channelId }); });
    var keys = ['unassigned', 'noOwner', 'prefix', 'noProvince', 'duplicate', 'noCustomers'];
    var byChannel = {};
    var total = 0;
    keys.forEach(function (k) { groups[k].forEach(function (x) { byChannel[x.channelId] = (byChannel[x.channelId] || 0) + 1; total++; }); });
    return { groups: keys.map(function (k) { return { key: k, items: groups[k] }; }), total: total, byChannel: byChannel };
  }

  function personChecks(d, from, to) {
    var c = calc();
    var M = SP.core.master;
    var chOn = {};
    (d.channels || SP.data.channels || []).forEach(function (ch) { if (ch.active !== false) chOn[ch.id] = true; });
    var units = salesUnits(d, from).filter(function (u) { return u.active && chOn[u.channelId]; });
    var byId = {};
    units.forEach(function (u) { byId[u.id] = u; });
    var groups = { vacant: [], handover: [], idleOfficer: [], endedUser: [] };
    c.ownerGaps(d.assignments, d.salespeople, units.map(function (u) { return u.id; }), from, to).forEach(function (g) {
      var hand = g.runs.filter(function (r) { return r.after; })[0];
      var u = byId[g.unitId];
      if (hand) groups.handover.push({ kind: 'unit', id: g.unitId, channelId: u.channelId, personId: hand.after, from: hand.from, to: hand.to });
      else groups.vacant.push({ kind: 'unit', id: g.unitId, channelId: u.channelId, from: g.runs[0].from, to: g.runs[0].to, runs: g.runs.length });
    });
    var st = { teams: d.teams || [], assignments: d.assignments || [] };
    function overlaps(r) { return r.fromMonth <= to && (r.toMonth == null || r.toMonth >= from); }
    (d.salespeople || []).forEach(function (p) {
      if (p.type === 'team') return;
      var s = M ? M.personState(p, st, from) : { status: p.endMonth && p.endMonth < from ? 'ended' : 'active' };
      if (s.status === 'ended') {
        var user = p.userId ? (d.users || SP.data.users || []).filter(function (x) { return x.id === p.userId; })[0] : null;
        if (user && user.active !== false) groups.endedUser.push({ kind: 'person', id: p.id, userId: user.id });
        return;
      }
      var mem = [];
      (d.teams || []).forEach(function (t) { (t.members || []).forEach(function (m) { if (m.salesPersonId === p.id && overlaps(m)) mem.push(m); }); });
      if (!mem.some(function (m) { return m.role === 'OFFICER'; }) || mem.some(function (m) { return m.role === 'MANAGER'; })) return;
      var has = (d.assignments || []).some(function (a) { return a.salesPersonId === p.id && overlaps(a); });
      if (!has) groups.idleOfficer.push({ kind: 'person', id: p.id });
    });
    var keys = ['vacant', 'handover', 'idleOfficer', 'endedUser'];
    var total = 0;
    keys.forEach(function (k) { total += groups[k].length; });
    return { groups: keys.map(function (k) { return { key: k, items: groups[k] }; }), total: total, from: from, to: to };
  }

  function prefixOf(name) {
    var s = String(name == null ? '' : name);
    var i = s.indexOf('_');
    if (i <= 0) return null;
    var p = s.slice(0, i).trim().toUpperCase();
    return p || null;
  }

  // =====================================================================
  // CR-33: แก้ไขรายรายการ — ตรวจสิทธิ์ในฟังก์ชัน ไม่ใช่แค่ซ่อนปุ่ม · ไม่แก้ค่าที่ส่งเข้ามา
  // =====================================================================
  var EDIT_RESOURCE = { unit: 'salesUnits', gp: 'salesUnits.gp', channels: 'salesUnits.channelSettings' };
  function copyOf(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function canEdit(user, part) {
    var P = SP.core.permissions;
    return !!P && !!user && P.level(user, EDIT_RESOURCE[part || 'unit'] || EDIT_RESOURCE.unit) === 'EDIT';
  }
  function denied() { return { ok: false, error: 'permission' }; }
  function withChanges(d, changes) {
    var o = {};
    Object.keys(d || {}).forEach(function (k) { o[k] = d[k]; });
    Object.keys(changes || {}).forEach(function (k) { o[k] = changes[k]; });
    return o;
  }
  function nameTaken(d, channelId, name, exceptId) {
    var n = String(name || '').trim().toLowerCase();
    return (d.accounts || []).concat(d.territories || []).some(function (u) { return u.channelId === channelId && u.id !== exceptId && String(u.name).trim().toLowerCase() === n; });
  }
  function isTerritoryChannel(d, channelId) { var ch = findById(d.channels, channelId); return !!ch && (ch.allocationUnit || 'ACCOUNT') === 'TERRITORY'; }

  // ย้าย / นำออก (toUnitId null) ตั้งแต่เดือน fromMonth — กลไกเดียวกับ moveCustomers
  function commandMove(d, user, ids, toUnitId, fromMonth, opts) {
    if (!canEdit(user)) return denied();
    var r = moveCustomers(d, ids, toUnitId, fromMonth, opts);
    if (!r.ok) return r;
    var changes = { storeAssignments: r.storeAssignments, customerAssignments: r.customerAssignments };
    if (r.move) changes.storeMoves = (d.storeMoves || []).concat([r.move]);
    return { ok: true, changes: changes, moved: r.moved };
  }
  // ย้ายไปหน่วยขายแนะนำ (calc.suggestSalesUnit) ของแต่ละราย ณ เดือน month · ข้ามรายที่ไม่มีคำแนะนำ / อยู่หน่วยนั้นแล้ว / หน่วยแนะนำปิดใช้งาน
  function commandSuggest(d, user, ids, fromMonth, opts, month) {
    if (!canEdit(user)) return denied();
    var key = month || fromMonth;
    var units = salesUnits(d, key);
    var unitById = {};
    units.forEach(function (u) { unitById[u.id] = u; });
    var all = {};
    customers(d).forEach(function (c) { all[c.id] = c; });
    var mem = membership(d, key);
    var groups = {}, skipped = 0;
    (ids || []).forEach(function (id) {
      var x = all[id];
      if (!x) return;
      var sug = calc().suggestSalesUnit(x, units);
      if (sug && sug !== mem[id] && unitById[sug] && unitById[sug].active) (groups[sug] = groups[sug] || []).push(id); else skipped++;
    });
    var cur = d, changes = {}, moved = [];
    var keys = Object.keys(groups);
    for (var i = 0; i < keys.length; i++) {
      var r = commandMove(cur, user, groups[keys[i]], keys[i], fromMonth, opts);
      if (!r.ok) return r;
      Object.keys(r.changes).forEach(function (k) { changes[k] = r.changes[k]; });
      cur = withChanges(cur, r.changes);
      moved = moved.concat(r.moved);
    }
    return { ok: true, changes: changes, moved: moved, groups: groups, skipped: skipped };
  }
  // เปลี่ยนสถานะคู่ค้า (ร้านค้า TT = master.stores · อื่นๆ = master.customers) → changed = จำนวนที่เปลี่ยนจริง
  function commandStatus(d, user, ids, active) {
    if (!canEdit(user)) return denied();
    var set = {};
    (ids || []).forEach(function (id) { set[id] = true; });
    var n = 0;
    function upd(list) {
      return (list || []).map(function (x) {
        if (!set[x.id] || (x.active !== false) === !!active) return x;
        n++;
        var o = copyOf(x);
        o.active = !!active;
        return o;
      });
    }
    return { ok: true, changes: { stores: upd(d.stores), customers: upd(d.customers) }, changed: n };
  }
  // บันทึก Drawer หน่วยขาย · patch = เฉพาะค่าที่เปลี่ยน: name · note · gp (สิทธิ์ย่อย salesUnits.gp) · active · inactiveFrom · suggest (Account) · provinces (เขต)
  //   error: 'permission' · 'unit' · 'name' (ว่าง) · 'duplicate' (ชื่อซ้ำใน Channel)
  function commandSaveUnit(d, user, unitId, patch) {
    if (!canEdit(user)) return denied();
    patch = patch || {};
    var acc = findById(d.accounts, unitId), terr = findById(d.territories, unitId);
    var raw = acc || terr;
    if (!raw) return { ok: false, error: 'unit' };
    var gpOld = raw.gp == null ? null : raw.gp;
    if ('gp' in patch && (patch.gp == null ? null : patch.gp) !== gpOld && !canEdit(user, 'gp')) return denied();
    if ('name' in patch) {
      var v = String(patch.name || '').trim();
      if (!v) return { ok: false, error: 'name' };
      if (nameTaken(d, raw.channelId, v, unitId)) return { ok: false, error: 'duplicate' };
    }
    var next = copyOf(raw);
    var fields = acc ? ['name', 'note', 'gp', 'active', 'inactiveFrom', 'suggest'] : ['name', 'note', 'active'];
    fields.forEach(function (k) {
      if (!(k in patch)) return;
      var val = k === 'name' ? String(patch[k]).trim() : k === 'note' ? String(patch[k] || '').trim() : copyOf(patch[k]);
      var empty = (k === 'note' || k === 'inactiveFrom') ? !val : k === 'suggest' ? !(val && val.length) : false;
      if (empty) delete next[k]; else next[k] = val;
    });
    var changes = {};
    if (acc) changes.accounts = (d.accounts || []).map(function (x) { return x.id === unitId ? next : x; });
    else {
      changes.territories = (d.territories || []).map(function (x) { return x.id === unitId ? next : x; });
      if ('provinces' in patch) {
        var ps = copyOf(d.provinceSuggestions || {});
        ps[unitId] = (patch.provinces || []).slice();
        changes.provinceSuggestions = ps;
      }
    }
    return { ok: true, changes: changes };
  }
  // เพิ่มหน่วยขาย · fields = { name, gp, note, suggest, provinces } · opts.id = id ของ Account ใหม่ (ไม่ระบุ = acc-<n>) → { ok, id, changes }
  function commandAddUnit(d, user, channelId, fields, opts) {
    if (!canEdit(user)) return denied();
    fields = fields || {};
    var ch = findById(d.channels, channelId);
    if (!ch) return { ok: false, error: 'channel' };
    var name = String(fields.name || '').trim();
    if (!name) return { ok: false, error: 'name' };
    if (nameTaken(d, channelId, name, null)) return { ok: false, error: 'duplicate' };
    var M = SP.core.master;
    var id, changes = {};
    if (isTerritoryChannel(d, channelId)) {
      id = SP.core.stores.nextTerritoryId(d, channelId);
      var t = { id: id, channelId: channelId, name: name, active: true };
      if (fields.note) t.note = String(fields.note).trim();
      changes.territories = (d.territories || []).concat([t]);
      var ps = copyOf(d.provinceSuggestions || {});
      ps[id] = (fields.provinces || []).slice();
      changes.provinceSuggestions = ps;
    } else {
      var gp = ch.hasGP !== false && fields.gp != null ? fields.gp : null;
      if (gp != null && !canEdit(user, 'gp')) return denied();
      id = opts && opts.id;
      if (!id) { var n = (d.accounts || []).length + 1; while (findById(d.accounts, 'acc-' + n)) n++; id = 'acc-' + n; }
      var a = { id: id, code: M.nextUnitCode(d.accounts || [], d.channels || [], channelId), name: name, channelId: channelId, active: true, gp: gp };
      if (fields.note) a.note = String(fields.note).trim();
      if (fields.suggest && fields.suggest.length) a.suggest = fields.suggest.slice();
      changes.accounts = (d.accounts || []).concat([a]);
    }
    return { ok: true, id: id, changes: changes };
  }
  // นำ Account ออกจาก Master (เฉพาะที่ calc.canRemoveUnit อนุญาต · inPlan = { <unitId>: true } ที่อยู่ในแผน)
  function commandRemoveUnit(d, user, unitId, inPlan) {
    if (!canEdit(user)) return denied();
    if (!findById(d.accounts, unitId)) return { ok: false, error: 'unit' };
    if (!calc().canRemoveUnit(d, unitId, inPlan || {})) return { ok: false, error: 'blocked' };
    return { ok: true, changes: {
      accounts: (d.accounts || []).filter(function (x) { return x.id !== unitId; }),
      customerAssignments: (d.customerAssignments || []).filter(function (a) { return a.salesUnitId !== unitId; }) } };
  }
  // ตั้งค่า Channel (สิทธิ์ย่อย salesUnits.channelSettings) · รหัส Channel ห้ามว่างหรือซ้ำ
  function commandChannels(d, user, channels) {
    if (!canEdit(user, 'channels')) return denied();
    var ids = (channels || []).map(function (c) { return c.id; });
    if (ids.some(function (id, i) { return !id || ids.indexOf(id) !== i; })) return { ok: false, error: 'channelId' };
    return { ok: true, changes: { channels: copyOf(channels) } };
  }
  // นำเข้าร้านค้าจากไฟล์ (master.importDiff → master.applyImport)
  function commandImport(d, user, diff, pick, fromMonth, stamp) {
    if (!canEdit(user)) return denied();
    var res = SP.core.master.applyImport(d, diff, pick, fromMonth, stamp);
    return { ok: true, changes: { stores: res.stores, storeAssignments: res.storeAssignments, storeMoves: (d.storeMoves || []).concat(res.moves || []) } };
  }

  // จำนวนคู่ค้าต่อหน่วยขาย ณ เดือน ตามตัวกรองสถานะ ('active' | 'inactive' | 'all') · unassigned = คู่ค้าที่ใช้งานแต่ยังไม่จัดสรร ต่อ Channel (ไม่ขึ้นกับตัวกรองสถานะ)
  function unitCounts(d, month, status) {
    var mem = membership(d, month);
    var out = { byUnit: {}, byChannel: {}, unassigned: {} };
    customers(d).forEach(function (c) {
      var u = mem[c.id];
      if (!u && c.active) out.unassigned[c.channelId] = (out.unassigned[c.channelId] || 0) + 1;
      var ok = status === 'all' || (status === 'inactive' ? !c.active : c.active);
      if (!ok) return;
      out.byChannel[c.channelId] = (out.byChannel[c.channelId] || 0) + 1;
      if (u) out.byUnit[u] = (out.byUnit[u] || 0) + 1;
    });
    return out;
  }
  // Preset คอลัมน์ค่าเริ่มต้นของแท็บ: ทั้งหมด = standard · Channel ที่แบ่งเป้าตามเขต = territory · คู่ค้ามีหลายประเภท = standard · ประเภทเดียว = single
  function columnPresetFor(d, channelId) {
    if (!channelId) return 'standard';
    if (isTerritoryChannel(d, channelId)) return 'territory';
    var kinds = {};
    customers(d).forEach(function (c) { if (c.channelId === channelId) kinds[c.kind] = true; });
    return Object.keys(kinds).length > 1 ? 'standard' : 'single';
  }

  var result = build(SP.data);
  if (result) {
    SP.data.customers = result.customers;
    SP.data.customerAssignments = result.customerAssignments;
  }

  SP.core.units = {
    imported: !!result,
    splitRef: splitRef,
    build: build,
    salesUnits: salesUnits,
    customers: customers,
    assignments: assignments,
    unitOf: unitOf,
    customersIn: customersIn,
    validate: validate,
    prefixOf: prefixOf,
    membership: membership,
    timeline: timeline,
    movedInYear: movedInYear,
    moveCustomers: moveCustomers,
    customerChanges: customerChanges,
    auditCustomerAssignments: auditCustomerAssignments,
    checks: checks,
    personChecks: personChecks,
    canEdit: canEdit,
    withChanges: withChanges,
    commandMove: commandMove,
    commandSuggest: commandSuggest,
    commandStatus: commandStatus,
    commandSaveUnit: commandSaveUnit,
    commandAddUnit: commandAddUnit,
    commandRemoveUnit: commandRemoveUnit,
    commandChannels: commandChannels,
    commandImport: commandImport,
    unitCounts: unitCounts,
    columnPresetFor: columnPresetFor
  };
})(window.SP);

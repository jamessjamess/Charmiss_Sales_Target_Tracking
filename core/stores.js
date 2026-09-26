/*
 * core/stores.js — ร้านค้า Traditional Trade และการจัดสรรร้านค้าให้เขตการขาย (CR-16)
 *
 * แนวคิด: ร้านค้า → เขตการขาย → ผู้รับผิดชอบ ทั้งสองขั้นเก็บตามช่วงเดือน ('YYYY-MM')
 *   storeAssignments = [{ storeId, territoryId, fromMonth, toMonth | null }] ร้านอยู่ในเขตใดในเดือนใด (ไม่มีช่วงที่ครอบ = ยังไม่จัดสรร)
 *   ผู้รับผิดชอบของเขต = master.assignments เดิม (calc.ownerOf / calc.setOwner) ไฟล์นี้ไม่เขียน
 *   เขตการขาย = กลุ่มร้านค้า / รายชื่อจังหวัดของเขต (provinceSuggestions) ใช้แนะนำเขตและเตือนร้านที่อยู่นอกจังหวัดของเขตเท่านั้น
 *   เป้าหมายผูกกับเขต (% ใน Channel) การย้ายร้านจึงไม่เปลี่ยนเป้าหมาย เปลี่ยนเฉพาะยอดขายปีก่อนของเขต (ก่อนอนุมัติเป้าหมายประจำปี)
 *
 * นำเข้าตอนโหลด (หลัง core/calc.js ก่อน core/seed.js): data.storeImport (data/stores.js) + seed (data/seed/seed-tt-stores.js)
 *   → SP.data.stores [{ id, systemId, name, masked, storeType, tags, priceType, active, province, hasExport, hasOnline, salesRef, duplicates }]
 *       id = System ID / แถวที่ System ID ซ้ำในไฟล์ต้นทาง: แถวถัดไปเป็น {System ID}-2, -3 (duplicates = จำนวนแถวที่ใช้ ID เดียวกัน)
 *     SP.data.storeAssignments · provinceSuggestions · storeMoves ([]) · storeChannels (Channel ที่มีข้อมูลร้านค้า)
 *   → แทนที่เขตการขาย Sales Person และช่วงผู้รับผิดชอบของ Channel ที่นำเข้าด้วยข้อมูลใน seed
 *   → history.years.<ปีก่อนปีแผนตั้งต้น>.monthly.<เขต> = Σ ยอดอ้างอิงรายเดือนของร้านที่อยู่ในเขต ณ เดือนแรกของปีแผน
 *     (core/seed.js ใช้เป็นฐานของยอดขายปีก่อนราย SKU ของเขตต่อ)
 *
 * Pure functions — d = ข้อมูลแบบ store.data() (stores, storeAssignments, storeMoves, provinceSuggestions, territories, storeImport,
 *   storeChannels, history, settings) ไม่แก้ค่าที่ส่งเข้ามา คืนสำเนาใหม่เสมอ:
 *   territoryOf(d, storeId, month) · storesIn(d, territoryId | null, month) · membership(d, month)
 *   moveStores(d, storeIds, toTerritoryId, fromMonth, { current, at, by }) · unassignStores(d, storeIds, fromMonth, opts)
 *   suggestTerritory(store, provinceSuggestions) · outOfProvince(store, territoryId, provinceSuggestions) · provincesOf(store)
 *   storeMonthly(d, store) · territoryLastYear(d, territoryId, planYear, { approvedAt }) · priorMonthly(d, planYear, approvedAt)
 *   assignmentsAsOf(d, approvedAt) · movesAfterApproval(d, year, approvedAt) · applyHistory(d, planYear, approvedAt)
 *   summary(d, month) · movedInYear(d, storeId, year) · timeline(d, storeId, year) · currentMonth(d) · monthsBetween(from, to)
 *   performanceInput(d, year) (→ opts ของ calc.performanceByPerson) · approvedAt(state) · changedStores(before, after)
 *   nextTerritoryId(d, channelId) · storeTerritories(d)
 * store: ไม่อ่าน ไม่เขียน (store.data() เรียก applyHistory เพื่อให้ทุกหน้าที่ใช้ยอดขายปีก่อนเห็นร้านที่ย้ายแล้ว)
 */
(function (SP) {
  'use strict';

  var calc = SP.core.calc;

  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function cfgOf(d) { return (d && d.storeImport) || {}; }
  function zeros() { return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; }

  // =====================================================================
  // ช่วงเดือนของร้าน
  // =====================================================================

  function covers(a, key) { return a.fromMonth <= key && (a.toMonth == null || key <= a.toMonth); }
  function byFrom(a, b) { return a.fromMonth < b.fromMonth ? -1 : a.fromMonth > b.fromMonth ? 1 : 0; }
  function range(storeId, territoryId, fromMonth, toMonth) {
    return { storeId: storeId, territoryId: territoryId, fromMonth: fromMonth, toMonth: toMonth == null ? null : toMonth };
  }

  // { <storeId>: [ช่วง] } (อ้างอิงช่วงเดิม ไม่คัดลอก)
  function index(list) {
    var out = {};
    (list || []).forEach(function (a) { (out[a.storeId] = out[a.storeId] || []).push(a); });
    return out;
  }
  var lastList = null, lastIndex = null;
  function indexOf(list) {
    if (list !== lastList) { lastList = list; lastIndex = index(list); }
    return lastIndex;
  }

  function rangeAt(ranges, key) {
    for (var i = 0; i < ranges.length; i++) if (covers(ranges[i], key)) return ranges[i].territoryId || null;
    return null;
  }

  // เรียงตามเดือน + รวมช่วงติดกันของเขตเดียวกันเป็นช่วงเดียว
  function merge(ranges) {
    var out = [];
    ranges.slice().sort(byFrom).forEach(function (a) {
      var last = out[out.length - 1];
      if (last && last.territoryId === a.territoryId && last.toMonth != null && calc.addMonths(last.toMonth, 1) === a.fromMonth) last.toMonth = a.toMonth;
      else out.push(range(a.storeId, a.territoryId, a.fromMonth, a.toMonth));
    });
    return out;
  }

  // ร้านอยู่ในเขตใดในเดือน month ('YYYY-MM') → territoryId | null (ยังไม่จัดสรร)
  function territoryOf(d, storeId, month) { return rangeAt(indexOf(d.storeAssignments)[storeId] || [], month); }

  // เขตของทุกร้านในเดือน month → { <storeId>: territoryId | null } (list = ชุดช่วงที่ใช้แทน d.storeAssignments)
  function membership(d, month, list) {
    var idx = list ? index(list) : indexOf(d.storeAssignments);
    var out = {};
    (d.stores || []).forEach(function (s) { out[s.id] = rangeAt(idx[s.id] || [], month); });
    return out;
  }

  // ร้านในเขตในเดือน month (territoryId = null → ร้านที่ยังไม่จัดสรร)
  function storesIn(d, territoryId, month) {
    var m = membership(d, month);
    return (d.stores || []).filter(function (s) { return m[s.id] === (territoryId || null); });
  }

  // เขต 12 เดือนของปี → [territoryId | null]
  function timeline(d, storeId, year) {
    var ranges = indexOf(d.storeAssignments)[storeId] || [];
    var out = [];
    for (var m = 0; m < 12; m++) out.push(rangeAt(ranges, calc.monthKey(year, m)));
    return out;
  }

  // ย้ายเขตภายในปี year หรือไม่ (เขตของเดือนใดต่างจากเดือนก่อนหน้าในปีเดียวกัน รวมนำออกจากเขต / จัดสรรใหม่)
  function movedInYear(d, storeId, year) {
    var t = timeline(d, storeId, year);
    for (var m = 1; m < 12; m++) if (t[m] !== t[m - 1]) return true;
    return false;
  }

  // =====================================================================
  // ย้ายร้าน / นำออกจากเขต
  // =====================================================================

  // ย้ายร้าน storeIds ไปเขต toTerritoryId (null = นำออกจากเขต → ยังไม่จัดสรร) ตั้งแต่ fromMonth เป็นต้นไป
  //   ช่วงเดิมที่ครอบ fromMonth ปิดที่เดือนก่อนหน้า · ช่วงที่เริ่มตั้งแต่ fromMonth ถูกแทนที่ · ช่วงติดกันของเขตเดียวกันรวมเป็นช่วงเดียว
  //   opts.current = เดือนปัจจุบัน: fromMonth ก่อนเดือนปัจจุบัน (เดือนที่ผ่านแล้ว) → error 'past'
  //   ร้านที่ผลลัพธ์เหมือนเดิม (อยู่ในเขตปลายทางอยู่แล้ว) ไม่นับ
  //   opts.at / opts.by = เวลาและผู้ย้าย (เก็บใน move สำหรับ movesAfterApproval)
  // → { ok: true, storeAssignments, moved: [storeId], move: { at, by, to, fromMonth, storeIds, before: { <storeId>: [ช่วงเดิม] } } | null }
  //   | { ok: false, error: 'past' | 'range' }
  function moveStores(d, storeIds, toTerritoryId, fromMonth, opts) {
    opts = opts || {};
    if (!fromMonth || !/^\d{4}-\d{2}$/.test(fromMonth)) return { ok: false, error: 'range' };
    if (opts.current && fromMonth < opts.current) return { ok: false, error: 'past' };
    var to = toTerritoryId || null;
    var idx = index(d.storeAssignments);
    var before = {}, next = {}, moved = [];
    (storeIds || []).forEach(function (id) {
      if (before[id]) return;
      var ranges = (idx[id] || []).slice().sort(byFrom);
      var out = [];
      ranges.forEach(function (a) {
        if (a.fromMonth >= fromMonth) return;
        var end = a.toMonth != null && a.toMonth < fromMonth ? a.toMonth : calc.addMonths(fromMonth, -1);
        out.push(range(id, a.territoryId, a.fromMonth, end));
      });
      if (to) out.push(range(id, to, fromMonth, null));
      out = merge(out);
      if (JSON.stringify(merge(ranges)) === JSON.stringify(out)) return;
      before[id] = copy(ranges);
      next[id] = out;
      moved.push(id);
    });
    var list = (d.storeAssignments || []).filter(function (a) { return !next[a.storeId]; }).map(copy);
    moved.forEach(function (id) { list = list.concat(next[id]); });
    return {
      ok: true, storeAssignments: list, moved: moved,
      move: moved.length ? { at: opts.at || null, by: opts.by || '', to: to, fromMonth: fromMonth, storeIds: moved.slice(), before: before } : null
    };
  }

  function unassignStores(d, storeIds, fromMonth, opts) { return moveStores(d, storeIds, null, fromMonth, opts); }

  // ร้านที่ช่วงต่างกันระหว่าง 2 ชุด (นับรายการที่ยังไม่บันทึก) → [storeId]
  function changedStores(beforeList, afterList) {
    var a = index(beforeList), b = index(afterList), out = [];
    var ids = {};
    Object.keys(a).concat(Object.keys(b)).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).forEach(function (id) {
      if (JSON.stringify(merge(a[id] || [])) !== JSON.stringify(merge(b[id] || []))) out.push(id);
    });
    return out;
  }

  // =====================================================================
  // จังหวัด: แนะนำเขต / นอกจังหวัดของเขต
  // =====================================================================

  // จังหวัดของร้าน ('พะเยา,เชียงราย' → 2 จังหวัด) ไม่ระบุ → []
  function provincesOf(store) {
    if (!store || !store.province) return [];
    return String(store.province).split(',').map(function (p) { return p.trim(); }).filter(Boolean);
  }

  // เขตแนะนำจากจังหวัด: จังหวัดของร้านอยู่ในรายชื่อจังหวัดของเขตเดียวเท่านั้น → territoryId / อยู่หลายเขตหรือไม่ระบุ → null
  function suggestTerritory(store, provinceSuggestions) {
    var ps = provincesOf(store);
    if (!ps.length) return null;
    var hits = Object.keys(provinceSuggestions || {}).filter(function (t) {
      return (provinceSuggestions[t] || []).some(function (p) { return ps.indexOf(p) >= 0; });
    });
    return hits.length === 1 ? hits[0] : null;
  }

  // ร้านอยู่นอกจังหวัดของเขต: มีจังหวัด และไม่มีจังหวัดใดอยู่ในรายชื่อของเขต (เขตที่ยังไม่มีรายชื่อจังหวัด = ไม่เตือน)
  function outOfProvince(store, territoryId, provinceSuggestions) {
    var ps = provincesOf(store);
    var list = territoryId ? (provinceSuggestions || {})[territoryId] || [] : [];
    if (!ps.length || !list.length) return false;
    return !ps.some(function (p) { return list.indexOf(p) >= 0; });
  }

  // =====================================================================
  // ยอดอ้างอิง → ยอดขายปีก่อนของเขต
  // =====================================================================

  // ยอดอ้างอิงรายเดือนของร้าน = ยอดอ้างอิง × Seasonality ของ TT (จำนวนเต็ม ผลรวมเท่ายอดอ้างอิง)
  //   ยอดอ้างอิงติดลบ (รับคืนมากกว่าขาย) กระจายแบบเดียวกันแล้วใส่เครื่องหมายลบ ผลรวมของเขตจึงเท่ากับผลรวมยอดอ้างอิงเสมอ
  function storeMonthly(d, store) {
    var w = cfgOf(d).seasonality || [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    var v = store.salesRef || 0;
    var parts = calc.distributeAnnual(Math.abs(v), w);
    return v < 0 ? parts.map(function (x) { return x ? -x : 0; }) : parts;
  }

  // เขตของ Channel ที่มีข้อมูลร้านค้า
  function storeTerritories(d) {
    var chs = d.storeChannels || [];
    return (d.territories || []).filter(function (t) { return chs.indexOf(t.channelId) >= 0; });
  }

  // ช่วงของร้าน ณ เวลาที่อนุมัติ: ย้อนการย้ายที่ทำหลัง approvedAt (ล่าสุดก่อน) ด้วยช่วงเดิมที่เก็บไว้ใน move.before
  //   approvedAt = null → ช่วงปัจจุบัน
  function assignmentsAsOf(d, approvedAt) {
    var moves = approvedAt ? (d.storeMoves || []).filter(function (m) { return m.at && m.at > approvedAt; }) : [];
    if (!moves.length) return d.storeAssignments || [];
    var idx = index(d.storeAssignments);
    // ล่าสุดก่อน (เวลาเท่ากัน = ลำดับที่บันทึกหลังก่อน)
    moves.map(function (m, i) { return { m: m, i: i }; }).sort(function (a, b) {
      return a.m.at < b.m.at ? 1 : a.m.at > b.m.at ? -1 : b.i - a.i;
    }).forEach(function (x) {
      Object.keys(x.m.before || {}).forEach(function (id) { idx[id] = x.m.before[id]; });
    });
    var out = [];
    Object.keys(idx).forEach(function (id) { out = out.concat(idx[id].map(copy)); });
    return out;
  }

  // ยอดขายปีก่อนรายเดือนของแต่ละเขต สำหรับปีแผน planYear = Σ ยอดอ้างอิงรายเดือนของร้านที่อยู่ในเขต ณ เดือนแรกของปีแผน
  //   (เทียบแบบร้านเดียวกัน) approvedAt = เวลาที่อนุมัติจัดสรรเป้าหมายประจำปี (ย้ายหลังจากนั้นไม่นับ) → { <territoryId>: [12] }
  function priorMonthly(d, planYear, approvedAt) {
    var m = membership(d, calc.monthKey(planYear, 0), assignmentsAsOf(d, approvedAt));
    var out = {};
    (d.stores || []).forEach(function (s) {
      var t = m[s.id];
      if (!t) return;
      var row = out[t] = out[t] || zeros();
      storeMonthly(d, s).forEach(function (v, i) { row[i] += v; });
    });
    return out;
  }

  // ยอดขายปีก่อนทั้งปีของเขต = ผลรวมยอดอ้างอิงของร้านในเขต ณ เดือนแรกของปีแผน (opts.approvedAt ดู priorMonthly)
  function territoryLastYear(d, territoryId, planYear, opts) {
    var m = membership(d, calc.monthKey(planYear, 0), assignmentsAsOf(d, opts && opts.approvedAt));
    return calc.sum((d.stores || []).filter(function (s) { return m[s.id] === territoryId; }).map(function (s) { return s.salesRef || 0; }));
  }

  // ร้านที่ย้ายเขตหลังอนุมัติจัดสรรเป้าหมายประจำปี year: เขตในเดือนใดของปี year ต่างจาก ณ เวลาที่อนุมัติ
  //   → [{ storeId, systemId, name, masked, salesRef, from, to, month (เดือนแรกในปีที่ต่าง), fromMonth (เดือนที่มีผลของการย้ายล่าสุด), at, by }]
  function movesAfterApproval(d, year, approvedAt) {
    if (!approvedAt) return [];
    var asOf = assignmentsAsOf(d, approvedAt);
    if (asOf === d.storeAssignments) return [];
    var cur = index(d.storeAssignments), old = index(asOf);
    var last = {};
    (d.storeMoves || []).filter(function (m) { return m.at && m.at > approvedAt; }).forEach(function (m) {
      (m.storeIds || []).forEach(function (id) { if (!last[id] || last[id].at <= m.at) last[id] = m; });
    });
    var out = [];
    (d.stores || []).forEach(function (s) {
      for (var i = 0; i < 12; i++) {
        var k = calc.monthKey(year, i);
        var a = rangeAt(old[s.id] || [], k), b = rangeAt(cur[s.id] || [], k);
        if (a === b) continue;
        var mv = last[s.id];
        out.push({
          storeId: s.id, systemId: s.systemId, name: s.name, masked: !!s.masked, salesRef: s.salesRef || 0, from: a, to: b, month: k,
          fromMonth: mv ? mv.fromMonth : k, at: mv ? mv.at : null, by: mv ? mv.by : ''
        });
        break;
      }
    });
    return out;
  }

  // ยอดขายปีก่อนของเขต (history) ตามร้านที่อยู่ในเขตตอนนี้ — ก่อนอนุมัติเป้าหมายประจำปีคำนวณใหม่ หลังอนุมัติใช้ร้าน ณ เวลาที่อนุมัติ
  //   เปลี่ยน monthly ของเขต และปรับยอดขายปีก่อนราย SKU (skuQty) ของเขตตามสัดส่วนรายเดือน + Run-rate ของเขตนั้น
  //   ร้านเหมือนตอนนำเข้า → คืน d เดิม / ปีแผนอื่นที่ไม่มียอดขายปีก่อน → คืน d เดิม
  var BASE = null;                          // { planYear, sig, monthly } ตอนนำเข้า
  var memo = { sig: null, src: null, history: null };

  function rebuildHistory(d, planYear, pm) {
    var H = d.history, Y = planYear - 1, y = H.years[Y];
    var S = d.settings || SP.data.settings;
    var ny = {};
    Object.keys(y).forEach(function (k) { ny[k] = y[k]; });
    ny.monthly = {};
    Object.keys(y.monthly || {}).forEach(function (k) { ny.monthly[k] = y.monthly[k]; });
    var qty = y.skuQty || {};
    ny.skuQty = {};
    Object.keys(qty).forEach(function (k) { ny.skuQty[k] = qty[k]; });
    var runRate = {};
    Object.keys(H.runRate || {}).forEach(function (k) { runRate[k] = H.runRate[k]; });
    function rr(key) { if (runRate[key] === (H.runRate || {})[key]) runRate[key] = copy(runRate[key]) || {}; return runRate[key]; }
    storeTerritories(d).forEach(function (t) {
      var base = BASE.monthly[t.id] || null, next = pm[t.id] || null;
      if (JSON.stringify(base) === JSON.stringify(next)) return;
      if (next) ny.monthly[t.id] = next; else delete ny.monthly[t.id];
      var src = qty[t.id];
      if (!src) return;
      var out = {};
      Object.keys(src).forEach(function (k) {
        out[k] = src[k].map(function (v, m) { var b = base ? base[m] : 0; return b > 0 && next ? Math.round(v * next[m] / b) : 0; });
        var r = calc.runRateFrom(out[k], y.actualMonths, S.RUN_RATE_MONTHS);
        if (r != null) rr(k)[t.id] = Math.round(r);
        else if (runRate[k] && runRate[k][t.id] != null) delete rr(k)[t.id];
      });
      ny.skuQty[t.id] = out;
    });
    var out = {};
    Object.keys(H).forEach(function (k) { out[k] = H[k]; });
    out.years = {};
    Object.keys(H.years).forEach(function (k) { out.years[k] = H.years[k]; });
    out.years[Y] = ny;
    out.runRate = runRate;
    return out;
  }

  function applyHistory(d, planYear, approvedAt) {
    if (!BASE || planYear !== BASE.planYear || !d.history || !d.history.years[planYear - 1]) return d;
    var pm = priorMonthly(d, planYear, approvedAt);
    var sig = JSON.stringify(pm);
    if (sig === BASE.sig) return d;
    if (memo.sig !== sig || memo.src !== d.history) memo = { sig: sig, src: d.history, history: rebuildHistory(d, planYear, pm) };
    var out = {};
    Object.keys(d).forEach(function (k) { out[k] = d[k]; });
    out.history = memo.history;
    return out;
  }

  // เวลาที่อนุมัติจัดสรรเป้าหมายประจำปี (state = plan.<ปี>.workflow.topDown.all) → ISO | null (ยังไม่อนุมัติ)
  //   CR-17: ปิด approvalWorkflow = ไม่มีการอนุมัติ → null เสมอ (ยอดปีก่อนของเขตคำนวณตามร้านปัจจุบัน ไม่มีรายการย้ายหลังอนุมัติ)
  function approvedAt(state) {
    if (SP.core.features && !SP.core.features.isOn('approvalWorkflow')) return null;
    if (!state || state.status !== 'approved') return null;
    var e = SP.core.workflow ? SP.core.workflow.lastOf(state, 'approve') : null;
    return e && e.at ? e.at : null;
  }

  // =====================================================================
  // สรุป / อื่นๆ
  // =====================================================================

  // ตัวเลขสรุปของเดือน month → { total, active, unassigned, outOfProvince, noProvince }
  function summary(d, month) {
    var m = membership(d, month);
    var out = { total: 0, active: 0, unassigned: 0, outOfProvince: 0, noProvince: 0 };
    (d.stores || []).forEach(function (s) {
      out.total++;
      if (s.active !== false) out.active++;
      if (!m[s.id]) out.unassigned++;
      else if (outOfProvince(s, m[s.id], d.provinceSuggestions)) out.outOfProvince++;
      if (!provincesOf(s).length) out.noProvince++;
    });
    return out;
  }

  // เดือนปัจจุบันของข้อมูลร้านค้า = เดือนปัจจุบันกลาง (CR-24 core/clock.js · ก.ย. 2026)
  //   ไม่มี clock (ไฟล์เก่า) = เดือนถัดจากเดือนจริงล่าสุดของยอดขายปีล่าสุด (history.actualMonths) เช่น ม.ค.–ส.ค. 2026 → '2026-09'
  function currentMonth(d) {
    if (SP.core.clock) return SP.core.clock.currentMonth();
    var years = Object.keys((d.history && d.history.years) || {}).map(Number).sort(function (a, b) { return a - b; });
    if (!years.length) return calc.monthKey((d.settings || SP.data.settings).DEFAULT_PLAN_YEAR, 0);
    var y = years[years.length - 1];
    var n = d.history.years[y].actualMonths;
    return n >= 12 ? calc.monthKey(y + 1, 0) : calc.monthKey(y, n || 0);
  }

  // เดือนตั้งแต่ from ถึง to ('YYYY-MM') → [key]
  function monthsBetween(from, to) {
    var out = [];
    for (var k = from; k <= to; k = calc.addMonths(k, 1)) out.push(k);
    return out;
  }

  // ข้อมูลร้านค้าสำหรับ calc.performanceByPerson: ยอดอ้างอิงรายเดือนของร้าน + เขตของร้าน 12 เดือนของปี year
  //   → { values: { <storeId>: [12] }, territory: { <storeId>: [12 territoryId | null] } }
  function performanceInput(d, year) {
    var values = {}, territory = {};
    (d.stores || []).forEach(function (s) { values[s.id] = storeMonthly(d, s); territory[s.id] = timeline(d, s.id, year); });
    return { values: values, territory: territory };
  }

  // id ของเขตใหม่ = รูปแบบเดียวกับเขตเดิมของ Channel (TT-04 → TT-05) ไม่มีเขตเดิม → {CHANNEL}-01
  function nextTerritoryId(d, channelId) {
    var prefix = null, max = 0;
    (d.territories || []).forEach(function (t) {
      var m = /^(.*?)(\d+)$/.exec(t.id);
      if (t.channelId !== channelId || !m) return;
      prefix = prefix || m[1];
      if (m[1] === prefix) max = Math.max(max, Number(m[2]));
    });
    if (prefix == null) prefix = String(channelId).toUpperCase() + '-';
    var n = max + 1;
    return prefix + (n < 10 ? '0' : '') + n;
  }

  // =====================================================================
  // นำเข้า (ตอนโหลด)
  // =====================================================================

  function normProvince(value, aliases) {
    if (!value) return null;
    return String(value).split(',').map(function (p) { var s = p.trim(); return aliases[s] || s; }).filter(Boolean).join(',') || null;
  }

  function unique(list) { var seen = {}; return list.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true; }); }

  // data = SP.data → { stores, storeAssignments, provinceSuggestions, territories, salespeople, assignments, channels } | null (ไม่มี seed)
  function build(data) {
    var cfg = data.storeImport;
    var seed = cfg && data[cfg.seed];
    if (!seed) return null;
    var chMap = cfg.channelMap || {};
    var aliases = cfg.provinceAliases || {};
    function ch(id) { return id == null ? null : chMap[id] || id; }
    var seen = {};
    var stores = (seed.stores || []).map(function (s) {
      var n = seen[s.storeId] = (seen[s.storeId] || 0) + 1;
      return {
        id: n === 1 ? String(s.storeId) : s.storeId + '-' + n, systemId: String(s.storeId), name: s.name, masked: !!s.masked,
        storeType: s.storeType || null, tags: copy(s.tags || []), priceType: s.priceType || null, active: s.active !== false,
        province: normProvince(s.province, aliases), hasExport: !!s.hasExport, hasOnline: !!s.hasOnline, salesRef: s.salesRef || 0, duplicates: 1
      };
    });
    stores.forEach(function (s) { s.duplicates = seen[s.systemId]; });
    // ยอดรวมตามที่ seed ตั้งใจ: ส่วนต่างจากการปัดเศษ (บาท) ใส่ให้ร้านที่ยอดอ้างอิงสูงสุดร้านละ 1 บาท (เท่ากัน = ลำดับในไฟล์)
    if (cfg.salesRefTotal) {
      var diff = Math.round(cfg.salesRefTotal - calc.sum(stores.map(function (s) { return s.salesRef; })));
      stores.map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return x.s.salesRef > 0; })
        .sort(function (a, b) { return b.s.salesRef - a.s.salesRef || a.i - b.i; })
        .slice(0, Math.abs(diff)).forEach(function (x) { x.s.salesRef += diff > 0 ? 1 : -1; });
    }
    // ช่วงของร้าน: แถวที่ System ID ซ้ำใช้ช่วงชุดเดียวกัน (ตัดช่วงที่ซ้ำกันในไฟล์ต้นทาง)
    var ranges = {};
    (seed.storeAssignments || []).forEach(function (a) {
      var k = [a.territoryId, a.fromMonth, a.toMonth || ''].join('|');
      var r = ranges[a.storeId] = ranges[a.storeId] || {};
      r[k] = a;
    });
    var storeAssignments = [];
    stores.forEach(function (s) {
      var r = ranges[s.systemId] || {};
      Object.keys(r).forEach(function (k) { storeAssignments.push(range(s.id, r[k].territoryId, r[k].fromMonth, r[k].toMonth)); });
    });
    var territories = (seed.territories || []).map(function (t) { return { id: t.id, channelId: ch(t.channelId), name: t.name, active: t.active !== false }; });
    var suggestions = {};
    Object.keys(seed.provinceSuggestions || {}).forEach(function (t) {
      suggestions[t] = unique((seed.provinceSuggestions[t] || []).map(function (p) { return normProvince(p, aliases); }).filter(Boolean));
    });
    territories.forEach(function (t) { if (!suggestions[t.id]) suggestions[t.id] = []; });
    return {
      stores: stores, storeAssignments: storeAssignments, provinceSuggestions: suggestions, territories: territories,
      salespeople: (seed.salespeople || []).map(function (p) {
        return { id: p.id, name: p.name, channelId: ch(p.channelId || p.channel), startMonth: p.startMonth || null, endMonth: p.endMonth || null };
      }),
      assignments: (seed.territoryAssignments || []).map(function (a) {
        return { unitId: a.unitId, salesPersonId: a.salesPersonId || null, fromMonth: a.fromMonth, toMonth: a.toMonth || null };
      }),
      channels: unique(territories.map(function (t) { return t.channelId; }))
    };
  }

  var result = build(SP.data);
  if (result) {
    var D = SP.data;
    var oldUnits = (D.territories || []).filter(function (t) { return result.channels.indexOf(t.channelId) >= 0; }).map(function (t) { return t.id; });
    var newUnits = result.territories.map(function (t) { return t.id; });
    var newPeople = result.salespeople.map(function (p) { return p.id; });
    D.territories = (D.territories || []).filter(function (t) { return result.channels.indexOf(t.channelId) < 0; }).concat(result.territories);
    D.salespeople = (D.salespeople || []).filter(function (p) { return newPeople.indexOf(p.id) < 0; }).concat(result.salespeople);
    D.assignments = (D.assignments || []).filter(function (a) {
      return oldUnits.indexOf(a.unitId) < 0 && newUnits.indexOf(a.unitId) < 0;
    }).concat(result.assignments);
    D.stores = result.stores;
    D.storeAssignments = result.storeAssignments;
    D.provinceSuggestions = result.provinceSuggestions;
    D.storeMoves = [];
    D.storeChannels = result.channels;
    // ยอดขายปีก่อนของเขต สำหรับปีแผนตั้งต้น
    var planYear = D.settings.DEFAULT_PLAN_YEAR;
    var hy = D.history && D.history.years[planYear - 1];
    if (hy) {
      oldUnits.forEach(function (id) { delete hy.monthly[id]; });
      var pm = priorMonthly(D, planYear, null);
      Object.keys(pm).forEach(function (t) { hy.monthly[t] = pm[t]; });
      BASE = { planYear: planYear, sig: JSON.stringify(pm), monthly: pm };
    }
  }

  SP.core.stores = {
    imported: !!result,
    build: build,
    territoryOf: territoryOf,
    storesIn: storesIn,
    membership: membership,
    timeline: timeline,
    movedInYear: movedInYear,
    moveStores: moveStores,
    unassignStores: unassignStores,
    changedStores: changedStores,
    provincesOf: provincesOf,
    suggestTerritory: suggestTerritory,
    outOfProvince: outOfProvince,
    storeMonthly: storeMonthly,
    storeTerritories: storeTerritories,
    assignmentsAsOf: assignmentsAsOf,
    priorMonthly: priorMonthly,
    territoryLastYear: territoryLastYear,
    movesAfterApproval: movesAfterApproval,
    applyHistory: applyHistory,
    approvedAt: approvedAt,
    summary: summary,
    currentMonth: currentMonth,
    monthsBetween: monthsBetween,
    performanceInput: performanceInput,
    nextTerritoryId: nextTerritoryId
  };
})(window.SP);

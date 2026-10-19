/*
 * core/scenario.js — CR-41 สถานการณ์ Demo (data/scenarios.js · นาฬิกากลาง core/clock.js)
 *
 * ตอนโหลด (หลัง core/seed.js ก่อน core/units.js): สถานการณ์ที่เลือกมี build.sampleFrom → ยอดจริงตัวอย่างลง SP.data.history / SP.data.actuals
 *   buildSample(D, scenario) → { history, actuals, months } ฟังก์ชันล้วน (ไม่แก้ D · สูตรคงที่ ไม่สุ่ม → ค่าเดิมทุกครั้งที่โหลด)
 *     เดือน sampleFrom ถึงเดือนปิดล่าสุดของสถานการณ์ (S2: ก.ย. 2026 – ม.ค. 2027):
 *       เดือนก่อนปีแผน = ยอดเดือนเดียวกันปีก่อน × (1 + การเติบโตของ Channel = เป้าหมายปีแผนเทียบ L12M ภายใต้นาฬิกาของ base · ผู้ใช้เลือก)
 *       เดือนในปีแผน   = จำนวนในแผน R1 ของเดือนนั้น × ตัวคูณของ Channel (build.planFactor) · Net Sales ของหน่วย = Net Sales ในแผนของเดือน × ตัวคูณ
 *                        (หน่วยขายที่ไม่อยู่ในแผน = สูตรเดือนก่อนปีแผน)
 *       ระดับ SKU × หน่วยขาย × เดือน (ระดับเดียวกับยอดจริงเดิม) · ปัดเป็นจำนวนเต็ม · SKU ที่ Status / Listing ไม่ได้ขายในเดือนนั้น = 0
 *     history.years[ปี].sample = [12 bool] เดือนที่เป็นยอดจริงตัวอย่าง (isSample) · actualMonths ขยายถึงเดือนปิดล่าสุด
 *   แผน R1 คำนวณภายใต้นาฬิกาของ build.base (= ค่าตั้งต้นของสถานการณ์ base) จึงเท่ากับแผนที่ load() Lock ไว้
 *
 * load(id) (เมนู สถานการณ์ Demo · ต้องมี store): ล้าง store (คงมุมมองผู้ใช้และการพับเมนู) → app.scenario → build.r1:
 *   ภายใต้นาฬิกาของ base: เขียนค่าตั้งต้นของ 4 ขั้นลง store (รอบถัดไปคัดลอกค่าเดียวกันไม่ว่านาฬิกาอยู่เดือนใด) →
 *   ส่งขออนุมัติ · ความคิดเห็น · อนุมัติและ Lock ด้วยฟังก์ชันจริงของ CR-38 / CR-39 (revision.lockFirstRound · Snapshot จริง ไม่เขียนเอง)
 *   → { ok, home, homeTab, error } (หน้าแรกของสถานการณ์ · ผู้เรียกโหลดหน้าใหม่ให้นาฬิกาและยอดตัวอย่างตรงกับสถานการณ์)
 */
(function (SP) {
  'use strict';

  var SELLING = ['new', 'active', 'clearance'];
  var applied = null;   // { id, months } ยอดตัวอย่างที่ใช้ในหน้านี้ (null = ไม่มี)

  function calc() { return SP.core.calc; }
  function clock() { return SP.core.clock; }
  function scenarios() { return (SP.data.scenarios && SP.data.scenarios.list) || []; }
  function find(id) { return scenarios().filter(function (s) { return s.id === id; })[0] || null; }
  function current() { return find(clock().scenarioId()); }
  function copyRows(map) {
    var out = {};
    Object.keys(map || {}).forEach(function (k) { out[k] = Array.isArray(map[k]) ? map[k].slice() : copyRows(map[k]); });
    return out;
  }

  // แผนตั้งต้นของปีแผน (= ค่าตั้งต้นของ store plan.<ปี>.topDown)
  function targetPlan(D, year) {
    var t = D.targets.years[year];
    return t ? { total: t.total, channels: t.channels.slice(), pct: JSON.parse(JSON.stringify(t.pct)), units: JSON.parse(JSON.stringify(t.units)) } : null;
  }
  // การเติบโตของ Channel (เป้าหมายเทียบ L12M) และ Grid แผน SKU ของทุกหน่วยในแผน (ค่าตั้งต้น · ภายใต้นาฬิกาที่ใช้อยู่)
  function planBase(D, year) {
    var c = calc();
    var td = targetPlan(D, year);
    if (!td) return { growth: {}, grids: {} };
    var tree = c.topDown(D, td, year);
    var growth = {}, grids = {};
    tree.children.forEach(function (ch) {
      growth[ch.id] = ch.prior ? ch.amount / ch.prior - 1 : 0;
      ch.children.forEach(function (u) {
        var seeds = D.planSeeds && D.planSeeds.years[year] ? D.planSeeds.years[year][u.id] : null;
        var plan = c.defaultSkuPlan(D, u.id, year, true, seeds);
        grids[u.id] = c.skuPlanGrid(D, D, u.id, plan, { year: year, mode: 'initial', target: u.amount });
      });
    });
    return { growth: growth, grids: grids };
  }
  // สินค้าขายในหน่วยนี้ในเดือน ym หรือไม่ (Status ขายได้ · Listing วางขายและอยู่ในช่วง)
  function sellsAt(D, key, unitId, ym) {
    var c = calc();
    var p = c.findProduct(D.products, key);
    if (!p || SELLING.indexOf(c.productStatus(p, ym, D.settings.NPD_MONTHS)) < 0) return false;
    var l = c.listingOf(D.listings, key, unitId);
    if (!l || c.listingStatus(l) === 'offered' || c.listingStatus(l) === 'delisted' && !l.toMonth) return false;
    var k = clock().parse(ym);
    return !c.listingOutside(l, k.year, k.month - 1);
  }

  function buildSample(D, sc) {
    var b = sc && sc.build;
    if (!b || !b.sampleFrom) return null;
    var K = clock(), c = calc();
    var year = sc.planYear || D.settings.DEFAULT_PLAN_YEAR;
    var last = K.withScenario(sc.id, K.lastClosedMonth);
    var base = K.withScenario(b.base || sc.id, function () { return planBase(D, year); });
    var factor = b.planFactor || {};
    var H = D.history;
    var out = {};
    Object.keys(H).forEach(function (k) { out[k] = H[k]; });
    out.years = {};
    Object.keys(H.years).forEach(function (y) { out.years[y] = H.years[y]; });
    var copied = {};
    function yearOf(y) {
      if (!copied[y]) {
        var src = H.years[y] || { actualMonths: 0, monthly: {}, skuQty: {} };
        var o = {};
        Object.keys(src).forEach(function (k) { o[k] = src[k]; });
        o.monthly = copyRows(src.monthly);
        o.skuQty = copyRows(src.skuQty);
        o.sample = src.sample ? src.sample.slice() : [false, false, false, false, false, false, false, false, false, false, false, false];
        o.actualMonths = src.actualMonths == null ? 0 : src.actualMonths;
        o.year = Number(y);
        out.years[y] = o;
        copied[y] = true;
      }
      return out.years[y];
    }
    // ปีที่ยังไม่มีในข้อมูล (ปีแผน) = เดือนที่ยังไม่เกิดเป็นค่าว่าง (null) ไม่ใช่ 0 → ไม่ถูกใช้เป็นประมาณการของยอดอ้างอิง (calc.skuReference)
    function row(map, id, y) {
      var blank = H.years[y] ? 0 : null;
      if (!map[id]) map[id] = [blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank];
      return map[id];
    }
    function channelOf(unitId) { var info = c.unitInfo(D, unitId); return info && info.channel ? info.channel.id : null; }
    // เดือนเดียวกันปีก่อน × (1 + การเติบโตของ Channel) ของหน่วย unitId
    function priorGrowth(Y, prev, unitId, m, ym) {
      var g = base.growth[channelOf(unitId)] || 0;
      if (prev.monthly && prev.monthly[unitId]) row(Y.monthly, unitId, Y.year)[m] = Math.round((prev.monthly[unitId][m] || 0) * (1 + g));
      var pq = (prev.skuQty || {})[unitId] || {};
      Object.keys(pq).forEach(function (key) {
        if (!Y.skuQty[unitId]) Y.skuQty[unitId] = {};
        row(Y.skuQty[unitId], key, Y.year)[m] = sellsAt(D, key, unitId, ym) ? Math.round((pq[key][m] || 0) * (1 + g)) : 0;
      });
    }
    var actuals = null;
    var months = [];
    for (var ym = b.sampleFrom; ym <= last; ym = K.addMonths(ym, 1)) months.push(ym);
    months.forEach(function (ym) {
      var p = K.parse(ym), y = p.year, m = p.month - 1;
      var Y = yearOf(y), prev = H.years[y - 1] || { monthly: {}, skuQty: {} };
      var units = {};
      Object.keys(prev.monthly || {}).forEach(function (u) { units[u] = true; });
      Object.keys(base.grids).forEach(function (u) { units[u] = true; });
      Object.keys(units).forEach(function (u) {
        var grid = y === year ? base.grids[u] : null;
        if (!grid) { priorGrowth(Y, prev, u, m, ym); return; }
        var f = factor[channelOf(u)] == null ? 1 : factor[channelOf(u)];
        row(Y.monthly, u, y)[m] = Math.round((grid.totals.net[m] || 0) * f);
        if (!Y.skuQty[u]) Y.skuQty[u] = {};
        if (!actuals) actuals = JSON.parse(JSON.stringify(D.actuals || { years: {} }));
        var ay = actuals.years[y] = actuals.years[y] || {};
        var au = ay[u] = ay[u] || {};
        grid.rows.forEach(function (r) {
          var q = Math.round((r.cells[m].units || 0) * f);
          row(Y.skuQty[u], r.key, y)[m] = q;
          row(au, r.key, y)[m] = q;
        });
      });
      Y.sample[m] = true;
      Y.actualMonths = Math.max(Y.actualMonths, m + 1);
    });
    return { history: out, actuals: actuals || D.actuals, months: months };
  }

  // ยอดจริงตัวอย่างของสถานการณ์ที่เลือก (ตอนโหลด · ก่อน core/units.js คำนวณยอดอ้างอิงของคู่ค้า)
  (function applyAtLoad() {
    var sc = current();
    var res = sc ? buildSample(SP.data, sc) : null;
    if (!res) return;
    SP.data.history = res.history;
    SP.data.actuals = res.actuals;
    applied = { id: sc.id, months: res.months };
  })();

  // เดือน m (0–11) ของปี year เป็นยอดจริงตัวอย่างหรือไม่ (ข้อความกำกับ · Tooltip)
  function isSample(year, m) {
    var y = SP.data.history && SP.data.history.years[year];
    return !!(y && y.sample && y.sample[m]);
  }
  function sampleMonths() { return applied ? applied.months.slice() : []; }

  // ---------------------------------------------------------------------
  // โหลดสถานการณ์ (ต้องมี store) → { ok, home, homeTab, error }
  // ---------------------------------------------------------------------
  function load(id) {
    var sc = find(id);
    if (!sc) return { ok: false, error: 'scenario' };
    var S = SP.core.store;
    var keep = { role: S.get('ui.role'), collapsed: S.get('ui.sidebarCollapsed') };
    S.reset();
    S.set('app.scenario', sc.id);
    clock().refresh();
    if (keep.role) S.set('ui.role', keep.role);
    if (keep.collapsed) S.set('ui.sidebarCollapsed', true);
    var b = sc.build;
    if (b && b.r1) {
      var res = clock().withScenario(b.base || sc.id, function () { return lockR1(S, sc.planYear, b.r1); });
      if (!res.ok) return res;
    }
    return { ok: true, home: sc.home, homeTab: sc.homeTab || null, error: null };
  }
  // R1 ของปีแผน: เขียนค่าตั้งต้นของ 4 ขั้นลง store แล้ว ส่ง → ความคิดเห็น → อนุมัติและ Lock (Snapshot จริงของ CR-38)
  function lockR1(S, year, spec) {
    var c = calc();
    var td = S.get('plan.' + year + '.topDown');
    S.set('plan.' + year + '.topDown', td);
    c.topDown(S.data(), td, year).children.forEach(function (ch) {
      ch.children.forEach(function (u) {
        ['phasing.', 'sku.'].forEach(function (k) { var key = 'plan.' + year + '.' + k + u.id; S.set(key, S.get(key)); });
      });
    });
    return SP.core.revision.lockFirstRound(year, spec);
  }

  SP.core.scenario = {
    list: scenarios,
    find: find,
    current: current,
    buildSample: buildSample,
    isSample: isSample,
    sampleMonths: sampleMonths,
    load: load
  };
})(window.SP);

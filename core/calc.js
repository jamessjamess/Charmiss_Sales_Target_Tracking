/*
 * core/calc.js — สูตรทั้งหมดของระบบ (ที่เดียวทั้งเว็บ)
 *
 * - Pure functions: ไม่แตะ DOM ไม่อ่าน store
 * - ค่าคงที่ (VAT, PRICE_INCLUDES_VAT, NPD_MONTHS, ALERT_TOLERANCE_BAHT) อ่านจาก SP.data.settings
 *   เป็นค่าตั้งต้น และส่งค่าเองเข้ามาแทนได้
 * - % และ GP เป็นสัดส่วน (0.45 = 45%)
 * - เดือนเป็น index 0–11 ของปีแผน (0 = ม.ค.)
 * - หน่วยแบ่งเป้า (unit) = Account หรือเขตการขาย ตาม allocationUnit ของ Channel (ชื่อพารามิเตอร์เก่า accountId = unitId)
 * - เดือนของผู้รับผิดชอบเป็น 'YYYY-MM' (monthKey)
 * - Test อยู่ที่ tests/calc.test.js
 */
(function (SP) {
  'use strict';

  function settings() { return SP.data.settings; }

  function sum(arr) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += arr[i] || 0;
    return t;
  }

  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }

  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  // =====================================================================
  // 1) Measure chain: จำนวนชิ้น → Sale Amount (รวม VAT) → Net Sales (CR-18)
  // =====================================================================

  // CR-18: ราคาใน Product Master และราคาต่อ Account รวม VAT (settings.PRICE_INCLUDES_VAT = true)
  //   Sale Amount = จำนวนชิ้น × ราคาขาย (ราคาต่อ Account ถ้ามี · TT = ราคา Dealer · นอกนั้น RSP)
  //   Net Sales   = Sale Amount ÷ (1 + VAT) × (1 − GP)   Channel ที่มี GP (MT = GP ของ Account · ECOM = Platform Fee)
  //               = Sale Amount ÷ (1 + VAT)              Channel ที่ไม่มี GP (TT)
  //   ย้อนกลับ   Sale Amount = Net Sales ÷ (1 − GP) × (1 + VAT)
  //   netSales() คือสูตรเดียวของระบบ — chain / moneySplit / cellBreakdown / ยอดปีก่อน / ยอดจริง / core/seed.js เรียกผ่านฟังก์ชันนี้

  function includesVatOf(v) { return v == null ? settings().PRICE_INCLUDES_VAT : v; }

  // ยอดก่อน VAT ของยอดขาย (ราคารวม VAT → ÷ (1 + VAT) / ราคาไม่รวม VAT → เท่าเดิม)
  function exVat(sale, includesVat) { return includesVatOf(includesVat) ? sale / (1 + settings().VAT) : sale; }

  // Net Sales ของ qty ชิ้นที่ราคา price (บาท รวม VAT) → ตัวเลข | null
  //   channel = Channel หรือ { hasGP } (ไม่ส่ง = มี GP) / account = Account หรือ { gp } (สัดส่วน 0.40 = 40%)
  //   Channel ที่มี GP แต่ Account ยังไม่มี GP → null (คำนวณไม่ได้) / opts.includesVat (ค่าตั้งต้น settings)
  //   MT 100 × 50 GP 45% → 2,570.09 · ECOM Platform Fee 20% → 3,738.32 · TT → 4,672.90
  function netSales(qty, price, channel, account, opts) {
    var ex = exVat((Number(qty) || 0) * (Number(price) || 0), opts && opts.includesVat);
    if (channel && channel.hasGP === false) return ex;
    var gp = account ? account.gp : null;
    if (gp == null || gp === '' || isNaN(Number(gp))) return null;
    return ex * (1 - Number(gp));
  }

  // ย้อนกลับ: Sale Amount (รวม VAT) ที่ได้ Net Sales นี้ = Net Sales ÷ (1 − GP) × (1 + VAT) → ตัวเลข | null (ยังไม่มี GP)
  //   hasGP false = ไม่หัก GP / Net Sales 100 GP 45% → 194.55
  function saleFromNet(net, gp, hasGP, includesVat) {
    var g = hasGP === false ? 0 : gp;
    if (g == null || isNaN(Number(g)) || Number(g) >= 1) return null;
    var ex = net / (1 - Number(g));
    return includesVatOf(includesVat) ? ex * (1 + settings().VAT) : ex;
  }

  // ทุกขั้นในครั้งเดียว: { units, price, gp, hasGP, includesVat }
  //   → { saleAmount (รวม VAT), exVat, netSales (null = ยังไม่มี GP), gpAmount, vatAmount }
  function chain(o) {
    var sale = (Number(o.units) || 0) * (Number(o.price) || 0);
    var hasGP = o.hasGP !== false;
    var net = netSales(o.units, o.price, { hasGP: hasGP }, { gp: o.gp }, { includesVat: o.includesVat });
    var ex = exVat(sale, o.includesVat);
    return { saleAmount: sale, exVat: ex, netSales: net, gpAmount: net == null ? null : ex - net, vatAmount: sale - ex };
  }

  function reverseChain(net, gp, hasGP) {
    var sale = saleFromNet(net, gp, hasGP);
    var ex = sale == null ? null : exVat(sale);
    return { netSales: net, saleAmount: sale, exVat: ex, gpAmount: ex == null ? null : ex - net, vatAmount: sale == null ? null : sale - ex };
  }

  // =====================================================================
  // 2) Remaining และ Alert
  // =====================================================================

  // 'ok' = จัดสรรครบ (±ALERT_TOLERANCE_BAHT) | 'short' = ขาด (คงเหลือ > 0) | 'over' = เกิน (คงเหลือ < 0)
  function alertStatus(amount, tolerance) {
    if (tolerance == null) tolerance = settings().ALERT_TOLERANCE_BAHT;
    if (Math.abs(amount) <= tolerance) return 'ok';
    return amount > 0 ? 'short' : 'over';
  }

  // คงเหลือ = เป้าชั้นบน − ผลรวมที่แบ่งแล้ว (บาท และ % ของเป้า)
  // เป้าชั้นบนเป็น 0 และยังไม่ได้แบ่ง → 'empty' (ยังไม่กำหนด)
  function remaining(target, allocated, tolerance) {
    if (tolerance == null) tolerance = settings().ALERT_TOLERANCE_BAHT;
    var amount = target - allocated;
    return {
      target: target,
      allocated: allocated,
      amount: amount,
      pct: target ? amount / target : 0,
      status: !target && Math.abs(allocated) <= tolerance ? 'empty' : alertStatus(amount, tolerance)
    };
  }

  // คงเหลือของกลุ่มที่ยังไม่มีรายการให้แบ่ง (เช่น Channel ที่ยังไม่มี Account/เขต) → 'empty' เสมอ
  function emptyRemaining(target) {
    return { target: target, allocated: 0, amount: target, pct: target ? 1 : 0, status: 'empty' };
  }

  // =====================================================================
  // 3) Channel และหน่วยแบ่งเป้า (Account / เขตการขาย)
  // =====================================================================

  // สีของ Channel = ชื่อ CSS Variable (--ch-1 ถึง --ch-8) ไม่มี colorToken = สีถัดไปตาม order
  function channelColor(ch) {
    if (ch && ch.colorToken) return ch.colorToken;
    return '--ch-' + ((((ch && ch.order) || 1) - 1) % 8 + 1);
  }

  // หน่วยแบ่งเป้าทั้งหมดใน Master → [{ id, name, channelId, active, type: 'ACCOUNT' | 'TERRITORY', gp, gpFrom }]
  function allUnits(data) {
    var out = [];
    (data.accounts || []).forEach(function (a) {
      out.push({ id: a.id, name: a.name, channelId: a.channelId, active: a.active !== false, type: 'ACCOUNT', gp: a.gp, gpFrom: a.gpFrom });
    });
    (data.territories || []).forEach(function (t) {
      out.push({ id: t.id, name: t.name, channelId: t.channelId, active: t.active !== false, type: 'TERRITORY' });
    });
    return out;
  }

  // หน่วยของ Channel ตาม allocationUnit (ACCOUNT → Account Master / TERRITORY → Territory Master)
  function unitsOfChannel(data, channelId, activeOnly) {
    var ch = findById(data.channels, channelId);
    if (!ch) return [];
    return allUnits(data).filter(function (u) {
      return u.channelId === ch.id && u.type === (ch.allocationUnit || 'ACCOUNT') && (!activeOnly || u.active);
    });
  }

  // หน่วยพร้อม Channel → { unit, channel } หรือ null
  function unitInfo(data, unitId) {
    var unit = findById(allUnits(data), unitId);
    if (!unit) return null;
    return { unit: unit, channel: findById(data.channels, unit.channelId) };
  }

  // GP ที่ใช้กับหน่วย (สัดส่วน ค่าเดียวทั้งปี — CR-18): Channel ที่ hasGP = false → 0 / นอกนั้น GP ของ Account
  //   (ECOM = Platform Fee) / Account ยังไม่มี GP → null (Net Sales คำนวณไม่ได้)
  function gpOf(data, unitId) {
    var info = unitInfo(data, unitId);
    if (!info || !info.channel || info.channel.hasGP === false) return 0;
    var g = info.unit.gp;
    return g == null || g === '' || isNaN(Number(g)) ? null : Number(g);
  }

  // =====================================================================
  // 4) Top-down: Total → Channel → หน่วยแบ่งเป้า
  // =====================================================================

  // % ↔ บาท: ค่าที่เก็บจริงคือ % (สัดส่วนของเป้าชั้นบน) บาทคำนวณจาก % เสมอ
  function amountFromPct(base, pct) { return base * pct; }
  function pctFromAmount(base, amount) { return base ? amount / base : 0; }

  // การเติบโต = เป้า ÷ ปีก่อน − 1 / เป้าเป็น 0 → NaN (แสดง "–") / ไม่มียอดปีก่อน → null (แสดง "ใหม่")
  function growth(target, prior) {
    if (!target) return NaN;
    return prior > 0 ? target / prior - 1 : null;
  }

  // แท่ง "เป้าหมายเทียบปีก่อน" (CR-10 ข้อ 3.4 ฉบับแก้ไข): สเกลจริง (True Scale) ร่วมกันทั้งตาราง เริ่มที่ 0
  // ค่าสูงสุดของสเกล = ค่ามากสุดของ "เป้าหมาย" และ "ยอดขายปีก่อน" ทุกแถว ปัดขึ้นเป็นเลขกลม
  //   ขั้นละ settings.SCALE_STEP_BAHT (10 ล้าน) / ค่าสูงสุดน้อยกว่า SCALE_SMALL_BELOW_BAHT (30 ล้าน) ใช้ขั้น SCALE_STEP_SMALL_BAHT (5 ล้าน)
  //   [54,000,000, 51,700,000, …] → 60,000,000 / [18,000,000, 12,000,000] → 20,000,000 / ไม่มีค่ามากกว่า 0 → 0
  // opts (CR-12 แกนกราฟ) = { headroom } → ค่ามากที่สุด × (1 + headroom) แล้วปัดขึ้นด้วยขั้นของ niceAxis (4–6 เส้น ขั้นละ 1 / 2 / 2.5 / 5 × 10^n)
  //   ([12,900,000, 12,700,000, 11,900,000], { headroom: 0.10 }) → 15,000,000 (ขั้นละ 2,500,000)
  function niceScaleMax(values, opts) {
    var S = settings();
    var max = 0;
    (values || []).forEach(function (v) { if (typeof v === 'number' && isFinite(v) && v > max) max = v; });
    if (!(max > 0)) return 0;
    if (opts) return niceAxis(0, max * (1 + (opts.headroom || 0))).end;
    var step = max < S.SCALE_SMALL_BELOW_BAHT ? S.SCALE_STEP_SMALL_BAHT : S.SCALE_STEP_BAHT;
    return Math.ceil(max / step - 1e-9) * step;
  }

  // แกนของกราฟ (CR-12): เริ่มที่ start ปลายแกน ≥ max เลือกขั้นเล็กที่สุดจาก CHART_STEPS × 10^n ที่แบ่งได้ไม่เกิน CHART_TICKS_MAX ช่วง
  // (ขั้นถัดกันห่างกันไม่เกิน 2 เท่า จึงได้ CHART_TICKS_MIN–CHART_TICKS_MAX ช่วงเสมอ)
  //   (0, 14,190,000) → { end: 15,000,000, step: 2,500,000, ticks: [0, 2.5M, …, 15M] } / (100M, 120M) → ขั้นละ 5M
  function niceAxis(start, max) {
    var S = settings();
    var lo = start || 0;
    var span = max - lo;
    if (!(span > 0)) span = Math.abs(max) > 0 ? Math.abs(max) * 0.1 : 1;
    var steps = S.CHART_STEPS || [1, 2, 2.5, 5];
    var limit = S.CHART_TICKS_MAX || 6;
    var exp = Math.floor(Math.log(span / limit) / Math.LN10) - 1;
    for (var e = exp; e < exp + 4; e++) {
      for (var i = 0; i < steps.length; i++) {
        var step = steps[i] * Math.pow(10, e);
        var n = Math.ceil(span / step - 1e-9);
        if (n <= limit) {
          var ticks = [];
          for (var k = 0; k <= n; k++) ticks.push(lo + step * k);
          return { start: lo, end: lo + step * n, step: step, ticks: ticks };
        }
      }
    }
    return { start: lo, end: lo + span, step: span, ticks: [lo, lo + span] };
  }

  // จุดเริ่มแกน Waterfall (CR-12) = ปัดลง(ค่าต่ำสุด ÷ ขั้น) × ขั้น ตามเกณฑ์ settings.AXIS_START_RULES / ต่ำกว่าทุกเกณฑ์ → 0
  //   [113.2M, 120M, 115.5M, 116.6M] → 100M · [245M, 260M] → 200M · [40M, 45M] → 0 · [100M, 120M] → 100M (เลขกลมพอดีไม่ปัดลงอีกขั้น)
  function axisStart(values) {
    var list = (values || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (!list.length) return 0;
    var min = Math.min.apply(null, list);
    var rules = settings().AXIS_START_RULES || [];
    for (var i = 0; i < rules.length; i++) {
      if (min >= rules[i].from) return Math.floor(min / rules[i].step + 1e-9) * rules[i].step;
    }
    return 0;
  }

  // จุดบนแกน 0 ถึงค่าสูงสุด แบ่ง n ช่วง (ค่าตั้งต้น 3): 60,000,000 → [0, 20,000,000, 40,000,000, 60,000,000]
  function scaleTicks(scaleMax, n) {
    var k = n || 3, out = [];
    for (var i = 0; i <= k; i++) out.push(scaleMax * i / k);
    return out;
  }

  // ตำแหน่งบนสเกลเดียวกัน → { bar: เป้าหมาย ÷ ค่าสูงสุด (0–1), tick: ยอดปีก่อน ÷ ค่าสูงสุด | null (ไม่มียอดปีก่อน), isNew, growth }
  //   (54,000,000, 51,700,000, 60,000,000) → bar 0.9 · tick 0.8617 / เป้าหมาย 0 → bar 0 มีเฉพาะขีด
  function vsLastYear(target, prior, scaleMax) {
    var m = scaleMax > 0 ? scaleMax : 0;
    var t = target > 0 ? target : 0;
    var hasPrior = prior != null && prior > 0;
    return {
      bar: m ? Math.min(1, t / m) : 0,
      tick: hasPrior && m ? Math.min(1, prior / m) : null,
      isNew: !hasPrior,
      growth: growth(t, hasPrior ? prior : null)
    };
  }

  // สัดส่วนปีก่อน: [10, 30, 60] → [0.1, 0.3, 0.6] (ไม่มีข้อมูล = 0)
  function priorShares(values) {
    var t = sum(values);
    return values.map(function (v) { return t > 0 ? (v || 0) / t : 0; });
  }

  // "กระจายตามสัดส่วนปัจจุบัน": ปรับทุกค่าตามสัดส่วนเดิมให้รวมเป็น 100% (40%, 35%, 20% → 42.11%, 36.84%, 21.05%)
  // ผลรวมเป็น 0 → คืนค่าเดิม (ไม่มีสัดส่วนให้กระจาย) / ผู้ใช้ต้องกดเอง ห้ามเรียกอัตโนมัติ
  function normalizeShares(values) {
    var t = sum(values);
    return values.map(function (v) { return t > 0 ? (v || 0) / t : (v || 0); });
  }

  // CR-27: Net Sales ทั้งปีของแผน SKU ของหน่วยขาย (แผนครั้งแรก · ตัวเลขเดียวกับหน้า SKU Planning และรายงาน) → บาท
  function skuPlanNet(data, master, unitId, plan, year) {
    return skuPlanGrid(data, master, unitId, plan, { year: year, mode: 'initial' }).yearTotal.net;
  }
  // CR-27: รูปแบบรายเดือนของ Channel = สัดส่วนยอดอ้างอิงรวมของทั้ง Channel (12 ค่า รวม 1) → [12] | null (ไม่มีข้อมูล)
  function channelMonthShares(data, channelId) {
    var v = referenceValues(referenceMonthly(data, channelId));
    var t = v ? sum(v) : 0;
    return t > 0 ? v.map(function (x) { return x / t; }) : null;
  }
  // CR-27: การเติบโตรายเดือนเท่ากันทุกเดือน (ค่าตั้งต้น) → ค่าการเติบโตนั้น | null (มีเดือนที่ต่าง / ไม่มียอดอ้างอิง)
  function uniformGrowth(amounts, prior) {
    if (!prior) return null;
    var gs = [];
    for (var m = 0; m < 12; m++) { if (prior[m] > 0) gs.push(amounts[m] / prior[m] - 1); else if (amounts[m] > 0.5) return null; }
    if (!gs.length) return null;
    return gs.every(function (g) { return Math.abs(g - gs[0]) < 1e-6; }) ? gs[0] : null;
  }

  // CR-27: แท่งเป้าหมายเทียบแผนรายผู้รับผิดชอบ — เรียงตามเป้าหมายมากไปน้อย · สเกลจริงร่วมทั้งตาราง (เริ่มที่ 0 · niceScaleMax ของเป้าหมายและแผน)
  //   rows = [{ target, plan, ... }] → { scaleMax, rows: [{ ...row, bar (เป้าหมาย ÷ สเกล), tick (แผน ÷ สเกล), status (remaining) }] }
  function targetPlanBars(rows) {
    var list = (rows || []).slice().sort(function (a, b) { return (b.target || 0) - (a.target || 0); });
    var scaleMax = niceScaleMax(list.reduce(function (a, r) { return a.concat([r.target || 0, r.plan || 0]); }, []));
    return {
      scaleMax: scaleMax,
      rows: list.map(function (r) {
        var o = {};
        Object.keys(r).forEach(function (k) { o[k] = r[k]; });
        o.bar = scaleMax ? Math.min(1, (r.target || 0) / scaleMax) : 0;
        o.tick = scaleMax ? Math.min(1, (r.plan || 0) / scaleMax) : 0;
        o.status = remaining(r.target || 0, r.plan || 0).status;
        return o;
      })
    };
  }

  // ยอดทั้งปีของหน่วยจาก history.years[year].monthly (null = ไม่มีข้อมูล)
  function unitHistory(history, year, unitId) {
    var y = history.years[year];
    var m = y && y.monthly[unitId];
    return m ? sum(m) : null;
  }

  // ยอดทั้งปีของ Channel = รวมทุกหน่วยใน Master ของ Channel นั้น (รวมหน่วยที่ไม่อยู่ในแผน)
  function channelHistory(data, year, channelId) {
    var found = false, total = 0;
    unitsOfChannel(data, channelId).forEach(function (u) {
      var v = unitHistory(data.history, year, u.id);
      if (v != null) { found = true; total += v; }
    });
    return found ? total : null;
  }

  // ---------------------------------------------------------------------
  // CR-24 · CR-41: ยอดขายอ้างอิง = ยอดจริงของเดือนเดียวกันในปีล่าสุดที่เดือนนั้นปิดแล้ว (≤ เดือนปิดล่าสุดของนาฬิกากลาง core/clock.js)
  //   → ผลรวม 12 เดือน = L12M เสมอ (S1 ก.ย. 2026: ม.ค.–ส.ค. ปีล่าสุด · ก.ย.–ธ.ค. ปีก่อน · S2 ก.พ. 2027: ม.ค. ปีแผน · ก.พ.–ธ.ค. ปีก่อน)
  //   ยอดของเดือนที่ยังไม่ปิด หรือเป็นประมาณการ (เกิน history.years[ปี].actualMonths) ไม่ใช้เสมอ
  // ---------------------------------------------------------------------
  function clock() { return SP.core.clock; }
  // CR-41: นาฬิกาของยอดอ้างอิง = history.asOfMonth (ยอดขายใน Snapshot ของรอบที่ Lock แล้ว = เดือนปัจจุบันตอน Lock) ไม่มี = นาฬิกากลาง
  //   → ตัวเลขของรอบที่ Lock แล้วไม่เปลี่ยนเมื่อสลับสถานการณ์ Demo (ยอดอ้างอิงคิดจากเดือนตอน Lock)
  function refClock(history) {
    var K = clock();
    return history && history.asOfMonth && K ? K.at(history.asOfMonth) : K;
  }
  // ยอดจริงเดือน m (0–11) ของหน่วยขายในปี year → บาท | null (ไม่มีข้อมูล · ยังไม่ปิด · หรือยังเป็นประมาณการ)
  function actualMonthValue(history, year, unitId, m) {
    var y = history && history.years && history.years[year];
    var row = y && y.monthly && unitId != null ? y.monthly[unitId] : null;
    if (!row) return null;
    var n = y.actualMonths == null ? 12 : y.actualMonths;
    var K = refClock(history);
    if (K && !K.isClosed(Number(year), m)) return null;
    return m < n ? (row[m] || 0) : null;
  }
  function referenceOfUnit(history, unitId) {
    var out = [];
    var K = refClock(history);
    for (var m = 0; m < 12; m++) {
      var y = K.referenceYear(m);
      out.push({ month: m + 1, value: actualMonthValue(history, y, unitId, m), sourceYear: y });
    }
    return out;
  }
  // ยอดอ้างอิงรายเดือนของหน่วยขาย หรือ Channel (= ผลรวมทุกหน่วยใน Master ของ Channel) → [{ month (1–12), value (บาท | null), sourceYear }]
  //   planYear ไม่เปลี่ยนผล (ยอดจริงล่าสุด ณ เดือนปัจจุบันกลาง) ใช้กับทุกปีแผน
  function referenceMonthly(data, id, planYear) {
    if (findById(data.channels, id)) {
      var units = unitsOfChannel(data, id).map(function (u) { return referenceOfUnit(data.history, u.id); });
      return referenceOfUnit(data.history, null).map(function (r, m) {
        var vals = units.map(function (u) { return u[m].value; }).filter(function (v) { return v != null; });
        return { month: r.month, value: vals.length ? sum(vals) : null, sourceYear: r.sourceYear };
      });
    }
    return referenceOfUnit(data.history, id);
  }
  // ยอดอ้างอิงเป็นตัวเลข 12 เดือน (เดือนที่ไม่มีข้อมูล = 0) → [12] | null (ไม่มีข้อมูลเลย)
  function referenceValues(ref) {
    if (!ref || !ref.some(function (r) { return r.value != null; })) return null;
    return ref.map(function (r) { return r.value || 0; });
  }
  // L12M = ยอดขายจริง 12 เดือนที่ปิดแล้วล่าสุดของหน่วยขายหรือ Channel (= ผลรวมยอดอ้างอิง) → บาท | null
  function l12m(data, id) {
    var v = referenceValues(referenceMonthly(data, id));
    return v ? sum(v) : null;
  }

  // plan = { total, channels: [channelId], pct: { <channelId|unitId>: สัดส่วนของชั้นบน }, units: { <channelId>: [unitId] } }
  // data = SP.data (หรือ store.data()) / year = ปีแผน · CR-24: ยอดขายปีก่อน (prior) = L12M ของหน่วย / Channel (ใช้เทียบการเติบโต)
  // → { amount, prior, growth, pct: 1, allocatedPct, remaining, children: [Channel] }
  //   Channel = { id, name, fullName, color, allocationUnit, hasGP, sellOutMethod,
  //               pct, amount, prior, growth, allocatedPct, remaining, children: [Unit] }
  //   Unit    = { id, name, type, pct, amount, prior, growth }
  function topDown(data, plan, year) {
    var prev = year - 1;
    var total = plan.total || 0;
    var pct = plan.pct || {};
    var units = plan.units || {};
    var children = (plan.channels || []).map(function (id) { return findById(data.channels, id); }).filter(Boolean).map(function (ch) {
      var chPct = pct[ch.id] || 0;
      var chAmount = amountFromPct(total, chPct);
      var subs = (units[ch.id] || []).map(function (id) {
        var info = unitInfo(data, id);
        var p = pct[id] || 0;
        var amount = amountFromPct(chAmount, p);
        var prior = l12m(data, id);
        return {
          id: id, name: info ? info.unit.name : id, type: ch.allocationUnit, pct: p, pctOfTotal: pctOfTotal(p, chPct), amount: amount,
          prior: prior, growth: growth(amount, prior), growthAmount: growthAmount(amount, prior)
        };
      });
      var chPrior = l12m(data, ch.id);
      return {
        id: ch.id,
        name: ch.name,
        fullName: ch.fullName,
        color: channelColor(ch),
        allocationUnit: ch.allocationUnit,
        hasGP: ch.hasGP !== false,
        sellOutMethod: ch.sellOutMethod,
        pct: chPct,
        amount: chAmount,
        prior: chPrior,
        growth: growth(chAmount, chPrior),
        growthAmount: growthAmount(chAmount, chPrior),
        unitLabel: ch.unitLabel,
        gpLabel: ch.gpLabel,
        children: subs,
        allocatedPct: sum(subs.map(function (s) { return s.pct; })),
        unallocatedPct: subs.length ? 1 - sum(subs.map(function (s) { return s.pct; })) : null,
        // ยังไม่มีหน่วย → ยังไม่กำหนด (ไม่นับว่าจัดสรรครบ)
        remaining: subs.length ? remaining(chAmount, sum(subs.map(function (s) { return s.amount; }))) : emptyRemaining(chAmount)
      };
    });
    var priors = children.map(function (c) { return c.prior; }).filter(function (v) { return v != null; });
    var prior = priors.length ? sum(priors) : null;
    return {
      year: year,
      priorYear: prev,
      amount: total,
      pct: 1,
      prior: prior,
      growth: growth(total, prior),
      growthAmount: growthAmount(total, prior),
      children: children,
      allocatedPct: sum(children.map(function (c) { return c.pct; })),
      unallocatedPct: 1 - sum(children.map(function (c) { return c.pct; })),
      remaining: remaining(total, sum(children.map(function (c) { return c.amount; })))
    };
  }

  // หน่วยทั้งหมดในแผน (ตามลำดับ Channel) → [{ id, name, amount, prior, growth, channel }]
  function planUnits(tree) {
    var out = [];
    tree.children.forEach(function (ch) {
      ch.children.forEach(function (u) { out.push({ id: u.id, name: u.name, amount: u.amount, prior: u.prior, growth: u.growth, channel: ch }); });
    });
    return out;
  }

  // Channel + หน่วยที่จะแสดงจากค่าที่เลือกไว้ (ui.selection = { channel, unit })
  // หน่วยไม่อยู่ในแผนของ Channel นั้น → หน่วยแรกของ Channel (unit = null = Channel ยังไม่มีหน่วย / channel = null = แผนไม่มี Channel)
  function resolveSelection(tree, sel) {
    sel = sel || {};
    var unitId = sel.unit || sel.account;
    var ch = findById(tree.children, sel.channel);
    if (!ch && unitId) ch = tree.children.filter(function (c) { return findById(c.children, unitId); })[0];
    ch = ch || tree.children[0] || null;
    if (!ch) return { channel: null, unit: null };
    return { channel: ch, unit: findById(ch.children, unitId) || ch.children[0] || null };
  }

  // เป้าทั้งปีของหน่วยหนึ่ง (บาท) จาก tree ของ topDown()
  function unitTarget(tree, unitId) {
    var u = findById(planUnits(tree), unitId);
    return u ? u.amount : 0;
  }

  // หน่วยใน Master ที่ active ใน Channel นี้ และยังไม่อยู่ในแผน (รายการ "+ เพิ่ม Account" / "+ เพิ่มเขต")
  function availableUnits(data, plan, channelId) {
    var used = (plan.units && plan.units[channelId]) || [];
    return unitsOfChannel(data, channelId, true).filter(function (u) { return used.indexOf(u.id) < 0; });
  }

  // Channel ใน Master ที่ยังไม่อยู่ในแผนของปี (รายการ "+ เพิ่ม Channel") เรียงตาม order
  function availableChannels(data, plan) {
    var used = plan.channels || [];
    return data.channels.filter(function (c) { return used.indexOf(c.id) < 0; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  // =====================================================================
  // 5) Seasonality และ Phasing
  // =====================================================================

  // Seasonality Index = ยอดเดือนนั้น ÷ ค่าเฉลี่ยรายเดือนของ 12 เดือนย้อนหลัง
  function seasonalityIndex(sales) {
    var mean = sum(sales) / sales.length;
    return sales.map(function (v) { return mean ? v / mean : 1; });
  }

  // สัดส่วนรายเดือน (รวม = 1) = ยอดเดือนนั้น ÷ ยอดรวม 12 เดือน = Index ÷ 12
  function seasonalityShares(sales) {
    var t = sum(sales);
    return sales.map(function (v) { return t ? v / t : 1 / sales.length; });
  }

  // =====================================================================
  // 6) วันที่, ราคาตามวันที่มีผล และ Promotion
  // =====================================================================

  // 'YYYY-MM' หรือ 'YYYY-MM-DD' → { y, m (0–11), d }
  function parseDate(str) {
    var p = String(str).split('-');
    return { y: Number(p[0]), m: Number(p[1]) - 1, d: p[2] ? Number(p[2]) : 1 };
  }

  // index ของเดือนเทียบกับปีแผน: เดือนก่อนปีแผนติดลบ ปีถัดไปได้ 12 ขึ้นไป
  function monthIndex(str, year) {
    var p = parseDate(str);
    return (p.y - year) * 12 + p.m;
  }

  // เดือนแบบนับต่อเนื่อง (ปี × 12 + เดือน)
  function absMonth(str) { var p = parseDate(str); return p.y * 12 + p.m; }

  function daysInMonth(year, m) { return new Date(Date.UTC(year, m + 1, 0)).getUTCDate(); }

  function dayNumber(y, m, d) { return Math.round(Date.UTC(y, m, d) / 86400000); }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // 'YYYY-MM-DD' ของวันที่ d เดือน m ปี year
  function dateKey(year, m, d) { return year + '-' + pad2(m + 1) + '-' + pad2(d); }

  // บวก/ลบวัน: ('2027-06-01', −1) → '2027-05-31'
  function addDays(date, n) {
    var p = parseDate(date);
    var t = new Date(Date.UTC(p.y, p.m, p.d + n));
    return t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate());
  }

  // จำนวนวันที่ช่วง start–end (รวมวันปลาย) ทับกับเดือน m ของปี year
  function overlapDays(start, end, year, m) {
    var s = parseDate(start), e = parseDate(end);
    var from = Math.max(dayNumber(s.y, s.m, s.d), dayNumber(year, m, 1));
    var to = Math.min(dayNumber(e.y, e.m, e.d), dayNumber(year, m, daysInMonth(year, m)));
    return Math.max(0, to - from + 1);
  }

  // =====================================================================
  // CR-30 ราคา: ราคาหลักรายเดือน + Promotion Price รายเดือน 2 ระดับ (รวม VAT · แทน Price List ตามวันที่ ราคาต่อ Account และปฏิทิน Promotion)
  //   basePrices  = [{ productKey, priceType: 'RSP' | 'TT_DEALER' | 'TT_WHOLESALE' (settings.PRICE_TYPES), effectiveMonth: 'YYYY-MM', price, by, at }]
  //                 มีผลวันที่ 1 ของเดือน · ราคาที่มีผล ณ เดือน M = รายการล่าสุดที่ effectiveMonth ≤ M
  //   promoPrices = [{ productKey, channelId, unitId | null (ทั้ง Channel), month: 'YYYY-MM', price, by, at }]
  //   ราคาของ SKU × หน่วยขาย × เดือน M (resolvePrice): Promotion ของหน่วยขาย → Promotion ของ Channel → ราคาหลักของ Channel
  //   ราคาหลักของ Channel = channel.priceBasis ('RSP' ค่าตั้งต้น · TT = 'TT_DEALER')
  // =====================================================================

  function monthOf(v) { return v ? String(v).slice(0, 7) : null; }

  // รายการราคาหลักที่มีผล ณ เดือน (ราคาต้องมากกว่า 0) → row | null
  function baseEntryAt(basePrices, key, type, month) {
    var m = monthOf(month), best = null;
    (basePrices || []).forEach(function (r) {
      if (r.productKey !== key || r.priceType !== type || !(Number(r.price) > 0) || r.effectiveMonth > m) return;
      if (!best || r.effectiveMonth > best.effectiveMonth || (r.effectiveMonth === best.effectiveMonth && (r.at || '') > (best.at || ''))) best = r;
    });
    return best;
  }
  // ราคาหลักที่มีผล ณ เดือน (type ไม่ระบุ = RSP) → ราคา | null
  //   RSP 199 มีผล 2024-01 และ 219 มีผล 2027-04 → มี.ค. 2027 = 199 · เม.ย. 2027 = 219
  function basePriceAt(basePrices, key, type, month) { var r = baseEntryAt(basePrices, key, type || 'RSP', month); return r ? Number(r.price) : null; }
  function rspAt(basePrices, key, month) { return basePriceAt(basePrices, key, 'RSP', month); }

  // ประวัติราคาหลักของ SKU (ประเภทเดียวหรือทุกประเภท) เรียงตามประเภท แล้วเดือนที่มีผลล่าสุดก่อน
  function basePriceHistory(basePrices, key, type) {
    var order = settings().PRICE_TYPES || ['RSP'];
    return (basePrices || []).filter(function (r) { return r.productKey === key && (!type || r.priceType === type); }).sort(function (a, b) {
      if (a.priceType !== b.priceType) return order.indexOf(a.priceType) - order.indexOf(b.priceType);
      return a.effectiveMonth < b.effectiveMonth ? 1 : a.effectiveMonth > b.effectiveMonth ? -1 : 0;
    });
  }

  // ราคาหลักประเภทนี้มีรายการที่เริ่มมีผลในเดือนนั้นหรือไม่ (จุดเล็กในหน้าราคาหลัก)
  function basePriceChangedIn(basePrices, key, type, month) {
    var m = monthOf(month);
    return (basePrices || []).some(function (r) { return r.productKey === key && r.priceType === type && r.effectiveMonth === m; });
  }

  // บันทึกราคาหลักใหม่ (ไม่เขียนทับเดือนอื่น · เดือนเดียวกันแทนค่าเดิม) → { ok, list, error: 'price' (ต้องมากกว่า 0) | 'month' }
  function setBasePrice(basePrices, entry) {
    if (!(Number(entry.price) > 0)) return { ok: false, error: 'price', list: basePrices };
    var m = monthOf(entry.effectiveMonth);
    if (!m || !/^\d{4}-\d{2}$/.test(m)) return { ok: false, error: 'month', list: basePrices };
    var list = (basePrices || []).filter(function (r) { return !(r.productKey === entry.productKey && r.priceType === entry.priceType && r.effectiveMonth === m); }).map(copy);
    list.push({ productKey: entry.productKey, priceType: entry.priceType || 'RSP', effectiveMonth: m, price: Math.round(Number(entry.price) * 100) / 100, by: entry.by || '', at: entry.at || '' });
    return { ok: true, list: list, error: null };
  }

  function samePromo(r, key, channelId, unitId, m) { return r.productKey === key && r.channelId === channelId && (r.unitId || null) === (unitId || null) && r.month === m; }

  // Promotion Price ที่ตั้งไว้ที่ระดับนั้นพอดี (unitId null = ทั้ง Channel) → row | null
  function promoEntry(promoPrices, key, channelId, unitId, month) {
    var m = monthOf(month);
    return (promoPrices || []).filter(function (r) { return samePromo(r, key, channelId, unitId, m) && Number(r.price) > 0; })[0] || null;
  }

  // ตั้ง / ลบ Promotion Price (price null / ว่าง / ≤ 0 = ลบ → กลับไปใช้ราคาที่ได้รับมา) → รายการใหม่ (ไม่แก้รายการเดิม)
  function setPromoPrice(promoPrices, key, channelId, unitId, month, price, meta) {
    meta = meta || {};
    var m = monthOf(month);
    var out = (promoPrices || []).filter(function (r) { return !samePromo(r, key, channelId, unitId, m); }).map(copy);
    if (price != null && price !== '' && Number(price) > 0) {
      out.push({ productKey: key, channelId: channelId, unitId: unitId || null, month: m, price: Math.round(Number(price) * 100) / 100, by: meta.by || '', at: meta.at || '' });
    }
    return out;
  }

  // ประเภทราคาหลักของ Channel (TT = TT_DEALER · อื่นๆ = RSP)
  function channelPriceType(channel) { return (channel && channel.priceBasis) || 'RSP'; }

  // ราคาของ SKU ในหน่วยขาย (unitId null = ระดับทั้ง Channel) เดือน month จากชุดราคา pricing = { basePrices, promoPrices }
  //   → { price (null = ไม่มีราคา), source: 'promoUnit' | 'promoChannel' | 'base', base (ราคาหลักของ Channel), rsp, priceType, entry }
  // CR-35: ราคา Clearance ลำดับแรก (เดือนในช่วง Clearance ของหน่วยขายนั้น · pricing.clearance = { <productKey>: product.clearance }) → Promotion Price → ราคาหลัก
  function resolveWith(pricing, key, channelId, unitId, priceType, month) {
    var type = priceType || 'RSP';
    var base = basePriceAt(pricing.basePrices, key, type, month);
    var rsp = type === 'RSP' ? base : basePriceAt(pricing.basePrices, key, 'RSP', month);
    var cl = pricing.clearance ? pricing.clearance[key] : null;
    if (cl && Number(cl.price) > 0 && clearanceActive(cl, month) && clearanceForUnit(cl, unitId)) return { price: Number(cl.price), source: 'clearance', base: base, rsp: rsp, priceType: type, entry: cl };
    var u = unitId ? promoEntry(pricing.promoPrices, key, channelId, unitId, month) : null;
    if (u) return { price: Number(u.price), source: 'promoUnit', base: base, rsp: rsp, priceType: type, entry: u };
    var c = promoEntry(pricing.promoPrices, key, channelId, null, month);
    if (c) return { price: Number(c.price), source: 'promoChannel', base: base, rsp: rsp, priceType: type, entry: c };
    return { price: base, source: 'base', base: base, rsp: rsp, priceType: type, entry: null };
  }

  // CR-30 ข้อ 4.1 resolvePrice: ฟังก์ชันเดียวที่หาราคาของ SKU × หน่วยขาย × เดือน
  //   data = store.data() (basePrices · promoPrices · หน่วยขายและ Channel) · unitId = id ของ Channel ได้ด้วย (= ระดับทั้ง Channel)
  //   → { price, source, base, rsp, priceType, entry } ตาม resolveWith
  function resolvePrice(data, key, unitId, month) {
    var info = unitInfo(data, unitId);
    var ch = info ? info.channel : findById(data.channels, unitId);
    if (!ch) return { price: null, source: 'base', base: null, rsp: null, priceType: 'RSP', entry: null };
    return resolveWith({ basePrices: data.basePrices, promoPrices: data.promoPrices, clearance: clearanceMap(data.products) }, key, ch.id, info ? unitId : null, channelPriceType(ch), month);
  }

  // ตรวจ Promotion Price (เตือนเท่านั้น ไม่บล็อก) → { ok, error: 'price' | null, warnings: ['aboveBase' | 'belowBase'], diff (สัดส่วนเทียบราคาหลัก) }
  //   aboveBase = สูงกว่าราคาหลัก / belowBase = ต่ำกว่าราคาหลักเกิน settings.PROMO_PRICE_WARN_BELOW (50%)
  function checkPromoPrice(price, base, below) {
    if (below == null) below = settings().PROMO_PRICE_WARN_BELOW;
    var p = Number(price);
    if (!(p > 0)) return { ok: false, error: 'price', warnings: [], diff: null };
    var warnings = [];
    var diff = base > 0 ? p / base - 1 : null;
    if (base > 0 && p > base + 1e-9) warnings.push('aboveBase');
    if (base > 0 && p < base * (1 - below) - 1e-9) warnings.push('belowBase');
    return { ok: true, error: null, warnings: warnings, diff: diff };
  }

  // ข้อมูลราคาที่ใช้คำนวณ: ปัจจุบัน (data.basePrices · data.promoPrices · GP ของหน่วย) หรือ Snapshot ตอนล็อก Baseline [Phase 2]
  //   snapshot = { basePrices, promoPrices, gp: { <unitId>: GP } } (ราคาที่แก้หลังล็อกไม่เปลี่ยน Baseline)
  function pricingOf(data, snapshot) {
    if (snapshot && snapshot.basePrices) return { basePrices: snapshot.basePrices, promoPrices: snapshot.promoPrices || [], gp: snapshot.gp || {}, clearance: snapshot.clearance || null };
    return { basePrices: data.basePrices || [], promoPrices: data.promoPrices || [], gp: null, clearance: clearanceMap(data.products) };
  }
  // CR-35: ช่วง Clearance ของสินค้า = product.clearance { fromMonth, toMonth (ว่าง = จนสินค้าหมด), stockQty, price (บาท รวม VAT), unitIds (ว่าง = ทุกหน่วยขาย), expiry, note }
  function clearanceMap(products) {
    var out = null;
    (products || []).forEach(function (p) { if (p.clearance && p.clearance.fromMonth) { out = out || {}; out[productKey(p)] = p.clearance; } });
    return out;
  }
  function clearanceActive(cl, month) { var k = String(month).slice(0, 7); return !!(cl && cl.fromMonth && cl.fromMonth <= k && (!cl.toMonth || k <= cl.toMonth)); }
  function clearanceForUnit(cl, unitId) { return !cl.unitIds || !cl.unitIds.length || (!!unitId && cl.unitIds.indexOf(unitId) >= 0); }
  // ส่วนลดของราคา Clearance จากราคาหลัก (RSP ของเดือนเริ่ม) → สัดส่วน | null
  function clearanceDiscount(base, price) { return base > 0 && price > 0 ? 1 - price / base : null; }
  // แถวของแท็บ Clearance: สินค้าที่มีช่วง Clearance → [{ key, product, clearance, base (RSP เดือนเริ่ม), discount }] เรียงเดือนเริ่ม
  function clearanceRows(products, basePrices) {
    return (products || []).filter(function (p) { return p.clearance && p.clearance.fromMonth; }).map(function (p) {
      var key = productKey(p);
      var base = rspAt(basePrices, key, p.clearance.fromMonth);
      return { key: key, product: p, clearance: p.clearance, base: base, discount: clearanceDiscount(base, Number(p.clearance.price)) };
    }).sort(function (a, b) { return a.clearance.fromMonth < b.clearance.fromMonth ? -1 : a.clearance.fromMonth > b.clearance.fromMonth ? 1 : 0; });
  }
  // ---------------------------------------------------------------------
  // CR-36 Product List: ตัวเลือกหมวดสินค้าแบบลำดับชั้น · Product Year · จัดกลุ่มซ้อนหลายชั้น
  // ---------------------------------------------------------------------
  // ตัวเลือกหมวดสินค้า: Category (ไม่มีคำนำหน้า) · Sub Category นำหน้า '- ' · Type นำหน้า '-- ' → [{ value, name, depth, level, text }]
  var TREE_PREFIX = ['', '- ', '-- '];
  function categoryOptions(tax) {
    var out = [];
    SP.core.taxonomy.buildTree(tax, 'category').forEach(function walk(t) {
      out.push({ value: t.node.id, name: t.node.name, depth: t.depth, level: t.node.level, text: (TREE_PREFIX[t.depth] || '') + t.node.name });
      t.children.forEach(walk);
    });
    return out;
  }
  // Product Year = ปีของเดือนเริ่มที่เร็วที่สุดของ Listing ทุกหน่วยขาย (ไม่นับเสนอขาย) → ไม่มี Listing = ปีของเดือนแรกที่มียอดขายในข้อมูลย้อนหลัง → ไม่มีทั้งสอง = null
  function productYear(product, listings, history) {
    if (!product) return null;
    var key = productKey(product);
    var launch = product.launchDate ? String(product.launchDate).slice(0, 7) : null;
    var first = null;
    (listings || []).forEach(function (l) {
      if (l.productKey !== key || l.status === 'offered') return;
      var f = l.fromMonth || launch;
      if (f && (!first || f < first)) first = f;
    });
    if (first) return Number(first.slice(0, 4));
    var years = history && history.years ? Object.keys(history.years).map(Number).sort(function (a, b) { return a - b; }) : [];
    for (var i = 0; i < years.length; i++) {
      var sq = history.years[years[i]].skuQty || {};
      var sold = Object.keys(sq).some(function (u) { var arr = sq[u] && sq[u][key]; return !!arr && arr.some(function (q) { return q > 0; }); });
      if (sold) return years[i];
    }
    return null;
  }
  // จัดกลุ่มซ้อน: levels = [{ key(item) → id, name(id) → ชื่อ, order(id) → ลำดับ }] → [{ id, name, count, depth, groups | items }] (id ว่าง = ท้ายสุด)
  function groupItems(items, levels, depth) {
    depth = depth || 0;
    if (!levels || !levels.length) return null;
    var lv = levels[0], map = {}, ids = [];
    (items || []).forEach(function (it) {
      var id = lv.key(it);
      id = id == null ? '' : String(id);
      if (!map[id]) { map[id] = []; ids.push(id); }
      map[id].push(it);
    });
    var out = ids.map(function (id) {
      var g = { id: id, name: lv.name(id), count: map[id].length, depth: depth };
      if (levels.length > 1) g.groups = groupItems(map[id], levels.slice(1), depth + 1); else g.items = map[id];
      return g;
    });
    out.sort(function (a, b) {
      return ((a.id === '') - (b.id === '')) || ((lv.order ? lv.order(a.id) : 0) - (lv.order ? lv.order(b.id) : 0)) || String(a.name).localeCompare(String(b.name));
    });
    return out;
  }
  // ชั้นของการจัดกลุ่มสินค้า by = 'none' | 'category' | 'subCategory' | 'type' | 'series' | 'level' (Category › Sub Category › Type) | 'status' | 'year' | 'launchMonth'
  //   ctx = { tax, product(item) → สินค้า (ค่าตั้งต้น = item), statusOf(item), yearOf(item), launchOf(item) → 'YYYY-MM' | null,
  //           labels: { none, noYear, noLaunch, status: { <status>: ป้าย }, month('YYYY-MM') → ข้อความ } } → [ชั้น] | null (ไม่จัดกลุ่ม)
  var GROUP_BY = ['category', 'subCategory', 'type', 'series', 'level', 'status', 'year', 'launchMonth'];
  function productGroupLevels(by, ctx) {
    if (!by || by === 'none' || GROUP_BY.indexOf(by) < 0) return null;
    var prod = ctx.product || function (x) { return x; };
    var Lb = ctx.labels || {};
    function orderOf(kind) {
      var idx = {}, i = 0;
      SP.core.taxonomy.buildTree(ctx.tax, kind).forEach(function walk(t) { idx[t.node.id] = i++; t.children.forEach(walk); });
      return function (id) { return idx[id] != null ? idx[id] : 9999; };
    }
    function taxLevel(field, kind) {
      return { key: function (it) { var p = prod(it); return p ? p[field] || '' : ''; }, name: function (id) { return id ? taxonomyName(ctx.tax, kind, id) || id : Lb.none; }, order: orderOf(kind) };
    }
    if (by === 'category') return [taxLevel('categoryId', 'category')];
    if (by === 'subCategory') return [taxLevel('subCategoryId', 'category')];
    if (by === 'type') return [taxLevel('typeId', 'category')];
    if (by === 'series') return [taxLevel('seriesId', 'series')];
    if (by === 'level') return [taxLevel('categoryId', 'category'), taxLevel('subCategoryId', 'category'), taxLevel('typeId', 'category')];
    if (by === 'status') return [{ key: ctx.statusOf, name: function (id) { return (Lb.status && Lb.status[id]) || id; }, order: function (id) { var i = PRODUCT_STATUSES.indexOf(id); return i < 0 ? 99 : i; } }];
    if (by === 'year') return [{ key: function (it) { var y = ctx.yearOf(it); return y == null ? '' : y; }, name: function (id) { return id ? id : Lb.noYear; }, order: function (id) { return Number(id) || 0; } }];
    return [{ key: function (it) { return ctx.launchOf(it) || ''; }, name: function (id) { return id ? (Lb.month ? Lb.month(id) : id) : Lb.noLaunch; }, order: function (id) { return absMonth(id + '') || 0; } }];
  }
  // จำนวนรายการรวมของกลุ่ม (ทุกชั้น) = ผลรวม count ของชั้นบนสุด
  function groupTotal(groups) { return sum((groups || []).map(function (g) { return g.count; })); }

  // ---------------------------------------------------------------------
  // CR-36 แผน Clearance (Supply Chain · แท็บ Clearance ของ Price & Promotion) — ไม่นับใน รวมแผน · คงเหลือ · สถานะ ขาด/เกิน/ครบ ของ Sales Planning ทุกขั้น
  //   product.clearance.plan = { <unitId>: { 'YYYY-MM': ชิ้น } } · เดือนนอกช่วง Clearance / หน่วยขายที่ไม่ได้เลือก = 0
  // ---------------------------------------------------------------------
  // เดือนในช่วง Clearance ที่อยู่ในปี → ['YYYY-MM']
  function clearanceMonths(cl, year) {
    var out = [];
    if (!cl || !cl.fromMonth) return out;
    for (var m = 0; m < 12; m++) { var k = monthKey(year, m); if (clearanceActive(cl, k)) out.push(k); }
    return out;
  }
  // หน่วยขายของแผน: unitIds ที่เลือก → ไม่ระบุ (ทุกหน่วยขาย) = หน่วยขายที่ Listing สินค้านี้ในปี + หน่วยขายที่มีแผนอยู่แล้ว
  function clearanceUnitIds(product, listings, year) {
    var cl = product && product.clearance;
    if (!cl) return [];
    if (cl.unitIds && cl.unitIds.length) return cl.unitIds.slice();
    var key = productKey(product), out = [];
    (listings || []).forEach(function (l) { if (l.productKey === key && out.indexOf(l.accountId) < 0 && listedInYear(listings, key, l.accountId, year)) out.push(l.accountId); });
    Object.keys(cl.plan || {}).forEach(function (u) { if (out.indexOf(u) < 0) out.push(u); });
    return out;
  }
  function clearanceQty(cl, unitId, month) {
    if (!cl || !clearanceActive(cl, month) || !clearanceForUnit(cl, unitId)) return 0;
    var u = cl.plan && cl.plan[unitId];
    return Math.max(0, Number(u && u[month]) || 0);
  }
  // แผนระบายรวม = ผลรวมชิ้นทุกหน่วยขายทุกเดือนในช่วง Clearance
  function clearancePlanned(cl) {
    var n = 0;
    Object.keys((cl && cl.plan) || {}).forEach(function (u) { Object.keys(cl.plan[u] || {}).forEach(function (k) { n += clearanceQty(cl, u, k); }); });
    return n;
  }
  // คงเหลือสต็อก = สต็อกที่ต้องระบาย − แผนระบาย → { stock, planned, remaining, status: 'ok' (= 0 ครบ) | 'left' (> 0 ยังระบายไม่หมด) | 'over' (< 0 เกินสต็อก) }
  function clearanceStockState(cl) {
    var stock = Math.max(0, Number(cl && cl.stockQty) || 0), planned = clearancePlanned(cl), rem = stock - planned;
    return { stock: stock, planned: planned, remaining: rem, status: rem === 0 ? 'ok' : rem > 0 ? 'left' : 'over' };
  }
  // กระจายเท่ากันทุกเดือน: คงเหลือสต็อกแบ่งเท่ากันให้หน่วยขาย × เดือน (ปัดลง · เศษไปเดือนสุดท้าย) บวกจากแผนเดิม → plan ใหม่ (คงเหลือ ≤ 0 = เท่าเดิม)
  function clearanceDistribute(cl, unitIds, months) {
    var plan = JSON.parse(JSON.stringify((cl && cl.plan) || {}));
    var rem = clearanceStockState(cl).remaining;
    var cells = [];
    (unitIds || []).forEach(function (u) { (months || []).forEach(function (k) { if (clearanceActive(cl, k) && clearanceForUnit(cl, u)) cells.push([u, k]); }); });
    if (!(rem > 0) || !cells.length) return plan;
    var each = Math.floor(rem / cells.length), extra = rem - each * cells.length;
    cells.forEach(function (c, i) {
      plan[c[0]] = plan[c[0]] || {};
      plan[c[0]][c[1]] = (Number(plan[c[0]][c[1]]) || 0) + each + (i === cells.length - 1 ? extra : 0);
    });
    return plan;
  }
  // แผน Clearance รายเดือนของปี → [12 × { month, units, netSales }] · scope = { year, productKey, unitId, unitIds, channelId } (ไม่ระบุ = รวมทั้งหมด)
  //   Net Sales = จำนวน × ราคาของเดือน (ราคา Clearance ลำดับแรก) ด้วยสูตร netSales ของ Channel (GP / Platform Fee ของหน่วยขาย)
  function clearancePlanMonthly(data, scope) {
    scope = scope || {};
    var year = scope.year || settings().DEFAULT_PLAN_YEAR;
    var includesVat = settings().PRICE_INCLUDES_VAT;
    var pricing = pricingOf(data, null);
    var out = [];
    for (var i = 0; i < 12; i++) out.push({ month: monthKey(year, i), units: 0, netSales: 0 });
    var ctxs = {};
    (data.products || []).forEach(function (p) {
      var cl = p.clearance;
      if (!cl || !cl.plan) return;
      var key = productKey(p);
      if (scope.productKey && scope.productKey !== key) return;
      Object.keys(cl.plan).forEach(function (u) {
        if (scope.unitId && u !== scope.unitId) return;
        if (scope.unitIds && scope.unitIds.indexOf(u) < 0) return;
        if (scope.channelId) { var info = unitInfo(data, u); if (!info || !info.channel || info.channel.id !== scope.channelId) return; }
        var ctx = ctxs[u] || (ctxs[u] = unitPricing(data, pricing, u));
        for (var m = 0; m < 12; m++) {
          var q = clearanceQty(cl, u, monthKey(year, m));
          if (!q) continue;
          var mp = monthPricing(pricing, key, u, ctx, year, m);
          out[m].units += q;
          out[m].netSales += netSales(q, mp.price, { hasGP: ctx.hasGP }, { gp: mp.gp }, { includesVat: includesVat }) || 0;
        }
      });
    });
    return out;
  }
  // แถวของแผน SKU ที่ยังมีจำนวนในเดือน Clearance ที่ล็อก (ค่าเดิมก่อน CR-36 · ข้อมูลที่ต้องตรวจ มีแผนสินค้า Clearance) → [row]
  function clearanceLockedRows(grid) {
    return ((grid && grid.rows) || []).filter(function (r) { return r.cells.some(function (c) { return c.state.reason === 'clearance' && c.units > 0; }); });
  }
  // ล้างค่าในเดือน Clearance ที่ล็อก (keys ไม่ระบุ = ทุกแถว) → แผนใหม่
  function clearClearanceCells(plan, grid, keys) {
    var out = copy(plan);
    ((grid && grid.rows) || []).forEach(function (r) {
      if (keys && keys.indexOf(r.key) < 0) return;
      var item = out.items && out.items[r.key];
      if (!item) return;
      r.cells.forEach(function (c, m) { if (c.state.reason === 'clearance') { item.qty[m] = 0; if (item.overrides) item.overrides[m] = false; } });
    });
    return out;
  }
  // CR-36 หน่วยขายที่มี Listing ของสินค้าในปีแผน แต่แผน SKU ของหน่วยขายนั้นไม่มีแถวของสินค้านี้ (ใช้ร่วม Launch & Listing และข้อความแจ้งใน SKU Planning)
  //   skuPlans = { <unitId>: plan } → [unitId]
  function listedNotPlanned(master, skuPlans, key, year) {
    var out = [];
    ((master && master.listings) || []).forEach(function (l) {
      if (l.productKey !== key || out.indexOf(l.accountId) >= 0) return;
      if (!listedInYear(master.listings, key, l.accountId, year)) return;
      var plan = skuPlans && skuPlans[l.accountId];
      var it = plan && plan.items && plan.items[key];
      if (!it || it.stopped) out.push(l.accountId);
    });
    return out;
  }

  // สินค้าที่เริ่ม Clearance ได้ ณ เดือน = Status Active หรือ Discontinued (ยังไม่มีช่วง Clearance)
  function clearanceCandidates(products, month) {
    return (products || []).filter(function (p) { var st = productStatus(p, month); return !p.clearance && (st === 'active' || st === 'discontinued'); });
  }

  // Channel, GP ปกติ และประเภทราคาหลักของหน่วยขาย (Channel ที่ hasGP = false → GP = 0 ทุกกรณี)
  function unitPricing(data, pricing, unitId) {
    var info = unitInfo(data, unitId);
    var ch = info && info.channel;
    var hasGP = !!(ch && ch.hasGP !== false);
    var gp = !hasGP ? 0 : pricing.gp && pricing.gp[unitId] != null ? pricing.gp[unitId] : gpOf(data, unitId);   // null = ยังไม่มี GP
    return { channelId: ch ? ch.id : null, unitId: unitId, hasGP: hasGP, gp: gp, priceType: channelPriceType(ch) };
  }

  // ราคาและ GP ของเดือน m ปี year ของสินค้า × หน่วยขาย (CR-30 ราคารายเดือน ไม่ถ่วงตามจำนวนวัน)
  // → { days, rsp, base (ราคาหลักของ Channel), price (ราคาที่ใช้คำนวณ), gp (null = ยังไม่มี GP), source: 'promoUnit' | 'promoChannel' | 'rsp' | 'dealer',
  //     priceType, promoDays: 0, promos: [], drafts: [] } (promoDays / promos / drafts คงไว้ให้โครงเดิมของผู้เรียก)
  function monthPricing(pricing, key, unitId, ctx, year, m) {
    var r = resolveWith(pricing, key, ctx.channelId, unitId, ctx.priceType, monthKey(year, m));
    return {
      days: daysInMonth(year, m), rsp: r.rsp || 0, base: r.base || 0, price: r.price || 0, gp: ctx.hasGP ? ctx.gp : 0,
      source: r.source === 'base' ? (r.priceType === 'RSP' ? 'rsp' : 'dealer') : r.source, priceType: r.priceType, promoDays: 0, promos: [], drafts: []
    };
  }

  // ราคาที่ใช้คำนวณของเดือน (ฟังก์ชันเดียวกับหน้าวางแผน SKU) snapshot = ราคาตอนล็อก Baseline (ไม่ส่ง = ปัจจุบัน)
  function effectivePrice(data, key, unitId, year, m, snapshot) {
    var pr = pricingOf(data, snapshot);
    return monthPricing(pr, key, unitId, unitPricing(data, pr, unitId), year, m).price;
  }

  // GP ที่มีผลของเดือน
  function effectiveGp(data, key, unitId, year, m, snapshot) {
    var pr = pricingOf(data, snapshot);
    return monthPricing(pr, key, unitId, unitPricing(data, pr, unitId), year, m).gp;
  }

  // รายละเอียดราคาเดือนนั้น (Tooltip)
  function pricingDetail(data, key, unitId, year, m, snapshot) {
    var pr = pricingOf(data, snapshot);
    return monthPricing(pr, key, unitId, unitPricing(data, pr, unitId), year, m);
  }

  // จำนวนเดือน (fromMonth–ธ.ค.) ที่ราคาหรือ GP ที่มีผลของสินค้าในแผนต่างจาก Snapshot ตอนล็อก Baseline
  function priceChangedMonths(data, snapshot, unitId, keys, year, fromMonth) {
    if (!snapshot || !snapshot.basePrices) return 0;
    var live = pricingOf(data, null), snap = pricingOf(data, snapshot);
    var cl = unitPricing(data, live, unitId), cs = unitPricing(data, snap, unitId);
    var n = 0;
    for (var m = Math.max(0, fromMonth || 0); m < 12; m++) {
      var diff = (keys || []).some(function (k) {
        var a = monthPricing(live, k, unitId, cl, year, m), b = monthPricing(snap, k, unitId, cs, year, m);
        return Math.abs(a.price - b.price) > 0.005 || Math.abs((a.gp || 0) - (b.gp || 0)) > 1e-6;
      });
      if (diff) n += 1;
    }
    return n;
  }

  // =====================================================================
  // 7) Clearance และระบบเติม
  // =====================================================================

  // Clearance = Stock ÷ จำนวนเดือน ปัดลงทุกเดือน แล้วเติมเศษให้เดือนท้ายๆ ผลรวมเท่า Stock เสมอ
  // 1,000 ชิ้น 3 เดือน → [333, 333, 334]
  function clearanceSplit(stock, months) {
    if (months <= 0) return [];
    var base = Math.floor(stock / months);
    var rest = stock - base * months;
    var out = [];
    for (var i = 0; i < months; i++) out.push(base + (i >= months - rest ? 1 : 0));
    return out;
  }

  // ระบบเติม = Run-rate × Seasonality Index ของเดือนนั้น (ปัดเป็นชิ้น)
  function systemFill(runRate, index) { return Math.round(runRate * index); }

  // มียอดขายจริงของสินค้า (productKey) ในหน่วยขายนี้แล้วหรือยัง (history = SP.data.history)
  function runRateOf(history, key, unitId) {
    var rr = ((history.runRate || {})[key] || {})[unitId];
    return rr != null && rr > 0 ? rr : null;
  }

  // =====================================================================
  // 8) Phasing: Seasonality ปีก่อน → สัดส่วนรายเดือน
  // =====================================================================

  // CR-24: ยอดอ้างอิงรายเดือนของหน่วยนั้น (ยอดจริงล่าสุดของแต่ละเดือน · ผลรวม = L12M) → [12] | null (ไม่มีข้อมูล)
  //   year (ปีแผน) คงไว้ในพารามิเตอร์เพื่อให้ผู้เรียกเดิมใช้ได้ ไม่เปลี่ยนผล
  function priorMonthly(history, year, unitId) {
    return referenceValues(referenceOfUnit(history, unitId));
  }

  // ยอดรายเดือนรวมของทุกหน่วยใน Master ของ Channel นั้น ในปี year (null = ไม่มีข้อมูล)
  function channelMonthly(data, year, channelId) {
    var y = data.history.years[year];
    var out = null;
    if (!y) return null;
    unitsOfChannel(data, channelId).forEach(function (u) {
      var m = y.monthly[u.id];
      if (!m) return;
      out = out || zeros(12);
      m.forEach(function (v, i) { out[i] += v; });
    });
    return out;
  }

  // ฐานของ Seasonality ปีแผน year (CR-24 ยอดอ้างอิง): ของหน่วย → ไม่มี ใช้ของ Channel → ไม่มี เท่ากันทุกเดือน
  //   → สัดส่วนตั้งต้นเดือน M = ยอดอ้างอิงเดือน M ÷ L12M / { monthly: [12] | null, source: 'account' (ของหน่วยเอง) | 'channel' | 'flat' }
  function phasingBasis(data, year, unitId) {
    var own = priorMonthly(data.history, year, unitId);
    if (own && sum(own) > 0) return { monthly: own, source: 'account' };
    var info = unitInfo(data, unitId);
    var ch = info && info.channel && referenceValues(referenceMonthly(data, info.channel.id));
    if (ch) return { monthly: ch, source: 'channel' };
    return { monthly: null, source: 'flat' };
  }

  // สัดส่วนตั้งต้นของ Phasing ปีแผน year (รวม = 1)
  function defaultPhasing(data, year, unitId) {
    var basis = phasingBasis(data, year, unitId);
    return basis.monthly ? seasonalityShares(basis.monthly) : zeros(12).map(function () { return 1 / 12; });
  }

  // ผลรวมของ Phasing: บาทรายเดือน = เป้าทั้งปี × % ของเดือน / Remaining = เป้าทั้งปี − ผลรวมบาท
  // ไม่ปรับเดือนอื่นให้ครบ 100% ส่วนต่างไปอยู่ที่ Remaining
  function phasingTotals(annual, monthPct) {
    var amounts = monthPct.map(function (p) { return amountFromPct(annual, p || 0); });
    var amountSum = sum(amounts);
    return { amounts: amounts, pctSum: sum(monthPct), amountSum: amountSum, remaining: remaining(annual, amountSum) };
  }

  // สัดส่วน 2 ชุดต่างกันหรือไม่ (ใช้ตัดสิน Badge "แก้แล้ว")
  function sharesDiffer(a, b) {
    if (!a || !b || a.length !== b.length) return true;
    for (var i = 0; i < a.length; i++) if (Math.abs((a[i] || 0) - (b[i] || 0)) > 1e-9) return true;
    return false;
  }

  // =====================================================================
  // 9) Product Master: รหัสสินค้า, Status, Listing, Clearance, วิธีเติมยอด
  // =====================================================================

  // productKey = Product Code (trCode · CR-30 ระบบสร้างเสมอ ไม่มีรหัสชั่วคราวแล้ว) — ใช้อ้างสินค้าทุกที่ (Listing, ราคา, แผน SKU, Actual, Run-rate)
  // CR-35: ID ภายใน (id) ใช้อ้างอิงทุกความสัมพันธ์ (แผน SKU · Listing · ราคา · แผน NPD) — สินค้าเดิมไม่มี id = Product Code เดิม (ไม่ต้องย้ายข้อมูล) ·
  //   คำขอ NPD ได้ id คงที่ (REQ-nnn) ตั้งแต่สร้าง จึงเปลี่ยนรหัสที่แสดง (รหัสชั่วคราว → Product Code 5 หลัก) ได้โดยไม่ย้ายการอ้างอิง
  function productKey(product) { return product ? (product.id || product.trCode || product.tempCode || '') : ''; }
  // CR-35: คำขอ NPD จาก Sales ที่ทีม Product ยังไม่ยืนยัน = ยังไม่มี Product Code 5 หลัก (Status Request)
  function isRequestProduct(product) { return !!product && product.source === SALES_REQUEST && !product.trCode; }
  // รหัสชั่วคราวของคำขอ NPD-YYMM-NNN: YYMM = เดือนเริ่มขายที่ขอ (ตามเดือนเปิดตัวปัจจุบัน · เปลี่ยนตาม Listing ที่เริ่มเร็วสุด) · NNN = requestSeq (ลำดับรวม ไม่ใช้ซ้ำ ไม่เปลี่ยน)
  function requestCodeOf(product) {
    var r = product.request || {};
    var k = String(product.launchDate || r.launchDate || r.startMonth || '').slice(0, 7);
    var seq = String(product.requestSeq || 0);
    while (seq.length < 3) seq = '0' + seq;
    return 'NPD-' + (k ? k.slice(2, 4) + k.slice(5, 7) : '0000') + '-' + seq;
  }
  // รหัสที่แสดงและค้นหา = Product Code 5 หลัก · คำขอ = รหัสชั่วคราว · อื่นๆ = รหัสเดิม
  function productCode(product) {
    if (!product) return '';
    if (product.trCode) return product.trCode;
    if (isRequestProduct(product)) return requestCodeOf(product);
    return product.tempCode || product.id || '';
  }
  // รหัสที่แสดงของ key (ไม่พบสินค้า = key)
  function codeOf(products, key) { var p = findProduct(products, key); return p ? productCode(p) : key; }

  function findProduct(products, key) {
    return (products || []).filter(function (p) { return productKey(p) === key; })[0] || null;
  }

  // CR-35 วงจรสถานะ 7 แบบ (ลำดับของตัวกรองทุกหน้า): request · planned · new (NPD) · active · discontinued · clearance · delete
  //   productStatus = Status ที่แสดง: delete (ตั้งแต่ deletedFrom) → request (คำขอที่ยังไม่ยืนยัน) → Status จากวันที่ (dateStatus)
  //   การล็อกช่องของแผน SKU ยังใช้ Status จากวันที่ (dateStatus) · Delete = แถวอ่านอย่างเดียวคงค่า (skuPlanGrid)
  var PRODUCT_STATUSES = ['request', 'planned', 'new', 'active', 'discontinued', 'clearance', 'delete'];
  function isDeletedAt(product, month) { return !!(product && product.deletedFrom && String(month).slice(0, 7) >= product.deletedFrom); }
  function deletedInYear(product, year) { return !!(product && product.deletedFrom && product.deletedFrom <= monthKey(year, 11)); }
  function productStatus(product, month, npdMonths) {
    if (isDeletedAt(product, month)) return 'delete';
    if (isRequestProduct(product)) return 'request';
    return dateStatus(product, month, npdMonths);
  }
  // ประเภทรายได้ของ Status (เตรียมใช้ติดตามรายได้ Phase 2) → 'npd' | 'existing' | 'clearance' | null
  function revenueTypeOf(status) {
    if (status === 'request' || status === 'planned' || status === 'new') return 'npd';
    if (status === 'active' || status === 'discontinued') return 'existing';
    if (status === 'clearance') return 'clearance';
    return null;
  }

  // Status จากวันที่ ณ เดือนที่พิจารณา (month = 'YYYY-MM') (ห้ามให้เลือกเอง)
  // → 'planned' ก่อน launchDate | 'new' NPD_MONTHS เดือนแรก (เดือนที่เริ่มขาย = เดือนที่ 1) | 'active' พ้นช่วง New
  //   | 'clearance' อยู่ในช่วง Clearance (มาก่อน Status อื่นเสมอ) | 'discontinued' หลัง discontinueMonth
  function dateStatus(product, month, npdMonths) {
    if (npdMonths == null) npdMonths = settings().NPD_MONTHS;
    var a = absMonth(month);
    var cl = product.clearance;
    if (cl && cl.fromMonth && a >= absMonth(cl.fromMonth) && (!cl.toMonth || a <= absMonth(cl.toMonth))) return 'clearance';   // CR-35 สิ้นสุดว่าง = จนสินค้าหมด
    if (product.discontinueMonth && a > absMonth(product.discontinueMonth)) return 'discontinued';
    // CR-30: NPD ที่ระบุเป็นไตรมาส (launchQuarter 'YYYY-Qn') ใช้เดือนแรกของไตรมาสเป็นเดือนเปิดตัวชั่วคราว (เดือนเปิดตัวยังไม่ยืนยัน)
    var launch = product.launchDate || quarterStart(product.launchQuarter);
    if (!launch) return 'planned';
    var first = absMonth(launch);
    if (a < first) return 'planned';
    if (a < first + npdMonths) return 'new';
    return 'active';
  }

  // Status ของเดือน m (0–11) ในปีแผน year (ที่แสดง) · dateStatusAt = จากวันที่ (การล็อกช่อง)
  function statusAt(product, year, m, npdMonths) { return productStatus(product, monthKey(year, m), npdMonths); }
  function dateStatusAt(product, year, m, npdMonths) { return dateStatus(product, monthKey(year, m), npdMonths); }

  // ช่วงต่อเนื่องของ Status ทั้งปี → [{ status, from, to }] (Tooltip การเปลี่ยน Status และเส้นเวลา 12 ช่อง)
  function statusSegments(product, year, npdMonths) {
    var out = [];
    for (var m = 0; m < 12; m++) {
      var st = statusAt(product, year, m, npdMonths);
      var last = out[out.length - 1];
      if (last && last.status === st) last.to = m;
      else out.push({ status: st, from: m, to: m });
    }
    return out;
  }

  // Status ในบริบทปีแผน = Status ณ เดือนแรกของปีแผน
  function planYearStatus(product, year, npdMonths) { return statusAt(product, year, 0, npdMonths); }

  // ขายอยู่ในปีแผน = มีอย่างน้อย 1 เดือนที่เป็น New / Active / Clearance ตามวันที่ (CR-35 ไม่นับเดือนที่ Delete)
  function soldInYear(product, year, npdMonths) {
    for (var m = 0; m < 12; m++) {
      if (isDeletedAt(product, monthKey(year, m))) continue;
      var st = dateStatusAt(product, year, m, npdMonths);
      if (st === 'new' || st === 'active' || st === 'clearance') return true;
    }
    return false;
  }

  // เปิดตัวในปีแผน (กลุ่ม NPD ของปีนั้น) = วันเริ่มขายอยู่ใน ม.ค.–ธ.ค. ของปี year
  function launchesIn(product, year) {
    if (!product.launchDate) return false;
    var i = monthIndex(product.launchDate, year);
    return i >= 0 && i <= 11;
  }

  // CR-30: เดือนแรกของไตรมาส 'YYYY-Qn' → 'YYYY-MM-01' | null
  function quarterStart(q) {
    var m = /^(\d{4})-Q([1-4])$/.exec(q || '');
    return m ? m[1] + '-' + pad2((Number(m[2]) - 1) * 3 + 1) + '-01' : null;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // listings = [{ productKey, accountId (= unitId), status, fromMonth, toMonth, addedBy }]
  //   CR-30 status: 'offered' เสนอขาย · 'listed' วางขาย · 'delisted' ถอดแล้ว (ค่าเดิมไม่มี status = วางขาย)
  //   fromMonth = เดือนเริ่มวางขายในหน่วยนั้น · toMonth = เดือนสุดท้ายก่อนถอด (null = ยังวางขาย)
  var LISTING_STATUSES = ['offered', 'listed', 'delisted'];
  function listingStatus(l) { return l && LISTING_STATUSES.indexOf(l.status) >= 0 ? l.status : 'listed'; }
  function listingOf(listings, key, unitId) {
    return (listings || []).filter(function (l) { return l.productKey === key && l.accountId === unitId; })[0] || null;
  }
  // Listing อยู่ = เสนอขาย / วางขาย (ถอดแล้ว = ไม่นับ) · ใช้กับจำนวนหน่วยที่ Listing · Stock Clearance · ราคา
  function isListed(listings, key, unitId) {
    return (listings || []).some(function (l) { return l.productKey === key && l.accountId === unitId && listingStatus(l) !== 'delisted'; });
  }

  // หน่วยขายที่สินค้านี้ Listing อยู่ (ตามลำดับใน listings · ไม่นับที่ถอดแล้ว)
  function listedAccounts(listings, key) {
    return (listings || []).filter(function (l) { return l.productKey === key && listingStatus(l) !== 'delisted'; }).map(function (l) { return l.accountId; });
  }
  // CR-30: Listing ของสินค้า × หน่วยขาย มีช่วงที่ทับปีแผน year หรือไม่ (วางขาย / ถอดแล้วที่ยังขายบางเดือนของปี / เสนอขาย)
  function listedInYear(listings, key, unitId, year) {
    var l = listingOf(listings, key, unitId);
    if (!l) return false;
    var from = l.fromMonth || null, to = listingStatus(l) === 'delisted' ? l.toMonth || null : null;
    if (listingStatus(l) === 'delisted' && !to) return false;
    return (!from || from <= monthKey(year, 11)) && (!to || to >= monthKey(year, 0));
  }
  // เดือน m (0–11) ของปี year อยู่นอกช่วง Listing → 'beforeListing' (ก่อนเดือนเริ่มวางขาย) | 'delisted' (หลังเดือนถอด) | null
  function listingOutside(l, year, m) {
    if (!l) return null;
    var k = monthKey(year, m);
    if (listingStatus(l) === 'delisted' && l.toMonth && k > l.toMonth) return 'delisted';
    if (l.fromMonth && k < l.fromMonth) return 'beforeListing';
    return null;
  }
  // ย้ายข้อมูลเดิม: Listing ที่ไม่มีสถานะ → วางขาย · เดือนเริ่ม = เดือนเริ่มขายต่อหน่วยจากแผน NPD (ถ้ามี) หรือเดือนเปิดตัวของสินค้า
  function normalizeListings(listings, products, npdPlans) {
    return (listings || []).map(function (l) {
      var o = copy(l);
      o.status = listingStatus(l);
      if (!o.fromMonth) {
        var plan = (npdPlans || []).filter(function (n) { return n.productKey === l.productKey; })[0];
        var pa = plan && (plan.plannedAccounts || []).filter(function (x) { return x.accountId === l.accountId && x.plannedStartMonth; })[0];
        var p = findProduct(products, l.productKey);
        var launch = p ? p.launchDate || quarterStart(p.launchQuarter) : null;
        o.fromMonth = pa ? String(pa.plannedStartMonth).slice(0, 7) : launch ? String(launch).slice(0, 7) : null;
      }
      if (o.toMonth === undefined) o.toMonth = null;
      return o;
    });
  }
  // ตั้ง Listing ของสินค้า × หน่วยขาย (ค่าใหม่แทนค่าเดิม · null = ไม่เคย Listing) → listings ใหม่
  function setListing(listings, key, unitId, value) {
    var out = (listings || []).filter(function (l) { return !(l.productKey === key && l.accountId === unitId); }).map(copy);
    if (value) {
      var old = listingOf(listings, key, unitId);
      var rec = { productKey: key, accountId: unitId, status: LISTING_STATUSES.indexOf(value.status) >= 0 ? value.status : 'listed',
        fromMonth: value.fromMonth || null, toMonth: value.status === 'delisted' ? value.toMonth || null : null };
      if (old && old.addedBy) { rec.addedBy = old.addedBy; if (old.addedAt) rec.addedAt = old.addedAt; if (old.addedByName) rec.addedByName = old.addedByName; }
      out.push(rec);
    }
    return out;
  }
  // ความครอบคลุม = หน่วยขายที่วางขาย (ณ เดือน month) ÷ หน่วยขายที่ใช้งานใน Channel นี้ (ไม่นับข้าม Channel)
  function listingCoverage(listings, key, units, month) {
    var n = 0;
    (units || []).forEach(function (u) {
      var l = listingOf(listings, key, u.id);
      if (!l || listingStatus(l) === 'offered') return;
      if (l.fromMonth && month < l.fromMonth) return;
      if (listingStatus(l) === 'delisted' && (!l.toMonth || month > l.toMonth)) return;
      n++;
    });
    return { listed: n, total: (units || []).length };
  }
  // จำนวนชิ้นและ Net Sales ของแผน SKU ในเดือนหลังเดือนถอด (กล่องยืนยันการถอด · แจ้งเท่านั้น) · plan = plan.<ปี>.sku.<unit> · grid = skuPlanGrid
  function plannedAfter(grid, key, year, toMonth) {
    var row = (grid && grid.rows || []).filter(function (r) { return r.key === key; })[0];
    var out = { units: 0, net: 0 };
    if (!row) return out;
    row.cells.forEach(function (c) { if (monthKey(year, c.m) > toMonth) { out.units += c.units || 0; out.net += c.net || 0; } });
    return out;
  }

  // Stock Clearance ของหน่วย = stockQty ระดับ SKU แบ่งเท่ากันทุกหน่วยที่ Listing (เศษไปหน่วยท้ายๆ)
  function clearanceStockFor(product, listings, unitId) {
    var cl = product.clearance;
    if (!cl || !cl.stockQty) return 0;
    var accs = listedAccounts(listings, productKey(product));
    var i = accs.indexOf(unitId);
    return i < 0 ? 0 : clearanceSplit(cl.stockQty, accs.length)[i];
  }

  // เดือนแรกที่เริ่มขายในหน่วยได้ = เดือนเริ่มขายใน Product Master (ถ้าเริ่มก่อนปีแผน = ม.ค.)
  function earliestStartMonth(product, year) { return product.launchDate ? Math.max(0, monthIndex(product.launchDate, year)) : 0; }

  // เดือนเริ่มขายในหน่วยต้องไม่ก่อน Launch Date และไม่หลังเดือนเลิกขาย
  function validStartMonth(product, m, year) {
    if (m < 0 || m > 11) return false;
    if (product.launchDate && m < monthIndex(product.launchDate, year)) return false;
    if (product.discontinueMonth && m > monthIndex(product.discontinueMonth, year)) return false;
    return true;
  }

  // วิธีเติมยอดของช่อง: 'locked' ล็อก 0 | 'clearance' | 'manual' กรอกเอง | 'system' ระบบเติม
  // ก่อนเดือนเริ่มขายในหน่วย → ล็อก / Clearance → Clearance / Planned หรือ Discontinued → ล็อก
  // hasSystem = วิธีเติมยอดของหน่วยมีค่าให้ SKU นี้ (calc.defaultPlanQty ไม่เป็น null: มียอดปีก่อน หรือมี Run-rate)
  //   ไม่มี (เช่น SKU ใหม่ในหน่วยนั้น) → กรอกเอง / มี → ระบบเติม
  //   CR-35: Status จากวันที่ (คำขอ NPD ล็อกก่อนเดือนเปิดตัวเหมือน Planned) · Discontinued = ขายจนหมด → แก้ได้เฉพาะหน่วยขายที่เคยขาย (soldHere)
  function cellSource(product, m, year, hasSystem, startMonth, npdMonths, soldHere) {
    if (startMonth != null && m < startMonth) return 'locked';
    var st = dateStatusAt(product, year, m, npdMonths);
    if (st === 'clearance') return 'clearance';
    if (st === 'planned' || (st === 'discontinued' && !soldHere)) return 'locked';
    return hasSystem ? 'system' : 'manual';
  }

  // เหตุผลของช่องล็อก 0 (null = ไม่ได้ล็อก): 'notListed' | 'planned' ก่อนวันเริ่มขาย | 'discontinued' เลิกขายแล้ว
  //   | 'beforeStart' สินค้าวางขายแล้วแต่ยังไม่ถึงเดือนเริ่มขายในหน่วยนี้
  function lockReason(product, m, year, startMonth, listed, npdMonths, soldHere) {
    if (listed === false) return 'notListed';
    var st = dateStatusAt(product, year, m, npdMonths);
    if (st === 'planned') return 'planned';
    if (st === 'discontinued' && !soldHere) return 'discontinued';
    if (startMonth != null && m < startMonth) return 'beforeStart';
    return null;
  }

  // =====================================================================
  // 10) แผนราย SKU: โหมด, สิทธิ์แก้ช่อง, Grid
  // =====================================================================

  // mode = 'initial' สร้างแผนครั้งแรก | 'reforecast' ปรับแผน / currentMonth = index เดือนปัจจุบัน (จำลอง)
  // → { editable, reason }  reason: 'locked' | 'actual' (≤ M) | 'frozen' (M+1..M+frozen) | 'open' | วิธีเติมยอด
  function cellState(mode, m, currentMonth, fillSource, frozen) {
    if (frozen == null) frozen = settings().FROZEN_MONTHS;
    if (fillSource === 'locked') return { editable: false, reason: 'locked' };
    if (mode !== 'reforecast') return { editable: true, reason: fillSource };
    if (m <= currentMonth) return { editable: false, reason: 'actual' };
    if (m <= currentMonth + frozen) return { editable: false, reason: 'frozen' };
    return { editable: true, reason: 'open' };
  }

  function fill(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }

  // ใช้ในแผน SKU ได้หรือไม่ → null | 'incomplete' (ขาดข้อมูลจำเป็น) · CR-30 ทุกสินค้าเป็นสินค้าขาย (ตัด Item Type)
  //   CR-20: สินค้าที่ Sales สร้าง (source SALES_REQUEST) ยกเว้นกฎขาดข้อมูลจำเป็น (หน้ารายการสินค้ายังแสดงความครบถ้วนตามปกติ)
  function planBlockReason(product, basePrices) {
    if (product.source === SALES_REQUEST) return null;
    return productCompleteness(product, basePrices).complete ? null : 'incomplete';
  }
  var SALES_REQUEST = 'SALES_REQUEST';

  // สินค้าที่ใช้คำนวณ Status ในแผน SKU: สินค้าจาก Sales ใช้วันเริ่มขายที่ Sales กรอกไว้ (ไม่มี = สินค้าเดิม)
  function planProduct(product) {
    var r = product && product.source === SALES_REQUEST ? product.request : null;
    if (!r || !r.launchDate || r.launchDate === product.launchDate) return product;
    var out = copy(product);
    out.launchDate = r.launchDate;
    return out;
  }

  // แผน NPD ที่อนุมัติแล้วของสินค้า × หน่วยขาย → เดือนเริ่มขาย (index ในปีแผน) | null
  function npdStartMonth(npdPlans, key, unitId, year) {
    var plan = (npdPlans || []).filter(function (n) { return n.productKey === key && n.workflow && n.workflow.status === 'approved'; })[0];
    var a = plan && (plan.plannedAccounts || []).filter(function (x) { return x.accountId === unitId; })[0];
    if (!a || !a.plannedStartMonth) return null;
    var i = monthIndex(a.plannedStartMonth, year);
    return i >= 0 && i <= 11 ? i : null;
  }

  // แถวใหม่ในแผน: เริ่มขายเดือนแรกที่ทำได้ (หรือเดือนจากแผน NPD ที่อนุมัติแล้ว) / qty = ค่าช่องกรอกเอง / overrides = ช่องที่ถูกแก้
  function newPlanItem(product, year, qtyDefault, startMonth) {
    var start = startMonth != null && validStartMonth(product, startMonth, year) ? startMonth : earliestStartMonth(product, year);
    return { startMonth: start, qty: fill(12, qtyDefault || 0), overrides: fill(12, false), stopped: false };
  }

  // แผนตั้งต้นของหน่วย = สินค้าขายจริงที่ข้อมูลจำเป็นครบ Listing ในหน่วยนี้ และขายอยู่ในปีแผน (เปิดตัวก่อนปีแผน)
  //   + NPD ที่แผน NPD อนุมัติแล้วและวางแผนหน่วยนี้ไว้ (เดือนเริ่มขายจากแผน NPD) — NPD อื่นต้องเพิ่มเอง
  // master = { products, listings, basePrices, npdPlans } / withDefaults = ใช้ manualDefault (เฉพาะปีที่มีข้อมูลตั้งต้น)
  // seeds = { <productKey>: { <เดือน>: ชิ้น } } ค่าตั้งต้นรายช่อง (data/plan-seeds.js) → ช่องนั้นเป็น Override
  function defaultSkuPlan(master, unitId, year, withDefaults, seeds) {
    var items = {};
    master.products.forEach(function (p) {
      var key = productKey(p);
      var lrec = listingOf(master.listings, key, unitId);
      if (!listedInYear(master.listings, key, unitId, year) || listingStatus(lrec) === 'offered' || planBlockReason(p, master.basePrices)) return;
      var npdStart = npdStartMonth(master.npdPlans, key, unitId, year);
      if (npdStart == null && (launchesIn(p, year) || !soldInYear(p, year))) return;
      var item = newPlanItem(p, year, withDefaults && p.manualDefault ? p.manualDefault[unitId] : 0, npdStart);
      var seed = seeds && seeds[key];
      if (seed) Object.keys(seed).forEach(function (m) { item.qty[Number(m)] = seed[m]; item.overrides[Number(m)] = true; });
      items[key] = item;
    });
    return { items: items };
  }

  // สินค้าที่เพิ่มในแผนได้ = ขายจริง Listing ในหน่วยนี้ ยังไม่อยู่ในแผน และขายในปีแผน
  // → [{ product, key, status (ณ ม.ค.), npd (เปิดตัวในปีแผน), blocked: null | 'incomplete', missing: [ฟิลด์จำเป็นที่ขาด], startMonth }]
  //   blocked = แสดงในรายการแต่เลือกไม่ได้
  function availableSkus(master, unitId, plan, year) {
    var items = (plan && plan.items) || {};
    return master.products.filter(function (p) {
      var key = productKey(p);
      return listedInYear(master.listings, key, unitId, year) && !items[key] && soldInYear(p, year) && bundleVisible(p);
    }).map(function (p) {
      var key = productKey(p);
      var c = productCompleteness(p, master.basePrices);
      return {
        product: p, key: key, status: planYearStatus(p, year), npd: launchesIn(p, year),
        blocked: c.complete ? null : 'incomplete', missing: c.missingRequired, startMonth: npdStartMonth(master.npdPlans, key, unitId, year)
      };
    });
  }

  // CR-20: สินค้าที่เพิ่มในแผนได้จาก Product Master ทั้งหมด (ไม่ใช่เฉพาะที่ Listing แล้ว)
  //   = ขายในปีแผน (ไม่เลิกขายก่อนปีแผน และเปิดตัวไม่เกินปีแผน) · ยังไม่อยู่ในแผน
  //   → [{ product, key, listed (Listing แล้วในหน่วยนี้), status, npd, fromSales, blocked: null | 'incomplete', missing, startMonth }]
  //   เรียง Listing แล้วก่อน / blocked = แสดงแต่เลือกไม่ได้ (สินค้าจาก Sales ไม่ติด)
  //   CR-35: history (ไม่บังคับ) = Discontinued ที่เคยขายในหน่วยขายนี้เพิ่มได้ · สินค้าที่เป็น Delete ในปีแผนไม่แสดง
  function addableSkus(master, unitId, plan, year, history) {
    var items = (plan && plan.items) || {};
    return master.products.filter(function (p) {
      if (items[productKey(p)] || deletedInYear(p, year) || !bundleVisible(p)) return false;   // CR-37: Flag bundle ปิด = ไม่มี Bundle
      var pp = planProduct(p);
      return soldInYear(pp, year) || (!!history && hasStatusInYear(pp, year, ['discontinued']) && soldInUnit(history, unitId, productKey(p)));
    }).map(function (p) {
      var key = productKey(p);
      var c = productCompleteness(p, master.basePrices);
      var block = planBlockReason(p, master.basePrices);
      return {
        product: p, key: key, listed: listedInYear(master.listings, key, unitId, year), offered: listingStatus(listingOf(master.listings, key, unitId)) === 'offered' && !!listingOf(master.listings, key, unitId),
        status: planYearStatus(planProduct(p), year), npd: launchesIn(planProduct(p), year),
        fromSales: p.source === SALES_REQUEST, blocked: block, missing: block ? c.missingRequired : [], startMonth: npdStartMonth(master.npdPlans, key, unitId, year)
      };
    }).sort(function (a, b) { return (a.listed ? 0 : 1) - (b.listed ? 0 : 1); });
  }

  // Listing ที่ Sales สร้าง (ไม่ซ้ำกับที่มีอยู่) → รายการใหม่ { productKey, accountId, addedBy: 'SALES', addedAt, fromMonth }
  function addSalesListings(listings, keys, unitIds, meta) {
    meta = meta || {};
    var out = copy(listings || []);
    keys.forEach(function (k) {
      unitIds.forEach(function (u) {
        if (isListed(out, k, u)) return;
        out.push({ productKey: k, accountId: u, status: 'listed', fromMonth: meta.fromMonth || null, toMonth: null, addedBy: 'SALES', source: 'skuPlanning', addedAt: meta.at || null, addedByName: meta.by || null });
      });
    });
    return out;
  }

  // สร้าง NPD จากหน้าวางแผน SKU (CR-20 ข้อ 3.1) — ใช้ได้ทันที ไม่มีขั้นอนุมัติ
  //   master = { products, basePrices, listings, taxonomy, codeCounters, npdPlans }
  //   input  = { name, seriesId (null = ยังไม่ระบุ · undefined / '' = ยังไม่เลือก), categoryId, subCategoryId, typeId (ต้องเลือก · CR-30), price (รวม VAT), startMonth (0–11),
  //             year, unitId (หน่วยขายที่สร้าง), unitIds (หน่วยขายอื่นใน Channel เดียวกัน), note }
  //   meta   = { by, at }
  // → { ok, errors: ['name' | 'series' | 'type' | 'prefix' | 'price' | 'month'], key, product, master } — CR-30 Product Code จากระบบทันที (core/catalog.js)
  //   · ใน TRCLOUD = ยังไม่เปิด · master.codeCounters จดเลขที่ออก · source SALES_REQUEST · แผน NPD (ที่มา จาก Sales · มีผลทันที) ·
  //   วันเริ่มขาย = วันแรกของเดือนเริ่มขาย · ราคาต่อ Account ของหน่วยที่สร้าง · RSP ชั่วคราว (ถ้ายังไม่มี) · Listing (addedBy SALES) ทุกหน่วยที่เลือก
  function createSalesNpd(master, input, meta) {
    meta = meta || {};
    var errors = [];
    var name = String(input.name || '').trim();
    if (!name) errors.push('name');
    if (input.seriesId === undefined || input.seriesId === '') errors.push('series');
    if (!(Number(input.price) > 0)) errors.push('price');
    // CR-35: คำขอได้ ID ภายใน (REQ-nnn) + ลำดับคำขอรวมทั้งระบบ (requestSeq · รหัสชั่วคราว NPD-YYMM-NNN) · Product Code 5 หลักออกตอนทีม Product ยืนยัน
    var seq = SP.core.catalog.nextRequestSeq(master.products, master.codeCounters);
    var m = Number(input.startMonth);
    if (input.startMonth === '' || input.startMonth == null || isNaN(m) || m < 0 || m > 11) errors.push('month');
    if (errors.length) return { ok: false, errors: errors, key: null, product: null, master: master };
    var year = input.year;
    var launch = dateKey(year, m, 1);
    var code = SP.core.catalog.requestId(seq);
    var units = [input.unitId].concat((input.unitIds || []).filter(function (u) { return u && u !== input.unitId; }));
    var price = Math.round(Number(input.price) * 100) / 100;
    var product = {
      id: code, requestSeq: seq, trCode: '', barcode: '', name: name, nameEn: '', shortName: '', inferred: false,
      categoryId: input.categoryId || null, subCategoryId: input.subCategoryId || null, typeId: input.typeId || null,
      seriesId: input.seriesId || null, subSeriesId: null, packSize: null, uom: null, image: null,
      launchDate: launch, discontinueMonth: null, clearance: null, note: '', inTrcloud: false,
      source: SALES_REQUEST, requestedBy: meta.by || '', requestedAt: meta.at || '',
      request: { unitId: input.unitId, unitIds: units, price: price, launchDate: launch, startMonth: monthKey(year, m), note: String(input.note || '').trim() },
      createdAt: meta.at || '', updatedAt: meta.at || ''
    };
    var start = monthKey(year, m);
    var out = {
      products: (master.products || []).concat([product]),
      basePrices: setBasePrice(master.basePrices || [], { productKey: code, priceType: 'RSP', effectiveMonth: start, price: price, by: meta.by || '', at: meta.at || '' }).list,
      listings: addSalesListings(master.listings, [code], units, { at: meta.at, by: meta.by, fromMonth: start }),
      codeCounters: SP.core.catalog.takeRequestSeq(master.codeCounters, seq),
      npdPlans: (master.npdPlans || []).concat([{
        id: 'npd-' + code.toLowerCase(), productKey: code, seriesId: product.seriesId, stage: 'plan', plannedLaunchDate: launch, launchQuarter: null, stageTargets: {},
        plannedAccounts: units.map(function (u) { return { accountId: u, plannedStartMonth: start }; }), expectedRsp: price, owner: '', source: 'SALES',
        note: product.request.note, workflow: { status: 'approved', history: [{ action: 'apply', by: meta.by || '', at: meta.at || '' }] }
      }])
    };
    return { ok: true, errors: [], key: code, product: product, master: out };
  }

  // สินค้าจาก Sales ที่ทีม Product แก้ภายหลัง → ['price' (ราคาของหน่วยที่ขอ ณ เดือนเริ่มขาย ต่างจากที่ Sales กรอก) | 'launch' (วันเริ่มขายเปลี่ยน)]
  //   data = store.data() (basePrices · promoPrices · หน่วยขาย) / สินค้าอื่น = []
  function salesRequestChanges(product, data) {
    var r = product && product.source === SALES_REQUEST ? product.request : null;
    if (!r) return [];
    var key = productKey(product);
    var out = [];
    var now = resolvePrice(data, key, r.unitId, r.startMonth || r.launchDate);
    if (now.price == null || Math.abs(now.price - r.price) > 0.005) out.push('price');
    if ((product.launchDate || null) !== (r.launchDate || null)) out.push('launch');
    return out;
  }

  // หยุดวางแผน (ลบในโหมดปรับแผน): เดือนที่แก้ได้ (หลัง M+frozen) = 0 คงเดือน Actual และเดือนที่ล็อกไว้
  function stopPlanItem(item, currentMonth, frozen) {
    if (frozen == null) frozen = settings().FROZEN_MONTHS;
    var out = JSON.parse(JSON.stringify(item));
    for (var m = Math.max(0, currentMonth + frozen + 1); m < 12; m++) { out.qty[m] = 0; out.overrides[m] = true; }
    out.stopped = true;
    return out;
  }

  // ยอดขายจริง (ชิ้น) จาก data.actuals (ไม่มีข้อมูล = 0)
  function actualUnits(actuals, year, unitId, key, m) {
    var y = actuals && actuals.years[year];
    var a = y && y[unitId] && y[unitId][key];
    return a ? a[m] || 0 : 0;
  }

  // Grid ของแผนราย SKU ในหน่วยขายหนึ่ง
  //   data   = store.data() (basePrices, promoPrices, history, settings, actuals, accounts/territories/channels สำหรับ GP)
  //   master = { products, listings } จาก store (master.*)
  //   plan   = { method, items: { <productKey>: item } } จาก store (plan.<ปี>.sku.<id> หรือ plan.<ปี>.forecast.<id>)
  //            method = วิธีเติมยอดของช่องระบบเติม 'priorYear' (ค่าตั้งต้น CR-20) | 'lastYear' | 'runRate' (ไม่มี = settings.DEFAULT_FILL_METHOD)
  //   opts   = { year, mode: 'initial' | 'reforecast', currentMonth, includesVat, snapshot (ราคาตอนล็อก Baseline),
  //              target (เป้าหมายทั้งปีของหน่วย บาท — การเติบโต g ของวิธี lastYear), prior (true = คำนวณยอดปีก่อนเป็นเงินด้วย) }
  // ชิ้นต่อช่อง: เดือน Actual (โหมดปรับแผน) = ยอดจริง / ล็อก = 0 / กรอกเอง หรือ Override = qty
  //             ระบบเติม = defaultPlanQty (ยอดเดือนเดียวกันปีก่อน / × g / Run-rate × Seasonality) / Clearance = Stock ของหน่วย ÷ จำนวนเดือน
  //   สินค้าจาก Sales (CR-20): Status ในแผนใช้วันเริ่มขายที่ Sales กรอก (product.request.launchDate) — ทีม Product เลื่อนวันภายหลัง จำนวนชิ้นในแผนไม่เปลี่ยน
  // ราคาและ GP ต่อช่อง = monthPricing (CR-30 resolvePrice รายเดือน: Promotion ของหน่วย → ของ Channel → ราคาหลัก)
  // ยอดปีก่อน (ราคาปีก่อน): cell.ly (ชิ้น) · cell.lySellOut · cell.lyNet (เมื่อ opts.prior) / row.ly = ผลรวมทั้งปี | null / grid.prior = รวมทุกแถว
  function skuPlanGrid(data, master, unitId, plan, opts) {
    opts = opts || {};
    var st = data.settings;
    var year = opts.year || st.DEFAULT_PLAN_YEAR;
    var mode = opts.mode || 'initial';
    var current = opts.currentMonth == null ? -1 : opts.currentMonth;
    var includesVat = opts.includesVat != null ? opts.includesVat : st.PRICE_INCLUDES_VAT;
    var pricing = pricingOf(data, opts.snapshot);
    var ctx = unitPricing(data, pricing, unitId);
    var live = pricingOf(data, null);
    var liveCtx = unitPricing(data, live, unitId);
    var si = seasonalityIndex(priorMonthly(data.history, year, unitId) || fill(12, 1));
    var method = (plan && plan.method) || st.DEFAULT_FILL_METHOD || 'priorYear';
    var unitLY = l12m(data, unitId);   // CR-24: ยอดขายปีก่อนของหน่วย = L12M
    var g = method === 'lastYear' ? growthFactor(opts.target, unitLY) : null;
    var totals = { units: zeros(12), sellOut: zeros(12), net: zeros(12) };
    var prior = { units: zeros(12), sellOut: zeros(12), net: zeros(12) };
    // CR-38: opts.revisionLock = { before (จำนวนเดือนแรกที่ล็อก), items: { <productKey>: { u: [ชิ้น], s: [Sale Amount], n: [Net Sales] } } } ค่าของรอบก่อน
    //   เดือนที่ล็อก = ค่าจากรอบก่อน (ไม่ใช่ค่าระบบเติม / ราคาปัจจุบัน) · อ่านอย่างเดียว (state.reason revision) · ไม่ส่ง = ผลเดิมทุกค่า
    var rl = opts.revisionLock && opts.revisionLock.before > 0 ? opts.revisionLock : null;
    var items = (plan && plan.items) || {};

    // CR-37: Flag bundle ปิด = ไม่แสดงและไม่นับแถว Bundle (bundleVisible)
    var rows = master.products.filter(function (p) { return items[productKey(p)] && bundleVisible(p); }).map(function (p0) {
      var key = productKey(p0);
      var p = planProduct(p0);
      var item = items[key];
      var lrec = listingOf(master.listings, key, unitId);
      var listed = listedInYear(master.listings, key, unitId, year);
      var ref = skuReference(data.history, unitId, key);   // CR-24: ยอดอ้างอิงราย SKU (ยอดจริงล่าสุดของเดือน · ไม่มี = ประมาณการปีล่าสุด + ทำเครื่องหมาย)
      var ly = ref ? ref.monthly : null;
      var rr = runRateOf(data.history, key, unitId);
      var sys = listed ? defaultPlanQty(method, { monthly: ly, runRate: rr }, opts.target, unitLY, si) : null;
      var soldHere = soldInUnit(data.history, unitId, key);   // CR-35: Discontinued แก้ได้เฉพาะหน่วยขายที่เคยขาย
      var lyTotal = ly ? { units: 0, sellOut: 0, net: 0 } : null;
      var cells = [];
      for (var m = 0; m < 12; m++) {
        // CR-30: เดือนนอกช่วง Listing ของหน่วยนี้ (ก่อนเริ่มวางขาย / หลังถอด) = ล็อก 0
        var outside = listed ? listingOutside(lrec, year, m) : null;
        var source = listed && !outside ? cellSource(p, m, year, sys != null, item.startMonth, st.NPD_MONTHS, soldHere) : 'locked';
        var lock = source === 'locked' ? lockReason(p, m, year, item.startMonth, listed, st.NPD_MONTHS, soldHere) || outside : null;
        var state = cellState(mode, m, current, source, st.FROZEN_MONTHS);
        // CR-35: เดือนที่สินค้าเป็น Delete = อ่านอย่างเดียว คงค่าเดิม (ไม่ล้างให้อัตโนมัติ · ข้อมูลที่ต้องตรวจ มีแผนสินค้า Delete)
        if (source !== 'locked' && isDeletedAt(p0, monthKey(year, m))) state = { editable: false, reason: 'deleted' };
        // CR-36: เดือน Clearance = อ่านอย่างเดียว วางแผนจำนวนที่ Price & Promotion › Clearance (แผน Clearance ไม่นับในแผนนี้) · ค่าที่มีอยู่ก่อน (Override) คงไว้
        //   แทนการแบ่ง Stock อัตโนมัติของ CR-30 (clearanceSplit / clearanceStockFor ยังอยู่ใน calc)
        var clLock = source === 'clearance' && state.editable;
        if (clLock) { state = { editable: false, reason: 'clearance' }; lock = 'clearance'; }
        var systemUnits = source === 'system' ? sys[m] : null;
        var override = source === 'clearance' ? !!(item.overrides && item.overrides[m]) : !!(item.overrides && item.overrides[m]) && systemUnits != null;
        var planned = source === 'locked' ? 0 : (source === 'manual' || override) ? Number(item.qty[m] || 0) : source === 'clearance' ? 0 : systemUnits;
        var units = state.reason === 'actual' ? actualUnits(data.actuals, year, unitId, key, m) : planned;
        var rlv = rl && m < rl.before ? (rl.items && rl.items[key]) || {} : null;
        if (rlv) { planned = rlv.u ? Number(rlv.u[m]) || 0 : 0; units = planned; state = { editable: false, reason: 'revision' }; lock = lock || 'revision'; }
        var pm = monthPricing(pricing, key, unitId, ctx, year, m);
        var c = chain({ units: units, price: pm.price, gp: pm.gp, hasGP: ctx.hasGP, includesVat: includesVat });
        if (rlv) c = { saleAmount: rlv.s ? Number(rlv.s[m]) || 0 : 0, netSales: rlv.n ? (rlv.n[m] == null ? null : Number(rlv.n[m])) : 0 };
        totals.units[m] += units;
        totals.sellOut[m] += c.saleAmount;
        totals.net[m] += c.netSales || 0;
        var cell = {
          m: m, status: statusAt(p, year, m, st.NPD_MONTHS), source: source, lockReason: lock, state: state, units: units, planned: planned,
          systemUnits: systemUnits, override: override, price: pm.price, rsp: pm.rsp, base: pm.base, normalPrice: pm.base, priceType: pm.priceType,
          gp: pm.gp, priceSource: pm.source, promos: pm.promos, promoDays: pm.promoDays, days: pm.days, sellOut: c.saleAmount, net: c.netSales,
          ly: ly ? (ly[m] || 0) : null, lySellOut: null, lyNet: null,
          lyYear: ref ? ref.sourceYears[m] : null, lyEstimated: !!(ref && ref.estimated[m])
        };
        if (ly) {
          lyTotal.units += cell.ly;
          prior.units[m] += cell.ly;
          if (opts.prior) {
            var lp = monthPricing(live, key, unitId, liveCtx, cell.lyYear, m);
            var lc = chain({ units: cell.ly, price: lp.price, gp: lp.gp, hasGP: liveCtx.hasGP, includesVat: includesVat });
            cell.lySellOut = lc.saleAmount;
            cell.lyNet = lc.netSales;
            lyTotal.sellOut += lc.saleAmount;
            lyTotal.net += lc.netSales || 0;
            prior.sellOut[m] += lc.saleAmount;
            prior.net[m] += lc.netSales || 0;
          }
        }
        cells.push(cell);
      }
      return {
        key: key,
        product: p0,
        item: item,
        listed: listed,
        listingStatus: lrec ? listingStatus(lrec) : null,   // CR-30: 'offered' = ป้าย ยังไม่ยืนยัน Listing
        quarterLaunch: !p.launchDate && !!p.launchQuarter ? p.launchQuarter : null,   // CR-30: ป้าย เดือนเปิดตัวยังไม่ยืนยัน
        status: planYearStatus(p, year, st.NPD_MONTHS),
        primary: primaryStatus(p, year, st.NPD_MONTHS),
        group: launchesIn(p, year) ? 'npd' : 'selling',
        planType: planTypeOf(data, master, key, unitId, year),   // CR-34: ประเภทสินค้าในแผน (existing · newListing · npdConfirmed · npdRequest · clearance)
        runRate: rr,
        fill: sys != null ? method : null,
        segments: statusSegments(p, year, st.NPD_MONTHS),
        hasOverride: cells.some(function (c) { return c.override; }),
        cells: cells,
        ly: lyTotal,
        total: {
          units: sum(cells.map(function (c) { return c.units; })),
          sellOut: sum(cells.map(function (c) { return c.sellOut; })),
          net: sum(cells.map(function (c) { return c.net; }))
        }
      };
    });

    return {
      accountId: unitId, unitId: unitId, year: year, mode: mode, gp: ctx.gp, hasGP: ctx.hasGP, gpMissing: ctx.hasGP && ctx.gp == null,
      priceType: ctx.priceType, includesVat: includesVat,
      si: si, method: method, g: g, unitPrior: unitLY, rows: rows, totals: totals, prior: prior,
      priorTotal: { units: sum(prior.units), sellOut: sum(prior.sellOut), net: sum(prior.net) },
      yearTotal: { units: sum(totals.units), sellOut: sum(totals.sellOut), net: sum(totals.net) }
    };
  }

  // =====================================================================
  // 11) ช่วงเวลา Forecast (หน้า approval)
  // =====================================================================

  // 'past' ผ่านไปแล้ว | 'current' เดือนปัจจุบัน (ล็อก) | 'locked' M+1..M+frozen | 'open' ปรับได้
  function monthWindow(current, m, frozen) {
    if (frozen == null) frozen = settings().FROZEN_MONTHS;
    if (m < current) return 'past';
    if (m === current) return 'current';
    if (m <= current + frozen) return 'locked';
    return 'open';
  }

  // =====================================================================
  // 12) ตัวช่วยค้นข้อมูล
  // =====================================================================

  function findById(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0] || null; }

  // =====================================================================
  // 13) ผู้รับผิดชอบตามช่วงเวลา (assignments) — เป้าและยอดผูกกับหน่วย ไม่ผูกกับคน
  //     เดือนเป็น 'YYYY-MM' (เทียบแบบ String ได้) / assignment = { unitId, salesPersonId | null, fromMonth, toMonth | null }
  // =====================================================================

  // (2027, 0) → '2027-01'
  function monthKey(year, m) {
    var y = year + Math.floor(m / 12);
    var mm = ((m % 12) + 12) % 12 + 1;
    return y + '-' + (mm < 10 ? '0' : '') + mm;
  }

  // '2027-01' + 2 → '2027-03'
  function addMonths(key, n) {
    var p = parseDate(key);
    return monthKey(p.y, p.m + n);
  }

  // คนนี้ทำงานอยู่ในเดือน key หรือไม่ (startMonth ≤ key ≤ endMonth)
  function employedIn(person, key) {
    return !!person && (!person.startMonth || person.startMonth <= key) && (!person.endMonth || key <= person.endMonth);
  }

  // สถานะของ Sales Person ณ เดือน key: 'active' | 'leaving' (มีเดือนลาออกแล้วแต่ยังทำงาน) | 'resigned' | 'future' (ยังไม่เริ่มงาน)
  function personStatus(person, key) {
    if (person.endMonth && person.endMonth < key) return 'resigned';
    if (person.startMonth && person.startMonth > key) return 'future';
    return person.endMonth ? 'leaving' : 'active';
  }

  // ลบหน่วย (Account / เขต) ออกจาก Master ได้หรือไม่: ต้องไม่อยู่ในแผน (inPlan = { <unitId>: true })
  // ไม่มียอดขายย้อนหลังในปีใดเลย และไม่เคยมีผู้รับผิดชอบ — นอกนั้นให้ปิดใช้งานแทน
  function canRemoveUnit(data, unitId, inPlan) {
    if (inPlan && inPlan[unitId]) return false;
    if ((data.assignments || []).some(function (a) { return a.unitId === unitId; })) return false;
    var years = (data.history && data.history.years) || {};
    return !Object.keys(years).some(function (y) { return years[y].monthly && years[y].monthly[unitId]; });
  }

  // ช่วงของหน่วยนี้เรียงตามเดือน
  function unitAssignments(assignments, unitId) {
    return (assignments || []).filter(function (a) { return a.unitId === unitId; })
      .sort(function (a, b) { return a.fromMonth < b.fromMonth ? -1 : a.fromMonth > b.fromMonth ? 1 : 0; });
  }

  function covers(a, key) { return a.fromMonth <= key && (a.toMonth == null || key <= a.toMonth); }

  // ช่วงที่ครอบเดือน key (null = ไม่มี = ว่าง)
  function assignmentAt(assignments, unitId, key) {
    return unitAssignments(assignments, unitId).filter(function (a) { return covers(a, key); })[0] || null;
  }

  // ผู้รับผิดชอบหน่วยในเดือน key → salesPersonId หรือ null (ว่าง หรือคนที่ผูกไว้ลาออกแล้ว/ยังไม่เริ่มงาน)
  function ownerOf(assignments, salespeople, unitId, key) {
    var a = assignmentAt(assignments, unitId, key);
    if (!a || !a.salesPersonId) return null;
    var p = findById(salespeople, a.salesPersonId);
    return employedIn(p, key) ? p.id : null;
  }

  // 12 เดือนของปีแผน → [{ personId | null, assignedId | null, state: 'owner' | 'vacant' | 'resigned' }]
  //   resigned = ยังผูกกับคนที่ลาออกแล้ว (นับเป็นว่างในการคำนวณ)
  function ownerMonths(assignments, salespeople, unitId, year) {
    var out = [];
    for (var m = 0; m < 12; m++) {
      var key = monthKey(year, m);
      var a = assignmentAt(assignments, unitId, key);
      var owner = ownerOf(assignments, salespeople, unitId, key);
      out.push({ personId: owner, assignedId: a ? a.salesPersonId : null, state: owner ? 'owner' : a && a.salesPersonId ? 'resigned' : 'vacant' });
    }
    return out;
  }

  // แถบผู้รับผิดชอบ: เดือนติดกันที่เป็นคนเดียวกัน (และสถานะเดียวกัน) รวมเป็นช่วงเดียว → [{ personId, assignedId, state, from, to }]
  function ownerSegments(assignments, salespeople, unitId, year) {
    var out = [];
    ownerMonths(assignments, salespeople, unitId, year).forEach(function (o, m) {
      var last = out[out.length - 1];
      if (last && last.state === o.state && last.personId === o.personId && last.assignedId === o.assignedId) last.to = m;
      else out.push({ personId: o.personId, assignedId: o.assignedId, state: o.state, from: m, to: m });
    });
    return out;
  }

  // ช่วงที่ทับกันในหน่วยเดียวกัน → [{ unitId, first, second }] (ว่าง = ถูกต้อง)
  function validateAssignments(list) {
    var bad = [];
    var byUnit = {};
    (list || []).forEach(function (a) { (byUnit[a.unitId] = byUnit[a.unitId] || []).push(a); });
    Object.keys(byUnit).forEach(function (u) {
      var rows = unitAssignments(list, u);
      for (var i = 1; i < rows.length; i++) {
        var prev = rows[i - 1];
        if (prev.toMonth == null || prev.toMonth >= rows[i].fromMonth) bad.push({ unitId: u, first: prev, second: rows[i] });
      }
      rows.forEach(function (a) { if (a.toMonth != null && a.toMonth < a.fromMonth) bad.push({ unitId: u, first: a, second: a }); });
    });
    return bad;
  }

  function sameOwner(a, b) { return (a.salesPersonId || null) === (b.salesPersonId || null); }

  // กำหนดผู้รับผิดชอบหน่วย unitId ตั้งแต่ fromKey ถึง toKey (null = ต่อไปเรื่อยๆ) personId = null → ว่าง
  // ช่วงเดิมที่ทับจะถูกตัดออก ช่วงติดกันของคนเดียวกันรวมเป็นช่วงเดียว
  // currentKey = เดือนปัจจุบัน: เดือนก่อนหน้าเป็นประวัติ แก้ไม่ได้ (fromKey < currentKey → error 'past')
  // → { ok: true, list } | { ok: false, error: 'past' | 'range' }
  function setOwner(list, unitId, personId, fromKey, toKey, currentKey) {
    if (toKey != null && toKey < fromKey) return { ok: false, error: 'range' };
    if (currentKey && fromKey < currentKey) return { ok: false, error: 'past' };
    var out = [];
    (list || []).forEach(function (a) {
      if (a.unitId !== unitId) { out.push({ unitId: a.unitId, salesPersonId: a.salesPersonId, fromMonth: a.fromMonth, toMonth: a.toMonth }); return; }
      if (a.fromMonth < fromKey) {
        var end = a.toMonth != null && a.toMonth < fromKey ? a.toMonth : addMonths(fromKey, -1);
        out.push({ unitId: unitId, salesPersonId: a.salesPersonId, fromMonth: a.fromMonth, toMonth: end });
      }
      if (toKey != null && (a.toMonth == null || a.toMonth > toKey)) {
        var start = a.fromMonth > toKey ? a.fromMonth : addMonths(toKey, 1);
        out.push({ unitId: unitId, salesPersonId: a.salesPersonId, fromMonth: start, toMonth: a.toMonth });
      }
    });
    out.push({ unitId: unitId, salesPersonId: personId || null, fromMonth: fromKey, toMonth: toKey == null ? null : toKey });
    // รวมช่วงติดกันของคนเดียวกัน
    var others = out.filter(function (a) { return a.unitId !== unitId; });
    var rows = unitAssignments(out, unitId);
    var merged = [];
    rows.forEach(function (a) {
      var last = merged[merged.length - 1];
      if (last && sameOwner(last, a) && last.toMonth != null && addMonths(last.toMonth, 1) === a.fromMonth) last.toMonth = a.toMonth;
      else merged.push(a);
    });
    return { ok: true, list: others.concat(merged) };
  }

  // บันทึกเดือนลาออก: ต้องไม่ก่อนเดือนปัจจุบัน และไม่ก่อนเดือนเริ่มงาน → { ok, people, error: 'past' | 'range' }
  function setEndMonth(people, personId, endKey, currentKey) {
    var p = findById(people, personId);
    if (!p) return { ok: false, error: 'range' };
    if (endKey && currentKey && endKey < currentKey) return { ok: false, error: 'past' };
    if (endKey && p.startMonth && endKey < p.startMonth) return { ok: false, error: 'range' };
    return {
      ok: true,
      people: people.map(function (x) {
        var c = JSON.parse(JSON.stringify(x));
        if (c.id === personId) c.endMonth = endKey || null;
        return c;
      })
    };
  }

  // Sales Person ที่กำหนดให้หน่วยของ Channel นี้ได้ในเดือน key: ทำงานอยู่ และ channelId ตรงกัน หรือ null (ดูแลได้ทุก Channel)
  function eligiblePeople(salespeople, channelId, key) {
    return (salespeople || []).filter(function (p) {
      return (p.channelId == null || p.channelId === channelId) && (!key || employedIn(p, key));
    });
  }

  // Alert ของหน่วยในแผน → [{ unitId, type: 'vacant' | 'resigned', months: [index], personId }]
  //   vacant = ไม่มีผู้รับผิดชอบ / resigned = ยังผูกกับคนที่ลาออกแล้ว (นับเป็นว่าง)
  function assignmentAlerts(assignments, salespeople, unitIds, year) {
    var out = [];
    unitIds.forEach(function (u) {
      var vacant = [], resigned = {};
      ownerMonths(assignments, salespeople, u, year).forEach(function (o, m) {
        if (o.state === 'vacant') vacant.push(m);
        if (o.state === 'resigned') (resigned[o.assignedId] = resigned[o.assignedId] || []).push(m);
      });
      if (vacant.length) out.push({ unitId: u, type: 'vacant', months: vacant, personId: null });
      Object.keys(resigned).forEach(function (p) { out.push({ unitId: u, type: 'resigned', months: resigned[p], personId: p }); });
    });
    return out;
  }

  // =====================================================================
  // 14) Performance รายคน: รวมเป้าและยอดของทุกหน่วย เฉพาะเดือนที่คนนั้นรับผิดชอบ
  // =====================================================================

  // values = { <unitId>: [12 ตัวเลข] } ของ source ที่ต้องการ (Target Baseline หรือ Actual)
  // opts.stores (CR-16) = { values: { <storeId>: [12] }, territory: { <storeId>: [12 territoryId | null] } } (core/stores.js performanceInput)
  //   → เขตที่มีข้อมูลร้านค้า: ยอดของร้าน × เดือนที่ร้านอยู่ในเขต × เดือนที่คนรับผิดชอบเขต (แทน values ของเขตนั้น)
  // → { personId, months: [12], total, owned: [12 bool], units: [{ unitId, months, total }] }
  function performanceByPerson(assignments, salespeople, personId, year, values, opts) {
    var months = zeros(12), owned = fill(12, false), units = [];
    var st = opts && opts.stores;
    var byStore = {};
    if (st) {
      Object.keys(st.territory || {}).forEach(function (sid) {
        (st.territory[sid] || []).forEach(function (t, m) {
          if (!t) return;
          var row = byStore[t] = byStore[t] || zeros(12);
          row[m] += (st.values[sid] || [])[m] || 0;
        });
      });
    }
    var rows = {};
    Object.keys(values || {}).forEach(function (unitId) { if (!byStore[unitId]) rows[unitId] = values[unitId]; });
    Object.keys(byStore).forEach(function (unitId) { rows[unitId] = byStore[unitId]; });
    Object.keys(rows).forEach(function (unitId) {
      var row = zeros(12), any = false;
      for (var m = 0; m < 12; m++) {
        if (ownerOf(assignments, salespeople, unitId, monthKey(year, m)) !== personId) continue;
        row[m] = rows[unitId][m] || 0;
        months[m] += row[m];
        owned[m] = true;
        any = true;
      }
      if (any) units.push({ unitId: unitId, months: row, total: sum(row) });
    });
    return { personId: personId, months: months, total: sum(months), owned: owned, units: units };
  }

  // ตาราง Performance ของคนหนึ่ง: Target Baseline ทั้งช่วงที่รับผิดชอบ, Target และ Actual ถึงเดือนปัจจุบัน, % ความสำเร็จ
  // targets / actuals = { <unitId>: [12] } / currentMonth = index เดือนปัจจุบัน (นับเป็น Actual)
  function personPerformance(assignments, salespeople, personId, year, targets, actuals, currentMonth) {
    var t = performanceByPerson(assignments, salespeople, personId, year, targets);
    var a = performanceByPerson(assignments, salespeople, personId, year, actuals);
    var upto = function (arr) { return sum(arr.slice(0, currentMonth + 1)); };
    var targetToDate = upto(t.months);
    var actualToDate = upto(a.months);
    return {
      personId: personId,
      owned: t.owned,
      units: t.units.map(function (u) { return u.unitId; }),
      target: t.total,
      targetToDate: targetToDate,
      actualToDate: actualToDate,
      achievement: targetToDate > 0 ? actualToDate / targetToDate : null
    };
  }

  // CR-29: ผลงาน YTD ของคน = ผลรวม values เฉพาะเดือนที่คนนั้นรับผิดชอบ ตั้งแต่ ม.ค. ถึงเดือน uptoMonth (index 0–11) · uptoMonth < 0 = null (ปียังไม่เริ่ม)
  //   ตัวเลขเดียวกับ personPerformance (targetToDate / actualToDate) เมื่อใช้ข้อมูลและเดือนเดียวกัน
  function personYtd(assignments, salespeople, personId, year, values, uptoMonth) {
    if (uptoMonth == null || uptoMonth < 0) return null;
    var r = performanceByPerson(assignments, salespeople, personId, year, values);
    return sum(r.months.slice(0, Math.min(11, uptoMonth) + 1));
  }

  // ยอดจริงเป็น Net Sales รายเดือนของหน่วย (ชิ้นจาก data.actuals × ราคาที่มีผล × (1 − GP ที่มีผล)) เดือนหลัง uptoMonth = 0
  function actualNetByUnit(data, master, unitId, year, uptoMonth) {
    var out = zeros(12);
    var y = data.actuals && data.actuals.years[year];
    var rows = (y && y[unitId]) || {};
    var pricing = pricingOf(data, null);
    var ctx = unitPricing(data, pricing, unitId);
    Object.keys(rows).forEach(function (key) {
      if (!findProduct(master.products, key)) return;
      for (var m = 0; m <= Math.min(11, uptoMonth); m++) {
        var units = rows[key][m] || 0;
        if (!units) continue;
        var pm = monthPricing(pricing, key, unitId, ctx, year, m);
        out[m] += chain({ units: units, price: pm.price, gp: pm.gp, hasGP: ctx.hasGP }).netSales || 0;
      }
    });
    return out;
  }

  // =====================================================================
  // 15) คำอธิบายการคำนวณ (ⓘ และ Tooltip รายช่องในหน้าวางแผน SKU)
  // =====================================================================

  // การคำนวณของช่องเดียว: ชิ้น × ราคา (รวม VAT) → Sale Amount → ÷ VAT × (1 − GP) → Net Sales
  // CR-18: 3,000 ชิ้น × 149 บาท GP 40% → Sale Amount 447,000.00 · Net Sales 250,654.21 (÷ 1.07 × 0.60)
  function cellBreakdown(units, price, gp, hasGP, includesVat) {
    var c = chain({ units: units, price: price, gp: gp, hasGP: hasGP, includesVat: includesVat });
    return {
      units: units, price: price, gp: gp, hasGP: hasGP !== false, vatFactor: 1 + settings().VAT, includesVat: includesVatOf(includesVat),
      saleAmount: c.saleAmount, exVat: c.exVat, netSales: c.netSales, gpAmount: c.gpAmount, vatAmount: c.vatAmount
    };
  }

  // Sale Amount (เงินที่ลูกค้าจ่าย รวม VAT) ไปอยู่ที่ใคร: Net Sales (บริษัท) / GP (ร้านค้า) / VAT
  // hasGP = false → ไม่มีส่วน GP / ยังไม่มี GP → ไม่มีส่วน net และ gp (gpMissing) → { saleAmount, total, gpMissing, parts: [{ key, value, share }] }
  function moneySplit(sale, gp, hasGP, includesVat) {
    var ex = exVat(sale, includesVat);
    var net = netSales(1, sale, { hasGP: hasGP !== false }, { gp: gp }, { includesVat: includesVat });
    var parts = [];
    if (net != null) parts.push({ key: 'net', value: net });
    if (hasGP !== false && net != null) parts.push({ key: 'gp', value: ex - net });
    parts.push({ key: 'vat', value: sale - ex });
    parts.forEach(function (p) { p.share = sale ? p.value / sale : 0; });
    return { saleAmount: sale, total: sale, gpMissing: net == null, parts: parts };
  }

  // =====================================================================
  // 16) Series, หมวดสินค้า และผลรวมของแถวที่เลือก
  // =====================================================================

  var TAX_LEVELS = { category: ['CATEGORY', 'SUB_CATEGORY', 'TYPE'], series: ['SERIES', 'SUB_SERIES'] };
  var TAX_FIELDS = { CATEGORY: 'categoryId', SUB_CATEGORY: 'subCategoryId', TYPE: 'typeId', SERIES: 'seriesId', SUB_SERIES: 'subSeriesId' };

  // taxonomy = { category: [{ id, name, parentId, level, active, order }], series: [...] } / kind = 'category' | 'series'
  function taxonomyNode(tax, kind, id) { return id ? findById(tax && tax[kind], id) : null; }
  function taxonomyName(tax, kind, id) { var n = taxonomyNode(tax, kind, id); return n ? n.name : ''; }

  // รายการย่อยของ parentId (null = ระดับบนสุด) เรียงตามลำดับ / activeOnly = เฉพาะที่เปิดใช้งาน (ฟอร์มสินค้า)
  function taxonomyChildren(tax, kind, parentId, activeOnly) {
    return ((tax && tax[kind]) || []).filter(function (n) {
      return (n.parentId || null) === (parentId || null) && (!activeOnly || n.active !== false);
    }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  // Tree เรียงตามลำดับ → [{ node, depth }]
  function taxonomyTree(tax, kind) {
    var out = [];
    (function walk(parentId, depth) {
      taxonomyChildren(tax, kind, parentId).forEach(function (n) { out.push({ node: n, depth: depth }); walk(n.id, depth + 1); });
    })(null, 0);
    return out;
  }

  // ฟิลด์ของสินค้าที่อ้างรายการระดับนี้ (CATEGORY → categoryId, …)
  function taxonomyField(level) { return TAX_FIELDS[level]; }

  // จำนวน SKU ที่ใช้รายการนี้อยู่
  function taxonomyUsage(products, node) {
    var f = node && TAX_FIELDS[node.level];
    return f ? (products || []).filter(function (p) { return p[f] === node.id; }).length : 0;
  }

  // ลบรายการ: ห้ามลบเมื่อมี SKU ใช้อยู่ ('inUse' + count) หรือยังมีรายการย่อย ('hasChildren') → ให้ปิดใช้งานแทน
  function removeTaxonomyNode(tax, products, kind, id) {
    var node = taxonomyNode(tax, kind, id);
    if (!node) return { ok: false, error: 'notFound', count: 0 };
    var used = taxonomyUsage(products, node);
    if (used) return { ok: false, error: 'inUse', count: used };
    var kids = taxonomyChildren(tax, kind, id).length;
    if (kids) return { ok: false, error: 'hasChildren', count: kids };
    var out = copy(tax);
    out[kind] = out[kind].filter(function (n) { return n.id !== id; });
    return { ok: true, error: null, taxonomy: out };
  }

  // เพิ่มรายการย่อย (parentId = null = ระดับบนสุด) ระดับถัดจาก parent → { ok, taxonomy, node, error: 'depth' | 'name' }
  function addTaxonomyNode(tax, kind, parentId, name, id) {
    var levels = TAX_LEVELS[kind];
    var parent = parentId ? taxonomyNode(tax, kind, parentId) : null;
    var level = parent ? levels[levels.indexOf(parent.level) + 1] : levels[0];
    if (!level) return { ok: false, error: 'depth' };
    var clean = String(name || '').trim();
    if (!clean) return { ok: false, error: 'name' };
    var siblings = taxonomyChildren(tax, kind, parentId);
    var node = { id: id, name: clean, parentId: parentId || null, level: level, active: true, order: siblings.length ? siblings[siblings.length - 1].order + 1 : 1 };
    var out = copy(tax);
    out[kind].push(node);
    return { ok: true, taxonomy: out, node: node, error: null };
  }

  // เลื่อนลำดับขึ้น (delta = −1) หรือลง (+1) ภายในรายการระดับเดียวกัน
  function moveTaxonomyNode(tax, kind, id, delta) {
    var node = taxonomyNode(tax, kind, id);
    if (!node) return tax;
    var sib = taxonomyChildren(tax, kind, node.parentId);
    var i = sib.map(function (n) { return n.id; }).indexOf(id);
    var j = i + delta;
    if (j < 0 || j >= sib.length) return tax;
    var out = copy(tax);
    var a = findById(out[kind], sib[i].id), b = findById(out[kind], sib[j].id);
    var t = a.order; a.order = b.order; b.order = t;
    if (a.order === b.order) { a.order += delta; }
    return out;
  }

  // ชื่อหมวดสินค้าและ Series ของสินค้า
  function productTaxonomy(tax, product) {
    return {
      category: taxonomyName(tax, 'category', product.categoryId), subCategory: taxonomyName(tax, 'category', product.subCategoryId),
      type: taxonomyName(tax, 'category', product.typeId), series: taxonomyName(tax, 'series', product.seriesId),
      subSeries: taxonomyName(tax, 'series', product.subSeriesId)
    };
  }

  // ตัวเลือก Filter Series: Series แล้วตามด้วย Sub Series พร้อมจำนวน SKU → [{ value, label, count, depth, parentId }]
  //   เลือก Series = รวม Sub Series ทั้งหมด (inSeries) / สินค้าที่ไม่มี Series → value '' label null
  function seriesList(tax, products) {
    var out = [];
    taxonomyChildren(tax, 'series', null).forEach(function (s) {
      out.push({ value: s.id, label: s.name, depth: 0, parentId: null, count: products.filter(function (p) { return p.seriesId === s.id; }).length });
      taxonomyChildren(tax, 'series', s.id).forEach(function (ss) {
        out.push({ value: ss.id, label: ss.name, depth: 1, parentId: s.id, count: products.filter(function (p) { return p.subSeriesId === ss.id; }).length });
      });
    });
    var none = products.filter(function (p) { return !p.seriesId; }).length;
    if (none) out.push({ value: '', label: null, depth: 0, parentId: null, count: none });
    return out;
  }

  // สินค้าอยู่ใน Series ที่เลือกหรือไม่ (ไม่เลือก = ทุก Series / เลือก Series = รวมทุก Sub Series)
  function inSeries(product, selected) {
    if (!selected || !selected.length) return true;
    return selected.indexOf(product.seriesId || '') >= 0 || (!!product.subSeriesId && selected.indexOf(product.subSeriesId) >= 0);
  }

  // ผลรวมรายเดือนของหลายชุด (เช่น เป้าหมายรายเดือนของหลายหน่วย) → [12]
  function addMonthly(list) {
    var out = zeros(12);
    (list || []).forEach(function (arr) { (arr || []).forEach(function (v, m) { out[m] += v || 0; }); });
    return out;
  }

  // แผน Net Sales แยกตามกลุ่มสินค้า จากแถวของ skuPlanGrid หลายหน่วย → [{ key, value }] ผลรวมทุกกลุ่ม = แผนรวม
  //   by = 'status'   → Status ของแต่ละเดือน (Planned / New / Active / Clearance / Discontinued)
  //   by = 'series'   → seriesId / 'category' → categoryId เรียงมากไปน้อย แสดง top รายการ ที่เหลือรวมเป็น key = null (อื่นๆ)
  function planMix(rows, by, top) {
    var map = {}, order = [];
    function add(k, v) { if (!(k in map)) { map[k] = 0; order.push(k); } map[k] += v; }
    rows.forEach(function (r) {
      if (by === 'status') r.cells.forEach(function (c) { add(c.status, c.net); });
      else add(by === 'category' ? (r.product.categoryId || '') : (r.product.seriesId || ''), r.total.net);
    });
    var out = order.map(function (k) { return { key: k, value: map[k] }; });
    if (by === 'status') {
      var rank = ['planned', 'new', 'active', 'clearance', 'discontinued'];
      return out.sort(function (a, b) { return rank.indexOf(a.key) - rank.indexOf(b.key); });
    }
    out.sort(function (a, b) { return b.value - a.value; });
    if (top && out.length > top) {
      var rest = out.slice(top);
      out = out.slice(0, top).concat([{ key: null, value: sum(rest.map(function (x) { return x.value; })) }]);
    }
    return out;
  }

  // ผลรวมรายเดือนของแถว SKU ที่ระบุ (ใช้กับ "รวม Series ที่เลือก")
  function sumRows(rows) {
    var t = { units: zeros(12), sellOut: zeros(12), net: zeros(12) };
    rows.forEach(function (r) {
      r.cells.forEach(function (c, m) { t.units[m] += c.units; t.sellOut[m] += c.sellOut; t.net[m] += c.net; });
    });
    t.year = { units: sum(t.units), sellOut: sum(t.sellOut), net: sum(t.net) };
    return t;
  }

  // =====================================================================
  // 17) ความครบถ้วนของข้อมูลสินค้า
  // =====================================================================

  // มีข้อมูลในฟิลด์หรือไม่: 'code' = Product Code / 'rsp' = มี RSP ในราคาหลัก (CR-30 basePrices) / 'packSize' ต้องมากกว่า 0
  //   'launchDate' = มีเดือนเปิดตัว หรือเดือนเปิดตัวแบบไตรมาสจากแผน NPD (launchQuarter)
  function hasProductField(product, field, basePrices) {
    if (field === 'code') return !!productKey(product);
    if (field === 'rsp') {
      var k = productKey(product);
      return (basePrices || []).some(function (r) { return r.productKey === k && r.priceType === 'RSP' && r.price > 0; });
    }
    if (field === 'launchDate' && product.launchQuarter) return true;
    var v = product[field];
    if (field === 'packSize') return v != null && Number(v) > 0;
    return v != null && String(v).trim() !== '';
  }

  // ความครบถ้วน (ฟิลด์จำเป็นและที่ควรมีอยู่ใน settings) → { pct, missingRequired, missingRecommended, complete, level }
  //   level = 'ok' ครบ | 'required' ขาดข้อมูลจำเป็น | 'recommended' ขาดข้อมูลที่ควรมี
  //   CR-35: คำขอ NPD (Request) ไม่นับรหัส TRCLOUD / Barcode · ฟิลด์จำเป็นของคำขอ = ชื่อ · Series · หมวด · Type · RSP · เดือนเริ่มขาย
  var REQUEST_REQUIRED = ['name', 'seriesId', 'categoryId', 'typeId', 'rsp', 'launchDate'];
  var REQUEST_RECOMMENDED = ['image'];
  function productCompleteness(product, basePrices) {
    var S = settings();
    var request = isRequestProduct(product);
    var req = request ? REQUEST_REQUIRED : S.PRODUCT_REQUIRED || [], rec = request ? REQUEST_RECOMMENDED : S.PRODUCT_RECOMMENDED || [];
    var missingRequired = req.filter(function (f) { return !hasProductField(product, f, basePrices); });
    var missingRecommended = rec.filter(function (f) { return !hasProductField(product, f, basePrices); });
    var total = req.length + rec.length;
    return {
      pct: total ? (total - missingRequired.length - missingRecommended.length) / total : 1,
      missingRequired: missingRequired, missingRecommended: missingRecommended, complete: !missingRequired.length,
      level: missingRequired.length ? 'required' : missingRecommended.length ? 'recommended' : 'ok'
    };
  }

  // =====================================================================
  // 18) แผน NPD, รหัสชั่วคราว, ผูกรหัสจริง, ERP, Audit log
  // =====================================================================

  var NPD_STAGES = ['plan', 'concept', 'production', 'ready', 'launched'];

  // ขั้นของ NPD: ถึงเดือนเปิดตัวแล้ว (เทียบเดือนปัจจุบัน 'YYYY-MM') → 'launched' ระบบตั้งให้ / นอกนั้นตามที่บันทึก
  function npdStage(plan, currentKey) {
    if (plan.plannedLaunchDate && currentKey && absMonth(currentKey) >= absMonth(plan.plannedLaunchDate)) return 'launched';
    var s = plan.stage || 'plan';
    return s === 'launched' ? 'ready' : s;
  }

  // อนุมัติแผน NPD: ตั้งวันเริ่มขายของสินค้า และเพิ่ม Listing ของหน่วยที่วางแผน (ไม่ลบ Listing เดิม) → { products, listings }
  //   CR-30: แผนแบบไตรมาส (launchQuarter ไม่มี plannedLaunchDate) → สินค้าไม่มีเดือนเปิดตัว (Status Planned) และเก็บ launchQuarter ไว้ที่สินค้า
  function applyNpdApproval(master, plan) {
    var products = copy(master.products), listings = copy(master.listings);
    products.forEach(function (p) {
      if (productKey(p) !== plan.productKey) return;
      if (plan.plannedLaunchDate) { p.launchDate = plan.plannedLaunchDate; delete p.launchQuarter; }
      else if (plan.launchQuarter) { p.launchDate = null; p.launchQuarter = plan.launchQuarter; }
    });
    (plan.plannedAccounts || []).forEach(function (a) {
      if (!isListed(listings, plan.productKey, a.accountId)) listings.push({ productKey: plan.productKey, accountId: a.accountId, status: 'listed', fromMonth: a.plannedStartMonth ? String(a.plannedStartMonth).slice(0, 7) : null, toMonth: null });
    });
    return { products: products, listings: listings };
  }

  // ---------------------------------------------------------------------
  // CR-30 แผน NPD ต่อเนื่อง: เดือนเปิดตัวแน่นอน (plannedLaunchDate) หรือไตรมาส (launchQuarter 'YYYY-Qn' ยังไม่ยืนยันเดือน)
  //   stageTargets = { plan, concept, production, ready: 'YYYY-MM' } เดือนเป้าหมายที่ขั้นนั้นควรเสร็จ (ไม่บังคับ)
  // ---------------------------------------------------------------------

  // '2028-Q2' → ['2028-04', '2028-05', '2028-06'] (รูปแบบไม่ถูกต้อง = [])
  function quarterMonths(q) {
    var m = /^(\d{4})-Q([1-4])$/.exec(String(q || ''));
    if (!m) return [];
    var y = Number(m[1]), s = (Number(m[2]) - 1) * 3;
    return [0, 1, 2].map(function (i) { return monthKey(y, s + i); });
  }

  // เดือนเปิดตัวของแผน → { month (เดือนแน่นอน | null), quarter, from, to (ช่วงเดือนที่เป็นไปได้), confirmed }
  function npdLaunch(plan) {
    if (plan && plan.plannedLaunchDate) { var k = String(plan.plannedLaunchDate).slice(0, 7); return { month: k, quarter: null, from: k, to: k, confirmed: true }; }
    var q = quarterMonths(plan && plan.launchQuarter);
    return q.length ? { month: null, quarter: plan.launchQuarter, from: q[0], to: q[2], confirmed: false } : { month: null, quarter: null, from: null, to: null, confirmed: false };
  }

  // ช่วงของขั้นงานก่อนเปิดตัว (ต่อกัน): ขั้นเริ่มเดือนถัดจากเป้าหมายของขั้นก่อนหน้าที่มีวัน และจบที่เดือนเป้าหมายของขั้นนั้น
  //   ขั้นแรกที่มีวัน = เดือนเป้าหมายเดือนเดียว · ขั้นที่ไม่มีวันเป้าหมายไม่วาด → [{ stage, from, to }]
  function npdStageSegments(plan) {
    var t = (plan && plan.stageTargets) || {}, out = [], prev = null;
    NPD_STAGES.slice(0, 4).forEach(function (s) {
      var to = t[s];
      if (!to) return;
      var start = prev ? addMonths(prev, 1) : to;
      out.push({ stage: s, from: start <= to ? start : to, to: to });
      prev = to;
    });
    return out;
  }

  // ขั้นงานที่เลยเดือนเป้าหมายแล้วยังไม่เสร็จ (ขั้นปัจจุบันและขั้นหลังจากนั้น) → [stage]
  function npdOverdue(plan, currentKey) {
    var stage = npdStage(plan, currentKey);
    if (stage === 'launched') return [];
    var i = NPD_STAGES.indexOf(stage), t = (plan && plan.stageTargets) || {};
    return NPD_STAGES.slice(0, 4).filter(function (s, j) { return j >= i && t[s] && t[s] < currentKey; });
  }

  // เปิดตัวภายใน n เดือนนับจากเดือนปัจจุบัน (รวมเดือนปัจจุบัน · แผนแบบไตรมาสใช้เดือนแรกของไตรมาส)
  function npdLaunchSoon(plan, currentKey, n) {
    var l = npdLaunch(plan);
    if (!l.from) return false;
    var d = absMonth(l.from) - absMonth(currentKey);
    return d >= 0 && d < n;
  }

  // ช่วงเดือนต่อเนื่อง n เดือนตั้งแต่ fromKey → ['YYYY-MM', …] (Timeline แผน NPD)
  function monthSpan(fromKey, n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(addMonths(fromKey, i));
    return out;
  }

  // สรุปแผน NPD: อยู่ในแผน SKU แล้วกี่หน่วย จาก plans = { <unitId>: { items } } ของปีแผน
  function npdCoverage(plan, plans) {
    var accs = (plan.plannedAccounts || []).map(function (a) { return a.accountId; });
    var inPlan = accs.filter(function (u) { return plans && plans[u] && plans[u].items && plans[u].items[plan.productKey]; });
    return { planned: accs.length, inPlan: inPlan.length, missing: accs.filter(function (u) { return inPlan.indexOf(u) < 0; }) };
  }

  // ย้ายรหัสสินค้า (CR-30 ใช้ตอนโหลดเท่านั้น: รหัสชั่วคราวของข้อมูลตั้งต้น → Product Code ระบบ · core/catalog.assignSystemCodes · ไม่มีปุ่มผูกรหัสจริงแล้ว)
  //   ย้ายทุกข้อมูลที่อ้างรหัสเดิม (สินค้า, Listing, ราคา, ราคาต่อ Account, Promotion, แผน NPD)
  // master = { products, listings, basePrices, promoPrices, npdPlans } → { ok, error: 'empty' | 'notFound' | 'duplicate', master }
  // แผน SKU ทุกปีย้ายด้วย renamePlanKey (Module เรียกกับทุก Key plan.<ปี>.sku / forecast ที่บันทึกไว้)
  function bindTrCode(master, tempCode, trCode) {
    var code = String(trCode == null ? '' : trCode).trim();
    if (!code) return { ok: false, error: 'empty', master: master };
    var target = (master.products || []).filter(function (p) { return !p.trCode && p.tempCode === tempCode; })[0];
    if (!target) return { ok: false, error: 'notFound', master: master };
    var taken = (master.products || []).some(function (p) { return p.trCode === code || p.tempCode === code; });
    if (taken) return { ok: false, error: 'duplicate', master: master };
    var out = copy(master);
    out.products.forEach(function (p) { if (!p.trCode && p.tempCode === tempCode) p.trCode = code; });
    ['listings', 'basePrices', 'promoPrices', 'npdPlans'].forEach(function (k) {
      (out[k] || []).forEach(function (r) { if (r.productKey === tempCode) r.productKey = code; });
    });
    return { ok: true, error: null, master: out };
  }

  // ย้าย Key ของสินค้าในแผน SKU (items.<from> → items.<to>) ไม่มี = คืนค่าเดิม
  function renamePlanKey(plan, from, to) {
    if (!plan || !plan.items || !plan.items[from]) return plan;
    var out = copy(plan);
    out.items[to] = out.items[from];
    delete out.items[from];
    return out;
  }

  // เปรียบเทียบกับ ERP (เฉพาะสินค้าที่มี Product Code) → { onlyErp: [แถว ERP], onlyMaster: [สินค้า], mismatches: [{ key, field, master, erp }] }
  function compareErp(products, basePrices, erp, month) {
    var mine = (products || []).filter(function (p) { return p.trCode; });
    var byCode = {}, erpBy = {};
    mine.forEach(function (p) { byCode[p.trCode] = p; });
    (erp || []).forEach(function (r) { erpBy[r.trCode] = r; });
    var mismatches = [];
    mine.forEach(function (p) {
      var r = erpBy[p.trCode];
      if (!r) return;
      if ((p.name || '') !== (r.name || '')) mismatches.push({ key: p.trCode, field: 'name', master: p.name || '', erp: r.name || '' });
      if ((p.barcode || '') !== (r.barcode || '')) mismatches.push({ key: p.trCode, field: 'barcode', master: p.barcode || '', erp: r.barcode || '' });
      var rsp = rspAt(basePrices, p.trCode, month);
      if (r.rsp != null && (rsp == null || Math.abs(rsp - r.rsp) > 0.005)) mismatches.push({ key: p.trCode, field: 'rsp', master: rsp, erp: r.rsp });
    });
    return {
      onlyErp: (erp || []).filter(function (r) { return !byCode[r.trCode]; }),
      onlyMaster: mine.filter(function (p) { return !erpBy[p.trCode]; }),
      mismatches: mismatches
    };
  }

  // รายการ Audit log ของฟิลด์ที่เปลี่ยน { entity, key, field, oldValue, newValue, by, at } (รูปเก็บเป็น true/false ไม่เก็บ data URL)
  // before = null → รายการสร้างใหม่ (field 'create') / after = null → รายการที่ถูกลบ (field 'delete')
  function auditDiff(entity, key, before, after, meta) {
    meta = meta || {};
    function entry(field, a, b) { return { entity: entity, key: key, field: field, oldValue: a, newValue: b, by: meta.by || '', at: meta.at || '' }; }
    if (!before) return [entry('create', null, key)];
    if (!after) return [entry('delete', key, null)];
    function val(f, v) { if (f === 'image') return !!v; return v === undefined ? null : copy(v); }
    var fields = {};
    Object.keys(before).concat(Object.keys(after)).forEach(function (f) { if (f !== 'updatedAt' && f !== 'createdAt') fields[f] = true; });
    return Object.keys(fields).filter(function (f) { return JSON.stringify(val(f, before[f])) !== JSON.stringify(val(f, after[f])); })
      .map(function (f) { return entry(f, val(f, before[f]), val(f, after[f])); });
  }

  // =====================================================================
  // 19) Top-down: สัดส่วน 2 คอลัมน์, การเติบโต, Waterfall, สัดส่วน Channel, แถวส่งออก
  // =====================================================================

  // % ของ Total ของหน่วยขาย = % ใน Channel × % ของ Total ของ Channel
  function pctOfTotal(unitPct, channelPct) { return (unitPct || 0) * (channelPct || 0); }

  // ส่วนต่างเป็นบาท = เป้าหมาย − ยอดขายปีก่อน (ไม่มียอดปีก่อน → null)
  function growthAmount(target, prior) { return prior != null ? (target || 0) - prior : null; }

  // สัดส่วนเต็ม % ที่รวม 100% (Largest remainder): [7.7, 8.7, 6.5] → [0.34, 0.38, 0.28]
  function roundShares(values) {
    var t = sum(values);
    if (!(t > 0)) return values.map(function () { return 0; });
    var raw = values.map(function (v) { return (v || 0) / t * 100; });
    var base = raw.map(Math.floor);
    var rest = 100 - sum(base);
    raw.map(function (v, i) { return { i: i, r: v - base[i] }; })
      .sort(function (a, b) { return b.r - a.r || a.i - b.i; })
      .slice(0, rest).forEach(function (x) { base[x.i] += 1; });
    return base.map(function (v) { return v / 100; });
  }

  // ที่มาของการเติบโต: ยอดขายปีก่อนรวม → ส่วนต่างของแต่ละ Channel → (ยังไม่จัดสรร) → Total Target
  // → { start, end, steps: [{ id, name, color, prior, target, delta, isNew }] } ผลรวม start + Σdelta = end
  function growthWaterfall(tree) {
    var steps = tree.children.map(function (c) {
      return { id: c.id, name: c.name, color: c.color, prior: c.prior, target: c.amount, delta: c.amount - (c.prior || 0), isNew: c.prior == null };
    });
    var rem = tree.remaining ? tree.remaining.amount : 0;
    if (Math.abs(rem) > settings().ALERT_TOLERANCE_BAHT) steps.push({ id: null, name: null, color: null, prior: null, target: null, delta: rem, isNew: false, unallocated: true });
    return { start: tree.prior || 0, end: tree.amount, steps: steps };
  }

  // สัดส่วน Channel ปีก่อนเทียบปีนี้ → { prior: [{ id, share }], target: [{ id, share }] } (เทียบกับผลรวมของแต่ละปี)
  function channelShareRows(tree) {
    var priorTotal = sum(tree.children.map(function (c) { return c.prior || 0; }));
    var targetTotal = sum(tree.children.map(function (c) { return c.amount; }));
    return {
      prior: tree.children.map(function (c) { return { id: c.id, share: priorTotal > 0 ? (c.prior || 0) / priorTotal : 0 }; }),
      target: tree.children.map(function (c) { return { id: c.id, share: targetTotal > 0 ? c.amount / targetTotal : 0 }; })
    };
  }

  // แถวสำหรับส่งออก (แบบแบน ไม่ Merge): Channel → หน่วยขาย · ท้ายไฟล์: Total + คงเหลือระดับ Total + คงเหลือแต่ละ Channel
  //   CR-23 opts: { level: 'channel' } = หน้า Annual Target (แถว Channel + Total + คงเหลือระดับ Total ไม่มีแถวหน่วยขาย) /
  //               { channelId } = หน้า Sub-channel Allocation (แถวหน่วยขายของ Channel นั้น + คงเหลือใน Channel)
  // → [{ kind: 'channel' | 'unit' | 'total' | 'remaining', scope, channelId, channel, unitId, unit, allocationUnit,
  //      prior, pctOfTotal, pctInChannel, amount, growth, growthAmount, status }]
  function topDownRows(tree, opts) {
    opts = opts || {};
    function unitRow(ch, u) {
      return { kind: 'unit', channelId: ch.id, channel: ch.name, allocationUnit: ch.allocationUnit, unitId: u.id, unit: u.name,
        prior: u.prior, pctOfTotal: u.pctOfTotal, pctInChannel: u.pct, amount: u.amount, growth: u.growth, growthAmount: u.growthAmount };
    }
    function channelRem(ch) {
      return { kind: 'remaining', scope: 'channel', channelId: ch.id, channel: ch.name, pctOfTotal: null, pctInChannel: ch.unallocatedPct,
        amount: ch.remaining.amount, status: ch.remaining.status };
    }
    if (opts.channelId) {
      var one = findById(tree.children, opts.channelId);
      if (!one) return [];
      return one.children.map(function (u) { return unitRow(one, u); }).concat([channelRem(one)]);
    }
    var withUnits = opts.level !== 'channel';
    var rows = [];
    tree.children.forEach(function (ch) {
      rows.push({ kind: 'channel', channelId: ch.id, channel: ch.name, allocationUnit: ch.allocationUnit, unitId: null, unit: null,
        prior: ch.prior, pctOfTotal: ch.pct, pctInChannel: 1, amount: ch.amount, growth: ch.growth, growthAmount: ch.growthAmount, units: ch.children.length });
      if (withUnits) ch.children.forEach(function (u) { rows.push(unitRow(ch, u)); });
    });
    rows.push({ kind: 'total', prior: tree.prior, pctOfTotal: 1, pctInChannel: null, amount: tree.amount, growth: tree.growth, growthAmount: tree.growthAmount });
    rows.push({ kind: 'remaining', scope: 'total', pctOfTotal: tree.unallocatedPct, pctInChannel: null, amount: tree.remaining.amount, status: tree.remaining.status });
    if (withUnits) tree.children.forEach(function (ch) { rows.push(channelRem(ch)); });
    return rows;
  }

  // ---------------------------------------------------------------------
  // CR-23: ยอดขายย้อนหลัง 3 ปี · Annual Target / Sub-channel Allocation
  // ---------------------------------------------------------------------

  // ปีของยอดขายย้อนหลังที่แสดง = count ปีก่อนปีแผน (ค่าตั้งต้น 3) — ปีแผน 2027 → [2024, 2025, 2026] · 2028 → [2025, 2026, 2027]
  function historyYears(planYear, count) {
    var n = count || 3, out = [];
    for (var y = planYear - n; y < planYear; y++) out.push(y);
    return out;
  }

  // ยอดขายทั้งปีของ Channel (รวมทุกหน่วยใน Master) หรือหน่วยขาย ในแต่ละปีของ years → [บาท | null] ตามลำดับ (null = ไม่มีข้อมูลปีนั้น)
  //   ปีล่าสุด = ยอดจริงบางเดือน + ประมาณการ (history.years[ปี].actualMonths)
  function salesHistory(data, id, years) {
    var isChannel = !!findById(data.channels, id);
    return (years || []).map(function (y) { return isChannel ? channelHistory(data, y, id) : unitHistory(data.history, y, id); });
  }

  // Sub-channel Allocation แก้ไขได้เมื่อ Management กำหนดเป้าหมายของ Channel แล้ว → null (แก้ได้) | 'noTarget' (เป้าหมาย 0) | 'noChannel'
  function unitAllocationBlock(tree, channelId) {
    var ch = findById(tree.children, channelId);
    if (!ch) return 'noChannel';
    return ch.amount > 0 ? null : 'noTarget';
  }

  // รายการ Audit เมื่อเป้าหมายของ Channel เปลี่ยนเกิน 1 บาท (บันทึกหน้า Annual Target) before / after = calc.topDown(...) ของปีเดียวกัน
  //   meta = { by, at, year } → [{ entity: 'channelTarget', key: channelId, field: 'amount', oldValue, newValue, year, by, at }]
  function channelTargetAudit(before, after, meta) {
    meta = meta || {};
    return after.children.map(function (ch) {
      var old = findById(before.children, ch.id);
      var from = old ? old.amount : 0;
      if (Math.abs(ch.amount - from) <= 1) return null;
      return { entity: 'channelTarget', key: ch.id, field: 'amount', oldValue: Math.round(from), newValue: Math.round(ch.amount), year: meta.year || after.year, by: meta.by || '', at: meta.at || '' };
    }).filter(Boolean);
  }

  // การเปลี่ยนเป้าหมายของ Channel ล่าสุดของปีแผน year ที่เกิดหลัง dismissedAt (ผู้ใช้กดปิดบรรทัดแจ้ง) → รายการ Audit | null
  function channelTargetChange(audit, channelId, year, dismissedAt) {
    var list = (audit || []).filter(function (e) {
      return e.entity === 'channelTarget' && e.key === channelId && Number(e.year) === Number(year) && (!dismissedAt || (e.at || '') > dismissedAt);
    });
    return list.length ? list[list.length - 1] : null;
  }

  // =====================================================================
  // 20) CR-11: ข้อมูลสินค้าจริง, ค่าตั้งต้นของแผน SKU และเครื่องมือช่วยกรอก
  //     เครื่องมือช่วยกรอกคืน writes = [{ key, m, qty }] แล้วใส่ลงแผนด้วย applyWrites (ข้ามช่องที่แก้ไม่ได้เสมอ)
  // =====================================================================

  // 'JUICY POP TINT' → 'Juicy Pop Tint' (ตัวแรกของแต่ละคำเป็นตัวใหญ่)
  function titleCase(text) {
    return String(text || '').toLowerCase().replace(/(^|[\s\-\/(&+])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  // ชื่อที่แสดงในหน้าวางแผน SKU (แปลงเฉพาะการแสดงผล ข้อมูลเดิมไม่เปลี่ยน)
  //   shortName ถ้ามี / ไม่มี = name ที่ตัดคำ Charmiss ด้านหน้าออก · ตัวพิมพ์ใหญ่ทั้งหมด → Title Case · ช่องว่างซ้อน → ช่องเดียว
  //   { name: 'CHARMISS JUICY POP TINT' } → 'Juicy Pop Tint'
  function displayName(product) {
    if (!product) return '';
    var s = String(product.shortName || '').trim() || String(product.name || '').replace(/^\s*charmiss\s+/i, '');
    s = s.replace(/\s+/g, ' ').trim();
    return /[A-Z]/.test(s) && !/[a-z]/.test(s) ? titleCase(s) : s;
  }

  // หมวดสินค้าจากคำในชื่อ: กฎแรกที่คำตรงทั้งคำ (ไม่สนตัวพิมพ์) → { categoryId, subCategoryId, typeId } | null
  //   rules = [{ word, typeId }] (data/products.js productImport.categoryRules) / Category และ Sub Category = รายการแม่ของ Type
  function inferCategory(name, rules, tax) {
    var text = ' ' + String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
    var hit = (rules || []).filter(function (r) { return text.indexOf(' ' + String(r.word).toLowerCase() + ' ') >= 0; })[0];
    if (!hit) return null;
    var type = taxonomyNode(tax, 'category', hit.typeId);
    var sub = type && taxonomyNode(tax, 'category', type.parentId);
    var cat = sub && taxonomyNode(tax, 'category', sub.parentId);
    return type && sub && cat ? { categoryId: cat.id, subCategoryId: sub.id, typeId: type.id } : null;
  }

  // ยอดขายราย SKU ของปี year ในหน่วยขาย (จำนวนชิ้น 12 เดือน) → [12] | null (ไม่มีข้อมูล = ไม่เคยขายในหน่วยนั้น)
  function skuHistory(history, year, unitId, key) {
    var y = history && history.years && history.years[year];
    var u = y && y.skuQty && y.skuQty[unitId];
    return (u && u[key]) || null;
  }

  // CR-24: ยอดอ้างอิงราย SKU (ชิ้น) ในหน่วยขาย → { monthly: [12], sourceYears: [12], estimated: [12 bool] } | null (ไม่มีข้อมูลทั้ง 2 ปี)
  //   เดือน ≤ เดือนปิดล่าสุด = ยอดจริงปีล่าสุด · หลังจากนั้น = ยอดจริงปีก่อนหน้า / ไม่มียอดจริงรายเดือนของปีนั้น (ข้อมูล SKU ใน seed มีแค่ปี 2026)
  //   → ใช้ค่าปีล่าสุดของเดือนนั้น (ประมาณการ) และ estimated = true (ไม่ใช้เป็นฐานของเป้าหมายรายเดือน)
  function skuReference(history, unitId, key) {
    var K = refClock(history);
    var lc = K.parse(K.lastClosedMonth());
    var latest = skuHistory(history, lc.year, unitId, key);
    var older = skuHistory(history, lc.year - 1, unitId, key);
    if (!latest && !older) return null;
    var out = { monthly: [], sourceYears: [], estimated: [] };
    for (var m = 0; m < 12; m++) {
      var y = K.referenceYear(m);
      var src = y === lc.year ? latest : older;
      if (src) { out.monthly.push(src[m] || 0); out.sourceYears.push(y); out.estimated.push(false); }
      // CR-41: เดือนของปีล่าสุดที่ยังไม่เกิด (ค่าว่าง null · ปีแผนของสถานการณ์ S2) ไม่ใช้เป็นประมาณการ
      else if (latest && y !== lc.year && latest[m] != null) { out.monthly.push(latest[m] || 0); out.sourceYears.push(lc.year); out.estimated.push(true); }
      else { out.monthly.push(0); out.sourceYears.push(y); out.estimated.push(false); }
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // CR-26: อายุการขายของ SKU × หน่วยขาย — ยอดจริงรายเดือน = history.years.<ปี>.skuQty (ถึง actualMonths)
  //   ปีก่อนปีที่มียอดราย SKU (seed มีแค่ปี 2026) = ประวัติย้อนหลังที่สร้าง: รูปแบบปีล่าสุดตั้งแต่ history.skuStart[key] (core/seed.js)
  //   ใช้กับอายุการขายเท่านั้น — ยอดอ้างอิงและจุดประมาณการของ CR-24 (skuReference) ไม่ใช้ค่านี้
  // ---------------------------------------------------------------------
  function skuPatternYear(history) {
    var ys = Object.keys((history && history.years) || {}).filter(function (y) { return history.years[y].skuQty; }).map(Number);
    return ys.length ? Math.max.apply(null, ys) : null;
  }
  // ยอดย้อนหลังที่สร้างของปี year (ก่อนปีที่มียอดราย SKU) → [12] | null (ไม่มีรูปแบบ)
  function skuBackfill(history, unitId, key, year) {
    var py = skuPatternYear(history);
    if (py == null || year >= py) return null;
    var pattern = skuHistory(history, py, unitId, key);
    var start = history.skuStart && history.skuStart[key];
    if (!pattern || !start) return null;
    var out = [];
    for (var m = 0; m < 12; m++) out.push(clock().key(year, m + 1) >= start ? (pattern[m] || 0) : 0);
    return out;
  }
  // ยอดจริงของเดือน 'YYYY-MM' → ชิ้น | null (ไม่มีข้อมูล · เดือนประมาณการ)
  function skuActualAt(history, unitId, key, ym) {
    var p = clock().parse(ym);
    var y = history && history.years && history.years[p.year];
    var real = skuHistory(history, p.year, unitId, key);
    if (real) { var n = y.actualMonths == null ? 12 : y.actualMonths; return p.month <= n ? (real[p.month - 1] || 0) : null; }
    var bf = skuBackfill(history, unitId, key, p.year);
    return bf ? bf[p.month - 1] : null;
  }
  function monthsDiff(a, b) { var x = clock().parse(a), y = clock().parse(b); return (y.year - x.year) * 12 + (y.month - x.month); }
  // เดือนแรก / ล่าสุดที่มียอดจริง > 0 ถึง lastClosed (ไม่มีประวัติ = null)
  function saleSpan(history, unitId, key, lc) {
    var py = skuPatternYear(history);
    if (py == null) return null;
    var start = (history.skuStart && history.skuStart[key]) || clock().key(py, 1);
    if (!skuHistory(history, py, unitId, key)) return null;
    var first = null, last = null;
    for (var k = start; k <= lc; k = clock().addMonths(k, 1)) {
      var v = skuActualAt(history, unitId, key, k);
      if (v > 0) { if (!first) first = k; last = k; }
    }
    return { first: first, last: last };
  }
  // เดือนเริ่มขายตามแผน / Listing (ไม่มีประวัติ): Listing โดย Sales (fromMonth) → เดือนเริ่มขายของแถวในแผน → วันเริ่มขายใน Product Master
  //   ไม่ได้อยู่ในแผนและไม่ได้ Listing ในหน่วยขายนี้ = null (ไม่ได้ขายที่นี่)
  function plannedStartOf(master, unitId, key, opts) {
    var l = ((master && master.listings) || []).filter(function (x) { return x.productKey === key && x.accountId === unitId && x.fromMonth && x.addedBy === 'SALES'; })[0];
    if (l) return l.fromMonth;
    if (opts && opts.startMonth != null && opts.year) return clock().key(opts.year, opts.startMonth + 1);
    if (!isListed(master && master.listings, key, unitId)) return null;
    var p = master ? findProduct(master.products, key) : null;
    return p && p.launchDate ? String(p.launchDate).slice(0, 7) : null;
  }
  // salesAge(data, productKey, unitId, opts) → { started, firstSaleMonth, lastSaleMonth, sellingMonths, monthsSinceLastSale,
  //   firstSaleMonthInChannel, plannedStart, source ('history' | 'listing'), long, noSale, recent }
  //   opts = { master (Listing · Product Master), startMonth (0–11 ของแถวในแผน), year (ปีแผน), channel: false (ไม่คำนวณระดับ Channel) }
  //   ไม่มีประวัติ = เดือนเริ่มขายใน Listing · เดือนนั้นยังไม่ถึง (หลังเดือนปิดล่าสุด) = ยังไม่เริ่มขาย
  //   firstSaleMonthInChannel = เดือนแรกที่มียอดจริงในหน่วยขายใดก็ได้ของ Channel (รวมเดือนเริ่มขายของหน่วยนี้ จึงไม่เกิน firstSaleMonth)
  //   CR-27 current = ยังขายอยู่ (ขายล่าสุด = เดือนปิดล่าสุด → ช่วงเวลาขาย "{เริ่ม} – ปัจจุบัน")
  function salesAge(data, key, unitId, opts) {
    opts = opts || {};
    var S = data.settings || settings();
    var lc = refClock(data.history).lastClosedMonth();
    var master = opts.master || data;
    var span = saleSpan(data.history, unitId, key, lc);
    var out = { started: true, firstSaleMonth: null, lastSaleMonth: null, sellingMonths: 0, monthsSinceLastSale: null,
      firstSaleMonthInChannel: null, plannedStart: null, source: 'history', long: false, noSale: false, recent: false };
    if (span && span.first) {
      out.firstSaleMonth = span.first;
      out.lastSaleMonth = span.last;
      out.sellingMonths = monthsDiff(span.first, span.last) + 1;
      out.monthsSinceLastSale = monthsDiff(span.last, lc);
    } else {
      var ps = plannedStartOf(master, unitId, key, opts);
      out.source = 'listing';
      out.plannedStart = ps;
      if (!ps || ps > lc) { out.started = false; }
      else { out.firstSaleMonth = ps; out.monthsSinceLastSale = monthsDiff(ps, lc); }
    }
    if (out.started && opts.channel !== false) {
      var info = unitInfo(data, unitId);
      var firsts = info && info.channel ? unitsOfChannel(data, info.channel.id).map(function (u) {
        if (u.id === unitId) return out.firstSaleMonth;
        var s = saleSpan(data.history, u.id, key, lc);
        return s && s.first ? s.first : null;
      }) : [out.firstSaleMonth];
      firsts = firsts.filter(Boolean).sort();
      out.firstSaleMonthInChannel = firsts[0] || out.firstSaleMonth;
    }
    out.long = out.sellingMonths > S.AGING_LONG_MONTHS;   // CR-27: มากกว่า 2 ปี
    out.noSale = out.started && out.monthsSinceLastSale != null && out.monthsSinceLastSale >= S.NO_SALE_WARN_MONTHS;
    out.recent = out.started && out.firstSaleMonth != null && monthsDiff(out.firstSaleMonth, lc) < S.AGING_RECENT_MONTHS;
    out.current = out.started && out.lastSaleMonth === lc;
    return out;
  }
  // CR-33: กลุ่มอายุของ SKU ในหน่วยขาย — แหล่งเดียวของตัวกรองอายุและคอลัมน์อายุ (SKU Planning · Listing)
  //   age = ผลของ salesAge (ไม่มี = ยังไม่มีข้อมูล) · asOfMonth (ไม่บังคับ) = เดือนที่ดู: เริ่มขายหลังเดือนนี้ = ยังไม่เริ่มขาย
  //   → 'le1y' (≤ AGING_YEAR_MONTHS 12 เดือน) · 'y1to2' (13–24) · 'gt2y' (> AGING_LONG_MONTHS 24) · 'notStarted' (NPD / Planned / ยังไม่เริ่มขายในหน่วยนี้)
  var AGE_GROUPS = ['le1y', 'y1to2', 'gt2y', 'notStarted'];
  function skuAgeGroup(age, asOfMonth) {
    if (!age || !age.started) return 'notStarted';
    if (asOfMonth && age.firstSaleMonth && age.firstSaleMonth > asOfMonth) return 'notStarted';
    var S = settings();
    var n = age.sellingMonths || 0;
    return n <= S.AGING_YEAR_MONTHS ? 'le1y' : n <= S.AGING_LONG_MONTHS ? 'y1to2' : 'gt2y';
  }
  // CR-27: ช่วงอายุการขาย → 'le1y' · 'y1to2' · 'gt2y' · null = ยังไม่เริ่มขาย (CR-33 ใช้ skuAgeGroup · ผลเท่าเดิม)
  function ageBand(age) {
    var g = skuAgeGroup(age);
    return g === 'notStarted' ? null : g;
  }
  // ตัวกรองอายุ (หน้า SKU Planning) — CR-27: '' ทั้งหมด (รวมยังไม่เริ่มขาย) · 'le1y' · 'y1to2' · 'gt2y' + noSaleOnly = เฉพาะที่ไม่มียอด ≥ NO_SALE_WARN_MONTHS
  //   CR-33: กลุ่มจาก skuAgeGroup + 'notStarted' (ยังไม่เริ่มขาย) · (ค่าเดิมของ CR-26 'noSale' · 'long' · 'recent' ยังใช้ได้)
  function ageMatch(age, filter, noSaleOnly) {
    if (noSaleOnly && !(age && age.noSale)) return false;
    if (!filter) return true;
    if (AGE_GROUPS.indexOf(filter) >= 0) return skuAgeGroup(age) === filter;
    if (!age) return false;
    return filter === 'noSale' ? age.noSale : filter === 'long' ? age.long : filter === 'recent' ? age.recent : true;
  }

  // Run-rate = ยอดเฉลี่ย (ชิ้น/เดือน) ของ n เดือนจริงล่าสุด (actualMonths = จำนวนเดือนที่เป็นยอดจริงของปีนั้น) → ค่า > 0 | null
  function runRateFrom(monthly, actualMonths, n) {
    if (!monthly) return null;
    var end = Math.max(0, Math.min(12, actualMonths == null ? 12 : actualMonths));
    var from = Math.max(0, end - (n || 3));
    if (end <= from) return null;
    var v = sum(monthly.slice(from, end)) / (end - from);
    return v > 0 ? v : null;
  }

  // การเติบโตของหน่วยขาย g = เป้าหมายทั้งปี ÷ ยอดขายปีก่อนทั้งปี (22,140,000 ÷ 19,800,000 = 1.1182) / ไม่มียอดปีก่อน → null
  function growthFactor(unitTarget, unitHistoryValue) {
    var ly = Array.isArray(unitHistoryValue) ? sum(unitHistoryValue) : unitHistoryValue;
    return ly > 0 && unitTarget != null ? unitTarget / ly : null;
  }

  // ค่าตั้งต้นของช่อง "ระบบเติม" 12 เดือน → [12] จำนวนเต็ม | null (ไม่มีข้อมูล → ช่องเป็น "กรอกเอง")
  //   'priorYear' (ค่าเริ่มต้น CR-20): ค่าเดือน m = ยอดขายเดือน m ปีก่อนของ SKU ในหน่วยขายนั้นตรงๆ (15,970 → 15,970) / ไม่มียอดปีก่อน → null
  //   'lastYear' (CR-11 ไม่ใช้ในหน้าจอแล้ว): ค่าเดือน m = ยอดเดือน m ปีก่อนของ SKU × g (ปัดเป็นจำนวนเต็ม) — คงรูปแบบรายเดือนและสัดส่วน SKU ของปีก่อน
  //              เป้าหมาย 22,140,000 · ยอดปีก่อน 19,800,000 · SKU ม.ค. ปีก่อน 14,925 → 16,689 / SKU ไม่มียอดปีก่อน → null
  //   'runRate' (CR-11 ไม่ใช้ในหน้าจอแล้ว): ค่าเดือน m = Run-rate × Seasonality Index ของเดือน m (ปัด) / ไม่มี Run-rate → null
  //   skuHistoryValue = { monthly: [12] ชิ้นปีก่อน, runRate } หรือ [12] / unitHistoryValue = ยอดขายปีก่อนของหน่วย (บาท) ตัวเลขหรือ [12]
  function defaultPlanQty(method, skuHistoryValue, unitTarget, unitHistoryValue, seasonality) {
    var hv = Array.isArray(skuHistoryValue) ? { monthly: skuHistoryValue } : (skuHistoryValue || {});
    if (method === 'priorYear') {
      if (!hv.monthly || !(sum(hv.monthly) > 0)) return null;
      return hv.monthly.map(function (q) { return Math.round(q || 0); });
    }
    if (method === 'runRate') {
      if (!(hv.runRate > 0)) return null;
      return (seasonality || fill(12, 1)).map(function (x) { return Math.round(hv.runRate * x); });
    }
    var g = growthFactor(unitTarget, unitHistoryValue);
    if (g == null || !hv.monthly || !(sum(hv.monthly) > 0)) return null;
    return hv.monthly.map(function (q) { return Math.round((q || 0) * g); });
  }

  // Status ที่แสดงเป็น Chip เดียว (Status ที่สำคัญที่สุดในปีแผน): Clearance > New > Discontinued (ระหว่างปี)
  //   → 'clearance' | 'new' | 'discontinued' | 'planned' (ยังไม่วางขายทั้งปี) | null (Active ทั้งปี ไม่ต้องมีป้าย)
  //   รายละเอียดช่วงเดือนใช้ statusSegments (Tooltip)
  function primaryStatus(product, year, npdMonths) {
    var list = statusSegments(product, year, npdMonths).map(function (s) { return s.status; });
    if (list.indexOf('clearance') >= 0) return 'clearance';
    if (list.indexOf('new') >= 0) return 'new';
    if (list.indexOf('discontinued') >= 0 && list.indexOf('active') >= 0) return 'discontinued';
    return list[0] === 'active' ? null : list[0];
  }

  // ตรวจความผิดปกติ: ค่าต่างจากเดือนเดียวกันปีก่อนเกิน ± threshold (settings.ANOMALY_PCT) → 'up' | 'down' | null
  //   ไม่มียอดปีก่อนของ SKU (prior = null) → null / ปีก่อน 0 แต่มีค่า → 'up'
  function anomalyMark(value, prior, threshold) {
    if (prior == null) return null;
    var t = threshold == null ? settings().ANOMALY_PCT : threshold;
    if (!(prior > 0)) return value > 0 ? 'up' : null;
    var r = (value || 0) / prior - 1;
    if (r > t + 1e-9) return 'up';
    if (r < -t - 1e-9) return 'down';
    return null;
  }

  // กระจายยอดเป็นจำนวนเต็มตามน้ำหนัก (Largest remainder) ผลรวม = total เสมอ / น้ำหนักรวม 0 → แบ่งเท่ากัน
  //   (400, [1, 1, 2]) → [100, 100, 200] / (100, [1, 1, 1]) → [34, 33, 33]
  function distributeAnnual(total, weights) {
    var n = (weights || []).length;
    if (!n) return [];
    var T = Math.max(0, Math.round(total || 0));
    var w = weights.map(function (x) { return x > 0 ? x : 0; });
    var W = sum(w);
    if (!(W > 0)) { w = fill(n, 1); W = n; }
    var raw = w.map(function (x) { return T * x / W; });
    var base = raw.map(Math.floor);
    var rest = T - sum(base);
    raw.map(function (v, i) { return { i: i, r: v - base[i] }; })
      .sort(function (a, b) { return b.r - a.r || a.i - b.i; })
      .slice(0, rest).forEach(function (x) { base[x.i] += 1; });
    return base;
  }

  // ค่าจากช่องกรอกหรือ Excel → จำนวนเต็ม ≥ 0 | null (ไม่รับ: ว่าง ไม่ใช่ตัวเลข ติดลบ) '1,234' → 1234 / '12.6' → 13
  function cleanQty(value) {
    if (value == null) return null;
    var s = String(value).replace(/[,\s]/g, '').replace(/−/g, '-');
    if (s === '') return null;
    var v = Number(s);
    if (!isFinite(v) || v < 0) return null;
    return Math.round(v);
  }

  // ช่องที่เครื่องมือช่วยกรอกแก้ได้ของแถว = state.editable (ข้ามล็อก 0, Actual และ M+1 ถึง M+3)
  function editableCells(row) { return row.cells.filter(function (c) { return c.state.editable; }); }

  // ปรับ ±%: ค่าใหม่ = ปัด(ค่าปัจจุบัน × (1 + pct)) (ติดลบ = 0) เฉพาะช่องที่แก้ได้ → writes
  function scaleRows(rows, pct) {
    var out = [];
    (rows || []).forEach(function (r) {
      editableCells(r).forEach(function (c) { out.push({ key: r.key, m: c.m, qty: Math.max(0, Math.round(c.units * (1 + (pct || 0)))) }); });
    });
    return out;
  }

  // ตั้งเท่ายอดปีก่อน: ช่องที่แก้ได้ = ยอดเดือนเดียวกันปีก่อนของ SKU (แถวที่ไม่มียอดปีก่อนข้าม) → writes
  function lastYearWrites(rows) {
    var out = [];
    (rows || []).forEach(function (r) {
      editableCells(r).forEach(function (c) { if (c.ly != null) out.push({ key: r.key, m: c.m, qty: Math.max(0, Math.round(c.ly)) }); });
    });
    return out;
  }

  // ล้างค่า: ช่องที่แก้ได้ = 0 → writes
  function clearWrites(rows) {
    var out = [];
    (rows || []).forEach(function (r) { editableCells(r).forEach(function (c) { out.push({ key: r.key, m: c.m, qty: 0 }); }); });
    return out;
  }

  // กรอกยอดทั้งปีของแถว: เดือนที่แก้ได้ได้ (ยอดที่กรอก − ยอดของเดือนที่ล็อก) กระจายตามรูปแบบเดิมของแถว
  //   แถวว่าง → รูปแบบยอดปีก่อนของ SKU → ไม่มี → Seasonality ของหน่วยขาย (si) / เดือนที่ล็อกไม่ถูกแตะ / ผลรวมตรงกับที่กรอก → writes
  function annualWrites(row, total, seasonality) {
    var open = editableCells(row);
    if (!open.length) return [];
    var fixed = sum(row.cells.filter(function (c) { return !c.state.editable; }).map(function (c) { return c.units; }));
    var weights = open.map(function (c) { return c.units; });
    if (!(sum(weights) > 0)) weights = open.map(function (c) { return c.ly || 0; });
    if (!(sum(weights) > 0) && seasonality) weights = open.map(function (c) { return seasonality[c.m] || 0; });
    var parts = distributeAnnual(Math.max(0, (cleanQty(total) || 0) - fixed), weights);
    return open.map(function (c, i) { return { key: row.key, m: c.m, qty: parts[i] }; });
  }

  // ใส่ writes ลงแผน (คืนแผนใหม่): qty ของเดือนนั้นเป็นจำนวนเต็ม ≥ 0 / ช่องระบบเติมหรือ Clearance → Override (= กรอกเอง)
  //   ช่องที่แก้ไม่ได้ (ล็อก 0, Actual, M+1..M+3) และแถวที่ไม่อยู่ใน grid ข้าม
  function applyWrites(plan, grid, writes) {
    var out = copy(plan);
    var byKey = {};
    grid.rows.forEach(function (r) { byKey[r.key] = r; });
    (writes || []).forEach(function (w) {
      var r = byKey[w.key], item = out.items && out.items[w.key];
      var c = r && r.cells[w.m];
      var v = cleanQty(w.qty);
      if (!c || !item || !c.state.editable || v == null) return;
      item.qty[w.m] = v;
      if (c.source === 'system' || c.source === 'clearance') item.overrides[w.m] = true;
    });
    return out;
  }

  // คืนค่าตั้งต้นของแถว (เฉพาะช่องที่แก้ได้): ล้าง Override และ qty = ค่าในแผนตั้งต้น (defaults.items) หรือ 0 → แผนใหม่
  function resetRows(plan, grid, keys, defaults) {
    var out = copy(plan);
    grid.rows.forEach(function (r) {
      if ((keys || []).indexOf(r.key) < 0 || !out.items[r.key]) return;
      var d = defaults && defaults.items && defaults.items[r.key];
      editableCells(r).forEach(function (c) {
        out.items[r.key].qty[c.m] = d ? Number(d.qty[c.m] || 0) : 0;
        out.items[r.key].overrides[c.m] = d ? !!(d.overrides && d.overrides[c.m]) : false;
      });
    });
    return out;
  }

  // ปิดส่วนต่าง: แบ่งส่วนต่าง (บาท) ให้แถวตามสัดส่วน Net Sales แล้วแปลงเป็นจำนวนชิ้นด้วย Net Sales ต่อชิ้นของแถว (ราคาและ GP ของแถว)
  //   rows = [{ key, net, unitNet, units }] → { rows: [{ key, addNet, addUnits }], residual (บาทที่ยังเหลือหลังปัด) }
  //   คงเหลือ 1,000 · A 3,000 · B 7,000 → A +300 · B +700 / ปัดแบบ Largest remainder |residual| ≤ Net Sales ต่อชิ้น
  //   ส่วนต่างติดลบ (เกินเป้า) ลดได้ไม่เกินจำนวนเดิม / Net Sales ของทุกแถวเป็น 0 → แบ่งเท่ากัน
  function closeGap(gap, rows) {
    var list = (rows || []).filter(function (r) { return r.unitNet > 0; });
    var G = Math.abs(gap || 0), sign = gap < 0 ? -1 : 1;
    if (!list.length || !G) return { rows: list.map(function (r) { return { key: r.key, addNet: 0, addUnits: 0 }; }), residual: gap || 0 };
    var W = sum(list.map(function (r) { return Math.max(0, r.net || 0); }));
    var out = list.map(function (r) {
      var share = W > 0 ? Math.max(0, r.net || 0) / W : 1 / list.length;
      var addNet = G * share;
      var exact = addNet / r.unitNet;
      var cap = sign < 0 ? Math.max(0, r.units || 0) : Infinity;
      var base = Math.min(Math.floor(exact + 1e-9), cap);
      return { key: r.key, addNet: addNet, frac: exact - base, cap: cap, base: base, unitNet: r.unitNet };
    });
    var residual = G - sum(out.map(function (o) { return o.base * o.unitNet; }));
    var order = out.slice().sort(function (a, b) { return b.frac - a.frac; });
    var changed = true;
    while (changed) {
      changed = false;
      order.forEach(function (o) {
        if (o.base < o.cap && residual >= o.unitNet / 2) { o.base += 1; residual -= o.unitNet; changed = true; }
      });
    }
    return { rows: out.map(function (o) { return { key: o.key, addNet: sign * o.addNet, addUnits: sign * o.base }; }), residual: sign * residual };
  }

  // ปิดส่วนต่างรายเดือนของหน่วยขาย: แต่ละเดือนที่เลือก ส่วนต่าง = เป้าหมาย Net Sales เดือนนั้น − แผนเดือนนั้น
  //   แบ่งให้ SKU ที่เลือก (ช่องที่แก้ได้ของเดือนนั้น) ด้วย closeGap
  //   → { writes, rows: [{ key, before, after }] (ชิ้นรวมของเดือนที่เลือก), before (คงเหลือรวมก่อน บาท), after (หลัง) }
  function closeGapWrites(grid, targets, months, keys) {
    var writes = [], per = {}, before = 0, after = 0;
    (months || []).forEach(function (m) {
      var gap = (targets[m] || 0) - grid.totals.net[m];
      before += gap;
      var rows = grid.rows.filter(function (r) { return keys.indexOf(r.key) >= 0 && r.cells[m].state.editable; }).map(function (r) {
        var c = r.cells[m];
        return { key: r.key, net: c.net || 0, units: c.units, unitNet: chain({ units: 1, price: c.price, gp: c.gp, hasGP: grid.hasGP, includesVat: grid.includesVat }).netSales };
      }).filter(function (x) { return x.unitNet != null; });   // CR-18: ยังไม่มี GP = คำนวณไม่ได้
      var res = closeGap(gap, rows);
      after += res.residual;
      res.rows.forEach(function (x) {
        var r = rows.filter(function (y) { return y.key === x.key; })[0];
        var p = per[x.key] = per[x.key] || { key: x.key, before: 0, after: 0 };
        p.before += r.units;
        p.after += r.units + x.addUnits;
        if (x.addUnits) writes.push({ key: x.key, m: m, qty: r.units + x.addUnits });
      });
    });
    return { writes: writes, rows: Object.keys(per).map(function (k) { return per[k]; }), before: before, after: after };
  }

  // CR-20 ปรับให้ครบตามเป้าหมาย = closeGapWrites ของทุกเดือนที่เลือก แล้วถ้าทั้งปียังขาดเกิน tolerance (จำนวนชิ้นเป็นจำนวนเต็ม)
  //   เติมทีละ 1 ชิ้นที่ SKU ที่ Net Sales ต่อชิ้นต่ำสุด ในเดือนที่ยังขาดมากที่สุด จนทั้งปีไม่ขาด (เกินได้ไม่เกิน 1 ชิ้น · คงเหลือรายเดือนไม่เกิน ±1 ชิ้น × ราคาต่อชิ้นสูงสุด)
  //   → รูปแบบเดียวกับ closeGapWrites { writes, rows, before, after }
  function fillToTargetWrites(grid, targets, months, keys, tolerance) {
    if (tolerance == null) tolerance = settings().ALERT_TOLERANCE_BAHT;
    months = months || [];
    var res = closeGapWrites(grid, targets, months, keys);
    var rowOf = {};
    grid.rows.forEach(function (r) { rowOf[r.key] = r; });
    function unitNet(c) { return chain({ units: 1, price: c.price, gp: c.gp, hasGP: grid.hasGP, includesVat: grid.includesVat }).netSales; }
    var qty = {}, resid = {};
    months.forEach(function (m) { resid[m] = (targets[m] || 0) - grid.totals.net[m]; });
    res.writes.forEach(function (w) {
      var c = rowOf[w.key].cells[w.m];
      qty[w.key + "|" + w.m] = w.qty;
      resid[w.m] -= (w.qty - c.units) * (unitNet(c) || 0);
    });
    var total = sum(months.map(function (m) { return resid[m]; }));
    var guard = 0;
    while (total > tolerance && guard++ < 500) {
      var m = months.slice().sort(function (x, y) { return resid[y] - resid[x]; })[0];
      var best = null;
      grid.rows.forEach(function (r) {
        var c = r.cells[m];
        if (keys.indexOf(r.key) < 0 || !c.state.editable) return;
        var u = unitNet(c);
        if (u > 0 && (!best || u < best.unit)) best = { key: r.key, unit: u, base: c.units };
      });
      if (!best) break;
      var k = best.key + "|" + m;
      qty[k] = (qty[k] == null ? best.base : qty[k]) + 1;
      resid[m] -= best.unit;
      total -= best.unit;
    }
    var writes = [], per = {};
    Object.keys(qty).forEach(function (k) {
      var p = k.split("|"), key = p[0], mm = Number(p[1]);
      var c = rowOf[key].cells[mm];
      writes.push({ key: key, m: mm, qty: qty[k] });
      var x = per[key] = per[key] || { key: key, before: 0, after: 0 };
      x.before += c.units;
      x.after += qty[k];
    });
    return { writes: writes, rows: Object.keys(per).map(function (k) { return per[k]; }), before: res.before, after: total };
  }

  // แยกข้อความที่คัดลอกจาก Excel (แยกคอลัมน์ด้วย Tab แยกแถวด้วยบรรทัดใหม่) → [[ข้อความ]] (ตัดบรรทัดว่างท้ายสุด)
  function parseTsv(text) {
    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.map(function (l) { return l.split('\t'); });
  }

  // ตารางค่าเป็นข้อความสำหรับวางใน Excel: [[ค่า]] → 'a\tb\nc\td'
  function toTsv(matrix) {
    return (matrix || []).map(function (r) { return r.map(function (v) { return v == null ? '' : String(v); }).join('\t'); }).join('\n');
  }

  // วางช่วงที่คัดลอกที่ตำแหน่งเริ่ม (r0, c0): แต่ละค่าไปที่ช่องตำแหน่งเดียวกับใน Excel
  //   cellAt(r, c) → { key, m, editable } | null (นอกตาราง) — ช่องที่แก้ไม่ได้ข้าม (ค่าเดิมไม่เปลี่ยน ตำแหน่งถัดไปไม่เลื่อน)
  //   ค่าที่ไม่รับ (ว่าง, ข้อความ, ติดลบ) ข้าม / ทศนิยมปัดเป็นจำนวนเต็ม
  //   fill = { rows, cols } ช่วงที่เลือกไว้ + คัดลอกมาค่าเดียว → ใส่ค่าเดียวกันทุกช่องในช่วง → writes
  function pasteCells(matrix, r0, c0, cellAt, fillRange) {
    var out = [];
    var one = matrix.length === 1 && matrix[0].length === 1;
    var nr = one && fillRange ? fillRange.rows : matrix.length;
    for (var i = 0; i < nr; i++) {
      var line = one ? matrix[0] : matrix[i];
      var nc = one && fillRange ? fillRange.cols : line.length;
      for (var j = 0; j < nc; j++) {
        var cell = cellAt(r0 + i, c0 + j);
        var v = cleanQty(one ? line[0] : line[j]);
        if (!cell || !cell.editable || v == null) continue;
        out.push({ key: cell.key, m: cell.m, qty: v });
      }
    }
    return out;
  }

  // เติมลงล่าง ('down' = Ctrl+D) หรือไปขวา ('right' = Ctrl+R) ในช่วง { r0, c0, r1, c1 }: แถว/คอลัมน์แรกของช่วงคัดลอกไปช่องที่เหลือ
  //   valueAt(r, c) → ค่าของช่อง / cellAt เหมือน pasteCells (ช่องที่แก้ไม่ได้ข้าม) → writes
  function fillCells(range, direction, valueAt, cellAt) {
    var out = [];
    for (var r = range.r0; r <= range.r1; r++) {
      for (var c = range.c0; c <= range.c1; c++) {
        if (direction === 'down' ? r === range.r0 : c === range.c0) continue;
        var cell = cellAt(r, c);
        var v = cleanQty(direction === 'down' ? valueAt(range.r0, c) : valueAt(r, range.c0));
        if (!cell || !cell.editable || v == null) continue;
        out.push({ key: cell.key, m: cell.m, qty: v });
      }
    }
    return out;
  }

  // SKU ที่มียอดขายปีก่อนในหน่วยขายแต่ไม่อยู่ในแผน (ที่มาของส่วนต่าง)
  //   → { discontinued, incomplete, other } แต่ละชุด = { keys, net (Net Sales ปีก่อน ราคาปีก่อน) }
  //   discontinued = ไม่ได้ขายในปีแผน (เลิกขายก่อนปีแผน) / incomplete = ขาดข้อมูลจำเป็น / other = ขายได้แต่ไม่อยู่ในแผน
  //   CR-24: ยอดขายปีก่อน = ยอดอ้างอิงราย SKU 12 เดือน (skuReference · ราคาของปีที่ใช้)
  function priorOutsidePlan(data, master, unitId, plan, year) {
    var K = refClock(data.history);
    var lc = K.parse(K.lastClosedMonth());
    var q = {};
    [lc.year, lc.year - 1].forEach(function (yy) {
      var yq = data.history && data.history.years[yy] && data.history.years[yy].skuQty && data.history.years[yy].skuQty[unitId];
      Object.keys(yq || {}).forEach(function (k) { q[k] = true; });
    });
    var items = (plan && plan.items) || {};
    var pricing = pricingOf(data, null), ctx = unitPricing(data, pricing, unitId);
    var out = { discontinued: { keys: [], net: 0 }, incomplete: { keys: [], net: 0 }, other: { keys: [], net: 0 } };
    Object.keys(q).forEach(function (key) {
      if (items[key]) return;
      var p = findProduct(master.products, key);
      var kind = !p || !soldInYear(p, year) ? 'discontinued' : planBlockReason(p, master.basePrices) ? 'incomplete' : 'other';
      var net = 0;
      var ref = skuReference(data.history, unitId, key);
      for (var m = 0; m < 12; m++) {
        if (!ref || !ref.monthly[m]) continue;
        var pm = monthPricing(pricing, key, unitId, ctx, ref.sourceYears[m], m);
        net += chain({ units: ref.monthly[m], price: pm.price, gp: pm.gp, hasGP: ctx.hasGP }).netSales || 0;
      }
      out[kind].keys.push(key);
      out[kind].net += net;
    });
    return out;
  }

  // เรียงแถวของแผน SKU: 'total' ยอดทั้งปีมากไปน้อย (ตาม pick(row)) · 'code' รหัส · 'name' ชื่อที่แสดง · 'growth' การเติบโตมากไปน้อย (ไม่มียอดปีก่อนไว้ท้าย)
  //   values = { <productKey>: { value, growth } } (คำนวณจากแผนที่บันทึกแล้ว ลำดับจึงไม่กระโดดระหว่างแก้ไข)
  function sortPlanRows(rows, by, values) {
    var v = values || {};
    function val(r) { return (v[r.key] && v[r.key].value) || 0; }
    function gr(r) { var x = v[r.key] && v[r.key].growth; return typeof x === 'number' && isFinite(x) ? x : null; }
    return rows.slice().sort(function (a, b) {
      if (by === 'code') return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
      if (by === 'name') { var na = displayName(a.product).toLowerCase(), nb = displayName(b.product).toLowerCase(); return na < nb ? -1 : na > nb ? 1 : 0; }
      if (by === 'growth') { var ga = gr(a), gb = gr(b); if (ga == null && gb == null) return val(b) - val(a); if (ga == null) return 1; if (gb == null) return -1; return gb - ga; }
      // CR-26: อายุการขายมากไปน้อย · ไม่มียอดนานที่สุด · เริ่มขายล่าสุด (ยังไม่เริ่มขาย = บนสุด) — values[key].age = salesAge
      if (by === 'age' || by === 'noSale' || by === 'recent') {
        var aa = v[a.key] && v[a.key].age, ab = v[b.key] && v[b.key].age;
        var ka = ageKey(aa, by), kb = ageKey(ab, by);
        if (ka === kb) return val(b) - val(a) || (a.key < b.key ? -1 : 1);
        if (ka == null) return 1;
        if (kb == null) return -1;
        return by === 'recent' ? (ka < kb ? 1 : -1) : kb - ka;
      }
      return val(b) - val(a) || (a.key < b.key ? -1 : 1);
    });
  }

  function ageKey(age, by) {
    if (!age) return null;
    if (by === 'age') return age.started ? age.sellingMonths : null;
    if (by === 'noSale') return age.started ? age.monthsSinceLastSale : null;
    return age.started ? age.firstSaleMonth : age.plannedStart ? '9' + age.plannedStart : null;   // recent: ยังไม่เริ่มขายอยู่บนสุด
  }

  // ---------------------------------------------------------------------
  // CR-26: Pivot แผนราย SKU (รายงานสรุปแผน) — ตัวเลขชุดเดียวกับหน้า SKU Planning (skuPlanGrid)
  // ---------------------------------------------------------------------
  // แถวแผนของหน่วยขาย → [{ key, name, unitId, channelId, seriesId, categoryId, subCategoryId, status, units[12], sale[12], net[12] }]
  function skuPlanItems(grid, unitId, channelId) {
    return (grid && grid.rows || []).map(function (r) {
      var p = r.product || {};
      return {
        key: r.key, name: displayName(p) || r.key, unitId: unitId, channelId: channelId,
        seriesId: p.seriesId || '', categoryId: p.categoryId || '', subCategoryId: p.subCategoryId || '', status: r.status || '', planType: r.planType || 'existing',
        units: r.cells.map(function (c) { return c.units || 0; }),
        sale: r.cells.map(function (c) { return c.sellOut || 0; }),
        net: r.cells.map(function (c) { return c.net || 0; })
      };
    });
  }
  var PIVOT_STATUS = ['active', 'new', 'clearance', 'discontinued', 'planned'];
  // pivotPlan(items, opts) → { cols: [{ id, group }], rows: [node], total: node, levels, max: [ต่อระดับ] }
  //   opts = { rows: 'series' | 'category' | 'status', cols: 'channel' | 'unit' | 'month' | 'quarter', value: 'net' | 'sale' | 'units',
  //            show: 'value' | 'rowPct' | 'colPct', filters: { series: [id], channels: [id], units: [id], statuses: [key], q },
  //            taxonomy (ลำดับและชื่อ), channels: [id] (ลำดับ), units: [{ id, channelId }] (ลำดับ) }
  //   node = { id, kind ('group' | 'sub' | 'sku'), level (0..), label, values: [ค่า], total, show: [ค่าที่แสดง], showTotal, children }
  //   % ของแถว = ช่อง ÷ รวมของแถว · % ของคอลัมน์ = ช่อง ÷ รวมของคอลัมน์ (ทั้งตาราง) · max = ค่าที่แสดงสูงสุดต่อระดับ (สีพื้นไล่ความเข้ม)
  function pivotPlan(items, opts) {
    opts = opts || {};
    var F = opts.filters || {};
    var tax = opts.taxonomy;
    var vk = opts.value === 'sale' ? 'sale' : opts.value === 'units' ? 'units' : 'net';
    var q = String(F.q || '').trim().toLowerCase();
    var list = (items || []).filter(function (it) {
      if (F.series && F.series.length && F.series.indexOf(it.seriesId) < 0) return false;
      if (F.channels && F.channels.length && F.channels.indexOf(it.channelId) < 0) return false;
      if (F.units && F.units.length && F.units.indexOf(it.unitId) < 0) return false;
      if (F.statuses && F.statuses.length && F.statuses.indexOf(it.status) < 0) return false;
      if (q && (it.key + ' ' + it.name).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    // คอลัมน์
    var cols;
    if (opts.cols === 'month') cols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (m) { return { id: m, group: null }; });
    else if (opts.cols === 'quarter') cols = [0, 1, 2, 3].map(function (i) { return { id: i, group: null }; });
    else if (opts.cols === 'unit') {
      var seenU = {};
      list.forEach(function (it) { seenU[it.unitId] = it.channelId; });
      var orderU = (opts.units || []).filter(function (u) { return seenU[u.id] !== undefined; });
      Object.keys(seenU).forEach(function (id) { if (!orderU.some(function (u) { return u.id === id; })) orderU.push({ id: id, channelId: seenU[id] }); });
      cols = orderU.map(function (u) { return { id: u.id, group: u.channelId }; });
    } else {
      var seenC = {};
      list.forEach(function (it) { seenC[it.channelId] = true; });
      var orderC = (opts.channels || []).filter(function (id) { return seenC[id]; });
      Object.keys(seenC).forEach(function (id) { if (orderC.indexOf(id) < 0) orderC.push(id); });
      cols = orderC.map(function (id) { return { id: id, group: null }; });
    }
    function contrib(it) {
      var arr = it[vk];
      if (opts.cols === 'month') return arr.slice();
      if (opts.cols === 'quarter') return [0, 1, 2, 3].map(function (i) { return arr[i * 3] + arr[i * 3 + 1] + arr[i * 3 + 2]; });
      var s = sum(arr);
      return cols.map(function (c) { return (opts.cols === 'unit' ? it.unitId : it.channelId) === c.id ? s : 0; });
    }
    function blank(id, kind, level, label) { return { id: id, kind: kind, level: level, label: label, values: cols.map(function () { return 0; }), total: 0, children: [] }; }
    function add(node, vals) { vals.forEach(function (v, i) { node.values[i] += v; }); node.total += sum(vals); }
    // ระดับแถว
    function groupOf(it) {
      if (opts.rows === 'status') return [{ id: it.status || '', kind: 'group', label: null }];
      if (opts.rows === 'category') return [
        { id: it.categoryId || '', kind: 'group', label: it.categoryId ? taxonomyName(tax, 'category', it.categoryId) : null },
        { id: (it.categoryId || '') + '/' + (it.subCategoryId || ''), kind: 'sub', label: it.subCategoryId ? taxonomyName(tax, 'category', it.subCategoryId) : null }];
      return [{ id: it.seriesId || '', kind: 'group', label: it.seriesId ? taxonomyName(tax, 'series', it.seriesId) : null }];
    }
    var root = blank('*', 'total', -1, null);
    var index = {};
    list.forEach(function (it) {
      var vals = contrib(it);
      add(root, vals);
      var parent = root, path = '';
      groupOf(it).concat([{ id: it.key, kind: 'sku', label: it.name }]).forEach(function (g, lv) {
        path += '|' + g.id;
        var node = index[path];
        if (!node) { node = index[path] = blank(g.id, g.kind, lv, g.label); node.path = path; parent.children.push(node); }
        add(node, vals);
        parent = node;
      });
    });
    // เรียง: Series / Category ตามลำดับใน Master (ไม่ระบุไว้ท้าย) · Status ตามลำดับคงที่ · SKU ตามค่ารวมมากไปน้อย
    function orderIds(kind) {
      if (opts.rows === 'status' && kind === 'group') return PIVOT_STATUS;
      if (!tax) return [];
      if (opts.rows === 'category') return kind === 'group' ? taxonomyChildren(tax, 'category', null).map(function (n) { return n.id; }) : null;
      return taxonomyChildren(tax, 'series', null).map(function (n) { return n.id; });
    }
    function sortNodes(nodes) {
      if (!nodes.length) return;
      var kind = nodes[0].kind;
      var order = kind === 'sku' ? null : orderIds(kind);
      nodes.sort(function (a, b) {
        if (kind === 'sku' || !order) return b.total - a.total || (a.id < b.id ? -1 : 1);
        var ia = a.id === '' || String(a.id).slice(-1) === '/' ? 9999 : order.indexOf(kind === 'sub' ? String(a.id).split('/')[0] : a.id);
        var ib = b.id === '' || String(b.id).slice(-1) === '/' ? 9999 : order.indexOf(kind === 'sub' ? String(b.id).split('/')[0] : b.id);
        if (kind === 'sub') return (a.id.slice(-1) === '/' ? 1 : 0) - (b.id.slice(-1) === '/' ? 1 : 0) || b.total - a.total;
        return (ia < 0 ? 9998 : ia) - (ib < 0 ? 9998 : ib) || b.total - a.total;
      });
      nodes.forEach(function (n) { sortNodes(n.children); });
    }
    sortNodes(root.children);
    // ค่าที่แสดง + ค่าสูงสุดต่อระดับ
    var colTotals = root.values.slice();
    var levels = opts.rows === 'category' ? 3 : 2;
    var max = [];
    for (var i = 0; i < levels; i++) max.push(0);
    function showOf(node) {
      node.show = node.values.map(function (v, i) {
        if (opts.show === 'rowPct') return node.total ? v / node.total : 0;
        if (opts.show === 'colPct') return colTotals[i] ? v / colTotals[i] : 0;
        return v;
      });
      node.showTotal = opts.show === 'rowPct' ? (node.total ? 1 : 0) : opts.show === 'colPct' ? (root.total ? node.total / root.total : 0) : node.total;
      if (node.level >= 0) node.show.forEach(function (v) { if (Math.abs(v) > max[node.level]) max[node.level] = Math.abs(v); });
      node.children.forEach(showOf);
    }
    showOf(root);
    return { cols: cols, rows: root.children, total: root, levels: levels, max: max, value: vk, show: opts.show || 'value', count: list.length };
  }

  // จัดกลุ่มแถว: 'series' (ตามลำดับ Series ใน Master ไม่มี Series ไว้ท้าย) · 'status' (วางขายแล้ว · Clearance · เลิกขายระหว่างปี · สินค้าใหม่)
  //   · 'none' (กลุ่มเดียว) → [{ key, kind, rows }] / tax = taxonomy (ใช้ลำดับ Series)
  function groupPlanRows(rows, by, tax) {
    if (by === 'none') return [{ key: 'all', kind: 'none', rows: rows }];
    // CR-34: 'type' = ประเภทสินค้าในแผน ตามลำดับ PLAN_TYPES · แสดงเฉพาะกลุ่มที่มีรายการ
    if (by === 'type') {
      var byType = {};
      rows.forEach(function (r) { var t = r.planType || 'existing'; (byType[t] = byType[t] || []).push(r); });
      return PLAN_TYPES.filter(function (t) { return byType[t]; }).map(function (t) { return { key: t, kind: 'type', rows: byType[t] }; });
    }
    var order = by === 'series'
      ? taxonomyChildren(tax, 'series', null).map(function (n) { return n.id; }).concat([''])
      : ['active', 'clearance', 'discontinued', 'new'];
    var map = {};
    rows.forEach(function (r) {
      var k = by === 'series' ? (r.product.seriesId || '') : r.primary === 'clearance' || r.primary === 'discontinued' ? r.primary : r.group === 'npd' || r.primary === 'new' ? 'new' : 'active';
      (map[k] = map[k] || []).push(r);
    });
    Object.keys(map).forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
    return order.filter(function (k) { return map[k] || (by === 'status' && k === 'new'); }).map(function (k) { return { key: k, kind: by, rows: map[k] || [] }; });
  }

  // =====================================================================
  // CR-34: ประเภทสินค้าในแผน (ต่อ SKU × หน่วยขาย · ปีแผน) — Status ยังคำนวณจากวันที่เท่านั้น (productStatus)
  //   existing (สินค้าเดิม: เคยมียอดขายจริงในหน่วยขายนี้) · newListing (Listing ใหม่: ขายอยู่แต่ไม่เคยมียอดในหน่วยนี้) ·
  //   npdConfirmed (NPD ยืนยันแล้ว: เปิดตัวหรืออยู่ในช่วง NPD ภายในปีแผน) · npdRequest (ขอ NPD: คำขอจาก Sales ที่ทีม Product ยังไม่ยืนยัน) ·
  //   clearance (ช่วง Clearance ทับปีแผน · ไม่ควรอยู่ในแผน)
  // =====================================================================
  var PLAN_TYPES = ['existing', 'newListing', 'npdConfirmed', 'npdRequest', 'clearance'];
  function npdPlanOf(npdPlans, key) { return (npdPlans || []).filter(function (n) { return n.productKey === key; })[0] || null; }
  // คำขอ NPD จาก Sales ที่ยังไม่ยืนยัน = สินค้า SALES_REQUEST หรือแผน NPD ที่มา SALES · ยืนยันแล้ว = แผน NPD มี confirmedAt (ทีม Product ติ๊กที่หน้าแผน NPD)
  //   CR-35: คำขอ = Status Request (isRequestProduct · ยังไม่มี Product Code 5 หลัก) · ยืนยันที่ Launch & Listing / Product List (catalog.confirmRequest)
  function isNpdRequest(product) { return isRequestProduct(product); }
  // เคยมียอดขายจริงในหน่วยขายนี้ (ทุกปีใน history.years ถึงเดือนที่ปิดแล้วของปีนั้น · ไม่นับเดือนเริ่มขายโดยประมาณ skuStart)
  function soldInUnit(history, unitId, key) {
    var years = (history && history.years) || {};
    return Object.keys(years).some(function (y) {
      var a = skuHistory(history, y, unitId, key);
      if (!a) return false;
      var n = years[y].actualMonths == null ? 12 : years[y].actualMonths;
      for (var m = 0; m < Math.min(12, n); m++) if (a[m] > 0) return true;
      return false;
    });
  }
  function hasStatusInYear(product, year, list) {
    for (var m = 0; m < 12; m++) if (list.indexOf(dateStatusAt(product, year, m)) >= 0) return true;
    return false;
  }
  // ประเภทสินค้าในแผน · data = store.data() (history) · master = { products, npdPlans } (ไม่มี = ใช้ data)
  function planTypeOf(data, master, key, unitId, year) {
    var m0 = master || data || {};
    var p = findProduct(m0.products, key);
    if (!p) return 'existing';
    var pp = planProduct(p);
    if (hasStatusInYear(pp, year, ['clearance'])) return 'clearance';
    if (isNpdRequest(p)) return 'npdRequest';
    if (hasStatusInYear(pp, year, ['planned', 'new'])) return 'npdConfirmed';
    // CR-35: Active / Discontinued ที่เคยขายในหน่วยขายนี้ = สินค้าเดิม · Active ที่ไม่เคยขาย = Listing ใหม่ · Discontinued ที่ไม่เคยขาย = ไม่มีประเภท (เพิ่มในแผนไม่ได้)
    var sold = soldInUnit(data && data.history, unitId, key);
    if (sold) return 'existing';
    return hasStatusInYear(pp, year, ['new', 'active']) ? 'newListing' : null;
  }
  function isNewPlanType(t) { return t === 'newListing' || t === 'npdConfirmed' || t === 'npdRequest'; }
  // Listing ที่สร้างจาก SKU Planning (Sales แก้เดือนเริ่ม / ลบได้เฉพาะรายการนี้) · addedBy SALES เดิม (CR-20) นับเป็นที่มาเดียวกัน
  function isPlanListing(l) { return !!l && (l.source === 'skuPlanning' || l.addedBy === 'SALES'); }

  // เดือนเริ่มที่เลือกได้ในคอลัมน์ช่วงเวลาขาย (โหมดแก้ไข · สินค้าใหม่ 3 ประเภท): เดือนแรกของปีแผน ถึงเดือนสุดแผน (ไม่เกิน ธ.ค. ของปีแผน)
  //   NPD ยืนยันแล้ว = ไม่ก่อนเดือนเปิดตัว · Listing ที่ทีม Product สร้าง = ไม่ก่อนเดือนเริ่มวางขายของ Listing นั้น
  //   → [{ m, key: 'YYYY-MM', ok, reason: null | 'beforeLaunch' | 'beforeListing' }] · launch = เดือนเปิดตัว 'YYYY-MM' | null
  function startMonthOptions(product, type, listing, year, horizonEnd) {
    var p = planProduct(product);
    var launch = p ? (p.launchDate || quarterStart(p.launchQuarter)) : null;
    launch = launch ? String(launch).slice(0, 7) : null;
    var end = horizonEnd && horizonEnd < monthKey(year, 11) ? horizonEnd : monthKey(year, 11);
    var lockedListing = listing && !isPlanListing(listing) && listing.fromMonth ? listing.fromMonth : null;
    var out = [];
    for (var m = 0; m < 12; m++) {
      var k = monthKey(year, m);
      if (k > end && m > 0) break;
      var reason = type === 'npdConfirmed' && launch && k < launch ? 'beforeLaunch' : lockedListing && k < lockedListing ? 'beforeListing' : null;
      out.push({ m: m, key: k, ok: !reason, reason: reason });
    }
    return { months: out, launch: launch };
  }
  // เดือนก่อนเดือนเริ่มใหม่ที่มีจำนวนแล้ว (เลื่อนเดือนเริ่มให้ช้าลง = ค่าเหล่านี้จะถูกล้างเป็น 0) → [index]
  function startClearedMonths(item, m) {
    var out = [];
    for (var i = 0; i < Math.min(12, m); i++) if (item && ((item.qty && item.qty[i] > 0) || (item.overrides && item.overrides[i] && item.qty[i]))) out.push(i);
    return out;
  }
  // ตั้งเดือนเริ่มขายของแถว → แผนใหม่ (เดือนก่อนเดือนเริ่ม: ค่าและ Override ล้าง = ล็อก 0 ตามกติกา Listing)
  function setPlanStart(plan, key, m) {
    var out = copy(plan);
    var it = out.items && out.items[key];
    if (!it) return out;
    it.startMonth = m;
    for (var i = 0; i < Math.min(12, m); i++) { it.qty[i] = 0; it.overrides[i] = false; }
    return out;
  }
  // เดือนเปิดตัวของคำขอ NPD = เดือนเริ่มที่เร็วที่สุดของ Listing ทุกหน่วยขายของสินค้านั้น (ไม่นับที่ถอดแล้ว) → 'YYYY-MM' | null
  function requestLaunchMonth(listings, key) {
    var ms = (listings || []).filter(function (l) { return l.productKey === key && listingStatus(l) !== 'delisted' && l.fromMonth; }).map(function (l) { return l.fromMonth; }).sort();
    return ms[0] || null;
  }
  // คำขอ NPD (ยังไม่ยืนยัน): ตั้งเดือนเปิดตัวของสินค้า (launchDate · request.launchDate) และแผน NPD ตาม Listing → { products, npdPlans }
  function syncRequestLaunch(master, key) {
    var p = findProduct(master.products, key);
    var out = { products: master.products, npdPlans: master.npdPlans };
    if (!p || !isNpdRequest(p, master.npdPlans)) return out;
    var first = requestLaunchMonth(master.listings, key);
    if (!first) return out;
    var date = first + '-01';
    out.products = (master.products || []).map(function (x) {
      if (productKey(x) !== key || x.launchDate === date) return x;
      var o = copy(x);
      o.launchDate = date;
      delete o.launchQuarter;
      if (o.request) o.request.launchDate = date;
      return o;
    });
    out.npdPlans = (master.npdPlans || []).map(function (n) {
      if (n.productKey !== key) return n;
      var o = copy(n);
      o.plannedLaunchDate = date;
      o.launchQuarter = null;
      o.plannedAccounts = (master.listings || []).filter(function (l) { return l.productKey === key && listingStatus(l) !== 'delisted'; })
        .map(function (l) { return { accountId: l.accountId, plannedStartMonth: l.fromMonth || null }; });
      return o;
    });
    return out;
  }
  // Master ที่รวมการแก้ของแผน SKU ที่ยังไม่บันทึก (ใช้ทั้งตอนแสดงผลและตอนบันทึก) · pending บนแผน:
  //   newListings { key: 'YYYY-MM' } = Listing ใหม่ที่สร้างจาก SKU Planning · listingStarts { key: 'YYYY-MM' } = เดือนเริ่มใหม่ของ Listing จาก SKU Planning ·
  //   dropListings { key: true } = ลบ Listing จาก SKU Planning ของหน่วยนี้ (นำออกจากแผน) · meta = { at, by } → { products, listings, npdPlans, changed: [key] }
  function planMasterPreview(master, plan, unitId, meta) {
    meta = meta || {};
    var p = plan || {};
    var listings = master.listings || [];
    var changed = [];
    Object.keys(p.dropListings || {}).forEach(function (k) {
      var l = listingOf(listings, k, unitId);
      if (!isPlanListing(l)) return;
      listings = listings.filter(function (x) { return !(x.productKey === k && x.accountId === unitId); });
      changed.push(k);
    });
    Object.keys(p.newListings || {}).forEach(function (k) {
      if (!(p.items || {})[k]) return;
      listings = addSalesListings(listings, [k], [unitId], { at: meta.at, by: meta.by, fromMonth: p.newListings[k] });
      if (changed.indexOf(k) < 0) changed.push(k);
    });
    Object.keys(p.listingStarts || {}).forEach(function (k) {
      var l = listingOf(listings, k, unitId);
      if (!isPlanListing(l) || l.fromMonth === p.listingStarts[k]) return;
      listings = listings.map(function (x) { if (x.productKey !== k || x.accountId !== unitId) return x; var o = copy(x); o.fromMonth = p.listingStarts[k]; return o; });
      if (changed.indexOf(k) < 0) changed.push(k);
    });
    var out = { products: master.products, listings: listings, npdPlans: master.npdPlans, changed: changed };
    changed.forEach(function (k) {
      var r = syncRequestLaunch({ products: out.products, listings: out.listings, npdPlans: out.npdPlans }, k);
      out.products = r.products;
      out.npdPlans = r.npdPlans;
    });
    return out;
  }

  // ---------------------------------------------------------------------
  // CR-34 ส่วน 3–5: Plan Summary ตามประเภทสินค้าในแผน (ข้อมูล = report.skuItems · calc.skuPlanItems ที่มี planType)
  // ---------------------------------------------------------------------
  function typeOfItem(it) { return PLAN_TYPES.indexOf(it.planType) >= 0 ? it.planType : 'existing'; }
  function itemsIn(items, unitIds) {
    if (!unitIds) return items || [];
    var ids = {};
    unitIds.forEach(function (u) { ids[u] = true; });
    return (items || []).filter(function (it) { return ids[it.unitId]; });
  }
  // แผนรายเดือนแยกประเภท · scope = { units: [{ id, targetM, priorM, planM }], items: report.skuItems }
  //   → [12 × { month, target, reference (ยอดขายอ้างอิงรายเดือน · calc.priorMonthly), plan, existing, newListing, npdConfirmed, npdRequest, clearance }]
  //   ไม่มี items (Snapshot ก่อน CR-34) = แผนทั้งหมดเป็นสินค้าเดิม (planM) · plan = ผลรวมทุกประเภท = รวมแผน Net Sales ของหน้า SKU Planning
  function planByTypeMonthly(scope) {
    var units = (scope && scope.units) || [];
    var out = [];
    for (var m = 0; m < 12; m++) {
      var o = { month: m, target: 0, reference: 0, plan: 0 };
      PLAN_TYPES.forEach(function (t) { o[t] = 0; });
      units.forEach(function (u) { o.target += (u.targetM && u.targetM[m]) || 0; o.reference += (u.priorM && u.priorM[m]) || 0; });
      out.push(o);
    }
    if (scope && scope.items) {
      itemsIn(scope.items, units.map(function (u) { return u.id; })).forEach(function (it) {
        var t = typeOfItem(it);
        for (var i = 0; i < 12; i++) out[i][t] += (it.net && it.net[i]) || 0;
      });
    } else {
      units.forEach(function (u) { for (var i = 0; i < 12; i++) out[i].existing += (u.planM && u.planM[i]) || 0; });
    }
    out.forEach(function (o) { o.plan = sum(PLAN_TYPES.map(function (t) { return o[t]; })); });
    return out;
  }
  // ส่วนต่างรายเดือนใต้กราฟ = แผน − เป้าหมาย → { diff, status } · ครบ = |ส่วนต่าง| < PLAN_DIFF_OK_BAHT (ครึ่งหนึ่งของหลักที่แสดง 0.1 ล้าน)
  //   ไม่มีเป้าหมาย = 'empty' · ขาด = 'short' · เกิน = 'over' (สีตามแถวคงเหลือ)
  var PLAN_DIFF_OK_BAHT = 50000;
  function planDiff(target, plan) {
    var d = (plan || 0) - (target || 0);
    return { diff: d, status: !target ? 'empty' : Math.abs(d) < PLAN_DIFF_OK_BAHT ? 'ok' : d < 0 ? 'short' : 'over' };
  }
  function itemTotal(it, f) { return sum((it[f] || []).map(function (v) { return v || 0; })); }
  // สัดส่วนแผนตามประเภท (ซ้าย) → { total, rows: [{ type, value, skus }] (สินค้าเดิมรวม Listing ใหม่ · Clearance เฉพาะเมื่อมีแผน),
  //   listing: { value, skus } (Listing ใหม่ที่รวมในสินค้าเดิม), newTotal (Listing ใหม่ + NPD ยืนยันแล้ว + ขอ NPD), newPct (ของแผนรวม),
  //   gap (เป้าหมาย − สินค้าเดิมไม่รวม Listing ใหม่ · ไม่ติดลบ) } · SKU = รหัสที่มีจำนวนในแผน > 0 (ไม่นับซ้ำข้ามหน่วยขาย)
  function planTypeMix(items, unitIds, target) {
    var val = {}, keys = {};
    PLAN_TYPES.forEach(function (t) { val[t] = 0; keys[t] = {}; });
    itemsIn(items, unitIds).forEach(function (it) {
      var t = typeOfItem(it);
      val[t] += itemTotal(it, 'net');
      if (itemTotal(it, 'units') > 0) keys[t][it.key] = true;
    });
    function n(list) { var k = {}; list.forEach(function (t) { Object.keys(keys[t]).forEach(function (x) { k[x] = true; }); }); return Object.keys(k).length; }
    var total = sum(PLAN_TYPES.map(function (t) { return val[t]; }));
    var rows = [
      { type: 'existing', value: val.existing + val.newListing, skus: n(['existing', 'newListing']) },
      { type: 'npdConfirmed', value: val.npdConfirmed, skus: n(['npdConfirmed']) },
      { type: 'npdRequest', value: val.npdRequest, skus: n(['npdRequest']) }
    ];
    if (val.clearance > 0.5 || n(['clearance'])) rows.push({ type: 'clearance', value: val.clearance, skus: n(['clearance']) });
    var newTotal = val.newListing + val.npdConfirmed + val.npdRequest;
    return { total: total, rows: rows, listing: { value: val.newListing, skus: n(['newListing']) }, newTotal: newTotal, newPct: total ? newTotal / total : 0,
      gap: Math.max(0, (target || 0) - val.existing) };
  }
  // ตามกลุ่มสินค้าซ้อนตามประเภท (ขวา) kind = 'series' | 'category' → [{ key ('' = ไม่ระบุ), total, parts: { existing (รวม Listing ใหม่), npdConfirmed, npdRequest, clearance }, listing }]
  //   เรียงมากไปน้อย · ไม่ระบุไว้ท้ายสุด · กลุ่มที่ไม่มีแผน (≤ 0.5 บาท) ไม่แสดง
  function planGroupByType(items, unitIds, kind) {
    var map = {};
    itemsIn(items, unitIds).forEach(function (it) {
      var k = (kind === 'category' ? it.categoryId : it.seriesId) || '';
      var g = map[k] || (map[k] = { key: k, total: 0, parts: { existing: 0, npdConfirmed: 0, npdRequest: 0, clearance: 0 }, listing: 0 });
      var t = typeOfItem(it), v = itemTotal(it, 'net');
      g.total += v;
      if (t === 'newListing') { g.parts.existing += v; g.listing += v; } else g.parts[t] += v;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (g) { return g.total > 0.5; })
      .sort(function (a, b) { return (a.key === '' ? 1 : 0) - (b.key === '' ? 1 : 0) || b.total - a.total; });
  }
  // ข้อมูลที่ต้องตรวจ: แผนสินค้า Clearance = SKU × หน่วยขายที่มีจำนวนในแผน > 0 → [{ key, name, unitId, channelId, units }]
  function planClearanceItems(items, unitIds) {
    return itemsIn(items, unitIds).filter(function (it) { return it.planType === 'clearance' && itemTotal(it, 'units') > 0; })
      .map(function (it) { return { key: it.key, name: it.name, unitId: it.unitId, channelId: it.channelId, units: itemTotal(it, 'units') }; });
  }

  // =====================================================================
  // 21) CR-12: รายงานสรุปแผน — รวมสัดส่วนกลุ่มสินค้า และรายการที่ต้องดำเนินการ (แท็บติดตามสถานะ)
  // =====================================================================

  // รวม planMix ของหลายหน่วยขาย lists = [[{ key, label, value }]] → เรียงมากไปน้อย แสดง top รายการ ที่เหลือรวมเป็น key = null (อื่นๆ)
  //   by = 'status' → เรียงตามลำดับ Status (Planned → Discontinued) ไม่ตัด top
  function mergeMix(lists, by, top) {
    var map = {}, order = [];
    (lists || []).forEach(function (list) {
      (list || []).forEach(function (x) {
        if (!(x.key in map)) { map[x.key] = { key: x.key, label: x.label, value: 0 }; order.push(x.key); }
        map[x.key].value += x.value || 0;
      });
    });
    var out = order.map(function (k) { return map[k]; });
    if (by === 'status') {
      var rank = ['planned', 'new', 'active', 'clearance', 'discontinued'];
      return out.sort(function (a, b) { return rank.indexOf(a.key) - rank.indexOf(b.key); });
    }
    out.sort(function (a, b) { return b.value - a.value; });
    if (top && out.length > top) {
      var rest = out.slice(top);
      out = out.slice(0, top).concat([{ key: null, label: null, value: sum(rest.map(function (x) { return x.value; })) }]);
    }
    return out;
  }

  // รายการที่ต้องดำเนินการ 1 แถวต่อหน่วยขายที่มีประเด็น เรียงตามความรุนแรง:
  //   0 ยังไม่มีผู้รับผิดชอบ → 1 ส่งกลับแก้ไข / ต้องตรวจสอบใหม่ → 2 มีส่วนต่าง (มากไปน้อย) → 3 ยังไม่ส่ง → 4 รออนุมัติ
  //   (ลำดับเดียวกันเรียงตามส่วนต่างมากไปน้อย แล้วตามลำดับเดิม) หน่วยที่จัดสรรครบ มีผู้รับผิดชอบ และอนุมัติครบ ไม่แสดง
  // units = [{ id, target, plan, phasing, sku (สถานะ Workflow), vacant }] / ctx = { topDown (สถานะ Top-down), locked, all }
  //   ล็อก Baseline แล้ว = แผนครั้งแรกแก้ไม่ได้ → เหลือเฉพาะเรื่องผู้รับผิดชอบ
  //   ctx.all (CR-13 ตารางติดตามสถานะ) = แสดงทุกหน่วยขาย หน่วยที่ไม่มีประเด็นอยู่ท้ายตาราง (rank 5 · issue false · next null)
  //   ctx.approval === false (CR-17 ไม่มีขั้นอนุมัติ) = ประเด็นเหลือ 2 เรื่อง: ไม่มีผู้รับผิดชอบ (next assignOwner) · ส่วนต่างไม่เป็น 0
  //     (ขาดหรือเกิน next closeGap) ไม่ดูสถานะ Workflow
  //   ctx.sort === 'pct' (CR-28 ตารางติดตามสถานะ) = ในความรุนแรงเดียวกันเรียงตาม % ส่วนต่าง (|ส่วนต่าง| ÷ เป้าหมาย) มากไปน้อย แทนบาท
  // → [{ id, unit, rem, rank, issue, gap (|ส่วนต่าง|), gapPct (|ส่วนต่าง| ÷ เป้าหมาย · เป้าหมาย 0 = null), next, entry }]
  //   next = การดำเนินการถัดไป (Key ของข้อความ) / entry = id ของหน้าที่ต้องไป
  function planActions(units, ctx) {
    ctx = ctx || {};
    var FIX = ['returned', 'review'];
    var rows = [];
    (units || []).forEach(function (u, i) {
      var rem = remaining(u.target || 0, u.plan || 0);
      var gapIssue = !ctx.locked && (rem.status === 'short' || rem.status === 'over');
      if (ctx.approval === false) {
        var r = u.vacant ? 0 : gapIssue ? 2 : -1;
        if (r < 0) { if (ctx.all) rows.push({ id: u.id, unit: u, rem: rem, rank: 5, issue: false, gap: Math.abs(rem.amount), next: null, entry: null, order: i }); return; }
        rows.push({ id: u.id, unit: u, rem: rem, rank: r, issue: true, gap: Math.abs(rem.amount), next: u.vacant ? 'assignOwner' : 'closeGap',
          entry: u.vacant ? 'salespeople' : 'skuPlanning', order: i });
        return;
      }
      var st = [u.phasing, u.sku];
      var rank = u.vacant ? 0
        : ctx.locked ? -1
        : st.some(function (s) { return FIX.indexOf(s) >= 0; }) ? 1
        : gapIssue ? 2
        : st.indexOf('draft') >= 0 ? 3
        : st.indexOf('submitted') >= 0 ? 4 : -1;
      if (rank < 0) {
        if (ctx.all) rows.push({ id: u.id, unit: u, rem: rem, rank: 5, issue: false, gap: Math.abs(rem.amount), next: null, entry: null, order: i });
        return;
      }
      var next, entry;
      if (u.vacant) { next = 'assignOwner'; entry = 'salespeople'; }
      else if (u.phasing === 'returned') { next = 'fixPhasing'; entry = 'phasing'; }
      else if (u.phasing === 'review') { next = 'reviewPhasing'; entry = 'phasing'; }
      else if (u.phasing === 'draft') { next = ctx.topDown === 'approved' ? 'submitPhasing' : 'waitTopDown'; entry = ctx.topDown === 'approved' ? 'phasing' : 'topDown'; }
      else if (u.phasing === 'submitted') { next = 'waitDirector'; entry = 'phasing'; }
      else if (u.sku === 'returned') { next = 'fixSku'; entry = 'skuPlanning'; }
      else if (u.sku === 'review') { next = 'reviewSku'; entry = 'skuPlanning'; }
      else if (rem.status === 'short') { next = 'closeGap'; entry = 'skuPlanning'; }
      else if (u.sku === 'draft') { next = 'submitSku'; entry = 'skuPlanning'; }
      else if (u.sku === 'submitted') { next = 'waitDirector'; entry = 'skuPlanning'; }
      else { next = 'checkOver'; entry = 'skuPlanning'; }
      rows.push({ id: u.id, unit: u, rem: rem, rank: rank, issue: true, gap: Math.abs(rem.amount), next: next, entry: entry, order: i });
    });
    rows.forEach(function (r) { r.gapPct = gapPct(r.rem); });
    var byPct = ctx.sort === 'pct';
    return rows.sort(function (a, b) {
      return a.rank - b.rank || (a.issue ? (byPct ? (b.gapPct || 0) - (a.gapPct || 0) : b.gap - a.gap) : 0) || a.order - b.order;
    });
  }
  // CR-28: % ส่วนต่าง = |ส่วนต่าง| ÷ เป้าหมายของหน่วยขาย (เป้าหมาย 0 = null)
  function gapPct(rem) { return rem && rem.target ? Math.abs(rem.amount) / rem.target : null; }
  // CR-28: แท็บตัวกรองของตารางติดตามสถานะ — 'all' ทั้งหมด · 'short' ขาด · 'over' เกิน · 'ok' จัดสรรครบ · 'vacant' ไม่มีผู้รับผิดชอบ
  //   สถานะส่วนต่างจาก calc.remaining · ไม่มีผู้รับผิดชอบนับซ้อนกับสถานะส่วนต่างได้
  var ACTION_TABS = ['all', 'short', 'over', 'ok', 'vacant'];
  function actionTabMatch(row, tab) {
    if (!tab || tab === 'all') return true;
    if (tab === 'vacant') return !!(row.unit && row.unit.vacant);
    return !!row.rem && row.rem.status === tab;
  }
  // rows = ผลจาก planActions (ctx.all) → { tabs: [{ id, count }], pending (ยังจัดสรรไม่ครบ = สถานะไม่ใช่ ok), total }
  function actionTabs(rows) {
    rows = rows || [];
    return {
      tabs: ACTION_TABS.map(function (id) { return { id: id, count: rows.filter(function (r) { return actionTabMatch(r, id); }).length }; }),
      pending: rows.filter(function (r) { return !r.rem || r.rem.status !== 'ok'; }).length,
      total: rows.length
    };
  }

  // =====================================================================
  // 22) CR-13: มุมมองรวมของหน้าจัดสรรเป้าหมายรายเดือน (อ่านอย่างเดียว ไม่เก็บผลรวมลง store)
  // =====================================================================

  // รวมเป้าหมายรายเดือนและยอดขายปีก่อนของหลายหน่วยขาย
  //   tree = calc.topDown(...) (เป้าหมายทั้งปีของหน่วย) / phasing = { <unitId>: { monthPct } } (ไม่มี = ค่าตั้งต้น defaultPhasing)
  //   unitIds = หน่วยขายที่รวม (ตามลำดับที่ส่ง) / year = ปีแผน (ยอดปีก่อน = year − 1)
  // → { units: [{ id, name, channelId, color, target, amounts[12], prior[12] | null, priorTotal, remaining }],
  //     amounts[12], prior[12], total, priorTotal, monthPct[12] (สัดส่วนของผลรวม), growth[12], growthTotal, incomplete: [unitId] }
  //   incomplete = หน่วยที่ผลรวม 12 เดือนยังไม่เท่าเป้าหมายทั้งปี (คงเหลือ ≠ จัดสรรครบ) — คงเหลือคิดต่อหน่วยขายเท่านั้น
  function aggregatePhasing(data, tree, phasing, unitIds, year) {
    var all = planUnits(tree);
    var units = (unitIds || []).map(function (id) {
      var u = findById(all, id);
      if (!u) return null;
      var p = phasing && phasing[id] && phasing[id].monthPct ? phasing[id].monthPct : defaultPhasing(data, year, id);
      // CR-38: phasing[id].locked = บาทของเดือนล็อก (revisionPhasing) · ไม่ส่ง = ผลเดิม
      var t = phasing && phasing[id] && phasing[id].locked ? revisionPhasing(u.amount, p, phasing[id].locked) : phasingTotals(u.amount, p);
      var prior = priorMonthly(data.history, year, id);
      return {
        id: id, name: u.name, channelId: u.channel.id, color: u.channel.color, target: u.amount, amounts: t.amounts,
        prior: prior, priorTotal: prior ? sum(prior) : null, remaining: t.remaining
      };
    }).filter(Boolean);
    var amounts = zeros(12), prior = zeros(12), hasPrior = false;
    units.forEach(function (u) {
      u.amounts.forEach(function (v, m) { amounts[m] += v; });
      if (u.prior) { hasPrior = true; u.prior.forEach(function (v, m) { prior[m] += v || 0; }); }
    });
    var total = sum(amounts);
    var priorTotal = hasPrior ? sum(prior) : null;
    return {
      units: units,
      amounts: amounts,
      prior: hasPrior ? prior : null,
      total: total,
      target: sum(units.map(function (u) { return u.target; })),
      priorTotal: priorTotal,
      monthPct: amounts.map(function (v) { return total ? v / total : 0; }),
      growth: amounts.map(function (v, m) { return hasPrior ? growth(v, prior[m]) : null; }),
      growthTotal: hasPrior ? growth(total, priorTotal) : null,
      incomplete: units.filter(function (u) { return u.remaining.status !== 'ok'; }).map(function (u) { return u.id; })
    };
  }

  // CR-32: หน่วยขายแนะนำของคู่ค้า · units = SP.core.units.salesUnits(...) ({ id, channelId, kind, suggest }) → unitId | null
  //   ใช้เฉพาะหน่วยขายใน Channel เดียวกับคู่ค้า (customer.channelId ไม่มีค่า = ทุกหน่วยขาย)
  //   เขต (kind 'territory') = จังหวัดของคู่ค้า ('พะเยา,เชียงราย' ได้หลายจังหวัด) อยู่ในรายชื่อจังหวัดของเขตเดียวเท่านั้น (Logic เดิมของ stores.suggestTerritory)
  //   Account / Platform = ข้อความก่อน _ ตัวแรกของชื่อ ตรงกับคำนำหน้า (suggest) ของหน่วยขายเดียวเท่านั้น (ไม่สนตัวพิมพ์) · ไม่มี _ หรือไม่มีคำนำหน้า = null
  function suggestSalesUnit(customer, units) {
    if (!customer) return null;
    var list = (units || []).filter(function (u) { return !customer.channelId || u.channelId === customer.channelId; });
    var hits;
    if (list.some(function (u) { return u.kind === 'territory'; })) {
      var ps = customer.province ? String(customer.province).split(',').map(function (p) { return p.trim(); }).filter(Boolean) : [];
      if (!ps.length) return null;
      hits = list.filter(function (u) { return u.kind === 'territory' && (u.suggest || []).some(function (p) { return ps.indexOf(p) >= 0; }); });
    } else {
      var name = String(customer.name == null ? '' : customer.name);
      var i = name.indexOf('_');
      var prefix = i > 0 ? name.slice(0, i).trim().toUpperCase() : '';
      if (!prefix) return null;
      hits = list.filter(function (u) { return (u.suggest || []).some(function (s) { return String(s).trim().toUpperCase() === prefix; }); });
    }
    return hits.length === 1 ? hits[0].id : null;
  }

  // CR-32: เดือนที่หน่วยขายไม่มีผู้รับผิดชอบ (ownerOf = null) ระหว่าง fromKey – toKey (รวมทั้งสองเดือน) ฟังก์ชันเดียวของทุกหน้า
  //   (Account Master ณ เดือนที่เลือก · Sales Person Management เดือนปัจจุบัน – สุดแผน) ตัวเลขจึงไม่ขัดกัน
  //   → [{ unitId, runs: [{ from, to, after }] }] เฉพาะหน่วยที่มีช่วงว่าง · after = ผู้รับผิดชอบเดือนก่อนช่วงว่าง
  //   (สิ้นสุดแล้วไม่มีคนรับช่วง) | null = ว่างโดยไม่มีคนก่อนหน้า
  function ownerGaps(assignments, salespeople, unitIds, fromKey, toKey) {
    var out = [];
    (unitIds || []).forEach(function (u) {
      var runs = [], run = null;
      for (var k = fromKey; k <= toKey; k = addMonths(k, 1)) {
        if (ownerOf(assignments, salespeople, u, k)) { run = null; continue; }
        if (run) { run.to = k; continue; }
        run = { from: k, to: k, after: ownerOf(assignments, salespeople, u, addMonths(k, -1)) || null };
        runs.push(run);
      }
      if (runs.length) out.push({ unitId: u, runs: runs });
    });
    return out;
  }

  // CR-32: ภาระเป้าหมายต่อคน (มุมมองตามบุคคลของผู้รับผิดชอบรายเดือน)
  //   values = { <unitId>: [12 ค่า | null] } (ปีแผน = เป้าหมายรายเดือนจาก Sub-channel Allocation · ปีปัจจุบัน = ยอดจริงเดือนที่ปิดแล้ว · null = ยังไม่มี)
  //   → { year, channels: [{ channelId, total: [12], yearTotal, people: [{ personId, months: [12], total, units: [{ unitId, months: [12 | null], total }] }],
  //        vacant: { months: [12], total, units: [...] } }] }
  //   ผู้รับผิดชอบของเดือน = ownerOf (ทีมนับเป็นผู้รับผิดชอบ) · Σ แถวบุคคล + ไม่มีผู้รับผิดชอบ = ยอดรวม Channel ทุกเดือน
  //   แถวลูก = หน่วยขายที่คนนั้นรับผิดชอบในปีนั้น (ค่าเฉพาะเดือนที่รับผิดชอบ) · เดือนที่หน่วยไม่มีค่า (null) ไม่นับ
  // CR-35: opts.allOwners = แสดงผู้รับผิดชอบของหน่วยขายที่ไม่มีค่าในปีนั้นด้วย (แถวยอด 0 · เช่น ทีม KAM กลาง ในกลุ่ม MT เมื่อหน่วยขายไม่อยู่ในแผน) ·
  //   ไม่ส่ง = ผลเดิม · กลุ่ม = Channel ของหน่วยขายที่รับผิดชอบ (คนที่ดูแลหลาย Channel อยู่ทุกกลุ่มที่เกี่ยวข้อง)
  function personMonthlyLoad(data, year, values, opts) {
    var allOwners = !!(opts && opts.allOwners);
    var chs = (data.channels || []).filter(function (c) { return c.active !== false; }).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    function blank() { return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; }
    function nulls() { return [null, null, null, null, null, null, null, null, null, null, null, null]; }
    var out = [];
    chs.forEach(function (ch) {
      var total = blank();
      var people = {}, order = [];
      var vacant = { months: blank(), total: 0, units: [] };
      var vacantUnits = {};
      unitsOfChannel(data, ch.id, true).forEach(function (u) {
        var v = values[u.id] || nulls();
        for (var m = 0; m < 12; m++) {
          if (v[m] == null) {
            if (allOwners) {
              var owner = ownerOf(data.assignments, data.salespeople, u.id, monthKey(year, m));
              if (owner && !people[owner]) { people[owner] = { personId: owner, months: blank(), total: 0, units: [], byUnit: {} }; order.push(owner); }
            }
            continue;
          }
          total[m] += v[m];
          var pid = ownerOf(data.assignments, data.salespeople, u.id, monthKey(year, m));
          var row;
          if (pid) {
            if (!people[pid]) { people[pid] = { personId: pid, months: blank(), total: 0, units: [], byUnit: {} }; order.push(pid); }
            row = people[pid];
          } else row = vacant;
          row.months[m] += v[m];
          row.total += v[m];
          var map = pid ? row.byUnit : vacantUnits;
          if (!map[u.id]) { map[u.id] = { unitId: u.id, months: nulls(), total: 0 }; row.units.push(map[u.id]); }
          map[u.id].months[m] = (map[u.id].months[m] || 0) + v[m];
          map[u.id].total += v[m];
        }
      });
      var list = order.map(function (id) { var p = people[id]; delete p.byUnit; return p; });
      out.push({ channelId: ch.id, total: total, yearTotal: sum(total), people: list, vacant: vacant });
    });
    return { year: year, channels: out };
  }

  // CR-35: ช่วงปีของตัวเลือกปี (ผู้รับผิดชอบรายเดือน) = ปีที่เก่าที่สุดที่มีข้อมูลผู้รับผิดชอบ ถึงปีของเดือนสุดแผน (settings.PLAN_HORIZON_END ผ่าน clock) → [ปี]
  function ownerYears(assignments, horizonEnd) {
    var end = Number(String(horizonEnd || SP.core.clock.horizonEnd()).slice(0, 4));
    var first = end;
    (assignments || []).forEach(function (a) { var y = Number(String(a.fromMonth || '').slice(0, 4)); if (y && y < first) first = y; });
    var out = [];
    for (var y = first; y <= end; y++) out.push(y);
    return out;
  }
  // ป้ายของปีในตัวเลือกปี: ไม่เกินปีของเดือนปัจจุบันกลาง = ข้อมูลจริง ('actual') · หลังจากนั้น = ปีแผน ('plan')
  function yearKind(year) { return year <= Number(SP.core.clock.currentMonth().slice(0, 4)) ? 'actual' : 'plan'; }

  // CR-32: เปลี่ยนผู้รับผิดชอบหน่วย unitId เป็น personId ช่วง start – end (ส่วนที่ 4.4) → { ask, current, replaceEnd, after: { from, to } }
  //   ask = ช่วงที่เลือกมีช่วงเดิมของคนอื่น (Q) และช่วงของ Q ยังต่อไปหลัง end (ครบ 2 ข้อ · Q จบภายใน end = เขียนทับได้เลย ไม่ถาม)
  //   replaceEnd (ปุ่ม แทนที่ช่วงที่เหลือ) = toMonth เดิมของ Q ถ้ามีค่าและไม่เกิน horizonEnd (ไม่ทับคนถัดไปที่ต่อคิวไว้) · ไม่เช่นนั้น = horizonEnd
  //   after = ช่วงที่ Q ยังรับผิดชอบต่อหลัง end (แสดงในกล่องถาม · ถึงไม่เกินสุดแผน)
  function ownerReplace(list, unitId, personId, start, end, horizonEnd) {
    var q = personId ? assignmentAt(list, unitId, end) : null;
    var ask = !!(q && q.salesPersonId && q.salesPersonId !== personId && (q.toMonth == null || q.toMonth > end));
    if (!ask) return { ask: false, current: null, replaceEnd: end, after: null };
    var replaceEnd = q.toMonth != null && q.toMonth <= horizonEnd ? q.toMonth : horizonEnd;
    var afterTo = q.toMonth != null && q.toMonth < horizonEnd ? q.toMonth : horizonEnd;
    return { ask: true, current: q.salesPersonId, range: { fromMonth: q.fromMonth, toMonth: q.toMonth == null ? null : q.toMonth }, replaceEnd: replaceEnd < end ? end : replaceEnd,
      after: { from: addMonths(end, 1), to: afterTo } };
  }

  // =====================================================================
  // 23) CR-37 Bundle (Mix Product): สินค้า 1 รายการที่ประกอบด้วย SKU เดี่ยว × จำนวน
  //   product.kind = 'bundle' · components = [{ skuId (productKey ของ SKU เดี่ยว), qty (จำนวนเต็ม ≥ 1) }] · ไม่มี kind = สินค้าเดี่ยว ('single')
  //   วางแผนเป็นชุดในแถวของ Bundle · Net Sales คิดจากราคา Bundle เอง (ไม่แตกยอดไปที่ชิ้นส่วน · ไม่นับซ้ำ)
  //   ความต้องการชิ้นส่วน (componentDemand) = ข้อมูลประกอบสำหรับ Supply Chain ไม่ใช่ยอดขาย
  //   Flag bundle ปิด → bundleVisible(p) = false: แผน SKU ไม่แสดงและไม่นับแถว Bundle · รายการเพิ่มสินค้าไม่มี Bundle (ข้อมูลยังอยู่ใน Store)
  //   หมวดสินค้า / Mix Series / กติกาชิ้นส่วน = settings.BUNDLE
  // =====================================================================
  function bundleSettings() { return settings().BUNDLE || {}; }
  function isBundle(product) { return !!product && product.kind === 'bundle'; }
  function productKind(product) { return isBundle(product) ? 'bundle' : 'single'; }
  function bundleOn() { var F = SP.core.features; return !F || F.isOn('bundle'); }
  function bundleVisible(product) { return !isBundle(product) || bundleOn(); }

  // รวมบรรทัดที่ skuId ซ้ำเป็นบรรทัดเดียว (บวกจำนวน) ตามลำดับที่พบครั้งแรก → [{ skuId, qty }]
  function mergeComponents(list) {
    var out = [], at = {};
    (list || []).forEach(function (c) {
      if (!c || !c.skuId) return;
      var q = Number(c.qty);
      if (Object.prototype.hasOwnProperty.call(at, c.skuId)) { out[at[c.skuId]].qty += q; return; }
      at[c.skuId] = out.length;
      out.push({ skuId: String(c.skuId), qty: q });
    });
    return out;
  }
  // จำนวนชิ้นต่อชุด = ผลรวม qty
  function bundleQty(bundle) { return sum(((bundle && bundle.components) || []).map(function (c) { return Number(c.qty) || 0; })); }

  // Series ของ Bundle = Series ของชิ้นส่วนถ้าเหมือนกันทั้งหมด · ต่าง Series = Mix Series (settings.BUNDLE.mixSeriesId) · ไม่มีชิ้นส่วน = null
  function bundleSeries(bundle, products) {
    var ids = [];
    ((bundle && bundle.components) || []).forEach(function (c) {
      var p = findProduct(products, c.skuId);
      var s = p ? p.seriesId || null : null;
      if (ids.indexOf(s) < 0) ids.push(s);
    });
    if (!ids.length) return null;
    return ids.length === 1 ? ids[0] : bundleSettings().mixSeriesId || null;
  }

  // ปัญหาของชิ้นส่วน (กติกาข้อ 1.2) month = 'YYYY-MM' ใช้ตัดสินสถานะชิ้นส่วน · checkStatus = false ไม่ตรวจสถานะ
  //   → [{ code: 'empty' (ไม่มีชิ้นส่วน) | 'qty' (ไม่ใช่จำนวนเต็ม ≥ 1) | 'missing' (ไม่พบสินค้า) | 'nested' (ชิ้นส่วนเป็น Bundle) | 'status' (Request / Delete)
  //        | 'minQty' (รวมน้อยกว่า settings.BUNDLE.minQty), skuId, status }]
  function bundleIssues(bundle, products, month, checkStatus) {
    var B = bundleSettings();
    var comps = (bundle && bundle.components) || [];
    var out = [];
    if (!comps.length) out.push({ code: 'empty' });
    comps.forEach(function (c) {
      var q = Number(c.qty);
      if (!(q >= 1) || Math.floor(q) !== q) out.push({ code: 'qty', skuId: c.skuId });
      var p = findProduct(products, c.skuId);
      if (!p) { out.push({ code: 'missing', skuId: c.skuId }); return; }
      if (isBundle(p) || productKey(p) === productKey(bundle)) { out.push({ code: 'nested', skuId: c.skuId }); return; }
      var st = productStatus(p, month);
      if (checkStatus !== false && (B.blockedStatuses || []).indexOf(st) >= 0) out.push({ code: 'status', skuId: c.skuId, status: st });
    });
    if (comps.length && bundleQty(bundle) < (B.minQty || 2)) out.push({ code: 'minQty' });
    return out;
  }

  // กติกาตอนบันทึก Product Master (store.set('master.products') เรียกใช้ · บังคับที่ Store ไม่ใช่แค่หน้าจอ)
  //   ทุก Bundle: รวม skuId ซ้ำ · หมวดสินค้า = Set & Bundle › Bundle › Bundle · Series = bundleSeries (ยกเว้นทีม Product แก้เอง seriesManual = true)
  //   ตรวจ bundleIssues เฉพาะ Bundle ที่สร้างใหม่หรือชิ้นส่วนเปลี่ยนจาก prev (ชิ้นส่วนที่กลายเป็น Delete ภายหลังไม่ทำให้บันทึกไม่ได้ → ข้อมูลที่ต้องตรวจ)
  //   → { ok, products, error: null | { code, key, skuId, status } }
  function normalizeBundles(products, prev, month) {
    var B = bundleSettings();
    var list = products || [];
    if (!list.some(isBundle)) return { ok: true, products: list, error: null };
    var before = {};
    (prev || []).forEach(function (p) { if (isBundle(p)) before[productKey(p)] = JSON.stringify(mergeComponents(p.components)); });
    var error = null;
    var out = list.map(function (p) {
      if (!isBundle(p) || error) return p;
      var o = copy(p);
      o.components = mergeComponents(o.components);
      var key = productKey(o);
      if (before[key] !== JSON.stringify(o.components)) {
        var issues = bundleIssues(o, list, month, true);
        if (issues.length) { error = { code: issues[0].code, key: key, skuId: issues[0].skuId || null, status: issues[0].status || null }; return p; }
      }
      if (B.typeId) { o.categoryId = B.categoryId; o.subCategoryId = B.subCategoryId; o.typeId = B.typeId; o.inferred = false; }
      if (!o.seriesManual) { o.seriesId = bundleSeries(o, list); o.subSeriesId = null; }
      return o;
    });
    return error ? { ok: false, products: list, error: error } : { ok: true, products: out, error: null };
  }

  // ราคาของสินค้าตามลำดับราคาเดิม (ไม่แก้ลำดับราคา) month = 'YYYY-MM'
  //   ไม่ระบุหน่วยขาย = ราคาหลักประเภท priceType (ไม่ระบุ = RSP) · ระบุหน่วยขาย = resolvePrice (Clearance → Promotion ของหน่วยขาย → ของ Channel → ราคาหลัก)
  //   ระบุทั้งหน่วยขายและ priceType = ลำดับเดียวกันแต่ใช้ราคาหลักประเภทนั้น → ราคา | null
  function itemPriceAt(data, key, priceType, month, unitId) {
    var m = monthOf(month);
    if (!unitId) return basePriceAt(data.basePrices, key, priceType || 'RSP', m);
    if (!priceType) return resolvePrice(data, key, unitId, m).price;
    var info = unitInfo(data, unitId);
    var ch = info ? info.channel : findById(data.channels, unitId);
    if (!ch) return null;
    return resolveWith({ basePrices: data.basePrices, promoPrices: data.promoPrices, clearance: clearanceMap(data.products) }, key, ch.id, info ? unitId : null, priceType, m).price;
  }
  // ราคารวมชิ้นส่วน = Σ (ราคาชิ้นส่วน × qty) ตามลำดับราคาเดิมของแต่ละชิ้นส่วน → บาท | null (ชิ้นส่วนใดไม่มีราคา)
  //   90100 (12130 × 2 · RSP 59) → 118
  function bundleComponentPrice(data, bundle, priceType, month, unitId) {
    var comps = (bundle && bundle.components) || [];
    if (!comps.length) return null;
    var total = 0;
    for (var i = 0; i < comps.length; i++) {
      var p = itemPriceAt(data, comps[i].skuId, priceType, month, unitId);
      if (p == null) return null;
      total += p * (Number(comps[i].qty) || 0);
    }
    return Math.round(total * 100) / 100;
  }
  // ราคาของ Bundle เอง (ลำดับราคาเดียวกับสินค้าทั่วไป) → บาท | null
  function bundlePrice(data, bundle, priceType, month, unitId) { return itemPriceAt(data, productKey(bundle), priceType, month, unitId); }
  // ส่วนลด Bundle = 1 − ราคา Bundle ÷ ราคารวมชิ้นส่วน (ติดลบ = Bundle แพงกว่าซื้อแยก) → สัดส่วน | null (ไม่มีราคา)
  function bundleDiscount(data, bundle, priceType, month, unitId) {
    var parts = bundleComponentPrice(data, bundle, priceType, month, unitId);
    var own = bundlePrice(data, bundle, priceType, month, unitId);
    if (!parts || own == null) return null;
    return 1 - own / parts;
  }

  // ชิ้นส่วนของ Bundle ที่เป็น Delete ภายในปีแผน (แถว Bundle ในแผน SKU ขอบเหลือง · ไม่ล็อกแถว) → [product]
  function bundleDeletedParts(bundle, products, year) {
    return mergeComponents((bundle && bundle.components) || []).map(function (c) { return findProduct(products, c.skuId); }).filter(function (p) { return p && deletedInYear(p, year); });
  }

  // Bundle ที่มี SKU เดี่ยวนี้เป็นชิ้นส่วน → [{ product, key, qty }] เรียงตาม Product Code
  function bundlesContaining(products, key) {
    var out = [];
    (products || []).forEach(function (p) {
      if (!isBundle(p)) return;
      (p.components || []).forEach(function (c) { if (c.skuId === key) out.push({ product: p, key: productKey(p), qty: Number(c.qty) || 0 }); });
    });
    return out.sort(function (a, b) { return String(productCode(a.product)) < String(productCode(b.product)) ? -1 : 1; });
  }

  // Bundle ที่มีชุดส่วนประกอบเหมือนกันทุกบรรทัด (บันทึกได้ · ข้อมูลที่ต้องตรวจ) → [[key, key, ...]]
  function duplicateBundleSets(products) {
    var groups = {};
    (products || []).forEach(function (p) {
      if (!isBundle(p)) return;
      var sig = mergeComponents(p.components).map(function (c) { return c.skuId + '×' + c.qty; }).sort().join('|');
      if (!sig) return;
      (groups[sig] = groups[sig] || []).push(productKey(p));
    });
    return Object.keys(groups).map(function (k) { return groups[k]; }).filter(function (g) { return g.length > 1; });
  }

  // จำนวนชุดในแผน SKU ของ Bundle (ตัวเลขเดียวกับแถว Bundle ในแผน) plans = { <unitId>: plan }
  //   → { <bundleKey>: { total, months: [12], units: { <unitId>: ชุดทั้งปี } } } (เฉพาะ Bundle ที่มีแถวในแผน)
  function bundlePlanTotals(data, master, plans, year) {
    var out = {};
    var products = (master && master.products) || [];
    if (!products.some(isBundle)) return out;
    Object.keys(plans || {}).forEach(function (u) {
      var plan = plans[u];
      if (!plan || !plan.items || !Object.keys(plan.items).some(function (k) { return isBundle(findProduct(products, k)); })) return;
      skuPlanGrid(data, master, u, plan, { year: year, mode: 'initial' }).rows.forEach(function (r) {
        if (!isBundle(r.product)) return;
        var t = out[r.key] || (out[r.key] = { total: 0, months: zeros(12), units: {} });
        r.cells.forEach(function (c, m) { t.months[m] += c.units || 0; });
        t.total += r.total.units;
        t.units[u] = (t.units[u] || 0) + r.total.units;
      });
    });
    return out;
  }

  // ความต้องการชิ้นส่วน (ชิ้น) ต่อ SKU เดี่ยว × เดือน จากแผน SKU (จำนวนที่ใช้คำนวณ = ตัวเลขเดียวกับแถวรวมแผน)
  //   scope = { data, master, plans: { <unitId>: plan }, year, unitIds (ไม่ระบุ = ทุกหน่วยใน plans), seriesId (Series ของ SKU เดี่ยว · ไม่ระบุ = ทุก Series) }
  //   → [{ key, product, direct: [12], viaBundle: [12], total: [12], bundles: [{ key, product, qty, units: [12] }], sum: { direct, viaBundle, total } }]
  //   แถว = SKU เดี่ยวที่เป็นชิ้นส่วนของ Bundle อย่างน้อย 1 รายการ · direct = แผนของ SKU เดี่ยวนั้น · viaBundle = Σ (จำนวนชุดในแผน × qty ของชิ้นส่วน)
  function componentDemand(scope) {
    var data = scope.data, master = scope.master, year = scope.year;
    var products = (master && master.products) || [];
    var rows = {}, order = [];
    products.forEach(function (b) {
      if (!isBundle(b)) return;
      (b.components || []).forEach(function (c) {
        if (rows[c.skuId]) return;
        var p = findProduct(products, c.skuId);
        if (!p || isBundle(p)) return;
        if (scope.seriesId && p.seriesId !== scope.seriesId) return;
        rows[c.skuId] = { key: c.skuId, product: p, direct: zeros(12), viaBundle: zeros(12), total: zeros(12), bundles: [] };
        order.push(c.skuId);
      });
    });
    (scope.unitIds || Object.keys(scope.plans || {})).forEach(function (u) {
      var plan = scope.plans && scope.plans[u];
      if (!plan) return;
      skuPlanGrid(data, master, u, plan, { year: year, mode: 'initial' }).rows.forEach(function (r) {
        if (!isBundle(r.product)) {
          if (rows[r.key]) r.cells.forEach(function (c, m) { rows[r.key].direct[m] += c.units || 0; });
          return;
        }
        mergeComponents(r.product.components).forEach(function (c) {
          var target = rows[c.skuId];
          if (!target) return;
          var line = target.bundles.filter(function (x) { return x.key === r.key; })[0];
          if (!line) { line = { key: r.key, product: r.product, qty: Number(c.qty) || 0, units: zeros(12) }; target.bundles.push(line); }
          r.cells.forEach(function (cell, m) {
            var n = (cell.units || 0) * (Number(c.qty) || 0);
            line.units[m] += n;
            target.viaBundle[m] += n;
          });
        });
      });
    });
    return order.map(function (k) {
      var r = rows[k];
      for (var m = 0; m < 12; m++) r.total[m] = r.direct[m] + r.viaBundle[m];
      r.sum = { direct: sum(r.direct), viaBundle: sum(r.viaBundle), total: sum(r.total) };
      return r;
    }).sort(function (a, b) { return String(productCode(a.product)) < String(productCode(b.product)) ? -1 : 1; });
  }

  // =====================================================================
  // 24) CR-38 Revision: เดือนที่ล็อก (ก่อนเดือนที่มีผล) ใช้ค่าจากรอบก่อนเป็นบาท / ชิ้น · เดือนที่เปิดคำนวณแบบเดิม
  //   locked = [12] ค่าบาทของเดือนที่ล็อก (null = เดือนที่เปิด) · ไม่มีเดือนล็อก (locked null) = ผลเท่า phasingTotals ทุกค่า
  // =====================================================================
  // เป้ารายเดือนของหน่วยขายในรอบที่มีเดือนล็อก → { amounts, pcts (ของเดือนล็อก = บาท ÷ เป้าทั้งปี), pctSum, amountSum, lockedSum, openPctSum, remaining }
  function revisionPhasing(annual, monthPct, locked) {
    if (!locked || !locked.some(function (v) { return v != null; })) {
      var base = phasingTotals(annual, monthPct);
      return { amounts: base.amounts, pcts: monthPct.slice(), pctSum: base.pctSum, amountSum: base.amountSum, lockedSum: 0, openPctSum: base.pctSum, remaining: base.remaining };
    }
    var amounts = [], pcts = [], lockedSum = 0, openPct = 0;
    for (var m = 0; m < 12; m++) {
      if (locked[m] != null) {
        amounts.push(Number(locked[m]) || 0);
        pcts.push(annual ? (Number(locked[m]) || 0) / annual : 0);
        lockedSum += Number(locked[m]) || 0;
      } else {
        var p = monthPct[m] || 0;
        amounts.push(amountFromPct(annual, p));
        pcts.push(p);
        openPct += p;
      }
    }
    var amountSum = sum(amounts);
    return { amounts: amounts, pcts: pcts, pctSum: sum(pcts), amountSum: amountSum, lockedSum: lockedSum, openPctSum: openPct, remaining: remaining(annual, amountSum) };
  }
  // กระจายเฉพาะเดือนที่เปิด: เดือนเปิดได้ (เป้าทั้งปี − ส่วนที่ล็อก) ตามสัดส่วน shares ของเดือนเปิด → monthPct [12]
  //   เดือนล็อกคงค่าเดิมของ shares (revisionPhasing ไม่ใช้ค่านี้ · Store ห้ามแก้เดือนล็อก) · ไม่มีเดือนล็อก = shares เดิม · shares ของเดือนเปิดรวม 0 = เท่ากันทุกเดือนเปิด
  function fillOpenMonths(annual, shares, locked) {
    if (!locked || !locked.some(function (v) { return v != null; })) return shares.slice();
    var lockedSum = 0, open = [];
    for (var m = 0; m < 12; m++) { if (locked[m] != null) lockedSum += Number(locked[m]) || 0; else open.push(m); }
    var openShare = sum(open.map(function (m) { return shares[m] || 0; }));
    var rest = annual ? Math.max(0, annual - lockedSum) / annual : 0;
    return shares.map(function (s, m) {
      if (locked[m] != null) return s;
      return openShare > 0 ? rest * (s || 0) / openShare : (open.length ? rest / open.length : 0);
    });
  }
  // คงค่าของเดือนล็อก (0 … before − 1) จากแผน SKU ที่บันทึกไว้ (คำสั่งปรับทั้งแถวในหน้าจอไม่แตะเดือนล็อก) → แผนใหม่ (ไม่แก้ต้นฉบับ)
  //   plan = { items: { <key>: { qty: [12], overrides: [12] } } } · สินค้าใหม่ในแผน = เดือนล็อกเป็น 0 / ไม่ใช่ค่าที่กรอกทับ
  function keepLockedMonths(next, prev, before) {
    if (!before || !next) return next;
    var out = copy(next);
    var pi = (prev && prev.items) || {};
    Object.keys(out.items || {}).forEach(function (k) {
      var n = out.items[k], o = pi[k];
      n.qty = n.qty || zeros(12);
      n.overrides = n.overrides || fill(12, false);
      for (var m = 0; m < before && m < 12; m++) {
        n.qty[m] = o && o.qty ? Number(o.qty[m] || 0) : 0;
        n.overrides[m] = !!(o && o.overrides && o.overrides[m]);
      }
    });
    return out;
  }
  // คงสัดส่วนรายเดือนของเดือนล็อกจากค่าที่บันทึกไว้ → [12]
  function keepLockedShares(next, prev, before) {
    if (!before || !next) return next;
    return next.map(function (v, m) { return m < before && prev ? prev[m] : v; });
  }
  // ส่วนที่ล็อกของเป้าหมายทั้งปี: หน่วยขาย = Σ เดือนล็อก · Channel / Total = Σ ของหน่วยขาย → { total, channels: { <id>: บาท }, units: { <id>: บาท } }
  //   tree = calc.topDown · lockedByUnit = { <unitId>: [12 | null] }
  function lockedTargetSums(tree, lockedByUnit) {
    var out = { total: 0, channels: {}, units: {} };
    Object.keys(lockedByUnit || {}).forEach(function (u) { out.units[u] = sum((lockedByUnit[u] || []).map(function (v) { return Number(v) || 0; })); });
    (tree && tree.children || []).forEach(function (ch) {
      out.channels[ch.id] = sum(ch.children.map(function (u) { return out.units[u.id] || 0; }));
    });
    out.total = sum(Object.keys(out.units).map(function (u) { return out.units[u]; }));
    return out;
  }
  // ตรวจเป้าหมายทั้งปีไม่ต่ำกว่าส่วนที่ล็อก (Annual Target · Sub-channel Allocation · Store) → [{ level: 'total' | 'channel' | 'unit', id, name, amount, locked }] ที่ต่ำกว่า
  //   หน่วยขายที่มีส่วนที่ล็อกแต่ไม่อยู่ในแผนแล้ว = amount 0 · ยอมให้ต่างไม่เกิน 1 บาท (ปัดเศษ)
  function lockedTargetIssues(tree, lockedByUnit) {
    var s = lockedTargetSums(tree, lockedByUnit);
    var out = [];
    var inPlan = {};
    (tree.children || []).forEach(function (ch) {
      ch.children.forEach(function (u) {
        inPlan[u.id] = true;
        if ((s.units[u.id] || 0) > 0 && u.amount < s.units[u.id] - 1) out.push({ level: 'unit', id: u.id, name: u.name, amount: u.amount, locked: s.units[u.id] });
      });
      if ((s.channels[ch.id] || 0) > 0 && ch.amount < s.channels[ch.id] - 1) out.push({ level: 'channel', id: ch.id, name: ch.name, amount: ch.amount, locked: s.channels[ch.id] });
    });
    Object.keys(s.units).forEach(function (u) { if (s.units[u] > 0 && !inPlan[u]) out.push({ level: 'unit', id: u, name: u, amount: 0, locked: s.units[u] }); });
    if (s.total > 0 && tree.amount < s.total - 1) out.push({ level: 'total', id: null, name: null, amount: tree.amount, locked: s.total });
    return out;
  }

  // CR-38 เปรียบเทียบ Revision 2 รอบ (core/revision.js dataset · รอบ Lock = Snapshot · อื่น = คำนวณสด)
  //   ds = { id, name, planYear, seq, effectiveMonth, lockBefore, total: { annual, saleAnnual, net, sale }, channels / units: [{ id, name, channelId, annual, saleAnnual, net, sale }],
  //          items: [{ key, name, unitId, channelId, seriesId, units, sale, net }], seriesNames: { <id>: ชื่อ } }
  //   opts = { level: 'total' | 'channel' | 'unit' | 'series' | 'sku', metric: 'net' | 'sale' | 'units' (เฉพาะ series / sku), view: 'year' | 'month',
  //            filter: { channelId, unitId } } · ระดับ total / channel / unit = เป้าหมาย · series / sku = แผน SKU
  //   → { level, metric, view, rows: [{ id, name, a, b, diff, pct, aM, bM, dM }] (เรียง |ส่วนต่าง| มากไปน้อย), total, max, lockBefore, effectiveMonth, newer }
  //   lockBefore = เดือนล็อกของรอบที่ใหม่กว่า (ปีเดียวกัน) · มุมมองทั้งปีของเป้าหมาย = เป้าหมายทั้งปี · อื่น = ผลรวม 12 เดือน
  function compareRevisions(a, b, opts) {
    opts = opts || {};
    var level = opts.level || 'channel', view = opts.view === 'month' ? 'month' : 'year', f = opts.filter || {};
    var plan = level === 'series' || level === 'sku';
    var metric = opts.metric === 'sale' || (opts.metric === 'units' && plan) ? opts.metric : 'net';
    function arr(v) { var o = zeros(12); (v || []).forEach(function (x, m) { if (m < 12) o[m] = Number(x) || 0; }); return o; }
    function side(ds) {
      var out = {};
      if (!ds) return out;
      function put(id, name, m, annual) {
        var r = out[id] || (out[id] = { id: id, name: name, m: zeros(12), annual: 0 });
        m.forEach(function (v, i) { r.m[i] += v; });
        r.annual += annual;
      }
      if (level === 'total') { put('total', null, arr(metric === 'sale' ? ds.total.sale : ds.total.net), Number(metric === 'sale' ? ds.total.saleAnnual : ds.total.annual) || 0); return out; }
      if (level === 'channel') {
        (ds.channels || []).forEach(function (c) { if (!f.channelId || c.id === f.channelId) put(c.id, c.name, arr(metric === 'sale' ? c.sale : c.net), Number(metric === 'sale' ? c.saleAnnual : c.annual) || 0); });
        return out;
      }
      if (level === 'unit') {
        (ds.units || []).forEach(function (u) {
          if (f.channelId && u.channelId !== f.channelId) return;
          if (f.unitId && u.id !== f.unitId) return;
          put(u.id, u.name, arr(metric === 'sale' ? u.sale : u.net), Number(metric === 'sale' ? u.saleAnnual : u.annual) || 0);
        });
        return out;
      }
      (ds.items || []).forEach(function (it) {
        if (f.channelId && it.channelId !== f.channelId) return;
        if (f.unitId && it.unitId !== f.unitId) return;
        var id = level === 'series' ? it.seriesId || '' : it.key;
        var name = level === 'series' ? (ds.seriesNames || {})[it.seriesId] || null : it.name;
        var m = arr(metric === 'units' ? it.units : metric === 'sale' ? it.sale : it.net);
        put(id, name, m, sum(m));
      });
      return out;
    }
    var ra = side(a), rb = side(b);
    var ids = Object.keys(rb).concat(Object.keys(ra).filter(function (k) { return !rb[k]; }));
    function val(r) { return !r ? 0 : view === 'year' && !plan ? r.annual : sum(r.m); }
    var rows = ids.map(function (id) {
      var x = ra[id], y = rb[id];
      var aM = x ? x.m.slice() : zeros(12), bM = y ? y.m.slice() : zeros(12);
      var av = val(x), bv = val(y);
      return { id: id, name: (y && y.name) || (x && x.name) || id, a: av, b: bv, diff: bv - av, pct: av ? (bv - av) / av : null, aM: aM, bM: bM, dM: bM.map(function (v, m) { return v - aM[m]; }) };
    }).sort(function (p, q) { return Math.abs(q.diff) - Math.abs(p.diff) || (p.name < q.name ? -1 : 1); });
    var total = { id: 'total', a: sum(rows.map(function (r) { return r.a; })), b: sum(rows.map(function (r) { return r.b; })), aM: zeros(12), bM: zeros(12), dM: zeros(12) };
    rows.forEach(function (r) { for (var m = 0; m < 12; m++) { total.aM[m] += r.aM[m]; total.bM[m] += r.bM[m]; total.dM[m] += r.dM[m]; } });
    total.diff = total.b - total.a;
    total.pct = total.a ? total.diff / total.a : null;
    var newer = !a ? b : !b ? a : (b.planYear * 1000 + b.seq >= a.planYear * 1000 + a.seq) ? b : a;
    var max = 0;
    rows.forEach(function (r) { max = Math.max(max, Math.abs(r.a), Math.abs(r.b)); });
    return { level: level, metric: metric, view: view, rows: rows, total: total, max: max,
      lockBefore: a && b && a.planYear === b.planYear && newer ? newer.lockBefore || 0 : 0, effectiveMonth: newer ? newer.effectiveMonth : null, newer: newer ? newer.id : null };
  }

  // =====================================================================
  // 25) CR-39 ชุดสรุปของคำขออนุมัติ Revision (core/revision.js summary · รอบ Lock = Snapshot.report · อื่น = report.build)
  //   input = { id, name, planYear, seq, effectiveMonth, lockBefore, total (เป้าหมาย Total), prior (ยอดขาย L12M), channels: [{ id, name, amount }],
  //             units: [{ id, name, channelId, target, plan, targetM: [12] }], items (report.skuItems), clearance (แผน Clearance รวม Net Sales · ไม่นับในเป้าหมาย) }
  //   prev = input ของรอบก่อน (null = รอบแรก ไม่มีส่วนต่าง)
  //   → { id, name, compareTo, compareName, total, prior, growth, prevTotal, diff, pct, channels: [{ id, name, a, b, diff, pct, share }], max,
  //       topUnits (5 อันดับ |ส่วนต่าง|), sku: { ok, short, over, empty, shortTotal, units }, mix: { rows: [{ type, value, pct, skus }], total }, clearance,
  //       monthly: { a: [12] | null, b: [12], lockBefore, effectiveMonth } }
  // =====================================================================
  function revisionSummary(cur, prev) {
    if (!cur) return null;
    var total = Number(cur.total) || 0, prior = Number(cur.prior) || 0;
    var pTotal = prev ? Number(prev.total) || 0 : null;
    function delta(a, b) { return { diff: a == null ? null : b - a, pct: a ? (b - a) / a : null }; }
    var pch = {};
    ((prev && prev.channels) || []).forEach(function (c) { pch[c.id] = Number(c.amount) || 0; });
    var seen = {};
    var channels = (cur.channels || []).map(function (c) {
      seen[c.id] = true;
      var b = Number(c.amount) || 0, a = prev ? (pch[c.id] || 0) : null, d = delta(a, b);
      return { id: c.id, name: c.name, a: a, b: b, diff: d.diff, pct: d.pct, share: total ? b / total : 0 };
    });
    ((prev && prev.channels) || []).forEach(function (c) {
      if (seen[c.id]) return;
      var a = pch[c.id], d = delta(a, 0);
      channels.push({ id: c.id, name: c.name, a: a, b: 0, diff: d.diff, pct: d.pct, share: 0 });
    });
    var max = 0;
    channels.forEach(function (c) { max = Math.max(max, Math.abs(c.a || 0), Math.abs(c.b)); });
    var pu = {};
    ((prev && prev.units) || []).forEach(function (u) { pu[u.id] = Number(u.target) || 0; });
    var units = (cur.units || []).map(function (u) {
      var b = Number(u.target) || 0, a = prev ? (pu[u.id] || 0) : null, d = delta(a, b);
      return { id: u.id, name: u.name, channelId: u.channelId, a: a, b: b, diff: d.diff, pct: d.pct };
    });
    var topUnits = prev ? units.filter(function (u) { return Math.abs(u.diff) >= 0.5; })
      .sort(function (p, q) { return Math.abs(q.diff) - Math.abs(p.diff) || (p.name < q.name ? -1 : p.name > q.name ? 1 : 0); }).slice(0, 5) : [];
    var sku = { ok: 0, short: 0, over: 0, empty: 0, shortTotal: 0, units: (cur.units || []).length };
    (cur.units || []).forEach(function (u) {
      var r = remaining(Number(u.target) || 0, Number(u.plan) || 0);
      if (r.status === 'short') { sku.short++; sku.shortTotal += r.amount; } else if (r.status === 'over') sku.over++; else if (r.status === 'ok') sku.ok++; else sku.empty++;
    });
    var tm = planTypeMix(cur.items || [], (cur.units || []).map(function (u) { return u.id; }), total);
    var mixRows = tm.rows.filter(function (r) { return r.type !== 'clearance'; });
    var mixTotal = sum(mixRows.map(function (r) { return r.value; }));
    var mix = { total: mixTotal, rows: mixRows.map(function (r) { return { type: r.type, value: r.value, skus: r.skus, pct: mixTotal ? r.value / mixTotal : 0 }; }) };
    function monthsOf(list) {
      var o = zeros(12);
      (list || []).forEach(function (u) { for (var m = 0; m < 12; m++) o[m] += Number(u.targetM && u.targetM[m]) || 0; });
      return o;
    }
    var d0 = delta(pTotal, total);
    return {
      id: cur.id, name: cur.name, compareTo: prev ? prev.id : null, compareName: prev ? prev.name : null,
      total: total, prior: prior, growth: prior ? total / prior - 1 : null, prevTotal: pTotal, diff: d0.diff, pct: d0.pct,
      channels: channels, max: max, topUnits: topUnits, sku: sku, mix: mix, clearance: Number(cur.clearance) || 0,
      monthly: { a: prev ? monthsOf(prev.units) : null, b: monthsOf(cur.units), lockBefore: prev && prev.planYear === cur.planYear ? cur.lockBefore || 0 : 0, effectiveMonth: cur.effectiveMonth || null }
    };
  }
  // ชุดสรุปที่เก็บตอนส่ง (a) เทียบกับที่คำนวณใหม่ (b) ปัดเป็นบาท → [ชื่อส่วนที่ต่าง] ([] = เหมือนกัน)
  //   ใช้ตรวจความถูกต้องของข้อบังคับ: ระหว่างรออนุมัติรอบถูกล็อก ชุดสรุปต้องไม่เปลี่ยน
  function revisionSummaryChanges(a, b) {
    if (!a || !b) return a === b ? [] : ['all'];
    function r(v) { return v == null ? null : Math.round(Number(v) || 0); }
    function same(x, y) { return JSON.stringify(x) === JSON.stringify(y); }
    var out = [];
    if (!same([r(a.total), r(a.prior), r(a.prevTotal)], [r(b.total), r(b.prior), r(b.prevTotal)])) out.push('total');
    function ch(s) { return (s.channels || []).map(function (c) { return [c.id, r(c.a), r(c.b)]; }); }
    if (!same(ch(a), ch(b))) out.push('channels');
    function tu(s) { return (s.topUnits || []).map(function (u) { return [u.id, r(u.diff)]; }); }
    if (!same(tu(a), tu(b))) out.push('topUnits');
    function sk(s) { var x = s.sku || {}; return [x.ok, x.short, x.over, x.empty, r(x.shortTotal)]; }
    if (!same(sk(a), sk(b))) out.push('sku');
    function mx(s) { return ((s.mix || {}).rows || []).map(function (x) { return [x.type, r(x.value)]; }); }
    if (!same(mx(a), mx(b))) out.push('mix');
    if (r(a.clearance) !== r(b.clearance)) out.push('clearance');
    function mo(s) { var m = s.monthly || {}; return [(m.a || []).map(r), (m.b || []).map(r), m.lockBefore || 0]; }
    if (!same(mo(a), mo(b))) out.push('monthly');
    return out;
  }

  // =====================================================================
  // 26) CR-40 ตัวกรองของ SKU Planning: ปุ่ม ตัวกรอง (n) = จำนวน Chip = จำนวนตัวกรองที่ใช้อยู่
  //   f = { series: [id], node, age, planType, kind, noSale } · kind นับเมื่อเปิด Flag bundle เท่านั้น (ปิด = ไม่มีตัวกรองนี้และไม่กรอง)
  //   → ['series' | 'category' | 'age' | 'planType' | 'kind' | 'noSale'] ตามลำดับ Chip
  // =====================================================================
  function skuFilterKeys(f, bundleOn) {
    f = f || {};
    var out = [];
    if ((f.series || []).length) out.push('series');
    if (f.node) out.push('category');
    if (f.age) out.push('age');
    if (f.planType) out.push('planType');
    if (f.kind && bundleOn) out.push('kind');
    if (f.noSale) out.push('noSale');
    return out;
  }
  // ล้างตัวกรอง / ล้างทั้งหมด → ค่าว่างของทุกตัวกรอง (skuFilterKeys = [])
  function clearedSkuFilters() { return { series: [], node: '', nodeLevel: '', age: '', planType: '', kind: '', noSale: false }; }

  // =====================================================================
  // 27) CR-41 ยอดจริงของปีแผน (เดือนที่ปิดแล้ว ≤ เดือนปิดล่าสุด · S2 = ม.ค. 2027 ยอดจริงตัวอย่าง) — Annual Target · Sub-channel Allocation · SKU Planning · Revision Compare
  //   id = หน่วยขาย | Channel (ผลรวมทุกหน่วยใน Master ของ Channel) | null (Total = ทุก Channel)
  // =====================================================================
  // ยอดจริงรายเดือน (Net Sales บาท) → [12 × (บาท | null)] (null = ยังไม่ปิด / ไม่มีข้อมูล)
  function actualMonthly(data, id, year) {
    function ofUnit(u) { var o = []; for (var m = 0; m < 12; m++) o.push(actualMonthValue(data.history, year, u, m)); return o; }
    function add(list) {
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (m) {
        var vals = list.map(function (x) { return x[m]; }).filter(function (v) { return v != null; });
        return vals.length ? sum(vals) : null;
      });
    }
    if (id == null) return add((data.channels || []).filter(function (c) { return c.active !== false; }).map(function (c) { return actualMonthly(data, c.id, year); }));
    if (findById(data.channels, id)) return add(unitsOfChannel(data, id).map(function (u) { return ofUnit(u.id); }));
    return ofUnit(id);
  }
  // ยอดจริงสะสม ม.ค.–เดือนปิดล่าสุดของปี year → { value, months (จำนวนเดือนที่ปิดในปี), from, to ('YYYY-MM') } | null (ยังไม่มีเดือนที่ปิดในปีนี้)
  function actualToDate(data, id, year) {
    var K = refClock(data.history);
    var n = 0;
    for (var m = 0; m < 12; m++) if (K.isClosed(year, m)) n = m + 1;
    if (!n) return null;
    var vals = actualMonthly(data, id, year).slice(0, n);
    return { value: sum(vals.map(function (v) { return v || 0; })), months: n, from: monthKey(year, 0), to: monthKey(year, n - 1) };
  }
  // ยอดจริงรายชิ้นของ SKU ในหน่วยขาย เดือน m (0–11) ของปี year → ชิ้น | null (ยังไม่ปิด / ไม่มีข้อมูล)
  function actualSkuUnits(history, unitId, key, year, m) {
    var K = refClock(history);
    var y = history && history.years && history.years[year];
    if (!y || !K.isClosed(year, m) || m >= (y.actualMonths == null ? 12 : y.actualMonths)) return null;
    var row = y.skuQty && y.skuQty[unitId] && y.skuQty[unitId][key];
    return row ? row[m] || 0 : 0;
  }

  SP.core.calc = {
    findById: findById,
    sum: sum,
    // Channel และหน่วยแบ่งเป้า
    channelColor: channelColor,
    allUnits: allUnits,
    unitsOfChannel: unitsOfChannel,
    unitInfo: unitInfo,
    gpOf: gpOf,
    availableUnits: availableUnits,
    availableChannels: availableChannels,
    // CR-23: ยอดขายย้อนหลัง · Annual Target / Sub-channel Allocation
    historyYears: historyYears,
    salesHistory: salesHistory,
    // CR-24: ยอดอ้างอิงรายเดือน · L12M
    referenceMonthly: referenceMonthly,
    referenceValues: referenceValues,
    l12m: l12m,
    skuReference: skuReference,
    skuBackfill: skuBackfill,
    skuActualAt: skuActualAt,
    salesAge: salesAge,
    ageMatch: ageMatch,
    ageBand: ageBand,
    skuAgeGroup: skuAgeGroup,
    AGE_GROUPS: AGE_GROUPS,
    monthsDiff: monthsDiff,
    skuPlanItems: skuPlanItems,
    PLAN_TYPES: PLAN_TYPES,
    PRODUCT_STATUSES: PRODUCT_STATUSES,
    isRequestProduct: isRequestProduct,
    requestCodeOf: requestCodeOf,
    productCode: productCode,
    codeOf: codeOf,
    isDeletedAt: isDeletedAt,
    deletedInYear: deletedInYear,
    revenueTypeOf: revenueTypeOf,
    dateStatus: dateStatus,
    dateStatusAt: dateStatusAt,
    npdPlanOf: npdPlanOf,
    isNpdRequest: isNpdRequest,
    soldInUnit: soldInUnit,
    planTypeOf: planTypeOf,
    isNewPlanType: isNewPlanType,
    isPlanListing: isPlanListing,
    startMonthOptions: startMonthOptions,
    startClearedMonths: startClearedMonths,
    setPlanStart: setPlanStart,
    requestLaunchMonth: requestLaunchMonth,
    syncRequestLaunch: syncRequestLaunch,
    planMasterPreview: planMasterPreview,
    clearanceMap: clearanceMap,
    clearanceActive: clearanceActive,
    clearanceForUnit: clearanceForUnit,
    clearanceDiscount: clearanceDiscount,
    clearanceRows: clearanceRows,
    clearanceCandidates: clearanceCandidates,
    categoryOptions: categoryOptions,
    clearanceMonths: clearanceMonths,
    clearanceUnitIds: clearanceUnitIds,
    clearanceQty: clearanceQty,
    clearancePlanned: clearancePlanned,
    clearanceStockState: clearanceStockState,
    clearanceDistribute: clearanceDistribute,
    clearancePlanMonthly: clearancePlanMonthly,
    clearanceLockedRows: clearanceLockedRows,
    clearClearanceCells: clearClearanceCells,
    listedNotPlanned: listedNotPlanned,
    productYear: productYear,
    groupItems: groupItems,
    productGroupLevels: productGroupLevels,
    groupTotal: groupTotal,
    GROUP_BY: GROUP_BY,
    ownerYears: ownerYears,
    yearKind: yearKind,
    planByTypeMonthly: planByTypeMonthly,
    planDiff: planDiff,
    planTypeMix: planTypeMix,
    planGroupByType: planGroupByType,
    planClearanceItems: planClearanceItems,
    pivotPlan: pivotPlan,
    unitAllocationBlock: unitAllocationBlock,
    channelTargetAudit: channelTargetAudit,
    channelTargetChange: channelTargetChange,
    // Measure chain
    exVat: exVat,
    netSales: netSales,
    saleFromNet: saleFromNet,
    chain: chain,
    baseEntryAt: baseEntryAt,
    basePriceAt: basePriceAt,
    rspAt: rspAt,
    basePriceHistory: basePriceHistory,
    basePriceChangedIn: basePriceChangedIn,
    setBasePrice: setBasePrice,
    promoEntry: promoEntry,
    setPromoPrice: setPromoPrice,
    channelPriceType: channelPriceType,
    resolveWith: resolveWith,
    resolvePrice: resolvePrice,
    checkPromoPrice: checkPromoPrice,
    reverseChain: reverseChain,
    cellBreakdown: cellBreakdown,
    moneySplit: moneySplit,
    // Remaining / Top-down
    alertStatus: alertStatus,
    remaining: remaining,
    emptyRemaining: emptyRemaining,
    normalizeShares: normalizeShares,
    addMonthly: addMonthly,
    planMix: planMix,
    amountFromPct: amountFromPct,
    pctFromAmount: pctFromAmount,
    growth: growth,
    vsLastYear: vsLastYear,
    niceScaleMax: niceScaleMax,
    niceAxis: niceAxis,
    axisStart: axisStart,
    scaleTicks: scaleTicks,
    priorShares: priorShares,
    skuPlanNet: skuPlanNet,
    channelMonthShares: channelMonthShares,
    uniformGrowth: uniformGrowth,
    targetPlanBars: targetPlanBars,
    personYtd: personYtd,
    gapPct: gapPct,
    actionTabs: actionTabs,
    actionTabMatch: actionTabMatch,
    ACTION_TABS: ACTION_TABS,
    unitHistory: unitHistory,
    channelHistory: channelHistory,
    topDown: topDown,
    planUnits: planUnits,
    resolveSelection: resolveSelection,
    unitTarget: unitTarget,
    // Phasing
    priorMonthly: priorMonthly,
    channelMonthly: channelMonthly,
    phasingBasis: phasingBasis,
    defaultPhasing: defaultPhasing,
    phasingTotals: phasingTotals,
    sharesDiffer: sharesDiffer,
    seasonalityIndex: seasonalityIndex,
    seasonalityShares: seasonalityShares,
    // วันที่ / ราคา / Promotion / Clearance
    parseDate: parseDate,
    monthIndex: monthIndex,
    absMonth: absMonth,
    daysInMonth: daysInMonth,
    dateKey: dateKey,
    addDays: addDays,
    overlapDays: overlapDays,
    pricingOf: pricingOf,
    effectivePrice: effectivePrice,
    effectiveGp: effectiveGp,
    pricingDetail: pricingDetail,
    priceChangedMonths: priceChangedMonths,
    clearanceSplit: clearanceSplit,
    systemFill: systemFill,
    runRateOf: runRateOf,
    // Product Master / แผน SKU
    productKey: productKey,
    findProduct: findProduct,
    productStatus: productStatus,
    statusAt: statusAt,
    statusSegments: statusSegments,
    planYearStatus: planYearStatus,
    soldInYear: soldInYear,
    launchesIn: launchesIn,
    isListed: isListed,
    listedAccounts: listedAccounts,
    clearanceStockFor: clearanceStockFor,
    planBlockReason: planBlockReason,
    npdStartMonth: npdStartMonth,
    earliestStartMonth: earliestStartMonth,
    validStartMonth: validStartMonth,
    cellSource: cellSource,
    lockReason: lockReason,
    cellState: cellState,
    newPlanItem: newPlanItem,
    defaultSkuPlan: defaultSkuPlan,
    availableSkus: availableSkus,
    addableSkus: addableSkus,
    addSalesListings: addSalesListings,
    createSalesNpd: createSalesNpd,
    salesRequestChanges: salesRequestChanges,
    planProduct: planProduct,
    stopPlanItem: stopPlanItem,
    actualUnits: actualUnits,
    skuPlanGrid: skuPlanGrid,
    monthWindow: monthWindow,
    // CR-11: ข้อมูลสินค้าจริง / ค่าตั้งต้นของแผน / เครื่องมือช่วยกรอก
    titleCase: titleCase,
    displayName: displayName,
    inferCategory: inferCategory,
    skuHistory: skuHistory,
    runRateFrom: runRateFrom,
    growthFactor: growthFactor,
    defaultPlanQty: defaultPlanQty,
    primaryStatus: primaryStatus,
    anomalyMark: anomalyMark,
    distributeAnnual: distributeAnnual,
    cleanQty: cleanQty,
    scaleRows: scaleRows,
    lastYearWrites: lastYearWrites,
    clearWrites: clearWrites,
    annualWrites: annualWrites,
    applyWrites: applyWrites,
    resetRows: resetRows,
    closeGap: closeGap,
    closeGapWrites: closeGapWrites,
    fillToTargetWrites: fillToTargetWrites,
    parseTsv: parseTsv,
    toTsv: toTsv,
    pasteCells: pasteCells,
    fillCells: fillCells,
    sortPlanRows: sortPlanRows,
    priorOutsidePlan: priorOutsidePlan,
    groupPlanRows: groupPlanRows,
    // หมวดสินค้า / Series / ความครบถ้วน
    TAX_LEVELS: TAX_LEVELS,
    taxonomyNode: taxonomyNode,
    taxonomyName: taxonomyName,
    taxonomyChildren: taxonomyChildren,
    taxonomyTree: taxonomyTree,
    taxonomyField: taxonomyField,
    taxonomyUsage: taxonomyUsage,
    removeTaxonomyNode: removeTaxonomyNode,
    addTaxonomyNode: addTaxonomyNode,
    moveTaxonomyNode: moveTaxonomyNode,
    productTaxonomy: productTaxonomy,
    seriesList: seriesList,
    inSeries: inSeries,
    sumRows: sumRows,
    hasProductField: hasProductField,
    productCompleteness: productCompleteness,
    // แผน NPD / รหัส / ERP / Audit
    NPD_STAGES: NPD_STAGES,
    npdStage: npdStage,
    applyNpdApproval: applyNpdApproval,
    quarterMonths: quarterMonths,
    npdLaunch: npdLaunch,
    npdStageSegments: npdStageSegments,
    npdOverdue: npdOverdue,
    npdLaunchSoon: npdLaunchSoon,
    monthSpan: monthSpan,
    npdCoverage: npdCoverage,
    bindTrCode: bindTrCode,
    renamePlanKey: renamePlanKey,
    compareErp: compareErp,
    auditDiff: auditDiff,
    // Top-down (v7)
    pctOfTotal: pctOfTotal,
    growthAmount: growthAmount,
    roundShares: roundShares,
    growthWaterfall: growthWaterfall,
    channelShareRows: channelShareRows,
    topDownRows: topDownRows,
    // ผู้รับผิดชอบ / Performance
    monthKey: monthKey,
    addMonths: addMonths,
    employedIn: employedIn,
    personStatus: personStatus,
    unitAssignments: unitAssignments,
    canRemoveUnit: canRemoveUnit,
    assignmentAt: assignmentAt,
    ownerOf: ownerOf,
    ownerMonths: ownerMonths,
    ownerSegments: ownerSegments,
    validateAssignments: validateAssignments,
    setOwner: setOwner,
    setEndMonth: setEndMonth,
    eligiblePeople: eligiblePeople,
    assignmentAlerts: assignmentAlerts,
    performanceByPerson: performanceByPerson,
    personPerformance: personPerformance,
    actualNetByUnit: actualNetByUnit,
    // รายงานสรุปแผน (CR-12)
    mergeMix: mergeMix,
    planActions: planActions,
    // มุมมองรวมของ Phasing (CR-13)
    aggregatePhasing: aggregatePhasing,
    // CR-30 Listing ตามช่วงเวลาและสถานะ · NPD แบบไตรมาส
    quarterStart: quarterStart,
    listingStatus: listingStatus,
    listingOf: listingOf,
    listedInYear: listedInYear,
    listingOutside: listingOutside,
    normalizeListings: normalizeListings,
    setListing: setListing,
    listingCoverage: listingCoverage,
    plannedAfter: plannedAfter,
    // หน่วยขายและคู่ค้า (CR-32)
    suggestSalesUnit: suggestSalesUnit,
    ownerGaps: ownerGaps,
    personMonthlyLoad: personMonthlyLoad,
    ownerReplace: ownerReplace,
    // CR-37 Bundle
    isBundle: isBundle,
    productKind: productKind,
    bundleOn: bundleOn,
    bundleVisible: bundleVisible,
    mergeComponents: mergeComponents,
    bundleQty: bundleQty,
    bundleSeries: bundleSeries,
    bundleIssues: bundleIssues,
    normalizeBundles: normalizeBundles,
    itemPriceAt: itemPriceAt,
    bundleComponentPrice: bundleComponentPrice,
    bundlePrice: bundlePrice,
    bundleDiscount: bundleDiscount,
    bundlesContaining: bundlesContaining,
    bundleDeletedParts: bundleDeletedParts,
    duplicateBundleSets: duplicateBundleSets,
    bundlePlanTotals: bundlePlanTotals,
    componentDemand: componentDemand,
    // CR-38 Revision
    revisionPhasing: revisionPhasing,
    fillOpenMonths: fillOpenMonths,
    keepLockedMonths: keepLockedMonths,
    keepLockedShares: keepLockedShares,
    lockedTargetSums: lockedTargetSums,
    lockedTargetIssues: lockedTargetIssues,
    compareRevisions: compareRevisions,
    // CR-39 ชุดสรุปของคำขออนุมัติ Revision
    revisionSummary: revisionSummary,
    revisionSummaryChanges: revisionSummaryChanges,
    // CR-40 ตัวกรองของ SKU Planning
    skuFilterKeys: skuFilterKeys,
    clearedSkuFilters: clearedSkuFilters,
    // CR-41 นาฬิกาของยอดอ้างอิง · ยอดจริงของปีแผน
    refClock: refClock,
    actualMonthly: actualMonthly,
    actualToDate: actualToDate,
    actualSkuUnits: actualSkuUnits
  };
})(window.SP);

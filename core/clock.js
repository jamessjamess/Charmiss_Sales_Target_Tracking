/*
 * core/clock.js — นาฬิกากลางที่เดียวทั้งเว็บ (CR-24 · CR-41 ตามสถานการณ์ Demo) — ห้ามอ่าน new Date() หรือเขียนเดือน / ปีตายตัวที่อื่น
 *
 * สถานการณ์ (data/scenarios.js): scenarioId() = ค่าที่เลือกใน sessionStorage (SP:app.scenario · เขียนโดย core/scenario.js ผ่าน store) ไม่มี = defaultId
 *   อ่าน sessionStorage เองเพราะไฟล์นี้โหลดก่อน core/store.js (core/units.js · core/scenario.js ใช้นาฬิกาตอนโหลด) · refresh() = อ่านใหม่
 *
 *   currentMonth()      = เดือนปัจจุบันของสถานการณ์ ('YYYY-MM') · ไม่มีสถานการณ์ = เดือนจริงของเครื่อง
 *   lastClosedMonth()   = เดือนก่อนเดือนปัจจุบัน = เดือนสุดท้ายที่มียอดขายจริง (ปิดแล้ว)
 *   asOfDate()          = วันที่ของข้อมูล ('YYYY-MM-DD') · asOfLabel() = '30 ก.ย. 2026' (ข้อความ "ข้อมูล ณ")
 *   planYear()          = ปีแผนของสถานการณ์ (ไม่มี = settings.DEFAULT_PLAN_YEAR)
 *   now()               = เวลาที่ประทับในการกระทำ = วันที่ของสถานการณ์ + เวลาจริงของเครื่อง ('YYYY-MM-DDTHH:MM:SS' เวลาท้องถิ่น · ผู้ใช้เลือก)
 *   l12mRange()         = { from, to } 12 เดือนที่ปิดแล้วล่าสุด
 *   referenceYear(m)    = ปีของยอดอ้างอิงเดือน m (0–11) = ปีล่าสุดที่เดือนนั้นปิดแล้ว (≤ เดือนปิดล่าสุด) · ผลรวม 12 เดือน = L12M
 *   isClosed(year, m)   = เดือน m (0–11) ของปี year ปิดแล้ว (≤ เดือนปิดล่าสุด)
 *   fullYears()         = ปีปฏิทินเต็ม 2 ปีก่อนปีของเดือนปิดล่าสุด — คอลัมน์ยอดขายรายปีคู่กับ L12M
 *   label(key, short)   = 'ก.ย. 2025' / short = 'ก.ย. 25' · rangeLabel(short) = ช่วง L12M
 *   parse / key / addMonths = ตัวช่วยเดือน 'YYYY-MM'
 *   CR-32: horizonEnd() = settings.PLAN_HORIZON_END เดือนสุดท้ายของแผน (ไม่มีค่า = ธ.ค. ของปีถัดจากเดือนปัจจุบัน) · horizonYears()
 *   CR-41: withScenario(id, fn) / withMonth('YYYY-MM', fn) = เปลี่ยนนาฬิกาชั่วคราวระหว่าง fn แล้วคืนค่าเสมอ (core/scenario.js สร้าง R1 ใต้นาฬิกาของ S1 · Test)
 *          at('YYYY-MM') = นาฬิกาที่หยุดไว้ที่เดือนนั้น { currentMonth, lastClosedMonth, referenceYear, isClosed, l12mRange, parse, key, addMonths, label }
 *          (ยอดอ้างอิงจาก Snapshot ของรอบที่ Lock แล้ว = เดือนปัจจุบันตอน Lock · calc.refClock)
 * อ่านจาก data/: scenarios · settings (PLAN_HORIZON_END · DEFAULT_PLAN_YEAR) · store: ไม่อ่าน ไม่เขียน
 */
(function (SP) {
  'use strict';

  var STORE_KEY = 'SP:app.scenario';   // = core/store.js PREFIX + 'app.scenario'
  var cachedId = null;
  var stack = [];                      // ค่าชั่วคราวจาก withScenario / withMonth (ตัวบนสุดมีผล)

  function settings() { return (SP.data && SP.data.settings) || {}; }
  function scenarios() { return (SP.data && SP.data.scenarios) || { list: [] }; }
  function key(year, month) { return year + '-' + (month < 10 ? '0' : '') + month; }        // month 1–12
  function parse(k) { return { year: Number(String(k).slice(0, 4)), month: Number(String(k).slice(5, 7)) }; }
  function addMonths(k, n) {
    var p = parse(k);
    var t = p.year * 12 + (p.month - 1) + n;
    return key(Math.floor(t / 12), (t % 12) + 1);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function storedId() {
    try {
      var raw = window.sessionStorage ? window.sessionStorage.getItem(STORE_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function top() { return stack.length ? stack[stack.length - 1] : null; }
  function find(id) { return scenarios().list.filter(function (s) { return s.id === id; })[0] || null; }
  function scenarioId() {
    var t = top();
    if (t && t.scenario) return t.scenario;
    if (cachedId === null) cachedId = storedId() || scenarios().defaultId || '';
    return find(cachedId) ? cachedId : (scenarios().defaultId || '');
  }
  function scenario() { return find(scenarioId()) || scenarios().list[0] || null; }
  function refresh() { cachedId = null; }

  function currentMonth() {
    var t = top();
    if (t && t.month) return t.month;
    var s = scenario();
    if (s && s.currentMonth) return s.currentMonth;
    var d = new Date();
    return key(d.getFullYear(), d.getMonth() + 1);
  }
  function lastClosedMonth() { return addMonths(currentMonth(), -1); }
  function asOfDate() {
    var t = top();
    var s = scenario();
    if ((!t || !t.month) && s && s.asOf) return s.asOf;
    var p = parse(currentMonth());
    return currentMonth() + '-' + pad(new Date(Date.UTC(p.year, p.month, 0)).getUTCDate());   // วันสุดท้ายของเดือนปัจจุบัน
  }
  function planYear() { var s = scenario(); return (s && s.planYear) || settings().DEFAULT_PLAN_YEAR; }
  function now() {
    var d = new Date();
    return asOfDate() + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function l12mRange() { var to = lastClosedMonth(); return { from: addMonths(to, -11), to: to }; }
  function referenceYear(m) { var lc = parse(lastClosedMonth()); return m + 1 <= lc.month ? lc.year : lc.year - 1; }
  function isClosed(year, m) { return key(year, m + 1) <= lastClosedMonth(); }
  function fullYears() { var y = parse(lastClosedMonth()).year; return [y - 2, y - 1]; }

  function label(k, short) {
    var F = SP.core.format;
    var p = parse(k);
    return F.MONTHS[p.month - 1] + ' ' + (short ? String(p.year).slice(-2) : p.year);
  }
  function asOfLabel() { return SP.core.format.date(asOfDate()); }
  function rangeLabel(short) { var r = l12mRange(); return label(r.from, short) + ' – ' + label(r.to, short); }
  function horizonEnd() { return settings().PLAN_HORIZON_END || key(parse(currentMonth()).year + 1, 12); }
  function horizonYears() {
    var out = [];
    for (var y = parse(currentMonth()).year; y <= parse(horizonEnd()).year; y++) out.push(y);
    return out;
  }

  // นาฬิกาที่หยุดไว้ที่เดือน month (ฟังก์ชันชุดเดียวกับนาฬิกากลาง เฉพาะที่ใช้คำนวณยอดอ้างอิง)
  function at(month) {
    var lc = addMonths(month, -1), p = parse(lc);
    return {
      currentMonth: function () { return month; },
      lastClosedMonth: function () { return lc; },
      referenceYear: function (m) { return m + 1 <= p.month ? p.year : p.year - 1; },
      isClosed: function (year, m) { return key(year, m + 1) <= lc; },
      l12mRange: function () { return { from: addMonths(lc, -11), to: lc }; },
      fullYears: function () { return [p.year - 2, p.year - 1]; },
      rangeLabel: function (short) { return label(addMonths(lc, -11), short) + ' – ' + label(lc, short); },
      parse: parse, key: key, addMonths: addMonths, label: label
    };
  }

  function within(entry, fn) {
    stack.push(entry);
    try { return fn(); } finally { stack.pop(); }
  }
  function withScenario(id, fn) { return within({ scenario: id }, fn); }
  function withMonth(month, fn) { return within({ month: month }, fn); }

  SP.core.clock = {
    scenarioId: scenarioId,
    scenario: scenario,
    refresh: refresh,
    currentMonth: currentMonth,
    lastClosedMonth: lastClosedMonth,
    asOfDate: asOfDate,
    asOfLabel: asOfLabel,
    planYear: planYear,
    now: now,
    l12mRange: l12mRange,
    referenceYear: referenceYear,
    isClosed: isClosed,
    fullYears: fullYears,
    label: label,
    rangeLabel: rangeLabel,
    horizonEnd: horizonEnd,
    horizonYears: horizonYears,
    withScenario: withScenario,
    withMonth: withMonth,
    at: at,
    parse: parse,
    key: key,
    addMonths: addMonths
  };
})(window.SP);

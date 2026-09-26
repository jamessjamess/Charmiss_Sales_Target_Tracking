/*
 * core/clock.js — เดือนปัจจุบันกลาง (CR-24) ที่เดียวทั้งเว็บสำหรับยอดขายอ้างอิง L12M และหน้าร้านค้า TT (ห้ามอ่าน new Date() เอง)
 *
 *   currentMonth()      = settings.DEMO_CURRENT_MONTH ('2026-09') · ไม่มีค่า = เดือนจริงของเครื่อง → 'YYYY-MM'
 *   lastClosedMonth()   = เดือนก่อนเดือนปัจจุบัน ('2026-08') = เดือนสุดท้ายที่มียอดขายจริง
 *   l12mRange()         = { from: '2025-09', to: '2026-08' } (12 เดือนที่ปิดแล้วล่าสุด)
 *   referenceYear(m)    = ปีของยอดอ้างอิงเดือน m (0–11): เดือน ≤ เดือนปิดล่าสุด = ปีล่าสุด · หลังจากนั้น = ปีก่อนหน้า
 *   fullYears()         = ปีปฏิทินเต็ม 2 ปีก่อนปีของเดือนปิดล่าสุด ([2024, 2025]) — คอลัมน์ยอดขายรายปีคู่กับ L12M
 *   label(key, short)   = 'ก.ย. 2025' / short = 'ก.ย. 25' · rangeLabel(short) = 'ก.ย. 25 – ส.ค. 26'
 *   parse / key / addMonths = ตัวช่วยเดือน 'YYYY-MM'
 * เดือนปัจจุบันจำลองของผู้รับผิดชอบ ทีมขาย ผลงานรายคน และโหมดปรับแผน (ui.currentMonth = มี.ค. ของปีแผน) ยังแยกอยู่ที่ store.currentKey()
 * อ่านจาก data/: settings (DEMO_CURRENT_MONTH) · store: ไม่อ่าน ไม่เขียน (Pure — Test เปลี่ยนเดือนได้ด้วย settings.DEMO_CURRENT_MONTH)
 */
(function (SP) {
  'use strict';

  function settings() { return (SP.data && SP.data.settings) || {}; }
  function key(year, month) { return year + '-' + (month < 10 ? '0' : '') + month; }        // month 1–12
  function parse(k) { return { year: Number(String(k).slice(0, 4)), month: Number(String(k).slice(5, 7)) }; }
  function addMonths(k, n) {
    var p = parse(k);
    var t = p.year * 12 + (p.month - 1) + n;
    return key(Math.floor(t / 12), (t % 12) + 1);
  }

  function currentMonth() {
    var s = settings().DEMO_CURRENT_MONTH;
    if (s) return s;
    var d = new Date();
    return key(d.getFullYear(), d.getMonth() + 1);
  }
  function lastClosedMonth() { return addMonths(currentMonth(), -1); }
  function l12mRange() { var to = lastClosedMonth(); return { from: addMonths(to, -11), to: to }; }
  function referenceYear(m) { var lc = parse(lastClosedMonth()); return m + 1 <= lc.month ? lc.year : lc.year - 1; }
  function fullYears() { var y = parse(lastClosedMonth()).year; return [y - 2, y - 1]; }

  function label(k, short) {
    var F = SP.core.format;
    var p = parse(k);
    return F.MONTHS[p.month - 1] + ' ' + (short ? String(p.year).slice(-2) : p.year);
  }
  function rangeLabel(short) { var r = l12mRange(); return label(r.from, short) + ' – ' + label(r.to, short); }

  SP.core.clock = {
    currentMonth: currentMonth,
    lastClosedMonth: lastClosedMonth,
    l12mRange: l12mRange,
    referenceYear: referenceYear,
    fullYears: fullYears,
    label: label,
    rangeLabel: rangeLabel,
    parse: parse,
    key: key,
    addMonths: addMonths
  };
})(window.SP);

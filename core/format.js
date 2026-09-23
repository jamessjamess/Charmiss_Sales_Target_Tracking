/*
 * core/format.js — จัดรูปแบบตัวเลขและเดือน (ที่เดียวทั้งเว็บ)
 *
 * ค่าที่รับเข้ามาเป็นตัวเลขดิบ ปัดเศษเฉพาะตอนแสดงผล
 * % รับเป็นสัดส่วน (0.45 = 45%)
 */
(function (SP) {
  'use strict';

  var MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var MINUS = '−';

  function number(n, decimals) {
    if (n == null || typeof n !== 'number' || isNaN(n)) return '–';
    if (!isFinite(n)) return '∞';
    var d = decimals || 0;
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    var isZero = Number(s.replace(/,/g, '')) === 0;
    return n < 0 && !isZero ? MINUS + s : s;
  }

  // บาท: 0 ตำแหน่งเป็นค่าตั้งต้น
  function baht(n, decimals) { return number(n, decimals == null ? 0 : decimals); }

  // ล้านบาท: 120,000,000 → '120.00 ล้าน'
  function million(n, decimals) {
    if (n == null || isNaN(n)) return '–';
    return number(n / 1e6, decimals == null ? 2 : decimals) + ' ล้าน';
  }

  // ย่อสำหรับป้ายกราฟ: 1,575,000 → '1.58 ล้าน' / 850,000 → '850K' (ไม่ใช้ตัวย่อ "ล.")
  function compact(n) {
    if (n == null || isNaN(n)) return '–';
    var a = Math.abs(n);
    if (a >= 1e6) return number(n / 1e6, 2) + ' ล้าน';
    if (a >= 1e3) return number(n / 1e3, 0) + 'K';
    return number(n, 0);
  }

  // ล้านไม่มีหน่วย: 20,000,000 → '20.00' (null → '–')
  function millionPlain(n, decimals) {
    if (n == null || isNaN(n)) return '–';
    return number(n / 1e6, decimals == null ? 2 : decimals);
  }

  function pct(fraction, decimals) {
    if (fraction == null || isNaN(fraction)) return '–';
    return number(fraction * 100, decimals == null ? 1 : decimals) + '%';
  }

  // มีเครื่องหมาย: 0.125 → '+12.50%' / −0.0308 → '−3.08%'
  function signedPct(fraction, decimals) {
    if (fraction == null || isNaN(fraction)) return '–';
    var s = pct(fraction, decimals == null ? 2 : decimals);
    return fraction > 0 && s.replace(/[^1-9]/g, '') !== '' ? '+' + s : s;
  }

  // ค่าในช่องกรอก %: 0.35 → 35 / 0.0792 → 7.92
  // การเติบโต (calc.growth): เป้าหมาย 0 (NaN) → '–' / ไม่มียอดปีก่อน (null) → newLabel (เช่น 'ใหม่') / อื่นๆ ทศนิยม 1 ตำแหน่ง
  function growth(g, newLabel) {
    if (g == null) return newLabel;
    if (typeof g === 'number' && isNaN(g)) return '–';
    return signedPct(g, 1);
  }

  function pctInput(fraction) {
    if (fraction == null || isNaN(fraction)) return '';
    return String(Math.round(fraction * 10000) / 100);
  }

  function units(n) { return number(n == null ? n : Math.round(n), 0); }

  function month(i) { return MONTHS[i]; }
  function monthFull(i) { return MONTHS_FULL[i]; }
  function monthYear(i, year) { return MONTHS[i] + ' ' + year; }

  // ช่วงเดือน: (3, 5) → 'เม.ย.–มิ.ย.' / (3, 3) → 'เม.ย.'
  function monthRange(from, to) { return from === to ? MONTHS[from] : MONTHS[from] + '–' + MONTHS[to]; }

  // 'YYYY-MM' → 'เม.ย. 2027' / 'YYYY-MM-DD' → '1 เม.ย. 2027'
  function date(str) {
    if (!str) return '–';
    var p = String(str).split('-');
    var y = p[0];
    var m = MONTHS[Number(p[1]) - 1];
    return p[2] ? Number(p[2]) + ' ' + m + ' ' + y : m + ' ' + y;
  }

  // ISO เวลา → '23 ก.ย. 2026 14:05' (เวลาของเครื่อง)
  function dateTime(iso) {
    if (!iso) return '–';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    var hh = d.getHours(), mm = d.getMinutes();
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ' ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  // ช่วงเดือนแบบ 'YYYY-MM': ('2026-01', '2027-02') → 'ม.ค. 2026 – ก.พ. 2027' / to = null → 'ม.ค. 2026 – ปัจจุบัน'
  function keyRange(from, to, openLabel) {
    return date(from) + ' – ' + (to ? date(to) : (openLabel || '…'));
  }

  SP.core.format = {
    MONTHS: MONTHS,
    number: number,
    baht: baht,
    million: million,
    compact: compact,
    millionPlain: millionPlain,
    pct: pct,
    signedPct: signedPct,
    growth: growth,
    pctInput: pctInput,
    units: units,
    month: month,
    monthFull: monthFull,
    monthYear: monthYear,
    monthRange: monthRange,
    date: date,
    dateTime: dateTime,
    keyRange: keyRange
  };
})(window.SP);

/*
 * core/export.js — ส่งออกตารางเป็น CSV / Excel (ที่เดียวทั้งเว็บ)
 *
 *   toCsv(rows, columns)            → ข้อความ CSV มี BOM (Excel อ่านภาษาไทยได้) แถวละ 1 บรรทัด คั่นด้วย CRLF
 *   downloadCsv(filename, rows, columns)
 *   toXlsx(sheets, meta)            → Promise ดาวน์โหลดไฟล์ .xlsx (โหลด SheetJS จาก cdnjs เมื่อเรียกครั้งแรกเท่านั้น)
 *   loadXlsx()                      → Promise<XLSX> / XLSX_URL
 *   columns = [{ key, label, value(row) → ค่า, type: 'text' | 'money' | 'pct' | 'number', width }]
 *             ตัวเลขส่งออกเป็นชนิดตัวเลขจริง: pct เก็บเป็นทศนิยม (0.25) จัดรูปแบบ 0.00% / money และ number จัดรูปแบบ #,##0
 *   sheets  = [{ name, header: [[ป้าย, ค่า], …] (แถวบนสุดของ Excel เท่านั้น), columns, rows }] — ไม่ใช้ Merge cell
 *             ตรึงแถวหัวตาราง (แถวชื่อคอลัมน์) และตั้งความกว้างคอลัมน์
 * ใช้ Blob + <a download> ทำงานได้เมื่อเปิดจากไฟล์ในเครื่อง / ไม่อ่าน store ไม่มีข้อความ (ข้อความอยู่ใน Module ผ่าน content.js)
 */
(function (SP) {
  'use strict';

  var BOM = '﻿';
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var FORMATS = { pct: '0.00%', money: '#,##0', number: '#,##0' };

  function valueOf(col, row) {
    var v = col.value ? col.value(row) : row[col.key];
    if (typeof v === 'number' && !isFinite(v)) return null;
    return v === undefined ? null : v;
  }

  function csvCell(v) {
    if (v == null) return '';
    if (typeof v === 'number') return String(v);
    var s = String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // CSV: หัวคอลัมน์ 1 แถว + ข้อมูล (เฉพาะคอลัมน์ที่ส่งมา = คอลัมน์ที่แสดง)
  function toCsv(rows, columns) {
    var lines = [columns.map(function (c) { return csvCell(c.label); }).join(',')];
    (rows || []).forEach(function (r) { lines.push(columns.map(function (c) { return csvCell(valueOf(c, r)); }).join(',')); });
    return BOM + lines.join('\r\n') + '\r\n';
  }

  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  }

  function downloadCsv(filename, rows, columns) { download(filename, toCsv(rows, columns), 'text/csv;charset=utf-8'); }

  // โหลด SheetJS ครั้งแรกที่ใช้ (ไม่โหลดตอนเปิดหน้า) โหลดไม่ได้ → Promise reject ให้หน้าเว็บเสนอ CSV แทน
  var loading = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = XLSX_URL;
      s.async = true;
      var timer = setTimeout(function () { fail(); }, 15000);
      function fail() {
        clearTimeout(timer);
        loading = null;
        if (s.parentNode) s.parentNode.removeChild(s);
        reject(new Error('xlsx'));
      }
      s.onload = function () { clearTimeout(timer); if (window.XLSX) resolve(window.XLSX); else fail(); };
      s.onerror = fail;
      document.head.appendChild(s);
    });
    return loading;
  }

  // ตรึงแถวหัวตารางด้วยการแก้ sheetViews ในไฟล์ที่ SheetJS สร้าง (SheetJS รุ่นฟรีไม่เขียน Freeze pane ให้) ทำไม่ได้ = คืนไฟล์เดิม
  function freezeRows(X, data, rowsPerSheet) {
    try {
      var CFB = X.CFB;
      if (!CFB || typeof TextDecoder === 'undefined') return data;
      var zip = CFB.read(new Uint8Array(data), { type: 'array' });
      rowsPerSheet.forEach(function (n, i) {
        if (!n) return;
        var path = 'xl/worksheets/sheet' + (i + 1) + '.xml';
        var entry = CFB.find(zip, '/' + path) || CFB.find(zip, path);
        if (!entry || !entry.content) return;
        var xml = new TextDecoder('utf-8').decode(entry.content);
        var view = '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + n + '" topLeftCell="A' + (n + 1) +
          '" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A' + (n + 1) + '" sqref="A' + (n + 1) + '"/></sheetView></sheetViews>';
        if (/<sheetViews[\s\S]*?<\/sheetViews>/.test(xml)) xml = xml.replace(/<sheetViews[\s\S]*?<\/sheetViews>/, view);
        else if (/<sheetViews\/>/.test(xml)) xml = xml.replace(/<sheetViews\/>/, view);
        else xml = xml.replace(/(<dimension[^>]*\/>)/, '$1' + view);
        var bytes = new TextEncoder().encode(xml);
        entry.content = bytes;
        entry.size = bytes.length;
      });
      return CFB.write(zip, { fileType: 'zip', type: 'array' });
    } catch (e) {
      return data;
    }
  }

  // Excel: แต่ละ Sheet = แถวหัวไฟล์ (ป้าย · ค่า) → แถวชื่อคอลัมน์ (ตรึงไว้) → ข้อมูล
  function toXlsx(sheets, meta) {
    meta = meta || {};
    return loadXlsx().then(function (X) {
      var wb = X.utils.book_new();
      var freeze = [];
      sheets.forEach(function (sh, si) {
        var aoa = [];
        (sh.header || []).forEach(function (hrow) { aoa.push(hrow.slice()); });
        var headRow = aoa.length;
        aoa.push(sh.columns.map(function (c) { return c.label; }));
        (sh.rows || []).forEach(function (r) { aoa.push(sh.columns.map(function (c) { return valueOf(c, r); })); });
        var ws = X.utils.aoa_to_sheet(aoa);
        (sh.rows || []).forEach(function (r, ri) {
          sh.columns.forEach(function (c, ci) {
            var fmt = FORMATS[c.type];
            if (!fmt) return;
            var cell = ws[X.utils.encode_cell({ r: headRow + 1 + ri, c: ci })];
            if (cell && typeof cell.v === 'number') cell.z = fmt;
          });
        });
        ws['!cols'] = sh.columns.map(function (c, ci) {
          var widest = String(c.label).length;
          (sh.rows || []).forEach(function (r) { var v = valueOf(c, r); if (v != null) widest = Math.max(widest, String(v).length); });
          if (ci === 0) (sh.header || []).forEach(function (hrow) { widest = Math.max(widest, String(hrow[0] || '').length); });
          return { wch: c.width || Math.min(48, Math.max(10, widest + 2)) };
        });
        X.utils.book_append_sheet(wb, ws, String(sh.name || ('Sheet' + (si + 1))).slice(0, 31));
        freeze.push(headRow + 1);
      });
      var data = X.write(wb, { bookType: 'xlsx', type: 'array' });
      data = freezeRows(X, data, freeze);
      download(meta.filename || 'export.xlsx', new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      return true;
    });
  }

  SP.core['export'] = {
    BOM: BOM,
    XLSX_URL: XLSX_URL,
    toCsv: toCsv,
    download: download,
    downloadCsv: downloadCsv,
    loadXlsx: loadXlsx,
    toXlsx: toXlsx
  };
})(window.SP);

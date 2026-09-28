---
id: CR-XX
title: ชื่อ CR สั้นๆ
status: Pending
applied:
superseded_by:
---

# CR-XX: ชื่อ CR

> สั่ง Claude Code: "อ่าน docs/change-requests/CR-XX_ชื่อไฟล์.md และ CLAUDE.md แล้วเสนอแผนก่อนเริ่ม"
> ทำหลังจาก CR-YY

**Module ที่แก้:** `modules/<ชื่อ>/*` … (ไฟล์กลางแก้ได้ตามกติกาใน CLAUDE.md หัวข้อ "ไฟล์ที่แก้ได้โดยไม่ต้องถาม")

---

## ส่วน 1: …

- …

---

## Test (`node tests/run.js`)

1. …

## ตรวจก่อนส่งงาน (รายงานเฉพาะข้อที่ไม่ผ่าน)

1. `node tests/run.js` ผ่านทั้งหมด
2. อัปเดต `docs/spec/` ที่เกี่ยวข้อง · `docs/DECISIONS.md` · `docs/CHANGELOG.md` และเปลี่ยนสถานะ CR นี้เป็น `Applied`

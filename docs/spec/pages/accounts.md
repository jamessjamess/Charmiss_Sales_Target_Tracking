# Account (`modules/accounts`, id `accounts`)

Account Master · fit · ผู้แก้ไขตั้งต้น: Sales Director

- ตัวกรอง Channel (`ui.masterChannel`)
- คอลัมน์:
  - ชื่อ (+ หมายเหตุ) · Channel
  - `{gpLabel} %` (GP / Platform Fee ค่าเดียวทั้งปี · ว่าง = ยังไม่ได้กำหนด · TT ไม่มี)
  - การใช้งาน · ผู้รับผิดชอบปัจจุบัน · แผนปี
- โหมดแก้ไข: `+ {unitLabel}` ตาม Filter · แก้ GP · เปิด / ปิดใช้งาน · ลบ
  - ลบได้เฉพาะ Account ที่ไม่อยู่ในแผน ไม่มียอดขายย้อนหลัง และไม่เคยมีผู้รับผิดชอบ นอกนั้นให้ปิดใช้งาน
- เดโม: เปิดใช้งาน `LINE Shop` (ECOM) แล้วเพิ่มในหน้า Sub-channel Allocation

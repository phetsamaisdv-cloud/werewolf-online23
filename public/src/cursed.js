// Cursed status logic (pure) — แผนข้อ 2.4 / 4
// - คืนที่ถูกหมาป่ากัด → status = "turned" ทันที
// - หมาป่ารู้ว่า Cursed เป็นพวก → คืนถัดไป (turnedNight + 1)

// อัปเดตสถานะ Cursed (คืนที่ถูกกัด → turned ทันที)
// @param current  { status: "village"|"turned", turnedNight: number|null } | null
// @param wolfAttacked  boolean  (คืนนี้หมาป่าเลือกกัดคนนี้?)
// @param currentNight  number
// @returns { status, turnedNight }
export function updateCursedStatus(current, wolfAttacked, currentNight) {
  if (current?.status === "turned") {
    // กลายเป็นหมาป่าแล้ว → อยู่สถานะนั้นตลอด
    return { status: "turned", turnedNight: current.turnedNight };
  }
  if (!wolfAttacked) {
    return current ?? { status: "village", turnedNight: null };
  }
  return { status: "turned", turnedNight: currentNight };
}

// หมาป่าเห็น Cursed เป็นพวกได้เมื่อ currentNight >= turnedNight + 1
export function canWolfSeeCursed(turnedNight, currentNight) {
  if (turnedNight == null) return false;
  return currentNight >= turnedNight + 1;
}

// สรุปสถานะเช็กง่าย ๆ — กลายเป็นหมาป่าแล้วหรือยัง
export function isCursedTurned(status) {
  return status?.status === "turned";
}
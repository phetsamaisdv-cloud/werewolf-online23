// เช็กผู้ชนะ — ลำดับสำคัญมาก ห้ามสลับ (AGENTS.md ข้อ 5)
// 1. Fool ถูกโหวตออก?                 → fool
// 2. Lovers ต่างฝ่ายเหลือ 2 คนสุดท้าย?  → lovers
// 3. หมาป่า (รวม Minion + Cursed turned) = 0 → villagers
// 4. หมาป่า >= ชาวบ้าน?                → wolves
// 5. ไม่มี → null (เล่นต่อ)

import { getTeam, isWolfTeam } from "./roles.js";

/**
 * เช็กผู้ชนะ
 * @param {Object} players - { uid: { alive, role, ... } }
 * @param {Object} lovers - { pair: [uid1, uid2] }
 * @param {Object} cursedStatuses - { uid: "village" | "turned" }
 * @param {Object} lastVoteResult - { foolVotedOut: boolean }
 * @returns {{ winner: string|null, reason: string }}
 */
export function checkWin(players, lovers, cursedStatuses, lastVoteResult) {
  // 1. Fool ถูกโหวตออก → ชนะเดี่ยว (สำคัญสุด มาก่อน Lovers เสมอ)
  if (lastVoteResult?.foolVotedOut) {
    return { winner: "fool", reason: "Fool ถูกโหวตออก" };
  }

  // 2. Lovers ต่างฝ่ายเหลือ 2 คนสุดท้าย → ชนะ
  const alive = Object.entries(players).filter(([_, p]) => p.alive);
  if (lovers?.pair?.length === 2) {
    const [a, b] = lovers.pair;
    const aAlive = players[a]?.alive;
    const bAlive = players[b]?.alive;
    if (aAlive && bAlive && alive.length === 2) {
      const aTeam = getTeam(players[a].role, cursedStatuses?.[a]);
      const bTeam = getTeam(players[b].role, cursedStatuses?.[b]);
      if (aTeam !== bTeam) {
        return { winner: "lovers", reason: "Lovers ต่างฝ่ายเหลือ 2 คน" };
      }
    }
  }

  // 3. หมาป่า = 0 → ชาวบ้านชนะ
  const wolves = alive.filter(([uid, p]) =>
    isWolfTeam(p.role, cursedStatuses?.[uid])
  ).length;

  if (wolves === 0) {
    return { winner: "villagers", reason: "หมาป่าหมด" };
  }

  // 4. หมาป่า >= ชาวบ้าน → หมาป่าชนะ
  const villagers = alive.length - wolves;
  if (wolves >= villagers) {
    return { winner: "wolves", reason: "หมาป่า >= ชาวบ้าน" };
  }

  // 5. ยังไม่จบ
  return { winner: null, reason: "เล่นต่อ" };
}
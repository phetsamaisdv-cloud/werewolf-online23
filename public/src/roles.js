// ข้อมูลบทบาททั้งหมด (source of truth) + ฟังก์ชันตีฝ่าย
// ตาม AGENTS.md ข้อ 4 — ห้ามแก้โดยไม่ถาม

export const TEAM = {
  WOLF: "wolf",
  VILLAGE: "village",
  NEUTRAL: "neutral",
};

export const ROLE = {
  // ── ฝ่ายชาวบ้าน ──
  villager: {
    id: "villager",
    nameTH: "ชาวบ้าน",
    nameEN: "Villager",
    team: TEAM.VILLAGE,
    description: "ไม่มีพลังพิเศษ",
    iconPath: "assets/roles/villager.svg",
  },
  seer: {
    id: "seer",
    nameTH: "ผู้หยั่งรู้",
    nameEN: "Seer",
    team: TEAM.VILLAGE,
    description: "ตรวจหมาป่า/ไม่ใช่ 1 คน/คืน",
    iconPath: "assets/roles/seer.svg",
  },
  doctor: {
    id: "doctor",
    nameTH: "หมอ",
    nameEN: "Doctor",
    team: TEAM.VILLAGE,
    description: "protect จาก wolf kill ห้าม protect ตัวเอง",
    iconPath: "assets/roles/doctor.svg",
  },
  hunter: {
    id: "hunter",
    nameTH: "นายพราน",
    nameEN: "Hunter",
    team: TEAM.VILLAGE,
    description: "ตาย → ยิง 1 คน",
    iconPath: "assets/roles/hunter.svg",
  },
  bodyguard: {
    id: "bodyguard",
    nameTH: "บอดี้การ์ด",
    nameEN: "Bodyguard",
    team: TEAM.VILLAGE,
    description: "protect จาก wolf kill protect ตัวเองได้ ห้ามซ้ำคนเดิม",
    iconPath: "assets/roles/bodyguard.svg",
  },
  witch: {
    id: "witch",
    nameTH: "แม่มด",
    nameEN: "Witch",
    team: TEAM.VILLAGE,
    description: "poison 1 + heal 1 (ไม่พร้อมกัน)",
    iconPath: "assets/roles/witch.svg",
  },
  cupid: {
    id: "cupid",
    nameTH: "คิวปิด",
    nameEN: "Cupid",
    team: TEAM.VILLAGE,
    description: "คืนแรกเลือก Lovers 2 คน",
    iconPath: "assets/roles/cupid.svg",
  },
  mayor: {
    id: "mayor",
    nameTH: "นายกเทศมนตรี",
    nameEN: "Mayor",
    team: TEAM.VILLAGE,
    description: "เปิดตัว → 2 votes",
    iconPath: "assets/roles/mayor.svg",
  },
  aura_seer: {
    id: "aura_seer",
    nameTH: "ผู้หยั่งรู้ออร่า",
    nameEN: "Aura Seer",
    team: TEAM.VILLAGE,
    description: "ตรวจ role จริง",
    iconPath: "assets/roles/aura_seer.svg",
  },
  mason: {
    id: "mason",
    nameTH: "ช่างก่ออิฐ",
    nameEN: "Mason",
    team: TEAM.VILLAGE,
    description: "2 คน รู้จักกัน",
    iconPath: "assets/roles/mason.svg",
  },
  diseased: {
    id: "diseased",
    nameTH: "ผู้ติดโรค",
    nameEN: "Diseased",
    team: TEAM.VILLAGE,
    description: "ถูก wolf kill → wolf ฆ่าไม่ได้คืนถัดไป",
    iconPath: "assets/roles/diseased.svg",
  },
  insomniac: {
    id: "insomniac",
    nameTH: "คนนอนไม่หลับ",
    nameEN: "Insomniac",
    team: TEAM.VILLAGE,
    description: "ชนะกับชาวบ้าน",
    iconPath: "assets/roles/insomniac.svg",
  },
  cursed: {
    id: "cursed",
    nameTH: "ผู้ต้องสาป",
    nameEN: "Cursed",
    team: TEAM.VILLAGE,
    description: "ถูกกัด → turned กลายเป็นหมาป่า (ทีมกึ่ง ๆ ดู getTeam)",
    iconPath: "assets/roles/cursed.svg",
  },

  // ── ฝ่ายหมาป่า ──
  werewolf: {
    id: "werewolf",
    nameTH: "หมาป่า",
    nameEN: "Werewolf",
    team: TEAM.WOLF,
    description: "ร่วม kill",
    iconPath: "assets/roles/werewolf.svg",
  },
  wolf_cub: {
    id: "wolf_cub",
    nameTH: "ลูกหมาป่า",
    nameEN: "Wolf Cub",
    team: TEAM.WOLF,
    description: "ตาย → wolf kill 2 คนคืนถัดไป",
    iconPath: "assets/roles/wolf_cub.svg",
  },
  sorceress: {
    id: "sorceress",
    nameTH: "แม่มดหมาป่า",
    nameEN: "Sorceress",
    team: TEAM.WOLF,
    description: "หา Seer 1 คน/คืน (yes/no)",
    iconPath: "assets/roles/sorceress.svg",
  },
  minion: {
    id: "minion",
    nameTH: "สมุน",
    nameEN: "Minion",
    team: TEAM.WOLF,
    description: "รู้ wolf แต่ wolf ไม่รู้ ไม่ร่วม kill",
    iconPath: "assets/roles/minion.svg",
  },

  // ── ฝ่ายกลาง ──
  fool: {
    id: "fool",
    nameTH: "คนโง่",
    nameEN: "Fool",
    team: TEAM.NEUTRAL,
    description: "ถูกโหวตออก → ชนะทันที",
    iconPath: "assets/roles/fool.svg",
  },
};

// เช็กว่า status ของ Cursed กลายเป็นหมาป่าหรือยัง
// รับได้ทั้ง string ("village" | "turned") หรือ object ({ status, turnedNight })
function _isCursedTurned(status) {
  if (!status) return false;
  if (typeof status === "string") return status === "turned";
  return status.status === "turned";
}

// คืนฝ่ายของบทบาท (cursed ตีตามสถานะ)
export function getTeam(role, cursedStatus) {
  const r = ROLE[role];
  if (!r) return null;
  if (role === "cursed") {
    return _isCursedTurned(cursedStatus) ? TEAM.WOLF : TEAM.VILLAGE;
  }
  return r.team;
}

// เช็กว่าเป็นฝ่ายหมาป่าไหม (cursed turned = หมาป่า)
export function isWolfTeam(role, cursedStatus) {
  return getTeam(role, cursedStatus) === TEAM.WOLF;
}
// UI logic ของ host.html — คนทรงคุมเกม: เรียกบทบาท, ดูโหวต/action, จบกลางคืน
import { ensureAuth, listenRoom, ref, onValue, db } from "./firebase.js";
import { ROLE } from "./roles.js";
import { NIGHT_ORDER, countWolfVotes, getActiveRoles, resolveNight } from "./night.js";
import { canWolfSeeCursed } from "./cursed.js";
import {
  setPhase, setNight, callRole, endCall, setLovers, applyNightResult,
} from "./host-control.js";

const code = new URLSearchParams(window.location.search).get("code");
if (!code) window.location.href = "index.html";

// ── DOM refs ──
const root = document.getElementById("hostRoot");
const roomCodeEl = document.getElementById("roomCodeValue");
const phaseBadge = document.getElementById("phaseBadge");
const nightBadge = document.getElementById("nightBadge");
const playerCountEl = document.getElementById("playerCount");
const playerTableBody = document.getElementById("playerTableBody");
const loversStatusEl = document.getElementById("loversStatus");
const lover1Sel = document.getElementById("lover1");
const lover2Sel = document.getElementById("lover2");
const setLoversBtn = document.getElementById("setLoversBtn");
const hostMsgEl = document.getElementById("hostMsg");
const lobbyControlsEl = document.getElementById("lobbyControls");
const nightControlsEl = document.getElementById("nightControls");
const dayControlsEl = document.getElementById("dayControls");
const callButtonsEl = document.getElementById("callButtons");
const activeRoleMsgEl = document.getElementById("activeRoleMsg");
const nightLiveEl = document.getElementById("nightLive");
const nightResultMsgEl = document.getElementById("nightResultMsg");

// ── state ──
const state = {
  meta: null,
  players: {},
  roles: {},
  wolf: {},
  night: {},
  cursed: {},
  lovers: null,
};

function _name(uid) {
  return state.players[uid]?.name ?? `?${uid.slice?.(0, 4) ?? uid}`;
}

function _roleClass(uid) {
  const role = state.roles[uid]?.role;
  if (!role) return "";
  const team = ROLE[role]?.team;
  if (team === "wolf") return "tag tag--wolf";
  if (team === "neutral") return "tag tag--neutral";
  return "tag tag--village";
}

// ── render ผู้เล่น ──
function _renderPlayers() {
  const entries = Object.entries(state.players);
  playerCountEl.textContent = `${entries.length}/16`;
  playerTableBody.innerHTML = "";

  const wolfMembers = state.wolf?.members || {};
  const night = state.meta?.night ?? 1;

  entries.forEach(([uid, p]) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = p.name;
    if (uid === state.meta?.hostUid) tdName.textContent += " 👑";

    const tdRole = document.createElement("td");
    const roleId = state.roles[uid]?.role;
    const roleLabel = roleId ? ROLE[roleId]?.nameTH ?? roleId : "-";
    tdRole.textContent = roleLabel;

    // หมาป่าประเภทที่ host ดูได้: real wolf / turned cursed (คืนถัดไป)
    if (wolfMembers[uid]) tdRole.textContent += " 🐺";
    const cursed = state.cursed[uid];
    if (cursed?.status === "turned" && canWolfSeeCursed(cursed.turnedNight, night)) {
      tdRole.textContent += " (turned)";
    }

    const tdStatus = document.createElement("td");
    tdStatus.className = p.alive === false ? "tag tag--dead" : "tag tag--alive";
    tdStatus.textContent = p.alive === false ? "ตาย" : "รอด";

    tr.append(tdName, tdRole, tdStatus);
    playerTableBody.appendChild(tr);
  });
}

// ── render คู่รัก + ช่องเลือก ──
function _renderLovers() {
  const pair = state.lovers?.pair;
  loversStatusEl.textContent = pair?.length === 2
    ? `${_name(pair[0])} 💞 ${_name(pair[1])}`
    : "ยังไม่ตั้งคู่รัก";

  const aliveUids = Object.entries(state.players)
    .filter(([, p]) => p.alive !== false)
    .map(([uid]) => uid);

  const fillSelect = (sel, current) => {
    sel.innerHTML = "";
    aliveUids.forEach((uid) => {
      const opt = document.createElement("option");
      opt.value = uid;
      opt.textContent = _name(uid);
      sel.appendChild(opt);
    });
    if (current && aliveUids.includes(current)) sel.value = current;
  };
  fillSelect(lover1Sel, pair?.[0]);
  fillSelect(lover2Sel, pair?.[1]);
}

// ── render โหวตหมาป่า + action กลางคืน ──
function _renderNightLive() {
  const night = state.night || {};
  const actions = night.actions || {};
  const votes = state.wolf?.votes || {};
  const activeRole = state.meta?.activeRole;
  const nightNum = state.meta?.night ?? 1;

  nightLiveEl.innerHTML = "";

  const activeMsg = document.createElement("div");
  activeMsg.className = "night-live__title";
  activeMsg.textContent = activeRole
    ? `กำลังเรียก: ${activeRole} → ลืมตา`
    : "ยังไม่เรียกบทบาท";
  nightLiveEl.appendChild(activeMsg);

  // Wolf votes แสดงเสมอเวลาคนทรงเรียก wolf
  const voteEntries = Object.entries(votes);
  if (voteEntries.length) {
    const { counts } = countWolfVotes(votes);
    const box = document.createElement("div");
    box.className = "night-panel";
    const title = document.createElement("div");
    title.textContent = `🐺 โหวตหมาป่า (${voteEntries.length} โหวต)`;
    box.appendChild(title);
    Object.entries(counts).forEach(([target, c]) => {
      const row = document.createElement("div");
      row.textContent = `${_name(target)} — ${c} เสียง`;
      box.appendChild(row);
    });
    nightLiveEl.appendChild(box);
  }

  // Actions ที่ส่งเข้ามาในคืนนี้ (host ดูได้)
  const actionEntries = Object.entries(actions);
  if (actionEntries.length) {
    const box = document.createElement("div");
    box.className = "night-panel";
    const title = document.createElement("div");
    title.textContent = "🌙 action ที่เลือกแล้ว";
    box.appendChild(title);
    actionEntries.forEach(([uid, a]) => {
      const roleId = state.roles[uid]?.role ?? "?";
      const t = a.type ?? "?";
      const target = Array.isArray(a.targets)
        ? (a.targets[0] ? _name(a.targets[0]) : "") + (a.targets[1] ? ` + ${_name(a.targets[1])}` : "")
        : (a.target ? _name(a.target) : "-");
      const row = document.createElement("div");
      row.textContent = `${_name(uid)} (${ROLE[roleId]?.nameTH ?? roleId}) → ${target} [${t}]`;
      box.appendChild(row);
    });
    nightLiveEl.appendChild(box);
  }

  // Cursed reveal (แผนข้อ 2.4): host แจ้งสถานะให้คนทรงใช้ปากเปล่า
  const cursedUids = Object.keys(state.cursed);
  if (cursedUids.length) {
    const box = document.createElement("div");
    box.className = "night-panel";
    box.textContent = "🧛 Cursed status: " + cursedUids.map((uid) => {
      const c = state.cursed[uid];
      return `${_name(uid)} = ${c.status === "turned" ? "turned (หมาป่า)" : "village"}`;
    }).join(" · ");
    nightLiveEl.appendChild(box);
  }
}

// ── render ปุ่มเรียกบทบาท (เฉพาะ role ที่มีผู้เล่น) ──
function _renderCallButtons() {
  callButtonsEl.innerHTML = "";

  const activePlayerRoles = getActiveRoles(state.players);
  const night = state.meta?.night ?? 1;
  void night;

  NIGHT_ORDER.forEach((step) => {
    const hasRole = step.roles.some((r) => activePlayerRoles.includes(r));
    if (!hasRole) return;

    const btn = document.createElement("button");
    btn.className = "btn " + (state.meta?.activeRole === step.key ? "" : "btn--ghost");
    btn.textContent = "เรียก " + step.key;
    btn.type = "button";
    btn.addEventListener("click", async () => {
      await callRole(code, step.key);
      activeRoleMsgEl.textContent = `เรียกแล้ว: ${step.key} — คนทรงพูดกับบทบาทนี้`;
    });
    callButtonsEl.appendChild(btn);
  });

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn btn--ghost";
  clearBtn.textContent = "จบการเรียก";
  clearBtn.type = "button";
  clearBtn.addEventListener("click", async () => {
    await endCall(code);
    activeRoleMsgEl.textContent = "จบการเรียกบทบาท";
  });
  callButtonsEl.appendChild(clearBtn);

  activeRoleMsgEl.textContent = state.meta?.activeRole
    ? `กำลังเรียก: ${state.meta.activeRole}`
    : "";
}

// ── render หลัก ──
function _render() {
  const meta = state.meta;
  if (!meta) {
    hostMsgEl.textContent = "กำลังโหลดห้อง...";
    return;
  }

  roomCodeEl.textContent = code;
  phaseBadge.textContent = `เฟส: ${meta.phase}`;
  nightBadge.textContent = `คืน ${meta.night ?? 1}`;

  _renderPlayers();
  _renderLovers();

  lobbyControlsEl.hidden = meta.phase !== "lobby";
  nightControlsEl.hidden = meta.phase !== "night";
  dayControlsEl.hidden = meta.phase !== "day";

  if (meta.phase === "lobby") {
    hostMsgEl.textContent = "คนครบแล้วค่อยกดเริ่มกลางคืน";
  } else if (meta.phase === "night") {
    _renderCallButtons();
    _renderNightLive();
    hostMsgEl.textContent = "กลางคืน — เรียกบทบาททีละตัว (ตามลำดับแนะนำ)";
  } else if (meta.phase === "day") {
    const result = state.night?.result;
    if (result) {
      const died = result.deaths?.length
        ? result.deaths.map(_name).join(", ")
        : "ไม่มีใครตาย";
      nightResultMsgEl.textContent = `คืน ${result.night}: ผู้ตาย = ${died}`;
    } else {
      nightResultMsgEl.textContent = "กลางวัน — เปิดให้คุยกัน (ระบบกลางวันมา Day 8-9)";
    }
  }
}

// ── event handlers ──
document.getElementById("startNightBtn").addEventListener("click", async () => {
  await setNight(code, 1);
  await setPhase(code, "night");
});

document.getElementById("resolveNightBtn").addEventListener("click", async () => {
  try {
    const night = state.meta?.night ?? 1;

    // รวม players + role (จาก /secret/roles ที่ host อ่านได้)
    const aliveRoles = {};
    Object.entries(state.players).forEach(([uid, p]) => {
      aliveRoles[uid] = { ...p, role: state.roles[uid]?.role ?? null };
    });

    // Wolf Cub ตาย (ทุกวิธี) → คืนนี้หมาป่าฆ่า 2 คน (MVP: variant จากทุกคืน)
    const wolfCubDead = Object.values(aliveRoles).some(
      (p) => p.role === "wolf_cub" && p.alive === false
    );

    const result = resolveNight(
      { players: aliveRoles, actions: state.night?.actions || {}, wolfVotes: state.wolf?.votes || {} },
      { night, doubleKill: wolfCubDead }
    );

    await applyNightResult(code, result, { night, nextPhase: "day" });
    hostMsgEl.textContent = "จบกลางคืนแล้ว → กลางวัน";
  } catch (err) {
    console.error("[resolveNight]", err);
    hostMsgEl.textContent = "จบกลางคืนไม่ได้: " + err.message;
  }
});

document.getElementById("nextNightBtn").addEventListener("click", async () => {
  const next = (state.meta?.night ?? 1) + 1;
  await setNight(code, next);
  await setPhase(code, "night");
});

document.getElementById("endGameBtn").addEventListener("click", async () => {
  if (!confirm("จบเกมเลย? (รีแมตช์ใน Day 10-11)")) return;
  await setPhase(code, "end");
});

// host ตั้งคู่รักด้วยมือ
setLoversBtn.addEventListener("click", async () => {
  const a = lover1Sel.value;
  const b = lover2Sel.value;
  if (!a || !b || a === b) {
    hostMsgEl.textContent = "เลือกคู่รัก 2 คนที่ต่างกัน";
    return;
  }
  await setLovers(code, [a, b]);
  hostMsgEl.textContent = "บันทึกคู่รักแล้ว";
});

// โอนสิทธิ์คนทรง (เลือกจาก select ที่มี user ในห้อง)
document.getElementById("transferLink").addEventListener("click", async (e) => {
  e.preventDefault();
  const candidates = Object.keys(state.players).filter((uid) => uid !== state.meta?.hostUid);
  if (!candidates.length) {
    hostMsgEl.textContent = "ไม่มีคนอื่นในห้องให้โอน";
    return;
  }
  const pick = prompt("โอนสิทธิ์ให้ใคร? (ใส่ uid — ดูได้จาก DevTools)");
  if (!pick) return;
  if (!candidates.includes(pick)) {
    hostMsgEl.textContent = "uid ไม่ถูกต้อง";
    return;
  }
  const { transferHost } = await import("./host-control.js");
  await transferHost(code, pick);
  hostMsgEl.textContent = "โอนสิทธิ์เรียบร้อย";
});

// ── init: ยืนยัน auth + เช็กว่าเป็น host ──
async function _init() {
  const myUid = await ensureAuth();
  const room = await (await import("./firebase.js")).getRoom(code);
  if (!room) {
    window.location.href = "index.html";
    return;
  }
  if (room.meta.hostUid !== myUid && room.meta.hostUid2 !== myUid) {
    alert("คุณไม่ใช่คนทรงของห้องนี้");
    window.location.href = `lobby.html?code=${code}`;
    return;
  }

  // ฟัง data ทั้งหมดที่ host ยืนยันได้
  const dbRef = (path) => ref(db, `rooms/${code}/${path}`);
  const subs = [];
  subs.push(listenRoom(code, (roomData) => {
    state.meta = roomData.meta;
    state.players = roomData.players;
    _render();
  }));

  const attach = (key, path, cb) => {
    subs.push(onValue(dbRef(path), (snap) => {
      state[key] = snap.exists() ? snap.val() : {};
      cb?.();
      _render();
    }));
  };

  attach("roles", "secret/roles");
  attach("wolf", "wolf");
  attach("night", "night");
  attach("cursed", "secret/cursed");
  attach("lovers", "lovers", () => _renderLovers());

  const leaveLink = document.getElementById("leaveLink");
  leaveLink.addEventListener("click", () => subs.forEach((off) => off()));

  root.hidden = false;
}

try {
  await _init();
} catch (err) {
  console.error("[host]", err);
  alert("เข้า host ไม่ได้: " + err.message);
  window.location.href = `index.html`;
}
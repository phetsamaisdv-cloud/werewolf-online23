// UI logic ของ player.html — ผู้เล่นดู role ตัวเอง + เลือก action กลางคืน
import { db, ref, onValue, ensureAuth, getRoom, getRole, setRoomPath } from "./firebase.js";
import { ROLE } from "./roles.js";
import { nightRolesFor } from "./night.js";
import { isCursedTurned } from "./cursed.js";

const code = new URLSearchParams(window.location.search).get("code");
if (!code) window.location.href = "index.html";

// ── DOM refs ──
const root = document.getElementById("playerRoot");
const heroTitle = document.getElementById("heroTitle");
const phaseBadge = document.getElementById("phaseBadge");
const activeRoleBadge = document.getElementById("activeRoleBadge");
const roleCardEl = document.getElementById("roleCard");
const nightSectionEl = document.getElementById("nightSection");
const nightMsgEl = document.getElementById("nightMsg");
const actionFormEl = document.getElementById("actionForm");
const daySectionEl = document.getElementById("daySection");
const dayMsgEl = document.getElementById("dayMsg");

const state = { meta: null, players: {}, me: null, myRole: null, myAction: null, wolf: {} };
let submitLock = false;
const _night = () => state.meta?.night ?? 1;

// listener ตัวที่ไม่ใช่ทุก role มีสิทธิ์อ่าน (night/actions, wolf) → เงียบ ๆ ได้
function _ignoreErr(err) {
  console.warn("[listen]", err?.code ?? err);
}

function _name(uid) {
  return state.players[uid]?.name ?? `?`;
}

function _aliveTargets() {
  return Object.entries(state.players)
    .filter(([uid, p]) => uid !== state.me && p.alive !== false)
    .map(([uid]) => uid);
}

// ── แสดง role การ์ดตัวเอง ──
function _renderRole() {
  const r = ROLE[state.myRole];
  if (!r) return;
  roleCardEl.innerHTML = `
    <img class="role-card__icon" src="${r.iconPath}" alt="${r.nameTH}" onerror="this.style.display='none'">
    <div class="role-card__name">${r.nameTH}</div>
    <div class="role-card__en">${r.nameEN} · ${r.team}</div>
    <div class="role-card__desc">${r.description}</div>
  `;
}

// ── สร้าง select เป้าหมาย ──
function _targetSelect(uids, withEmpty = true) {
  const sel = document.createElement("select");
  sel.className = "select";
  if (withEmpty) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "— เลือกคน —";
    sel.appendChild(opt);
  }
  uids.forEach((uid) => {
    const opt = document.createElement("option");
    opt.value = uid;
    opt.textContent = _name(uid);
    sel.appendChild(opt);
  });
  return sel;
}

// ── action form ตามบทบาท ──
function _buildActionForm() {
  actionFormEl.innerHTML = "";
  actionFormEl.hidden = false;

  const submitBtn = document.createElement("button");
  submitBtn.className = "btn";
  submitBtn.textContent = "ยืนยัน";
  submitBtn.type = "button";

  // หมาป่า: โหวตเหยื่อ
  if (nightRolesFor("wolf").includes(state.myRole)) {
    const wolfMembers = Object.keys(state.wolf?.members || {})
      .filter((uid) => uid !== state.me);
    const sel = _targetSelect(_aliveTargets());
    nightMsgEl.textContent = "เลือกเหยื่อที่หมาป่าจะฆ่าคืนนี้";
    if (wolfMembers.length) {
      const team = document.createElement("p");
      team.className = "muted";
      team.textContent = `🐺 เพื่อนร่วมทีม: ${wolfMembers.map(_name).join(", ")}`;
      actionFormEl.appendChild(team);
    }
    actionFormEl.appendChild(sel);
    submitBtn.addEventListener("click", async () => {
      if (!sel.value) return nightMsg("เลือกเหยื่อก่อน");
      await _lockSubmit(() => setRoomPath(code, `wolf/votes/${state.me}`, sel.value));
    });
    actionFormEl.appendChild(submitBtn);
    return;
  }

  // Seer / Aura Seer: ตรวจ 1 คน
  if (nightRolesFor("seer").includes(state.myRole)) {
    const sel = _targetSelect(_aliveTargets());
    nightMsgEl.textContent = "ตรวจผู้เล่น 1 คน (ผลให้คนทรงประกาศ)";
    actionFormEl.appendChild(sel);
    submitBtn.addEventListener("click", async () => {
      if (!sel.value) return nightMsg("เลือกคนที่จะตรวจ");
      await _lockSubmit(() => setRoomPath(code, `night/actions/${state.me}`, {
        type: state.myRole, target: sel.value, night: _night(),
      }));
    });
    actionFormEl.appendChild(submitBtn);
    return;
  }

  // หมอ: ป้องกันคนอื่น (ห้ามตัวเอง)
  if (nightRolesFor("guard").includes(state.myRole) && state.myRole === "doctor") {
    const sel = _targetSelect(_aliveTargets(), false);
    nightMsgEl.textContent = "หมอ: ป้องกัน 1 คนจาก wolf kill (ไม่สามารถเลือกตัวเอง)";
    actionFormEl.appendChild(sel);
    submitBtn.addEventListener("click", async () => {
      await _lockSubmit(() => setRoomPath(code, `night/actions/${state.me}`, {
        type: "doctor", target: sel.value, night: _night(),
      }));
    });
    actionFormEl.appendChild(submitBtn);
    return;
  }

  // บอดี้การ์ด: ป้องกันได้ (ตัวเองได้)
  if (nightRolesFor("guard").includes(state.myRole) && state.myRole === "bodyguard") {
    const sel = _targetSelect([state.me, ..._aliveTargets()], false);
    nightMsgEl.textContent = "บอดี้การ์ด: ป้องกัน 1 คนจาก wolf kill (เลือกตัวเองได้)";
    actionFormEl.appendChild(sel);
    submitBtn.addEventListener("click", async () => {
      await _lockSubmit(() => setRoomPath(code, `night/actions/${state.me}`, {
        type: "bodyguard", target: sel.value, night: _night(),
      }));
    });
    actionFormEl.appendChild(submitBtn);
    return;
  }

  // Witch: เลือกโหมด + เป้าหมาย
  if (state.myRole === "witch") {
    const modeSel = document.createElement("select");
    modeSel.className = "select";
    ["heal", "poison"].forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m === "heal" ? "ยาป้องกัน (กู้ชีวิต)" : "ยาพิษ (ฆ่า)";
      modeSel.appendChild(opt);
    });
    const sel = _targetSelect(_aliveTargets());
    nightMsgEl.textContent = "แม่มด: เลือกยาที่จะใช้คืนนี้ (ห้ามใช้สองอย่างพร้อมกัน)";
    actionFormEl.appendChild(modeSel);
    actionFormEl.appendChild(sel);
    submitBtn.addEventListener("click", async () => {
      if (!sel.value) return nightMsg("เลือกเป้าหมาย");
      await _lockSubmit(() => setRoomPath(code, `night/actions/${state.me}`, {
        type: modeSel.value === "heal" ? "witch_heal" : "witch_poison",
        target: sel.value, night: _night(),
      }));
    });
    actionFormEl.appendChild(submitBtn);
    return;
  }

  // Cupid: เลือก 2 คน (คืนแรก)
  if (state.myRole === "cupid") {
    const uids = _aliveTargets();
    const sel1 = _targetSelect(uids);
    const sel2 = _targetSelect(uids);
    nightMsgEl.textContent = "คิวปิด: เลือกคู่รัก 2 คน";
    actionFormEl.appendChild(sel1);
    actionFormEl.appendChild(sel2);
    submitBtn.addEventListener("click", async () => {
      if (!sel1.value || !sel2.value) return nightMsg("เลือกคู่รักให้ครบ 2 คน");
      if (sel1.value === sel2.value) return nightMsg("เลือกคนที่ต่างกัน");
      await _lockSubmit(() => setRoomPath(code, `night/actions/${state.me}`, {
        type: "cupid", targets: [sel1.value, sel2.value], night: _night(),
      }));
    });
    actionFormEl.appendChild(submitBtn);
    return;
  }

  // Cursed / อื่น ๆ ไม่มี action
  actionFormEl.hidden = true;
  nightMsgEl.textContent = state.myRole === "cursed"
    ? "ผู้ต้องสาป: รอคนทรงเรียกเช็กสถานะ (กลางคืนคนทรงแจ้ง)"
    : "บทบาทนี้ไม่มี action ในกลางคืน";
}

async function nightMsg(text) {
  nightMsgEl.textContent = text;
}

async function _lockSubmit(write) {
  if (submitLock) return;
  submitLock = true;
  try {
    await write();
    nightMsgEl.textContent = "บันทึกแล้ว ✓";
    actionFormEl.hidden = true;
  } catch (err) {
    console.error("[nightAction]", err);
    nightMsgEl.textContent = "ส่งไม่ได้: " + err.message;
  } finally {
    submitLock = false;
  }
}

// ── render หลัก ──
function _render() {
  const meta = state.meta;
  if (!meta) return;

  phaseBadge.textContent = meta.phase;
  activeRoleBadge.textContent = meta.activeRole ? `เรียก: ${meta.activeRole}` : "";

  const night = meta.phase === "night";
  nightSectionEl.hidden = !night;
  daySectionEl.hidden = night;

  if (night) {
    const parentActive = nightRolesFor(meta.activeRole ?? "").includes(state.myRole);
    const wolfTurn = meta.activeRole === "wolf" && nightRolesFor("wolf").includes(state.myRole);

    if (state.myAction) {
      nightMsgEl.textContent = "ส่ง action ไปแล้ว (คนทรงจะเรียกถ้าต้องแก้)";
      actionFormEl.hidden = true;
    } else if (parentActive || wolfTurn) {
      _buildActionForm();
    } else {
      actionFormEl.hidden = true;
      nightMsgEl.textContent = "รอคนทรงเรียกบทบาทคุณ...";
    }
  } else {
    dayMsgEl.textContent = "กลางวัน — โหมดคุยกัน (ระบบกลางวันมา Day 8-9)";
  }
}

// ── init ──
async function _init() {
  const myUid = await ensureAuth();
  state.me = myUid;

  const room = await getRoom(code);
  if (!room) {
    window.location.href = "index.html";
    return;
  }
  if (!(myUid in room.players)) {
    alert("คุณไม่ได้อยู่ในห้องนี้");
    window.location.href = "index.html";
    return;
  }

  state.myRole = (await getRole(code, myUid))?.role ?? null;
  if (!state.myRole) {
    alert("เกมยังไม่แจกบทบาท กลับไป lobby รอ");
    window.location.href = `lobby.html?code=${code}`;
    return;
  }
  _renderRole();
  heroTitle.textContent = `ผู้เล่น: ${room.players[myUid].name}`;

  // ฟัง meta + players + action ตัวเอง + wolf (ถ้าเป็นหมาป่า)
  const subs = [];
  subs.push(onValue(ref(db, `rooms/${code}/meta`), (snap) => {
    state.meta = snap.exists() ? snap.val() : null;
    _render();
  }));
  subs.push(onValue(ref(db, `rooms/${code}/players`), (snap) => {
    state.players = snap.exists() ? snap.val() : {};
    _render();
  }));
  subs.push(onValue(ref(db, `rooms/${code}/night/actions/${myUid}`), (snap) => {
    state.myAction = snap.exists() ? snap.val() : null;
    _render();
  }, _ignoreErr));
  subs.push(onValue(ref(db, `rooms/${code}/wolf`), (snap) => {
    state.wolf = snap.exists() ? snap.val() : {};
    _render();
  }, _ignoreErr));

  document.getElementById("leaveLink").addEventListener("click", () => subs.forEach((off) => off()));

  root.hidden = false;
}

try {
  await _init();
} catch (err) {
  console.error("[player]", err);
  alert("เข้าหน้าผู้เล่นไม่ได้: " + err.message);
  window.location.href = "index.html";
}
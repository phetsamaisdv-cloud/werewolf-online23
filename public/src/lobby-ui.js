// UI logic ของ lobby.html — แสดงรหัสห้อง + รายชื่อผู้เล่นเรียลไทม์ + host เริ่มเกม
import { ensureAuth, listenRoom, getRole, updateRoom } from "./firebase.js";
import { ROLE } from "./roles.js";
import { assignRoles } from "./game.js";

const MIN_PLAYERS_TO_START = 5;
const MAX_PLAYERS = 16;

const root = document.getElementById("lobbyRoot");
const roomCodeEl = document.getElementById("roomCodeValue");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const playerListEl = document.getElementById("playerList");
const playerCountEl = document.getElementById("playerCount");
const statusMsgEl = document.getElementById("statusMsg");
const hostControlsEl = document.getElementById("hostControls");
const startBtn = document.getElementById("startBtn");
const leaveLink = document.getElementById("leaveLink");
const roleCardAreaEl = document.getElementById("roleCardArea");
const roleCardEl = document.getElementById("roleCard");
const goPlayerBtn = document.getElementById("goPlayerBtn");

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

// ไม่มีรหัสห้อง → กลับหน้าแรก
if (!code) {
  window.location.href = "index.html";
}

let myUid = null;
let isHost = false;
let currentPlayers = {};

// คัดลอกรหัสห้องใส่ clipboard
copyCodeBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(code);
    copyCodeBtn.textContent = "คัดลอกแล้ว ✓";
    setTimeout(() => (copyCodeBtn.textContent = "คัดลอก"), 1500);
  } catch (err) {
    console.error("[copyCode]", err);
  }
});

// แสดงผู้เล่น 1 คนในรายการ
function _renderPlayer(uid, data, hostUid) {
  const li = document.createElement("li");
  li.className = "player-item";

  const nameWrap = document.createElement("div");
  nameWrap.className = "player-item__name";

  if (uid === myUid) {
    const you = document.createElement("span");
    you.className = "tag tag--you";
    you.textContent = "คุณ";
    nameWrap.appendChild(you);
  }
  if (uid === hostUid) {
    const tag = document.createElement("span");
    tag.className = "tag tag--host";
    tag.textContent = "คนทรง";
    nameWrap.appendChild(tag);
  }

  nameWrap.appendChild(document.createTextNode(data?.name ?? "?"));

  if (uid === myUid && !isHost) {
    const hint = document.createElement("small");
    hint.className = "muted";
    hint.textContent = " รอคนทรงเริ่มเกม";
    nameWrap.appendChild(hint);
  }

  li.appendChild(nameWrap);
  playerListEl.appendChild(li);
}

// แสดง Role Card ของตัวเองเมื่อเกมเริ่มแล้ว
async function _showMyRole() {
  try {
    const data = await getRole(code, myUid);
    if (!data) return;

    const r = ROLE[data.role];
    if (!r) return;

    roleCardAreaEl.hidden = false;
    goPlayerBtn.href = `player.html?code=${code}`;
    roleCardEl.innerHTML = `
      <img class="role-card__icon" src="${r.iconPath}" alt="${r.nameTH}" onerror="this.style.display='none'">
      <div class="role-card__name">${r.nameTH}</div>
      <div class="role-card__en">${r.nameEN}</div>
      <div class="role-card__desc">${r.description}</div>
    `;
  } catch (err) {
    console.error("[roleCard]", err);
  }
}

// อัปเดต UI ทั้งหมดจาก state ห้อง
function _render(room) {
  const { meta, players } = room;
  const count = Object.keys(players || {}).length;
  isHost = meta?.hostUid === myUid;
  currentPlayers = players || {};

  roomCodeEl.textContent = code;
  playerCountEl.textContent = `${count}/${MAX_PLAYERS}`;

  playerListEl.innerHTML = "";
  Object.entries(players || {}).forEach(([uid, data]) => _renderPlayer(uid, data, meta?.hostUid));

  if (meta?.phase !== "lobby") {
    statusMsgEl.textContent = isHost
      ? "เกมเริ่มแล้ว — เปิดหน้าคนทรง"
      : "เกมเริ่มแล้ว — ไปที่หน้าผู้เล่น";
    hostControlsEl.hidden = true;
    startBtn.disabled = true;
    _showMyRole();
    return;
  }

  // ยังอยู่ใน lobby
  hostControlsEl.hidden = !isHost;
  if (isHost) {
    const enough = count >= MIN_PLAYERS_TO_START;
    startBtn.disabled = !enough;
    statusMsgEl.textContent = enough
      ? `มีผู้เล่น ${count} คน พร้อมเริ่มเกม`
      : `รอผู้เล่นอย่างน้อย ${MIN_PLAYERS_TO_START} คน (ตอนนี้ ${count})`;
  } else {
    statusMsgEl.textContent = "รอคนทรงเริ่มเกม...";
  }
}

// host กดเริ่มเกม → แจกบทบาท + เขียนไป Firebase + เปลี่ยน phase
startBtn.addEventListener("click", async () => {
  try {
    startBtn.disabled = true;
    statusMsgEl.textContent = "กำลังแจกบทบาท...";

    const players = currentPlayers;
    const uids = Object.keys(players).filter((uid) => players[uid]?.alive);
    if (uids.length < MIN_PLAYERS_TO_START) {
      throw new Error(`ต้องมีผู้เล่นอย่างน้อย ${MIN_PLAYERS_TO_START} คน`);
    }

    const { assignments, wolfMembers } = assignRoles(uids);

    // เขียนแบบ atomic: roles + wolf members + phase (ตาม Data Schema)
    const writes = { "meta/phase": "night" };
    Object.entries(assignments).forEach(([uid, role]) => {
      writes[`secret/roles/${uid}`] = { role, team: ROLE[role].team };
    });
    writes["wolf/members"] = wolfMembers;

    await updateRoom(code, writes);
    statusMsgEl.textContent = "เริ่มเกมแล้ว";
  } catch (err) {
    console.error("[startGame]", err);
    statusMsgEl.textContent = "เริ่มเกมไม่ได้: " + err.message;
    startBtn.disabled = false;
  }
});

try {
  myUid = await ensureAuth();
  const roomRef = listenRoom(code, _render);

  // ออกจากห้อง → เลิกฟัง Firebase + กลับหน้าแรก
  leaveLink.addEventListener("click", () => {
    roomRef();
  });

  root.hidden = false;
} catch (err) {
  console.error("[lobby]", err);
  statusMsgEl.textContent = "เข้า lobby ไม่ได้: " + err.message;
  root.hidden = false;
}
// UI logic ของ lobby.html — แสดงรหัสห้อง + รายชื่อผู้เล่นเรียลไทม์ + host เริ่มเกม
import { ensureAuth, listenRoom } from "./firebase.js";

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

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

// ไม่มีรหัสห้อง → กลับหน้าแรก
if (!code) {
  window.location.href = "index.html";
}

let myUid = null;
let isHost = false;

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

// อัปเดต UI ทั้งหมดจาก state ห้อง
function _render(room) {
  const { meta, players } = room;
  const count = Object.keys(players || {}).length;
  isHost = meta?.hostUid === myUid;

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

// host กดเริ่มเกม — build ระบบแจก role มาใน Day 4-5
startBtn.addEventListener("click", () => {
  statusMsgEl.textContent = "ระบบแจกบทบาทจะมาใน Day 4-5 (รอคำสั่งถัดไป)";
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
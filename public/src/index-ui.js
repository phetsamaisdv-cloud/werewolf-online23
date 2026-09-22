// UI logic ของหน้าแรก (สร้าง/เข้าห้อง)
import { createRoom, joinRoom } from "./firebase.js";

const STORAGE_KEY = "werewolf_player_name";

const nameInput = document.getElementById("playerName");
const nameError = document.getElementById("nameError");
const roomError = document.getElementById("roomError");
const roomCodeInput = document.getElementById("roomCode");
const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");

// โหลดชื่อเก่าจาก localStorage มาใส่ให้
function _loadSavedName() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) nameInput.value = saved;
}

// บันทึกชื่อ + คืนชื่อที่ผ่านการ validate แล้ว
function _getValidName() {
  const name = nameInput.value.trim();
  nameError.hidden = true;
  if (!name) {
    nameError.textContent = "กรุณาใส่ชื่อผู้เล่น";
    nameError.hidden = false;
    return null;
  }
  localStorage.setItem(STORAGE_KEY, name);
  return name;
}

// แสดงข้อผิดพลาดของส่วนห้อง
function _showRoomError(message) {
  roomError.textContent = message;
  roomError.hidden = !message;
}

// สร้างห้อง → ไป lobby
async function _onCreate() {
  _showRoomError(null);
  const name = _getValidName();
  if (!name) return;

  try {
    createBtn.disabled = true;
    createBtn.textContent = "กำลังสร้างห้อง...";
    const code = await createRoom(name);
    window.location.href = `lobby.html?code=${code}`;
  } catch (err) {
    _showRoomError(err.message || "สร้างห้องไม่สำเร็จ");
    createBtn.disabled = false;
    createBtn.textContent = "สร้างห้อง";
  }
}

// เข้าห้อง → ไป lobby
async function _onJoin() {
  _showRoomError(null);
  const name = _getValidName();
  if (!name) return;

  const code = roomCodeInput.value.trim();
  if (code.length !== 4) {
    _showRoomError("รหัสห้องต้องเป็น 4 หลัก");
    return;
  }

  try {
    joinBtn.disabled = true;
    joinBtn.textContent = "กำลังเข้าห้อง...";
    await joinRoom(code, name);
    window.location.href = `lobby.html?code=${code}`;
  } catch (err) {
    _showRoomError(err.message || "เข้าห้องไม่สำเร็จ");
    joinBtn.disabled = false;
    joinBtn.textContent = "เข้าห้อง";
  }
}

createBtn.addEventListener("click", _onCreate);
joinBtn.addEventListener("click", _onJoin);
roomCodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") _onJoin();
});
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") _onCreate();
});

_loadSavedName();
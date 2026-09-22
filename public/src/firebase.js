// Firebase init + auth + room CRUD
// ใช้ Firebase v9 modular SDK — ห้ามใช้ compat

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, get, set, update, remove, onValue } from "firebase/database";

// ค่าจาก Firebase Console (Project: werewolf-online23)
const firebaseConfig = {
  apiKey: "AIzaSyCAkC4zq9ntCkq370R2hsMlrxnUkE0546A",
  authDomain: "werewolf-online23.firebaseapp.com",
  databaseURL: "https://werewolf-online23-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "werewolf-online23",
  storageBucket: "werewolf-online23.firebasestorage.app",
  messagingSenderId: "180903285789",
  appId: "1:180903285789:web:2350426ae24fe811ef62f4",
};

const MAX_PLAYERS = 16;
const ROOM_CODE_LENGTH = 4;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Anonymous auth ครั้งแรก — คืน uid ของผู้ใช้
export async function ensureAuth() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser.uid;
  } catch (err) {
    console.error("[ensureAuth]", err);
    throw err;
  }
}

// อ่านข้อมูลห้องครั้งเดียว
export async function getRoom(code) {
  try {
    const snap = await get(ref(db, `rooms/${code}`));
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.error("[getRoom]", err);
    throw err;
  }
}

// สร้าง/เขียนข้อมูลห้อง (atomic update)
export async function updateRoom(code, data) {
  try {
    await update(ref(db, `rooms/${code}`), data);
  } catch (err) {
    console.error("[updateRoom]", err);
    throw err;
  }
}

// ฟังห้องแบบ realtime — คืน callback สำหรับ unsubscribe
export function listenRoom(code, callback) {
  try {
    const roomRef = ref(db, `rooms/${code}`);
    return onValue(roomRef, (snap) => {
      if (snap.exists()) callback(snap.val());
    });
  } catch (err) {
    console.error("[listenRoom]", err);
    throw err;
  }
}

// เขียนข้อมูล ณ path ใด ๆ ในห้อง
export async function setRoomPath(code, path, data) {
  try {
    await set(ref(db, `rooms/${code}/${path}`), data);
  } catch (err) {
    console.error("[setRoomPath]", err);
    throw err;
  }
}

// ลบข้อมูล ณ path ใด ๆ ในห้อง
export async function removeRoomPath(code, path) {
  try {
    await remove(ref(db, `rooms/${code}/${path}`));
  } catch (err) {
    console.error("[removeRoomPath]", err);
    throw err;
  }
}

// สุ่มรหัสห้อง 4 หลัก (ตัวเลข)
function _generateRoomCode() {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

// สร้างห้องใหม่ → คืนรหัสห้อง (ตรวจรหัสซ้ำแล้ว)
export async function createRoom(name, avatar = "") {
  try {
    const uid = await ensureAuth();
    if (!name || !name.trim()) throw new Error("ต้องใส่ชื่อผู้เล่น");

    // วนลูปสุ่มรหัสจนกว่าจะไม่ซ้ำ
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = _generateRoomCode();
      const roomRef = ref(db, `rooms/${code}`);
      const snap = await get(roomRef);
      if (snap.exists()) continue;

      // สร้างห้องตาม Data Schema (แผนข้อ 8)
      const roomData = {
        meta: {
          phase: "lobby",
          hostUid: uid,
          hostUid2: null,
          day: 1,
          settings: {
            revealRoleOnDeath: true,
            timers: { night: 60, day: 180, vote: 90 },
            useCenterCards: false,
            useCustomRoles: false,
          },
          winner: null,
        },
        players: {
          [uid]: {
            name: name.trim(),
            alive: true,
            joinedAt: Date.now(),
            voteTarget: null,
            revealed: false,
            avatar,
          },
        },
      };

      await set(roomRef, roomData);
      return code;
    }
    throw new Error("สร้างห้องไม่ได้ ให้ลองใหม่");
  } catch (err) {
    console.error("[createRoom]", err);
    throw err;
  }
}

// เข้าห้องที่มีอยู่แล้ว → คืนข้อมูลห้อง
export async function joinRoom(code, name, avatar = "") {
  try {
    const uid = await ensureAuth();
    if (!name || !name.trim()) throw new Error("ต้องใส่ชื่อผู้เล่น");
    if (!code || String(code).length !== ROOM_CODE_LENGTH) throw new Error("รหัสห้องต้องเป็น 4 หลัก");

    const roomRef = ref(db, `rooms/${code}`);
    const snap = await get(roomRef);
    if (!snap.exists()) throw new Error("ห้องไม่มี แจ้งเพื่อนเช็กรหัสอีกที");

    const room = snap.val();
    const playerCount = Object.keys(room.players || {}).length;
    if (playerCount >= MAX_PLAYERS) throw new Error("ห้องเต็ม (16 คนแล้ว)");
    if (room.meta?.phase !== "lobby") throw new Error("เกมเริ่มไปแล้ว เข้าห้องไม่ได้");

    // เพิ่ม/อัปเดตผู้เล่นตัวเอง
    const now = Date.now();
    const playerData = {
      name: name.trim(),
      alive: true,
      joinedAt: room.players?.[uid]?.joinedAt ?? now,
      voteTarget: null,
      revealed: false,
      avatar: room.players?.[uid]?.avatar ?? avatar,
    };

    await update(ref(db, `rooms/${code}/players/${uid}`), playerData);
    return room;
  } catch (err) {
    console.error("[joinRoom]", err);
    throw err;
  }
}
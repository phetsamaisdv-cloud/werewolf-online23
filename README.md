# 🐺 Werewolf Online v2.2

Social Deduction Web Game — เล่น 5–16 คน + คนทรง 1–2 คน
Mobile-first Web App ฟรี 100% ด้วย Firebase Realtime DB + Netlify + Vanilla JS (ES modules)

## Requirements

- Node.js ≥ 18
- npm
- บัญชี Firebase (Console) + Netlify (deploy)

## ติดตั้ง

```bash
npm install
```

## รัน local (Firebase emulator/server)

```bash
npm run dev
```

> ก่อนใช้งานจริงต้องใส่ค่า Firebase config ใน `public/src/firebase.js` (placeholder อยู่ `PLACEHOLDER`)

## Deploy

```bash
npm run deploy      # deploy ผ่าน firebase-tools
```

หรือผ่าน Netlify:
- Build command: (เว้นว่าง)
- Publish directory: `public`

Push ขึ้น GitHub → Netlify deploy อัตโนมัติ

## โครงสร้างไฟล์ (สั้น ๆ)

```
werewolf-online/
├── public/
│   ├── index.html       # สร้าง/เข้าห้อง
│   ├── lobby.html       # รอผู้เล่น
│   ├── host.html        # หน้าคนทรง
│   ├── player.html      # หน้าผู้เล่น
│   ├── end.html         # จบเกม
│   ├── settings.html    # ตั้งค่า
│   ├── help.html        # กติกา
│   ├── profile.html     # โปรไฟล์
│   └── src/
│       ├── firebase.js  # Firebase init + auth + room CRUD
│       ├── style.css    # CSS mobile-first
│       └── __tests__/   # unit tests
├── assets/
│   ├── roles/
│   ├── ui/
│   └── bg/
├── firebase.json
├── firebase-rules.json
├── package.json
├── AGENTS.md
└── แผนโปรเจค-v2.2.md
```

## เอกสาร

- รายละเอียดเกม + กติกา + Roles: `แผนโปรเจค-v2.2.md`
- กฎการเขียนโค้ดสำหรับ AI Agent: `AGENTS.md`
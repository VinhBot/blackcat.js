# {{name}}

Discord bot tạo bằng [`create-blackcat-bot`](https://www.npmjs.com/package/create-blackcat-bot), chạy trên [blackcat.js-discord](https://www.npmjs.com/package/blackcat.js-discord).

## 🚀 Bắt đầu

1. Vào [Discord Developer Portal](https://discord.com/developers/applications), tạo ứng dụng → **Bot** → **Reset Token**.
2. Cũng trong trang **Bot**, bật **Message Content Intent** (cần cho lệnh dùng prefix).
3. Mở file `.env` và điền `BOT_TOKEN` (tuỳ chọn: `GUILD_IDS` để slash command hiện ngay trong server thử nghiệm).
4. Mời bot vào server bằng OAuth2 → URL Generator (scope `bot` + `applications.commands`).
5. Chạy bot:

```bash
{{runDev}}
```

## 🗂️ Cấu trúc

```
src/
├─ index.ts / index.js    # khởi tạo Client và các manager
├─ commands/              # message command (prefix) — thư mục con = category
├─ slashCommands/         # slash command
├─ contextMenus/          # chuột phải vào người dùng / tin nhắn
└─ events/                # event của discord.js (theo scope)
```

Mỗi file trong các thư mục trên `export default` một lệnh và được nạp tự động. Xem sẵn các ví dụ:

| File | Minh hoạ |
|---|---|
| `commands/general/say` | argument có kiểu cho message command |
| `commands/admin/toggle` | bật/tắt lệnh theo server (`commandManager.disable`) |
| `slashCommands/general/search` | autocomplete |
| `slashCommands/general/feedback` | modal |
| `contextMenus/user/userinfo`, `contextMenus/message/charcount` | context menu |

Tài liệu đầy đủ: https://blackcatjs-discord-docs.vercel.app/

> 🔐 Không commit file `.env` (đã nằm trong `.gitignore`).

# create-blackcat-bot

Tạo nhanh một dự án Discord bot dùng [blackcat.js-discord](https://www.npmjs.com/package/blackcat.js-discord).

```bash
npx create-blackcat-bot my-bot
```

CLI sẽ hỏi bạn chọn **TypeScript** hay **JavaScript**, sinh sẵn cấu trúc thư mục kèm ví dụ cho:

- message command (prefix) và **argument có kiểu**
- bật/tắt lệnh theo server
- slash command + **autocomplete**
- **modal**
- **context menu** (chuột phải vào người dùng / tin nhắn)
- event

Sau đó chỉ cần điền `BOT_TOKEN` vào file `.env` và chạy `npm run dev`.

## Tuỳ chọn

| Cờ | Ý nghĩa |
|---|---|
| `--ts` / `--js` | Chọn ngôn ngữ (mặc định TypeScript) |
| `--pm <npm\|pnpm\|yarn\|bun>` | Trình quản lý gói (mặc định: tự nhận) |
| `--install` / `--no-install` | Có cài dependencies ngay hay không |
| `-y`, `--yes` | Bỏ qua mọi câu hỏi |
| `-f`, `--force` | Cho phép ghi vào thư mục đã có file |
| `-h`, `--help` / `-v`, `--version` | Trợ giúp / phiên bản |

```bash
npx create-blackcat-bot my-bot --js --pm pnpm --no-install -y
```

Yêu cầu Node.js ≥ 18 để chạy CLI; dự án được tạo ra yêu cầu Node.js ≥ 20.12.

## Giấy phép

MIT

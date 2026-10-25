# Changelog

## 1.1.0

### ✨ Tính năng mới

- **Autocomplete cho slash command** — thêm `autocomplete` vào option `string` / `integer` / `number`; hoạt động cả trong subcommand và group. Tự cắt 25 gợi ý, trả danh sách rỗng khi handler lỗi hoặc lệnh bị tắt.
- **Context Menu Command** — `ContextMenuBuilder` + `ContextMenuManager` (chuột phải vào người dùng / tin nhắn), hỗ trợ `cooldown`, `permission`, `defaultMemberPermissions`. Được đăng ký **chung** với slash command để không ghi đè lẫn nhau.
- **Argument có kiểu cho message command** — `options: (a) => ({ ... })` với `string`, `integer`, `number`, `boolean`, `duration`, `user`, `member`, `role`, `channel`; hỗ trợ `rest`, ngoặc kép, `choices`, `min`/`max`; báo lỗi kèm cách dùng (`argumentErrorResponse` để tuỳ biến). `execute` nhận thêm tham số thứ 4 `options`.
- **Modal Builder** — `ModalBuilder` với ô nhập typed (`short` / `paragraph`), `show()` tự chờ và đọc dữ liệu, kiểm tra giới hạn của Discord.
- **Bật/tắt lệnh theo guild** — `disable()` / `enable()` / `isDisabled()` / `getDisabledCommands()` / `exportDisabled()` / `importDisabled()` trên `commandManager`, `slashCommandManager` và `contextMenuManager`; tuỳ chọn `disabledResponse` và `onToggle`.
- **CLI `create-blackcat-bot`** — package riêng trong thư mục `create-blackcat-bot/`, sinh dự án TypeScript/JavaScript có sẵn ví dụ cho mọi tính năng.

### 🔧 Thay đổi khác

- `CommandBuilder` có thêm generic thứ hai `TArgs` (mặc định `undefined`, tương thích ngược) và `setOptions()`.
- `Client` có thêm `contextMenuManager` và `contextMenuCommands`.
- `registerCommand()` của `CommandManager` chấp nhận `CommandBuilder` có `options`.
- Thêm bộ test (`npm test`) và ví dụ cho mọi tính năng mới trong `test/`.

### ♻️ Tương thích ngược

Không có breaking change: lệnh cũ vẫn nhận `(client, message, args)` và slash command cũ không cần sửa.

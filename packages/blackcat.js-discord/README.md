<div align="center">

# 🐈‍⬛ blackcat.js-discord

### Xây Discord Bot nhanh như chớp, gọn như mèo, an toàn như TypeScript.

Một lớp bao bọc mạnh mẽ cho **discord.js** — gom **message command**, **slash command**, **event**, **cooldown** và **permission** về một cấu trúc rõ ràng, dễ mở rộng.

[![npm version](https://img.shields.io/npm/v/blackcat.js-discord?style=for-the-badge&logo=npm&color=cb3837)](https://www.npmjs.com/package/blackcat.js-discord)
[![npm downloads](https://img.shields.io/npm/dm/blackcat.js-discord?style=for-the-badge&color=blueviolet)](https://www.npmjs.com/package/blackcat.js-discord)
[![license](https://img.shields.io/npm/l/blackcat.js-discord?style=for-the-badge&color=green)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-ready-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)

[📖 Tài liệu](https://blackcatjs-discord-docs.vercel.app/) · [🐛 Báo lỗi](https://github.com/VinhBot/blackcat.js/issues) · [📦 npm](https://www.npmjs.com/package/blackcat.js-discord)

</div>

---

## 🤔 Tại sao lại là blackcat.js-discord?

Viết bot bằng discord.js thuần, bạn sẽ sớm phải tự làm: load file lệnh, đăng ký slash command, kiểm tra quyền, chống spam, chia category… Thư viện này làm sẵn tất cả, để bạn chỉ cần **tập trung vào logic của lệnh**.

```ts
// Chỉ cần vài dòng là có một lệnh hoàn chỉnh, có cooldown + kiểm tra quyền
const ping = new CommandBuilder({
    commandName: "ping",
    cooldown: { duration: "5s", scope: ["user"] },
    permission: { userPermissions: ["SendMessages"] },
    execute: (client, message) => message.reply(`🏓 Pong! ${client.discord.ws.ping}ms`),
});
```

## ✨ Tính năng nổi bật

| | Tính năng | Mô tả |
|---|---|---|
| ⚡ | **Builder rõ ràng** | `CommandBuilder`, `SlashCommandBuilder`, `EventBuilder` — dùng dạng object hoặc chuỗi method (fluent) tuỳ thích |
| 🧩 | **Slash command strongly-typed** | Khai báo `options` xong là `options.xxx` tự có kiểu chính xác, không cần ép kiểu |
| 🔎 | **Autocomplete** | Gợi ý theo lúc gõ cho option `string` / `integer` / `number`, dùng được cả trong subcommand & group |
| 🖱️ | **Context Menu** | Lệnh chuột phải vào người dùng / tin nhắn, đăng ký chung với slash command |
| 🧾 | **Argument có kiểu cho message command** | `options: (a) => ({ user: a.user(), days: a.integer() })` — tự parse, kiểm tra và báo lỗi kèm cách dùng |
| 📝 | **Modal Builder** | Form popup có ô nhập typed, tự chờ và đọc dữ liệu: `await modal.show(interaction)` |
| 🔌 | **Bật/tắt lệnh theo guild** | `commandManager.disable("ping", guildID)` — áp dụng cho message, slash và context menu |
| 🌳 | **Subcommand & Group** | Hỗ trợ đầy đủ `subcommands`, `groups` và cả hai cùng lúc, kèm `payload` được typed |
| ⏱️ | **Cooldown thông minh** | Theo `user`, `role`, `guild`, `global` — kết hợp nhiều scope cùng lúc |
| 👑 | **Giảm cooldown theo role** | `roleWeights` cho phép VIP chờ ít hơn (vd: `0.5` = giảm một nửa) |
| 🚪 | **Bypass cooldown** | `permissionBypass` cho Admin/Mod khỏi phải chờ |
| 🔒 | **Permission linh hoạt** | Quyền user/bot, whitelist/blacklist user & role, chặn/cho phép DM, `onlyOwner`… |
| 📑 | **Phân trang sẵn có** | `PaginationBuilder` với dữ liệu tĩnh hoặc tải động (`pageLoader`) + cache |
| 🎛️ | **Component Builder** | Tạo button, select menu, action row gọn gàng |
| 🗂️ | **Tự động phân loại** | Lệnh được xếp `category` theo tên thư mục chứa nó |
| 📂 | **Auto-load** | Quét thư mục để nạp lệnh/event, có hook `onLoad` / `onError` |
| 🧰 | **Hàm tiện ích** | `parseTime`, `delay`, `findUser`, `findChannel`, `findRole` |
| 🚀 | **CLI tạo dự án** | `npx create-blackcat-bot` sinh sẵn cấu trúc thư mục + ví dụ chạy được ngay |
| 📦 | **ESM + CJS** | Hỗ trợ cả `import` và `require`, kèm file kiểu `.d.ts` |

> 🆕 **Mới ở 1.1.0:** [Autocomplete](#-autocomplete) · [Context Menu](#️-context-menu) · [Argument có kiểu](#-argument-có-kiểu-cho-message-command) · [Modal](#-modal) · [Bật/tắt lệnh theo guild](#-bậttắt-lệnh-theo-guild) · [CLI `create-blackcat-bot`](#-cli--create-blackcat-bot). Tất cả đều **tương thích ngược** — code cũ không cần sửa.

---

## 📦 Cài đặt

```bash
npm install blackcat.js-discord
```

```bash
yarn add blackcat.js-discord
```

```bash
pnpm add blackcat.js-discord
```

> ℹ️ **Yêu cầu:** Node.js **≥ 20** (khuyến nghị 22 LTS) và discord.js **^14.25**.
>
> 💡 `Client` của thư viện **bọc** client discord.js gốc. Muốn dùng client gốc, hãy truy cập qua `client.discord` (ví dụ `client.discord.ws.ping`).

### ⚡ Cách nhanh nhất: dùng CLI

Không muốn tự dựng khung dự án? Một lệnh là đủ:

```bash
npx create-blackcat-bot my-bot
```

CLI sẽ hỏi bạn chọn TypeScript/JavaScript, sinh sẵn cấu trúc thư mục kèm ví dụ cho mọi tính năng, tạo file `.env` và (tuỳ chọn) cài dependencies. Xem chi tiết ở mục [CLI](#-cli--create-blackcat-bot).

---

## 🚀 Bắt đầu nhanh trong 3 bước

### 1️⃣ Gợi ý cấu trúc thư mục

```
discord_bot/
├─ commands/            # message command (prefix)
│  ├─ general/
│  ├─ admin/
│  └─ moderation/
├─ slashCommands/       # slash command
│  ├─ general/
│  ├─ admin/
│  └─ moderation/
├─ contextMenus/        # context menu (chuột phải)
│  ├─ user/
│  └─ message/
├─ events/              # event của discord.js
│  ├─ client/
│  └─ guild/
├─ .env                 # BOT_TOKEN=...   (đừng commit file này!)
└─ index.ts
```

> 📁 Tên thư mục con của `commands/` sẽ được dùng làm **category** cho lệnh.

### 2️⃣ Khởi tạo Client

```ts
import { Client, CommandManager, ContextMenuManager, EventManager, SlashCommandManager } from "blackcat.js-discord";
import { GatewayIntentBits, Partials } from "discord.js";

const config = {
    botToken: process.env.BOT_TOKEN!, // ⚠️ Không hardcode token vào source
    prefix: "!",
    ownerID: "ID_CHU_BOT",            // string hoặc string[] (tuỳ chọn)
};

const client = new Client({
    discordClientOptions: {
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
        allowedMentions: { parse: ["users", "roles"], repliedUser: false },
    },
    config,

    // 🎧 Event
    eventManager: new EventManager({
        directory: "./events",
        scopes: ["client", "guild"], // tên các thư mục con chứa event
        onLoad: (event) => console.log(`✅ ${event.file}`),
        onError: (event) => console.error(`❌ ${event.file}:`, event.error),
    }),

    // 💬 Message command
    commandManager: new CommandManager({
        directory: "./commands",
        prefix: config.prefix,
        mentionPrefixResponse: (prefix) => ({ content: `Prefix của mình là: ${prefix}` }),
        onLoad: (command) => console.log(`✅ commands: ${command.commandName}`),
        onError: (command) => console.error(`❌ ${command.file}:`, command.error),
    }),

    // ⚡ Slash command
    slashCommandManager: new SlashCommandManager({
        directory: "./slashCommands",
        guildID: "GUILD_ID",       // bỏ qua để áp dụng cho mọi guild bot tham gia
        reset: { guild: true },    // xoá & đăng ký lại command mỗi lần khởi động
        onLoad: (command) => console.log(`✅ slashCommands: ${command.commandName}`),
        onError: (command) => console.error(`❌ ${command.file}:`, command.error),
    }),

    // 🖱️ Context menu (chuột phải vào người dùng / tin nhắn) — tuỳ chọn
    contextMenuManager: new ContextMenuManager({
        directory: "./contextMenus",
        onLoad: (command) => console.log(`✅ contextMenus: ${command.commandName}`),
        onError: (command) => console.error(`❌ ${command.file}:`, command.error),
    }),
});

client.start();
```

### 3️⃣ Viết lệnh đầu tiên

Tạo file `commands/general/ping.ts`:

```ts
import { CommandBuilder } from "blackcat.js-discord";

export default new CommandBuilder({
    commandName: "ping",
    description: "Xem độ trễ của bot",
    execute: (client, message) => {
        return message.reply(`🏓 Pong! Ping của mình là **${client.discord.ws.ping}ms**`);
    },
});
```

Xong! Gõ `!ping` trong server của bạn là bot trả lời ngay. 🎉

> 💡 Muốn thêm lệnh bằng code thay vì quét thư mục? Dùng `client.commandManager.registerCommand([cmd1, cmd2])`.

---

## 🎧 Event

```ts
import { EventBuilder } from "blackcat.js-discord";

export default new EventBuilder({
    eventName: "clientReady",
    once: true,
    execute: async (client, bot) => {
        console.log(`🐈‍⬛ Bot đã sẵn sàng! Đăng nhập với tên ${bot.user.tag}`);
    },
});
```

---

## 💬 Message Command

Có hai cách viết, kết quả giống hệt nhau — chọn cách bạn thích.

### 🅰️ Dạng object

```ts
import { CommandBuilder, PermissionLevel } from "blackcat.js-discord";

export default new CommandBuilder({
    commandName: "hello",
    description: "Chào hỏi một chút",
    aliases: ["hi", "xinchao"],
    category: "general",
    usage: "hello",

    cooldown: {
        duration: "5s",
        scope: ["role"],
        // Key là ID role, value là hệ số nhân thời gian gốc (0.1 = còn 10%, tức giảm 90%)
        roleWeights: (guildID, memberID) => ({ ID_ROLE_VIP: 0.5 }),
        // Admin & Mod không cần chờ (có thể truyền 1 giá trị hoặc 1 mảng)
        permissionBypass: [PermissionLevel.ADMIN, PermissionLevel.MOD],
        message: (ms, ctx) => `Này <@${ctx.userId}>, chờ ${ms} giây nữa rồi dùng lại lệnh ${ctx.commandName} nhé!`,
    },

    permission: {
        userPermissions: ["SendMessages"],
        botPermissions: ["SendMessages"],
        // allowedRoleIds: ["ID_ROLE"],   // chỉ cho role này dùng
        // allowedUserIds: ["ID_USER"],    // chỉ cho user này dùng
        // blockedUserIds: ["ID_USER"],    // chặn user này
        // allowDM: false,                 // cho phép dùng trong tin nhắn riêng?
        // allowGuild: true,               // cho phép dùng trong server?
        // onlyOwner: true,                // chỉ chủ bot
    },

    execute: async (client, message, args) => {
        await message.reply(`Xin chào ${message.author}! 👋`);
    },
});
```

### 🅱️ Dạng fluent (chuỗi method)

```ts
import { CommandBuilder } from "blackcat.js-discord";

const ping = new CommandBuilder<true>(); // <true> = lệnh chỉ dùng trong server

ping.setName("ping");
ping.setDescription("Replies with Pong!");
ping.setCooldown({
    duration: 5,          // số = giây, chuỗi = "5s", "1h 30m"...
    scope: ["role"],
    message: (ms, ctx) => ({ content: `Này <@${ctx.userId}>, chờ ${ms} giây nhé!` }),
});
ping.setPermission({
    userPermissions: ["SendMessages"],
    allowGuild: true,
    message: (ctx) => ({ content: `Bạn không đủ quyền dùng lệnh ${ctx.commandName}` }),
});
ping.setExecute(async (client, message) => {
    await message.reply({ content: `Ping của tôi là: ${client.discord.ws.ping}` });
});

export default ping;
```

---

### 🧾 Argument có kiểu cho message command

Khai báo `options` giống hệt slash command — thư viện tự tách tin nhắn, đổi kiểu, kiểm tra giá trị và **báo lỗi kèm cách dùng** nếu người dùng nhập sai. `execute` chỉ nhận dữ liệu đã hợp lệ.

```ts
import { CommandBuilder } from "blackcat.js-discord";

// Gõ: !ban @user 3 spam link liên tục
export default new CommandBuilder({
    commandName: "ban",
    description: "Ban một thành viên",
    options: (a) => ({
        user: a.user({ required: true, description: "người bị ban" }),
        days: a.integer({ min: 0, max: 7, description: "số ngày xoá tin nhắn" }),
        reason: a.string({ rest: true, description: "lý do" }),
    }),
    // ⚠️ đặt `options` TRƯỚC `execute` để TypeScript suy ra kiểu cho tham số thứ 4
    execute: async (client, message, args, options) => {
        options.user;   // User            (bắt buộc → không bao giờ null)
        options.days;   // number | null   (tuỳ chọn → null nếu không nhập)
        options.reason; // string | null
    },
});
```

Người dùng gõ `!ban abc` sẽ nhận được:

> ❌ Thiếu argument **user** (người bị ban).
> Cách dùng: `!ban <user> [days] [reason...]`

**Các kiểu argument:**

| Hàm | Kiểu giá trị | Ghi chú |
|---|---|---|
| `a.string()` | `string` | `rest: true` gom **toàn bộ phần còn lại**; `choices`, `minLength`, `maxLength` |
| `a.integer()` / `a.number()` | `number` | `min`, `max`; `a.number()` chấp nhận cả dấu phẩy (`3,5`) |
| `a.boolean()` | `boolean` | nhận `true/false`, `yes/no`, `on/off`, `1/0`, `có/không`, `bật/tắt` |
| `a.duration()` | `number` (ms) | nhận `10m`, `1h`, `2d`… (dùng `parseTime`); `min`, `max` tính bằng ms |
| `a.user()` | `User` | mention, ID hoặc tên |
| `a.member()` | `GuildMember` | chỉ dùng trong server |
| `a.role()` | `Role` | chỉ dùng trong server |
| `a.channel()` | `Channel` | chỉ dùng trong server; `channelTypes: ["GuildText"]` để giới hạn loại kênh |

**Quy tắc cần nhớ:**

- Thứ tự khai báo = thứ tự người dùng nhập. Argument **bắt buộc không được đứng sau** argument tuỳ chọn, `rest` phải là argument **cuối** — vi phạm sẽ báo lỗi ngay khi đăng ký lệnh.
- Khác slash command, `required` mặc định là **`false`**.
- Giá trị có khoảng trắng đặt trong ngoặc kép: `!remind "1h 30m" nhớ uống nước` (hỗ trợ cả `“ ”` của bàn phím điện thoại; dùng `\"` để chèn dấu ngoặc).
- Nhập sai cú pháp **không bị tính cooldown**. Thứ tự kiểm tra: lệnh bị tắt → permission → parse argument → cooldown → `execute`.
- `args` (mảng chuỗi thô) vẫn được truyền ở tham số thứ 3 — lệnh cũ không cần sửa.
- Dùng dạng fluent: `new CommandBuilder().setName("ban").setOptions((a) => ({ ... })).setExecute(...)`. Nếu cần `CommandBuilder<true>` kèm `options`, hãy dùng dạng fluent này (TypeScript không cho vừa chỉ định generic vừa tự suy luận).

Tuỳ biến thông báo lỗi ở `CommandManager`:

```ts
new CommandManager({
    prefix: "!",
    argumentErrorResponse: (error, { usage }) => `⚠️ ${error.message}\n📖 \`${usage}\``,
    // error.kind: "missing" | "invalid" | "range" | "guild_only"
    // trả về null để không phản hồi gì
});
```

---

## ⚡ Slash Command

### 🎯 Slash command cơ bản — options có kiểu rõ ràng

```ts
import { SlashCommandBuilder } from "blackcat.js-discord";

export default new SlashCommandBuilder({
    commandName: "say",
    description: "Bắt bot nói một câu",
    cooldown: { duration: "5s", scope: ["user"] },
    permission: { userPermissions: ["SendMessages"] },

    // Các kiểu hỗ trợ: string, integer, number, boolean, user, member,
    // role, channel, mentionable, attachment
    options: (o) => ({
        text: o.string({ description: "Nội dung cần nói", required: true }),
    }),

    execute: (client, interaction, options) => {
        // 👇 options.text được tự suy ra là string
        return interaction.reply(options.text);
    },
});
```

### 🌳 Subcommand

```ts
import { SlashCommandBuilder, SlashSubCommandBuilder } from "blackcat.js-discord";

export default new SlashCommandBuilder({
    commandName: "admin",
    description: "Lệnh dành cho quản trị",

    subcommands: {
        reload: new SlashSubCommandBuilder({
            description: "Reload bot",
            options: (o) => ({
                channel: o.channel({
                    description: "Kênh nhận thông báo",
                    channelTypes: ["GuildText"],
                    required: false,
                }),
            }),
        }),
    },

    execute: async (client, interaction, options) => {
        if (options.payload?.type === "sub" && options.payload.sub === "reload") {
            const channel = options.payload.options.channel; // ✅ đã có kiểu
            // logic code...
        }
    },
});
```

### 🗃️ Group (nhóm subcommand)

```ts
import {
    SlashCommandBuilder,
    SlashSubCommandGroupBuilder,
    SlashSubCommandBuilder,
} from "blackcat.js-discord";

export default new SlashCommandBuilder({
    commandName: "admin",
    description: "Lệnh dành cho quản trị",

    groups: {
        user: new SlashSubCommandGroupBuilder({
            description: "Quản lý người dùng",
            subcommands: {
                ban: new SlashSubCommandBuilder({
                    description: "Ban người dùng",
                    options: (o) => ({
                        user: o.user({ description: "Người bị ban", required: true }),
                        reason: o.string({ description: "Lý do", required: true }),
                    }),
                }),
                kick: new SlashSubCommandBuilder({
                    description: "Kick người dùng",
                    options: (o) => ({
                        user: o.user({ description: "Người bị kick", required: false }),
                        userid: o.number({ description: "ID người dùng", required: false }),
                    }),
                }),
            },
        }),
    },

    execute: async (client, interaction, options) => {
        if (options.payload?.type === "group") {
            const { group, sub } = options.payload;

            if (group === "user" && sub === "ban") {
                const { user, reason } = options.payload.options;
                // logic ban...
            }
            if (group === "user" && sub === "kick") {
                const { user, userid } = options.payload.options;
                // logic kick...
            }
        }
    },
});
```

> 🔀 Bạn có thể dùng **`subcommands` và `groups` cùng lúc** trong một lệnh, rồi phân nhánh theo `options.payload.type` là `"sub"` hay `"group"`.

### 🔗 Dạng fluent

```ts
import {
    SlashCommandBuilder,
    SlashSubCommandBuilder,
    SlashSubCommandGroupBuilder,
} from "blackcat.js-discord";

const command = new SlashCommandBuilder()
    .setName("example")
    .setDescription("Ví dụ lệnh slash")
    .setCooldown({ duration: 5, scope: "user" })
    .setPermissions({ userPermissions: ["SendMessages"] })
    .setGroups({
        user: new SlashSubCommandGroupBuilder({
            description: "Quản lý người dùng",
            subcommands: {
                ban: new SlashSubCommandBuilder({ /* ... */ }),
            },
        }),
    })
    .setSubcommands({
        reload: new SlashSubCommandBuilder({ /* ... */ }),
    })
    .setExecute(async (client, interaction, options) => {
        // logic code...
    });

export default command;
```

### 🧬 Dạng class (kế thừa)

```ts
import { SlashCommandBuilder } from "blackcat.js-discord";

class PingCommand extends SlashCommandBuilder {
    constructor() {
        super();
        this.setName("ping");
        this.setDescription("Xem ping của bot");
        this.setCooldown({ duration: 5, scope: "role" });
        this.setExecute(async (client, interaction) => {
            return interaction.reply({ content: `🏓 pong ${client.discord.ws.ping}ms` });
        });
    }
}

export default new PingCommand();
```

### 🔎 Autocomplete

Thêm `autocomplete` vào option `string`, `integer` hoặc `number` để gợi ý ngay khi người dùng đang gõ:

```ts
import { SlashCommandBuilder } from "blackcat.js-discord";

const SONGS = ["Lạc trôi", "Nắng ấm xa dần", "Hãy trao cho anh"];

export default new SlashCommandBuilder({
    commandName: "play",
    description: "Phát một bài hát",
    options: (o) => ({
        song: o.string({
            description: "Tên bài hát",
            required: true,
            autocomplete: async (query, interaction, client) => {
                // query = nội dung người dùng đang gõ
                return SONGS.filter((s) => s.toLowerCase().includes(query.toLowerCase()));
            },
        }),
        volume: o.integer({
            description: "Âm lượng",
            autocomplete: () => [{ name: "Nhỏ (10)", value: 10 }, { name: "Lớn (100)", value: 100 }],
        }),
    }),
    execute: (client, interaction, options) => {
        return interaction.reply(`🎵 ${options.song}`); // options.song: string
    },
});
```

- Trả về **mảng giá trị thuần** (`name` = `value`) hoặc mảng `{ name, value }`; hỗ trợ cả đồng bộ lẫn `async`.
- Tự cắt còn **25 gợi ý** và giới hạn tên/giá trị **100 ký tự** theo luật của Discord.
- Hoạt động cả với option nằm trong **subcommand** và **group**.
- **Không dùng chung** với `choices` trên cùng một option (Discord không cho) — sẽ báo lỗi rõ ràng khi build.
- Handler ném lỗi (hoặc lệnh đang bị [tắt](#-bậttắt-lệnh-theo-guild)) → tự trả về danh sách rỗng để Discord không treo.
- Autocomplete không đi qua cooldown/permission (chỉ là gợi ý). Hãy kiểm tra quyền trong `execute`.

---

## 🖱️ Context Menu

Lệnh hiện khi **chuột phải** vào một người dùng hoặc một tin nhắn (menu **Apps**).

```ts
// contextMenus/user/userinfo.ts
import { MessageFlags } from "discord.js";
import { ContextMenuBuilder } from "blackcat.js-discord";

export default new ContextMenuBuilder({
    commandName: "Xem thông tin",   // cho phép chữ hoa & khoảng trắng, tối đa 32 ký tự
    type: "user",                   // "user" | "message"
    execute: async (client, interaction, target) => {
        // target: User  (với type "message" thì target: Message)
        await interaction.reply({ content: `${target.tag} — ${target.id}`, flags: MessageFlags.Ephemeral });
    },
});
```

```ts
// contextMenus/message/charcount.ts
export default new ContextMenuBuilder({
    commandName: "Đếm ký tự",
    type: "message",
    cooldown: { duration: "5s", scope: ["user"] },     // dùng giống slash command
    permission: { userPermissions: ["SendMessages"] },
    execute: (client, interaction, target) => interaction.reply(`${target.content.length} ký tự`),
});
```

Gắn vào `Client` bằng `contextMenuManager` (xem bước "Khởi tạo Client" ở phần Bắt đầu nhanh). Dạng fluent: `new ContextMenuBuilder().setName("...").setType("user").setExecute(...)`.

| Tuỳ chọn | Ý nghĩa |
|---|---|
| `commandName` | Tên hiển thị trong menu (1–32 ký tự) |
| `type` | `"user"` hoặc `"message"` — một người dùng và một tin nhắn **có thể trùng tên** |
| `cooldown` / `permission` | Giống slash command |
| `defaultMemberPermissions` | Quyền tối thiểu để *thấy* lệnh trong server |
| `execute(client, interaction, target)` | `target` là `User` hoặc `Message` tuỳ `type` |

> 🔗 **Đăng ký chung với slash command:** Discord ghi đè toàn bộ lệnh mỗi lần đăng ký, nên khi bot có cả `SlashCommandManager` và `ContextMenuManager`, thư viện gộp hai loại vào **một** lần đăng ký (và dùng `guildID` / `reset` của `SlashCommandManager`). Nếu bot chỉ có `ContextMenuManager`, nó tự đăng ký với `guildID` / `reset` của riêng nó.
>
> Muốn thêm bằng code: `client.contextMenuManager.registerCommand([cmdA, cmdB])`.

---

## 📝 Modal

Form popup với ô nhập có kiểu. Thư viện tự hiện modal, **chờ người dùng gửi** và đọc dữ liệu cho bạn:

```ts
import { MessageFlags } from "discord.js";
import { ModalBuilder, SlashCommandBuilder } from "blackcat.js-discord";

const feedbackModal = new ModalBuilder({
    customId: "feedback",                // tiền tố; mỗi lần mở tự thêm mã ngẫu nhiên
    title: "Góp ý cho bot",
    timeout: "5m",                       // số = giây, hoặc chuỗi "30s" / "5m" (mặc định 5 phút)
    fields: (f) => ({
        subject: f.short({ label: "Tiêu đề", minLength: 3, maxLength: 50 }),                    // bắt buộc (mặc định)
        detail: f.paragraph({ label: "Nội dung", required: false, placeholder: "Mô tả..." }),  // tuỳ chọn
    }),
});

export default new SlashCommandBuilder({
    commandName: "feedback",
    description: "Gửi góp ý",
    execute: async (client, interaction) => {
        const result = await feedbackModal.show(interaction);
        if (!result) return; // hết thời gian chờ mà người dùng không gửi

        const { subject, detail } = result.values; // subject: string  |  detail: string | null
        await result.interaction.reply({ content: `Cảm ơn! ${subject}`, flags: MessageFlags.Ephemeral });
    },
});
```

- `show()` nhận **slash command, context menu, button hoặc select menu**, trả về `{ interaction, values }` hoặc `null` khi hết giờ. Hãy trả lời người dùng bằng `result.interaction` (interaction của lần gửi modal).
- Ô nhập `required` mặc định là **`true`** (giống Discord); ô tuỳ chọn để trống sẽ cho `null`.
- Giới hạn của Discord được kiểm tra sẵn với thông báo rõ ràng: 1–5 ô, `title`/`label` ≤ 45 ký tự, `placeholder` ≤ 100, `value` ≤ 4000…
- Mỗi lần `show()` sinh `customId` riêng và chỉ nhận lần gửi của **đúng người mở**, nên nhiều người mở cùng lúc không bị lẫn.
- Muốn xử lý bằng callback thay vì `await`: truyền `onSubmit: (interaction, values) => ...`. Dạng fluent: `new ModalBuilder().setTitle(...).setFields(...).setOnSubmit(...)`.
- ⚠️ Discord **không** cho mở modal từ message command thường. Hãy gửi một nút bấm, rồi gọi `modal.show(buttonInteraction)` khi người dùng bấm.
- Cần mở modal **trước** khi `reply()` / `deferReply()` interaction gốc.

---

## 🔌 Bật/tắt lệnh theo guild

Cho phép admin server tự tắt một lệnh mà không cần sửa code hay restart bot:

```ts
client.commandManager.disable("ping", "123456789012345678");       // tắt trong 1 guild
client.commandManager.disable("ping", [guildA, guildB]);           // tắt trong nhiều guild
client.commandManager.enable("ping", "123456789012345678");        // bật lại
client.commandManager.isDisabled("ping", guildID);                 // true / false
client.commandManager.getDisabledCommands(guildID);                // ["ping", ...]

// Cùng API cho slash command và context menu
client.slashCommandManager.disable("play", guildID);
client.contextMenuManager.disable("Xem thông tin", guildID);
```

- Người dùng gọi lệnh bị tắt nhận thông báo **"⛔ Lệnh … đã bị tắt trong server này."** (slash/context menu trả lời dạng ephemeral). Tuỳ biến bằng `disabledResponse`, trả về `null` để im lặng.
- Chỉ ảnh hưởng đúng guild được chỉ định; **DM không bị ảnh hưởng**.
- Message command: truyền tên lệnh **hoặc alias** đều được. Slash command bị tắt cũng ngừng gợi ý autocomplete.
- Trả về `false` nếu không có lệnh nào tên đó; trả về `true` nếu thao tác hợp lệ (kể cả khi lệnh đã ở trạng thái đó).
- Kiểm tra lệnh bị tắt chạy **trước** permission và cooldown.

**Lưu trạng thái bền vững** (mặc định chỉ nằm trong bộ nhớ — restart là mất):

```ts
import fs from "node:fs";

const FILE = "./disabled.json";
const commandManager = new CommandManager({
    prefix: "!",
    // gọi mỗi khi có lệnh được bật/tắt
    onToggle: () => fs.writeFileSync(FILE, JSON.stringify(commandManager.exportDisabled())),
    disabledResponse: ({ commandName }) => `🚫 \`${commandName}\` đang tạm tắt.`,
});

// khi khởi động: nạp lại
if (fs.existsSync(FILE)) commandManager.importDisabled(JSON.parse(fs.readFileSync(FILE, "utf8")));
```

`exportDisabled()` trả về dạng `{ "<guildID>": ["ping", "help"] }` — dễ lưu vào file hoặc database. `importDisabled(data, { merge: true })` để gộp thay vì thay thế.

> 💡 Ví dụ hoàn chỉnh một lệnh `!toggle <lệnh> <on|off>` dành cho admin: xem `test/commands/Admin/toggle.ts`.

---

## 🚀 CLI — create-blackcat-bot

Tạo dự án mới chỉ với một lệnh:

```bash
npx create-blackcat-bot my-bot
# hoặc
npm create blackcat-bot@latest my-bot
pnpm create blackcat-bot my-bot
```

```text
🐈‍⬛ create-blackcat-bot

Ngôn ngữ? [ts/js] (ts)
Cài dependencies bằng npm ngay bây giờ? [Y/n]
✅ Đã tạo "my-bot" (TypeScript)

Bước tiếp theo:
  1. cd my-bot
  2. Điền BOT_TOKEN vào file .env
  3. npm run dev
```

**Tuỳ chọn:**

| Cờ | Ý nghĩa |
|---|---|
| `--ts` / `--js` | Chọn ngôn ngữ (mặc định TypeScript) |
| `--pm <npm\|pnpm\|yarn\|bun>` | Trình quản lý gói (mặc định: tự nhận từ lệnh bạn đang chạy) |
| `--install` / `--no-install` | Có cài dependencies ngay hay không |
| `-y`, `--yes` | Bỏ qua mọi câu hỏi, dùng mặc định |
| `-f`, `--force` | Cho phép ghi vào thư mục đã có file (không ghi đè `.env` cũ) |

Ví dụ không tương tác: `npx create-blackcat-bot my-bot --js --pm pnpm --no-install -y`

**Dự án sinh ra:**

```
my-bot/
├─ src/
│  ├─ index.ts                       # khởi tạo Client + 4 manager
│  ├─ commands/
│  │  ├─ general/ping.ts, say.ts     # say.ts: argument có kiểu
│  │  └─ admin/toggle.ts             # bật/tắt lệnh theo guild
│  ├─ slashCommands/general/
│  │  ├─ ping.ts
│  │  ├─ search.ts                   # autocomplete
│  │  └─ feedback.ts                 # modal
│  ├─ contextMenus/
│  │  ├─ user/userinfo.ts
│  │  └─ message/charcount.ts
│  └─ events/client/clientReady.ts
├─ .env  .env.example  .gitignore    # .env đã được ignore sẵn
├─ package.json  tsconfig.json  README.md
```

Chỉ cần điền `BOT_TOKEN` (và tuỳ chọn `GUILD_IDS` để slash command hiện ngay trong server thử nghiệm) là chạy được. Mã nguồn CLI nằm ở thư mục [`create-blackcat-bot/`](./create-blackcat-bot) — một package riêng, không phụ thuộc thư viện nào.

---

## ⏱️ Cooldown — chi tiết

| Thuộc tính | Ý nghĩa |
|---|---|
| `duration` | Thời gian chờ. Số = **giây**, hoặc chuỗi như `"5s"`, `"2min"`, `"1h 30m"` |
| `scope` | `"user"` · `"role"` · `"guild"` · `"global"` — truyền 1 giá trị hoặc 1 mảng để kết hợp |
| `roleWeights` | Hệ số nhân thời gian theo role. `0.5` → còn 50% thời gian chờ |
| `permissionBypass` | Mức quyền (`PermissionLevel`) được **miễn** cooldown |
| `message` | Tin nhắn báo khi đang cooldown — nhận `(ms, ctx)` |
| `useCache` | Bật/tắt cache dữ liệu cooldown |

---

## 🔒 Permission — chi tiết

| Thuộc tính | Ý nghĩa |
|---|---|
| `userPermissions` | Quyền Discord mà **người dùng** phải có |
| `botPermissions` | Quyền Discord mà **bot** phải có |
| `allowedRoleIds` / `allowedUserIds` | Chỉ cho phép các role / user này |
| `blockedUserIds` | Chặn các user này |
| `allowDM` / `allowGuild` | Cho phép dùng trong tin nhắn riêng / trong server |
| `onlyOwner` | Chỉ chủ bot được dùng |
| `message` | Tuỳ biến tin nhắn khi bị từ chối |

---

## 📑 Phân trang (Pagination)

Làm danh sách nhiều trang với nút bấm chỉ trong vài dòng:

```ts
import { PaginationBuilder } from "blackcat.js-discord";

// 📘 Dữ liệu tĩnh
const pagination = new PaginationBuilder<string>({
    pages: ["Trang A", "Trang B", "Trang C"],
    renderPage: ({ data }) => ({ content: data }),
});

// 📗 Dữ liệu động — chỉ tải trang khi người dùng mở tới
const dynamic = new PaginationBuilder<string[]>({
    totalPages: 5,
    useCache: true, // nhớ lại trang đã tải, khỏi gọi lại API
    pageLoader: async (page) => [`Item ${page}`],
    renderPage: ({ data }) => ({ content: data.join("\n") }),
});

// Dùng được cho cả message command lẫn slash command
await pagination.start(message); // hoặc: await pagination.start(interaction)
```

Một số method hữu ích: `next()`, `prev()`, `first()`, `last()`, `goto(page)`, `updatePages()`, `reload()`, `stop()`, `getPage()`, `getTotalPages()`.

---

## 🧰 Hàm tiện ích

```ts
import { parseTime, delay, findUser, findChannel, findRole } from "blackcat.js-discord";

parseTime("1h 30m");   // 5400000 (ms)
parseTime("1.5h");     // 5400000
parseTime(120);        // 120000 — số thuần được hiểu là giây

await delay(2);        // chờ 2 giây

await findUser(client, message, "@someone");     // tìm user (mention / ID / tên)
await findChannel(client, guild, "general");     // tìm channel
await findRole(guild, "VIP");                    // tìm role
```

Đơn vị `parseTime` hỗ trợ: `ms`, `s`, `m`, `h`, `d`, `mo`, `y` (và các tên đầy đủ như `minutes`, `hours`, `days`…).

---

## 📊 Truy cập nhanh các Manager

```ts
client.commandManager.getAllCommands();     // tất cả message command
client.commandManager.getCategoryNames();   // danh sách category
client.commandManager.getCommandCount();    // số lượng lệnh
client.slashCommandManager.getCommands();   // tất cả slash command
client.contextMenuManager?.getCommands();   // tất cả context menu
client.getStats();                          // thống kê tổng quan của bot
```

> Rất tiện để làm lệnh `help` tự động. 😉

---

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy mở [issue](https://github.com/VinhBot/blackcat.js/issues) hoặc gửi pull request nếu bạn có ý tưởng hay phát hiện lỗi.

## 📜 Giấy phép

Phát hành theo giấy phép **MIT** — xem chi tiết tại [LICENSE](./LICENSE).

<div align="center">

Made with 🖤 by **Nguyen Vinh**

⭐ Nếu thấy thư viện hữu ích, hãy tặng mình một ngôi sao nhé!

</div>

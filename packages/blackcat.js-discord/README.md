# 🐈‍⬛ blackcat.js-discord

![npm version](https://img.shields.io/npm/v/blackcat.js-discord)
![npm downloads](https://img.shields.io/npm/dm/blackcat.js-discord)
![license](https://img.shields.io/npm/l/blackcat.js-discord)
![typescript](https://img.shields.io/badge/types-TypeScript-blue)

> Thư viện hỗ trợ xây dựng Discord Bot với cấu trúc lệnh mạnh mẽ, typed an toàn và dễ mở rộng.  
> Tối ưu cho cả **message command** và **slash command**.

---

## ✨ Tính năng nổi bật

- ⚡ Cấu trúc `CommandBuilder, SlashCommandBuilder, SlashCommandBuilderWithSubs` rõ ràng, dễ quản lý
- 🔒 Hệ thống **permission** linh hoạt
- ⏱️ Cooldown theo `user`, `guild`, `global`
- 🧠 Hỗ trợ `roleWeights` giảm thời gian cooldown
- 🧩 Slash Command **strongly-typed options**
- 📦 Tương thích tốt với `discord.js`
- 🗂️ Phân loại lệnh theo `category`
- 🧱 Dễ mở rộng, phù hợp bot lớn

---

## 📦 Cài đặt

```bash
npm install blackcat.js-discord
```
hoặc

```bash
yarn add blackcat.js-discord
```

## 🚀 Yêu cầu

- Node.js >= 18
- discord.js >= 14

# 📁 Gợi ý cấu trúc thư mục

```
discord_bot
├─ commands/
│   ├─ general/
│   ├─ admin/
│   └─ moderation/
├─ slashCommands
│   ├─ general/
│   ├─ admin/
│   └─ moderation/
├─ events/
│   ├─ Client/
│   └─ Guild/
└─ index.ts
```

---
# 🧩 Client
```ts
import { GatewayIntentBits } from "discord.js";
import { Client } from "blackcat.js-discord";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    config: {
        botToken: "string",
    },
    registerEvents: {
        directory: "./events",
        scopes: ["client"],
        onLoad: (event) => {
            console.log(`${event.file} - ok`);
        },
        onError: (event) => {
            console.error(`${event.file}:`, event.error);
        }
    },
    registerCommands: {
        directory: "./commands",
        prefix: "!",
        onLoad: (command) => {
            console.log(`commands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    },
    registerSlashCommands: {
        directory: "./slashCommands",
        guildID: "id guild", // có thể bỏ qua nếu muốn sử dụng cho all guild
        onLoad: (command) => {
            console.log(`slashCommands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    }
});

client.start();
```

---
# 🧩 Event

```ts
import { EventBuilder } from "blackcat.js-discord";

const exampleEvent = new EventBuilder({
    eventName: "event name",
    once: false,
    execute: async (client, ...) => {
        // logic code
    }
});

export default exampleEvent;
```

---
# 🧩 Cấu trúc Message Command

```ts
import { CommandBuilder } from "blackcat.js-discord";

const exampleCommand = new CommandBuilder({
    commandName: "string",
    description: "string",
    aliases: ["string"],
    category: "string",
    usage: "string",
    cooldown: {
        duration: 5,
        scope: ["user"], // "user" | "guild" | "global"
        roleWeights: {
            "id role": 0.5, // giảm 50%
        },
        message: (ms, ctx, commandName) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`
    },
    userPermission: {
        permission: ["SendMessages"],
        message: (ctx) => ({ content: `Bạn không đủ quyền để sử dụng lệnh ${ctx.commandName}` }),
    },
    execute: async (client, message, args) => {
        // logic code.
    }
});

export default exampleCommand;
```

---

# 🧩 Cấu trúc Slash Command

```ts
import { CommandBuilder } from "blackcat.js-discord";

const exampleCommand = new SlashCommandBuilder({
    commandName: "string",
    description: "string",
    cooldown: {
        duration: 5,
        scope: ["user"], // "user" | "guild" | "global"
        roleWeights: {
            "id role": 0.5, // giảm 50%
        },
        message: (ms, ctx, commandName) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`
    },
    userPermission: {
        permission: ["SendMessages"],
        message: (ctx) => ({ content: `Bạn không đủ quyền để sử dụng lệnh ${ctx.commandName}` }),
    },
    options: (o) => ({ 
        string: o.string({ description: "string description", required: true | false }),
        integer,
        number,
        boolean,
        user,
        member,
        role,
        channel,
        mentionable,
        attachment,
    }),
    execute: (client, interaction, options) => {
        const string = options.string; // integer, number, boolean, user, member, role, channel, mentionable, attachment,
        // logic code 
    }
});

export default exampleCommand;
```

---
# 🧩 Cấu trúc Slash sub Command

```ts
import { SlashCommandBuilderWithSubs, SlashSubCommandBuilder, SlashSubCommandGroupBuilder } from "blackcat.js-discord";

const exampleCommand = new SlashCommandBuilderWithSubs({
    commandName: "example",
    description: "example description",
    cooldown: {
        duration: 5,
        scope: ["user"], // "user" | "guild" | "global"
        roleWeights: {
            "id role": 0.5, // giảm 50%
        },
        message: (ms, ctx, commandName) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`
    },
    userPermission: {
        permission: ["SendMessages"],
        message: (ctx) => ({ content: `Bạn không đủ quyền để sử dụng lệnh ${ctx.commandName}` }),
    },
    /* SUB COMMAND TRỰC TIẾP */
    subcommands: {
        example1: new SlashSubCommandBuilder({
            description: "example1 description",
            options: (o) => ({ 
                // giống với SlashCommandBuilder.
            })
        }),
    },
    /* GROUP */
    groups: {
        example1: new SlashSubCommandGroupBuilder({
            description: "example1 description",
            subcommands: {
                example2: new SlashSubCommandBuilder({
                    description: "example2 description",
                    options: (o) => ({
                        // giống với SlashCommandBuilder.
                    }),
                }),
                example3: new SlashSubCommandBuilder({
                    description: "example3 description",
                    options: (o) => ({
                        // giống với SlashCommandBuilder.
                    }),
                }),
            },
        }),
    },

    /* EXECUTE */
    execute: async (client, interaction, payload) => {
        if (payload.type === "sub") {
            if (payload.sub === "example1") {
                // logic code.
            };
        };
        if (payload.type === "group") {
            if (payload.group === "example1" && payload.sub === "example2") {
                const string = payload.options.string; // integer, number, boolean, user, member, role, channel, mentionable, attachment,
                // logic code.
            };
            if (payload.group === "example1" && payload.sub === "example3") {
                const string = payload.options.string; // integer, number, boolean, user, member, role, channel, mentionable, attachment,
                // logic code.
            };
        };
    },
});


export default exampleCommand;
```
---
# 🧩 ComponentBuilder

```ts
import { ComponentBuilder } from "blackcat.js-discord";

const components = new ComponentBuilder([
  {
    type: "button",
    options: [
      { customId: "accept", label: "Chấp nhận", style: "Success" },
      { customId: "decline", label: "Từ chối", style: "Danger" }
    ]
  },
  {
    type: "select",
    options: {
      customId: "color",
      placeholder: "Chọn màu",
      options: [
        { label: "Đỏ", value: "red" },
        { label: "Xanh", value: "blue" }
      ]
    }
  }
] as const);

const msg = await message.reply({
  content: "Hãy chọn một tùy chọn",
  components: components.components()
});

components.createCollector({
  source: msg,
  userId: message.author.id,
  onCollect: async (interaction, id) => {
    // id sẽ được TypeScript suy ra:
    // "accept" | "decline" | "color"
    if (interaction.isButton()) {
      if (id === "accept") {
        await interaction.reply("Bạn đã chấp nhận");
      }
      if (id === "decline") {
        await interaction.reply("Bạn đã từ chối");
      }
    }
    if (interaction.isStringSelectMenu()) {
      if (id === "choose_color") {
        await i.reply({
          content: `Bạn chọn: ${i.values[0]}`,
          ephemeral: true
        });
      }
    }
  }
});

// ===== Slash Command (Interaction) =====

await interaction.reply({
  content: "Hãy chọn một tùy chọn",
  components: components.components()
});

await components.createCollector({
  source: interaction,
  userId: interaction.user.id,
  time: 60000,
  onCollect: async (i, id) => {
    if (i.isButton()) {
      if (id === "accept") await i.reply({ content: "Bạn đã chấp nhận", ephemeral: true });
      if (id === "decline") await i.reply({ content: "Bạn đã từ chối", ephemeral: true });
    }
    if (i.isStringSelectMenu()) {
      if (id === "choose_color") {
        await i.reply({
          content: `Bạn chọn: ${i.values[0]}`,
          ephemeral: true
        });
      }
    }

  }
});    
```

---
# 🧩 PaginationBuilder

**Hệ thống pagination cho Discord message với:**
- Navigation buttons (first / prev / next / last)
- Select menu nhảy trang
- Custom buttons / components
- Hỗ trợ message command và interaction
- Hỗ trợ dynamic page loading

```ts
import { PaginationBuilder, ComponentBulder, ButtonStyle } from "blackcat.js-discord";

const pagination = new PaginationBuilder({
  pages: Array.from({ length: 5 }, (_, i) => `${i + 1}`),
  renderPage: ({ data, page, totalPages }) => ({
    content: `📄 Trang **${page + 1}/${totalPages}**\n\n${data}`
  }),
  timeout: 30,
  selectMenu: {
    enabled: true,
    placeholder: "Chọn trang",
    pageLabel: (page) => `Trang ${page + 1}`
  },
  
  buildComponents: (ctx) => ctx.button([
    {
      customId: "example",
      label: "example",
      style: "Primary"
    }
  ]),
  onComponent: async ({ interaction, pagination }) => {
    if (interaction.isButton()) {
      if (interaction.customId === "example") {
          await interaction.deferReply();
          await interaction.editReply("example")
        }
      }
  },
  interactionFilter: (i) => i.user.id === message.author.id,
  onPageChange: ({ oldPage, newPage }) => {
    console.log(`Page changed: ${oldPage} -> ${newPage}`);
  },
  onTimeout: (ctx) => {
    ctx.message.edit({
      components: [],
    });
  },
  onError: (error) => {
    console.log(error);
  }
});

await pagination.start(message); // messageCrete
await pagination.start(interaction); // interactionCreate

// Dùng khi dữ liệu lớn hoặc load từ database / API
const pagination = new PaginationBuilder<User[]>({
  pageLoader: async (page) => {
    const users = await database.getUsers({
      page,
      limit: 10
    });
    return users;
  },
  renderPage: ({ data, page }) => ({
    embeds: [{
      title: `Users Page ${page + 1}`,
      description: data.map(u => `• ${u.username}`).join("\n")
    }]
  })
});
```
---

# 🔐 Hệ thống Cooldown

| Scope   | Mô tả |
|---------|--------|
| user    | Mỗi user một cooldown |
| guild   | Mỗi server một cooldown |
| global  | Toàn bộ bot |

## roleWeights

Cho phép giảm thời gian cooldown theo role.

```ts
roleWeights: {
    "id role": 0.5 // giảm 50%
}
```

---

# 📜 License

MIT License
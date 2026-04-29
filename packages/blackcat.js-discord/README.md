# 🐈‍⬛ blackcat.js-discord

![npm version](https://img.shields.io/npm/v/blackcat.js-discord)
![npm downloads](https://img.shields.io/npm/dm/blackcat.js-discord)
![license](https://img.shields.io/npm/l/blackcat.js-discord)
![typescript](https://img.shields.io/badge/types-TypeScript-blue)

> Thư viện hỗ trợ xây dựng Discord Bot với cấu trúc lệnh mạnh mẽ, typed an toàn và dễ mở rộng.  
> Tối ưu cho cả **message command** và **slash command**.

> [xem document ở đây.](https://blackcatjs-discord-docs.vercel.app/)

---

## ✨ Tính năng nổi bật

- ⚡ Cấu trúc `CommandBuilder, SlashCommandBuilder` rõ ràng, dễ quản lý
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
import { Client, CommandManager, EventManager, SlashCommandManager } from "blackcat.js-discord";
import { GatewayIntentBits, Partials } from "discord.js";

const config = {
    botToken: "Bot token",
};

const client = new Client({
    discordClientOptions: {
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
        allowedMentions: {
            parse: ["users", "roles"],
            repliedUser: false
        },
    },
    config: config,
    eventManager: new EventManager({
        directory: "./events",
        scopes: ["client", "Guild"], // hoặc tên folder event bất kì.
        onLoad: (event) => {
            console.log(`${event.file} - ok`);
        },
        onError: (event) => {
            console.error(`${event.file}:`, event.error);
        }
    }),
    commandManager: new CommandManager({
        directory: "./commands",
        prefix: "!",
        onLoad: (command) => {
            console.log(`commands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    }),
    slashCommandManager: new SlashCommandManager({
        directory: "./slashCommands",
        guildID: "guild id", // có thể bỏ qua để áp dụng cho tất cả các guild mà bot tham gia.
        reset: {
            guild: true // reset lại command
        },
        onLoad: (command) => {
            console.log(`slashCommands: ${command.commandName} - ok`);
        },
        onError: (command) => {
            console.error(`${command.file}:`, command.error);
        }
    })
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
        duration: "5s",
        scope: ["role"],
        roleWeights: (guildID, memberID) => {
            console.log("guildID:", guildID);
            console.log("memberID:", memberID);
            return {
                memberID: 0.1, // giảm 10%
            };
        },
        permissionBypass: [PermissionLevel.ADMIN, PermissionLevel.MOD], // hoặc permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`,
    },
    permission: {
        userPermissions: ["SendMessages"],
        botPermissions: ["SendMessages"],
        // allowedRoleIds: ["1100924393175142453"],
        // allowedUserIds: ["1497199921814835311"],
        // blockedUserIds: ["1497199921814835311"],
        // allowDM: false,
        // allowGuild: true,
        // onlyOwner: true,
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
        duration: "5s",
        scope: ["role"],
        roleWeights: (guildID, memberID) => {
            console.log("guildID:", guildID);
            console.log("memberID:", memberID);
            return {
                memberID: 0.1, // giảm 10%
            };
        },
        permissionBypass: [PermissionLevel.ADMIN, PermissionLevel.MOD], // hoặc permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`,
    },
    permission: {
        userPermissions: ["SendMessages"],
        botPermissions: ["SendMessages"],
        // allowedRoleIds: ["1100924393175142453"],
        // allowedUserIds: ["1497199921814835311"],
        // blockedUserIds: ["1497199921814835311"],
        // allowDM: false,
        // allowGuild: true,
        // onlyOwner: true,
    },
    options: (o) => ({ 
        string: o.string({ description: "string description", required: true | false }), //  // integer, number, boolean, user, member, role, channel, mentionable, attachment
    }),
    execute: (client, interaction, options) => {
        const string = options.string; // integer, number, boolean, user, member, role, channel, mentionable, attachment,
        // logic code 
    }
});

export default exampleCommand;

// sub commands 
const exampleCommand = new SlashCommandBuilder({
    commandName: "admin",
    description: "Admin commands",
    cooldown: {
        duration: "5s",
        scope: ["role"],
        roleWeights: (guildID, memberID) => {
            console.log("guildID:", guildID);
            console.log("memberID:", memberID);
            return {
                memberID: 0.1, // giảm 10%
            };
        },
        permissionBypass: [PermissionLevel.ADMIN, PermissionLevel.MOD], // hoặc permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`,
    },
    permission: {
        userPermissions: ["SendMessages"],
        botPermissions: ["SendMessages"],
        // allowedRoleIds: ["1100924393175142453"],
        // allowedUserIds: ["1497199921814835311"],
        // blockedUserIds: ["1497199921814835311"],
        // allowDM: false,
        // allowGuild: true,
        // onlyOwner: true,
    },
    /* SUB COMMAND TRỰC TIẾP */
    subcommands: {
        reload: new SlashSubCommandBuilder({
            description: "Reload bot",
            options: (o) => ({
                channel: o.channel({
                    description: "test",
                    channelTypes: ["GuildText"],
                    required: false
                })
            })
        }),
    },
    /* EXECUTE */
    execute: async (client, interaction, options) => {
        // sub commands
        if (options.payload?.type === "sub") {
            if (options.payload.sub === "reload") {
                const channel = options.payload.options.channel;
                console.log(channel);
            }
        }
    },
})

// groups
import { SlashCommandBuilder, SlashSubCommandGroupBuilder, SlashSubCommandBuilder } from "blackcat.js-ddiscord";

const exampleCommand = new SlashCommandBuilder({
    commandName: "admin",
    description: "Admin commands",
    cooldown: {
        duration: "5s",
        scope: ["role"],
        roleWeights: (guildID, memberID) => {
            console.log("guildID:", guildID);
            console.log("memberID:", memberID);
            return {
                memberID: 0.1, // giảm 10%
            };
        },
        permissionBypass: [PermissionLevel.ADMIN, PermissionLevel.MOD], // hoặc permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`,
    },
    permission: {
        userPermissions: ["SendMessages"],
        botPermissions: ["SendMessages"],
        // allowedRoleIds: ["1100924393175142453"],
        // allowedUserIds: ["1497199921814835311"],
        // blockedUserIds: ["1497199921814835311"],
        // allowDM: false,
        // allowGuild: true,
        // onlyOwner: true,
    },
    /* GROUP */
    groups: {
        user: new SlashSubCommandGroupBuilder({
            description: "User management",
            subcommands: {
                ban: new SlashSubCommandBuilder({
                    description: "Ban user",
                    options: (o) => ({
                        user: o.user({ description: "Target user", required: true }),
                        reason: o.string({ description: "Reason", required: true }),
                    }),
                }),
                kick: new SlashSubCommandBuilder({
                    description: "Kick user",
                    options: (o) => ({
                        user: o.user({ description: "Target user", required: false }),
                        userid: o.number({ description: "user id",  required: false }),
                    }),
                }),
            },
        }),
    },
    /* EXECUTE */
    execute: async (client, interaction, options) => {
        // group commands
        if (options.payload?.type === "group") {
            // sub commands
            if (options.payload.group === "user" && options.payload.sub === "ban") {
                console.log(options.payload.options.user);
                console.log(options.payload.options.reason);
            }
            if (options.payload.group === "user" && options.payload.sub === "kick") {
                console.log(options.payload.options.user);
                console.log(options.payload.options.userid);
            }
        }
    },
})

// sub và groups
const exampleCommand = new SlashCommandBuilder({
    commandName: "admin",
    description: "Admin commands",
    cooldown: {
        duration: "5s",
        scope: ["role"],
        roleWeights: (guildID, memberID) => {
            console.log("guildID:", guildID);
            console.log("memberID:", memberID);
            return {
                memberID: 0.1, // giảm 10%
            };
        },
        permissionBypass: [PermissionLevel.ADMIN, PermissionLevel.MOD], // hoặc permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`,
    },
    permission: {
        userPermissions: ["SendMessages"],
        botPermissions: ["SendMessages"],
        // allowedRoleIds: ["1100924393175142453"],
        // allowedUserIds: ["1497199921814835311"],
        // blockedUserIds: ["1497199921814835311"],
        // allowDM: false,
        // allowGuild: true,
        // onlyOwner: true,
    },
    /* SUB COMMAND TRỰC TIẾP */
    subcommands: {
        reload: new SlashSubCommandBuilder({
            description: "Reload bot",
            options: (o) => ({
                channel: o.channel({
                    description: "test",
                    channelTypes: ["GuildText"],
                    required: false
                })
            })
        }),
    },
    /* GROUP */
    groups: {
        user: new SlashSubCommandGroupBuilder({
            description: "User management",
            subcommands: {
                ban: new SlashSubCommandBuilder({
                    description: "Ban user",
                    options: (o) => ({
                        user: o.user({
                            description: "Target user",
                            required: true,
                        }),
                        reason: o.string({
                            description: "Reason",
                            required: true,
                        }),
                    }),
                }),
                kick: new SlashSubCommandBuilder({
                    description: "Kick user",
                    options: (o) => ({
                        user: o.user({
                            description: "Target user",
                            required: false,
                        }),
                        userid: o.number({
                            description: "user id",
                            required: false
                        }),
                    }),
                }),
            },
        }),
    },

    /* EXECUTE */
    execute: async (client, interaction, options) => {
        // sub commands
        if (options.payload?.type === "sub") {
            if (options.payload.sub === "reload") {
                const channel = options.payload.options.channel;
                console.log(channel);
            }
        }
        // group commands
        if (options.payload?.type === "group") {
            // sub commands
            if (options.payload.group === "user" && options.payload.sub === "ban") {
                console.log(options.payload.options.user);
                console.log(options.payload.options.reason);
            }
            if (options.payload.group === "user" && options.payload.sub === "kick") {
                console.log(options.payload.options.user);
                console.log(options.payload.options.userid);
            }
        }
        // slash commands
        // logic code 
    },
});

// hoặc 
import { SlashCommandBuilder, SlashSubCommandBuilder, SlashSubCommandGroupBuilder } from "blackcat.js-discord";

const exampleCommand = new SlashCommandBuilder()
    .setName("example")
    .setDescription("example description")
    .setCooldown({
        duration: 5,
        scope: "user"
    })
    .setPermissions({ 
        serPermissions: ["SendMessages"] 
    })
    .setGroups({
        user: new SlashSubCommandGroupBuilder({
            description: "User management",
            subcommands: {
                ban: new SlashSubCommandBuilder({ .... }),
                kick: new SlashSubCommandBuilder({ ... }),
            },
        }),
    })
    .setSubcommands({
        reload: new SlashSubCommandBuilder({ ... }),
    })
    .setExecute(async (client, interaction, options) => {
        // sub commands
        if (options.payload?.type === "sub") {
            if (options.payload.sub === "reload") {
                const channel = options.payload.options.channel;
                console.log(channel);
            }
        }
        // group commands
        if (options.payload?.type === "group") {
            // sub commands
            if (options.payload.group === "user" && options.payload.sub === "ban") {
                console.log(options.payload.options.user);
                console.log(options.payload.options.reason);
            }
            if (options.payload.group === "user" && options.payload.sub === "kick") {
                console.log(options.payload.options.user);
                console.log(options.payload.options.userid);
            }
        }
        // slash commands
        // logic code 
    });

export default exampleCommand;
```
---

# 📜 License

MIT License
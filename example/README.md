## Mở đầu
```js
import { RegistrationClient, Partials, chalk } from "blackcat.js"; // "blackcat.js"

const client = new RegistrationClient({
    discordClient: { // Tùy chọn cho Discord.Client
        allowedMentions: {
            parse: ["roles", "users", "everyone"],
            repliedUser: false,
        },
        partials: [Partials.User, Partials.Message, Partials.Reaction], // Object.keys(Discord.Partials), // get tất cả sự kiện mà partials
        intents: ["Guilds", "GuildMessages", "MessageContent", "GuildInvites", "GuildMembers", "GuildPresences", "GuildMessageReactions", "GuildVoiceStates"],// lấy tất cả sự kiện mà Discord.GatewayIntentBits có
    },
    config: { // Các tùy chọn config mặc định.
        botToken: "token bot", // Mã token của bot.
        botPrefix: "prefix", // Prefix để chạy bot.
        developer: "Discord ID" // ID discord của chủ bot.
    },
    commandHandler: { // Các tùy chọn mặc định của lệnh.
        setCurrentLanguage: "vi",
        prefixCommand: {
            messageCreate: false,
            pathToCommand: "./pathToPrefixCommand",
        },
        slashCommand: {
            restVersion: "10",
            pathToCommand: "./pathToSlashCommand",
        },
        eventHandler: {
            eventFolder: ["folderName"],
            pathToEvent: "./pathToEvent"
        }
    },
});

client.build({ login: false, checkUpdate: true });
```
## nếu bạn muốn chạy prefix theo database.
### ví dụ: mongoose 
> [!WARNING]  
> trong phần commandHandler.messageCreate của client ban đầu hãy đặt thành false
```js
import { MessageCreate, Events } from "blackcat.js";
// Khi này bot sẽ chạy theo prefix mà bạn cung cấp qua mongoose
client.on(Events.MessageCreate, (message) => {
    const prefix = prefix.findOne({ guild: message.guild.id });
    return MessageCreate(client, message, prefix);
});
``` 

## PrefixCommands
```js
import { CommandBuilder } from "blackcat.js";
```
- kiểu 1
```js
const Commands = new CommandBuilder({
    name: "", // Tên của lệnh
    aliases: [""], // Lệnh phụ của lệnh
    category: "", // Danh mục của lệnh
    description: "", // Mô tả chức năng của lệnh
    permissions: [], // Quyền cần thiết để sử dụng lệnh
    usage: "<prefix>name", // Cách sử dụng lệnh
    cooldown: 3000, // Thời gian cooldown (trong miligiây)
    executeCommand: (client, message, args) => {
        // code 
    },
});
// hoặc
// PingCommands.executeCommand((client, message, args) => {
//      code 
// });
// console.log(PingCommands.toJSON()); // Hiển thị lệnh dưới dạng JSON.

export default Commands;
```

- Kiểu 2

```js
class Command extends CommandBuilder {
    constructor () {
        super({
            name: "", // Tên của lệnh
            aliases: [""], // Lệnh phụ của lệnh
            category: "", // Danh mục của lệnh
            description: "", // Mô tả chức năng của lệnh
            permissions: [], // Quyền cần thiết để sử dụng lệnh
            usage: "<prefix>name", // Cách sử dụng lệnh
            cooldown: 3000, // Thời gian cooldown (trong miligiây)
            // executeCommand: (client, message, args) => {
            //     return message.reply({ content: `${client.ws.ping} ms!!!` });
            // }, // (kiểu 1)
        });
    };
    // Bạn có thể thực hiện 1 trong 2 kiểu đã cho
    /**
     * Hàm thực thi chính của lệnh
     * @param {Client} client - Đối tượng Discord Client
     * @param {Message} message - Đối tượng Discord Interaction
     * @param {Array} args - Các đối số được truyền cho lệnh
     */
    executeCommand(client, message, args) {
        return message.reply({ content: `${client.ws.ping} ms.` });
    }; // (kiểu 2)
};

export default Command;
```
## SlashCommands 
- Kiểu 1
```js
import { SlashCommandBuilders, getFileNameAndFolder, ApplicationCommandType } from "blackcat.js";

const Commands = new SlashCommandBuilders({
    name: getFileNameAndFolder(import.meta.url).fileName.name, // Tên của lệnh slash
    category: getFileNameAndFolder(import.meta.url).folderName.name, // Thư mục chứa lệnh
    type: ApplicationCommandType.ChatInput, // Kiểu lệnh
    description: "", // Mô tả của lệnh
    userPerms: [], // Các quyền đề sử dụng lệnh, mặc định sẽ là "SendMessage"
    owner: false, // Lệnh chỉ dành cho chủ bot
    cooldown: 10, // Thời gian tái sử dụng lệnh
    // options: [], // Các tùy chọn khác của lệnh 
    executeCommand(client, interaction) {
        // code
    },
});

export default Commands;
```
- Kiểu 2
```js
import { SlashCommandBuilder, getFileNameAndFolder, ApplicationCommandType, Interaction, RegistrationClient } from "blackcat.js";

const PingCommands = class extends SlashCommandBuilder {
    constructor () {
        super({
            name: getFileNameAndFolder(import.meta.url).fileName.name, // Tên của lệnh slash
            category: getFileNameAndFolder(import.meta.url).folderName.name, // Thư mục chứa lệnh
            type: ApplicationCommandType.ChatInput, // Kiểu lệnh
            description: "", // Mô tả của lệnh
            userPerms: [], // Các quyền đề sử dụng lệnh, mặc định sẽ là "SendMessage"
            owner: false, // Lệnh chỉ dành cho chủ bot
            cooldown: 10, // Thời gian tái sử dụng lệnh
            // options: [], // Các tùy chọn khác của lệnh 
        });
    };
    /**
     * Hàm thực thi chính của lệnh
     * @param {RegistrationClient} client - Đối tượng Discord Client
     * @param {Interaction} interaction - Đối tượng Discord Interaction
     */
    executeCommand(client, interaction) {
        // code
    };
};

export default new PingCommands;
```

## Một số [Function](https://github.com/VinhBot/blackcat.js/tree/main/example/Function) có thể hữu ích với bạn.
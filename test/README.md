## Mở đầu
```js
import { Client, Discord } from "blackcat.js";

const client = new Client({
    discordClient: { // Tùy chọn cho Discord.Client
        allowedMentions: {
            parse: ["roles", "users", "everyone"],
            repliedUser: false,
        },
        partials: [Discord.Partials.User, Discord.Partials.Message, Discord.Partials.Reaction], // Object.keys(Discord.Partials), // get tất cả sự kiện mà partials
        intents: ["Guilds", "GuildMessages", "MessageContent", "GuildInvites", "GuildMembers", "GuildPresences", "GuildMessageReactions", "GuildVoiceStates"],// lấy tất cả sự kiện mà Discord.GatewayIntentBits có
    },
    config: { // Các tùy chọn config mặc định.
        botToken: process.env.botToken, // Mã token của bot.
        botPrefix: "!", // Prefix để chạy bot.
        developer: "788208207465938954" // ID discord của chủ bot.
    },
    commandHandler: { // Các tùy chọn mặc định của lệnh.
        setCurrentLanguage: "vi", // Ngôn ngữ mặc định khi chạy bot bạn có thể đổi qua vi hoặc en.
        messageCreate: false, // bật hoặc tắt tùy chọn chạy messageCreate mặc định của modules.
        slashCommand: false, // bật hoặc tắt các lệnh slash.
        pathToCommand: { // tùy chọn mặc định dẫn đến thư mục lệnh.
            prefixCommand: "./test/PrefixCommands", // dẫn đến thư mục lệnh prefix bạn cũng có thể thêm boolean false để tắt nó.
            slashCommand: "./test/SlashCommands" // dẫn đến thư mục lệnh slash khi slashCommand được đặt thành false thì cái này sẽ vô dụng. 
        },
    },
});
```
## nếu bạn muốn chạy prefix theo database.
### ví dụ: mongoose 
> [!WARNING]  
> trong phần commandHandler.messageCreate của client ban đầu hãy đặt thành false
```js
import { MessageCreate, Discord } from "blackcat.js";
// Khi này bot sẽ chạy theo prefix mà bạn cung cấp qua mongoose
client.on(Discord.Events.MessageCreate, (message) => {
    const prefix = prefix.findOne({ guild: message.guild.id });
    return MessageCreate(client, message, prefix);
});
``` 

## PrefixCommands
```js
import { CommandBuilder, Discord } from "blackcat.js";
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
    /**
     * Hàm thực thi chính của lệnh
     * @param {Discord.Client} client - Đối tượng Discord Client
     * @param {Discord.Message} message - Đối tượng Discord Message
     * @param {Array} args - Các đối số được truyền cho lệnh
     */
    executeCommand: (client, message, args) => {
        // code 
    },
});
// hoặc
// PingCommands.executeCommand(({ client, message, args }) => {
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
     * @param {Discord.Client} client - Đối tượng Discord Client
     * @param {Discord.Message} message - Đối tượng Discord Interaction
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
import { SlashCommandBuilder, getFileNameAndFolder, Discord } from "blackcat.js";

const Commands = new SlashCommandBuilder({
    name: getFileNameAndFolder(import.meta.url).fileName.name, // Tên của lệnh slash
    category: getFileNameAndFolder(import.meta.url).folderName.name, // Thư mục chứa lệnh
    type: Discord.ApplicationCommandType.ChatInput, // Kiểu lệnh
    description: "", // Mô tả của lệnh
    userPerms: [], // Các quyền đề sử dụng lệnh, mặc định sẽ là "SendMessage"
    owner: false, // Lệnh chỉ dành cho chủ bot
    cooldown: 10, // Thời gian tái sử dụng lệnh
    // options: [], // Các tùy chọn khác của lệnh 
    /**
     * Hàm thực thi chính của lệnh
     * @param {Discord.Client} client - Đối tượng Discord Client
     * @param {Discord.Interaction} interaction - Đối tượng Discord Interaction
     */
    executeCommand(client, interaction) {
        // code
    },
});

export default new Commands;
```
- Kiểu 2
```js
import { SlashCommandBuilder, getFileNameAndFolder, Discord } from "blackcat.js";

const PingCommands = class extends SlashCommandBuilder {
    constructor () {
        super({
            name: getFileNameAndFolder(import.meta.url).fileName.name, // Tên của lệnh slash
            category: getFileNameAndFolder(import.meta.url).folderName.name, // Thư mục chứa lệnh
            type: Discord.ApplicationCommandType.ChatInput, // Kiểu lệnh
            description: "", // Mô tả của lệnh
            userPerms: [], // Các quyền đề sử dụng lệnh, mặc định sẽ là "SendMessage"
            owner: false, // Lệnh chỉ dành cho chủ bot
            cooldown: 10, // Thời gian tái sử dụng lệnh
            // options: [], // Các tùy chọn khác của lệnh 
        });
    };
    /**
     * Hàm thực thi chính của lệnh
     * @param {Discord.Client} client - Đối tượng Discord Client
     * @param {Discord.Interaction} interaction - Đối tượng Discord Interaction
     */
    executeCommand(client, interaction) {
        // code
    };
};

export default new PingCommands;
```

## Một số [Function](https://github.com/VinhBot/blackcat.js/tree/main/test/Function) có thể hữu ích với bạn.
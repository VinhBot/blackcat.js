import { AsciiTable3 } from "ascii-table3";
import Discord from "discord.js";
import nodeUrl from "node:url";
import chalk from "chalk";
import fs from "node:fs";
/**
 * Lớp đại diện cho một client Discord với chức năng mở rộng.
 * @extends Discord.Client
 */
export class Client extends Discord.Client {
    /**
     * Constructor cho lớp Client.
     * @param {Object} options - Các tùy chọn để cấu hình client.
     * @param {Object} options.discordClient - Các tùy chọn cho client Discord.
     * @param {Object} options.commandHandler - Các tùy chọn cho trình xử lý lệnh.
     * @param {Object} options.config - Các tùy chọn cấu hình.
     */
    constructor(options) {
        // Gọi constructor của lớp cha (Discord.Client) với các tùy chọn phù hợp.
        super(options.discordClient || {
            allowedMentions: {
                parse: ["roles", "users", "everyone"],
                repliedUser: false,
            },
            partials: [Object.keys(Discord.Partials)],
            intents: [
                Discord.GatewayIntentBits.Guilds,
                Discord.GatewayIntentBits.GuildMessages,
                Discord.GatewayIntentBits.MessageContent,
                Discord.GatewayIntentBits.GuildMembers,
            ],
        });
        // Đặt ngôn ngữ hiện tại cho gói. mặc định là tiếng việt
        this.currentLanguage = options.commandHandler.setLanguage || "vi";
        // Các tùy chọn cho trình xử lý lệnh.
        this.command = options.commandHandler;
        // Các tùy chọn cấu hình.
        this.config = options.config;
        // Khởi tạo một Discord.Collection để lưu trữ slash commands.
        this.slashCommands = new Discord.Collection();
        // Khởi tạo một Discord Collection để quản lý cooldown của lệnh.
        this.cooldowns = new Discord.Collection();
        // Khởi tạo một Discord Collection để lưu trữ các lệnh thông thường.
        this.commands = new Discord.Collection();
        // Khởi tạo một Discord Collection để lưu trữ các bí danh của lệnh.
        this.aliases = new Discord.Collection();
        // Gọi và sử dụng hàm commandHandler.
        this.commandHandler();
        /**
         * Token xác thực cho bot đã đăng nhập.
         * @type {string} 
         */
        if (!this.config.tokenBot) {
            console.error(chalk.blue("[BlackCat-DJS]: ") + chalk.red(this.getLocalizedString("tokenBot")));
        } else {
            // Đăng nhập vào bot với token được cung cấp.
            this.login(this.config.tokenBot);
        };
    };
    /*
     * @info Định nghĩa một hàm xử lý lệnh được gọi là `commandHandler` với từ khóa `async`.
     */
    async commandHandler() {
        if (this.command.prefixCommand === Boolean(true)) {
            // Tạo bảng lệnh (commandTable): •Sử dụng thư viện AsciiTable3 để tạo bảng với tiêu đề là "Tên Lệnh" và "Trạng thái". •setStyle('unicode-round') thiết lập kiểu hiển thị của bảng.
            const commandTable = new AsciiTable3('Commands').setHeading(this.getLocalizedString("commandHander.prefix.cmd1"), this.getLocalizedString("commandHander.prefix.cmd2")).setStyle('unicode-round');
            // Đọc các tệp lệnh từ đường dẫn cụ thể (commandsPath):
            const commandsPath = this.command.path.prefixCommand;
            // Sử dụng fs.readdirSync để đọc danh sách thư mục trong đường dẫn và áp dụng map để duyệt qua từng thư mục.
            await Promise.all(fs.readdirSync(commandsPath).map(async (dir) => {
                // Đọc danh sách tệp tin trong mỗi thư mục và lọc ra các tệp có đuôi là ".js".
                const commands = fs.readdirSync(`${commandsPath}/${dir}/`).filter((file) => file.endsWith(".js"));
                for (let file of commands) {
                    // Dùng import để đọc nội dung của mỗi tệp và thiết lập lệnh từ thuộc tính default.
                    const pull = await import(this.globalFilePath(`${commandsPath}/${dir}/${file}`)).then((x) => x.default);
                    // Nếu lệnh có tên (pull.name), thêm vào this.commands được khai báo thì sẽ in ra commandTable với trạng thái "✔️ sẵn sàng".
                    if (pull.name) {
                        this.commands.set(pull.name, pull);
                        commandTable.addRowMatrix([[pull.name, this.getLocalizedString("commandHander.prefix.cmd3")]]);
                    } else {
                        // Nếu không có tên, thêm vào commandTable với trạng thái "❌ Lỗi".
                        commandTable.addRowMatrix([[file, this.getLocalizedString("commandHander.prefix.cmd4")]]);
                        return;
                    };
                    // Nếu có bí danh (pull.aliases), thêm mỗi bí danh vào this.aliases.
                    if (pull.aliases && Array.isArray(pull.aliases)) {
                        pull.aliases.forEach((alias) => this.aliases.set(alias, pull.name));
                    };
                };
            }));
            // In bảng đã tạo ra console với màu sắc cyan.
            console.log(chalk.cyan(commandTable.toString()));
            // Đây là một sự kiện (event listener) được đăng ký để lắng nghe sự kiện MessageCreate. Điều này có nghĩa là khi một tin nhắn mới được tạo ra trong máy chủ Discord mà bot đang tham gia, đoạn mã trong hàm callback này sẽ được thực thi.
            this.on(Discord.Events.MessageCreate, async (message) => {
                // Lấy tiền tố (prefix) được đặt trong cấu hình của bot. Có vẻ như đối tượng this có một thuộc tính config và trong config có một thuộc tính prefix.
                const prefix = this.config.prefix;
                // Kiểm tra nếu tin nhắn không phải từ bot và bắt đầu bằng prefix đã cho
                if (!message.author.bot && message.content.startsWith(prefix)) {
                    // Cắt bỏ tiền tố và khoảng trắng ở đầu và cuối nội dung tin nhắn, sau đó chia thành mảng các tham số (args).
                    const args = message.content.slice(prefix.length).trim().split(/ +/g);
                    // Lấy lệnh từ mảng tham số và chuyển đổi thành chữ thường.
                    const cmd = args.shift().toLowerCase();
                    // Nếu độ dài của lệnh sau khi chuyển đổi thành chữ thường là 0, không làm gì cả.
                    if (cmd.length === 0) return;
                    // Lấy lệnh từ một bộ sưu tập (presumably Map) của các lệnh sử dụng tên lệnh.
                    let command = this.commands.get(cmd);
                    // Nếu không tìm thấy lệnh trực tiếp bằng tên, kiểm tra xem có lệnh nào có bí danh (alias) giống với tên lệnh không.
                    if (!command) command = this.commands.get(this.aliases.get(cmd));
                    if (command) {
                        const embed = new Discord.EmbedBuilder().setTitle(this.getLocalizedString("commandHander.prefix.mes1")).setColor("Random"); // Tạo một đối tượng embed để tạo thông báo nhúng (embedded message) với tiêu đề "Thiếu quyền" và màu ngẫu nhiên.
                        // Nếu lệnh yêu cầu quyền hạn (command.permissions) và người dùng không có đủ quyền, bot sẽ gửi một thông báo nhúng thông báo về việc thiếu quyền.
                        if (command.permissions && !message.member.permissions.has(Discord.PermissionsBitField.resolve(command.permissions || []))) return message.reply({
                            embeds: [embed.setDescription(this.getLocalizedString("commandHander.prefix.mes2", {
                                permissions: command.permissions
                            }))],
                        });
                        // Nếu người dùng đang trong thời gian cooldown cho lệnh, bot sẽ gửi một thông báo về việc đợi để sử dụng lệnh lại sau một khoảng thời gian.
                        if (onCoolDown(this.cooldowns, message, command)) return message.reply({
                            content: this.getLocalizedString("commandHander.prefix.mes3", {
                                timestamp: onCoolDown(this.cooldowns, message, command).toFixed(),
                                cmdName: command.name
                            })
                        });
                        // Nếu lệnh chỉ dành cho chủ sở hữu (command.owner) và người gửi lệnh không phải là chủ sở hữu, bot sẽ gửi một thông báo về việc chỉ chủ sở hữu mới có thể sử dụng lệnh này.
                        if (command.owner && message.author.id !== this.config.developer) return message.reply({
                            embeds: [embed.setDescription(this.getLocalizedString("commandHander.prefix.mes4", {
                                developer: this.config.developer
                            }))]
                        });
                        // Nếu tìm thấy lệnh, thực thi lệnh đó bằng cách gọi hàm command.command và truyền vào các đối số như this (đối tượng bot cách gọi khác là client), message (đối tượng tin nhắn), args (mảng tham số), và prefix (tiền tố của lệnh).
                        const options = { client: this, message, args, prefix};
                        command.command(options);
                        // Nếu không tìm thấy lệnh, bot sẽ gửi một tin nhắn phản hồi nói rằng lệnh không hợp lệ và sau đó tự động xóa tin nhắn phản hồi đó sau 10 giây.
                    } else return message.reply({ content: this.getLocalizedString("commandHander.prefix.mes5", { prefix: prefix }) }).then((msg) => {
                        setTimeout(() => msg.delete(), ms("5s")); // tự động xóa sau 5 giây
                    });
                } else {
                    // Kiểm tra nếu bot được mention trong tin nhắn
                    if (message.mentions.users.has(this.user.id)) {
                        return message.reply({ content: this.getLocalizedString("commandHander.prefix.mes6", { prefix: prefix }) });
                    };
                };
            });
            // Hàm kiểm tra thời gian chờ giữa các lần thực hiện lệnh trong Discord
            function onCoolDown(cooldowns, message, commands) {
                // Kiểm tra điều kiện đầu vào: nếu không có message hoặc commands, thoát khỏi hàm
                if (!message || !commands) return;
                // Kiểm tra xem lệnh đã có trong bảng thời gian chờ chưa
                if (!cooldowns.has(commands.name)) {
                    // Nếu chưa có, khởi tạo bảng thời gian chờ với tên lệnh là key
                    cooldowns.set(commands.name, new Discord.Collection());
                };
                // Lấy thời gian hiện tại
                const now = Date.now();
                // Lấy bảng thời gian chờ của lệnh
                const timestamps = cooldowns.get(commands.name);
                // Xác định thời gian chờ giữa các lần thực hiện lệnh
                const cooldownAmount = commands.cooldown * 1000;
                // Kiểm tra xem thành viên đã sử dụng lệnh trong khoảng thời gian chờ hay chưa
                if (timestamps.has(message.member.id)) {
                    // Nếu đã sử dụng, xác định thời gian kết thúc thời gian chờ của lần trước
                    const expirationTime = timestamps.get(message.member.id) + cooldownAmount;
                    // So sánh với thời gian hiện tại để xác định còn bao lâu có thể sử dụng lại lệnh
                    if (now < expirationTime) {
                        return (expirationTime - now) / 1000; // Trả về thời gian còn lại trước khi có thể sử dụng lại lệnh
                    } else {
                        // Nếu đã hết thời gian chờ, cập nhật thời gian và reset thời gian chờ
                        timestamps.set(message.member.id, now);
                        setTimeout(() => timestamps.delete(message.member.id), cooldownAmount);
                        return false;
                    };
                } else {
                    // Nếu chưa sử dụng lệnh, cập nhật thời gian và reset thời gian chờ
                    timestamps.set(message.member.id, now);
                    setTimeout(() => timestamps.delete(message.member.id), cooldownAmount);
                    return false;
                };
            };
        };
        /**[slashCommands]*/
        if (this.command.slashCommand === Boolean(true)) {
            // Khởi tạo bảng ASCII (AsciiTable3) để hiển thị thông tin về slashCommands.
            let slashTable = new AsciiTable3('slashCommands').setHeading(this.getLocalizedString("commandHander.slash.cmd1"), this.getLocalizedString("commandHander.slash.cmd2")).setStyle('unicode-round');
            // Khởi tạo một mảng để lưu trữ tất cả thông tin về slashCommands (allSlashCommands).
            const allSlashCommands = [];
            // Lấy đường dẫn của slashCommands từ this.command.path.slashCommand.
            const slashPath = this.command.path.slashCommand;
            // Lặp qua từng thư mục trong thư mục slashCommands và xử lý từng file.
            for (const dir of fs.readdirSync(slashPath)) {
                const filterCommands = fs.readdirSync(`${slashPath}/${dir}/`).filter((file) => file.endsWith(".js"));
                for (const slashCmds of filterCommands) {
                    try {
                        // Trong vòng lặp bên trong, thử import từng file slash command và xử lý nếu không có lỗi.
                        const command = await import(this.globalFilePath(`${slashPath}/${dir}/${slashCmds}`)).then((e) => e.default);
                        this.slashCommands.set(command.name, command); // this.slashCommands: Một Collection để lưu trữ các slash commands của bot.
                        // !command.name || !command.description: Kiểm tra xem lệnh có tên hoặc mô tả không. Nếu một trong những điều kiện đó sai (! là toán tử phủ định), thì có lỗi. Nếu có lỗi, hiển thị "❌ Lỗi", ngược lại hiển thị "✔️ sẵn sàng".
                        slashTable.addRowMatrix([[command.name, !command.name || !command.description ? this.getLocalizedString("commandHander.slash.cmd3") : this.getLocalizedString("commandHander.slash.cmd4")]]);
                        allSlashCommands.push({ // allSlashCommands: Một mảng để lưu trữ thông tin về tất cả các slash commands.
                            name: command.name.toLowerCase(),
                            description: command.description,
                            type: command.type,
                            options: command.options || null,
                        });
                    } catch (error) {
                        console.error(this.getLocalizedString("commandHander.slash.cmd5", {
                            slashCmds: slashCmds,
                            slashCmds1: error.message
                        }));
                    };
                };
            };
            console.log(chalk.green(slashTable.toString())); // Hiển thị bảng thông tin về slash commands dưới dạng ASCII.
            // HTTP request đăng ký (register) slash commands khi client của bot đã sẵn sàng (ready). 
            this.on(Discord.Events.ClientReady, async () => {
                // Khởi tạo đối tượng rest từ lớp Discord.REST: Tạo một đối tượng REST để thực hiện các HTTP requests đến Discord API, sử dụng phiên bản API 10 và token của bot từ cấu hình (this.config.tokenBot).
                const rest = new Discord.REST({ version: "10" }).setToken(this.config.tokenBot);
                // Gửi HTTP PUT request để đăng ký slash commands:
                // •Gửi một HTTP PUT request đến Discord API endpoint applicationCommands với ID của bot (this.user.id). Dữ liệu gửi đi bao gồm mảng allSlashCommands chứa thông tin về tất cả các slash commands.
                // •return await: Đảm bảo rằng hàm này trả về một promise, chờ đợi cho đến khi request hoàn thành.
                // •rest.put: Gửi HTTP PUT request.
                // •Discord.Routes.applicationCommands: Xác định endpoint của API để đăng ký slash commands.
                // •{ body: allSlashCommands }: Gửi dữ liệu trong phần thân của request, bao gồm thông tin về các slash commands
                return await rest.put(Discord.Routes.applicationCommands(this.user.id), {
                    body: allSlashCommands
                });
            });
            // đoạn này tự hiểu nhé lười phân tích vcl :))
            this.on(Discord.Events.InteractionCreate, async (interaction) => {
                if (interaction.type === Discord.InteractionType.ApplicationCommand) {
                    if (!this.slashCommands.has(interaction.commandName) || interaction.user.bot || !interaction.guild) return;
                    const SlashCommands = this.slashCommands.get(interaction.commandName);
                    if (!SlashCommands) return;
                    if (SlashCommands) {
                        try {
                            const embed = new Discord.EmbedBuilder().setTitle(this.getLocalizedString("commandHander.slash.slash1")).setColor("Random");

                            if (SlashCommands.owner && this.config.developer.includes(interaction.user.id)) return interaction.reply({
                                content: this.getLocalizedString("commandHander.slash.slash2")
                            });
                            if (SlashCommands.userPerms && !interaction.member.permissions.has(Discord.PermissionsBitField.resolve(SlashCommands.userPerms || []))) return interaction.reply({
                                embeds: [embed.setDescription(this.getLocalizedString("commandHander.slash.slash3", {
                                    cmd1: SlashCommands.userPerms,
                                    cmd2: interaction.channelId,
                                    cmd3: SlashCommands.name
                                }))]
                            });

                            SlashCommands.run(this, interaction);
                        } catch (error) {
                            if (interaction.replied) return await interaction.editReply({
                                embeds: [new Discord.EmbedBuilder().setDescription(this.getLocalizedString("commandHander.slash.slash4"))],
                                ephemeral: true,
                            });
                            console.log(error);
                        };
                    };
                };
            });
        };
    };
    /**
     * @info Chuyển đổi đường dẫn tệp thành URL toàn cầu (global URL) sử dụng pathToFileURL của Node.js.
     * @param {string} path Đường dẫn tệp cần chuyển đổi.
     * @returns {string} URL toàn cầu hoặc đường dẫn ban đầu nếu chuyển đổi không thành công.
     */
    globalFilePath(path) {
        // Sử dụng pathToFileURL của Node.js để chuyển đổi đường dẫn thành URL.
        // Nếu thành công, trả về href của URL; nếu không, trả về đường dẫn ban đầu.
        return nodeUrl.pathToFileURL(path)?.href || path;
    };
    /**
    * @info Hàm `getLocalizedString` dùng để lấy chuỗi dịch dựa trên khóa và thực hiện thay thế giá trị nếu cần.
    * @param {string} key Khóa để xác định chuỗi cần lấy.
    * @param {Object} [replacements] Đối tượng chứa các giá trị thay thế có thể được sử dụng.
    * @warning Không thể sử dụng hàm này bên ngoài module hoặc class chứa nó do sự phụ thuộc vào ngôn ngữ (`en` và `vi`) và biến `currentLanguage`.
    */
    getLocalizedString(key, replacements) {
        // Đối tượng chứa các chuỗi cho từng ngôn ngữ
        let languageStrings = {
            "en": {
                tokenBot: "You haven't added a token for the bot yet",
                commandHander: {
                    prefix: {
                        // command table (commandTable)
                        cmd1: "Command Name",
                        cmd2: "Status",
                        cmd3: "✔️ Ready",
                        cmd4: "❌ Error",
                        // messages in messageCreate
                        mes1: "Missing permissions",
                        mes2: "You don't have the {permissions} permission to use this command",
                        mes3: "❌ You've used the command too quickly. Please wait {timestamp} seconds before using `{cmdName}` again",
                        mes4: "You can't use this command. Only <@{developer}> can use it",
                        mes5: "Invalid command. Type {prefix}help to review all commands",
                        mes6: "Hello. My prefix is: {prefix}",
                    },
                    slash: {
                        // command table (slashTable) 
                        cmd1: "Command Name",
                        cmd2: "Status",
                        cmd3: "❌ Error",
                        cmd4: "✔️ Ready",
                        cmd5: "Error inputting {slashCmds}: {slashCmds1}",
                        // messages in interaction 
                        slash1: "Missing permissions to use the command",
                        slash2: "I'm not a foolish bot, only the owner can use this command",
                        slash3: "Sorry, you don't have the {cmd1} permission in <#{cmd2}> to use the {cmd3} command",
                        slash4: "An error occurred while executing the command. Apologies for the inconvenience <3",
                    }
                }
            }, // tiếng anh 
            "vi": {
                tokenBot: "Bạn vẫn chưa thêm token cho bot",
                commandHander: {
                    prefix: {
                        // bảng điều khiển (commandTable)
                        cmd1: "Tên Lệnh",
                        cmd2: "Trạng thái",
                        cmd3: "✔️ sẵn sàng",
                        cmd4: "❌ Lỗi",
                        // tin nhắn trong messageCreate
                        mes1: "Thiếu quyền",
                        mes2: "Bạn không có quyền {permissions} để sử dụng lệnh này",
                        mes3: "❌ Bạn đã sử dụng lệnh quá nhanh vui lòng đợi {timestamp} giây trước khi sử dụng lại `{cmdName}`",
                        mes4: "Bạn không thể sử dụng lệnh này chỉ có <@{developer}> mới có thể sử dụng",
                        mes5: "Sai lệnh. nhập {prefix}help để xem lại tất cả các lệnh",
                        mes6: "Xin chào. prefix của tôi là: {prefix}",
                    },
                    slash: {
                        // bảng điều khiển (slashTable) 
                        cmd1: "Tên Lệnh",
                        cmd2: "Trạng thái",
                        cmd3: "❌ Lỗi",
                        cmd4: "✔️ sẵn sàng",
                        cmd5: "Lỗi nhập {slashCmds}: {slashCmds1}",
                        // tin nhắn trong interaction 
                        slash1: "Thiếu quyền sử dụng lệnh",
                        slash2: "Tôi, không phải là bot ngu ngốc, chỉ chủ sở hữu mới có thể sử dụng lệnh này",
                        slash3: "Xin lỗi, bạn không có quyền {cmd1} trong <#{cmd2}> để sử dụng lệnh {cmd3} này",
                        slash4: "Đã xảy ra lỗi khi thực hiện lệnh, xin lỗi vì sự bất tiện <3",
                    }
                }
            }, // tiếng việt
        };
        // Truy cập đệ quy vào đối tượng ngôn ngữ
        let currentObj = languageStrings[this.currentLanguage];
        for (const k of key.split('.')) {
            currentObj = currentObj[k];
            if (!currentObj) return "Không tìm thấy chuỗi ký tự";
        };
        // Thực hiện thay thế các giá trị
        if (typeof currentObj === 'string' && replacements) {
            for (const [placeholder, value] of Object.entries(replacements)) {
                currentObj = currentObj.replace(`{${placeholder}}`, value);
            };
        };
        return currentObj;
    };
    /**
     * Chuyển đổi đối tượng thành định dạng JSON.
     * @returns {Object} Đối tượng JSON tương ứng với đối tượng hiện tại.
     */
    toJSON() {
        return { ...this };
    };
};
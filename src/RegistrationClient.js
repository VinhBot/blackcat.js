// Import file
const { Client, AllowedMentionsTypes, Partials, Collection, Events, REST, Routes, PermissionsBitField, EmbedBuilder, ApplicationCommandType, InteractionType, GatewayIntentBits } = require("discord.js");
const getLocalizedString = require("./Language/getLocalizedString.js");
const globalFilePath = require("./Functions/globalFilePath.js");
const MessageCreate = require("./Functions/MessageCreate.js");
// Import package theo yêu cầu
const { AsciiTable3 } = require("ascii-table3");
const chalk = require("chalk");
const path = require("node:path");
const fs = require("node:fs");

module.exports = class RegistrationClient extends Client {
    /**
     * Tạo một instance của Client.
     * @param {Object} options - Các tùy chọn cho Client.
     * @param {Object} options.discordClient - Cấu hình cho Discord.Client nếu được sử dụng.
     * @param {Object} options.config - Cấu hình bot.
     * @param {Object} options.commandHandler - Tùy chọn cho commandHandler.
     */
    constructor (options = {}) {
        super(options.discordClient || {
            allowedMentions: {
                parse: [
                    AllowedMentionsTypes.Everyone,
                    AllowedMentionsTypes.User,
                    AllowedMentionsTypes.Role,
                ],
                repliedUser: false,
            },
            partials: [Object.keys(Partials)],
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates
            ],
        });
        // thiết lập cấu hình collection
        this.slashCommands = new Collection(); // Lưu trữ các slash commands.
        this.cooldowns = new Collection(); // Quản lý cooldown của lệnh.
        this.commands = new Collection(); // Lưu trữ các lệnh thông thường.
        this.aliases = new Collection(); // Lưu trữ các bí danh của lệnh.
        // Thiết lập tùy chọn.
        this.options = options;
        // Thiết lập cấu hình cho bot.
        this.config = options.config;
        // lấy token của bot.
        this.token = this.config.botToken;
    };
    /**
     * 
     */
    setCommandHandler(options = {}) {
        return this.options.commandHandler = options;
    };
    /**
     * Thiết lập token cho bot.
     */
    setToken(options) {
        return this.token = options;
    };
    /**
     * 
     */
    setPrefixCommand(options = {}) {
        return {
            messageCreate: false,
            pathToCommand: "./commands/",
            registerCommmand: options.registerCommmand,
        };
    };
    /**
     * 
     */
    setSlashCommand(options = {}) {
        const ops = {
            restVersion: "10",
            guildCommands: "",
            pathToCommand: "commands",
            registerCommmand: options.registerCommmand,
        };
    };
    /**
     * 
     */
    build(options = {}) {
        return new Promise((resolve, reject) => {
            const commandHandler = this.options.commandHandler || {};
            // Thiết lập ngôn ngữ của modules 
            if (!commandHandler.setCurrentLanguage) {
                this.currentLanguage = "vi";
            } else {
                this.currentLanguage = commandHandler.setCurrentLanguage;
            };
            // Khởi chạy chức năng khi có yêu cầu
            try {
                if (commandHandler.eventHandler) {
                    this.#EventHandler(commandHandler.eventHandler);
                };
                if (commandHandler.prefixCommand) {
                    this.#PrefixCommand(commandHandler.prefixCommand);
                };
                if (commandHandler.slashCommand) {
                    this.#SlashCommand(commandHandler.slashCommand);
                };
                if (options.login) {
                    this.login(this.token);
                };
                resolve(this);
            } catch (error) {
                reject(error);
            };
        });
    };
    /**
     * @returns {Object} đưa dữ liệu đầu vào theo dạng json.
     */
    JSON() {
        return { ...this.options };
    };
    /**
     * Xử lý các sự kiện và gán chúng vào client.
     * @param {Object} options - Các tùy chọn cho việc xử lý sự kiện.
     * @param {string} options.eventFolder - Tên thư mục chứa các file sự kiện.
     * @param {string} options.pathToEvent - Đường dẫn cụ thể đến thư mục chứa các file sự kiện.
     */
    #EventHandler(options = {}) {
        // Đọc nội dung của file package.json để xác định loại module (CommonJS hoặc ECMAScript).
        fs.readFile(path.resolve(process.cwd(), "package.json"), "utf-8", (error, database) => {
            if (error) return console.error(chalk.red(error));
            // Kiểm tra nếu không có tên thư mục cho sự kiện, hiển thị thông báo lỗi.
            if (!options.eventFolder) {
                return console.log(chalk.red("[BlackCat-EVENTS]: Bạn vẫn chưa thêm tên thư mục cho event"));
            } else if (!Array.isArray(options.eventFolder)) {
                return console.log(chalk.red("[BlackCat-EVENTS]: Đầu vào phải là giá trị như sau eventFolder: ['Tên thư mục']"));
            };
            // Kiểm tra nếu không có đường dẫn cụ thể hoặc đã bị sai, hiển thị thông báo lỗi.
            if (!options.pathToEvent) return console.log(chalk.red("[BlackCat-EVENTS]: Bạn vẫn chưa thêm đường dẫn cụ thể hoặc đã bị sai vui lòng kiểm trai lại"));
            const parsedDatabase = JSON.parse(database);
            const type = parsedDatabase.type === undefined ? "CommonJS" : parsedDatabase.type === "commonjs" ? "CommonJS" : parsedDatabase.type === "module" ? "ECMAScript" : "";
            // Duyệt qua từng thư mục chứa sự kiện.
            options.eventFolder.forEach(async (eventsDir) => {
                // Tạo bảng ASCII để hiển thị thông tin về các sự kiện.
                let table = new AsciiTable3("Events - Create").setHeading(getLocalizedString({ lang: this.currentLanguage, key: "eventHandler.event1" }), getLocalizedString({ lang: this.currentLanguage, key: "eventHandler.event2" })).setStyle("unicode-round");
                // Duyệt qua từng file sự kiện trong thư mục
                for (const file of fs.readdirSync(`${options.pathToEvent}/${eventsDir}`).filter((file) => file.endsWith(".js"))) {
                    // Import sự kiện từ file và lấy default export của nó.
                    let events = type === "CommonJS" ? require(`${process.cwd()}/${options.pathToEvent}/${eventsDir}/${file}`) : type === "ECMAScript" ? await import(globalFilePath(`./${options.pathToEvent}/${eventsDir}/${file}`)).then((e) => e.default) : null;
                    // Gán sự kiện vào client, sử dụng once() hoặc on() tùy thuộc vào eventOnce của sự kiện.
                    if (events.eventOnce) {
                        this.once(events.eventName, (...args) => events.executeEvents(this, ...args));
                    } else {
                        this.on(events.eventName, (...args) => events.executeEvents(this, ...args));
                    };
                    // Thêm thông tin của sự kiện vào bảng ASCII.
                    if (events.eventName) {
                        table.addRowMatrix([[events.eventCustomName, getLocalizedString({ lang: this.currentLanguage, key: "eventHandler.event3" })]]);
                    } else {
                        table.addRowMatrix([[events.eventCustomName, "❌"]]);
                    };
                };
                // Log bảng ASCII vào console.
                console.log(chalk.magenta(table.toString()));
            });
        });
    };
    /**
     * Xử lý các lệnh prefix và gán chúng vào client.
     * @param {Object} options - Các tùy chọn cho việc xử lý lệnh prefix.
     * @param {string} options.pathToCommand - Đường dẫn đến thư mục chứa các file lệnh.
     */
    #PrefixCommand(options = {}) {
        // Đọc nội dung của file package.json để xác định loại module (CommonJS hoặc ECMAScript).
        fs.readFile(path.resolve(process.cwd(), "package.json"), "utf-8", async (error, database) => {
            if (error) return console.error(chalk.red(error));
            const parsedDatabase = JSON.parse(database);
            const type = parsedDatabase.type === undefined ? "CommonJS" : parsedDatabase.type === "commonjs" ? "CommonJS" : parsedDatabase.type === "module" ? "ECMAScript" : "";
            /**
             * Kiểm tra xem một đường dẫn có phải là thư mục hay không.
             * @param {string} path - Đường dẫn cần kiểm tra.
             * @returns {boolean} - Trả về true nếu là thư mục, ngược lại trả về false.
             */
            function isDirectory(path) {
                try {
                    // Sử dụng fs.statSync để kiểm tra xem đường dẫn có phải là thư mục hay không
                    const stats = fs.statSync(path);
                    return stats.isDirectory(); // Trả về true nếu đường dẫn là thư mục, ngược lại trả về false
                } catch (error) {
                    // Xử lý lỗi nếu có
                    console.error(chalk.red("[blackcat-prefixCommand]: vui lòng kiểm tra lại đường dẫn đến thư mục lệnh của bạn."));
                    return false; // Trả về false nếu xảy ra lỗi
                };
            };
            // Lấy các chuỗi ngôn ngữ dùng để tạo tiêu đề và dòng trong bảng lệnh.
            const headingLang1 = getLocalizedString({ lang: this.currentLanguage, key: "commandHander.prefix.cmd1" });
            const headingLang2 = getLocalizedString({ lang: this.currentLanguage, key: "commandHander.prefix.cmd2" });
            const rowLang1 = getLocalizedString({ lang: this.currentLanguage, key: "commandHander.prefix.cmd3" });
            const rowLang2 = getLocalizedString({ lang: this.currentLanguage, key: "commandHander.prefix.cmd4" });
            // Tạo bảng lệnh để hiển thị thông tin về các lệnh.
            const commandTable = new AsciiTable3('Commands').setHeading(headingLang1, headingLang2).setStyle('unicode-round');
            // Kiểm tra xem đường dẫn đến thư mục lệnh có phải là một chuỗi hợp lệ và là thư mục hay không.
            if (typeof options.pathToCommand === "string" && isDirectory(options.pathToCommand)) {
                // Duyệt qua từng thư mục trong thư mục lệnh và xử lý từng file lệnh.
                await Promise.all(fs.readdirSync(options.pathToCommand).map(async (dir) => {
                    // Đọc danh sách các file lệnh trong mỗi thư mục và lọc ra các file có đuôi là ".js".
                    for (let file of fs.readdirSync(`${options.pathToCommand}/${dir}/`).filter((file) => file.endsWith(".js"))) {
                        // Import lệnh từ file và lấy default export của nó.
                        const CommandBuilder = type === "CommonJS" ? require(`${process.cwd()}/${options.pathToCommand}/${dir}/${file}`) : type === "ECMAScript" ? await import(globalFilePath(`${options.pathToCommand}/${dir}/${file}`)).then((x) => x.default) : "";
                        // Kiểm tra xem lệnh được import có phải là một class hay một function.
                        let commands = (typeof CommandBuilder === "function" && CommandBuilder.toString().startsWith("class")) ? new CommandBuilder() : CommandBuilder;
                        // Nếu lệnh có tên và là một đối tượng, thêm lệnh vào commands và thêm thông tin vào bảng lệnh.
                        if (typeof commands === "object" && commands.name) {
                            this.commands.set(commands.name, commands);
                            // Nếu lệnh có các alias, thêm chúng vào aliases.
                            if (commands.aliases && Array.isArray(commands.aliases)) {
                                commands.aliases.forEach((alias) => this.aliases.set(alias, commands.name));
                            };
                            commandTable.addRowMatrix([[commands.name, rowLang1]]); // Đưa tên lệnh ra bảng trong Terminal
                        } else {
                            commandTable.addRowMatrix([[file, rowLang2]]); // Nếu không có tên, thêm vào commandTable với trạng thái "❌ Lỗi".
                            return;
                        };
                    };
                }));
                // In bảng lệnh ra terminal với màu sắc chủ đạo là cyan.
                console.log(chalk.cyan(commandTable.toString()));
            } else return;
        });
        if (typeof options.messageCreate === "boolean") {
            this.on(Events.MessageCreate, (message) => MessageCreate(this, message));
        } else return console.log(chalk.redBright("[blackcat-MessageCreate]: Bạn chỉ có thể gán 2 giá trị boolean thôi."));
    };
    /**
     * 
     */
    #SlashCommand(options = {}) {
        fs.readFile(path.resolve(process.cwd(), "package.json"), "utf-8", async (error, database) => {
            if (error) return console.error(chalk.red(error));
            const parsedDatabase = JSON.parse(database);
            const type = parsedDatabase.type === undefined ? "CommonJS" : parsedDatabase.type === "commonjs" ? "CommonJS" : parsedDatabase.type === "module" ? "ECMAScript" : "";
            // Khởi tạo một mảng để lưu trữ tất cả thông tin về slashCommands (allSlashCommands).
            const allSlashCommands = [];
            // Tạo bảng lệnh để hiển thị thông tin về các lệnh.
            const commandTable = new AsciiTable3('SlashCommands').setHeading("Tên lệnh", "Trạng thái").setStyle('unicode-round');
            // Lặp qua từng thư mục trong thư mục slashCommands và xử lý từng file.
            for (const dir of fs.readdirSync(options.pathToCommand)) {
                // Lặp qua từng file command đã lọc.
                for (const slashCmds of fs.readdirSync(`${options.pathToCommand}/${dir}/`).filter((file) => file.endsWith(".js"))) {
                    try {
                        // Thử import từng file slash command và lấy default export của nó.
                        const command = type === "CommonJS" ? require(`${process.cwd()}/${options.pathToCommand}/${dir}/${slashCmds}`) : type === "ECMAScript" ? await import(globalFilePath(`${options.pathToCommand}/${dir}/${slashCmds}`)).then((e) => e.default) : "";
                        // Lưu command vào collection slashCommands của bot.
                        this.slashCommands.set(command.name, command);
                        commandTable.addRowMatrix([[command.name, "✔️ Sẵn sàng"]]);
                        // Thêm thông tin của command vào mảng allSlashCommands.
                        allSlashCommands.push({
                            type: command.type || ApplicationCommandType.ChatInput,
                            name: command.name.toLowerCase(),
                            description: command.description,
                            options: command.options || null,
                        });
                    } catch (error) {
                        commandTable.addRowMatrix([[command.name, "❌"]]);
                        // Log lỗi nếu import hoặc xử lý command thất bại.
                        console.error(getLocalizedString({
                            lang: this.currentLanguage,
                            key: "commandHander.slash.cmd5",
                            replacements: {
                                slashCmds: slashCmds,
                                slashCmds1: error.message
                            }
                        }));
                    };
                };
            };
            console.log(chalk.blue(commandTable.toString()));
        });
        // Sự kiện được kích hoạt khi bot sẵn sàng.
        this.on(Events.ClientReady, async (bot) => {
            // Tạo REST client để gửi và cập nhật slash commands vào ứng dụng Discord.
            const rest = new REST({ version: options.restVersion || "10" }).setToken(this.token);
            if (options.guildCommands) {
                await rest.put(Routes.applicationGuildCommands(bot.user.id, options.guildCommands), {
                    body: allSlashCommands,
                });
            } else {
                // Gửi request PUT để cập nhật slash commands.
                await rest.put(Routes.applicationCommands(bot.user.id), {
                    body: allSlashCommands,
                });
            };
        });
        // Sự kiện được kích hoạt khi có sự tương tác từ người dùng.
        this.on(Events.InteractionCreate, async (interaction) => {
            /**
             * Kiểm tra thời gian cooldown cho một lệnh.
             * @param {Object} commandName - Tên của lệnh.
             * @param {number} cooldownTime - Thời gian cooldown cho lệnh (đơn vị: giây).
             * @returns {number | null} - Thời gian còn lại cho cooldown (nếu có), null nếu đã hết cooldown.
             */
            function checkCooldown(commandName, cooldownTime) {
                if (!this.cooldowns.has(commandName.name)) {
                    this.cooldowns.set(commandName.name, new Collection());
                };
                const now = Date.now();
                const timestamps = this.cooldowns.get(commandName.name);
                const cooldownAmount = cooldownTime * 1000; // chuyển cooldownTime từ giây sang milliseconds
                if (timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        return timeLeft.toFixed(1);
                    };
                };
                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
                return null;
            };
            // Kiểm tra nếu interaction là một lệnh ứng dụng
            if (interaction.type === InteractionType.ApplicationCommand) {
                // Kiểm tra nếu lệnh không tồn tại hoặc người gửi là bot hoặc interaction không thuộc một guild
                if (!this.slashCommands.has(interaction.commandName) || interaction.user.bot || !interaction.guild) return;
                const SlashCommands = this.slashCommands.get(interaction.commandName);
                if (!SlashCommands) return;
                if (SlashCommands) {
                    try {
                        // Tạo một embed mới cho mỗi lần reply
                        const embed = new EmbedBuilder().setTitle(getLocalizedString({ lang: this.currentLanguage, key: "commandHander.slash.slash1" })).setColor("Random");
                        // Kiểm tra nếu người gửi là chủ sở hữu và có quyền sử dụng lệnh
                        if (SlashCommands.owner && this.options.config.developer.includes(interaction.user.id)) return interaction.reply({
                            content: getLocalizedString({ lang: this.currentLanguage, key: "commandHander.slash.slash2" })
                        });
                        // Kiểm tra quyền của người gửi
                        if (SlashCommands.userPerms && !interaction.member.permissions.has(PermissionsBitField.resolve(SlashCommands.userPerms || []))) return interaction.reply({
                            embeds: [embed.setDescription(getLocalizedString({
                                lang: this.currentLanguage,
                                key: "commandHander.slash.slash3",
                                replacements: {
                                    cmd1: SlashCommands.userPerms,
                                    cmd2: interaction.channelId,
                                    cmd3: SlashCommands.name
                                }
                            }))]
                        });
                        // Kiểm tra cooldown
                        const remainingTime = checkCooldown(SlashCommands, SlashCommands.cooldown);
                        if (remainingTime !== null) return await interaction.reply({
                            content: getLocalizedString({
                                lang: this.currentLanguage,
                                key: "commandHander.slash.slash5",
                                replacements: {
                                    commandName: SlashCommands.name,
                                    cooldown: remainingTime,
                                },
                            }),
                        });
                        // Thực thi lệnh
                        SlashCommands.executeCommand(this, interaction);
                    } catch (error) {
                        // Xử lý lỗi
                        if (interaction.replied) return await interaction.editReply({
                            embeds: [new EmbedBuilder().setDescription(getLocalizedString({ lang: this.currentLanguage, key: "commandHander.slash.slash4" }))],
                            ephemeral: true,
                        });
                        console.log(error);
                    };
                };
            };
        });
    };
};
import getLocalizedString from "../Language/getLocalizedString.js";
import InteractionCreate from "../Guilds/InteractionCreate.js";
import globalFilePath from "../Function/globalFilePath.js";
import Discord from "discord.js";
import fs from "node:fs";

const slashCommands = async (settings, options) => {
    const pathToCommand = options.pathToCommand;
    const allSlashCommands = []; // Khởi tạo một mảng để lưu trữ tất cả thông tin về slashCommands (allSlashCommands).
    // Lặp qua từng thư mục trong thư mục slashCommands và xử lý từng file.
    for (const dir of fs.readdirSync(pathToCommand.slashCommand)) {
        const filterCommands = fs.readdirSync(`${pathToCommand.slashCommand}/${dir}/`).filter((file) => file.endsWith(".js"));
        for (const slashCmds of filterCommands) {
            try {
                const command = await import(globalFilePath(`${pathToCommand.slashCommand}/${dir}/${slashCmds}`)).then((e) => e.default); // Trong vòng lặp bên trong, thử import từng file slash command và xử lý nếu không có lỗi.
                settings.slashCommands.set(command.name, command); // this.slashCommands: Một Collection để lưu trữ các slash commands của bot.
                allSlashCommands.push({ // allSlashCommands: Một mảng để lưu trữ thông tin về tất cả các slash commands.
                    type: command.type || Discord.ApplicationCommandType.ChatInput,
                    name: command.name.toLowerCase(),
                    description: command.description,
                    options: command.options || null,
                });
            } catch (error) {
                console.error(getLocalizedString({
                    lang: settings.currentLanguage,
                    key: "commandHander.slash.cmd5",
                    replacements: {
                        slashCmds: slashCmds,
                        slashCmds1: error.message
                    }
                }));
            };
        };
    };
    settings.on(Discord.Events.ClientReady, async (bot) => {
        const rest = new Discord.REST({ version: "10" }).setToken(settings.config.botToken);
        return await rest.put(Discord.Routes.applicationCommands(bot.user.id), {
            body: allSlashCommands
        });
    });
    settings.on(Discord.Events.InteractionCreate, (interaction) => InteractionCreate(settings, {
        interaction: interaction
    }));
};

export default slashCommands;
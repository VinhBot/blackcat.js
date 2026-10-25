import { CommandBuilder } from "blackcat.js-discord";
// Bật/tắt một lệnh CHỈ trong server hiện tại. Gõ: !toggle ping off   |   !toggle ping on
export default new CommandBuilder({
    commandName: "toggle",
    description: "Bật/tắt một lệnh trong server này",
    permission: { userPermissions: ["ManageGuild"] },
}).setOptions((a) => ({
    command: a.string({ required: true, description: "tên lệnh" }),
    state: a.string({ required: true, choices: ["on", "off"], description: "on = bật, off = tắt" }),
})).setExecute(async (client, message, args, options) => {
    if (options.command === "toggle")
        return message.reply("Không thể tắt chính lệnh `toggle`.");
    const { commandManager } = client;
    const ok = options.state === "off"
        ? commandManager.disable(options.command, message.guildId)
        : commandManager.enable(options.command, message.guildId);
    return message.reply(ok ? `Đã ${options.state === "off" ? "tắt" : "bật"} lệnh **${options.command}**.` : `Không tìm thấy lệnh **${options.command}**.`);
});

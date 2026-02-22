import { CommandBuilder } from "blackcat.js-discord";
import { EmbedBuilder } from "discord.js";

const svavatarCommand = new CommandBuilder({
    commandName: "serveravatar",
    aliases: ["sav", "guildavatar"],
    description: "Xem avatar của server (guild avatar).",
    cooldown: {
        duration: 5,
        scope: ["user"],
        roleWeights: {
            // "id Role": 0.7,
        },
        // permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx, commandName) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`,
    },
    userPermission: {
        permission: ["SendMessages"],
    },
    execute: async (client, message, args) => {
        if (!message.guild) return message.reply("❌ Lệnh này chỉ dùng trong server.");
        const guild = message.guild;
        const guildAvatar = guild.iconURL({
            size: 4096,
            extension: "png",
            forceStatic: false,
        });
        if (!guildAvatar)  return message.reply("❌ Server này không có avatar.");
        const embed = new EmbedBuilder()
            .setTitle(`Avatar của ${guild.name}`)
            .setImage(guildAvatar)
            .setColor("Blurple")
            .setFooter({ text: `Guild ID: ${guild.id}`, })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
});

export default svavatarCommand;
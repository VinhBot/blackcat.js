import { CommandBuilder } from "blackcat.js-discord";
import { EmbedBuilder } from "discord.js";

const avatarCommand = new CommandBuilder({
    commandName: "avatar",
    aliases: ["av"],
    description: "Xem avatar người dùng bằng userId hoặc tag",
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
        try {
            let targetUser = null;
            if (message.mentions.users.size > 0) {
                targetUser = message.mentions.users.first();
            } else if (args[0]) {
                try {
                    targetUser = await message.client.users.fetch(args[0]);
                } catch {
                    return message.reply("❌ Không tìm thấy người dùng với ID này.");
                }
            } else {
                targetUser = message.author;
            }
            if (!targetUser) return message.reply("❌ Không xác định được người dùng.");

            const avatarURL = targetUser.displayAvatarURL({
                size: 4096,
                extension: "png",
                forceStatic: false
            });

            const embed = new EmbedBuilder()
                .setColor("Random")
                .setTitle(`Avatar của ${targetUser.tag}`)
                .setImage(avatarURL)
                .setFooter({
                    text: `ID: ${targetUser.id}`
                });

            return message.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            return message.reply("⚠️ Đã xảy ra lỗi.");
        }
    }
});

export default avatarCommand;
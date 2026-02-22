import { CommandBuilder } from "blackcat.js-discord";
import type { TextChannel } from "discord.js";

const pingCommand = new CommandBuilder({
    commandName: "ping",
    description: "Replies with Pong!",
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
        await (message.channel as TextChannel).send("Pong!");
    }
});

export default pingCommand;
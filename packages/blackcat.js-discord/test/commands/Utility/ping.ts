import { CommandBuilder, PermissionLevel } from "blackcat.js-discord";
import type { TextChannel } from "discord.js";

const pingCommand = new CommandBuilder({
    commandName: "ping",
    description: "Replies with Pong!",
    cooldown: {
        duration: 5,
        scope: ["user"],
        roleWeights: {
            "1088740567657222194": 0.5, // giảm 1 nửa.
            // "id Role": 0.7,
        },
        // permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx, commandName) => `này <@${ctx.member?.id}> vui lòng chờ ${Math.ceil(ms / 1000)} giây trước khi sử dụng lại lệnh ${commandName}.`
    },
    // memberpermissions: [""], 
    execute: async (client, message, args) => {
        await (message.channel as TextChannel).send("Pong!");
    }
});

export default pingCommand;
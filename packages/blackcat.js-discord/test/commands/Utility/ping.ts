import { CommandBuilder } from "blackcat.js-discord";

const pingCommand = new CommandBuilder({
    commandName: "ping",
    description: "Replies with Pong!",
    cooldown: {
        duration: 5,
        scope: ["user"],
        // roleWeights: {
        //     VIP_ROLE_ID: 0.5,
        //     MOD_ROLE_ID: 0.7,
        // },
        // permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx, commandName) => `này <@${ctx.member?.id}> vui lòng chờ ${Math.ceil(ms / 1000)} giây trước khi sử dụng lại lệnh ${commandName}.`
    },
    // memberpermissions: [""], 
    execute: async (client, message) => {
        await message.reply("Pong!");
    }
});

export default pingCommand;
// import { CommandBuilder, PaginationBuilder, PermissionLevel } from "blackcat.js-discord";
import { CommandBuilder, PaginationBuilder, PermissionLevel } from "../../../src";

const pingCommand = new CommandBuilder<true>()
pingCommand.setName("ping");
pingCommand.setDescription("Replies with Pong!");
pingCommand.setCooldown({
    duration: 5,
    scope: ["role"],
    // permissionBypass: PermissionLevel.ADMIN,
    message: (ms, ctx) => ({
        content: `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`,
    }),
});
pingCommand.setPermission({
    userPermissions: ["SendMessages"],
    allowGuild: true,
    message: (ctx) => ({ content: `Bạn không đủ quyền để sử dụng lệnh ${ctx.commandName}` }),
})
pingCommand.setExecute(async (client, message, args) => {
    message.reply({
        content: `Ping của tôi là: ${client.ws.ping}`,
    })
});


export default pingCommand;
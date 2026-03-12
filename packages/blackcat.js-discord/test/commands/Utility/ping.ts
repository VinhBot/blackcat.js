import { CommandBuilder} from "blackcat.js-discord";

const pingCommand = new CommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!")
    .setCooldown({
        duration: 5,
        scope: ["role"],
        roleWeights: {
            // "id Role": 0.7,
        },
        // permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx, commandName) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`,
    })
    .setUserPermission({
        permission: ["SendMessages"],
        message: (ctx) => ({ content: `Bạn không đủ quyền để sử dụng lệnh ${ctx.commandName}` }),
    })
    .setExecute(async (client, message, args) => {
        if(!message.guildId) return;
        
    })


export default pingCommand;
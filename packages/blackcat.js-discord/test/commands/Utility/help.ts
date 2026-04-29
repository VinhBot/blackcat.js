import { CommandBuilder, PermissionLevel } from "blackcat.js-discord";

const help = new CommandBuilder({
    commandName: "help",
    cooldown: {
        duration: "5s",
        scope: ["role"],
        roleWeights: (guildID, memberID) => {
            console.log("guildID:", guildID);
            console.log("memberID:", memberID);
            return {
                memberID: 0.1, // giảm 10%
            };
        },
        permissionBypass: [PermissionLevel.ADMIN, PermissionLevel.MOD], // hoặc permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`,
    },
    permission: {
        userPermissions: ["SendMessages"],
        botPermissions: ["SendMessages"],
        // allowedRoleIds: ["1100924393175142453"],
        // allowedUserIds: ["1497199921814835311"],
        // blockedUserIds: ["1497199921814835311"],
        // allowDM: false,
        // allowGuild: true,
        // onlyOwner: true,
    },

    execute(client, message, args) {
        message.reply({
            content: "test"
        })
    },
});

export default help;
import { CommandBuilder, PermissionLevel } from "blackcat.js-discord";

const help = new CommandBuilder({
    commandName: "help",
    cooldown: {
        duration: "5s",
        scope: ["role"],
        // roleWeights: (guildID, memberID) => {
        //     console.log("guildID:", guildID);
        //     console.log("memberID:", memberID);
        //     return {
        //         memberID: 0.1,
        //     };
        // },
        // permissionBypass: [PermissionLevel.ADMIN, PermissionLevel.MOD],
        // permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${ctx.commandName}.`,
    },
    permission: {
        userPermissions: ["SendMessages"],
        botPermissions: ["SendMessages"],
        // allowedRoleIds: ["1100924393175142453"], // 1089413553615814750
        // allowedUserIds: ["1497199921814835311"],
        // blockedUserIds: ["1497199921814835311"],
        // allowDM: false,
        // allowGuild: true,
        message: (ctx) => {
            if (ctx.reason === "USER_BLOCKED") {
                return `⛔ <@${ctx.userID}> bạn đã bị chặn sử dụng lệnh này.`;
            } else if (ctx.reason === "DM_NOT_ALLOWED") {
                return `❌ Lệnh **${ctx.commandName}** không thể dùng trong DM.`;
            } else if (ctx.reason === "MISSING_ROLE") {
                return `❌ Bạn không có role phù hợp để dùng lệnh **${ctx.commandName}**.`;
            } else if (ctx.reason === "GUILD_NOT_ALLOWED") {
                return `❌ Lệnh **${ctx.commandName}** không thể dùng trong server.`;
            } else if (ctx.reason === "MISSING_USER_PERMISSIONS") {
                return `❌ Bạn không đủ quyền để dùng lệnh **${ctx.commandName}**.`;
            } else if (ctx.reason === "MISSING_BOT_PERMISSIONS") {
                return `❌ Bot không đủ quyền để thực hiện lệnh **${ctx.commandName}**.`;
            } else {
                return `❌ Không thể thực hiện lệnh.`;
            };
        },
    },

    execute(client, message, args) {
        message.reply({
            content: "test"
        })
    },
});

export default help;
import { CommandBuilder, functions, ComponentBuilder } from "blackcat.js-discord";
import { ComponentType } from "discord.js";

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
        const button = new ComponentBuilder([
            {
                type: "button",
                options: [
                    {
                        customId: "test1",
                        label: "test...",
                        style: "Danger"
                    }
                ]
            }
        ]);

        const msg = await message.channel.send({
            content: `My ping: ${client.ws.ping} ms`,
            components: button.components(),
        });

        await functions.createComponentCollector(msg, {
            componentType: ComponentType.Button, // Giới hạn loại component.
            // idle: "5s", // Thời gian tối đa không có interaction nào trước khi stop.
            // max: 5, // Số interaction tối đa collector nhận.
            // maxUsers: 1, // Giới hạn số user khác nhau có thể interact.
            time: "5s", // Thời gian collector tồn tại (s) default: 5 giây.
            filter: (i) => i.user.id === message.author.id, // Hàm lọc interaction.
            // Callback chạy khi có interaction.
            onCollector: (ctx) => {
                ctx.interaction.deferReply()
                if (ctx.interaction.customId === "test1") {
                    ctx.message.reply({
                        content: `My ping again: ${client.ws.ping} ms`,
                    })
                }
            },
        });
    })


export default pingCommand;
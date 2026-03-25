import { CommandBuilder, PaginationBuilder, PermissionLevel } from "../../../src";

let number = 0;
let numbers = 0;
const pingCommand = new CommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!")
    .setCooldown({
        duration: 5,
        scope: ["role"],
        roleWeights: {
            // "id Role": 0.7,
        },
        permissionBypass: PermissionLevel.ADMIN,
        message: (ms, ctx, commandName) => `này <@${ctx.userId}> vui lòng chờ ${ms} giây trước khi sử dụng lại lệnh ${commandName}.`,
    })
    .setUserPermission({
        permission: ["SendMessages"],
        message: (ctx) => ({ content: `Bạn không đủ quyền để sử dụng lệnh ${ctx.commandName}` }),
    })
    .setExecute(async (client, message, args) => {
        const pagination = new PaginationBuilder<string>({
            pages: ["Page 1", "Page 2", "Page 3"],
            renderPage: ({ data, page, totalPages }) => {
                numbers++;
                return {
                    content: `= Trang ${page + 1}/${totalPages}\n${data}: ${numbers}`,
                };
            },
            buildComponents: ({ components }) => {
                number++;
                components.addButton([
                    {
                        customId: "test",
                        label: `Test`,
                        style: "Danger"
                    }
                ])
                return components;
            },
            onComponent: async ({ interaction, pagination }) => {
                if (interaction.isButton()) {
                    if (interaction.customId === "test") {
                        interaction.reply({
                            content: "testtt"
                        });
                    }
                }
            },
            onError: ({ error }) => {
                console.log(error);
            },
        });

        await pagination.start(message);
    })


export default pingCommand;
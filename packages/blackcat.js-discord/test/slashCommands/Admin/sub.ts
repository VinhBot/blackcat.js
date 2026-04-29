import { SlashCommandBuilder, SlashSubCommandBuilder, SlashSubCommandGroupBuilder } from "blackcat.js-discord";

const exampleCommand = new SlashCommandBuilder({
    commandName: "admin",
    description: "Admin commands",
    cooldown: {
        duration: 5,
        scope: "user"
    },
    /* SUB COMMAND TRỰC TIẾP */
    subcommands: {
        reload: new SlashSubCommandBuilder({
            description: "Reload bot",
            options: (o) => ({
                channel: o.channel({
                    description: "test",
                    channelTypes: ["GuildText"],
                    required: false
                })
            })
        }),
    },
    /* GROUP */
    groups: {
        user: new SlashSubCommandGroupBuilder({
            description: "User management",
            subcommands: {
                ban: new SlashSubCommandBuilder({
                    description: "Ban user",
                    options: (o) => ({
                        user: o.user({
                            description: "Target user",
                            required: true,
                        }),
                        reason: o.string({
                            description: "Reason",
                            required: true,
                        }),
                    }),
                }),
                kick: new SlashSubCommandBuilder({
                    description: "Kick user",
                    options: (o) => ({
                        user: o.user({
                            description: "Target user",
                            required: false,
                        }),
                        userid: o.number({
                            description: "user id",
                            required: false
                        }),
                    }),
                }),
            },
        }),
    },

    /* EXECUTE */
    execute: async (client, interaction, options) => {
        // sub commands
        if (options.payload?.type === "sub") {
            if (options.payload.sub === "reload") {
                const channel = options.payload.options.channel;
                console.log(channel);
            }
        }
        // group commands
        if (options.payload?.type === "group") {
            // sub commands
            if (options.payload.group === "user" && options.payload.sub === "ban") {
                console.log(options.payload.options.user);
                console.log(options.payload.options.reason);
            }
            if (options.payload.group === "user" && options.payload.sub === "kick") {
                console.log(options.payload.options.user);
                console.log(options.payload.options.userid);
            }
        }
        // slash commands
        // logic code 
    },
});
export default exampleCommand;
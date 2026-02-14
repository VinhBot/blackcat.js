import {
    SlashCommandBuilderWithSubs,
    SlashSubCommandBuilder,
    SlashSubCommandGroupBuilder
} from "blackcat.js-discord";

/* =============================
   TẠO COMMAND
============================= */

export const adminCommand = new SlashCommandBuilderWithSubs({
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
                            userID: o.number({
                                description: "user id",
                                required: false
                            }),
                        }),
                    }),
                },
            }),
        },

        /* EXECUTE */
        execute: async (client, interaction, payload) => {
            if (payload.type === "sub") {
                if (payload.sub === "reload") {
                    await interaction.reply("Bot reloaded.");
                }
            }

            if (payload.type === "group") {
                if (payload.group === "user" && payload.sub === "ban") {
                    payload.options.user;   // strongly typed User
                    payload.options.reason; // string
                }
                if (payload.group === "user" && payload.sub === "kick") {
                    payload.options.user; 
                    payload.options.userID
                }
            }
        },
    });

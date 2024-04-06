export default {
    tokenBot: "You haven't added a token for the bot yet",
    commandHander: {
        prefix: {
            // command table (commandTable)
            cmd1: "Command Name",
            cmd2: "Status",
            cmd3: "✔️ Ready",
            cmd4: "❌ Error",
            // messages in messageCreate
            mes1: "Missing permissions",
            mes2: "You don't have the {permissions} permission to use this command",
            mes3: "❌ You've used the command too quickly. Please wait {timestamp} seconds before using `{cmdName}` again",
            mes4: "You can't use this command. Only <@{developer}> can use it",
            mes5: "Invalid command. Type {prefix}help to review all commands",
            mes6: "Hello. My prefix is: {prefix}",
        },
        slash: {
            // command table (slashTable) 
            cmd1: "Command Name",
            cmd2: "Status",
            cmd3: "❌ Error",
            cmd4: "✔️ Ready",
            cmd5: "Error inputting {slashCmds}: {slashCmds1}",
            // messages in interaction 
            slash1: "Missing permissions to use the command",
            slash2: "I'm not a foolish bot, only the owner can use this command",
            slash3: "Sorry, you don't have the {cmd1} permission in <#{cmd2}> to use the {cmd3} command",
            slash4: "An error occurred while executing the command. Apologies for the inconvenience <3",
            slash5: "You use the command `{commandName}` too quickly. Please use again in `{cooldown}` seconds."
        }
    }
}
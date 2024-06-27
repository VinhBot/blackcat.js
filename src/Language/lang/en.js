module.exports = {
    tokenBot: "You have not added a token for the bot yet",
    commandHander: {
        prefix: {
            // command table
            cmd1: "Command Name",
            cmd2: "Status",
            cmd3: "✔️ ready",
            cmd4: "❌ Error",
            cmd5: "[blackcat-prefixCommand]: please check the path to your command folder.",
            cmd6: "[blackcat-MessageCreate]: You can only assign 2 boolean values.",
            // messages in messageCreate
            mes1: "Missing permissions",
            mes2: "You do not have {permissions} to use this command",
            mes3: "❌ You are using commands too quickly, please wait {timestamp} seconds before using `{cmdName}` again",
            mes4: "You cannot use this command, only <@{developer}> can use it",
            mes5: "Incorrect command. type {prefix}help to see all commands",
            mes6: "Hello. my prefix is: {prefix}",
        },
        slash: {
            // slash table 
            cmd1: "Command Name",
            cmd2: "Status",
            cmd3: "❌ Error",
            cmd4: "✔️ ready",
            cmd5: "Input error {slashCmds}: {slashCmds1}",
            // messages in interaction 
            slash1: "Missing permissions to use the command",
            slash2: "I am not a dumb bot, only the owner can use this command",
            slash3: "Sorry, you do not have {cmd1} permissions in <#{cmd2}> to use this {cmd3} command",
            slash4: "An error occurred while executing the command, sorry for the inconvenience <3",
            slash5: "You are using the `{commandName}` command too quickly. please use it again after `{cooldown}` seconds."
        },
    },
    eventHandler: {
        event1: "Event Name",
        event2: "Status",
        event3: "✔️ ready",
        event4: "[BlackCat-EVENTS]: You have not added an event folder name yet",
        event5: "[BlackCat-EVENTS]: The input must be like this eventFolder: ['Folder Name']",
        event6: "[BlackCat-EVENTS]: You have not added a specific path or it is incorrect, please check again"
    }
}

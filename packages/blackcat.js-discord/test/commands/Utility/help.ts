import { CommandBuilder, ComponentBuilder } from "../../../src";

const help = new CommandBuilder({
    commandName: "help",
    execute(client, message, args) {
        const c = new ComponentBuilder([]);
        c.createCollector({
            source: message,
            onCollector(ctx) {
                ctx.interaction
            },
        })
    },
});

export default help;
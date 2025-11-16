import type { ClientOptions as DiscordOptions } from "discord.js";
import { Client as DiscordClient } from "discord.js";

interface Config {
    botToken: string;
}

interface ClientOptions extends DiscordOptions {
    config: Config;
}

export class Client extends DiscordClient<boolean> {
    public config: Config;
    constructor(options: ClientOptions) {
        super(options); 
        this.config = options.config;
    }

}
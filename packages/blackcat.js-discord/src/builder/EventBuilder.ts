import type { ClientEvents } from "discord.js";
import type { Client } from "..";

export interface EventBuilderOptions<K extends keyof ClientEvents = keyof ClientEvents> {
    /** Discord event name */
    eventName: K;
    /** Run once or on */
    once?: boolean;
    /** Event logic */
    execute: (client: Client, ...args: ClientEvents[K]) => Promise<void> | void;
}

export class EventBuilder<K extends keyof ClientEvents> {
    public readonly eventName: K;
    public readonly once: boolean;
    public readonly execute: EventBuilderOptions<K>["execute"];
    constructor(options: EventBuilderOptions<K>) {
        this.eventName = options.eventName;
        this.once = options.once ?? false;
        this.execute = options.execute;
    }
}

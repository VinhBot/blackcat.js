import path from "node:path";
import fs from "node:fs";
import url from "node:url";

import type { RegisterEventsOptions } from "../type";
import type { EventBuilderOptions, Client } from "..";

export class EventManager {
    public readonly client: Client;
    public readonly options: RegisterEventsOptions;
    constructor(client: Client, options: RegisterEventsOptions) {
        this.client = client;
        this.options = options;
        this.load(options);
    }
    private async load(options: RegisterEventsOptions): Promise<void> {
        if (!Array.isArray(options.scopes)) {
            throw new TypeError("[loadEvents] 'scopes' must be an array");
        }
        if (options.scopes.length === 0) return;
        const entries = await fs.promises.readdir(options.directory, {
            withFileTypes: true
        });
        const availableScopes = entries.filter((e) => e.isDirectory()).map((e) => e.name); // Lấy tất cả folder scope có sẵn.
        const scopesToLoad = options.scopes.includes("*") ? availableScopes : options.scopes; // Nếu dùng "*" → load tất cả scope.
        // Validate scope (trừ khi dùng "*")
        if (!options.scopes.includes("*")) {
            const invalidScopes = options.scopes.filter((scope) => !availableScopes.includes(scope));
            if (invalidScopes.length > 0) options.onError?.({
                error: `[registerEvents] Invalid scope(s): ${invalidScopes.join(", ")}. Available scopes: ${availableScopes.join(", ")}`,
                file: "undefined",
                scope: scopesToLoad.join(", ")
            });
        }
        for (const scope of scopesToLoad) {
            const scopePath = path.join(options.directory, scope);
            const files = await fs.promises.readdir(scopePath);
            for (const file of files) {
                if (!/\.(ts|js)$/.test(file)) continue;
                try {
                    const event: EventBuilderOptions = await import(url.pathToFileURL(path.join(scopePath, file)).href).then((d) => d.default);
                    if (!event.eventName || typeof event.execute !== "function") {
                        options.onError?.({ error: new Error("Invalid event module"), file, scope });
                    }
                    if (event.once) {
                        this.client.once(event.eventName, (...args: any[]) => event.execute(this.client, ...args as any));
                    } else {
                        this.client.on(event.eventName, (...args: any[]) => event.execute(this.client, ...args as any));
                    }
                    options.onLoad?.({ eventName: event.eventName, file, scope });
                } catch (error) {
                    options.onError?.({ error, file, scope });
                }
            }
        }
    }
}
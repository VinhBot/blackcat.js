class Test {
    /* =======================
     * Event Loader
     * ======================= */
    private async registerEvents(options: RegisterEventsOptions): Promise<void> {
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
            const scopePath = join(options.directory, scope);
            const files = await fs.promises.readdir(scopePath);
            for (const file of files) {
                if (!/\.(ts|js)$/.test(file)) continue;
                try {
                    const event: EventBuilderOptions = await import(pathToFileURL(join(scopePath, file)).href).then((d) => d.default);
                    if (!event.eventName || typeof event.execute !== "function") {
                        options.onError?.({ error: new Error("Invalid event module"), file, scope });
                    }
                    if (event.once) {
                        this.once(event.eventName, (...args: any[]) => event.execute(this, ...args as any));
                    } else {
                        this.on(event.eventName, (...args: any[]) => event.execute(this, ...args as any));
                    }
                    options.onLoad?.({ eventName: event.eventName, file, scope });
                } catch (error) {
                    options.onError?.({ error, file, scope });
                }
            }
        }
    }
}
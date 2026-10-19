import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        // Subpath exports: import { SQLiteDriver } from "blackcat.js-database/sqlite"
        sqlite: "src/drivers/SQLiteDriver.ts",
        mongo: "src/drivers/MongoDriver.ts"
    },
    format: ["esm", "cjs"],
    target: "node18",
    platform: "node",
    outDir: "dist",
    dts: true,
    sourcemap: true,
    clean: true,
    skipNodeModulesBundle: true,
    splitting: false,
    keepNames: true,
    outExtension({ format }) {
        return {
            js: format === "esm" ? ".mjs" : ".cjs"
        };
    }
});

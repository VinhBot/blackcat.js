import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
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
import { esbuildPluginVersionInjector } from "esbuild-plugin-version-injector";
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs"], 
    target: "es2021", 
    outDir: "dist",
    noExternal: [], 
    platform: "node",
    skipNodeModulesBundle: true,
    clean: true,
    minify: false,
    splitting: false,
    keepNames: true,
    dts: true, 
    sourcemap: true, 
    treeshake: false, 
    terserOptions: {
        mangle: false, 
        keep_classnames: true,
        keep_fnames: true, 
    },
    esbuildPlugins: [esbuildPluginVersionInjector() as any]
});
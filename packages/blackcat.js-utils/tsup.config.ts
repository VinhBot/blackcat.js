import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    target: "es2021", 
    outDir: "dist",
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
    }
});
import { svelte as sveltePlugin } from "@sveltejs/vite-plugin-svelte";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import * as Vite from "vite";
import checker from "vite-plugin-checker";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";
import packageJSON from "./package.json" with { type: "json" };
import moduleJSON from "./static/module.json" with { type: "json" };

const EN_JSON = JSON.parse(fs.readFileSync("./static/lang/en.json", { encoding: "utf-8" }));
const packagePath = `modules/${moduleJSON.id}`;

const config = Vite.defineConfig(({ command, mode }): Vite.UserConfig => {
    const buildMode = mode === "production" ? "production" : "development";
    const outDir = "dist";

    const plugins = [checker({ typescript: true }), tsconfigPaths({ loose: true }), sveltePlugin()];
    // Handle minification after build to allow for tree-shaking and whitespace minification
    // "Note the build.minify option does not minify whitespaces when using the 'es' format in lib mode, as it removes
    // pure annotations and breaks tree-shaking."
    if (buildMode === "production") {
        plugins.push(
            {
                name: "minify",
                renderChunk: {
                    order: "post",
                    async handler(code, chunk) {
                        return chunk.fileName.endsWith(".mjs")
                            ? esbuild.transform(code, {
                                  keepNames: true,
                                  minifyIdentifiers: false,
                                  minifySyntax: true,
                                  minifyWhitespace: true,
                              })
                            : code;
                    },
                },
            },
            ...viteStaticCopy({
                targets: [
                    { src: "CHANGELOG.md", dest: "." },
                    { src: "README.md", dest: "." },
                ],
            }),
        );
    } else {
        plugins.push(
            // Foundry expects all esm files listed in system.json to exist: create empty vendor module when in dev mode
            {
                name: "touch-vendor-mjs",
                apply: "build",
                writeBundle: {
                    async handler() {
                        fs.closeSync(fs.openSync(path.resolve(outDir, "vendor.mjs"), "w"));
                    },
                },
            },
            // Vite HMR is only preconfigured for css files: add handler localization JSON
            {
                name: "hmr-handler",
                apply: "serve",
                handleHotUpdate(context) {
                    if (context.file.startsWith(outDir)) return;

                    if (context.file.endsWith("en.json")) {
                        const basePath = context.file.slice(context.file.indexOf("lang/"));
                        console.log(`Updating lang file at ${basePath}`);
                        fs.promises.copyFile(context.file, `${outDir}/${basePath}`).then(() => {
                            context.server.ws.send({
                                type: "custom",
                                event: "lang-update",
                                data: { path: `${packagePath}/${basePath}` },
                            });
                        });
                    }
                },
            },
        );
    }

    // Create dummy files for vite dev server
    if (command === "serve") {
        const message = "This file is for a running vite dev server and is not copied to a build";
        fs.writeFileSync("./index.html", `<h1>${message}</h1>\n`);
        if (!fs.existsSync("./styles")) fs.mkdirSync("./styles");
        fs.writeFileSync("./styles/styles.css", `/** ${message} */\n`);
        fs.writeFileSync("./main.mjs", `/** ${message} */\n\nimport "./src/main.ts";\n`);
        fs.writeFileSync("./vendor.mjs", `/** ${message} */\n`);
    }

    return {
        base: command === "build" ? "./" : `/${packagePath}`,
        publicDir: "static",
        define: {
            BUILD_MODE: JSON.stringify(buildMode),
            EN_JSON: JSON.stringify(EN_JSON),
            fu: "foundry.utils",
        },
        esbuild: { keepNames: true },
        build: {
            outDir,
            emptyOutDir: true,
            minify: false,
            sourcemap: buildMode === "development",
            lib: {
                name: moduleJSON.id,
                entry: "src/main.ts",
                formats: ["es"],
                fileName: "main",
            },
            rollupOptions: {
                output: {
                    chunkFileNames: "[name].mjs",
                    entryFileNames: "main.mjs",
                    manualChunks: {
                        vendor: buildMode === "production" ? Object.keys(packageJSON.dependencies) : [],
                    },
                },
                watch: { buildDelay: 100 },
            },
            target: "es2022",
        },
        server: {
            port: 30001,
            proxy: {
                [`^(?!/${packagePath}/)`]: "http://localhost:30000",
                "/socket.io": {
                    target: "ws://localhost:30000",
                    ws: true,
                },
            },
        },
        plugins,
        css: { devSourcemap: buildMode === "development" },
    };
});

export default config;

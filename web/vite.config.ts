import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import tailwindcss from "@tailwindcss/vite";

import { tanstackStart } from "@tanstack/solid-start/plugin/vite";

import solidPlugin from "vite-plugin-solid";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
		dedupe: ["solid-js"],
	},
	optimizeDeps: {
		exclude: ["arcadia-ts"],
	},
	ssr: {
		noExternal: ["arcadia-ts"],
	},
	plugins: [
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart(),
		solidPlugin({ ssr: true }),
	],
});

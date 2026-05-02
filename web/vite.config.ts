import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
		dedupe: ["solid-js"],
	},
	optimizeDeps: {
		exclude: ["arcadia-ts"],
	},
	ssr: {
		noExternal: ["arcadia-ts"],
	},
	plugins: [
		process.env.NODE_ENV === "development" && devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart(),
		solidPlugin({ ssr: true }),
	].filter(Boolean),
});

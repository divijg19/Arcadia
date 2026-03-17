import * as path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
	plugins: [solid()],
	server: {
		fs: {
			// Allow serving files from the monorepo root (so arcadia-rs/pkg is reachable)
			allow: [path.resolve(__dirname, "..")],
		},
	},
});

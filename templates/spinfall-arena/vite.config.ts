import * as path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
	plugins: [solid()],
	server: {
		fs: {
			// Allow serving files from the monorepo root (so packages/arcadia-rs/pkg is reachable)
			allow: [
				path.resolve(__dirname, "../.."),
				path.resolve(__dirname, "../../packages"),
				path.resolve(__dirname, "../../packages/arcadia-rs"),
				path.resolve(__dirname, "../../packages/arcadia-ts"),
			],
		},
	},
	resolve: {
		alias: {
			"arcadia-rs/pkg/arcadia_rs.js": path.resolve(
				__dirname,
				"../../packages/arcadia-rs/pkg/arcadia_rs.js",
			),
			"arcadia-ts": path.resolve(__dirname, "../../packages/arcadia-ts/src"),
		},
	},
	optimizeDeps: {
		include: ["arcadia-rs/pkg/arcadia_rs.js"],
	},
});

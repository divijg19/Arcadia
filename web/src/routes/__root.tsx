import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/solid-router";
import { lazy, Show, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import CinematicCursor from "~/components/effects/CinematicCursor";
import Navbar from "~/components/nav/FloatingPillNav";

import indexCss from "../index.css?url";

// Lazy load DevTools only in development
const TanStackRouterDevtools = lazy(() =>
	import("@tanstack/solid-router-devtools").then((mod) => ({
		default: mod.TanStackRouterDevtools,
	})),
);

// Validate required environment variables (non-blocking)
const validateEnv = () => {
	// Provide safe defaults so missing variables do not block rendering.
	const requiredEnvVars = {
		VITE_ARCADIA_GAMES_CDN_BASE:
			import.meta.env.VITE_ARCADIA_GAMES_CDN_BASE ?? "",
	} as Record<string, string>;

	const missing = Object.entries(requiredEnvVars)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		// Use warn instead of error to avoid stopping or alarming in production.
		console.warn(
			`Missing environment variables (using safe defaults): ${missing.join(", ")}`,
		);
		if (import.meta.env.DEV) {
			console.info(
				"Set required env vars in .env or your deployment environment to enable CDN-hosted assets.",
			);
		}
	}

	return requiredEnvVars;
};

// Validate on app startup
if (typeof window !== "undefined") {
	const env = validateEnv();
	// Expose a safe runtime env map for other modules to read without accessing import.meta.env directly.
	try {
		(
			window as unknown as { __ARCADIA_ENV?: Record<string, string> }
		).__ARCADIA_ENV = env;
	} catch {
		// ignore if window is locked down
	}
}

export const Route = createRootRouteWithContext()({
	head: () => ({
		title: "Arcadia v1.6.2 // Digital Atelier",
		meta: [
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
		],
		links: [
			{ rel: "stylesheet", href: indexCss },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap",
			},
		],
	}),
	shellComponent: RootComponent,
});

function RootComponent() {
	return (
		<html lang="en">
			<head>
				<HydrationScript />
				<HeadContent />
			</head>
			<body class="arcadia-body">
				<Suspense>
					<Navbar />
					<CinematicCursor />
					<main class="site-frame">
						<Outlet />
					</main>
					<Show when={import.meta.env.DEV}>
						<TanStackRouterDevtools />
					</Show>
				</Suspense>
				<Scripts />
			</body>
		</html>
	);
}

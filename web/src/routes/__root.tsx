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

// Validate required environment variables
const validateEnv = () => {
	const requiredEnvVars = {
		VITE_ARCADIA_GAMES_CDN_BASE: import.meta.env.VITE_ARCADIA_GAMES_CDN_BASE,
	};

	const missing = Object.entries(requiredEnvVars)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		console.error(
			`Missing required environment variables: ${missing.join(", ")}`,
		);
		if (import.meta.env.DEV) {
			console.warn("App may not function correctly without these variables");
		}
	}

	return requiredEnvVars as Record<string, string>;
};

// Validate on app startup
if (typeof window !== "undefined") {
	validateEnv();
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

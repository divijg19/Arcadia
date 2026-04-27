import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import CinematicCursor from "~/components/effects/CinematicCursor";
import Navbar from "~/components/nav/FloatingPillNav";

import indexCss from "../index.css?url";

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
					<TanStackRouterDevtools />
				</Suspense>
				<Scripts />
			</body>
		</html>
	);
}

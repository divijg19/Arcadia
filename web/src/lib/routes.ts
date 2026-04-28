export const ROUTES = {
	home: "/",
	games: "/games",
	engines: "/engines",
} as const;

export const NAV_LINKS = [
	{ label: "Home", href: ROUTES.home },
	{ label: "Games", href: ROUTES.games },
	{ label: "Engines", href: ROUTES.engines },
] as const;

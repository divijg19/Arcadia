export const ROUTES = {
	home: "/",
	games: "/games",
	systems: "/systems",
	engines: "/engines",
} as const;

export const NAV_LINKS = [
	{ label: "Home", href: ROUTES.home },
	{ label: "Games", href: ROUTES.games },
	{ label: "Systems", href: ROUTES.systems },
	{ label: "Engines", href: ROUTES.engines },
] as const;

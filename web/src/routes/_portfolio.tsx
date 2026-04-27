import { Outlet, createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/_portfolio")({
	component: PortfolioLayout,
});

function PortfolioLayout() {
	return (
		<div class="portfolio-layer">
			<Outlet />
		</div>
	);
}

import { Outlet, createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/_os")({
	component: OsLayout,
});

function OsLayout() {
	return (
		<div class="os-layer">
			<Outlet />
		</div>
	);
}

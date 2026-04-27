import { createFileRoute } from "@tanstack/solid-router";
import ImmersiveHero from "~/components/home/ImmersiveHero";

export const Route = createFileRoute("/")({
	component: HomeRoute,
});

function HomeRoute() {
	return <ImmersiveHero />;
}

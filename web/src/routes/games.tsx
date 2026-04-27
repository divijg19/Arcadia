import { createFileRoute } from "@tanstack/solid-router";
import GamesEditorial from "~/components/pages/GamesEditorial";

export const Route = createFileRoute("/games")({
	component: GamesRoute,
});

function GamesRoute() {
	return <GamesEditorial />;
}

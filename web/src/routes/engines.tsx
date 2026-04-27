import { createFileRoute } from "@tanstack/solid-router";
import EnginesEditorial from "~/components/pages/EnginesEditorial";

export const Route = createFileRoute("/engines")({
	component: EnginesRoute,
});

function EnginesRoute() {
	return <EnginesEditorial />;
}

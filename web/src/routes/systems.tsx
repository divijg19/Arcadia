import { createFileRoute } from "@tanstack/solid-router";
import SystemsEditorial from "~/components/pages/SystemsEditorial";

export const Route = createFileRoute("/systems")({
	component: SystemsRoute,
});

function SystemsRoute() {
	return <SystemsEditorial />;
}

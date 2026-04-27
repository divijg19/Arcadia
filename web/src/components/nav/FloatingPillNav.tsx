import { Link } from "@tanstack/solid-router";
import { createSignal, onCleanup, onMount } from "solid-js";

const navLinks = [
	{ label: "Home", to: "/" },
	{ label: "Games", to: "/games" },
	{ label: "Systems", to: "/systems" },
	{ label: "Engines", to: "/engines" },
] as const;

export default function FloatingPillNav() {
	const [isCondensed, setIsCondensed] = createSignal(false);

	onMount(() => {
		const handleScroll = () => {
			setIsCondensed(window.scrollY > 42);
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		onCleanup(() => window.removeEventListener("scroll", handleScroll));
	});

	return (
		<header
			class="floating-nav-wrap"
			data-condensed={isCondensed() ? "true" : "false"}
		>
			<nav class="floating-nav" aria-label="Primary">
				{navLinks.map((item) => (
					<Link
						to={item.to}
						class="floating-nav-link"
						activeProps={{ class: "floating-nav-link is-active" }}
					>
						{item.label}
					</Link>
				))}
			</nav>
		</header>
	);
}

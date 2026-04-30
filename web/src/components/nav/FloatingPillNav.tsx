import { Link, useLocation } from "@tanstack/solid-router";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { NAV_LINKS, ROUTES } from "~/lib/routes";
import { cn } from "~/lib/utils";

export default function Navbar() {
	const location = useLocation();
	const [isMenuOpen, setIsMenuOpen] = createSignal(false);
	const [isHidden, setIsHidden] = createSignal(false);

	onMount(() => {
		let lastScrollY = window.scrollY;
		const handleScroll = () => {
			const currentY = window.scrollY;
			const delta = currentY - lastScrollY;

			if (currentY < 64 || delta < -6) {
				setIsHidden(false);
			} else if (delta > 6 && currentY > 96 && !isMenuOpen()) {
				setIsHidden(true);
			}

			lastScrollY = currentY;
		};

		const handleResize = () => {
			if (window.innerWidth >= 821) setIsMenuOpen(false);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsMenuOpen(false);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("resize", handleResize);
		window.addEventListener("keydown", handleKeyDown);

		onCleanup(() => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("keydown", handleKeyDown);
		});
	});

	createEffect(() => {
		location().pathname;
		setIsMenuOpen(false);
	});

	createEffect(() => {
		document.body.style.overflow = isMenuOpen() ? "hidden" : "";
	});

	createEffect(() => {
		if (isMenuOpen()) setIsHidden(false);
	});

	onCleanup(() => {
		document.body.style.overflow = "";
	});

	return (
		<header class="floating-nav-wrap navbar-shell" data-hidden={isHidden()}>
			<nav class="floating-nav navbar-balance" aria-label="Main navigation">
				<div class="navbar-left">
					<Link
						to={ROUTES.home}
						class="navbar-brand"
						aria-label="Go to homepage"
					>
						Arcadia
					</Link>
				</div>

				<div class="navbar-center" aria-hidden="false">
					<div class="navbar-divider" />
					<DesktopNav />
					<div class="navbar-divider" />
				</div>

				<div class="navbar-right">
					<Link to={ROUTES.games} class="navbar-play-button">
						Play
					</Link>
					<MobileNavToggle
						isMenuOpen={isMenuOpen()}
						onToggle={() => setIsMenuOpen((open) => !open)}
					/>
				</div>
			</nav>

			<MobileMenu
				isMenuOpen={isMenuOpen()}
				onClose={() => setIsMenuOpen(false)}
			/>
		</header>
	);
}

function DesktopNav() {
	const location = useLocation();

	return (
		<nav aria-label="Desktop navigation">
			<ul class="desktop-nav-list">
				<For each={NAV_LINKS}>
					{(link) => {
						const isActive = createMemo(
							() => location().pathname === link.href,
						);

						return (
							<li>
								<Link
									to={link.href}
									class={cn("navbar-link", isActive() && "is-active")}
									aria-current={isActive() ? "page" : undefined}
								>
									{link.label}
									<span class="navbar-link-underline" />
								</Link>
							</li>
						);
					}}
				</For>
			</ul>
		</nav>
	);
}

function MobileNavToggle(props: { isMenuOpen: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			onClick={props.onToggle}
			class="mobile-menu-toggle"
			aria-label={props.isMenuOpen ? "Close menu" : "Open menu"}
			aria-expanded={props.isMenuOpen}
		>
			{props.isMenuOpen ? "Close" : "Menu"}
		</button>
	);
}

function MobileMenu(props: { isMenuOpen: boolean; onClose: () => void }) {
	const location = useLocation();

	return (
		<Show when={props.isMenuOpen}>
			<div class="mobile-menu-overlay" role="dialog" aria-modal="true">
				<ul class="mobile-menu-list">
					<For each={NAV_LINKS}>
						{(link, index) => {
							const isActive = createMemo(
								() => location().pathname === link.href,
							);

							return (
								<li
									class="mobile-menu-item"
									style={{ "animation-delay": `${index() * 65}ms` }}
								>
									<Link
										to={link.href}
										onClick={props.onClose}
										class={cn("mobile-menu-link", isActive() && "is-active")}
									>
										{link.label}
									</Link>
								</li>
							);
						}}
					</For>
				</ul>
			</div>
		</Show>
	);
}

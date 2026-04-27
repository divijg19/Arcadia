import { Link, createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";

const architecturePoints = [
	{
		title: "Rust ECS Core",
		detail:
			"Arcadia simulation runs in deterministic Rust systems and serializes stable snapshots with postcard payloads.",
	},
	{
		title: "TypeScript Runtime Layer",
		detail:
			"Rendering, input, and audio are orchestrated in TS so browser-side iteration stays fast and expressive.",
	},
	{
		title: "WebAssembly Interface",
		detail:
			"Runtime contracts stay minimal: input in, state buffer out, deterministic contacts and camera control back to UI.",
	},
];

const devlogEntries = [
	{
		date: "2026-04-27",
		title: "Arcadia OS Shell",
		note: "Merged portfolio and arcade launcher into one route hierarchy with soft transitions and persistent universal save wiring.",
	},
	{
		date: "2026-04-18",
		title: "Deterministic Runtime Saves",
		note: "Reworked local save serialization into portable base64 snapshots so each game can suspend and restore instantly.",
	},
	{
		date: "2026-04-09",
		title: "Renderer Stability Pass",
		note: "Hardened teardown paths to avoid stale WebGL contexts and listener drift across repeated boot cycles.",
	},
];

export const Route = createFileRoute("/_portfolio/")({
	component: PortfolioIndex,
});

function PortfolioIndex() {
	return (
		<main class="portfolio-main">
			<section class="portfolio-hero glass-panel rise-in">
				<p class="hero-kicker">Arcadia Engine | Portfolio + Console</p>
				<h1 class="hero-title">Arcadia OS</h1>
				<p class="hero-copy">
					A premium frontend shell for a hybrid Rust + TypeScript browser
					engine. Portfolio credibility on the surface. Arcade runtime
					orchestration under the hood.
				</p>
				<div class="hero-actions">
					<Link to="/nexus" class="arcadia-button large">
						BOOT ARCADE OS
					</Link>
					<a
						href="https://github.com"
						target="_blank"
						rel="noreferrer"
						class="arcadia-button ghost"
					>
						Source Snapshot
					</a>
				</div>
			</section>

			<section class="portfolio-grid-section">
				<header>
					<p class="section-kicker">Architecture</p>
					<h2>Hybrid Engine Blueprint</h2>
				</header>
				<div class="portfolio-grid">
					<For each={architecturePoints}>
						{(point, index) => (
							<article
								class="glass-panel portfolio-card rise-in"
								style={{ "animation-delay": `${index() * 100 + 120}ms` }}
							>
								<h3>{point.title}</h3>
								<p>{point.detail}</p>
							</article>
						)}
					</For>
				</div>
			</section>

			<section class="portfolio-grid-section">
				<header>
					<p class="section-kicker">Developer Log</p>
					<h2>Recent Systems Work</h2>
				</header>
				<div class="portfolio-list">
					<For each={devlogEntries}>
						{(entry) => (
							<article class="glass-panel devlog-item">
								<p class="devlog-date">{entry.date}</p>
								<h3>{entry.title}</h3>
								<p>{entry.note}</p>
							</article>
						)}
					</For>
				</div>
			</section>

			<section class="glass-panel portfolio-footer-callout">
				<p class="section-kicker">Arcade Ready</p>
				<h2>Enter The Nexus To Launch WASM Builds</h2>
				<p>
					The runtime layer mounts remote game modules from CDN, injects
					universal save payloads, and guarantees teardown on exit to avoid
					memory leaks.
				</p>
				<Link to="/nexus" class="arcadia-button">
					Open Nexus
				</Link>
			</section>
		</main>
	);
}

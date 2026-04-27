const deskEntries = [
	{
		title: "Scheduler Discipline",
		meta: "Rust / Frame Law",
		content:
			"Every simulation circuit begins with a deterministic scheduler contract: immutable input batch, strict update ordering, and canonical state serialization. This lets replay traces become legal artifacts rather than best-effort recordings.",
	},
	{
		title: "Bridge Surfaces",
		meta: "TS Host / WASM Core",
		content:
			"The browser host is intentionally thin. It binds IO, audio, and rendering while Rust protects systemic truth. The bridge is narrow enough to reason about in one sitting, which keeps debugging humane even under aggressive iteration cadence.",
	},
	{
		title: "Telemetry Ethics",
		meta: "Go Tooling / Trace Atlas",
		content:
			"Metrics are gathered as design instruments, not vanity dashboards. Frame spikes, memory churn, and contact saturation are charted against authored encounters so balancing remains rooted in player feeling and measurable system pressure.",
	},
] as const;

const asciiSchematic = `┌────────────── deterministic loop ──────────────┐
│ input batch -> ecs update -> contact resolve   │
│      -> snapshot emit -> host render sync      │
└──────────────────────────────┬─────────────────┘
                               │
                     trace + telemetry stream`;

export default function SystemsEditorial() {
	return (
		<main class="atelier-page systems-desk-page">
			<section class="systems-desk-wrap">
				<p class="systems-kicker">systems | engineer's desk</p>
				<h1 class="systems-title">Monochrome Notes On Runtime Truth</h1>

				<pre class="systems-ascii">{asciiSchematic}</pre>

				{deskEntries.map((entry) => (
					<article class="systems-entry">
						<p class="meta">{entry.meta}</p>
						<h2>{entry.title}</h2>
						<p>{entry.content}</p>
					</article>
				))}
			</section>
		</main>
	);
}

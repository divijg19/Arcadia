const systemTracks = [
	{
		title: "Deterministic Simulation Loops",
		content:
			"Rust-backed update cycles, strict frame budgets, and reproducible state transitions designed for replayability and competitive balance analysis.",
		language: "Rust + TypeScript",
	},
	{
		title: "Runtime Orchestration",
		content:
			"Clear separation between simulation, rendering, and I/O with testable adapters for browser, terminal, and native execution paths.",
		language: "TypeScript + Go",
	},
	{
		title: "Data-Driven Combat Infrastructure",
		content:
			"Schema-oriented move definitions, content hooks, and script injection points that keep balancing workflows fast for designers.",
		language: "Rust + Lua",
	},
	{
		title: "Profiling And Performance Telemetry",
		content:
			"In-engine diagnostics focused on frame pacing, contact throughput, and memory lifetime to catch regressions before shipping.",
		language: "Go + Rust",
	},
];

export default function SystemsEditorial() {
	return (
		<main class="editorial-page">
			<section class="editorial-hero">
				<p class="editorial-kicker">Systems</p>
				<h1>Architecture Tracks Across Browser, Native, And TUI</h1>
				<p>
					A systems-first engineering approach where each language targets a
					specific execution model and performance responsibility.
				</p>
			</section>

			<section class="editorial-section timeline">
				{systemTracks.map((track, index) => (
					<article class="timeline-row" style={{ "--row-index": `${index}` }}>
						<p class="timeline-language">{track.language}</p>
						<div class="timeline-content">
							<h2>{track.title}</h2>
							<p>{track.content}</p>
						</div>
					</article>
				))}
			</section>
		</main>
	);
}

import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js";

const whitepaperSections = [
	{
		title: "Deterministic ECS",
		lead: "Rust owns the simulation truth. Systems are ordered, state is explicit, and frame timing is bounded so the game can be replayed, profiled, and reasoned about without hidden drift.",
		body: [
			"The simulation graph is built around immutable inputs, a fixed update cadence, and serialization that favors readable diffs over opaque blobs.",
			"This keeps combat, interaction, and persistence auditable for both design iteration and technical debugging.",
		],
		meta: [
			"ecs tick // fixed",
			"state ownership // explicit",
			"replay model // deterministic",
		],
		schematic: [
			"[ input ] -> [ schedule ] -> [ ecs ]",
			"             |                |",
			"             v                v",
			"        [ audio ]       [ snapshot ]",
		],
	},
	{
		title: "Runtime Bridge",
		lead: "Go handles tools and orchestration while the browser shell stays lean. The boundary between host and runtime is narrow on purpose, which keeps memory behavior legible and iteration speed high.",
		body: [
			"The host provides rendering surfaces, input normalization, and packaging, but the executable logic remains in the domain language of the game or engine.",
			"That separation lets the studio move between browser prototypes, native tooling, and scripted experiments without rewriting the project spine.",
		],
		meta: ["host layer // thin", "tooling // Go", "runtime surface // minimal"],
		schematic: [
			"[ browser ] --- [ bridge ] --- [ runtime ]",
			"     |               |               |",
			"   render          input io      state delta",
		],
	},
	{
		title: "Scripted Poetics",
		lead: "Lua is reserved for the intimate parts of the studio: narrative events, encounter scripting, and fast mechanic sketching where expressive iteration matters more than ceremony.",
		body: [
			"The scripting layer is intentionally small and declarative, so designers can shape behavior before hardening it into deeper systems.",
			"This keeps the atelier fluid: the same idea can start as a script, graduate into Rust, and remain spiritually aligned with the original sketch.",
		],
		meta: [
			"script loop // rapid",
			"content authoring // direct",
			"prototype path // low friction",
		],
		schematic: [
			"[ script ] -> [ event ] -> [ scene ]",
			"     |            |           |",
			"   ideas       triggers    outcomes",
		],
	},
] as const;

const languageStats = [
	{ lang: "RUST", loc: "1,692", files: 8 },
	{ lang: "GO", loc: "0", files: 0 },
	{ lang: "ZIG", loc: "0", files: 0 },
	{ lang: "LUA", loc: "0", files: 0 },
] as const;

export default function ImmersiveHero() {
	let apertureCanvasRef: HTMLCanvasElement | undefined;
	const [scrollProgress, setScrollProgress] = createSignal(0);

	const apertureScale = createMemo(() => 1 + scrollProgress() * 2.4);
	const apertureDarkness = createMemo(() => {
		const mapped = (scrollProgress() - 0.18) / 0.34;
		return Math.max(0, Math.min(1, mapped));
	});
	const apertureOpacity = createMemo(() =>
		Math.max(0, 1 - scrollProgress() * 1.08),
	);
	const contentOpacity = createMemo(() =>
		Math.max(0, Math.min(1, (scrollProgress() - 0.26) / 0.46)),
	);
	const introOpacity = createMemo(() =>
		Math.max(0, Math.min(1, (scrollProgress() - 0.28) / 0.12)),
	);
	const statsOpacity = createMemo(() =>
		Math.max(0, Math.min(1, (scrollProgress() - 0.82) / 0.12)),
	);
	const revealCardOpacity = (index: number) => {
		const start = 0.38 + index * 0.18;
		return Math.max(0, Math.min(1, (scrollProgress() - start) / 0.12));
	};

	onMount(() => {
		const context = apertureCanvasRef?.getContext("2d");
		if (!context) return;

		let frame = 0;
		let rafId = 0;
		let width = 0;
		let height = 0;
		let dpr = 1;

		const resizeCanvas = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = apertureCanvasRef?.clientWidth ?? 1;
			height = apertureCanvasRef?.clientHeight ?? 1;
			if (!apertureCanvasRef) return;
			apertureCanvasRef.width = Math.max(1, Math.round(width * dpr));
			apertureCanvasRef.height = Math.max(1, Math.round(height * dpr));
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		const draw = () => {
			frame += 1;
			context.clearRect(0, 0, width, height);

			const glow = context.createRadialGradient(
				width * 0.5,
				height * 0.5,
				Math.min(width, height) * 0.1,
				width * 0.5,
				height * 0.5,
				Math.max(width, height) * 0.78,
			);
			glow.addColorStop(0, "rgba(242, 240, 233, 0.18)");
			glow.addColorStop(0.32, "rgba(217, 92, 20, 0.15)");
			glow.addColorStop(1, "rgba(0, 0, 0, 0.98)");

			context.fillStyle = glow;
			context.fillRect(0, 0, width, height);

			context.globalCompositeOperation = "screen";
			for (let index = 0; index < 42; index += 1) {
				const t = frame * 0.004 + index * 0.29;
				const x =
					width * 0.5 + Math.cos(t) * width * 0.16 + Math.sin(t * 1.8) * 7;
				const y =
					height * 0.5 +
					Math.sin(t * 1.22) * height * 0.18 +
					Math.cos(t * 1.4) * 8;
				context.fillStyle = `rgba(242, 240, 233, ${0.06 + (index % 5) * 0.025})`;
				context.beginPath();
				context.arc(x, y, 0.7 + (index % 4) * 0.18, 0, Math.PI * 2);
				context.fill();
			}

			context.globalCompositeOperation = "source-over";
			rafId = window.requestAnimationFrame(draw);
		};

		const updateScroll = () => {
			const viewportHeight = Math.max(1, window.innerHeight);
			const value = window.scrollY / (viewportHeight * 1.6);
			setScrollProgress(Math.max(0, Math.min(1, value)));
		};

		resizeCanvas();
		draw();
		updateScroll();

		window.addEventListener("resize", resizeCanvas);
		window.addEventListener("scroll", updateScroll, { passive: true });

		onCleanup(() => {
			window.cancelAnimationFrame(rafId);
			window.removeEventListener("resize", resizeCanvas);
			window.removeEventListener("scroll", updateScroll);
		});
	});

	return (
		<main class="atelier-page home-aperture-page">
			<section class="home-aperture-sticky">
				<div class="home-aperture-aura" aria-hidden="true" />
				<div class="home-aperture-plaque">
					<p class="name type-soul">Prototype</p>
					<p class="role">indie game developer</p>
					<p class="meta">story systems / deterministic runtime craft</p>
				</div>
				<div class="home-aperture-shell" aria-hidden="true">
					<div
						class="home-aperture-veil"
						style={{
							transform: `scale(${apertureScale().toFixed(3)})`,
							opacity: `${apertureOpacity().toFixed(3)}`,
						}}
					>
						<canvas ref={apertureCanvasRef} class="home-aperture-canvas" />
						<div
							class="home-aperture-darkness"
							style={{ opacity: `${apertureDarkness().toFixed(3)}` }}
						/>
					</div>
				</div>
				<div class="home-aperture-caption">
					<p class="line">the digital atelier | cinematic aperture</p>
					<p class="line">rust / go / zig / lua</p>
				</div>
			</section>

			<div
				class="home-story-track"
				style={{ opacity: `${contentOpacity().toFixed(3)}` }}
			>
				<section class="home-story-intro-panel">
					<div
						class="home-story-intro-panel-inner"
						style={{
							opacity: `${introOpacity().toFixed(3)}`,
							transform: `translate3d(0, ${(1 - introOpacity()) * 20}px, 0)`,
						}}
					>
						<p class="whitepaper-kicker">Systems Whitepaper</p>
						<h2>The Digital Atelier</h2>
						<p class="whitepaper-lead">
							A deterministic simulation runtime paired with a lean host layer,
							orchestrated through scripted poetry. This is the spine of
							Arcadia.
						</p>
					</div>
				</section>

				<For each={whitepaperSections}>
					{(section, index) => (
						<section class="home-story-panel">
							<div
								class="home-story-panel-card"
								style={{
									opacity: `${revealCardOpacity(index()).toFixed(3)}`,
									transform: `translate3d(0, ${(1 - revealCardOpacity(index())) * 24}px, 0)`,
								}}
							>
								<p class="whitepaper-kicker">{section.meta[0]}</p>
								<h3>{section.title}</h3>
								<p class="home-story-copy">{section.lead}</p>
								<div class="home-story-body-grid">
									<div class="whitepaper-copy">
										<For each={section.body}>
											{(paragraph) => <p>{paragraph}</p>}
										</For>
									</div>
									<div class="whitepaper-right">
										<pre class="whitepaper-schematic">
											{section.schematic.join("\n")}
										</pre>
										<div class="whitepaper-meta">
											<For each={section.meta}>{(meta) => <p>{meta}</p>}</For>
										</div>
									</div>
								</div>
							</div>
						</section>
					)}
				</For>

				<section class="home-language-panel" aria-label="Language statistics">
					<div
						class="home-language-panel-inner"
						style={{
							opacity: `${statsOpacity().toFixed(3)}`,
							transform: `translate3d(0, ${(1 - statsOpacity()) * 24}px, 0)`,
						}}
					>
						<p class="whitepaper-kicker">Language stack</p>
						<div class="home-language-stats">
							<For each={languageStats}>
								{(stat) => (
									<div class="language-stat-row">
										<span class="language-name">{stat.lang}</span>
										<span class="language-separator">........</span>
										<span class="language-count">{stat.loc} LOC</span>
									</div>
								)}
							</For>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}

import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js";

const storyTiming = {
	homeScale: 2.4,
	contentStart: 0.26,
	introStart: 0.28,
	introDuration: 0.12,
	panelStart: 0.38,
	panelStep: 0.18,
	panelDuration: 0.12,
	statsStart: 0.82,
} as const;

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
	const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(false);
	const apertureEngulfProgress = createMemo(() => {
		if (prefersReducedMotion()) return 0;
		return Math.max(0, Math.min(1, (scrollProgress() - 0.01) / 0.42));
	});

	const apertureScale = createMemo(() =>
		prefersReducedMotion()
			? 1
			: Math.max(1, 1 + apertureEngulfProgress() ** 1.6 * 32),
	);
	const apertureDarkness = createMemo(() => {
		const mapped = (scrollProgress() - 0.12) / 0.34;
		return Math.max(0, Math.min(1, mapped)) * 1.15;
	});
	const apertureOpacity = createMemo(() =>
		prefersReducedMotion()
			? 1
			: Math.max(0, 1 - Math.max(0, scrollProgress() - 0.8) / 0.12),
	);
	const contentOpacity = createMemo(() =>
		prefersReducedMotion()
			? 1
			: Math.max(
					0,
					Math.min(1, (scrollProgress() - storyTiming.contentStart) / 0.46),
				),
	);
	const introOpacity = createMemo(() =>
		prefersReducedMotion()
			? 1
			: Math.max(
					0,
					Math.min(
						1,
						(scrollProgress() - storyTiming.introStart) /
							storyTiming.introDuration,
					),
				),
	);
	const statsOpacity = createMemo(() =>
		prefersReducedMotion()
			? 1
			: Math.max(
					0,
					Math.min(
						1,
						(scrollProgress() - storyTiming.statsStart) /
							storyTiming.panelDuration,
					),
				),
	);
	const storyDepth = createMemo(() =>
		prefersReducedMotion()
			? 1
			: Math.max(0, Math.min(1, (scrollProgress() - 0.18) / 0.58)),
	);
	const panelProgress = (index: number) => {
		if (prefersReducedMotion()) return 1;
		const start = storyTiming.panelStart + index * storyTiming.panelStep;
		const end = start + storyTiming.panelDuration;
		const inWindow = Math.max(
			0,
			Math.min(1, (scrollProgress() - start) / storyTiming.panelDuration),
		);
		const outWindow = Math.max(
			0,
			Math.min(1, (end - scrollProgress()) / (storyTiming.panelDuration * 0.7)),
		);
		return Math.min(inWindow, outWindow) * 1.18;
	};
	const revealCardOpacity = (index: number) => {
		const progress = panelProgress(index);
		return prefersReducedMotion() ? 1 : Math.max(0, Math.min(1, progress));
	};
	const revealCardDepth = (index: number) => {
		if (prefersReducedMotion()) return 0;
		const progress = panelProgress(index);
		return (1 - progress) * -180;
	};
	const revealCardScale = (index: number) => {
		if (prefersReducedMotion()) return 1;
		const progress = panelProgress(index);
		return 0.9 + progress * 0.12;
	};

	onMount(() => {
		const reducedMotionQuery = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		const syncReducedMotion = () =>
			setPrefersReducedMotion(reducedMotionQuery.matches);
		syncReducedMotion();
		reducedMotionQuery.addEventListener("change", syncReducedMotion);

		const context = apertureCanvasRef?.getContext("2d");
		if (!context) {
			onCleanup(() =>
				reducedMotionQuery.removeEventListener("change", syncReducedMotion),
			);
			return;
		}

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
			if (prefersReducedMotion()) {
				const aperture = context.createRadialGradient(
					width * 0.5,
					height * 0.5,
					Math.min(width, height) * 0.08,
					width * 0.5,
					height * 0.5,
					Math.max(width, height) * 0.8,
				);
				aperture.addColorStop(0, "rgba(242, 240, 233, 0.12)");
				aperture.addColorStop(0.3, "rgba(217, 92, 20, 0.12)");
				aperture.addColorStop(1, "rgba(0, 0, 0, 0.98)");
				context.clearRect(0, 0, width, height);
				context.fillStyle = aperture;
				context.fillRect(0, 0, width, height);
				return;
			}

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

			const pulse = Math.sin(frame * 0.008) * 0.5 + 0.5;
			const ringRadius = Math.min(width, height) * (0.18 + pulse * 0.03);
			context.save();
			context.globalCompositeOperation = "screen";
			context.strokeStyle = `rgba(242, 240, 233, ${0.08 + pulse * 0.08})`;
			context.lineWidth = 1.2;
			for (let ring = 0; ring < 4; ring += 1) {
				context.beginPath();
				context.ellipse(
					width * 0.5 + Math.sin(frame * 0.01 + ring) * 4,
					height * 0.5 + Math.cos(frame * 0.012 + ring) * 3,
					ringRadius + ring * 14,
					ringRadius * 0.55 + ring * 8,
					frame * 0.002 * (ring + 1),
					0,
					Math.PI * 2,
				);
				context.stroke();
			}
			context.restore();

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
			reducedMotionQuery.removeEventListener("change", syncReducedMotion);
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
				style={{
					opacity: `${contentOpacity().toFixed(3)}`,
					transform: `translate3d(0, ${(1 - storyDepth()) * 20}px, 0)`,
				}}
			>
				<section class="home-story-intro-panel">
					<section
						class="home-story-intro-panel-inner"
						aria-labelledby="home-story-intro-title"
						style={{
							opacity: `${introOpacity().toFixed(3)}`,
							transform: `translate3d(0, ${(1 - introOpacity()) * 28}px, ${(1 - introOpacity()) * -54}px)`,
						}}
					>
						<p class="whitepaper-kicker">Systems Whitepaper</p>
						<h2 id="home-story-intro-title">The Digital Atelier</h2>
						<For each={whitepaperSections}>
							{(section, index) => {
								const prog = panelProgress(index());
								const isActive = prog > 0.02;
								return (
									<section
										class="home-story-panel"
										aria-labelledby={`panel-${index()}-title`}
										style={{
											position: isActive ? "fixed" : "relative",
											inset: isActive ? "0" : undefined,
											display: isActive ? "flex" : undefined,
											"align-items": isActive ? "center" : undefined,
											"justify-content": isActive ? "center" : undefined,
											"z-index": isActive ? 60 + index() : undefined,
											"pointer-events": isActive ? "auto" : "none",
										}}
									>
										<div
											class="home-story-panel-card"
											style={{
												opacity: `${revealCardOpacity(index()).toFixed(3)}`,
												transform: `translate3d(0, ${(1 - revealCardOpacity(index())) * 36}px, ${revealCardDepth(index())}px) scale(${revealCardScale(index()).toFixed(3)})`,
											}}
										>
											<p class="whitepaper-kicker">{section.meta[0]}</p>
											<h3 id={`panel-${index()}-title`}>{section.title}</h3>
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
														<For each={section.meta}>
															{(meta) => <p>{meta}</p>}
														</For>
													</div>
												</div>
											</div>
										</div>
									</section>
								);
							}}
						</For>
					</section>
				</section>

				<section class="home-language-panel" aria-label="Language statistics">
					<div
						class="home-language-panel-inner"
						style={{
							opacity: `${statsOpacity().toFixed(3)}`,
							transform: `translate3d(0, ${(1 - statsOpacity()) * 28}px, ${(1 - statsOpacity()) * -64}px)`,
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

import { Link } from "@tanstack/solid-router";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	hue: number;
}

function makeParticles(
	count: number,
	width: number,
	height: number,
): Particle[] {
	const next: Particle[] = [];
	for (let index = 0; index < count; index += 1) {
		next.push({
			x: Math.random() * width,
			y: Math.random() * height,
			vx: (Math.random() - 0.5) * 0.7,
			vy: (Math.random() - 0.5) * 0.7,
			radius: Math.random() * 1.8 + 0.8,
			hue: 185 + Math.random() * 72,
		});
	}
	return next;
}

export default function ImmersiveHero() {
	let canvasRef: HTMLCanvasElement | undefined;
	const [scrollY, setScrollY] = createSignal(0);
	const [viewportHeight, setViewportHeight] = createSignal(1);

	const scrollProgress = createMemo(() => {
		return Math.min(scrollY() / Math.max(1, viewportHeight()), 1.35);
	});

	onMount(() => {
		if (!canvasRef) return;
		const context = canvasRef.getContext("2d");
		if (!context) return;

		const reducedMotionQuery = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		let animationFrame = 0;
		let dpr = 1;
		let width = 0;
		let height = 0;
		let particles: Particle[] = [];
		const pointer = {
			x: 0,
			y: 0,
			targetX: 0,
			targetY: 0,
		};

		const paintBackdrop = () => {
			const gradient = context.createRadialGradient(
				pointer.x,
				pointer.y,
				40,
				pointer.x,
				pointer.y,
				Math.max(width, height) * 0.68,
			);
			gradient.addColorStop(0, "rgba(35, 137, 255, 0.22)");
			gradient.addColorStop(0.45, "rgba(17, 79, 171, 0.12)");
			gradient.addColorStop(1, "rgba(2, 7, 19, 0)");

			context.fillStyle = "rgba(2, 5, 12, 0.42)";
			context.fillRect(0, 0, width, height);
			context.fillStyle = gradient;
			context.fillRect(0, 0, width, height);
		};

		const drawConnection = (
			first: Particle,
			second: Particle,
			distance: number,
		) => {
			const alpha = Math.max(0, 1 - distance / 124) * 0.26;
			if (alpha <= 0) return;
			context.strokeStyle = `rgba(96, 207, 255, ${alpha})`;
			context.lineWidth = 0.7;
			context.beginPath();
			context.moveTo(first.x, first.y);
			context.lineTo(second.x, second.y);
			context.stroke();
		};

		const tick = () => {
			if (reducedMotionQuery.matches) {
				context.clearRect(0, 0, width, height);
				paintBackdrop();
				return;
			}

			pointer.x += (pointer.targetX - pointer.x) * 0.08;
			pointer.y += (pointer.targetY - pointer.y) * 0.08;

			paintBackdrop();
			context.globalCompositeOperation = "screen";

			for (let index = 0; index < particles.length; index += 1) {
				const particle = particles[index];
				if (!particle) continue;

				const dx = pointer.x - particle.x;
				const dy = pointer.y - particle.y;
				const distance = Math.sqrt(dx * dx + dy * dy) + 0.01;
				const pull = Math.min(0.22, 48 / distance / distance);

				particle.vx += (dx / distance) * pull;
				particle.vy += (dy / distance) * pull;
				particle.vx *= 0.985;
				particle.vy *= 0.985;

				particle.x += particle.vx;
				particle.y += particle.vy;

				if (particle.x < -40) particle.x = width + 20;
				if (particle.x > width + 40) particle.x = -20;
				if (particle.y < -40) particle.y = height + 20;
				if (particle.y > height + 40) particle.y = -20;

				context.fillStyle = `hsla(${particle.hue}, 85%, 66%, 0.78)`;
				context.beginPath();
				context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
				context.fill();

				for (
					let secondIndex = index + 1;
					secondIndex < particles.length;
					secondIndex += 1
				) {
					const second = particles[secondIndex];
					if (!second) continue;
					const px = particle.x - second.x;
					const py = particle.y - second.y;
					const linkDistance = Math.sqrt(px * px + py * py);
					if (linkDistance < 124)
						drawConnection(particle, second, linkDistance);
				}
			}

			context.globalCompositeOperation = "source-over";
			animationFrame = window.requestAnimationFrame(tick);
		};

		const syncSize = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = canvasRef?.clientWidth ?? window.innerWidth;
			height = canvasRef?.clientHeight ?? window.innerHeight;
			if (!canvasRef) return;
			canvasRef.width = Math.max(1, Math.round(width * dpr));
			canvasRef.height = Math.max(1, Math.round(height * dpr));
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
			particles = makeParticles(
				Math.round(Math.max(90, width * 0.08)),
				width,
				height,
			);
			pointer.x = width * 0.5;
			pointer.y = height * 0.5;
			pointer.targetX = pointer.x;
			pointer.targetY = pointer.y;
			setViewportHeight(window.innerHeight);
		};

		const handlePointerMove = (event: PointerEvent) => {
			pointer.targetX = event.clientX;
			pointer.targetY = event.clientY;
		};

		const handlePointerLeave = () => {
			pointer.targetX = width * 0.5;
			pointer.targetY = height * 0.5;
		};

		const handleScroll = () => {
			setScrollY(window.scrollY);
		};

		syncSize();
		handleScroll();
		tick();

		window.addEventListener("resize", syncSize);
		window.addEventListener("pointermove", handlePointerMove, {
			passive: true,
		});
		window.addEventListener("pointerleave", handlePointerLeave);
		window.addEventListener("scroll", handleScroll, { passive: true });
		reducedMotionQuery.addEventListener("change", syncSize);

		onCleanup(() => {
			window.cancelAnimationFrame(animationFrame);
			window.removeEventListener("resize", syncSize);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerleave", handlePointerLeave);
			window.removeEventListener("scroll", handleScroll);
			reducedMotionQuery.removeEventListener("change", syncSize);
		});
	});

	return (
		<section class="home-stage">
			<canvas ref={canvasRef} class="home-canvas" />
			<div class="home-gradient-wash" aria-hidden="true" />

			<div class="hero-atmosphere atmosphere-left" aria-hidden="true" />
			<div class="hero-atmosphere atmosphere-right" aria-hidden="true" />

			<div class="hero-content-stack">
				<p class="hero-flag">Independent Game Engineering Portfolio</p>
				<h1 class="hero-title-lockup">
					<span
						class="hero-title-line"
						style={{
							transform: `translate3d(${scrollProgress() * -36}px, ${scrollProgress() * -14}px, 0)`,
						}}
					>
						BUILD
					</span>
					<span
						class="hero-title-line"
						style={{
							transform: `translate3d(${scrollProgress() * 32}px, ${scrollProgress() * -10}px, 0)`,
						}}
					>
						WORLDS
					</span>
					<span
						class="hero-title-line accent"
						style={{
							transform: `translate3d(${scrollProgress() * -24}px, ${scrollProgress() * 9}px, 0)`,
						}}
					>
						THAT ENDURE
					</span>
				</h1>
				<p class="hero-lead">
					Go, TypeScript, Rust, and Lua systems craftsmanship across custom
					engines tuned for deterministic play, heavyweight RPG depth, and
					script-first experimentation.
				</p>
				<div class="hero-link-row">
					<Link to="/games" class="hero-link-pill">
						Explore Games
					</Link>
					<Link to="/engines" class="hero-link-pill ghost">
						Inspect Engines
					</Link>
				</div>
			</div>
		</section>
	);
}

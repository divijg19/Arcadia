import { createSignal, onCleanup, onMount } from "solid-js";

export default function CinematicCursor() {
	let cursorRef: HTMLDivElement | undefined;
	const [isVisible, setIsVisible] = createSignal(false);

	onMount(() => {
		if (!window.matchMedia("(pointer: fine)").matches) return;
		if (!cursorRef) return;

		let rafId = 0;
		let x = window.innerWidth * 0.5;
		let y = window.innerHeight * 0.5;
		let targetX = x;
		let targetY = y;

		const render = () => {
			x += (targetX - x) * 0.18;
			y += (targetY - y) * 0.18;
			if (cursorRef) {
				cursorRef.style.transform = `translate3d(${x - 5}px, ${y - 5}px, 0)`;
			}
			rafId = window.requestAnimationFrame(render);
		};

		const handlePointerMove = (event: PointerEvent) => {
			targetX = event.clientX;
			targetY = event.clientY;
			setIsVisible(true);
		};

		const handlePointerLeave = () => {
			setIsVisible(false);
		};

		rafId = window.requestAnimationFrame(render);
		window.addEventListener("pointermove", handlePointerMove, {
			passive: true,
		});
		window.addEventListener("pointerleave", handlePointerLeave);

		onCleanup(() => {
			window.cancelAnimationFrame(rafId);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerleave", handlePointerLeave);
		});
	});

	return (
		<div
			ref={cursorRef}
			class="atelier-cursor"
			data-visible={isVisible() ? "true" : "false"}
			aria-hidden="true"
		/>
	);
}

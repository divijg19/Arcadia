import { onCleanup, onMount } from "solid-js";

export default function CinematicCursor() {
	let dotRef: HTMLDivElement | undefined;

	onMount(() => {
		if (!window.matchMedia("(pointer: fine)").matches) return;
		if (!dotRef) return;

		const cursor = dotRef;
		const halfSize = 3;
		const epsilon = 0.01;
		const springFar = 0.28;
		const springNear = 0.16;
		const supportsRawUpdate = "onpointerrawupdate" in window;

		let rafId = 0;
		let isRunning = false;
		let currentX = window.innerWidth * 0.5;
		let currentY = window.innerHeight * 0.5;
		let targetX = currentX;
		let targetY = currentY;

		const setPosition = (x: number, y: number) => {
			cursor.style.transform = `translate3d(${x - halfSize}px, ${y - halfSize}px, 0)`;
		};

		const snapToTarget = () => {
			currentX = targetX;
			currentY = targetY;
			setPosition(currentX, currentY);
		};

		const render = () => {
			const deltaX = targetX - currentX;
			const deltaY = targetY - currentY;
			const distance = Math.hypot(deltaX, deltaY);
			const spring = distance > 120 ? springFar : springNear;

			currentX += deltaX * spring;
			currentY += deltaY * spring;
			setPosition(currentX, currentY);

			if (
				Math.abs(targetX - currentX) < epsilon &&
				Math.abs(targetY - currentY) < epsilon
			) {
				snapToTarget();
				isRunning = false;
				rafId = 0;
				return;
			}

			rafId = window.requestAnimationFrame(render);
		};

		const start = () => {
			if (isRunning) return;
			isRunning = true;
			rafId = window.requestAnimationFrame(render);
		};

		const stop = () => {
			isRunning = false;
			if (rafId) {
				window.cancelAnimationFrame(rafId);
				rafId = 0;
			}
		};

		const handlePointerMove = (event: PointerEvent) => {
			targetX = event.clientX;
			targetY = event.clientY;
			if (!isRunning) {
				snapToTarget();
			}
			start();
			cursor.style.opacity = "1";
		};

		const handlePointerLeave = () => {
			cursor.style.opacity = "0";
			stop();
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				handlePointerLeave();
			}
		};

		setPosition(currentX, currentY);
		cursor.style.opacity = "0";
		const moveEvent = supportsRawUpdate ? "pointerrawupdate" : "pointermove";
		window.addEventListener(moveEvent, handlePointerMove as EventListener, {
			passive: true,
		});
		window.addEventListener("mouseleave", handlePointerLeave);
		window.addEventListener("blur", handlePointerLeave);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		onCleanup(() => {
			stop();
			window.removeEventListener(moveEvent, handlePointerMove as EventListener);
			window.removeEventListener("mouseleave", handlePointerLeave);
			window.removeEventListener("blur", handlePointerLeave);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		});
	});

	return <div ref={dotRef} class="atelier-cursor" aria-hidden="true" />;
}

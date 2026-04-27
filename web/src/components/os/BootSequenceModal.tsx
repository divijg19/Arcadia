import {
	Show,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
} from "solid-js";

interface BootSequenceModalProps {
	open: boolean;
	gameTitle: string;
	statusLine?: string;
	onComplete?: () => void;
}

export default function BootSequenceModal(props: BootSequenceModalProps) {
	const [visibleLineCount, setVisibleLineCount] = createSignal(0);

	const scriptLines = createMemo(() => [
		"ARCADIA // BIOS v1.5.4",
		"allocating wasm heap pages... ok",
		"bridging deterministic ecs scheduler... ok",
		"binding render buffer + contact channels... ok",
		`mounting runtime: ${props.gameTitle.toLowerCase()}... ok`,
		props.statusLine ?? "preheating simulation loop...",
		"launch vector stable. entering runtime.",
	]);

	createEffect(() => {
		if (!props.open) {
			setVisibleLineCount(0);
			return;
		}

		setVisibleLineCount(0);
		let cursor = 0;
		let finalizeTimer: number | undefined;
		const intervalId = window.setInterval(() => {
			cursor += 1;
			setVisibleLineCount(cursor);
			if (cursor < scriptLines().length) return;

			window.clearInterval(intervalId);
			finalizeTimer = window.setTimeout(() => {
				props.onComplete?.();
			}, 420);
		}, 170);

		onCleanup(() => {
			window.clearInterval(intervalId);
			if (finalizeTimer !== undefined) window.clearTimeout(finalizeTimer);
		});
	});

	return (
		<Show when={props.open}>
			<div class="boot-modal-backdrop" role="dialog" aria-modal="true">
				<div class="boot-modal-shell">
					<p class="boot-modal-kicker">Boot Sequence</p>
					<h2>{props.gameTitle}</h2>
					<pre class="boot-terminal" aria-live="polite">
						{scriptLines()
							.slice(0, visibleLineCount())
							.map((line) => `> ${line}`)
							.join("\n")}
					</pre>
				</div>
			</div>
		</Show>
	);
}

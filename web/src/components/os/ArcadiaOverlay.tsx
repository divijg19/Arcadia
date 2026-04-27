interface ArcadiaOverlayProps {
	gameTitle: string;
	onReturnToNexus: () => void;
}

export default function ArcadiaOverlay(props: ArcadiaOverlayProps) {
	return (
		<div class="runtime-overlay-shell">
			<div class="runtime-overlay-info">
				<p>Arcadia Runtime</p>
				<strong>{props.gameTitle}</strong>
			</div>
			<button
				type="button"
				class="runtime-overlay-button"
				onClick={props.onReturnToNexus}
			>
				Arcadia Overlay
			</button>
		</div>
	);
}

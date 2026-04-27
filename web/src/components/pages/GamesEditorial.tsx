import { For, createSignal } from "solid-js";
import { cn } from "~/lib/utils";

const archiveEntries = [
	{
		id: "astra",
		title: "Astra-Naught",
		subtitle: "Arcadia // browser release",
		washClass: "wash-astra",
	},
	{
		id: "verdant",
		title: "Verdant Descent",
		subtitle: "Arcadia // browser release",
		washClass: "wash-verdant",
	},
	{
		id: "babylon",
		title: "Babylon Estate",
		subtitle: "Arcadia // browser release",
		washClass: "wash-babylon",
	},
	{
		id: "ashbinder",
		title: "Ashbinder Tactics",
		subtitle: "Gladiolus // downloadable build",
		washClass: "wash-ashbinder",
	},
	{
		id: "rookline",
		title: "Rookline Siege",
		subtitle: "Rust native // downloadable build",
		washClass: "wash-rookline",
	},
	{
		id: "moonwake",
		title: "Moonwake Scripts",
		subtitle: "Lunaria // prototype collection",
		washClass: "wash-moonwake",
	},
] as const;

export default function GamesEditorial() {
	const [activeId, setActiveId] = createSignal<
		(typeof archiveEntries)[number]["id"] | null
	>(null);

	return (
		<main class="atelier-page games-archive-page">
			<div class="games-archive-backdrop" aria-hidden="true">
				<For each={archiveEntries}>
					{(entry) => (
						<div
							class={cn(
								"game-wash",
								entry.washClass,
								activeId() === entry.id && "is-active",
							)}
						/>
					)}
				</For>
			</div>

			<section class="games-archive-content">
				<p class="games-archive-meta">
					interactive archive | hover any title to reveal its cinematic plate
				</p>
				<ul class="games-title-list">
					<For each={archiveEntries}>
						{(entry, index) => {
							return (
								<li class="games-title-row">
									<button
										type="button"
										class="games-title-button"
										onMouseEnter={() => setActiveId(entry.id)}
										onFocus={() => setActiveId(entry.id)}
									>
										<span class="games-title-index">{index() + 1}.</span>
										<span class="games-title-text">{entry.title}</span>
										<span class="games-title-subtitle">{entry.subtitle}</span>
									</button>
								</li>
							);
						}}
					</For>
				</ul>
			</section>
		</main>
	);
}

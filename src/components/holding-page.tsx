import type { Content } from "@/content/en";

// System font stack only. The serif is chosen against the founder's wordmark,
// and there isn't one yet — so no typeface is committed here.
const systemFont =
	'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Locale-agnostic: it renders whatever copy it is handed. The page resolves the
// locale and passes the resolved copy in, so this component never reads a
// locale or falls back — that decision is already made.
export default function HoldingPage({ copy }: { copy: Content }) {
	return (
		<main
			className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-cream px-6 text-center text-ink"
			style={{ fontFamily: systemFont }}
		>
			{/* Reserves roughly the space the drawn signature will occupy, so the
			    SVG later drops into a gap that already fits. No animation: the
			    signature draws itself once there is a real wordmark to draw. */}
			<h1 className="leading-none" style={{ fontSize: "clamp(2.5rem, 12vw, 6rem)" }}>
				{copy.wordmark}
			</h1>

			<p className="max-w-prose text-lg sm:text-xl">{copy.line}</p>

			<p className="flex gap-6 text-sm sm:text-base">
				{copy.handles.map((handle, i) => (
					<span key={i}>{handle}</span>
				))}
			</p>
		</main>
	);
}

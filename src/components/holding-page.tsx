import { en } from "@/content/en";

// System font stack only. The serif is chosen against the founder's wordmark,
// and there isn't one yet — so no typeface is committed here.
const systemFont =
	'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export default function HoldingPage() {
	return (
		<main
			className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-cream px-6 text-center text-ink"
			style={{ fontFamily: systemFont }}
		>
			{/* Reserves roughly the space the drawn signature will occupy, so the
			    SVG later drops into a gap that already fits. No animation: the
			    signature draws itself once there is a real wordmark to draw. */}
			<h1 className="leading-none" style={{ fontSize: "clamp(2.5rem, 12vw, 6rem)" }}>
				{en.wordmark}
			</h1>

			<p className="max-w-prose text-lg sm:text-xl">{en.line}</p>

			<p className="flex gap-6 text-sm sm:text-base">
				{en.handles.map((handle, i) => (
					<span key={i}>{handle}</span>
				))}
			</p>
		</main>
	);
}

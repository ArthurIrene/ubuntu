// The web app manifest, **on the dashboard routes only** *(R12c)*.
//
// A route handler rather than Next's `manifest.ts` convention, because that
// convention serves one manifest from the application root and this must not be
// advertised on the public site. It is linked from the dashboard layout and
// nowhere else.
//
// `start_url` and `scope` are both the dashboard path, which is also the
// session cookie's path: a pinned instance opens inside the scope its cookie
// belongs to, and cannot wander onto the public site carrying it.
//
// **There is no service worker and there will not be one.** An offline work
// queue would show orders that have moved and fire emails on reconnect — a
// correctness problem dressed as a feature, on the one screen whose contract is
// that a row leaves the moment he acts.

export const dynamic = "force-static";

export function GET() {
	return Response.json(
		{
			name: "Ubuntu",
			short_name: "Ubuntu",
			start_url: "/dashboard",
			scope: "/dashboard",
			display: "standalone",
			// Design lands in Phase 5. Cream and ink are the two tokens that are
			// already decided and would be wrong to invent around.
			background_color: "#F5F0E8",
			theme_color: "#1A1208",
			icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
		},
		{
			headers: {
				"Content-Type": "application/manifest+json",
				"X-Robots-Tag": "noindex, nofollow",
			},
		},
	);
}

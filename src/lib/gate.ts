// The PUBLIC_SITE gate. Two pure functions, no I/O — the middleware supplies
// the env value and the request path; these only decide.

/**
 * The site is open only when the value is exactly "open".
 *
 * A gate that fails open is not a gate. Missing, empty, "true", "1", "OPEN",
 * "Open" and " open" all read as shut — the failure being defended against is
 * a typo in a dashboard field at 11pm.
 */
export function isOpen(value: string | undefined): boolean {
	return value === "open";
}

// Path prefixes that are never gated, and never localed — the tree outside
// [locale]. A prefix matches a path that equals it exactly or continues with a
// "/", so "/o" and "/o/<token>" are exempt while "/optional" is not.
const UNGATED_PREFIXES = [
	"/dashboard", // the founder's dashboard, off the public tree, one language
	"/o", //         order links — a real token reaches its page open or shut
	"/api", //       route handlers
	"/_next", //     Next internals
];

/**
 * True for the public tree — the pages the gate covers, which includes both
 * locale roots ("/" and "/rw"). False for the dashboard, order links, the API
 * and Next internals. The holding page now lives under [locale] and is reached
 * by rewrite, not by being exempt here.
 *
 * `/o/<token>` must never be gated: a customer holding a real order link
 * reaches it whether the site is open or shut.
 */
export function isGated(pathname: string): boolean {
	for (const prefix of UNGATED_PREFIXES) {
		if (pathname === prefix || pathname.startsWith(prefix + "/")) {
			return false;
		}
	}
	return true;
}

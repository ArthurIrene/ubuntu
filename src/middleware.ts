import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isOpen } from "@/lib/gate";
import { ORDER_ROUTE_HEADERS, isOrderRoute, resolveRoute } from "@/lib/routing";

export async function middleware(request: NextRequest) {
	// Read PUBLIC_SITE per request from the Worker's env, so flipping the gate
	// is a value change, not a redeploy. In production this is a Cloudflare
	// secret; locally it comes from .dev.vars.
	const { env } = await getCloudflareContext({ async: true });
	const publicSite = (env as CloudflareEnv & { PUBLIC_SITE?: string }).PUBLIC_SITE;

	// The decision is pure and lives in resolveRoute; this only supplies the
	// request path and the gate state, then carries the decision out. Always a
	// rewrite or a pass — never a redirect, so the address bar never gains /en.
	const decision = resolveRoute(request.nextUrl.pathname, isOpen(publicSite));

	const response = (() => {
		if (decision.kind === "rewrite") {
			const url = request.nextUrl.clone();
			url.pathname = decision.to;
			return NextResponse.rewrite(url);
		}
		return NextResponse.next();
	})();

	// **The path is the credential** *(R5)*, so every response under /o leaves
	// with no referrer and no invitation to a crawler. Set here rather than per
	// route because it has to cover the page, the POST it makes and the private
	// photo stream — and because a header that has to be remembered in three
	// files is a header that will be missing from the fourth.
	if (isOrderRoute(request.nextUrl.pathname)) {
		for (const [name, value] of Object.entries(ORDER_ROUTE_HEADERS)) {
			response.headers.set(name, value);
		}
	}

	return response;
}

export const config = {
	// Static assets and the favicon are served without middleware; every path
	// decision beyond that lives in resolveRoute, not here.
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

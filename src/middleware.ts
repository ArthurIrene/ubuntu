import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isOpen } from "@/lib/gate";
import { resolveRoute } from "@/lib/routing";

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
	if (decision.kind === "rewrite") {
		const url = request.nextUrl.clone();
		url.pathname = decision.to;
		return NextResponse.rewrite(url);
	}

	return NextResponse.next();
}

export const config = {
	// Static assets and the favicon are served without middleware; every path
	// decision beyond that lives in resolveRoute, not here.
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

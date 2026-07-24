import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isGated, isOpen } from "@/lib/gate";

export async function middleware(request: NextRequest) {
	// Read PUBLIC_SITE per request from the Worker's env, so flipping the gate
	// is a value change, not a redeploy. In production this is a Cloudflare
	// secret; locally it comes from .dev.vars.
	const { env } = await getCloudflareContext({ async: true });
	const publicSite = (env as CloudflareEnv & { PUBLIC_SITE?: string }).PUBLIC_SITE;

	const { pathname } = request.nextUrl;

	if (!isOpen(publicSite) && isGated(pathname)) {
		// Rewrite, never redirect: status 200, URL unchanged, no 503. The visitor
		// sees the holding page where they stand.
		const url = request.nextUrl.clone();
		url.pathname = "/holding";
		return NextResponse.rewrite(url);
	}

	return NextResponse.next();
}

export const config = {
	// Every other path decision lives in isGated, not here.
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import type { Metadata } from "next";
import HoldingPage from "@/components/holding-page";

// Bracketed placeholders must not enter an index; this comes off when his
// copy lands.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default function Home() {
	return <HoldingPage />;
}

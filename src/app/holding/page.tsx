import type { Metadata } from "next";
import HoldingPage from "@/components/holding-page";

// What the gate serves. Bracketed placeholders must not enter an index.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default function Holding() {
	return <HoldingPage />;
}

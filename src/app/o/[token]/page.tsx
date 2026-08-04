import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FitWarnings } from "@/components/fit-fields";
import { content, fill } from "@/content";
import { formatDays, formatMoney } from "@/emails/order";
import { siteSettings } from "@/lib/catalogue";
import { measurementUnitLabel, orderForToken, type CustomerOrder } from "@/lib/order-page";
import type { Status } from "@/lib/order-state";
import { path } from "@/lib/routes";

import { acknowledgeMeasurement, reportPayment } from "./actions";

/**
 * `/o/<token>` — **the customer's whole account** *(R5)*.
 *
 * There are no accounts on this site. This page is reached by a 128-bit token in
 * the path, never a query string and never a sequential id; it does not expire,
 * it can be re-sent unchanged, and it is rotatable from the dashboard in one
 * click for the person who forwarded it to the wrong reader.
 *
 * ## What is here that is nowhere else
 *
 * **The measurements.** Not in an email, not in a WhatsApp draft, on either
 * channel, ever *(R7, R11)* — they are personal data under Law 058/2021 and this
 * is the only surface that renders them.
 *
 * ## What the page must never do
 *
 * Render the token as text, put it in a link to anywhere else, or let it reach a
 * log or an error. It is already in the address bar; anything further is a copy.
 * There is **no analytics beacon on this route** for the same reason.
 *
 * Unstyled. Phase 5 owns how it looks, Phase 6 the ceremony that plays here when
 * an order turns to *In the making*.
 */
export const dynamic = "force-dynamic";

/**
 * The title says nothing about the order.
 *
 * A browser title is copied into history, into a shared screenshot and into the
 * tab strip of whoever is looking over their shoulder. *Your order* is enough.
 */
export async function generateMetadata(): Promise<Metadata> {
	return { title: content("en").order.page.title, robots: { index: false, follow: false } };
}

/** The status, as a key in `src/content/` rather than a label built here. */
const STATUS_KEY: Record<Status, keyof ReturnType<typeof content>["order"]["status"]> = {
	requested: "requested",
	confirmed: "confirmed",
	in_design: "inDesign",
	paid: "paid",
	in_the_making: "inTheMaking",
	on_its_way: "onItsWay",
	delivered: "delivered",
	declined: "declined",
	lapsed: "lapsed",
	cancelled: "cancelled",
};

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	const order = await orderForToken(token);

	// A token that answers to nothing, a malformed one and a rotated one are the
	// same 404. Distinguishing them would answer questions about tokens.
	if (!order) notFound();

	const copy = content(order.locale).order;
	const settings = await siteSettings(order.locale);

	const money = (value: number) => formatMoney({ value, currency: order.currency });
	const statusKey = STATUS_KEY[order.status];

	// **The reply time is numeric here** and qualitative only beneath the
	// commission button. `[X]` renders where he has not answered — never a guess.
	const days = formatDays(settings.replyTimeDays);

	return (
		<main>
			<h1>{copy.page.heading}</h1>

			{/* ── Where it stands ──────────────────────────────────────────────
			    Derived from the append-only log and the payments table *(R4)*.
			    There is no status column to have got out of step with it. */}
			<section>
				<h2>{copy.status[statusKey]}</h2>
				<p>{fill(copy.state[statusKey], { days })}</p>
			</section>

			{/* ── The piece ────────────────────────────────────────────────────
			    A commission between Requested and design agreement has no piece,
			    no photo and no price. **The emptiness is the product** *(R6)* —
			    what it has instead is their own words, back to them. */}
			<section>
				<h2>{order.pieceName ?? copy.page.commissionPlaceholder}</h2>

				{order.brief && (
					<>
						<h3>{copy.page.yourWordsHeading}</h3>
						{order.brief.split(/\n{2,}/).map((paragraph, index) => (
							<p key={index}>{paragraph}</p>
						))}
					</>
				)}

				<Choices order={order} heading={copy.page.choicesHeading} money={money} />
			</section>

			{/* ── Money ────────────────────────────────────────────────────────
			    Paid-ness is a separate dimension from the journey *(R4)*, derived
			    from the payments table. Confirmed rows only: a claim is not
			    money. */}
			<section>
				<h2>{copy.page.moneyHeading}</h2>

				{order.confirmedTotal === null ? (
					// He confirms the final price. Until he has, there is no figure to
					// show and none is invented.
					<p>{copy.page.moneyPending}</p>
				) : (
					<>
						<ul>
							{order.schedule.map((entry, index) => (
								<li key={index}>
									{gateLabel(entry.gate, copy.page)} —{" "}
									{entry.amount === null ? copy.page.moneyPending : money(entry.amount)}
									{entry.paid > 0 && ` · ${copy.page.received} ${money(entry.paid)}`}
								</li>
							))}
						</ul>
						{order.owed?.amount != null && (
							<p>
								{copy.page.owed}: {money(order.owed.amount - order.owed.paid)}
							</p>
						)}
					</>
				)}

				{/* **The in-between view** — between their claim and his confirmation.
				    Honest and un-anxious: no spinner, no "pending", and emphatically
				    not the payment state, which fires only when he confirms *(R4)*. */}
				{order.hasReportedPayment ? (
					<p>{copy.page.reported}</p>
				) : (
					order.owed?.amount != null && (
						<form action={reportPayment}>
							{/* The credential, carried back so the write can be checked
							    against it. Never rendered, never logged. */}
							<input type="hidden" name="token" value={token} />
							<h3>{copy.page.reportHeading}</h3>
							<p>
								<label htmlFor="reference">{copy.page.reportReference}</label>
								<input id="reference" name="reference" type="text" autoComplete="off" />
							</p>
							<p>
								<button type="submit">{copy.page.reportButton}</button>
							</p>
						</form>
					)
				)}
			</section>

			{/* ── The gentle question ──────────────────────────────────────────
			    **The second half of the three-band guardrail** *(R7)*. It sits above
			    everything because it is the one thing on this page that is waiting on
			    them — and it is asked here, behind the token, because that is the only
			    place a measurement may survive a round trip. */}
			{order.fit && (
				<FitWarnings
					copy={copy.fit}
					token={token}
					warnings={order.fit.measurements
						.filter((measurement) => measurement.warned)
						.map((measurement) => ({
							id: measurement.id,
							key: measurement.key,
							label: measurement.label,
							value: measurement.value,
							canonical: measurement.canonical,
							acknowledged: measurement.acknowledged,
						}))}
					action={acknowledgeMeasurement}
				/>
			)}

			{/* ── The numbers ──────────────────────────────────────────────────
			    **The only place on this site where measurements are rendered.** */}
			<section>
				<h2>{copy.page.fitHeading}</h2>
				<p>{copy.page.fitNote}</p>

				{order.fit === null ? (
					<p>{copy.page.fitEmpty}</p>
				) : (
					<>
						<p>{sourceLine(order.fit.source, copy.page)}</p>
						{/* **Age at the time of the order, as a number** *(R13a)*. There is
						    no date of birth here and no child record anywhere. */}
						{order.fit.ageYears !== null && (
							<p>{fill(copy.page.fitAge, { age: String(order.fit.ageYears) })}</p>
						)}
						{order.fit.standardSize && <p>{order.fit.standardSize}</p>}
						{order.fit.checked && <p>{copy.page.fitChecked}</p>}

						<dl>
							{order.fit.measurements.map((measurement) => (
								<div key={measurement.key}>
									<dt>{measurement.label}</dt>
									<dd>
										{/* Null once redacted, and the row survives around it. */}
										{measurement.value === null
											? "—"
											: `${measurement.value} ${measurementUnitLabel(measurement.key, order.fit!.unit)}`}
									</dd>
									{/* The sentence that was beside the field on the day *(R7)* —
									    what the shared-liability clause turns on, kept where they
									    can read it back. */}
									<dd>{measurement.instruction}</dd>
								</div>
							))}
						</dl>
					</>
				)}
			</section>

			{/* ── Photographs ──────────────────────────────────────────────────
			    **Private bucket, streamed through the Worker with the token
			    checked** *(R8)*. Never the public bucket, never a public URL. */}
			<section>
				<h2>{copy.page.photosHeading}</h2>
				{order.photos.length === 0 ? (
					<p>{copy.page.photosEmpty}</p>
				) : (
					order.photos.map((photo) => (
						/*
						 * A plain `<img>`, not `next/image`. The loader maps a width onto
						 * a public derivative on the public hostname, and there is no such
						 * thing here — a progress photo has one derivative at 1000 px and
						 * lives behind this token. What `next/image` was kept for is
						 * `srcset` and layout stability; the second of those is `width`
						 * and `height`, which are stored per image and set below.
						 *
						 * **Every image reserves its space before it loads.** Layout shift
						 * is a motion bug here, not a performance metric.
						 */
						// eslint-disable-next-line @next/next/no-img-element
						<img
							key={photo.id}
							src={`/o/${token}/photo/${photo.id}`}
							width={photo.width}
							height={photo.height}
							alt={photo.alt ?? ""}
							loading="lazy"
							style={{ maxWidth: "100%", height: "auto" }}
						/>
					))
				)}
			</section>

			{/* ── The link itself ──────────────────────────────────────────── */}
			<section>
				<h2>{copy.page.keepHeading}</h2>
				<p>{copy.page.keep}</p>
				{/* The one link off this page. It goes to the public tree in their own
				    locale and carries no referrer — the header is set in middleware. */}
				<p>
					<a href={path(order.locale, "contact")}>{copy.page.talk}</a>
				</p>
			</section>
		</main>
	);
}

/**
 * What they chose, and what each choice added *(R3)*.
 *
 * From the price snapshot rather than from the piece, because the piece is a
 * live row he can reword and reprice — and what belongs on this page is what
 * they agreed to, not what the catalogue says today.
 */
function Choices({
	order,
	heading,
	money,
}: {
	order: CustomerOrder;
	heading: string;
	money: (value: number) => string;
}) {
	const chosen = order.priceLines.filter(
		(line) => line.kind === "option" || line.kind === "priority",
	);
	if (chosen.length === 0) return null;

	return (
		<>
			<h3>{heading}</h3>
			<ul>
				{chosen.map((line, index) => (
					<li key={index}>
						{line.label}
						{line.amount !== 0 && ` · ${money(line.amount)}`}
					</li>
				))}
			</ul>
		</>
	);
}

/** A gate's name. **A collection order's single entry has none** *(R6)*. */
function gateLabel(
	gate: "design_fee" | "cutting" | "balance" | null,
	copy: ReturnType<typeof content>["order"]["page"],
): string {
	switch (gate) {
		case "design_fee":
			return copy.gateDesignFee;
		case "cutting":
			return copy.gateCutting;
		case "balance":
			return copy.gateBalance;
		default:
			return copy.gatePiece;
	}
}

/**
 * Who took the numbers. **This is what decides liability** *(R7, R13a)*, so it
 * is said out loud on the page rather than only recorded in the database.
 */
function sourceLine(
	source: "self" | "guardian" | "tailor" | "standard" | "ours",
	copy: ReturnType<typeof content>["order"]["page"],
): string {
	switch (source) {
		case "guardian":
			return copy.fitSourceGuardian;
		case "tailor":
			return copy.fitSourceTailor;
		case "standard":
			return copy.fitSourceStandard;
		case "ours":
			return copy.fitSourceOurs;
		default:
			return copy.fitSourceSelf;
	}
}

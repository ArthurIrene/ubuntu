import { asc, eq } from "drizzle-orm";

import { FitFields, FitWarnings, fitRefusalMessage } from "@/components/fit-fields";
import { content } from "@/content";
import { fromCanonical, isMeasurementKey, MEASUREMENTS } from "@/content/measurements";
import { getDb, schema } from "@/db/client";
import { requireSession } from "@/lib/auth";
import { ageAtOrder, evaluateFit, fitSource, type BandSpec } from "@/lib/fit";

// ───────────────────────────────────────────────────────────────────────────
// A REVIEW HARNESS FOR THE FIT FORK. NOT A CUSTOMER SURFACE, NOT WIRED IN.
// ───────────────────────────────────────────────────────────────────────────
//
// Chunk 2 of the Phase 4 brief is the one piece of work gated on a proposal,
// because it is the surface that carries personal data under Law 058/2021. This
// page exists so the proposal can be *looked at* rather than only read: it
// renders the real `<FitFields>` component, from real `garment_type_measurements`
// rows where he has set any, and runs the real `evaluateFit` over whatever
// numbers are typed into it.
//
// **It writes nothing.** No order, no fit record, no customer.
//
// It lives behind the dashboard login rather than on the public tree so that an
// unfinished form cannot be reached by a stranger. The markup below is what the
// public page would render, byte for byte — the component is shared, not copied.
//
// **The band demonstration below submits with `method="get"`**, which is the one
// thing here that is not how the real form behaves: it puts numbers in a URL so
// that an outcome can be seen without anything being written. *A real
// measurement never goes in a URL* — R7 and R11 put them behind the token and
// nowhere else, and the proposal's whole shape follows from that.

export const dynamic = "force-dynamic";

/**
 * Illustrative bands, used only when he has configured none.
 *
 * **`garment_type_measurements` is empty in production today.** The three-band
 * guardrail is driven entirely by ranges he sets in Settings, and those ranges
 * are the first item on the founder track — *the measurement table per garment*
 * — which has not come back. So this harness falls back to a plainly-labelled
 * set, and the fallback is a statement about what is missing rather than a
 * default anybody should ship.
 *
 * **Nothing seeds these into the database.** Writing invented body ranges into
 * production would be inventing the answer to a question only he can answer.
 */
const ILLUSTRATIVE: BandSpec[] = [
	{ measurementKey: "head", required: true, position: 0, plausibleMin: 520, plausibleMax: 620, impossibleMin: 400, impossibleMax: 700 },
	{ measurementKey: "chest", required: true, position: 1, plausibleMin: 700, plausibleMax: 1300, impossibleMin: 400, impossibleMax: 2000 },
	{ measurementKey: "waist", required: false, position: 2, plausibleMin: 600, plausibleMax: 1250, impossibleMin: 350, impossibleMax: 2000 },
	{ measurementKey: "height", required: true, position: 3, plausibleMin: 1400, plausibleMax: 2000, impossibleMin: 500, impossibleMax: 2500 },
	{ measurementKey: "weight", required: true, position: 4, plausibleMin: 40_000, plausibleMax: 120_000, impossibleMin: 2_000, impossibleMax: 300_000 },
];

const SAMPLE_SIZES = [
	{ key: "s", label: "S" },
	{ key: "m", label: "M" },
	{ key: "l", label: "L" },
];

export default async function FitPrototype({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	await requireSession();
	const query = await searchParams;
	const copy = content("en");
	const db = await getDb();

	// Real rows where he has set any; the illustrative set otherwise, said out
	// loud either way.
	const configured = await db
		.select({
			measurementKey: schema.garmentTypeMeasurements.measurementKey,
			required: schema.garmentTypeMeasurements.required,
			position: schema.garmentTypeMeasurements.position,
			plausibleMin: schema.garmentTypeMeasurements.plausibleMin,
			plausibleMax: schema.garmentTypeMeasurements.plausibleMax,
			impossibleMin: schema.garmentTypeMeasurements.impossibleMin,
			impossibleMax: schema.garmentTypeMeasurements.impossibleMax,
			typeKey: schema.garmentTypes.key,
			audience: schema.garmentTypes.audience,
		})
		.from(schema.garmentTypeMeasurements)
		.innerJoin(
			schema.garmentTypes,
			eq(schema.garmentTypes.id, schema.garmentTypeMeasurements.garmentTypeId),
		)
		.orderBy(asc(schema.garmentTypeMeasurements.position));

	const real = configured.length > 0;
	const specs: BandSpec[] = real ? configured : ILLUSTRATIVE;

	// What was typed into the demonstration form, run through the real rules.
	const typed: Record<string, string> = {};
	for (const [name, value] of Object.entries(query)) {
		if (name.startsWith("m_") && typeof value === "string") typed[name.slice(2)] = value;
	}
	const submitted = Object.values(typed).some((value) => value.trim().length > 0);
	const outcome = submitted ? evaluateFit({ specs, typed, unit: "cm" }) : null;

	const path = query.fitPath === "size" ? "size" : "measurements";
	const source = fitSource(path, typeof query.fitWho === "string" ? query.fitWho : "self");
	const age = ageAtOrder(typeof query.fitAge === "string" ? query.fitAge : "");

	return (
		<main>
			<h1>Fit fork — prototype</h1>
			<p>
				<strong>Nothing on this page writes anything.</strong> It renders the real component and
				runs the real band rules so the proposal can be looked at before it is wired into the
				order form.
			</p>

			<section>
				<h2>Where the bands are coming from</h2>
				{real ? (
					<p>
						Real rows from <code>garment_type_measurements</code> — {configured.length} of them,
						on <code>{configured[0].typeKey}</code>.
					</p>
				) : (
					<p>
						<strong>No bands are configured.</strong> <code>garment_type_measurements</code> is
						empty, so this is an illustrative set and not a proposal about anybody&apos;s body.
						The real ranges are Settings → garment types, and they are the first unanswered
						item on the founder track. <em>The fork can be built without them; it cannot be
						used.</em>
					</p>
				)}
			</section>

			{/* ── 1. The form, adult ──────────────────────────────────────────── */}
			<section>
				<h2>1 · The form as a customer meets it</h2>
				<p>
					No JavaScript, no motion, every instruction beside its field. <code>min</code> and{" "}
					<code>max</code> carry the impossible band only.
				</p>
				<form method="get">
					<FitFields
						copy={copy.order.fit}
						pieceCopy={copy.piece}
						specs={specs}
						sizes={SAMPLE_SIZES}
						audience="adult"
					/>
					<p>
						<button type="submit">Check these numbers</button>
					</p>
				</form>
			</section>

			{/* ── 2. What the rules made of it ────────────────────────────────── */}
			{outcome && (
				<section>
					<h2>2 · What the rules made of that</h2>
					<p>
						Path <code>{path}</code> · source <code>{source}</code>
						{age !== null && (
							<>
								{" "}
								· age <code>{age}</code>
							</>
						)}
					</p>

					{outcome.ok ? (
						<>
							<p>
								Accepted. {outcome.rows.filter((row) => row.warned).length} of{" "}
								{outcome.rows.length} outside plausible.
							</p>
							<table>
								<thead>
									<tr>
										<th>key</th>
										<th>stored</th>
										<th>reads back</th>
										<th>band</th>
										<th>snapshot carries</th>
									</tr>
								</thead>
								<tbody>
									{outcome.rows.map((row) => (
										<tr key={row.measurementKey}>
											<td>{row.measurementKey}</td>
											<td>
												{row.value} {MEASUREMENTS[row.measurementKey].unit}
											</td>
											<td>{fromCanonical(row.value, "cm", row.measurementKey)}</td>
											<td>{row.warned ? "unlikely — asks" : "plausible — silent"}</td>
											<td>
												label · instruction ({row.instruction.length} chars) · bands{" "}
												{row.plausibleMin}–{row.plausibleMax} / {row.impossibleMin}–
												{row.impossibleMax}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</>
					) : (
						<>
							<p>Refused, and nothing would be written.</p>
							<ul>
								{outcome.refusals.map((refusal) => (
									<li key={refusal.key}>
										<code>{refusal.kind}</code> — {fitRefusalMessage(refusal, copy.order.fit)}
									</li>
								))}
							</ul>
						</>
					)}
				</section>
			)}

			{/* ── 3. The acknowledgement pass ─────────────────────────────────── */}
			<section>
				<h2>3 · The gentle question, on their own order page</h2>
				<p>
					This is the second pass. It renders at <code>/o/&lt;token&gt;</code>, where the number
					is already behind the credential — which is why the round trip needs no cookie, no
					query string and no hidden field.
				</p>
				<FitWarnings
					copy={copy.order.fit}
					token="[the customer's token — never rendered as text]"
					warnings={
						outcome?.ok
							? outcome.rows
									.filter((row) => row.warned)
									.map((row) => ({
										id: `demo-${row.measurementKey}`,
										key: row.measurementKey,
										label: row.label,
										value: isMeasurementKey(row.measurementKey)
											? fromCanonical(row.value, "cm", row.measurementKey)
											: null,
										canonical: row.value,
										acknowledged: false,
									}))
							: [
									{
										id: "demo-chest",
										key: "chest",
										label: "Chest",
										value: 137,
										canonical: 1370,
										acknowledged: false,
									},
								]
					}
					// The harness demonstrates the markup; the real action is on the
					// order page and is the only thing that may write.
					action={async () => {
						"use server";
					}}
				/>
			</section>

			{/* ── 4. The kids variant ─────────────────────────────────────────── */}
			<section>
				<h2>4 · A children&apos;s garment type</h2>
				<p>
					One extra field, and it is a <strong>number of years</strong>. There is no name field
					and no date of birth anywhere in this component — a child is never an entity{" "}
					<em>(R13a)</em>.
				</p>
				<form method="get">
					<FitFields
						copy={copy.order.fit}
						pieceCopy={copy.piece}
						specs={specs}
						sizes={[]}
						audience="kids"
					/>
				</form>
			</section>
		</main>
	);
}

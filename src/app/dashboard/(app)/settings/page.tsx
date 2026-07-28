import { asc, eq } from "drizzle-orm";

import { fromCanonical, MEASUREMENT_KEYS, MEASUREMENTS } from "@/content/measurements";
import { getDb, schema } from "@/db/client";
import { auth, requireSession } from "@/lib/auth";

import {
	addMaker,
	removeMeasurement,
	requestReauth,
	saveGarmentType,
	saveGlobals,
	saveMeasurement,
	saveOwnership,
	toggleMaker,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * Settings.
 *
 * **Garment types and the makers list live here, not as sections of their own**
 * *(R9b, R16)*. Three rows set up once and untouched for months is the
 * definition of a setting, and top-level nav would make the dashboard look like
 * it is about garments when it is about orders.
 */
export default async function Settings({
	searchParams,
}: {
	searchParams: Promise<{ e?: string; sent?: string; saved?: string }>;
}) {
	const session = await requireSession();
	const { e, sent, saved } = await searchParams;
	const db = await getDb();

	const [globals, themeRw, makers, garmentTypes, typeMeasurements, admin, fresh] =
		await Promise.all([
			db.select().from(schema.settings).where(eq(schema.settings.id, 1)).limit(1),
			db
				.select()
				.from(schema.settingsTranslations)
				.where(eq(schema.settingsTranslations.locale, "rw"))
				.limit(1),
			db.select().from(schema.makers).orderBy(asc(schema.makers.position), asc(schema.makers.name)),
			db.select().from(schema.garmentTypes).orderBy(asc(schema.garmentTypes.position)),
			db
				.select()
				.from(schema.garmentTypeMeasurements)
				.orderBy(asc(schema.garmentTypeMeasurements.position)),
			db.select().from(schema.admin).where(eq(schema.admin.id, session.adminId)).limit(1),
			auth.hasFreshLink(),
		]);

	const settings = globals[0];
	const account = admin[0];
	const cm = (value: number, key: string) =>
		key in MEASUREMENTS
			? fromCanonical(value, "cm", key as keyof typeof MEASUREMENTS)
			: value;

	return (
		<main>
			<h1>Settings</h1>

			{e === "nest" && (
				<p role="alert">
					Those bands do not nest. Impossible has to sit outside plausible on both sides, or
					every value becomes impossible and the form looks broken.
				</p>
			)}
			{e === "bands" && <p role="alert">All four band values are needed.</p>}
			{e === "measurement" && <p role="alert">That is not a measurement the drawing knows.</p>}
			{e === "stale" && <p role="alert">That needs a fresh link. Ask for one below.</p>}
			{e === "email" && <p role="alert">The address could not be changed. It is unchanged.</p>}
			{e === "link" && <p role="alert">The link could not be sent.</p>}
			{sent && <p>A link is on its way. Open it, then come back and save.</p>}
			{saved && <p>Saved.</p>}

			{/* ── The numbers he turns ──────────────────────────────────────── */}
			<section>
				<h2>The numbers</h2>
				<form action={saveGlobals}>
					<label htmlFor="queueOffsetDays">Queue offset, in days</label>
					<input
						id="queueOffsetDays"
						name="queueOffsetDays"
						type="number"
						defaultValue={settings?.queueOffsetDays ?? 0}
					/>
					<small>
						One number, raised when he is busy; every piece updates at once. The customer sees a
						piece&rsquo;s making days plus this.
					</small>

					<label htmlFor="priorityOffsetDays">Priority offset, in days</label>
					<input
						id="priorityOffsetDays"
						name="priorityOffsetDays"
						type="number"
						defaultValue={settings?.priorityOffsetDays ?? 0}
					/>

					<label htmlFor="priorityModifier">What priority costs</label>
					<input
						id="priorityModifier"
						name="priorityModifier"
						type="number"
						defaultValue={settings?.priorityModifier ?? 0}
					/>
					<small>
						{/*
						 * **The priority option renders only while the queue offset is
						 * non-zero** *(R4, pre-build review)*. With an empty queue there is
						 * no position to buy, and offering one on a site with four pieces
						 * and no orders would be the first piece of scarcity copy on it.
						 */}
						{(settings?.queueOffsetDays ?? 0) === 0
							? "The queue offset is zero, so the priority option does not appear on the site. There is no position to sell."
							: "The queue offset is not zero, so the priority option appears on the site."}
					</small>

					<label htmlFor="designFee">The design fee</label>
					<input
						id="designFee"
						name="designFee"
						type="number"
						defaultValue={settings?.designFee ?? 0}
					/>
					<small>
						An absolute figure, credited against the total. It must sit comfortably below the
						cheapest thing he would make.
					</small>

					<label htmlFor="replyTimeDays">Reply time, in days</label>
					<input
						id="replyTimeDays"
						name="replyTimeDays"
						type="number"
						defaultValue={settings?.replyTimeDays ?? ""}
					/>
					<small>
						{/*
						 * `[X]` is an unanswered founder question and must stay visible.
						 * Empty is a real state here, not a missing one.
						 */}
						{settings?.replyTimeDays === null || settings?.replyTimeDays === undefined
							? "Unanswered. Every place this would appear renders [X] instead, deliberately — never an invented number."
							: "Used in the submission state, the In design line and the emails."}
					</small>

					<label htmlFor="collectionTheme">The collection theme</label>
					<input
						id="collectionTheme"
						name="collectionTheme"
						type="text"
						defaultValue={settings?.collectionTheme ?? ""}
					/>

					<label htmlFor="rwCollectionTheme">The collection theme, in Kinyarwanda</label>
					<input
						id="rwCollectionTheme"
						name="rwCollectionTheme"
						type="text"
						defaultValue={themeRw[0]?.collectionTheme ?? ""}
					/>

					<button type="submit">Save</button>
				</form>
			</section>

			{/* ── Makers ────────────────────────────────────────────────────── */}
			<section>
				<h2>Makers</h2>
				<p>
					The story page names and celebrates them, so this is a list with a row per person
					rather than a name typed onto each order.
				</p>
				<ul>
					{makers.map((maker) => (
						<li key={maker.id}>
							{maker.name} · {maker.active ? "in the picker" : "not in the picker"}
							<form action={toggleMaker}>
								<input type="hidden" name="makerId" value={maker.id} />
								<button type="submit">{maker.active ? "Deactivate" : "Reactivate"}</button>
							</form>
						</li>
					))}
					{makers.length === 0 && <li>None yet.</li>}
				</ul>
				<form action={addMaker}>
					<label htmlFor="maker-name">Add a maker</label>
					<input id="maker-name" name="name" type="text" required />
					<button type="submit">Add</button>
				</form>
			</section>

			{/* ── Garment types ─────────────────────────────────────────────── */}
			<section>
				<h2>Garment types</h2>

				{garmentTypes.map((type) => {
					const rows = typeMeasurements.filter((row) => row.garmentTypeId === type.id);
					const unused = MEASUREMENT_KEYS.filter(
						(key) => !rows.some((row) => row.measurementKey === key),
					);

					return (
						<article key={type.id}>
							<h3>
								{type.name} · {type.audience}
							</h3>

							<form action={saveGarmentType}>
								<input type="hidden" name="garmentTypeId" value={type.id} />
								<label htmlFor={`key-${type.id}`}>Key</label>
								<input id={`key-${type.id}`} name="key" type="text" defaultValue={type.key} />
								<label htmlFor={`name-${type.id}`}>Name</label>
								<input id={`name-${type.id}`} name="name" type="text" defaultValue={type.name} />
								<label htmlFor={`audience-${type.id}`}>Cut for</label>
								<select
									id={`audience-${type.id}`}
									name="audience"
									defaultValue={type.audience}
								>
									<option value="adult">adults</option>
									<option value="kids">kids</option>
								</select>

								{/*
								 * **A reference, not a file bound to the type** *(R13c)*, so
								 * two kids types point at one drawing rather than two
								 * identical SVGs that drift the moment either is edited.
								 */}
								<label htmlFor={`diagram-${type.id}`}>Which drawing</label>
								<input
									id={`diagram-${type.id}`}
									name="diagramKey"
									type="text"
									defaultValue={type.diagramKey}
								/>

								<label htmlFor={`agemin-${type.id}`}>Age from</label>
								<input
									id={`agemin-${type.id}`}
									name="ageMinYears"
									type="number"
									defaultValue={type.ageMinYears ?? ""}
								/>
								<label htmlFor={`agemax-${type.id}`}>Age to</label>
								<input
									id={`agemax-${type.id}`}
									name="ageMaxYears"
									type="number"
									defaultValue={type.ageMaxYears ?? ""}
								/>

								<button type="submit">Save</button>
							</form>

							<h4>Measurements and their bands</h4>
							<p>
								In centimetres. Inside plausible passes without comment; between plausible
								and impossible asks a question that can be acknowledged; outside impossible
								is the only thing that refuses.
								{type.audience === "kids" && " A kids type leads with height."}
							</p>

							<ul>
								{rows.map((row) => (
									<li key={row.id}>
										<form action={saveMeasurement}>
											<input type="hidden" name="garmentTypeId" value={type.id} />
											<input type="hidden" name="measurementKey" value={row.measurementKey} />
											<strong>
												{row.measurementKey in MEASUREMENTS
													? MEASUREMENTS[row.measurementKey as keyof typeof MEASUREMENTS]
															.label
													: row.measurementKey}
											</strong>
											<label htmlFor={`pos-${row.id}`}>Order</label>
											<input
												id={`pos-${row.id}`}
												name="position"
												type="number"
												defaultValue={row.position}
											/>
											<label>
												<input type="checkbox" name="required" defaultChecked={row.required} />{" "}
												Required
											</label>
											<label htmlFor={`imin-${row.id}`}>Impossible below</label>
											<input
												id={`imin-${row.id}`}
												name="impossibleMin"
												type="number"
												step="0.1"
												defaultValue={cm(row.impossibleMin, row.measurementKey)}
											/>
											<label htmlFor={`pmin-${row.id}`}>Plausible from</label>
											<input
												id={`pmin-${row.id}`}
												name="plausibleMin"
												type="number"
												step="0.1"
												defaultValue={cm(row.plausibleMin, row.measurementKey)}
											/>
											<label htmlFor={`pmax-${row.id}`}>Plausible to</label>
											<input
												id={`pmax-${row.id}`}
												name="plausibleMax"
												type="number"
												step="0.1"
												defaultValue={cm(row.plausibleMax, row.measurementKey)}
											/>
											<label htmlFor={`imax-${row.id}`}>Impossible above</label>
											<input
												id={`imax-${row.id}`}
												name="impossibleMax"
												type="number"
												step="0.1"
												defaultValue={cm(row.impossibleMax, row.measurementKey)}
											/>
											<button type="submit">Save</button>
										</form>
										<form action={removeMeasurement}>
											<input type="hidden" name="id" value={row.id} />
											<button type="submit">Remove</button>
										</form>
									</li>
								))}
								{rows.length === 0 && <li>None yet.</li>}
							</ul>

							{unused.length > 0 && (
								<form action={saveMeasurement}>
									<input type="hidden" name="garmentTypeId" value={type.id} />
									{/*
									 * He picks from the code's list. **He cannot invent a
									 * measurement with nowhere to render on the drawing**
									 * *(R7)*.
									 */}
									<label htmlFor={`add-${type.id}`}>Add a measurement</label>
									<select id={`add-${type.id}`} name="measurementKey">
										{unused.map((key) => (
											<option key={key} value={key}>
												{MEASUREMENTS[key].label}
											</option>
										))}
									</select>
									<input name="plausibleMin" type="number" step="0.1" placeholder="plausible from" required />
									<input name="plausibleMax" type="number" step="0.1" placeholder="plausible to" required />
									<input name="impossibleMin" type="number" step="0.1" placeholder="impossible below" required />
									<input name="impossibleMax" type="number" step="0.1" placeholder="impossible above" required />
									<button type="submit">Add</button>
								</form>
							)}
						</article>
					);
				})}

				<h3>A new garment type</h3>
				<form action={saveGarmentType}>
					<label htmlFor="new-key">Key</label>
					<input id="new-key" name="key" type="text" placeholder="bucket-hat" required />
					<label htmlFor="new-name">Name</label>
					<input id="new-name" name="name" type="text" placeholder="Bucket hat" required />
					<label htmlFor="new-audience">Cut for</label>
					<select id="new-audience" name="audience" defaultValue="adult">
						<option value="adult">adults</option>
						<option value="kids">kids</option>
					</select>
					<label htmlFor="new-diagram">Which drawing</label>
					<input id="new-diagram" name="diagramKey" type="text" placeholder="bucket-hat" />
					<button type="submit">Create it</button>
				</form>
			</section>

			{/* ── The account ───────────────────────────────────────────────── */}
			<section>
				<h2>The account</h2>
				<p>
					{/*
					 * **Re-auth defends ownership, not actions** *(R12b)*. Changing
					 * either address is the one move that converts temporary access into
					 * permanent ownership; confirming a price is not, and does not step
					 * up.
					 */}
					Changing either address needs a fresh link, every time. Nothing else on this screen
					does.
				</p>

				<form action={requestReauth}>
					<button type="submit">Send me a link</button>
				</form>

				<form action={saveOwnership}>
					<label htmlFor="admin-email">The login address</label>
					<input
						id="admin-email"
						name="email"
						type="email"
						defaultValue={account?.email ?? ""}
					/>
					<small>Not the address printed on the site. This one carries its own 2FA.</small>

					<label htmlFor="recovery-email">Where recovery goes</label>
					<input
						id="recovery-email"
						name="recoveryEmail"
						type="email"
						defaultValue={account?.recoveryEmail ?? ""}
					/>

					<button type="submit" disabled={!fresh}>
						{fresh ? "Save" : "Open a fresh link first"}
					</button>
				</form>

				<p>
					Sessions issued before{" "}
					{account?.sessionsValidAfter.toISOString().slice(0, 16).replace("T", " ")} are dead.
					Sign out everywhere moves that line to now, and it is the first thing in the incident
					plan.
				</p>
			</section>
		</main>
	);
}

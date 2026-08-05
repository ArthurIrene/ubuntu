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
			{sent && <p className="notice">A link is on its way. Open it, then come back and save.</p>}
			{saved && <p className="notice notice-quiet">Saved.</p>}

			{/* ── The numbers he turns ──────────────────────────────────────── */}
			<section className="panel">
				<h2>The numbers</h2>
				<form action={saveGlobals} className="fields">
					<div>
						<label htmlFor="queueOffsetDays">Queue offset, in days</label>
						<input
							id="queueOffsetDays"
							name="queueOffsetDays"
							type="number"
							defaultValue={settings?.queueOffsetDays ?? 0}
							className="max-w-40"
						/>
						<small className="mt-1">
							One number, raised when he is busy; every piece updates at once. The customer sees
							a piece&rsquo;s making days plus this.
						</small>
					</div>

					{/*
					 * The two halves of priority, side by side, because they are one
					 * decision: **what it buys is a position in the queue, never speed**
					 * *(R4)*, and what it costs is an ordinary modifier.
					 */}
					<div className="fields-row max-w-lg">
						<div>
							<label htmlFor="priorityOffsetDays">Priority offset, in days</label>
							<input
								id="priorityOffsetDays"
								name="priorityOffsetDays"
								type="number"
								defaultValue={settings?.priorityOffsetDays ?? 0}
							/>
						</div>

						<div>
							<label htmlFor="priorityModifier">What priority costs</label>
							<input
								id="priorityModifier"
								name="priorityModifier"
								type="number"
								defaultValue={settings?.priorityModifier ?? 0}
							/>
						</div>
					</div>

					{/*
					 * Whether the option is on the site at all, stated as its own line
					 * rather than as a note under a field — it is a consequence of the
					 * queue offset above, and it is the sentence that stops him
					 * wondering why the option is missing.
					 */}
					<p className="inset text-sm">
						{/*
						 * **The priority option renders only while the queue offset is
						 * non-zero** *(R4, pre-build review)*. With an empty queue there is
						 * no position to buy, and offering one on a site with four pieces
						 * and no orders would be the first piece of scarcity copy on it.
						 */}
						{(settings?.queueOffsetDays ?? 0) === 0
							? "The queue offset is zero, so the priority option does not appear on the site. There is no position to sell."
							: "The queue offset is not zero, so the priority option appears on the site."}
					</p>

					{/*
					 * **The commission design fee** *(R6)* — an absolute figure, never a
					 * percentage and never called a deposit. First on the founder track
					 * with the bands below, which is why both are on this screen.
					 */}
					<div>
						<label htmlFor="designFee">The design fee</label>
						<input
							id="designFee"
							name="designFee"
							type="number"
							defaultValue={settings?.designFee ?? 0}
							className="max-w-40"
						/>
						<small className="mt-1">
							An absolute figure, credited against the total. It must sit comfortably below the
							cheapest thing he would make.
						</small>
					</div>

					<div>
						<label htmlFor="replyTimeDays">Reply time, in days</label>
						<input
							id="replyTimeDays"
							name="replyTimeDays"
							type="number"
							defaultValue={settings?.replyTimeDays ?? ""}
							className="max-w-40"
						/>
						<small className="mt-1">
							{/*
							 * `[X]` is an unanswered founder question and must stay visible.
							 * Empty is a real state here, not a missing one.
							 */}
							{settings?.replyTimeDays === null || settings?.replyTimeDays === undefined
								? "Unanswered. Every place this would appear renders [X] instead, deliberately — never an invented number."
								: "Used in the submission state, the In design line and the emails."}
						</small>
					</div>

					{/* English canonical, and the translation directly beneath it —
					    the one pairing on this screen where seeing both at once is the
					    point. */}
					<div className="fields-row">
						<div>
							<label htmlFor="collectionTheme">The collection theme</label>
							<input
								id="collectionTheme"
								name="collectionTheme"
								type="text"
								defaultValue={settings?.collectionTheme ?? ""}
							/>
						</div>

						<div>
							<label htmlFor="rwCollectionTheme">The collection theme, in Kinyarwanda</label>
							<input
								id="rwCollectionTheme"
								name="rwCollectionTheme"
								type="text"
								defaultValue={themeRw[0]?.collectionTheme ?? ""}
							/>
						</div>
					</div>

					<div className="form-actions">
						<button type="submit" className="btn-primary">
							Save
						</button>
					</div>
				</form>
			</section>

			{/* ── Makers ────────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>Makers</h2>
				<p className="meta mb-3">
					The story page names and celebrates them, so this is a list with a row per person
					rather than a name typed onto each order.
				</p>
				<ul className="rows">
					{makers.map((maker) => (
						<li key={maker.id}>
							<span className="font-medium">{maker.name}</span>
							{/* Someone who has stopped working with him is deactivated,
							    never deleted — the orders they made still point here. */}
							<span className="tag">
								{maker.active ? "in the picker" : "not in the picker"}
							</span>
							<form action={toggleMaker} className="row-end">
								<input type="hidden" name="makerId" value={maker.id} />
								<button type="submit" className="btn-small">
									{maker.active ? "Deactivate" : "Reactivate"}
								</button>
							</form>
						</li>
					))}
					{makers.length === 0 && <li className="meta">None yet.</li>}
				</ul>
				<form action={addMaker} className="mt-5 flex flex-wrap items-end gap-2">
					<div className="min-w-48 flex-1">
						<label htmlFor="maker-name">Add a maker</label>
						<input id="maker-name" name="name" type="text" required />
					</div>
					<button type="submit">Add</button>
				</form>
			</section>

			{/* ── Garment types ─────────────────────────────────────────────── */}
			<h2 className="mt-8 mb-3">Garment types</h2>

			{garmentTypes.map((type) => {
				const rows = typeMeasurements.filter((row) => row.garmentTypeId === type.id);
				const unused = MEASUREMENT_KEYS.filter(
					(key) => !rows.some((row) => row.measurementKey === key),
				);

				return (
					/*
					 * One panel per garment type, rather than one panel holding all of
					 * them: a type is a shape he cuts, its measurement list is the fit
					 * form for every piece of that shape, and the two belong to each
					 * other on the screen the way they do in the schema.
					 */
					<article key={type.id} className="panel">
						<h3 className="flex flex-wrap items-center gap-2">
							{type.name} <span className="tag">{type.audience}</span>
						</h3>

						<form action={saveGarmentType} className="fields mt-3">
							<input type="hidden" name="garmentTypeId" value={type.id} />

							<div className="fields-row" style={{ "--cols": 3 } as React.CSSProperties}>
								<div>
									<label htmlFor={`key-${type.id}`}>Key</label>
									<input id={`key-${type.id}`} name="key" type="text" defaultValue={type.key} />
								</div>

								<div>
									<label htmlFor={`name-${type.id}`}>Name</label>
									<input
										id={`name-${type.id}`}
										name="name"
										type="text"
										defaultValue={type.name}
									/>
								</div>

								<div>
									<label htmlFor={`audience-${type.id}`}>Cut for</label>
									<select
										id={`audience-${type.id}`}
										name="audience"
										defaultValue={type.audience}
									>
										<option value="adult">adults</option>
										<option value="kids">kids</option>
									</select>
								</div>
							</div>

							<div className="fields-row" style={{ "--cols": 3 } as React.CSSProperties}>
								{/*
								 * **A reference, not a file bound to the type** *(R13c)*, so
								 * two kids types point at one drawing rather than two
								 * identical SVGs that drift the moment either is edited.
								 */}
								<div>
									<label htmlFor={`diagram-${type.id}`}>Which drawing</label>
									<input
										id={`diagram-${type.id}`}
										name="diagramKey"
										type="text"
										defaultValue={type.diagramKey}
									/>
								</div>

								{/* Kids types only, and the pair reads as one range. */}
								<div>
									<label htmlFor={`agemin-${type.id}`}>Age from</label>
									<input
										id={`agemin-${type.id}`}
										name="ageMinYears"
										type="number"
										defaultValue={type.ageMinYears ?? ""}
									/>
								</div>

								<div>
									<label htmlFor={`agemax-${type.id}`}>Age to</label>
									<input
										id={`agemax-${type.id}`}
										name="ageMaxYears"
										type="number"
										defaultValue={type.ageMaxYears ?? ""}
									/>
								</div>
							</div>

							<div className="form-actions">
								<button type="submit" className="btn-primary">
									Save
								</button>
							</div>
						</form>

						<h4 className="mt-7">Measurements and their bands</h4>
						<p className="meta mt-1 mb-3">
							In centimetres. Inside plausible passes without comment; between plausible
							and impossible asks a question that can be acknowledged; outside impossible
							is the only thing that refuses.
							{type.audience === "kids" && " A kids type leads with height."}
						</p>

							{/*
							 * **The bands are two nested ranges, which is three bands**
							 * *(R7)*, and the layout is what says so. The four numbers run
							 * left to right in the order they run on a body — impossible
							 * below, plausible from, plausible to, impossible above — and
							 * the two that pass silently are held together in a lighter
							 * block with the thread across the top. Outside that block is
							 * the band that asks a question; outside the row is the only
							 * thing that refuses.
							 *
							 * The nesting is enforced twice already (the action and a
							 * CHECK), so this is not validation. It is the picture that
							 * stops him entering them the wrong way round in the first
							 * place — the failure that looks most like the form being
							 * broken and least like a number being wrong.
							 */}
							<ul className="rows">
								{rows.map((row) => (
									<li key={row.id} className="stacked band-row">
										<form action={saveMeasurement}>
											<input type="hidden" name="garmentTypeId" value={type.id} />
											<input type="hidden" name="measurementKey" value={row.measurementKey} />

											<div className="band-head">
												<strong>
													{row.measurementKey in MEASUREMENTS
														? MEASUREMENTS[row.measurementKey as keyof typeof MEASUREMENTS]
																.label
														: row.measurementKey}
												</strong>

												<div className="band-head-controls">
													<div className="band-order">
														<label htmlFor={`pos-${row.id}`}>Order</label>
														<input
															id={`pos-${row.id}`}
															name="position"
															type="number"
															defaultValue={row.position}
														/>
													</div>
													<label>
														<input
															type="checkbox"
															name="required"
															defaultChecked={row.required}
														/>{" "}
														Required
													</label>
												</div>
											</div>

											<div className="bands">
												<div>
													<label htmlFor={`imin-${row.id}`}>Impossible below</label>
													<input
														id={`imin-${row.id}`}
														name="impossibleMin"
														type="number"
														step="0.1"
														defaultValue={cm(row.impossibleMin, row.measurementKey)}
													/>
												</div>

												<div className="band-plausible">
													<div>
														<label htmlFor={`pmin-${row.id}`}>Plausible from</label>
														<input
															id={`pmin-${row.id}`}
															name="plausibleMin"
															type="number"
															step="0.1"
															defaultValue={cm(row.plausibleMin, row.measurementKey)}
														/>
													</div>
													<div>
														<label htmlFor={`pmax-${row.id}`}>Plausible to</label>
														<input
															id={`pmax-${row.id}`}
															name="plausibleMax"
															type="number"
															step="0.1"
															defaultValue={cm(row.plausibleMax, row.measurementKey)}
														/>
													</div>
												</div>

												<div>
													<label htmlFor={`imax-${row.id}`}>Impossible above</label>
													<input
														id={`imax-${row.id}`}
														name="impossibleMax"
														type="number"
														step="0.1"
														defaultValue={cm(row.impossibleMax, row.measurementKey)}
													/>
												</div>
											</div>

											<div className="form-actions">
												<button type="submit" className="btn-primary btn-small">
													Save
												</button>
											</div>
										</form>

										{/* Its own form, so it is never a second submit button
										    inside the one that saves — which is also why it cannot
										    sit inside the row above it, and why the stylesheet
										    puts it at the end of the row rather than the markup. */}
										<form action={removeMeasurement} className="band-remove mt-2">
											<input type="hidden" name="id" value={row.id} />
											<button type="submit" className="btn-small btn-ending">
												Remove
											</button>
										</form>
									</li>
								))}
								{rows.length === 0 && <li className="meta">None yet.</li>}
							</ul>

						{unused.length > 0 && (
							<form action={saveMeasurement} className="inset mt-4">
								<input type="hidden" name="garmentTypeId" value={type.id} />
								{/*
								 * He picks from the code's list. **He cannot invent a
								 * measurement with nowhere to render on the drawing**
								 * *(R7)*.
								 */}
								<div className="max-w-64">
									<label htmlFor={`add-${type.id}`}>Add a measurement</label>
									<select id={`add-${type.id}`} name="measurementKey">
										{unused.map((key) => (
											<option key={key} value={key}>
												{MEASUREMENTS[key].label}
											</option>
										))}
									</select>
								</div>

								{/* The same four columns as the rows above, in the same
								    order, so adding one is filling in the shape he has
								    just been reading. */}
								<div className="bands mt-3">
									<input
										name="impossibleMin"
										type="number"
										step="0.1"
										placeholder="impossible below"
										required
									/>
									<div className="band-plausible">
										<input
											name="plausibleMin"
											type="number"
											step="0.1"
											placeholder="plausible from"
											required
										/>
										<input
											name="plausibleMax"
											type="number"
											step="0.1"
											placeholder="plausible to"
											required
										/>
									</div>
									<input
										name="impossibleMax"
										type="number"
										step="0.1"
										placeholder="impossible above"
										required
									/>
								</div>

								<div className="form-actions">
									<button type="submit" className="btn-small">
										Add
									</button>
								</div>
							</form>
						)}
					</article>
				);
			})}

			<section className="panel">
				<h3>A new garment type</h3>
				<form action={saveGarmentType} className="fields mt-3">
					<div className="fields-row" style={{ "--cols": 2 } as React.CSSProperties}>
						<div>
							<label htmlFor="new-key">Key</label>
							<input id="new-key" name="key" type="text" placeholder="bucket-hat" required />
						</div>
						<div>
							<label htmlFor="new-name">Name</label>
							<input id="new-name" name="name" type="text" placeholder="Bucket hat" required />
						</div>
						<div>
							<label htmlFor="new-audience">Cut for</label>
							<select id="new-audience" name="audience" defaultValue="adult">
								<option value="adult">adults</option>
								<option value="kids">kids</option>
							</select>
						</div>
						<div>
							<label htmlFor="new-diagram">Which drawing</label>
							<input id="new-diagram" name="diagramKey" type="text" placeholder="bucket-hat" />
						</div>
					</div>
					<div className="form-actions">
						<button type="submit" className="btn-primary">
							Create it
						</button>
					</div>
				</form>
			</section>

			{/* ── The account ───────────────────────────────────────────────── */}
			<section className="panel">
				<h2>The account</h2>
				<p className="meta mb-3">
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

				<form action={saveOwnership} className="fields mt-5">
					<div>
						<label htmlFor="admin-email">The login address</label>
						<input
							id="admin-email"
							name="email"
							type="email"
							defaultValue={account?.email ?? ""}
						/>
						<small className="mt-1">
							Not the address printed on the site. This one carries its own 2FA.
						</small>
					</div>

					<div>
						<label htmlFor="recovery-email">Where recovery goes</label>
						<input
							id="recovery-email"
							name="recoveryEmail"
							type="email"
							defaultValue={account?.recoveryEmail ?? ""}
						/>
					</div>

					{/* The button carries the gate in its own words rather than being
					    quietly dead. */}
					<div className="form-actions">
						<button type="submit" className="btn-primary" disabled={!fresh}>
							{fresh ? "Save" : "Open a fresh link first"}
						</button>
					</div>
				</form>

				<p className="meta mt-5 border-t border-(--canvas-edge) pt-4">
					Sessions issued before{" "}
					{account?.sessionsValidAfter.toISOString().slice(0, 16).replace("T", " ")} are dead.
					Sign out everywhere moves that line to now, and it is the first thing in the incident
					plan.
				</p>
			</section>
		</main>
	);
}

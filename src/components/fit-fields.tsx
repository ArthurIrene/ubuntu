import { fill } from "@/content";
import type { Content } from "@/content/en";
import { MEASUREMENTS, isMeasurementKey } from "@/content/measurements";
import { nativeBounds, type BandSpec } from "@/lib/fit";

// The fit fork, bare.
//
// **The form completes with no JavaScript, no motion and a screen reader**
// *(R7)*. Nothing in this file is a client component, nothing has an event
// handler, and the only validation the browser does is HTML's own constraint
// validation — which is markup, not script.
//
// **The live diagram is Phase 6 and is never the input mechanism.** When it
// arrives it renders beside these fields and reads their values; delete it and
// the form still works. That is the difference between a beautiful idea and an
// order that cannot be placed.
//
// Unstyled. Phase 5 owns every dimension of how this looks.

/** What a measurement looks like on screen, before anyone has typed in it. */
export interface FitFieldSpec extends BandSpec {
	/** True where the customer's earlier answer is being shown back to them. */
	previous?: string;
}

/**
 * The fork itself, and both paths beneath it.
 *
 * **Both paths render, always.** Hiding one behind the radio would need
 * JavaScript, and a screen reader user tabbing through a form should meet the
 * whole of it rather than a shape that changes under them. The radio decides
 * which one is *read* on the server; the other is ignored whatever is in it.
 *
 * *The cost, named: a customer can fill in both.* That is a smaller cost than a
 * form that only works with a bundle loaded, and the server takes exactly one.
 */
export function FitFields({
	copy,
	pieceCopy,
	specs,
	sizes,
	audience,
	refused = [],
	unit = "cm",
}: {
	copy: Content["order"]["fit"];
	pieceCopy: Content["piece"];
	/** The garment type's measurement list, with the bands in force *(R7)*. */
	specs: FitFieldSpec[];
	/** The sizes he offers on this piece, for the standard path. */
	sizes: { key: string; label: string }[];
	/** `kids` is the only audience that asks an age *(R13a)*. */
	audience: "adult" | "kids";
	/**
	 * Measurement keys the server just refused — **keys only, never the numbers**
	 * *(R7, R11)*. They come back through the URL, and a measurement in a URL
	 * lands in server logs, browser history and every Referer the page emits.
	 */
	refused?: string[];
	unit?: "cm" | "in";
}) {
	// Nothing configured to ask for, and nothing invented to fill the gap. The
	// caller renders `order.form.fitLater` instead — he settles the numbers by
	// hand, which is a path R7 already describes.
	if (specs.length === 0 && sizes.length === 0) return null;

	const canMeasure = specs.length > 0;
	const canSize = sizes.length > 0;

	return (
		<fieldset>
			<legend>{pieceCopy.fitForkHeading}</legend>

			{/*
			 * The fork. **Measurements are the urged path and therefore taught; a
			 * size is a real choice, not a fallback** *(R7)* — so the two prompts
			 * are warm and neither apologises for the other.
			 */}
			<fieldset>
				<legend>{copy.pathHeading}</legend>

				{canMeasure && (
					<p>
						<input
							id="fit-path-measurements"
							name="fitPath"
							type="radio"
							value="measurements"
							defaultChecked
						/>
						<label htmlFor="fit-path-measurements">{copy.pathMeasurements}</label>
						<span>{pieceCopy.fitForkMeasurements}</span>
					</p>
				)}

				{canSize && (
					<p>
						<input
							id="fit-path-size"
							name="fitPath"
							type="radio"
							value="size"
							defaultChecked={!canMeasure}
						/>
						<label htmlFor="fit-path-size">{copy.pathSize}</label>
						<span>{pieceCopy.fitForkSize}</span>
					</p>
				)}
			</fieldset>

			{canMeasure && (
				<>
					{/*
					 * **This answer decides liability** *(R7, R13a)*, which is why it is
					 * a recorded fact and not an inference. `guardian` is the customer
					 * measuring someone else — a gift, or a child — and reusing `self`
					 * for it gets liability right and the record wrong.
					 */}
					<fieldset>
						<legend>{copy.whoHeading}</legend>
						<p>
							<input id="fit-who-self" name="fitWho" type="radio" value="self" defaultChecked />
							<label htmlFor="fit-who-self">{copy.whoSelf}</label>
						</p>
						<p>
							<input id="fit-who-guardian" name="fitWho" type="radio" value="guardian" />
							<label htmlFor="fit-who-guardian">{copy.whoGuardian}</label>
						</p>
						<p>
							<input id="fit-who-tailor" name="fitWho" type="radio" value="tailor" />
							<label htmlFor="fit-who-tailor">{copy.whoTailor}</label>
						</p>
					</fieldset>

					{/*
					 * **A number of years, never a date of birth** *(R13a)*. Asked only
					 * on a children's garment type, because that is the only place an
					 * age is read against anything — and the note says out loud what is
					 * not being kept, which a parent typing it is owed.
					 */}
					{audience === "kids" && (
						<p>
							<label htmlFor="fit-age">{copy.age}</label>
							<input
								id="fit-age"
								name="fitAge"
								type="number"
								min={0}
								max={18}
								step={1}
								inputMode="numeric"
								aria-describedby="fit-age-note"
							/>
							<span id="fit-age-note">{copy.ageNote}</span>
						</p>
					)}

					{[...specs]
						.sort((a, b) => a.position - b.position)
						.map((spec) => (
							<Measurement
								key={spec.measurementKey}
								spec={spec}
								copy={copy}
								unit={unit}
								refused={refused.includes(spec.measurementKey)}
							/>
						))}
				</>
			)}

			{canSize && (
				<fieldset>
					<legend>{copy.sizeHeading}</legend>
					{sizes.map((size, index) => (
						<p key={size.key}>
							<input
								id={`fit-size-${size.key}`}
								name="fitSize"
								type="radio"
								value={size.key}
								defaultChecked={index === 0}
							/>
							<label htmlFor={`fit-size-${size.key}`}>{size.label}</label>
						</p>
					))}
					{/*
					 * **No suggested size from height and weight** *(R7)*. It would
					 * probably lift conversion and it competes with *he checks every
					 * order himself* — quietly assuming the liability the policy just
					 * spent three clauses distributing. They are recorded beside the
					 * chosen size so he can do the checking, and nothing computes.
					 */}
					<p>{copy.sizeNote}</p>
					<StandardCheck copy={copy} specs={specs} unit={unit} />
				</fieldset>
			)}
		</fieldset>
	);
}

/**
 * One measurement, with **the instruction beside the field at the moment of
 * entry — never in a tooltip** *(R7)*.
 *
 * That sentence is what the policy's shared-liability clause turns on, and it is
 * snapshotted onto the fit record exactly as rendered here. A tooltip is a
 * sentence that a phone cannot show and a screen reader may never reach; this is
 * the difference between having told someone and having published something.
 */
function Measurement({
	spec,
	copy,
	unit,
	refused = false,
}: {
	spec: FitFieldSpec;
	copy: Content["order"]["fit"];
	unit: "cm" | "in";
	/** The server refused this one. The sentence renders beside the input. */
	refused?: boolean;
}) {
	const key = spec.measurementKey;
	if (!isMeasurementKey(key)) return null;

	const definition = MEASUREMENTS[key];
	const bounds = nativeBounds(spec, unit);
	const suffix = definition.unit === "g" ? copy.unitKg : unit === "cm" ? copy.unitCm : "in";

	return (
		<p>
			<label htmlFor={`m-${key}`}>{definition.label}</label>
			{/*
			 * `min` and `max` carry **the impossible band and only it**. HTML refuses
			 * out-of-range before a request is made, with no JavaScript, and a screen
			 * reader announces the range — so the one band that refuses is refused
			 * natively. The unlikely band gets no attribute: a browser cannot ask a
			 * question, and turning *unusual* into *invalid* is the hard block on a
			 * real body that R7 refused.
			 *
			 * The server re-checks both regardless. This is a convenience; the write
			 * path is the rule.
			 */}
			<input
				id={`m-${key}`}
				name={`m_${key}`}
				type="number"
				inputMode="decimal"
				defaultValue={spec.previous}
				required={spec.required}
				min={bounds?.min}
				max={bounds?.max}
				step={bounds?.step}
				aria-describedby={`m-${key}-how`}
			/>
			<span>{suffix}</span>
			<span id={`m-${key}-how`}>{definition.instruction}</span>
			{/*
			 * **The impossible sentence, and never the implausible one.** It is aimed
			 * at the typing — a slip of the finger, or the wrong unit — and never at
			 * the body. The band that welcomes an unusual body asks its question on
			 * the order page, where the number is already safe behind the token.
			 */}
			{refused && <span role="alert">{copy.impossible}</span>}
		</p>
	);
}

/**
 * Height and weight beside a chosen size — **his check, not a computation**
 * *(R7)*.
 *
 * They are ordinary measurement rows on the fit record and they redact with
 * everything else. They are asked for here because *he checks every order
 * himself against your height and weight before anything is cut*, and that
 * sentence is on the public page.
 */
function StandardCheck({
	copy,
	specs,
	unit,
}: {
	copy: Content["order"]["fit"];
	specs: FitFieldSpec[];
	unit: "cm" | "in";
}) {
	// The bands he has set for this garment type, where he has set them. Height
	// and weight are ordinary measurements and may or may not be on its list.
	const find = (key: string) => specs.find((spec) => spec.measurementKey === key);

	return (
		<>
			{(["height", "weight"] as const).map((key) => {
				const spec = find(key) ?? {
					measurementKey: key,
					required: true,
					position: key === "height" ? 90 : 91,
					// No configured band means no native bound and no warning — the
					// column is nullable for exactly this, and an invented range would
					// be a guardrail nobody decided on.
					plausibleMin: Number.NEGATIVE_INFINITY,
					plausibleMax: Number.POSITIVE_INFINITY,
					impossibleMin: Number.NEGATIVE_INFINITY,
					impossibleMax: Number.POSITIVE_INFINITY,
				};
				return <Measurement key={key} spec={spec} copy={copy} unit={unit} />;
			})}
		</>
	);
}

/**
 * The gentle question, asked on the customer's own order page *(R7)*.
 *
 * **This is the second half of the three-band rule, and where it lives is the
 * proposal's one real decision.** It is asked here rather than in the order form
 * because a soft guardrail needs a round trip, and a round trip needs the number
 * to survive it — and the only place a measurement is allowed to survive
 * anything is behind the token. Not a URL, not a cookie, not a hidden field
 * bounced off a stranger's browser.
 *
 * **The acknowledgement is recorded, not merely accepted.** An unacknowledged
 * warning and an acknowledged one are different facts in a dispute, and this is
 * a separate deliberate act rather than a checkbox ticked in the same breath as
 * the number — which makes it better evidence than the inline version would be.
 */
export function FitWarnings({
	copy,
	token,
	warnings,
	action,
}: {
	copy: Content["order"]["fit"];
	token: string;
	warnings: {
		id: string;
		key: string;
		label: string;
		/** As they read it, in their own unit. */
		value: number | null;
		/** As stored. **The acknowledgement is bound to this**, not to the label. */
		canonical: number | null;
		acknowledged: boolean;
	}[];
	action: (form: FormData) => void | Promise<void>;
}) {
	const open = warnings.filter((warning) => !warning.acknowledged);
	if (open.length === 0) return null;

	return (
		<section>
			<h2>{copy.checkHeading}</h2>
			<p>{copy.checkIntro}</p>

			{open.map((warning) => (
				<form key={warning.id} action={action}>
					{/* The credential, carried back so the write can be checked against
					    it. Never rendered, never logged. */}
					<input type="hidden" name="token" value={token} />
					{/*
					 * **Bound to the specific value being acknowledged**, not to the
					 * measurement's name. The row id says *this record*, and the
					 * canonical integer says *this number* — so an acknowledgement
					 * cannot carry over onto a different number that happens to share a
					 * label, and a fit record entered later (records append, never
					 * overwrite) starts unacknowledged as it should.
					 */}
					<input type="hidden" name="measurementId" value={warning.id} />
					<input type="hidden" name="canonical" value={warning.canonical ?? ""} />

					<p>
						{warning.label}
						{warning.value !== null && `: ${warning.value}`}
					</p>
					{/*
					 * **The implausible sentence, never the impossible one.** This band
					 * welcomes an unusual body and says we will build to it; the other
					 * says a number looks like a slip. They must not blur.
					 */}
					<p>{copy.implausible}</p>
					<button type="submit">{copy.acknowledge}</button>
				</form>
			))}
		</section>
	);
}

/** A refusal, as a sentence naming the field it is about. */
export function fitRefusalMessage(
	refusal: { kind: "impossible" | "missing" | "unreadable"; label: string },
	copy: Content["order"]["fit"],
): string {
	// The impossible sentence names no field: it is aimed at the typing, and it
	// is already rendered beside the input that carries it.
	if (refusal.kind === "impossible") return copy.impossible;
	return fill(refusal.kind === "missing" ? copy.missing : copy.unreadable, {
		label: refusal.label,
	});
}

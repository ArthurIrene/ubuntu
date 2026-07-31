import type { Translation } from "./en";

// The founder has written no Kinyarwanda yet, so every value is null and the
// resolver falls back to English. As he writes, values here replace the
// fallback one key at a time. The keys are required — a new English string
// cannot be forgotten here, only deliberately left null.
//
// **This file being all nulls is what a reservation looks like.** `/rw` is built
// and walkable from day one, `noindex` and unlinked until the flip bar clears:
// shell complete · the four window-display pieces translated · two Kinyarwanda
// readers who are not him. There is no completeness meter, by decision — three
// named things with four pieces behind them are checked by eye *(R9b, R14)*.
//
// Three strings need him rather than us, and are marked below where they sit.
export const rw: Translation = {
	title: null,
	wordmark: null,
	line: null,
	handles: null,

	nav: {
		// Written expecting Kinyarwanda to run about 30% longer than the English.
		collection: null,
		commissions: null,
		making: null,
		story: null,
		label: null,
	},

	footer: {
		wordmark: null,
		collection: null,
		commissions: null,
		making: null,
		story: null,
		contact: null,
		policies: null,
		instagram: null,
		tiktok: null,
		// **His call, item 7b.** Keep the Nguni maxim and name it as Nguni, or
		// carry a Rwandan expression alongside it. No Kinyarwanda proverb has been
		// invented to fill the gap.
		maxim: null,
		maximGloss: null,
		place: null,
		rights: null,
	},

	home: {
		title: null,
		hero: null,
		heroButton: null,
		whoWeAreHeading: null,
		whoWeAre: null,
		collectionKicker: null,
		collectionTheme: null,
		bridge: null,
		windowEmpty: null,
		collectionDoor: null,
		ritualHeading: null,
		ritual: null,
		ritualClose: null,
		ritualDoor: null,
		makingHeading: null,
		makingCondensed: null,
		makingDoor: null,
		closingHeading: null,
		closing: null,
		commissionsDoor: null,
		storyDoor: null,
	},

	collection: {
		title: null,
		heading: null,
		kicker: null,
		bridge: null,
		empty: null,
	},

	piece: {
		// **His call, item 7a.** Does `Ask for this piece` have a Kinyarwanda form,
		// or is it a brand mark that stays English? It is the most important string
		// on the site and only he can judge whether the translation is as good.
		orderButton: null,
		beneathButton: null,
		fit: null,
		kidsRoom: null,
		fitForkHeading: null,
		fitForkMeasurements: null,
		fitForkSize: null,
		storyHeading: null,
		photosHeading: null,
		optionsHeading: null,
		colourway: null,
		cut: null,
		size: null,
		timeframeHeading: null,
		standardTimeframe: null,
		priorityTimeframe: null,
		makingDoor: null,
		commissionsDoor: null,
		back: null,
	},

	commissions: {
		title: null,
		heading: null,
		opening: null,
		whatThisIsHeading: null,
		whatThisIs: null,
		howItGoesHeading: null,
		howItGoes: null,
		moneyHeading: null,
		moneyMoments: null,
		ownership: null,
		costHeading: null,
		cost: null,
		fee: null,
		formHeading: null,
		scene: null,
		scenePrompt: null,
		garment: null,
		garmentUnsure: null,
		anythingElse: null,
		button: null,
		beneathButton: null,
		noImages: null,
		exit: null,
	},

	making: {
		title: null,
		heading: null,
		opening: null,
		steps: null,
		photosHeading: null,
		photos: null,
		timelineHeading: null,
		timeline: null,
		fitHeading: null,
		fit: null,
		tailorHeading: null,
		tailor: null,
		misfitHeading: null,
		misfit: null,
		collectionDoor: null,
		policiesDoor: null,
	},

	story: {
		title: null,
		heading: null,
		philosophyHeading: null,
		philosophy: null,
		brandHeading: null,
		brand: null,
		makerHeading: null,
		maker: null,
		makersEmpty: null,
		abantuHeading: null,
		abantu: null,
		collectionDoor: null,
		commissionsDoor: null,
	},

	/**
	 * The order flow. **Nothing here is a nice-to-have translation.**
	 *
	 * `orders.locale` is set at creation and read by every email, so a customer
	 * who ordered in Kinyarwanda reads this page and these refusals in
	 * Kinyarwanda for the life of their order — which outlasts the flip bar. The
	 * fallback is silent and correct *(R14)*; it is also the one place on the
	 * site where falling back means someone reads a language they did not choose
	 * while looking at their own measurements.
	 */
	order: {
		form: {
			detailsHeading: null,
			name: null,
			email: null,
			emailHint: null,
			phone: null,
			phoneHint: null,
			channelHeading: null,
			channelNote: null,
			channelEmail: null,
			channelWhatsapp: null,
			priorityHeading: null,
			priority: null,
			priorityNote: null,
			fitLater: null,
		},
		fit: {
			pathHeading: null,
			pathMeasurements: null,
			pathSize: null,
			whoHeading: null,
			whoSelf: null,
			whoGuardian: null,
			whoTailor: null,
			age: null,
			ageNote: null,
			sizeHeading: null,
			sizeNote: null,
			unitCm: null,
			unitKg: null,
			checkHeading: null,
			checkIntro: null,
			acknowledged: null,

			/*
			 * ── DRAFT · NEEDS A NATIVE READER BEFORE IT SHIPS ───────────────────
			 *
			 * **The first two non-null values in this file, and they are drafts.**
			 * They are here rather than null because falling back to English on
			 * these two is worse than falling back anywhere else: they are the
			 * sentences a customer reads at the moment the form questions a number
			 * about their own body, and the whole point of the wording is tone.
			 *
			 * Written in the same *spirit* as the English, not translated literally
			 * — the English leans on idiom ("a slip of the finger") that does not
			 * carry. **Both must be read by one of R14's two Kinyarwanda readers
			 * before the switcher flips**, and they are on the flip bar as their
			 * own line.
			 *
			 * The distinction the English draws must survive translation:
			 * `impossible` blames the typing, `implausible` welcomes the body.
			 */
			impossible:
				"Uyu mubare usa nk'utameze neza — wenda hari aho wibeshye wandika, cyangwa " +
				"wanditse muri santimetero aho twari twiteze milimetero. Wawongera kuwureba?",
			implausible:
				"Uyu mubare si uwo dukunze kubona — ariko akenshi nta kibazo kirimo. Niba ari " +
				"wo, wemeze tubikorere kuri iyo mibare.",
			acknowledge: "Ni wo — mubikorere kuri iyi mibare",

			missing: null,
			unreadable: null,
		},
		errors: {
			heading: null,
			name: null,
			email: null,
			phone: null,
			scene: null,
			piece: null,
			channel: null,
			fit: null,
			unknown: null,
		},
		status: {
			requested: null,
			confirmed: null,
			// **His sign-off is pending on the English word too** *(R6)*, so this
			// key waits on the answer rather than on the translation.
			inDesign: null,
			paid: null,
			inTheMaking: null,
			onItsWay: null,
			delivered: null,
			declined: null,
			lapsed: null,
			cancelled: null,
		},
		state: {
			requested: null,
			confirmed: null,
			inDesign: null,
			paid: null,
			inTheMaking: null,
			onItsWay: null,
			delivered: null,
			declined: null,
			lapsed: null,
			cancelled: null,
		},
		page: {
			title: null,
			heading: null,
			commissionPlaceholder: null,
			yourWordsHeading: null,
			choicesHeading: null,
			moneyHeading: null,
			moneyPending: null,
			owed: null,
			received: null,
			gatePiece: null,
			gateDesignFee: null,
			gateCutting: null,
			gateBalance: null,
			reportHeading: null,
			reportButton: null,
			reportReference: null,
			reported: null,
			fitHeading: null,
			fitNote: null,
			fitEmpty: null,
			fitSourceSelf: null,
			fitSourceGuardian: null,
			fitSourceTailor: null,
			fitSourceStandard: null,
			fitSourceOurs: null,
			fitAge: null,
			fitChecked: null,
			photosHeading: null,
			photosEmpty: null,
			keepHeading: null,
			keep: null,
			talk: null,
		},
	},

	contact: {
		title: null,
		heading: null,
		opening: null,
		orderHeading: null,
		order: null,
		orderLink: null,
		orderLost: null,
		commissionHeading: null,
		commission: null,
		elseHeading: null,
		else: null,
		name: null,
		reply: null,
		message: null,
		button: null,
		whatsappHeading: null,
		whatsapp: null,
	},

	policies: {
		title: null,
		heading: null,
		opening: null,
		fitHeading: null,
		fit: null,
		alterationHeading: null,
		alteration: null,
		deliveryHeading: null,
		delivery: null,
		makingHeading: null,
		making: null,
		handsHeading: null,
		hands: null,
		detailsHeading: null,
		details: null,
		stoppingHeading: null,
		stopping: null,
		commissionHeading: null,
		commission: null,
		commissionMoneyHeading: null,
		commissionMoney: null,
	},
};

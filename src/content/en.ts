// English is canonical — the source of both the copy and the shape. Every other
// locale is a translation overlaid on this. Bracketed values are unanswered
// founder questions; they stay visible until his words land.
//
// **Every customer-facing string on the public site is a key here.** Not one is
// an inline literal in a component: a translation should be a weekend, not a
// rewrite *(R14)*. Where `rules-copy.md` writes a string out, it is reproduced
// exactly and is not improved.
//
// Where a value is also a dashboard field — the collection theme, a piece's
// story — the key here is the **draft default** in his voice, so the site reads
// completely from day one and he replaces it as his own words come.
export const en = {
	title: "[name]",
	wordmark: "[name]",
	line: "[line]",
	handles: ["[handle]", "[handle]"],

	/**
	 * **Four items, and no fifth** *(R10)*. Policies and Talk to us are in the
	 * footer; a contact link in the nav is the thing that quietly competes with
	 * the order form.
	 *
	 * `commissions` is the one place a label and a route differ on this site: the
	 * route is `/commissions`, the label is **Only yours**.
	 */
	nav: {
		collection: "Collection",
		commissions: "Only yours",
		making: "The making",
		story: "Our story",
		// What a screen reader calls this list. Read aloud to a customer, so it is
		// a keyed string like every other one.
		label: "Pages",
	},

	footer: {
		wordmark: "ubuntu.",
		collection: "The collection",
		commissions: "Only yours",
		making: "The making",
		story: "The story",
		contact: "Talk to us",
		policies: "Policies",
		instagram: "Instagram",
		tiktok: "TikTok",
		// The philosophy line sits at the bottom of every page, so it underwrites
		// the whole site without being repeated in body copy. Named as Nguni
		// wherever it is explained — the specificity rule, and R14's correction.
		maxim: "Umuntu ngumuntu ngabantu.",
		maximGloss: "a person is a person through other persons.",
		place: "Hand-stitched in Kigali.",
		rights: "© 2026 Ubuntu.",
	},

	home: {
		title: "Ubuntu — hand-stitched in Kigali",
		hero: "Clothes for the African who knows who they are.",
		heroButton: "See the collection.",

		whoWeAreHeading: "Who we are",
		whoWeAre:
			"Ubuntu is clothing hand-stitched in Kigali — one needle, one thread, one scene at " +
			"a time. The name is a Bantu philosophy: I am because we are. Every piece is made " +
			"only after you ask for it, and every piece carries a story we can name. The people " +
			"who wear it are Abantu — the people. One thread at a time, we are sewing our " +
			"collective greatness.",

		// The window display: **his hand choosing what a stranger meets first**
		// *(R1, R10)*, not the four most recent. The collection page already
		// answers newest-first.
		collectionKicker: "The current collection",
		// The draft default for the collection theme, which is a dashboard field.
		collectionTheme: "Summer — life by the water",
		bridge: "Every piece is stitched after you ask for it.",
		windowEmpty: "The first pieces are on his table. They will be here as he finishes them.",
		collectionDoor: "See the whole collection.",

		ritualHeading: "Every piece carries a story.",
		ritual:
			"The scenes are sewn in one unbroken thread — a boat, a shoreline, hands at work. " +
			"Each one is drawn from somewhere true, and we will tell you where. When your piece " +
			"arrives, its story arrives with it.",
		ritualClose: "Buying Ubuntu means learning something true.",
		// One door into a real piece. `{piece}` is a live piece's name, so the
		// door is never a promise the catalogue cannot keep.
		ritualDoor: "Read the story of the {piece}.",

		makingHeading: "How a piece is made",
		makingCondensed:
			"You ask for a piece. He answers you himself, with a price. The cloth is cut to " +
			"your numbers, the scene is stitched by hand, and you watch it happen — he posts " +
			"the photographs as he works.",
		makingDoor: "The making.",

		closingHeading: "Collective greatness",
		closing:
			"There is no crowd here yet, and we will not pretend there is one. Abantu is the " +
			"people who wear these pieces, and it begins with whoever is early. One thread at " +
			"a time, we are sewing our collective greatness.",
		commissionsDoor: "Or bring us a scene of your own.",
		storyDoor: "Read our story.",
	},

	collection: {
		title: "The collection — Ubuntu",
		heading: "The collection",
		kicker: "The current collection",
		bridge: "Every piece is stitched after you ask for it.",
		// Never scarcity, and never an apology. The catalogue is small because the
		// hands are two.
		empty: "He is stitching the first pieces. They will be here as they are finished.",
	},

	piece: {
		// **Never anything else.** Not "Buy now", not "Add to cart".
		orderButton: "Ask for this piece",
		beneathButton: [
			"He reviews your request personally.",
			"He confirms your final price.",
			"Payment starts the making.",
		],

		// One sentence, both cases, no branch *(R15, amended)*. A
		// country-conditional variant would be a request-time branch on an
		// edge-cached page, and the cache key is not worth buying for one clause.
		fit:
			"Your piece is cut to the numbers you give us, so take them slowly — we show you " +
			"where each one goes. If the fit needs adjusting when it arrives, he can usually " +
			"alter it; you cover the work and the return — or, if you're outside Rwanda, we " +
			"put [X] toward a tailor near you instead, because posting it back and forth " +
			"would cost more than the piece.",
		// On a children's piece only. **How he cuts, never an option on a form** *(R13)*.
		kidsRoom: "Cut with room to grow.",

		fitForkHeading: "How it will be cut",
		fitForkMeasurements:
			"A tape and five minutes, and the piece is cut to your body. We show you where " +
			"each number goes as you type it.",
		fitForkSize:
			"He checks every order himself against your height and weight before anything is " +
			"cut.",

		storyHeading: "The scene",
		photosHeading: "Closer",
		optionsHeading: "Choices",
		colourway: "Colourway",
		cut: "Cut",
		size: "Size",

		// Timeframes are position in the queue, never speed *(R4, R10)*. The
		// priority line renders only while the queue offset is non-zero.
		timeframeHeading: "When it would reach you",
		standardTimeframe: "Standard — about {days} days.",
		priorityTimeframe:
			"Priority — about {days} days. Your piece moves nearer the front of the line; it " +
			"is never stitched faster.",

		makingDoor: "How a piece is made.",
		commissionsDoor: "Or bring us a scene of your own.",
		back: "Back to the collection",
	},

	commissions: {
		title: "Only yours — Ubuntu",
		heading: "Only yours",
		opening: "Every Ubuntu piece carries a scene. This one carries yours — and no one else's.",

		whatThisIsHeading: "What this is",
		whatThisIs:
			"A commission is designed once, for one person, and retired. He draws the scene " +
			"with you, stitches it once, and never makes it again. Your scene is never anyone " +
			"else's.",

		howItGoesHeading: "How it goes",
		howItGoes:
			"It is a slower conversation than the collection, and it is with him. You tell him " +
			"the scene. He draws it and brings it back to you. Nothing is cut until you have " +
			"seen it and said yes.",
		// Three moments, and never the word deposit *(R6)*.
		moneyHeading: "When you pay",
		moneyMoments: [
			"A design fee before he draws. It buys his drafting hours and comes off the price of your piece.",
			"A payment when the design is agreed and the cloth is cut.",
			"The balance when the piece is finished, before it travels.",
		],
		// Ownership, stated on the page rather than discovered *(R6)*.
		ownership:
			"The design becomes yours when the piece is paid in full. Until then it stays his. " +
			"Your scene, though — the thing you told him — is never anyone else's.",

		costHeading: "What it costs",
		cost:
			"A commission is priced above the collection because you aren't buying a garment — " +
			"you're buying a design that will never exist again.",
		// `{fee}` is the design fee from Settings. Unset, it renders as `[X]`:
		// **never invent the number**.
		fee:
			"Beginning costs {fee}. That's his drafting hours, and it comes off the price of " +
			"your piece. What the piece itself costs, he'll tell you once he knows what he's " +
			"making.",

		formHeading: "Tell us your scene",
		scene: "Your scene",
		scenePrompt: "What is it you want stitched, and why does it matter to you?",
		garment: "Which garment do you imagine it on",
		garmentUnsure: "Not sure — advise me",
		name: "Your name",
		contact: "How he reaches you",
		email: "Email",
		phone: "Phone",
		anythingElse: "Anything he should know",
		channelHeading: "How we reach you",
		channelNote: "We'll message you on WhatsApp, and email you a copy you can always come back to.",
		// **Never anything else.**
		button: "Send it to him.",
		// Reply time is qualitative here and numeric everywhere else. This does
		// not read the dashboard field, deliberately.
		beneathButton:
			"He reads every request himself. You'll hear back within a few days, from him, " +
			"not from a system.",
		// No image field here, deliberately: an anonymous upload box is the most
		// attackable surface on a site with no accounts. Reference images unlock
		// on the order page once he has accepted *(Phase 8)*.
		noImages:
			"If a picture would help, he'll ask you for one when he writes back.",

		exit: "Not sure yet? Start with the collection — every piece there carries a scene too.",
	},

	making: {
		title: "The making — Ubuntu",
		heading: "The making",
		opening:
			"Nothing here sits on a shelf. A piece begins when you ask for it and ends in your " +
			"hands, and this is every step in between.",

		// The four steps, each with the honest *why* beside it. A whole step is
		// translated or it is not — this list is one leaf, not eight keys.
		steps: [
			{
				heading: "You ask for a piece.",
				body:
					"You choose the piece, the colourway and the cut, and you give us the numbers " +
					"it will be cut to. Nothing is owed yet. Asking is not buying — it is the " +
					"beginning of a conversation with the person who will make it.",
			},
			{
				heading: "He answers you himself.",
				body:
					"He reads your request and confirms what your piece will cost. It is a price, " +
					"not a starting price. If something in your request changes it — cloth a wide " +
					"measurement eats, a colourway he is short on — he tells you why, in the same " +
					"message.",
			},
			{
				heading: "Your payment buys the cloth.",
				body:
					"The needle starts when it arrives. Until then nothing is cut, because cloth " +
					"cut for your body cannot be used for anyone else's.",
			},
			{
				heading: "The scene is stitched, one thread.",
				body:
					"One needle, one continuous line, by hand. This is the part that takes weeks " +
					"rather than hours, and it is the part you are paying for.",
			},
		],

		photosHeading: "You watch it happen",
		photos:
			"As he works, he photographs your piece and posts it to your order page. You are " +
			"not tracking a parcel — you are watching a page fill with your piece coming into " +
			"existence.",

		timelineHeading: "It takes weeks",
		timeline:
			"Hand embroidery is slow, and we will not pretend otherwise. Every piece is " +
			"stitched at full, unrushed care, and the wait is the reason it looks the way it " +
			"does. Each piece carries its own honest timeframe on its page.",

		fitHeading: "How the fit works",
		fit:
			"You can give us your own measurements, or choose a size. Measurements are the " +
			"path we urge, and because we urge it we teach it — each field on the form tells " +
			"you where the tape goes before you type the number. If you choose a size, he " +
			"checks it against your height and weight before anything is cut.",
		tailorHeading: "What your tailor needs",
		tailor:
			"Ask for these, in centimetres, taken on the body: [per-garment list]. Send them " +
			"to us exactly as they come.",

		// The fair statement, from `rules-copy.md` §4. The last paragraph does the
		// real work: it states the hard rule, then turns it into the reason the
		// brand exists.
		misfitHeading: "If it doesn't fit",
		misfit: [
			"Every piece is cut for one person. The numbers you give us become the garment, so take them slowly — or choose a size and let him check it against your height and weight before anything is cut.",
			"If your piece arrives and the fit isn't right, tell us within [X] days. We can usually alter it — [X] for the work, plus the return, and it comes back fitting. If you are outside Rwanda, we put [X] toward a tailor near you instead, because sending it back and forth would cost more than the piece. If we cut outside our own measurements, or something is wrong in the making, it is ours to put right at no cost to you.",
			"What we cannot do is take a piece back. It was made for your body alone; there is no one else waiting for it. That is the honest cost of made-to-order — and the same reason the piece is yours in a way no shop garment can be.",
		],

		collectionDoor: "See the collection.",
		policiesDoor: "Read the policies.",
	},

	story: {
		title: "Our story — Ubuntu",
		heading: "Our story",

		// A descent from the widest circle to the smallest: philosophy → brand →
		// maker → community. Readable in three minutes.
		philosophyHeading: "The word",
		philosophy: [
			"Ubuntu is a word about people. In Kinyarwanda it means humanity, and human generosity — gira ubuntu, have consideration, be humane, is ordinary everyday speech in Rwanda.",
			"The maxim usually said alongside it — umuntu ngumuntu ngabantu, a person is a person through other persons — is Nguni, from Zulu and Xhosa, not Rwandan. We name it as Nguni because a borrowed sentence should be credited to the people it came from. The word itself is ours.",
			"I am because we are. That is the whole of it, and it is why a brand about clothes is named after a way of being with other people.",
		],

		brandHeading: "Why clothes",
		brand:
			"[His origin story, in his own voice — why a clothing brand, and why this one. " +
			"Founder homework, item 14.]",

		makerHeading: "The hands",
		maker:
			"Every scene on every piece is stitched by hand, one continuous line at a time. " +
			"These are the people who stitch them.",
		// The makers list is an FK table, not a typed string, because this page
		// names and celebrates them *(R16)*. Faces and bios are Phase 8.
		makersEmpty: "One pair of hands, for now. His.",

		abantuHeading: "Abantu",
		abantu:
			"Abantu means the people. It is what we call everyone who wears a piece, and at " +
			"launch it is small — we would rather tell you that than invent a crowd. If you " +
			"are reading this early, you are early, and the pieces you wear will be among the " +
			"first he made.",

		collectionDoor: "See the collection.",
		commissionsDoor: "Or bring us a scene of your own.",
	},

	contact: {
		title: "Talk to us — Ubuntu",
		heading: "Talk to us",
		opening:
			"One person reads everything that comes here. He's usually stitching, so a reply " +
			"takes a day or two — but it comes from him.",

		// Its job is to **route**, not to be reachable.
		orderHeading: "Waiting on a piece?",
		order:
			"Your order has its own page. His messages, your price, the photos as it's made — " +
			"all of it is there.",
		orderLink: "Open your order",
		orderLost: "Lost the link? Tell us your name and the piece, and we'll send it back to you.",

		commissionHeading: "Want a scene of your own?",
		commission: "That conversation starts on Only yours.",

		elseHeading: "Anything else",
		else:
			"A question before you order, a shop that wants to carry us, or something you just " +
			"want to say.",

		name: "Your name",
		reply: "Where he replies",
		message: "Your message",
		button: "Send it to him.",

		// WhatsApp appears here and on order pages. **Never in the global footer.**
		whatsappHeading: "WhatsApp",
		whatsapp: "[number]",
	},

	policies: {
		title: "Policies — Ubuntu",
		heading: "Policies",
		opening:
			"Every piece is made after you ask for it. Nothing here sits on a shelf, and " +
			"nothing is cut before it is paid for.",

		fitHeading: "Fit",
		fit:
			"Your measurements, or the size you choose, are what the piece is cut to. If they " +
			"were wrong, the piece will be wrong — that part belongs to you. If we cut outside " +
			"our own stated measurements, that part belongs to us, and we remake or repair it " +
			"at no cost. If our instructions were unclear and you measured in good faith " +
			"another way, we meet you in the middle.",

		alterationHeading: "Alteration",
		alteration:
			"Taking a piece in is ordinary work for a maker. Within [X] days of receiving it, " +
			"send it back and he will adjust it — [X] for the work, and you cover the return. " +
			"If you are outside Rwanda we put [X] toward a tailor near you instead, because " +
			"posting it back and forth would cost more than the piece. Letting a piece out is " +
			"limited by the cloth left at the seams, so it is not always possible; he will " +
			"tell you honestly before you send it.",

		deliveryHeading: "Getting it to you",
		delivery:
			"Delivery inside Rwanda is included in the price. Outside Rwanda, shipping is " +
			"shown while you choose where it is going, before you ask for the piece — never " +
			"added afterwards. Any customs duty or import tax your country charges is yours to " +
			"pay, and it is charged by them, not by us. We would rather you heard that here " +
			"than from a courier at your door.",

		makingHeading: "Making",
		making:
			"If a piece arrives damaged or flawed in the stitching, it is ours. Tell us and we " +
			"will put it right.",

		handsHeading: "Hands, not machines",
		hands:
			"Small variations in the line, the thread, the exact fall of a scene are the work " +
			"of a hand, not a fault. No two pieces are identical, and that is the point.",

		detailsHeading: "Your details",
		details:
			"To make a piece for you we hold your name, how to reach you, where it is going, " +
			"and the numbers it is cut to. They live behind the private link to your order and " +
			"nowhere else — never in a message, never on a page anyone can find. If you ask us " +
			"to forget you, we do: your details and your measurements go, and only the bare " +
			"fact of the order stays, so that a piece we made still has a record it existed. " +
			"If the piece was for a child, those numbers are yours to erase and they go with " +
			"the rest — we never held the child as a person in our records, only the " +
			"measurements needed to cut the cloth.",

		stoppingHeading: "Before the needle starts",
		stopping:
			"Once he begins, the piece exists and cannot be unmade. If you need to stop an " +
			"order, talk to us — what comes back depends on how far the work has gone. Before " +
			"anything is cut, nearly all of it. Once cloth is cut for your body, the materials " +
			"are spent. Once the scene is being stitched, most of what remains is his hours. " +
			"He will tell you plainly where your piece stands.",

		commissionHeading: "Only yours",
		commission:
			"A commission is designed once, for one person, and retired. Fit is settled with " +
			"him personally after the design is agreed, and the same terms hold — with no " +
			"possibility of remaking the design.",

		commissionMoneyHeading: "Only yours — when the piece becomes yours",
		commissionMoney:
			"A commission is paid in three moments: a fee before he draws, a payment when the " +
			"design is agreed and the cloth is cut, and the balance when the piece is " +
			"finished. Each one is a place you can stop. The design becomes yours when the " +
			"piece is paid in full; until then it stays his. Your scene, though — the thing " +
			"you told him — is never anyone else's.",
	},
};

// The shape every locale resolves to.
export type Content = typeof en;

/**
 * A locale overlay names every key of the source, at every depth. A value is the
 * translation, or `null` where the founder has not written it yet.
 *
 * Because every key is required, adding a key to `en` forces a matching entry in
 * each translation — a new string can never be silently left untranslated, only
 * deliberately left null. Arrays are leaves: a list is translated whole or not
 * at all, so a half-translated list of three lines cannot exist.
 */
export type Translation = Translatable<Content>;

export type Translatable<T> = {
	[K in keyof T]: T[K] extends readonly unknown[]
		? T[K] | null
		: T[K] extends object
			? Translatable<T[K]>
			: T[K] | null;
};

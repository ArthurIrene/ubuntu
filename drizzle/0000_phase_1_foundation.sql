CREATE TYPE "public"."event_actor" AS ENUM('founder', 'customer', 'system');--> statement-breakpoint
CREATE TYPE "public"."fit_source" AS ENUM('self', 'guardian', 'tailor', 'standard', 'ours');--> statement-breakpoint
CREATE TYPE "public"."garment_audience" AS ENUM('adult', 'kids');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'rw');--> statement-breakpoint
CREATE TYPE "public"."measurement_unit" AS ENUM('cm', 'in');--> statement-breakpoint
CREATE TYPE "public"."option_group" AS ENUM('colourway', 'cut', 'size');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('requested', 'confirmed', 'declined', 'design_shared', 'design_agreed', 'fit_recorded', 'fit_checked', 'price_adjusted', 'making_started', 'making_complete', 'shipped', 'delivered', 'lapsed', 'cancelled', 'token_rotated', 'message_sent', 'message_failed');--> statement-breakpoint
CREATE TYPE "public"."order_image_kind" AS ENUM('progress', 'customer_reference');--> statement-breakpoint
CREATE TYPE "public"."payment_gate" AS ENUM('design_fee', 'cutting', 'balance');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('manual', 'gateway');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('payment', 'refund', 'correction');--> statement-breakpoint
CREATE TYPE "public"."piece_kind" AS ENUM('collection', 'commission');--> statement-breakpoint
CREATE TYPE "public"."piece_state" AS ENUM('draft', 'live', 'removed');--> statement-breakpoint
CREATE TYPE "public"."preferred_channel" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."price_line_kind" AS ENUM('base', 'option', 'priority', 'shipping', 'adjustment');--> statement-breakpoint
CREATE TABLE "admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"email" text NOT NULL,
	"recovery_email" text,
	"sessions_valid_after" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "admin_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "makers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garment_type_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garment_type_id" uuid NOT NULL,
	"measurement_key" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"plausible_min" integer NOT NULL,
	"plausible_max" integer NOT NULL,
	"impossible_min" integer NOT NULL,
	"impossible_max" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garment_type_measurements_bands_nest" CHECK (impossible_min <= plausible_min AND plausible_min <= plausible_max AND plausible_max <= impossible_max)
);
--> statement-breakpoint
CREATE TABLE "garment_type_translations" (
	"garment_type_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garment_type_translations_garment_type_id_locale_pk" PRIMARY KEY("garment_type_id","locale")
);
--> statement-breakpoint
CREATE TABLE "garment_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"audience" "garment_audience" NOT NULL,
	"diagram_key" text NOT NULL,
	"age_min_years" integer,
	"age_max_years" integer,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garment_types_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "piece_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piece_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"focal_x" real DEFAULT 0.5 NOT NULL,
	"focal_y" real DEFAULT 0.5 NOT NULL,
	"alt" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "piece_images_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "piece_images_focal_in_range" CHECK (focal_x >= 0 AND focal_x <= 1 AND focal_y >= 0 AND focal_y <= 1)
);
--> statement-breakpoint
CREATE TABLE "piece_option_translations" (
	"piece_option_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"label" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "piece_option_translations_piece_option_id_locale_pk" PRIMARY KEY("piece_option_id","locale")
);
--> statement-breakpoint
CREATE TABLE "piece_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piece_id" uuid NOT NULL,
	"group" "option_group" NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"price_modifier" integer DEFAULT 0 NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "piece_translations" (
	"piece_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text,
	"scene_line" text,
	"story" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "piece_translations_piece_id_locale_pk" PRIMARY KEY("piece_id","locale")
);
--> statement-breakpoint
CREATE TABLE "pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" "piece_kind" DEFAULT 'collection' NOT NULL,
	"state" "piece_state" DEFAULT 'draft' NOT NULL,
	"garment_type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"scene_line" text,
	"story" text,
	"base_price" integer,
	"currency" char(3) DEFAULT 'RWF' NOT NULL,
	"making_days" integer,
	"reborn" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pieces_slug_unique" UNIQUE("slug"),
	CONSTRAINT "pieces_publish_floor" CHECK (state <> 'live' OR (scene_line IS NOT NULL AND base_price IS NOT NULL AND published_at IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "window_display" (
	"piece_id" uuid PRIMARY KEY NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text,
	"email" text,
	"name" text,
	"address" text,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"auth_user_id" uuid,
	"claimed_at" timestamp with time zone,
	"redacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone"),
	CONSTRAINT "customers_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "customers_redaction_is_complete" CHECK (redacted_at IS NULL OR (name IS NULL AND phone IS NULL AND email IS NULL AND address IS NULL))
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" "order_event_type" NOT NULL,
	"actor" "event_actor" NOT NULL,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" "order_image_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"focal_x" real DEFAULT 0.5 NOT NULL,
	"focal_y" real DEFAULT 0.5 NOT NULL,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_images_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "order_images_focal_in_range" CHECK (focal_x >= 0 AND focal_x <= 1 AND focal_y >= 0 AND focal_y <= 1)
);
--> statement-breakpoint
CREATE TABLE "order_payment_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"gate" "payment_gate",
	"amount" integer,
	"currency" char(3) DEFAULT 'RWF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_price_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" "price_line_kind" NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_price_lines_adjustment_has_reason" CHECK (kind <> 'adjustment' OR reason IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"kind" "piece_kind" DEFAULT 'collection' NOT NULL,
	"customer_id" uuid NOT NULL,
	"piece_id" uuid,
	"maker_id" uuid,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"preferred_channel" "preferred_channel" DEFAULT 'email' NOT NULL,
	"currency" char(3) DEFAULT 'RWF' NOT NULL,
	"confirmed_total" integer,
	"confirmed_at" timestamp with time zone,
	"brief" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_token_unique" UNIQUE("token"),
	CONSTRAINT "orders_collection_has_piece" CHECK (kind <> 'collection' OR piece_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" char(3) DEFAULT 'RWF' NOT NULL,
	"type" "payment_type" DEFAULT 'payment' NOT NULL,
	"method" "payment_method" DEFAULT 'manual' NOT NULL,
	"gate" "payment_gate",
	"reported" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fit_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fit_record_id" uuid NOT NULL,
	"measurement_key" text NOT NULL,
	"value" integer,
	"label" text NOT NULL,
	"instruction" text NOT NULL,
	"plausible_min" integer,
	"plausible_max" integer,
	"impossible_min" integer,
	"impossible_max" integer,
	"warned" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fit_measurements_ack_needs_warning" CHECK (acknowledged_at IS NULL OR warned)
);
--> statement-breakpoint
CREATE TABLE "fit_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"garment_type_id" uuid NOT NULL,
	"source" "fit_source" NOT NULL,
	"unit" "measurement_unit" DEFAULT 'cm' NOT NULL,
	"size_chart_version" text NOT NULL,
	"standard_size" text,
	"age_years" integer,
	"checked_at" timestamp with time zone,
	"checked_by" uuid,
	"redacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fit_records_check_is_signed" CHECK ((checked_at IS NULL) = (checked_by IS NULL)),
	CONSTRAINT "fit_records_redaction_clears_age" CHECK (redacted_at IS NULL OR age_years IS NULL)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"currency" char(3) DEFAULT 'RWF' NOT NULL,
	"queue_offset_days" integer DEFAULT 0 NOT NULL,
	"priority_offset_days" integer DEFAULT 0 NOT NULL,
	"priority_modifier" integer DEFAULT 0 NOT NULL,
	"design_fee" integer DEFAULT 0 NOT NULL,
	"reply_time_days" integer,
	"collection_theme" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_is_singleton" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "settings_translations" (
	"settings_id" integer NOT NULL,
	"locale" "locale" NOT NULL,
	"collection_theme" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_translations_settings_id_locale_pk" PRIMARY KEY("settings_id","locale")
);
--> statement-breakpoint
ALTER TABLE "garment_type_measurements" ADD CONSTRAINT "garment_type_measurements_garment_type_id_garment_types_id_fk" FOREIGN KEY ("garment_type_id") REFERENCES "public"."garment_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_type_translations" ADD CONSTRAINT "garment_type_translations_garment_type_id_garment_types_id_fk" FOREIGN KEY ("garment_type_id") REFERENCES "public"."garment_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_images" ADD CONSTRAINT "piece_images_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_option_translations" ADD CONSTRAINT "piece_option_translations_piece_option_id_piece_options_id_fk" FOREIGN KEY ("piece_option_id") REFERENCES "public"."piece_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_options" ADD CONSTRAINT "piece_options_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_translations" ADD CONSTRAINT "piece_translations_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_garment_type_id_garment_types_id_fk" FOREIGN KEY ("garment_type_id") REFERENCES "public"."garment_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "window_display" ADD CONSTRAINT "window_display_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_images" ADD CONSTRAINT "order_images_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payment_schedule" ADD CONSTRAINT "order_payment_schedule_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_price_lines" ADD CONSTRAINT "order_price_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_maker_id_makers_id_fk" FOREIGN KEY ("maker_id") REFERENCES "public"."makers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_measurements" ADD CONSTRAINT "fit_measurements_fit_record_id_fit_records_id_fk" FOREIGN KEY ("fit_record_id") REFERENCES "public"."fit_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_records" ADD CONSTRAINT "fit_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_records" ADD CONSTRAINT "fit_records_garment_type_id_garment_types_id_fk" FOREIGN KEY ("garment_type_id") REFERENCES "public"."garment_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_records" ADD CONSTRAINT "fit_records_checked_by_admin_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."admin"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_translations" ADD CONSTRAINT "settings_translations_settings_id_settings_id_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "garment_type_measurements_key_idx" ON "garment_type_measurements" USING btree ("garment_type_id","measurement_key");--> statement-breakpoint
CREATE INDEX "piece_images_piece_idx" ON "piece_images" USING btree ("piece_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "piece_options_key_idx" ON "piece_options" USING btree ("piece_id","group","key");--> statement-breakpoint
CREATE INDEX "pieces_public_idx" ON "pieces" USING btree ("kind","state","published_at");--> statement-breakpoint
CREATE INDEX "window_display_position_idx" ON "window_display" USING btree ("position");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","at");--> statement-breakpoint
CREATE INDEX "order_images_order_idx" ON "order_images" USING btree ("order_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "order_payment_schedule_position_idx" ON "order_payment_schedule" USING btree ("order_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "order_price_lines_position_idx" ON "order_price_lines" USING btree ("order_id","position");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_piece_idx" ON "orders" USING btree ("piece_id");--> statement-breakpoint
CREATE INDEX "orders_maker_idx" ON "orders" USING btree ("maker_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fit_measurements_key_idx" ON "fit_measurements" USING btree ("fit_record_id","measurement_key");--> statement-breakpoint
CREATE INDEX "fit_records_order_idx" ON "fit_records" USING btree ("order_id","created_at");--> statement-breakpoint
-- The settings singleton.
--
-- `settings` is a one-row table by construction (see the `settings_is_singleton`
-- check above), so this row is part of the schema rather than seed data:
-- without it, every read of a global returns nothing and the dashboard has no
-- record to edit.
--
-- Defaults only. Nothing here invents a number he has not given — which is why
-- `reply_time_days` stays null and the copy renders its bracket rather than a
-- guess.
INSERT INTO "settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

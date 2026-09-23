CREATE TABLE "experiences" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"company_logo_url" text,
	"role" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

ALTER TABLE "projects" ADD COLUMN "icon_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_type" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "site_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
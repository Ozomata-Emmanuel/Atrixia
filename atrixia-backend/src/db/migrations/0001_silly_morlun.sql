ALTER TABLE "preferences" ALTER COLUMN "prioritize_price" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "preferences" ALTER COLUMN "prioritize_quality" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "preferred_marketplaces" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "preferences" DROP COLUMN "budget_min";--> statement-breakpoint
ALTER TABLE "preferences" DROP COLUMN "budget_max";
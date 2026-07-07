import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260707120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "mt_shipping_rule"
        ADD COLUMN IF NOT EXISTS "weight_threshold_lbs" numeric null,
        ADD COLUMN IF NOT EXISTS "rate_per_lb" numeric null,
        ADD COLUMN IF NOT EXISTS "min_item_quantity" integer null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "mt_shipping_rule"
        DROP COLUMN IF EXISTS "weight_threshold_lbs",
        DROP COLUMN IF EXISTS "rate_per_lb",
        DROP COLUMN IF EXISTS "min_item_quantity";
    `)
  }
}

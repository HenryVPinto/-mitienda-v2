import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260606011952 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mt_promo_rule" ("id" text not null, "name" text not null, "type" text check ("type" in ('COMBO', 'GIFT', 'QUANTITY_DISCOUNT', 'WHOLESALE')) not null, "description" text null, "is_active" boolean not null default true, "starts_at" timestamptz null, "ends_at" timestamptz null, "min_quantity" integer null, "discount_percentage" integer null, "discount_amount" integer null, "gift_product_id" text null, "gift_quantity" integer null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_promo_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_promo_rule_deleted_at" ON "mt_promo_rule" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mt_promo_rule" cascade;`);
  }

}

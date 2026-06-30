import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260605192350 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mt_shipping_rule" ("id" text not null, "name" text not null, "description" text null, "region_code" text null, "min_order_amount" integer null, "max_order_amount" integer null, "flat_rate" integer null, "free_above_amount" integer null, "is_active" boolean not null default true, "priority" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_shipping_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_shipping_rule_deleted_at" ON "mt_shipping_rule" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mt_shipping_rule" cascade;`);
  }

}

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260606004430 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mt_product_extension" ("id" text not null, "wholesale_price" integer null, "weight" integer null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_product_extension_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_product_extension_deleted_at" ON "mt_product_extension" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mt_product_extension" cascade;`);
  }

}

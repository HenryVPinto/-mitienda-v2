import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260814120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mt_brand_catalog" ("id" text not null, "brand_id" text not null, "title" text not null, "description" text null, "file_url" text not null, "cover_image_url" text null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_brand_catalog_pkey" primary key ("id"));`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_brand_catalog_deleted_at" ON "mt_brand_catalog" ("deleted_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_brand_catalog_brand_id" ON "mt_brand_catalog" ("brand_id") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mt_brand_catalog" cascade;`)
  }

}

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260605192330 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mt_brand" drop constraint if exists "mt_brand_handle_unique";`);
    this.addSql(`create table if not exists "mt_brand" ("id" text not null, "name" text not null, "handle" text not null, "description" text null, "logo_url" text null, "website_url" text null, "is_active" boolean not null default true, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_brand_deleted_at" ON "mt_brand" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mt_brand_handle_unique" ON "mt_brand" ("handle") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mt_brand" cascade;`);
  }

}

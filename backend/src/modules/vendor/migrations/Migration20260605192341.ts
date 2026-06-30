import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260605192341 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mt_vendor" drop constraint if exists "mt_vendor_handle_unique";`);
    this.addSql(`create table if not exists "mt_vendor" ("id" text not null, "name" text not null, "handle" text not null, "description" text null, "logo_url" text null, "contact_email" text null, "contact_phone" text null, "address" text null, "city" text null, "country_code" text not null default 'GT', "is_active" boolean not null default true, "commission_rate" integer null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_vendor_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_vendor_deleted_at" ON "mt_vendor" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mt_vendor_handle_unique" ON "mt_vendor" ("handle") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mt_vendor" cascade;`);
  }

}

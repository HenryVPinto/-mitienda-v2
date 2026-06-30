import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260606014807 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mt_page" drop constraint if exists "mt_page_slug_unique";`);
    this.addSql(`create table if not exists "mt_banner" ("id" text not null, "title" text not null, "subtitle" text null, "image_url" text not null, "link_url" text null, "position" text check ("position" in ('HOME', 'CATEGORY', 'PROMO')) not null default 'HOME', "sort_order" integer not null default 0, "is_active" boolean not null default true, "starts_at" timestamptz null, "ends_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_banner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_banner_deleted_at" ON "mt_banner" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "mt_faq_item" ("id" text not null, "question" text not null, "answer" text not null, "category" text null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_faq_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_faq_item_deleted_at" ON "mt_faq_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "mt_page" ("id" text not null, "slug" text not null, "title" text not null, "content" text not null, "is_published" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mt_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_page_deleted_at" ON "mt_page" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mt_page_slug_unique" ON "mt_page" ("slug") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mt_banner" cascade;`);

    this.addSql(`drop table if exists "mt_faq_item" cascade;`);

    this.addSql(`drop table if exists "mt_page" cascade;`);
  }

}

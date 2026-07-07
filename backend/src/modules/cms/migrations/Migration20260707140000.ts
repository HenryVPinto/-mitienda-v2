import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260707140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mt_bank_account" (
        "id" text NOT NULL,
        "bank_name" text NOT NULL,
        "account_number" text NOT NULL,
        "account_type" text NOT NULL,
        "account_holder" text NOT NULL,
        "logo_url" text NULL,
        "instructions" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "mt_bank_account_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mt_bank_account_deleted_at" ON "mt_bank_account" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "mt_bank_account" CASCADE;`)
  }
}

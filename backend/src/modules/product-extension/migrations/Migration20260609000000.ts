import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260609000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mt_product_extension" add column if not exists "description_html" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "mt_product_extension" drop column if exists "description_html";`);
  }

}

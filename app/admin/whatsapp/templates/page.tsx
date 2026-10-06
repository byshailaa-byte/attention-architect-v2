import { getCrmSource } from "@/lib/admin/crm";
import { TemplatesView } from "./TemplatesView";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const src = getCrmSource();
  const [spend, drip, templates] = await Promise.all([src.getSpend(), src.getDrip(), src.getTemplates()]);
  return <TemplatesView spend={spend} drip={drip} templates={templates} />;
}

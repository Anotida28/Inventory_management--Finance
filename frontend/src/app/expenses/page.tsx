import LegacyRouteNotice from "@/components/legacy/LegacyRouteNotice";

export default function ExpensesRoute() {
  return (
    <LegacyRouteNotice
      eyebrow="Legacy Navigation"
      title="Expenses Now Flow Through Issue Out"
      description="Expense-like equipment dispatch is now handled inside the Issue Out workflow so serialized assets, acknowledgements, and returns stay in one traceable process."
      actions={[
        {
          href: "/issue-out",
          label: "Open Issue Out",
          description: "Dispatch items, track acknowledgements, and process returns to HQ.",
        },
        {
          href: "/dashboard",
          label: "View Dashboard",
          description: "Review pending issue acknowledgements and document exceptions first.",
        },
      ]}
    />
  );
}

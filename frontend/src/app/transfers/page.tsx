import LegacyRouteNotice from "@/components/legacy/LegacyRouteNotice";

export default function TransfersRoute() {
  return (
    <LegacyRouteNotice
      eyebrow="Legacy Navigation"
      title="Transfers Are Managed In Issue Out"
      description="Branch transfers, acknowledgement, and return handling now live in the unified Issue Out workflow so each serialized asset keeps one lifecycle record."
      actions={[
        {
          href: "/issue-out",
          label: "Open Issue Out",
          description: "Create transfer records, print slips, and track the return lifecycle.",
        },
        {
          href: "/inventory",
          label: "Review HQ Stock First",
          description: "Check available serials and stock-on-hand before creating the transfer.",
        },
      ]}
    />
  );
}

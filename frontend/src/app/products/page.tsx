import LegacyRouteNotice from "@/components/legacy/LegacyRouteNotice";

export default function ProductsRoute() {
  return (
    <LegacyRouteNotice
      eyebrow="Legacy Navigation"
      title="Products Moved Into OMDS Workflows"
      description="The old Products area has been split into two operational views: receiving for inbound goods and HQ Stock for current on-hand visibility."
      actions={[
        {
          href: "/receiving",
          label: "Go to Receiving",
          description: "Log new product arrivals, upload documents, and verify receipts.",
        },
        {
          href: "/inventory",
          label: "Go to HQ Stock",
          description: "Review current product quantities, storage locations, and stock status.",
        },
      ]}
    />
  );
}

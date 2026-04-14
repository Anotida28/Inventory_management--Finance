import Header from "@/components/Header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type LegacyRouteAction = {
  description: string;
  href: string;
  label: string;
};

type LegacyRouteNoticeProps = {
  actions: LegacyRouteAction[];
  description: string;
  eyebrow: string;
  title: string;
};

const LegacyRouteNotice = ({
  title,
  eyebrow,
  description,
  actions,
}: LegacyRouteNoticeProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
          {eyebrow}
        </p>
        <div className="mt-2">
          <Header name={title} />
        </div>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">{description}</p>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-slate-50 p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          This route is kept for continuity, but the workflow now lives in the
          destinations below.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-white/80 bg-white/90 p-5 transition hover:border-blue-200 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-800">
                    {action.label}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="mt-0.5 h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegacyRouteNotice;

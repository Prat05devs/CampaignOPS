import Link from "next/link";
import { BrandLogo } from "../../components/brand-logo";

export function AuthShell({
  children,
  footerHref,
  footerLabel,
  footerText,
  title,
  subtitle
}: {
  children: React.ReactNode;
  footerHref: string;
  footerLabel: string;
  footerText: string;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="min-h-screen bg-campaign-cream text-campaign-ink">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden border-r border-campaign-mist bg-campaign-ink px-10 py-10 text-campaign-cream lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" />
            <div>
              <p className="text-sm font-semibold">CampaignOps</p>
              <p className="text-xs text-campaign-cream/65">Operations command centre</p>
            </div>
          </div>
          <div className="max-w-md">
            <p className="text-sm uppercase tracking-[0.18em] text-campaign-gold">CampaignOps</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">Command the event workspace.</h1>
            <div className="mt-8 h-44 rounded-md border border-campaign-cream/15 bg-[radial-gradient(circle_at_35%_30%,rgba(232,96,44,0.45),transparent_32%),linear-gradient(135deg,rgba(196,168,90,0.18),rgba(127,157,185,0.14))]" />
          </div>
          <p className="text-xs text-campaign-cream/55">Premium Himalayan event operations command centre.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md rounded-md border border-campaign-mist bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-campaign-orange">CampaignOps</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footerText}{" "}
              <Link className="font-medium text-campaign-orange hover:text-campaign-orange/80" href={footerHref}>
                {footerLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

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
    <main className="h-screen overflow-hidden bg-[#EFEDE2] text-campaign-ink">
      <div className="grid h-screen overflow-hidden bg-[#EFEDE2] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="h-screen overflow-y-auto px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-[520px]">
              <div className="mb-8 flex items-center gap-3">
                <BrandLogo className="h-12 w-12 rounded-[14px]" />
                <div>
                  <p className="text-base font-semibold tracking-tight">CampaignOps</p>
                  <p className="text-sm text-muted-foreground">Operations command centre</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/55 p-5 shadow-[0_18px_60px_rgba(16,20,26,0.10)] backdrop-blur-xl sm:p-7">
                <div className="mb-6 text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-campaign-orange">CampaignOps</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
                </div>
                {children}
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {footerText}{" "}
                  <Link className="font-semibold text-campaign-orange underline-offset-4 hover:underline" href={footerHref}>
                    {footerLabel}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative hidden h-screen overflow-hidden bg-[#151812] px-10 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[url('/authPageImage.webp')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,20,26,0.84),rgba(16,20,26,0.56)_45%,rgba(16,20,26,0.26)),linear-gradient(180deg,rgba(16,20,26,0.42),rgba(16,20,26,0.18)_34%,rgba(16,20,26,0.76))]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-11 w-11 rounded-[14px]" />
              <div>
                <p className="text-sm font-semibold">CampaignOps</p>
                <p className="text-xs text-white/65">Summits, campaigns, protocol and field ops</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-auto max-w-2xl pb-16 xl:pb-20">
            <p className="text-6xl font-semibold leading-none text-campaign-orange">"</p>
            <h1 className="mt-2 text-balance text-4xl font-semibold leading-tight tracking-tight text-white xl:text-[46px]">
              Turn high-stakes event requirements into calm execution.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/72">
              A shared command centre for teams handling summits, public programs, vendors, budgets, outreach and post-event learning.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <div className="flex -space-x-3">
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/70 bg-[#DCE9F7] text-sm font-semibold text-[#295A66]">PM</span>
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/70 bg-[#F6D1C2] text-sm font-semibold text-[#8D3B26]">OP</span>
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/70 bg-[#E4F0CF] text-sm font-semibold text-[#2F5D37]">VN</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Protocol-ready planning</p>
                <p className="text-xs text-white/62">One view for admins, managers and members.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

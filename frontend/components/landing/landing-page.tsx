import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { ProcessCircuit } from "./process-circuit";
import { Reveal } from "./reveal";

export function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-void text-ink">
      <LandingHeader />
      <main>
        <LandingHero />

        <section id="method" className="py-20 sm:py-24">
          <div className="page-col">
            <Reveal className="max-w-xl text-left">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Three moves. One on-chain number.
              </h2>
              <p className="mt-3 max-w-[52ch] text-sm leading-7 text-ink-muted">
                No database sits between you and the score. The scanner writes.
                The contract is the source of truth.
              </p>
            </Reveal>

            <div className="relative mt-12 lg:min-h-[34rem]">
              <ProcessCircuit />
              <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-8">
              <Reveal className="lg:col-span-7 lg:row-span-2" delay={0.04}>
                <article className="relative overflow-hidden rounded-lg bg-panel ring-1 ring-line">
                  <div className="relative aspect-[16/10] min-h-[18rem] lg:aspect-auto lg:h-full lg:min-h-[34rem]">
                    <Image
                      src="/landing/console.jpg"
                      alt="Worn metal scanner panel with a glowing orange LED cross"
                      fill
                      sizes="(max-width: 1024px) 100vw, 58vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void via-void/70 to-transparent px-5 pb-5 pt-16 sm:px-6">
                      <p className="text-xl font-semibold text-ink">Paste</p>
                      <p className="mt-1 max-w-[36ch] text-sm text-ink-muted">
                        Drop any X Layer token address into the scanner.
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>

              <Reveal className="lg:col-span-5 lg:self-start" delay={0.1}>
                <article className="rounded-lg bg-raised p-6 ring-1 ring-line">
                  <p className="text-xl font-semibold text-ink">Check</p>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    Six deterministic findings: source, owner, honeypot, LP
                    lock, holders, deployer.
                  </p>
                </article>
              </Reveal>

              <Reveal className="lg:col-span-4 lg:col-start-9 lg:mt-2" delay={0.16}>
                <article className="publish-panel p-6">
                  <span className="publish-sheen" />
                  <div className="relative z-10">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xl font-semibold tracking-tight text-ink-inverse">
                        Publish
                      </p>
                      <span className="size-1.5 rounded-full bg-ink-inverse/80" />
                    </div>
                    <div className="mb-4 h-px w-10 bg-ink-inverse/25" />
                    <p className="text-sm leading-6 text-ink-inverse/75">
                      The score lands on RiskRegistry. Anyone can read it back
                      with wagmi.
                    </p>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
          </div>
        </section>

        <section id="registry" className="border-t border-line bg-inset/60">
          <div className="page-col grid items-center gap-10 py-20 sm:py-24 lg:grid-cols-2">
            <Reveal>
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg ring-1 ring-line">
                <Image
                  src="/landing/same-number.jpg"
                  alt="Two industrial gauges on charcoal steel, both needles reading the same mark under a burnt-orange lamp"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Anyone can read the same number.
              </h2>
              <p className="mt-4 max-w-[48ch] text-sm leading-7 text-ink-muted">
                High-risk tokens can raise an alert on X. The feed on the
                scanner still comes from the contract, not a private table.
              </p>
              <Link
                href="/scan"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hot"
              >
                Open the scanner
                <ArrowRight className="size-4" weight="bold" />
              </Link>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="page-col grid items-center gap-10 py-20 sm:py-24 lg:grid-cols-2">
            <Reveal className="text-left">
              <h2 className="max-w-[12ch] text-3xl font-semibold tracking-tight sm:text-5xl">
                Run the next address.
              </h2>
              <Link
                href="/scan"
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hot"
              >
                Open the scanner
                <ArrowRight className="size-4" weight="bold" />
              </Link>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg ring-1 ring-line">
                <Image
                  src="/landing/next-address.jpg"
                  alt="A blank metal plate feeding into a dark scanner on a burnt-orange strip of light"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}

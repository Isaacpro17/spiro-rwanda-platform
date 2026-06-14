import { type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'
import { Button } from '../../components/ui/button'
import { Reveal } from '../../components/ui/Reveal'
import { Battery, MapPin, Zap, Shield, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { useCountUp } from '../../hooks/useCountUp'
import { useLanguage } from '../../contexts/LanguageContext'

/* ── Animated Stat ─────────────────────────────────────────────────────────── */
function StatCard({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const { ref, display } = useCountUp({ end, suffix, duration: 2200 })
  return (
    <div className="text-center group">
      <div
        ref={ref as RefObject<HTMLDivElement>}
        className="text-4xl lg:text-5xl font-bold text-primary-600 mb-2 tabular-nums"
      >
        {display}
      </div>
      <div className="text-gray-600 font-medium">{label}</div>
    </div>
  )
}

/* ── Static metadata (icons / colours — never translated) ── */
const stepMeta = [
  { icon: MapPin, step: '01' },
  { icon: Battery, step: '02' },
  { icon: Zap, step: '03' },
]

const benefitMeta = [
  { icon: Clock,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { icon: Shield,     color: 'text-green-600',  bg: 'bg-green-50'  },
  { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  { icon: Zap,        color: 'text-yellow-600', bg: 'bg-yellow-50' },
]

/* ── LandingPage ───────────────────────────────────────────────────────────── */
export function LandingPage() {
  const { t } = useLanguage()
  const h = t.landing.hero

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative text-white overflow-hidden min-h-[92vh] flex items-center">

        {/* Layer 0 – Full-bleed background: motorcycle + station photo */}
        <img
          src="/spiro-motorcycle.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />

        {/* Layer 1 – Directional blue overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.92] via-primary/[0.78] to-primary/[0.48]" />
        {/* Layer 2 – Uniform darkening */}
        <div className="absolute inset-0 bg-black/[0.12]" />
        {/* Layer 3 – Decorative radial accents */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 30%, #FFE500 0%, transparent 45%), radial-gradient(circle at 82% 72%, #4757C1 0%, transparent 45%)',
          }}
        />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left – Text */}
            <div className="space-y-8">
              <div className="animate-fade-up">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-accent-500/20 border border-accent-500/30 text-accent-300 text-sm font-semibold mb-6">
                  <Zap className="w-4 h-4 mr-2" />
                  {h.badge}
                </span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-tight animate-fade-up delay-100">
                {h.title1}{' '}
                <span className="text-accent-500 relative">
                  {h.title2}
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 10 Q75 2 150 10 Q225 18 298 10"
                      stroke="#FFE500"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.6"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-lg lg:text-xl text-gray-200 leading-relaxed animate-fade-up delay-200 max-w-lg">
                {h.subtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="accent"
                    className="w-full sm:w-auto text-primary font-bold px-8 shadow-lg shadow-accent-500/30 hover:scale-105 transition-transform"
                  >
                    {h.cta1} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-white/60 text-white hover:bg-white hover:text-primary backdrop-blur-sm"
                  >
                    {h.cta2}
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6 pt-4 animate-fade-up delay-400">
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Shield className="w-4 h-4 text-accent-400" />
                  {h.trust1}
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Clock className="w-4 h-4 text-accent-400" />
                  {h.trust2}
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <MapPin className="w-4 h-4 text-accent-400" />
                  {h.trust3}
                </div>
              </div>
            </div>

            {/* Right – floating badge over visible image area */}
            <div className="hidden lg:flex items-end justify-start pb-8 animate-fade-right delay-300">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-3 flex items-center gap-3 shadow-2xl" style={{ minWidth: 220 }}>
                <div className="w-9 h-9 bg-accent-500 rounded-full flex items-center justify-center shrink-0">
                  <Battery className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{h.badgeSwapped}</div>
                  <div className="text-gray-300 text-xs">{h.badgeReady}</div>
                </div>
                <div className="ml-auto pl-4 text-accent-400 font-bold text-sm">1:47</div>
              </div>
            </div>

          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-60">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center pt-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-float" />
          </div>
        </div>
      </section>

      {/* ── Stats Section ────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            <StatCard end={50}    suffix="+" label={t.landing.stats.stations}     />
            <StatCard end={1200}  suffix="+" label={t.landing.stats.riders}       />
            <StatCard end={45000} suffix="+" label={t.landing.stats.swaps}        />
            <StatCard end={98}    suffix="%" label={t.landing.stats.satisfaction} />
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t.landing.howItWorks.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.landing.howItWorks.subtitle}
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary/30 via-accent-400 to-primary/30" />

            {t.landing.howItWorks.steps.map((step, i) => {
              const meta = stepMeta[i]
              return (
                <Reveal key={meta.step} delay={i * 150}>
                  <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group relative">
                    <span className="absolute top-6 right-6 text-5xl font-black text-gray-100 group-hover:text-primary-100 transition-colors">
                      {meta.step}
                    </span>
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <meta.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t.landing.benefits.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.landing.benefits.subtitle}
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.landing.benefits.items.map((item, i) => {
              const meta = benefitMeta[i]
              return (
                <Reveal key={item.title} delay={i * 100}>
                  <div className="p-6 border border-gray-200 rounded-2xl hover:border-primary hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-default">
                    <div className={`w-12 h-12 ${meta.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <meta.icon className={`w-6 h-6 ${meta.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary-600 to-primary-800 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #FFE500 0%, transparent 60%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">{t.landing.cta.title}</h2>
            <p className="text-lg text-gray-200 mb-10 max-w-2xl mx-auto">{t.landing.cta.subtitle}</p>
            <Link to="/login">
              <Button
                size="lg"
                variant="accent"
                className="text-primary font-bold px-10 shadow-xl shadow-accent-500/30 hover:scale-105 transition-transform"
              >
                {t.landing.cta.button} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}

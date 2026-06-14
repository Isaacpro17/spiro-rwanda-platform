import { type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'
import { Button } from '../../components/ui/button'
import { Reveal } from '../../components/ui/Reveal'
import { Target, Eye, Users, Award, Leaf, ArrowRight } from 'lucide-react'
import { useCountUp } from '../../hooks/useCountUp'
import { useLanguage } from '../../contexts/LanguageContext'

function ImpactStat({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const { ref, display } = useCountUp({ end, suffix, duration: 2200 })
  return (
    <div className="text-center">
      <div
        ref={ref as RefObject<HTMLDivElement>}
        className="text-4xl lg:text-5xl font-bold text-accent-500 mb-2 tabular-nums"
      >
        {display}
      </div>
      <div className="text-gray-200 font-medium">{label}</div>
    </div>
  )
}

const valueIcons = [Users, Award, Leaf]

export function AboutPage() {
  const { t } = useLanguage()
  const a = t.about

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative text-white overflow-hidden py-28 lg:py-36 flex items-center">
        <img
          src="/spiro-motorcycle.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.90] via-primary/[0.82] to-primary/[0.68]" />
        <div className="absolute inset-0 bg-black/[0.12]" />
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #FFE500 0%, transparent 45%), radial-gradient(circle at 80% 70%, #4757C1 0%, transparent 45%)',
          }}
        />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-accent-500/20 border border-accent-500/30 text-accent-300 text-sm font-semibold mb-6">
              <Leaf className="w-4 h-4 mr-2" />
              {a.hero.badge}
            </span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 animate-fade-up delay-100">
            {a.hero.title}
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto animate-fade-up delay-200">
            {a.hero.subtitle}
          </p>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{a.drives.title}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{a.drives.subtitle}</p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-8">
            <Reveal delay={0}>
              <div className="bg-gray-50 border border-gray-100 p-8 rounded-2xl h-full hover:shadow-md transition-shadow duration-300">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{a.drives.mission.title}</h2>
                <p className="text-gray-600 leading-relaxed">{a.drives.mission.body}</p>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="bg-gray-50 border border-gray-100 p-8 rounded-2xl h-full hover:shadow-md transition-shadow duration-300">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <Eye className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{a.drives.vision.title}</h2>
                <p className="text-gray-600 leading-relaxed">{a.drives.vision.body}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Story ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">{a.story.title}</h2>
          </Reveal>
          <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
            <Reveal delay={0}><p>{a.story.p1}</p></Reveal>
            <Reveal delay={100}><p>{a.story.p2}</p></Reveal>
            <Reveal delay={200}><p>{a.story.p3}</p></Reveal>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{a.values.title}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{a.values.subtitle}</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {a.values.items.map((item, i) => {
              const Icon = valueIcons[i]
              return (
                <Reveal key={item.title} delay={i * 150}>
                  <div className="text-center group p-6 rounded-2xl hover:bg-gray-50 transition-colors duration-300">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/15 transition-colors duration-300">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Impact ── */}
      <section className="py-24 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{a.impact.title}</h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">{a.impact.subtitle}</p>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            <Reveal delay={0}>  <ImpactStat end={50}      suffix="+"  label={a.impact.stations} /></Reveal>
            <Reveal delay={100}><ImpactStat end={1200}    suffix="+"  label={a.impact.riders}   /></Reveal>
            <Reveal delay={200}><ImpactStat end={45000}   suffix="+"  label={a.impact.swaps}    /></Reveal>
            <Reveal delay={300}><ImpactStat end={2500000} suffix=""   label={a.impact.co2}      /></Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{a.cta.title}</h2>
            <p className="text-lg text-gray-600 mb-8">{a.cta.subtitle}</p>
            <Link to="/login">
              <Button size="lg" className="px-8 font-bold shadow-lg hover:scale-105 transition-transform">
                {a.cta.button} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}

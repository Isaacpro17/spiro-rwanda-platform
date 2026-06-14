import { Link } from 'react-router-dom'
import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'
import { Button } from '../../components/ui/button'
import { Reveal } from '../../components/ui/Reveal'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'
import { Battery, MapPin, CreditCard, Wrench, Clock, Shield, Zap, ArrowRight } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { LucideIcon } from 'lucide-react'

/* Icons are non-translatable; order matches translation cards array */
const cardIcons: LucideIcon[] = [Battery, MapPin, CreditCard, Wrench, Clock, Shield]

export function ServicesPage() {
  const { t } = useLanguage()
  const s = t.services

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
              <Zap className="w-4 h-4 mr-2" />
              {s.hero.badge}
            </span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 animate-fade-up delay-100">
            {s.hero.title}
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto animate-fade-up delay-200">
            {s.hero.subtitle}
          </p>
        </div>
      </section>

      {/* ── Service Cards ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{s.section.title}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{s.section.subtitle}</p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {s.cards.map((card, i) => {
              const Icon = cardIcons[i]
              return (
                <Reveal key={card.title} delay={i * 80}>
                  <Card className="h-full border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors duration-300">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-gray-600">
                        {card.features.map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0 translate-y-1" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{s.cta.title}</h2>
            <p className="text-lg text-gray-600 mb-8">{s.cta.subtitle}</p>
            <Link to="/login">
              <Button size="lg" className="px-8 font-bold shadow-lg hover:scale-105 transition-transform">
                {s.cta.button} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}

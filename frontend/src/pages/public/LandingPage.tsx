import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'
import { Button } from '../../components/ui/button'
import { Battery, MapPin, Zap, Shield, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import { useCountUp } from '../../hooks/useCountUp'

/* ── Scroll-reveal wrapper ─────────────────────────────────────────────────── */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}ms`
          el.classList.add('is-visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={`scroll-hidden ${className}`}>
      {children}
    </div>
  )
}

/* ── Animated Stat ─────────────────────────────────────────────────────────── */
function StatCard({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const { ref, display } = useCountUp({ end, suffix, duration: 2200 })
  return (
    <div className="text-center group">
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="text-4xl lg:text-5xl font-bold text-primary-600 mb-2 tabular-nums"
      >
        {display}
      </div>
      <div className="text-gray-600 font-medium">{label}</div>
    </div>
  )
}

/* ── LandingPage ───────────────────────────────────────────────────────────── */
export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary via-primary-600 to-primary-800 text-white overflow-hidden min-h-[92vh] flex items-center">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-black/20" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, #FFE500 0%, transparent 50%), radial-gradient(circle at 75% 75%, #4757C1 0%, transparent 50%)',
          }}
        />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left – Text */}
            <div className="space-y-8">
              <div className="animate-fade-up">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-accent-500/20 border border-accent-500/30 text-accent-300 text-sm font-semibold mb-6">
                  <Zap className="w-4 h-4 mr-2" />
                  Rwanda's #1 Electric Mobility Platform
                </span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-tight animate-fade-up delay-100">
                Ride Easy,{' '}
                <span className="text-accent-500 relative">
                  Ride Safe
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
                At Spiro, we enhance livelihoods through sustainable energy — leading Africa's
                large-scale electrification of mobility, one swap at a time.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="accent"
                    className="w-full sm:w-auto text-primary font-bold px-8 shadow-lg shadow-accent-500/30 hover:scale-105 transition-transform"
                  >
                    Get Started <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-white/60 text-white hover:bg-white hover:text-primary backdrop-blur-sm"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6 pt-4 animate-fade-up delay-400">
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Shield className="w-4 h-4 text-accent-400" />
                  Certified Batteries
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Clock className="w-4 h-4 text-accent-400" />
                  Swap in &lt; 2 min
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <MapPin className="w-4 h-4 text-accent-400" />
                  50+ Stations
                </div>
              </div>
            </div>

            {/* Right – Hero Image */}
            <div className="hidden lg:flex items-center justify-center animate-fade-right delay-300">
              <div className="relative">
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-3xl bg-accent-500/20 blur-3xl scale-110" />
                {/* Floating card */}
                <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-float">
                  <img
                    src="/hero.png"
                    alt="Electric motorcycle at Spiro battery swap station"
                    className="w-full h-auto object-cover"
                    loading="eager"
                  />
                  {/* Overlay badge */}
                  <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-500 rounded-full flex items-center justify-center shrink-0">
                      <Battery className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">Battery Swapped!</div>
                      <div className="text-gray-300 text-xs">Fully charged — ready to ride</div>
                    </div>
                    <div className="ml-auto text-accent-400 font-bold text-sm">1:47</div>
                  </div>
                </div>
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
            <StatCard end={50} suffix="+" label="Charging Stations" />
            <StatCard end={1200} suffix="+" label="Active Riders" />
            <StatCard end={45000} suffix="+" label="Monthly Swaps" />
            <StatCard end={98} suffix="%" label="Satisfaction Rate" />
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started with Spiro in three simple steps
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary/30 via-accent-400 to-primary/30" />

            {[
              {
                icon: MapPin,
                title: 'Find a Station',
                desc: 'Locate the nearest battery swap station using our real-time map with live availability.',
                step: '01',
              },
              {
                icon: Battery,
                title: 'Swap Your Battery',
                desc: 'Exchange your depleted battery for a fully charged one in under 2 minutes.',
                step: '02',
              },
              {
                icon: Zap,
                title: 'Ride & Earn',
                desc: 'Get back on the road instantly and maximize your earning potential with zero downtime.',
                step: '03',
              },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 150}>
                <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group relative">
                  <span className="absolute top-6 right-6 text-5xl font-black text-gray-100 group-hover:text-primary-100 transition-colors">
                    {item.step}
                  </span>
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <item.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Why Choose Spiro?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the future of sustainable mobility
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Clock,
                title: 'Fast Swaps',
                desc: 'Complete battery swaps in under 2 minutes',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                icon: Shield,
                title: 'Safe & Reliable',
                desc: 'High-quality batteries with full safety guarantees',
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
              {
                icon: TrendingUp,
                title: 'Cost Effective',
                desc: 'Save up to 60% on fuel costs vs petrol bikes',
                color: 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                icon: Zap,
                title: 'Eco-Friendly',
                desc: 'Zero emissions for a cleaner environment',
                color: 'text-yellow-600',
                bg: 'bg-yellow-50',
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="p-6 border border-gray-200 rounded-2xl hover:border-primary hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-default">
                  <div
                    className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary-600 to-primary-800 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 70% 50%, #FFE500 0%, transparent 60%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Ready to Go Electric?</h2>
            <p className="text-lg text-gray-200 mb-10 max-w-2xl mx-auto">
              Join thousands of riders who have already made the switch to sustainable, affordable
              mobility across Rwanda.
            </p>
            <Link to="/login">
              <Button
                size="lg"
                variant="accent"
                className="text-primary font-bold px-10 shadow-xl shadow-accent-500/30 hover:scale-105 transition-transform"
              >
                Get Started Today <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}

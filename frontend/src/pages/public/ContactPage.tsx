import { useState } from 'react'
import { api } from '../../lib/api'
import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Reveal } from '../../components/ui/Reveal'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { LucideIcon } from 'lucide-react'

/* Icons are non-translatable; order matches translation info.items array */
const contactIcons: LucideIcon[] = [MapPin, Phone, Mail, Clock]

export function ContactPage() {
  const { t } = useLanguage()
  const c = t.contact

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')
    
    try {
      const res = await api.post<{ message: string }>('/contact', formData)
      setSuccessMsg(res.message || 'Your message has been received successfully.')
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to send message. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

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
              <Mail className="w-4 h-4 mr-2" />
              {c.hero.badge}
            </span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 animate-fade-up delay-100">
            {c.hero.title}
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto animate-fade-up delay-200">
            {c.hero.subtitle}
          </p>
        </div>
      </section>

      {/* ── Contact Section ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">

            {/* Left – Contact info */}
            <div>
              <Reveal className="mb-10">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">{c.info.title}</h2>
                <p className="text-gray-500 mt-2">{c.info.subtitle}</p>
              </Reveal>

              <div className="space-y-6">
                {c.info.items.map((item, i) => {
                  const Icon = contactIcons[i]
                  return (
                    <Reveal key={item.title} delay={i * 100}>
                      <div className="flex items-start gap-4 group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-300">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                          {item.lines.map((line) => (
                            <p key={line} className="text-gray-600 text-sm leading-relaxed">{line}</p>
                          ))}
                        </div>
                      </div>
                    </Reveal>
                  )
                })}
              </div>

              <Reveal delay={400}>
                <div className="mt-10 p-6 bg-primary/5 border border-primary/10 rounded-2xl">
                  <h3 className="font-semibold text-gray-900 mb-1">{c.info.emergency.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{c.info.emergency.desc}</p>
                  <p className="text-2xl font-bold text-primary">+250 788 999 999</p>
                </div>
              </Reveal>
            </div>

            {/* Right – Contact form */}
            <Reveal delay={100}>
              <div className="bg-gray-50 border border-gray-100 p-8 rounded-2xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{c.form.title}</h2>
                
                {successMsg && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-lg text-sm">
                    {successMsg}
                  </div>
                )}
                
                {errorMsg && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">{c.form.name}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{c.form.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{c.form.phone}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">{c.form.subject}</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{c.form.message}</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                    {loading ? 'Sending...' : c.form.submit}
                  </Button>
                </form>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

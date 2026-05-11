import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'
import { Battery, MapPin, CreditCard, Wrench, Clock, Shield } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

export function ServicesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">Our Services</h1>
          <p className="text-xl text-gray-100 max-w-3xl mx-auto">
            Comprehensive electric mobility solutions designed for your success
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Battery className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Battery Swap Service</CardTitle>
                <CardDescription>Fast and convenient battery exchange</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Swap in under 2 minutes</li>
                  <li>• 50+ stations across Rwanda</li>
                  <li>• Real-time availability tracking</li>
                  <li>• 24/7 service at major locations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Station Network</CardTitle>
                <CardDescription>Extensive coverage across the country</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Strategic locations</li>
                  <li>• GPS navigation support</li>
                  <li>• Queue management system</li>
                  <li>• Reservation capability</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Flexible Subscriptions</CardTitle>
                <CardDescription>Plans tailored to your needs</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Daily, weekly, monthly plans</li>
                  <li>• Unlimited swap options</li>
                  <li>• Mobile money integration</li>
                  <li>• No hidden fees</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Wrench className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Maintenance Support</CardTitle>
                <CardDescription>Keep your vehicle in top condition</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Regular battery health checks</li>
                  <li>• Technical support team</li>
                  <li>• Emergency assistance</li>
                  <li>• Preventive maintenance</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Real-Time Tracking</CardTitle>
                <CardDescription>Stay informed at all times</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Live station availability</li>
                  <li>• Wait time estimates</li>
                  <li>• Swap history tracking</li>
                  <li>• Usage analytics</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Safety & Quality</CardTitle>
                <CardDescription>Your safety is our priority</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Certified batteries</li>
                  <li>• Regular quality checks</li>
                  <li>• Insurance coverage</li>
                  <li>• Safety training</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of riders who trust Spiro for their daily transportation needs
          </p>
          <a
            href="/login"
            className="inline-block bg-primary text-white px-8 py-3 rounded-md font-semibold hover:bg-primary-600 transition-colors"
          >
            Sign Up Now
          </a>
        </div>
      </section>

      <Footer />
    </div>
  )
}

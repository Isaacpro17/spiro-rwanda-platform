import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'
import { Target, Eye, Users, Award } from 'lucide-react'

export function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">About Spiro Rwanda</h1>
            <p className="text-xl text-gray-100 max-w-3xl mx-auto">
              Leading Africa's electric mobility revolution through sustainable energy solutions
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-gray-50 p-8 rounded-xl">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed">
                To enhance livelihoods across Africa by leading the large-scale electrification of
                mobility through sustainable energy solutions. We are committed to making electric
                transportation accessible, affordable, and reliable for all.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Eye className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-600 leading-relaxed">
                To be Africa's leading provider of electric mobility solutions, creating a cleaner,
                more sustainable future while empowering communities through innovative technology
                and accessible green transportation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Story</h2>
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="mb-4">
              Rwanda has emerged as a continental leader in sustainable development and green
              technology adoption, positioning itself at the forefront of Africa's electric mobility
              revolution. The country's Vision 2050 and Green Growth Strategy emphasize transitioning
              to clean energy solutions and reducing carbon emissions across all sectors.
            </p>
            <p className="mb-4">
              In this transformative landscape, Spiro Rwanda has established itself as a pioneer in
              electric mobility solutions, operating an extensive network of battery swapping and
              charging stations across Kigali and expanding to other urban centers. We provide
              electric motorcycles to riders through flexible ownership and rental models, supported
              by a comprehensive battery swap infrastructure.
            </p>
            <p>
              Our commitment goes beyond just providing vehicles – we're building an ecosystem that
              supports riders, reduces environmental impact, and contributes to Rwanda's sustainable
              development goals. Every battery swap represents a step towards a cleaner, greener future.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Community First</h3>
              <p className="text-gray-600">
                We prioritize the needs of our riders and communities, ensuring accessible and
                reliable service for all.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Excellence</h3>
              <p className="text-gray-600">
                We maintain the highest standards in service delivery, technology, and customer
                support.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Sustainability</h3>
              <p className="text-gray-600">
                Environmental responsibility guides every decision we make, from operations to
                partnerships.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-12 text-center">Our Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-accent-500 mb-2">50+</div>
              <div className="text-gray-100">Charging Stations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent-500 mb-2">1,200+</div>
              <div className="text-gray-100">Active Riders</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent-500 mb-2">45K+</div>
              <div className="text-gray-100">Monthly Swaps</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent-500 mb-2">2.5M</div>
              <div className="text-gray-100">kg CO₂ Saved</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

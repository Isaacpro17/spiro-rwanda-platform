import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'
import { SpiroLogo } from '../ui/SpiroLogo'
import { useLanguage } from '../../contexts/LanguageContext'

export function Footer() {
  const { t } = useLanguage()
  const f = t.footer

  return (
    <footer className="bg-primary-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <SpiroLogo size="sm" />
            </div>
            <p className="text-gray-300 text-sm">
              {f.tagline}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{f.quickLinks}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-accent-500 transition-colors text-sm">
                  {f.linkHome}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-accent-500 transition-colors text-sm">
                  {f.linkAbout}
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-300 hover:text-accent-500 transition-colors text-sm">
                  {f.linkServices}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-accent-500 transition-colors text-sm">
                  {f.linkContact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{f.servicesTitle}</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>{f.serviceBatterySwap}</li>
              <li>{f.serviceCharging}</li>
              <li>{f.serviceSubscription}</li>
              <li>{f.serviceMaintenance}</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{f.contactTitle}</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2 text-sm text-gray-300">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Kigali, Rwanda</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-gray-300">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>+250 788 000 000</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-gray-300">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>info@spiro.rw</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Spiro Rwanda. {f.copyright}</p>
        </div>
      </div>
    </footer>
  )
}

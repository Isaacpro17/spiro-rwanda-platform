import { Link } from 'react-router-dom'
import { Menu, X, Globe } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { SpiroLogo } from '../ui/SpiroLogo'
import { useLanguage } from '../../contexts/LanguageContext'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { t, toggle } = useLanguage()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/">
              <SpiroLogo size="sm" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary transition-colors">
              {t.nav.home}
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-primary transition-colors">
              {t.nav.about}
            </Link>
            <Link to="/services" className="text-gray-700 hover:text-primary transition-colors">
              {t.nav.services}
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-primary transition-colors">
              {t.nav.contact}
            </Link>
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 text-gray-700 hover:text-primary transition-colors text-sm font-medium"
              aria-label="Switch language"
            >
              <Globe className="w-4 h-4" />
              <span>{t.nav.switchTo}</span>
            </button>
            <Link to="/login">
              <Button variant="accent" className="font-semibold">
                {t.nav.login}
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-primary"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              {t.nav.home}
            </Link>
            <Link
              to="/about"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              {t.nav.about}
            </Link>
            <Link
              to="/services"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              {t.nav.services}
            </Link>
            <Link
              to="/contact"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              {t.nav.contact}
            </Link>
            <button
              onClick={() => { toggle(); setIsOpen(false) }}
              className="flex items-center gap-1.5 px-3 py-2 w-full text-left text-gray-700 hover:bg-gray-100 rounded-md text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              <span>{t.nav.switchTo}</span>
            </button>
            <Link
              to="/login"
              className="block px-3 py-2"
              onClick={() => setIsOpen(false)}
            >
              <Button variant="accent" className="w-full">
                {t.nav.login}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

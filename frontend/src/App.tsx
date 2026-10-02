import { lazy, Suspense } from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { CookieConsent } from './components/CookieConsent'
import { RequireShopkeeper } from './components/RequireShopkeeper'
import { RouteErrorBoundary } from './components/RouteErrorBoundary'
import { RouteMetadata } from './components/PageMetadata'
import { useAuth } from './context/AuthContext'

const LoginModal = lazy(() => import('./components/LoginModal').then(({ LoginModal: Component }) => ({ default: Component })))
const Home = lazy(() => import('./pages/Home').then(({ Home: Component }) => ({ default: Component })))
const OfferDetail = lazy(() => import('./pages/OfferDetail').then(({ OfferDetail: Component }) => ({ default: Component })))
const BusinessProfile = lazy(() => import('./pages/BusinessProfile').then(({ BusinessProfile: Component }) => ({ default: Component })))
const SearchPage = lazy(() => import('./pages/Search').then(({ SearchPage: Component }) => ({ default: Component })))
const CategoriesPage = lazy(() => import('./pages/Categories').then(({ CategoriesPage: Component }) => ({ default: Component })))
const SavedPage = lazy(() => import('./pages/Saved').then(({ SavedPage: Component }) => ({ default: Component })))
const LoginPage = lazy(() => import('./pages/Login').then(({ LoginPage: Component }) => ({ default: Component })))
const AccountPage = lazy(() => import('./pages/Account').then(({ AccountPage: Component }) => ({ default: Component })))
const MessagesListPage = lazy(() => import('./pages/Messages').then(({ MessagesListPage: Component }) => ({ default: Component })))
const MessageThreadPage = lazy(() => import('./pages/Messages').then(({ MessageThreadPage: Component }) => ({ default: Component })))
const ListYourBusinessPage = lazy(() => import('./pages/ListYourBusiness').then(({ ListYourBusinessPage: Component }) => ({ default: Component })))
const BusinessSetupPage = lazy(() => import('./pages/shopkeeper/BusinessSetup').then(({ BusinessSetupPage: Component }) => ({ default: Component })))
const BusinessSettingsPage = lazy(() => import('./pages/shopkeeper/BusinessSettings').then(({ BusinessSettingsPage: Component }) => ({ default: Component })))
const ShopkeeperDashboardPage = lazy(() => import('./pages/shopkeeper/Dashboard').then(({ ShopkeeperDashboardPage: Component }) => ({ default: Component })))
const ShopPosterPage = lazy(() => import('./pages/shopkeeper/ShopPoster').then(({ ShopPosterPage: Component }) => ({ default: Component })))
const ShopkeeperOfferListPage = lazy(() => import('./pages/shopkeeper/OfferList').then(({ ShopkeeperOfferListPage: Component }) => ({ default: Component })))
const ShopkeeperOfferFormPage = lazy(() => import('./pages/shopkeeper/OfferForm').then(({ ShopkeeperOfferFormPage: Component }) => ({ default: Component })))
const ShopkeeperCatalogManagerPage = lazy(() => import('./pages/shopkeeper/CatalogManager').then(({ ShopkeeperCatalogManagerPage: Component }) => ({ default: Component })))
const LegalPage = lazy(() => import('./pages/Legal').then(({ LegalPage: Component }) => ({ default: Component })))
const AboutPage = lazy(() => import('./pages/Legal').then(({ AboutPage: Component }) => ({ default: Component })))
const ContactPage = lazy(() => import('./pages/Legal').then(({ ContactPage: Component }) => ({ default: Component })))
const CookiePolicyPage = lazy(() => import('./pages/Legal').then(({ CookiePolicyPage: Component }) => ({ default: Component })))
const NotFoundPage = lazy(() => import('./pages/NotFound').then(({ NotFoundPage: Component }) => ({ default: Component })))

export default function App() {
  const { loginModalOpen } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1">
        <RouteErrorBoundary>
          <Suspense fallback={<div role="status" className="mx-auto max-w-6xl px-4 py-12 text-sm text-ink-soft">Loading page…</div>}>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/offers/:id" element={<OfferDetail />} />
            <Route path="/shops/:id" element={<BusinessProfile />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/list-your-business" element={<ListYourBusinessPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/shopkeeper-terms" element={<LegalPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/messages" element={<MessagesListPage />} />
            <Route path="/account/messages/:id" element={<MessageThreadPage />} />

            <Route path="/dashboard/setup" element={<RequireShopkeeper><BusinessSetupPage /></RequireShopkeeper>} />
            <Route path="/dashboard/settings" element={<RequireShopkeeper><BusinessSettingsPage /></RequireShopkeeper>} />
            <Route path="/dashboard/poster" element={<RequireShopkeeper><ShopPosterPage /></RequireShopkeeper>} />
            <Route path="/dashboard" element={<RequireShopkeeper><ShopkeeperDashboardPage /></RequireShopkeeper>} />
            <Route path="/dashboard/catalog" element={<RequireShopkeeper><ShopkeeperCatalogManagerPage /></RequireShopkeeper>} />
            <Route path="/dashboard/offers" element={<RequireShopkeeper><ShopkeeperOfferListPage /></RequireShopkeeper>} />
            <Route path="/dashboard/offers/new" element={<RequireShopkeeper><ShopkeeperOfferFormPage /></RequireShopkeeper>} />
            <Route path="/dashboard/offers/:id/edit" element={<RequireShopkeeper><ShopkeeperOfferFormPage /></RequireShopkeeper>} />

            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </main>
      <RouteMetadata />
      <footer className="border-t border-border px-4 py-4 pb-24 text-xs text-ink-soft sm:pb-4">
        <nav aria-label="Footer navigation" className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-2">
          <Link to="/about" className="hover:text-teal">About</Link>
          <Link to="/contact" className="hover:text-teal">Contact</Link>
          <Link to="/terms" className="hover:text-teal">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-teal">Privacy Policy</Link>
          <Link to="/cookies" className="hover:text-teal">Cookie Policy</Link>
          <Link to="/shopkeeper-terms" className="hover:text-teal">Shopkeeper & Offer Rules</Link>
        </nav>
      </footer>
      <CookieConsent />
      <BottomNav />
      {loginModalOpen && <Suspense fallback={null}><LoginModal /></Suspense>}
    </div>
  )
}

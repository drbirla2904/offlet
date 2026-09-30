import { Routes, Route } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { LoginModal } from './components/LoginModal'
import { RequireShopkeeper } from './components/RequireShopkeeper'

import { Home } from './pages/Home'
import { OfferDetail } from './pages/OfferDetail'
import { BusinessProfile } from './pages/BusinessProfile'
import { SearchPage } from './pages/Search'
import { CategoriesPage } from './pages/Categories'
import { SavedPage } from './pages/Saved'
import { LoginPage } from './pages/Login'
import { AccountPage } from './pages/Account'
import { MessagesListPage, MessageThreadPage } from './pages/Messages'
import { ListYourBusinessPage } from './pages/ListYourBusiness'

import { BusinessSetupPage } from './pages/shopkeeper/BusinessSetup'
import { BusinessSettingsPage } from './pages/shopkeeper/BusinessSettings'
import { ShopkeeperDashboardPage } from './pages/shopkeeper/Dashboard'
import { ShopkeeperOfferListPage } from './pages/shopkeeper/OfferList'
import { ShopkeeperOfferFormPage } from './pages/shopkeeper/OfferForm'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/offers/:id" element={<OfferDetail />} />
          <Route path="/shops/:id" element={<BusinessProfile />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/list-your-business" element={<ListYourBusinessPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/messages" element={<MessagesListPage />} />
          <Route path="/account/messages/:id" element={<MessageThreadPage />} />

          <Route path="/dashboard/setup" element={<RequireShopkeeper><BusinessSetupPage /></RequireShopkeeper>} />
          <Route path="/dashboard/settings" element={<RequireShopkeeper><BusinessSettingsPage /></RequireShopkeeper>} />
          <Route path="/dashboard" element={<RequireShopkeeper><ShopkeeperDashboardPage /></RequireShopkeeper>} />
          <Route path="/dashboard/offers" element={<RequireShopkeeper><ShopkeeperOfferListPage /></RequireShopkeeper>} />
          <Route path="/dashboard/offers/new" element={<RequireShopkeeper><ShopkeeperOfferFormPage /></RequireShopkeeper>} />
          <Route path="/dashboard/offers/:id/edit" element={<RequireShopkeeper><ShopkeeperOfferFormPage /></RequireShopkeeper>} />

          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <BottomNav />
      <LoginModal />
    </div>
  )
}

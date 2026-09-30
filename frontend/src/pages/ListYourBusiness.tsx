import { Link } from 'react-router-dom'

export function ListYourBusinessPage() {
  return (
    <div className="pb-20">
      <section className="bg-ink text-white px-6 py-16 text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-bold max-w-2xl mx-auto leading-tight">
          Turn Your Local Offers Into Real Customers.
        </h1>
        <p className="text-white/70 mt-4 max-w-xl mx-auto">
          Create an offer in seconds. Reach nearby customers. Increase store visits and sell faster.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Link to="/" className="bg-white text-ink rounded-full px-6 py-3 text-sm font-semibold">Find Offers</Link>
          <Link to="/login" className="bg-marigold text-white rounded-full px-6 py-3 text-sm font-semibold">List Your Business</Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 grid sm:grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-semibold text-teal uppercase tracking-wide">For Customers</p>
          <h2 className="font-display text-2xl font-semibold text-ink mt-1">Discover great deals near you.</h2>
          <p className="text-sm text-ink-soft mt-2">No account needed to browse. Open the app, pick your area, and see what's on offer right now.</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-marigold uppercase tracking-wide">For Shopkeepers</p>
          <h2 className="font-display text-2xl font-semibold text-ink mt-1">Create offers and attract nearby customers.</h2>
          <p className="text-sm text-ink-soft mt-2">Publish an offer in under a minute, turn it on, and start getting calls and store visits today.</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="font-display text-2xl font-semibold text-ink text-center mb-8">How it works</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-semibold text-ink-soft mb-3">Customer</p>
            <ol className="space-y-2 text-sm text-ink">
              <li>1. Choose Location</li>
              <li>2. Discover Offers</li>
              <li>3. Contact / Visit Shop</li>
            </ol>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-soft mb-3">Shopkeeper</p>
            <ol className="space-y-2 text-sm text-ink">
              <li>1. Create Offer</li>
              <li>2. Turn It ON</li>
              <li>3. Get Customers</li>
            </ol>
          </div>
        </div>
        <div className="text-center mt-10">
          <Link to="/login" className="bg-marigold text-white rounded-full px-8 py-3 text-sm font-semibold">List Your Business — it's free</Link>
        </div>
      </section>
    </div>
  )
}

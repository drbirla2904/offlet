import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react'

type LegalSection = { title: string; paragraphs?: string[]; bullets?: string[] }

const policyVersion = '2026-10-02'

const policies: Record<string, { title: string; intro: string; sections: LegalSection[] }> = {
  '/terms': {
    title: 'Terms of Service',
    intro: 'These terms cover access to OFFlet, including browsing local shops, creating an account, and interacting with listings.',
    sections: [
      { title: 'The service', paragraphs: ['OFFlet helps people discover local businesses and their offers. Unless a page clearly says otherwise, OFFlet is a discovery and listing platform, not the seller of goods or services shown by a shop.', 'Purchases, payment, delivery, warranties, returns, and other transaction terms are agreed directly between the customer and the shop. OFFlet does not take payment, hold funds, or guarantee that a listing or shop is available.'] },
      { title: 'Accounts and access', paragraphs: ['Sign-in uses a one-time code sent to your phone. Keep access to your phone secure and do not share verification codes. You are responsible for activity carried out through your account and for keeping your account details accurate.', 'You must be legally able to enter into these terms in your jurisdiction. Do not create an account using another person’s phone number or impersonate another person or business.'] },
      { title: 'Using listings', paragraphs: ['Listings are provided by shops. Confirm availability, final price, eligibility, and any conditions with the shop before travelling or purchasing. Display order, distance, and recommendations are informational and may change as shop data changes.', 'We may correct, limit visibility of, or remove content that is inaccurate, unsafe, unlawful, infringing, or otherwise violates these terms or applicable law. We may suspend access where needed to protect users or the service.'] },
      { title: 'Acceptable use', paragraphs: ['You may not use OFFlet to deceive customers, manipulate reviews or engagement, scrape or disrupt the service, upload malicious content, infringe another person’s rights, or promote unlawful or restricted goods or services. You may not attempt to access another user’s account or private data.'] },
      { title: 'Content and changes', paragraphs: ['You retain rights to content you submit. You give OFFlet permission to host, display, resize, and distribute that content as needed to operate and promote your listing within the service. You must have the rights and permissions needed to submit it.', 'We may update features or these terms. Material changes will be reflected here with a new version date. Continued use after an updated version takes effect means you accept the updated terms, subject to any consent required by law.'] },
      { title: 'Availability and liability', paragraphs: ['We work to keep the service useful and available, but do not promise uninterrupted access, error-free listings, or a particular business result. To the extent permitted by law, OFFlet is not responsible for disputes or losses arising from a transaction between a customer and a shop, or from inaccurate shop-supplied information.', 'Nothing in these terms limits rights or remedies that cannot legally be excluded.'] },
    ],
  },
  '/privacy': {
    title: 'Privacy Policy',
    intro: 'This notice explains what information OFFlet uses to provide local discovery, accounts, shop listings, and platform safety.',
    sections: [
      { title: 'Information we use', paragraphs: ['Depending on how you use OFFlet, information may include your phone number, display name, account role, optional email, shop profile and contact details, offers, reviews, reports, messages, and support communications.', 'For browsing and service operation, OFFlet may process a guest identifier, saved preferences, search terms, viewed offers, favorites, follows, interactions such as calls or directions, and technical request and security logs.', 'If you grant location permission or choose to use your location, your browser provides coordinates. OFFlet uses them to sort or filter nearby shops and offers. You can deny permission and browse by the available city or location settings.'] },
      { title: 'How information is used', bullets: ['Send OTPs and secure account access.', 'Display shop profiles, offers, reviews, and user-selected public business contact details.', 'Provide nearby discovery, saved items, follows, messaging, notifications, and shop analytics.', 'Prevent abuse, investigate reports, maintain security, and operate and improve the service.'] },
      { title: 'What is public', paragraphs: ['Shop names, categories, descriptions, addresses, business phone numbers, opening hours, logos, photos, and published offers are shown to the public as part of a shop listing. Do not place private personal information in a public listing.', 'Customer phone numbers and private account details are not displayed on public shop or offer pages. Messages are visible to their conversation participants and authorized service operators as needed for support, safety, or legal obligations.'] },
      { title: 'Service providers and external links', paragraphs: ['OFFlet uses service providers for hosting, database, object storage, security, and SMS delivery. They process information only as needed to provide their services under the operator’s configuration and applicable agreements.', 'If you open a directions link, the selected maps provider receives the destination and may process it under its own privacy policy. OFFlet does not embed a paid Google Maps API for distance calculations.'] },
      { title: 'Storage, retention, and security', paragraphs: ['Information is stored in the browser, platform databases, and configured service providers as required for the features you use. OTPs expire after five minutes and are single-use; associated records may remain according to the service operator’s configured retention schedule. Usage events support shop analytics and platform safety.', 'The operator should retain information only as long as needed for the stated purposes, legal obligations, dispute handling, and security, and should apply a documented deletion and backup-retention schedule. No internet service can guarantee absolute security.'] },
      { title: 'Your choices and requests', paragraphs: ['You can decline browser location permission, edit available profile details, and stop using the service. Depending on your jurisdiction, you may have rights to access, correct, delete, restrict, or object to certain processing. Contact the service operator using the support contact published with the service to make a privacy request.', 'The service is not designed for children who cannot legally use it. Do not submit a child’s personal information.'] },
      { title: 'Policy changes', paragraphs: ['This notice may change as the service or legal requirements change. The version date above identifies the notice currently presented for acceptance.'] },
    ],
  },
  '/shopkeeper-terms': {
    title: 'Shopkeeper & Offer Rules',
    intro: 'These additional rules apply when you create a business profile or publish offers on OFFlet. You must accept the current version before managing shop listings.',
    sections: [
      { title: 'Your shop account', paragraphs: ['You must be authorized to represent the business and keep its name, category, address, service area, phone number, WhatsApp number, and opening hours accurate and current. Do not create listings for a business you do not own or have authority to represent.', 'Keep your OTP and account access private. Tell the platform operator promptly if you believe someone has accessed your shop account without permission.'] },
      { title: 'Offer accuracy and fulfilment', bullets: ['Use truthful titles, descriptions, photos, prices, discount claims, stock levels, eligibility, and start/end dates.', 'The listed shop must honor a valid offer as presented, subject to clearly stated conditions and applicable consumer law.', 'Update or turn off an offer promptly if its price, stock, availability, or terms change. Do not use a low price or unavailable product to attract customers and substitute a different deal.', 'Do not misrepresent “original” prices, savings, endorsements, scarcity, or customer reviews.'] },
      { title: 'Prohibited listings', paragraphs: ['Do not list unlawful, counterfeit, stolen, unsafe, recalled, regulated, or otherwise prohibited goods or services. Do not publish discriminatory, fraudulent, misleading, or infringing content. You are responsible for checking applicable advertising, consumer-protection, product-safety, tax, and licensing rules.'] },
      { title: 'Images and business materials', paragraphs: ['You must own or have permission to use logos, product photos, certificates, and other material you upload. Do not upload payment-card data, identity documents, or sensitive personal information into a public profile or offer. Verification documents are submitted only through the designated verification process.'] },
      { title: 'Customer transactions and contact', paragraphs: ['Customers contact and transact with shops directly. You are responsible for answering enquiries, honoring stated terms, handling payment, fulfilment, returns, refunds, warranties, and complaints, and complying with law. OFFlet does not act as your agent, collect payment, or guarantee customer visits or sales.', 'Use customer information obtained through OFFlet only to respond to the customer’s request and complete a related transaction. Do not sell it, add it to unrelated marketing lists, or share it without a lawful basis and any required consent.'] },
      { title: 'Moderation and enforcement', paragraphs: ['OFFlet may review, limit, reject, or remove listings, and may suspend or close accounts for inaccurate, unsafe, unlawful, or repeatedly non-compliant content. You can turn off an offer at any time. Legal acceptance may be required again when these rules change materially.', 'These rules supplement the Terms of Service and Privacy Policy. If they conflict, applicable law controls; otherwise, the more specific shopkeeper rule applies to your listings.'] },
    ],
  },
}

export function LegalPage() {
  const { pathname } = useLocation()
  const policy = policies[pathname] || policies['/terms']

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-7 sm:pt-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal"><ArrowLeft size={16} /> Back to OFFlet</Link>
      <header className="mt-6 border-b border-border pb-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-teal"><ShieldCheck size={15} /> OFFlet policies · version {policyVersion}</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold text-ink sm:text-4xl">{policy.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">{policy.intro}</p>
        <nav aria-label="Legal documents" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <Link to="/terms" className="text-teal hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="text-teal hover:underline">Privacy Policy</Link>
          <Link to="/shopkeeper-terms" className="text-teal hover:underline">Shopkeeper & Offer Rules</Link>
        </nav>
      </header>
      <div className="grid gap-8 pt-7 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="h-fit border-b border-border pb-4 lg:sticky lg:top-24 lg:border-b-0 lg:border-l lg:pl-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">On this page</p>
          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {policy.sections.map((section, index) => <a key={section.title} href={`#section-${index + 1}`} className="shrink-0 py-1 text-sm text-ink-soft hover:text-teal">{section.title}</a>)}
          </div>
        </nav>
        <article className="max-w-3xl divide-y divide-border border-y border-border">
          {policy.sections.map((section, index) => (
            <section id={`section-${index + 1}`} key={section.title} className="scroll-mt-24 py-6">
              <h2 className="font-display text-xl font-semibold text-ink">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-ink-soft">{paragraph}</p>)}
              {section.bullets && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-ink-soft">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
            </section>
          ))}
        </article>
      </div>
      <p className="mt-8 max-w-3xl border-l-2 border-amber bg-amber-soft/50 py-3 pl-4 text-xs leading-relaxed text-ink-soft">These documents are an operational draft based on the current OFFlet feature set, not legal advice. Have qualified counsel review them for your operating jurisdictions, business model, and consumer/data-protection obligations before launch.</p>
      <Link to="/" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-teal">Return to browsing <ArrowUpRight size={15} /></Link>
    </div>
  )
}
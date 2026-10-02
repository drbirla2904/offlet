import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface Metadata {
  title: string
  description: string
  pathname: string
  noIndex?: boolean
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = content
}

export function applyPageMetadata({ title, description, pathname, noIndex = false }: Metadata) {
  const canonicalUrl = new URL(pathname, window.location.origin).toString()
  const previewImage = new URL('/icons/icon-512.png', window.location.origin).toString()

  document.title = title
  setMeta('name', 'description', description)
  setMeta('name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow')
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:site_name', 'OFFlet')
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', canonicalUrl)
  setMeta('property', 'og:image', previewImage)
  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', previewImage)

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.append(canonical)
  }
  canonical.href = canonicalUrl
}

function routeMetadata(pathname: string): Metadata {
  const route = pathname.replace(/\/$/, '') || '/'
  const privateRoute = /^\/(account|saved|login|dashboard)(\/|$)/.test(route)
  const known: Record<string, Omit<Metadata, 'pathname'>> = {
    '/': { title: 'OFFlet | Local offers near you', description: 'Discover current offers from local shops. Browse nearby deals and connect directly with businesses.' },
    '/search': { title: 'Search local offers | OFFlet', description: 'Search local shops, products, categories, and current offers.', noIndex: true },
    '/categories': { title: 'Shop categories | OFFlet', description: 'Explore local businesses and offers by category.' },
    '/list-your-business': { title: 'List your business | OFFlet', description: 'Create a shop profile and share accurate local offers with nearby customers.' },
    '/terms': { title: 'Terms of Service | OFFlet', description: 'Terms for using the OFFlet local discovery platform.' },
    '/privacy': { title: 'Privacy Policy | OFFlet', description: 'How OFFlet uses account, location, listing, and service information.' },
    '/cookies': { title: 'Cookies and device storage | OFFlet', description: 'How OFFlet uses essential browser storage and cookies.' },
    '/shopkeeper-terms': { title: 'Shopkeeper and offer rules | OFFlet', description: 'Rules for accurate shop profiles and offers listed on OFFlet.' },
    '/about': { title: 'About OFFlet', description: 'OFFlet helps customers discover local businesses and current offers.' },
    '/contact': { title: 'Contact OFFlet', description: 'Contact information for OFFlet customer and shopkeeper support.' },
  }

  if (privateRoute) {
    return { title: 'Your account | OFFlet', description: 'Manage your OFFlet account and shop workspace.', pathname: route, noIndex: true }
  }
  if (route.startsWith('/shops/')) {
    return { title: 'Local shop | OFFlet', description: 'Shop details, location, reviews, and current offers on OFFlet.', pathname: route }
  }
  if (route.startsWith('/offers/')) {
    return { title: 'Local offer | OFFlet', description: 'Offer details from a local business on OFFlet.', pathname: route }
  }
  const page = known[route]
  if (page) return { ...page, pathname: route }
  return { title: 'Page not found | OFFlet', description: 'The requested OFFlet page could not be found.', pathname: route, noIndex: true }
}

export function RouteMetadata() {
  const { pathname } = useLocation()
  const metadata = routeMetadata(pathname)

  useEffect(() => {
    applyPageMetadata(metadata)
  }, [metadata.title, metadata.description, metadata.pathname, metadata.noIndex])

  return null
}
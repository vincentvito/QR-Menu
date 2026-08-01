import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, isLocale } from './locales'

// `requestLocale` carries the explicit locale a caller asked for, e.g.
// `getTranslations({ locale })` when a cron job renders a scheduled email in
// the restaurant's language. It must win over the cookie — a cron request has
// no cookies, so ignoring it silently renders every email in English.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = isLocale(requested) ? requested : await localeFromCookie()

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})

async function localeFromCookie() {
  const store = await cookies()
  const cookieLocale = store.get('locale')?.value
  return isLocale(cookieLocale) ? cookieLocale : defaultLocale
}

import type { MetadataRoute } from 'next'

// PWA manifest — modest but real. Gives Qtable a branded install
// experience if a restaurant owner "Add to home screen"s the dashboard.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Qtable',
    short_name: 'Qtable',
    description:
      'Turn your printed menu into a beautiful mobile page and a QR code for your tables.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F2E7',
    theme_color: '#1A1E17',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}

import type { TemplateCategoryGroup, TemplateItem } from '@/components/menu/templates/types'

// Compact demo menu used ONLY for template previews in Settings. Never
// shown to customers. Mixes photo/no-photo dishes, a badge, and a special
// so each template shows off its handling of all states.

// Unsplash direct thumbnails — small width param keeps payload tiny.
const PHOTO = (id: string) => `https://images.unsplash.com/${id}?w=400&h=400&fit=crop`

const DEMO_ITEMS: TemplateItem[] = [
  {
    id: 'demo-1',
    category: 'Starters',
    name: 'Burrata & heirloom tomato',
    description: 'Creamy burrata, sun-ripened tomatoes, basil oil, sea salt.',
    price: 14,
    tags: ['V'],
    badges: ['chefs-pick'],
    imageUrl: PHOTO('photo-1551248429-40975aa4de74'),
  },
  {
    id: 'demo-2',
    category: 'Starters',
    name: 'Charred padrón peppers',
    description: 'Blistered padróns, flaky salt, aioli.',
    price: 9,
    tags: ['V', 'GF'],
    badges: [],
    imageUrl: null,
  },
  {
    id: 'demo-3',
    category: 'Mains',
    name: 'Tagliatelle al ragú',
    description: 'Hand-cut pasta, slow-braised beef ragú, pecorino.',
    price: 22,
    tags: [],
    badges: ['best-seller'],
    imageUrl: PHOTO('photo-1621996346565-e3dbc646d9a9'),
  },
  {
    id: 'demo-4',
    category: 'Mains',
    name: 'Grilled branzino',
    description: 'Whole Mediterranean sea bass, lemon, herbs, olive oil.',
    price: 32,
    tags: ['GF'],
    badges: ['signature'],
    imageUrl: PHOTO('photo-1467003909585-2f8a72700288'),
  },
  {
    id: 'demo-5',
    category: 'Desserts',
    name: 'Basque cheesecake',
    description: 'Burnt top, creamy center, salted caramel drizzle.',
    price: 11,
    tags: [],
    badges: [],
    imageUrl: PHOTO('photo-1565958011703-44f9829ba187'),
  },
  {
    id: 'demo-6',
    category: 'Desserts',
    name: 'Espresso affogato',
    description: 'Vanilla gelato drowned in a shot of espresso.',
    price: 8,
    tags: ['V'],
    badges: ['new'],
    imageUrl: null,
  },
]

export const DEMO_SPECIAL_IDS = ['demo-3']

export const DEMO_GROUPS: TemplateCategoryGroup[] = (() => {
  const order: string[] = []
  const map = new Map<string, TemplateItem[]>()
  for (const item of DEMO_ITEMS) {
    if (!map.has(item.category)) {
      map.set(item.category, [])
      order.push(item.category)
    }
    map.get(item.category)!.push(item)
  }
  return order.map((category, i) => ({
    id: `demo-cat-${i}`,
    category,
    items: map.get(category)!,
  }))
})()

export const DEMO_SPECIALS: TemplateItem[] = DEMO_ITEMS.filter((it) =>
  DEMO_SPECIAL_IDS.includes(it.id),
)

export const DEMO_SYMBOL = '$'

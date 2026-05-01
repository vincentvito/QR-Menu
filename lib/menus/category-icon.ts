import {
  Apple,
  Baby,
  Beef,
  Beer,
  BookOpen,
  Cake,
  Carrot,
  ChefHat,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  Egg,
  Fish,
  Flame,
  GlassWater,
  Grape,
  Ham,
  IceCream,
  Leaf,
  Martini,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Sparkles,
  Sprout,
  Star,
  Sunrise,
  Utensils,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import { CheeseIcon } from '@/components/icons/CheeseIcon'

export const CATEGORY_ICON_OPTIONS = [
  { id: 'utensils-crossed', label: 'Fork & knife', icon: UtensilsCrossed },
  { id: 'utensils', label: 'Utensils', icon: Utensils },
  { id: 'chef-hat', label: 'Chef hat', icon: ChefHat },
  { id: 'book-open', label: 'Menu', icon: BookOpen },
  { id: 'coffee', label: 'Coffee', icon: Coffee },
  { id: 'wine', label: 'Wine', icon: Wine },
  { id: 'beer', label: 'Beer', icon: Beer },
  { id: 'martini', label: 'Cocktail', icon: Martini },
  { id: 'cup-soda', label: 'Soda', icon: CupSoda },
  { id: 'glass-water', label: 'Beverage', icon: GlassWater },
  { id: 'citrus', label: 'Juice', icon: Citrus },
  { id: 'pizza', label: 'Pizza', icon: Pizza },
  { id: 'sandwich', label: 'Sandwich', icon: Sandwich },
  { id: 'soup', label: 'Soup', icon: Soup },
  { id: 'salad', label: 'Salad', icon: Salad },
  { id: 'fish', label: 'Fish', icon: Fish },
  { id: 'beef', label: 'Steak', icon: Beef },
  { id: 'drumstick', label: 'Chicken', icon: Drumstick },
  { id: 'ham', label: 'Charcuterie', icon: Ham },
  { id: 'egg', label: 'Eggs', icon: Egg },
  { id: 'cake', label: 'Dessert', icon: Cake },
  { id: 'ice-cream', label: 'Ice cream', icon: IceCream },
  { id: 'cookie', label: 'Cookie', icon: Cookie },
  { id: 'croissant', label: 'Bakery', icon: Croissant },
  { id: 'apple', label: 'Fruit', icon: Apple },
  { id: 'carrot', label: 'Sides', icon: Carrot },
  { id: 'leaf', label: 'Vegetarian', icon: Leaf },
  { id: 'sprout', label: 'Healthy', icon: Sprout },
  { id: 'flame', label: 'Spicy', icon: Flame },
  { id: 'star', label: 'Popular', icon: Star },
  { id: 'sparkles', label: 'Seasonal', icon: Sparkles },
  { id: 'baby', label: 'Kids', icon: Baby },
  { id: 'sunrise', label: 'Breakfast', icon: Sunrise },
  { id: 'grape', label: 'Grape', icon: Grape },
  { id: 'cheese', label: 'Cheese', icon: CheeseIcon },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon }>

export type CategoryIconId = (typeof CATEGORY_ICON_OPTIONS)[number]['id']

const CATEGORY_ICON_IDS = new Set<string>(CATEGORY_ICON_OPTIONS.map((option) => option.id))
const CATEGORY_ICON_BY_ID = new Map<CategoryIconId, LucideIcon>(
  CATEGORY_ICON_OPTIONS.map((option) => [option.id, option.icon]),
)

/*
 * Category -> icon. Rules are checked in order, first match wins, so put the
 * most specific patterns first. Covers common restaurant vocabulary in
 * English + Italian + Spanish + French + German + Japanese/romanized Asian.
 */
const RULES: Array<{ test: RegExp; icon: CategoryIconId }> = [
  // Meals of the day
  {
    test: /\b(breakfast|brunch|morning|colazione|desayuno|petit dejeuner|fruhstuck)\b/,
    icon: 'sunrise',
  },
  { test: /\b(kids?|children|ninos|bambini|enfants|kinder)\b/, icon: 'baby' },

  // Specific drinks
  {
    test: /\b(coffee|espresso|latte|cappuccino|americano|macchiato|cafe|cafeteria|kaffee|koffie)\b/,
    icon: 'coffee',
  },
  { test: /\b(tea|matcha|chai|the)\b/, icon: 'coffee' },
  {
    test: /\b(wine|vino|vin|wein|rose|rosado|champagne|champan|prosecco|sparkling|cava)\b/,
    icon: 'wine',
  },
  {
    test: /\b(beer|cerveza|birra|biere|bier|lager|ale|ipa|stout|pilsner|cider|sidra)\b/,
    icon: 'beer',
  },
  {
    test: /\b(cocktail|mixed drink|martini|gin|whisk|whiskey|bourbon|vodka|tequila|mezcal|rum|ron|spirit)\b/,
    icon: 'martini',
  },
  { test: /\b(soda|pop|coke|refresco|bebida gaseosa|gaseosa|seltzer)\b/, icon: 'cup-soda' },
  { test: /\b(juice|jugo|zumo|succo|jus)\b/, icon: 'citrus' },
  { test: /\b(smoothie|shake|batido)\b/, icon: 'glass-water' },
  {
    test: /\b(drink|beverage|bebida|bebidas|boisson|boissons|getrank|getraenke|apero|aperitivo|aperitif)\b/,
    icon: 'glass-water',
  },

  // Sweet stuff
  { test: /\b(ice ?cream|gelato|helado|glace|eis|sorbet)\b/, icon: 'ice-cream' },
  { test: /\b(cookie|biscuit|galleta|biscotti)\b/, icon: 'cookie' },
  { test: /\b(pastry|pastries|croissant|bakery|viennoiserie|panaderia)\b/, icon: 'croissant' },
  {
    test: /\b(dessert|desserts|postre|postres|dolci|dolce|nachspeise|nachtisch|sweet|sweets|tart|brownie|cake|torta|tiramisu|pudding|flan)\b/,
    icon: 'cake',
  },

  // Fruit-ish / vegetarian-forward sections
  { test: /\b(fruit|frutta|fruta|obst)\b/, icon: 'apple' },
  { test: /\b(vegan|veg(etarian)?|vegetal|verdure|vegano|plant based|plantbased)\b/, icon: 'leaf' },
  { test: /\b(healthy|light|saludable|fresh)\b/, icon: 'sprout' },

  // Specific savory
  { test: /\b(pizza|flatbread|focaccia)\b/, icon: 'pizza' },
  {
    test: /\b(sandwich|panini|wrap|sub|hoagie|burger|hamburger|bap|bocadillo|torta)\b/,
    icon: 'sandwich',
  },
  { test: /\b(soup|broth|bisque|chowder|ramen|pho|zuppa|sopa|potage|brodo)\b/, icon: 'soup' },
  { test: /\b(salad|insalata|ensalada|salade|salat|bowl|poke|greens)\b/, icon: 'salad' },
  { test: /\b(sushi|sashimi|maki|nigiri|uramaki|temaki|hand roll)\b/, icon: 'fish' },
  {
    test: /\b(seafood|fish|pescado|pesce|poisson|shellfish|oyster|ostras|shrimp|gambas|lobster|langosta|crab|cangrejo|squid|calamar|mussel|clam)\b/,
    icon: 'fish',
  },
  {
    test: /\b(chicken|pollo|poulet|huhn|hahnchen|wing|drumstick|fried chicken)\b/,
    icon: 'drumstick',
  },
  { test: /\b(ham|prosciutto|jamon|charcuter|embutido|salumi)\b/, icon: 'ham' },
  { test: /\b(egg|huevo|uovo|oeuf|omelet|frittata|tortilla espanola)\b/, icon: 'egg' },
  {
    test: /\b(steak|grill|bbq|barbec|beef|lamb|cordero|pork|cerdo|ribs|costilla|chop|carne|carnes|meat|viande|fleisch)\b/,
    icon: 'beef',
  },

  // Mexican
  {
    test: /\b(taco|tacos|burrito|quesadilla|enchilada|tostada|nachos|tamale|tamales|fajita|guacamole|salsa|chilaquiles|pozole|mole)\b/,
    icon: 'sandwich',
  },

  // Asian (non-sushi)
  {
    test: /\b(noodle|noodles|udon|soba|yakisoba|pad thai|laksa|lo mein|chow mein|mee|mian)\b/,
    icon: 'utensils-crossed',
  },
  {
    test: /\b(dim sum|bao|baozi|dumpling|gyoza|jiaozi|wonton|siu mai)\b/,
    icon: 'utensils-crossed',
  },
  {
    test: /\b(curry|biryani|tandoori|tikka|masala|naan|dosa|chana|dal|kebab|kabob|shawarma|falafel|hummus)\b/,
    icon: 'flame',
  },
  {
    test: /\b(donburi|yakitori|tempura|tofu|onigiri|teriyaki|izakaya)\b/,
    icon: 'utensils-crossed',
  },

  // Pasta / rice
  {
    test: /\b(pasta|spaghetti|linguine|fettuccine|penne|rigatoni|ravioli|lasagna|lasagne|gnocchi|carbonara|bolognese|primi)\b/,
    icon: 'utensils-crossed',
  },
  {
    test: /\b(risotto|rice|arroz|riso|riz|paella|bibimbap|fried rice)\b/,
    icon: 'utensils-crossed',
  },

  // Callouts
  {
    test: /\b(special|signature|chef|recommend|feature|featured|most popular|popular|favorito|preferito)\b/,
    icon: 'star',
  },
  { test: /\b(new|seasonal|limited|edition|saison|stagione|temporada)\b/, icon: 'sparkles' },

  // Structural sections (late so they lose to specific food rules)
  {
    test: /\b(starter|appetizer|appetiser|antipasti|entree|entrada|entrant|hors d oeuvre|tapas|tapa|racion|raciones|snack|nibble|vorspeise|aperitivo)\b/,
    icon: 'utensils',
  },
  {
    test: /\b(side|sides|contorn|contorno|guarnicion|beilage|accompagnement)\b/,
    icon: 'carrot',
  },
  {
    test: /\b(main|mains|secondi|plato fuerte|plato principal|plats?|hauptgericht|hoofdgerecht|segundo|principal|dinner|lunch|course|plate)\b/,
    icon: 'utensils-crossed',
  },
  { test: /\b(cheese|formaggi|queso|fromage|kase)\b/, icon: 'cheese' },
  { test: /\b(bread|pan|pane|brot|pain|focaccia)\b/, icon: 'croissant' },
]

// Stable per-name fallback. The hash picks from a small neutral-icon
// rotation so unmatched categories still look varied.
const FALLBACK: CategoryIconId[] = [
  'utensils-crossed',
  'utensils',
  'chef-hat',
  'book-open',
  'grape',
  'flame',
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isCategoryIconId(value: unknown): value is CategoryIconId {
  return typeof value === 'string' && CATEGORY_ICON_IDS.has(value)
}

export function categoryIconById(id: CategoryIconId): LucideIcon {
  return CATEGORY_ICON_BY_ID.get(id) ?? UtensilsCrossed
}

export function categoryIconId(name: string, overrideId?: string): CategoryIconId {
  if (isCategoryIconId(overrideId)) return overrideId

  const normalized = normalize(name)
  if (!normalized) return 'utensils-crossed'
  for (const rule of RULES) {
    if (rule.test.test(normalized)) return rule.icon
  }
  return FALLBACK[hashString(normalized) % FALLBACK.length]
}

export function categoryIcon(name: string, overrideId?: string): LucideIcon {
  return categoryIconById(categoryIconId(name, overrideId))
}

export function parseCategoryIconOverrides(value: unknown): Record<string, CategoryIconId> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const icons: Record<string, CategoryIconId> = {}
  for (const [name, iconId] of Object.entries(value)) {
    const trimmed = name.trim().slice(0, 80)
    if (trimmed && isCategoryIconId(iconId)) {
      icons[trimmed] = iconId
    }
  }
  return icons
}

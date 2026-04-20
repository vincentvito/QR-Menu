import {
  Apple,
  Baby,
  Beef,
  Beer,
  BookOpen,
  Cake,
  Carrot,
  ChefHat,
  Cherry,
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

/*
 * Category → icon. Rules are checked in order, first match wins, so put the
 * most specific patterns first. Covers common restaurant vocabulary in
 * English + Italian + Spanish + French + German + Japanese/romanized Asian.
 */
const RULES: Array<{ test: RegExp; icon: LucideIcon }> = [
  // Meals of the day
  {
    test: /\b(breakfast|brunch|morning|colazione|desayuno|petit dejeuner|fruhstuck)\b/,
    icon: Sunrise,
  },
  { test: /\b(kids?|children|ninos|bambini|enfants|kinder)\b/, icon: Baby },

  // Specific drinks
  {
    test: /\b(coffee|espresso|latte|cappuccino|americano|macchiato|cafe|cafeteria|kaffee|koffie)\b/,
    icon: Coffee,
  },
  { test: /\b(tea|matcha|chai|the)\b/, icon: Coffee },
  {
    test: /\b(wine|vino|vin|wein|rose|rosado|champagne|champan|prosecco|sparkling|cava)\b/,
    icon: Wine,
  },
  {
    test: /\b(beer|cerveza|birra|biere|bier|lager|ale|ipa|stout|pilsner|cider|sidra)\b/,
    icon: Beer,
  },
  {
    test: /\b(cocktail|mixed drink|martini|gin|whisk|whiskey|bourbon|vodka|tequila|mezcal|rum|ron|spirit)\b/,
    icon: Martini,
  },
  { test: /\b(soda|pop|coke|refresco|bebida gaseosa|gaseosa|seltzer)\b/, icon: CupSoda },
  { test: /\b(juice|jugo|zumo|succo|jus)\b/, icon: Citrus },
  { test: /\b(smoothie|shake|batido)\b/, icon: GlassWater },
  {
    test: /\b(drink|beverage|bebida|bebidas|boisson|boissons|getrank|getraenke|apero|aperitivo|aperitif)\b/,
    icon: GlassWater,
  },

  // Sweet stuff
  { test: /\b(ice ?cream|gelato|helado|glace|eis|sorbet)\b/, icon: IceCream },
  { test: /\b(cookie|biscuit|galleta|biscotti)\b/, icon: Cookie },
  { test: /\b(pastry|pastries|croissant|bakery|viennoiserie|panaderia)\b/, icon: Croissant },
  {
    test: /\b(dessert|desserts|postre|postres|dolci|dolce|nachspeise|nachtisch|sweet|sweets|tart|brownie|cake|torta|tiramisu|pudding|flan)\b/,
    icon: Cake,
  },

  // Fruit-ish / vegetarian-forward sections
  { test: /\b(fruit|frutta|fruta|obst)\b/, icon: Apple },
  { test: /\b(vegan|veg(etarian)?|vegetal|verdure|vegano|plant based|plantbased)\b/, icon: Leaf },
  { test: /\b(healthy|light|saludable|fresh)\b/, icon: Sprout },

  // Specific savory
  { test: /\b(pizza|flatbread|focaccia)\b/, icon: Pizza },
  {
    test: /\b(sandwich|panini|wrap|sub|hoagie|burger|hamburger|bap|bocadillo|torta)\b/,
    icon: Sandwich,
  },
  { test: /\b(soup|broth|bisque|chowder|ramen|pho|zuppa|sopa|potage|brodo)\b/, icon: Soup },
  { test: /\b(salad|insalata|ensalada|salade|salat|bowl|poke|greens)\b/, icon: Salad },
  { test: /\b(sushi|sashimi|maki|nigiri|uramaki|temaki|hand roll)\b/, icon: Fish },
  {
    test: /\b(seafood|fish|pescado|pesce|poisson|shellfish|oyster|ostras|shrimp|gambas|lobster|langosta|crab|cangrejo|squid|calamar|mussel|clam)\b/,
    icon: Fish,
  },
  {
    test: /\b(chicken|pollo|poulet|huhn|hahnchen|wing|drumstick|fried chicken)\b/,
    icon: Drumstick,
  },
  { test: /\b(ham|prosciutto|jamon|charcuter|embutido|salumi)\b/, icon: Ham },
  { test: /\b(egg|huevo|uovo|oeuf|omelet|frittata|tortilla espanola)\b/, icon: Egg },
  {
    test: /\b(steak|grill|bbq|barbec|beef|lamb|cordero|pork|cerdo|ribs|costilla|chop|carne|carnes|meat|viande|fleisch)\b/,
    icon: Beef,
  },

  // Mexican
  {
    test: /\b(taco|tacos|burrito|quesadilla|enchilada|tostada|nachos|tamale|tamales|fajita|guacamole|salsa|chilaquiles|pozole|mole)\b/,
    icon: Sandwich,
  },

  // Asian (non-sushi)
  {
    test: /\b(noodle|noodles|udon|soba|yakisoba|pad thai|laksa|lo mein|chow mein|mee|mian)\b/,
    icon: UtensilsCrossed,
  },
  { test: /\b(dim sum|bao|baozi|dumpling|gyoza|jiaozi|wonton|siu mai)\b/, icon: UtensilsCrossed },
  {
    test: /\b(curry|biryani|tandoori|tikka|masala|naan|dosa|chana|dal|kebab|kabob|shawarma|falafel|hummus)\b/,
    icon: Flame,
  },
  { test: /\b(donburi|yakitori|tempura|tofu|onigiri|teriyaki|izakaya)\b/, icon: UtensilsCrossed },

  // Pasta / rice
  {
    test: /\b(pasta|spaghetti|linguine|fettuccine|penne|rigatoni|ravioli|lasagna|lasagne|gnocchi|carbonara|bolognese|primi)\b/,
    icon: UtensilsCrossed,
  },
  { test: /\b(risotto|rice|arroz|riso|riz|paella|bibimbap|fried rice)\b/, icon: UtensilsCrossed },

  // Callouts
  {
    test: /\b(special|signature|chef|recommend|feature|featured|most popular|popular|favorito|preferito)\b/,
    icon: Star,
  },
  { test: /\b(new|seasonal|limited|edition|saison|stagione|temporada)\b/, icon: Sparkles },

  // Structural sections (late so they lose to specific food rules)
  {
    test: /\b(starter|appetizer|appetiser|antipasti|entree|entrada|entrant|hors d oeuvre|tapas|tapa|racion|raciones|snack|nibble|vorspeise|aperitivo)\b/,
    icon: Utensils,
  },
  { test: /\b(side|sides|contorn|contorno|guarnicion|beilage|accompagnement)\b/, icon: Carrot },
  {
    test: /\b(main|mains|secondi|plato fuerte|plato principal|plats?|hauptgericht|hoofdgerecht|segundo|principal|dinner|lunch|course|plate)\b/,
    icon: UtensilsCrossed,
  },
  { test: /\b(cheese|formaggi|queso|fromage|kase)\b/, icon: Cherry },
  { test: /\b(bread|pan|pane|brot|pain|focaccia)\b/, icon: Croissant },
]

// Stable per-name fallback — hash the normalized name to pick from a small
// neutral-icon rotation so unmatched categories still look varied.
const FALLBACK: LucideIcon[] = [UtensilsCrossed, Utensils, ChefHat, BookOpen, Grape, Flame]

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

export function categoryIcon(name: string): LucideIcon {
  const normalized = normalize(name)
  if (!normalized) return UtensilsCrossed
  for (const rule of RULES) {
    if (rule.test.test(normalized)) return rule.icon
  }
  return FALLBACK[hashString(normalized) % FALLBACK.length]
}

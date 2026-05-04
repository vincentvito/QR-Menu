// Pure prompt builders — no SDK imports — so they're cheap to unit-test and
// can be exercised without Gemini credentials.

export interface DishContext {
  name: string
  category: string
  description: string
  extraContext?: string
}

type Archetype =
  | 'food'
  | 'cocktail'
  | 'beer-wine'
  | 'hot-coffee'
  | 'iced-drink'
  | 'dessert'
  | 'pastry'

const CATEGORY_MAP: Array<[RegExp, Archetype]> = [
  [/cocktail|spirit|mixolog|mocktail/i, 'cocktail'],
  [/wine|beer|brew|ale|lager|stout|ipa|champagne|prosecco|sangria/i, 'beer-wine'],
  [/coffee|espresso|caf[eé]/i, 'hot-coffee'],
  [/smoothie|juice|shake|frapp|slush|iced/i, 'iced-drink'],
  [/dessert|ice cream|gelato|sorbet|helado/i, 'dessert'],
  [/pastr|bakery|bread|viennoiserie|panader/i, 'pastry'],
]

const NAME_KEYWORDS: Array<[RegExp, Archetype]> = [
  // Iced/cold first — they often share words with hot drinks ("iced latte").
  [/\b(iced|cold brew|frapp|frappuccino|smoothie|milkshake|shake|slushie?|frozen|granita|horchata)\b/i, 'iced-drink'],
  [/\b(latte|cappuccino|espresso|macchiato|mocha|americano|flat white|cortado|chai|matcha latte|hot chocolate|cocoa|t[eé]|tea)\b/i, 'hot-coffee'],
  [/\b(martini|negroni|old fashioned|margarita|mojito|manhattan|spritz|highball|whiskey sour|whisky sour|sour|daiquiri|caipirinha|paloma|cosmopolitan|bellini|mimosa|sangria|cocktail|gin( and)? tonic|g&t)\b/i, 'cocktail'],
  [/\b(beer|ipa|lager|stout|ale|pilsner|porter|wine|ros[eé]|champagne|prosecco|cava|cider)\b/i, 'beer-wine'],
  [/\b(croissant|danish|muffin|scone|donut|doughnut|bagel|brioche|focaccia|baguette|sourdough|empanada|concha)\b/i, 'pastry'],
  [/\b(ice cream|gelato|sorbet|cake|pie|tart|brownie|tiramisu|cheesecake|pudding|mousse|flan|crepe|cr[eè]pe|waffle|pancake|churro|tres leches)\b/i, 'dessert'],
]

function detectArchetype(name: string, category: string): Archetype {
  const cat = category.trim()
  if (cat) {
    for (const [pattern, archetype] of CATEGORY_MAP) {
      if (pattern.test(cat)) return archetype
    }
  }
  const n = name.trim()
  if (n) {
    for (const [pattern, archetype] of NAME_KEYWORDS) {
      if (pattern.test(n)) return archetype
    }
  }
  return 'food'
}

const BASE_HEADER = `You are a world-class commercial photographer producing hero imagery for a restaurant menu. The customer sees this and immediately wants to order. The image must feel alive, fresh, and crave-worthy — not a quiet editorial still life.

Pick the right treatment for the subject below. Bright, intentional, high-contrast craft. Indistinguishable from a top-tier DSLR shot — never AI-rendered, plastic, or cartoon.`

const BASE_FOOTER = `TECHNICAL UNIVERSALS:
- Tack-sharp focus on the hero element with gentle fall-off into the edges
- Shallow-to-moderate depth of field, never aggressively blurred
- Clean, accurate color — no green/blue/magenta casts on the subject
- Polished post: appetizing saturation one notch beyond "natural", subtle contrast lift
- Indistinguishable from a professional DSLR or medium-format shot

DO NOT PRODUCE:
- 3D-rendered, CGI, cartoon, illustration, or stylized looks
- Cluttered backgrounds, hands, faces, people, multiple subjects in one frame
- Text, logos, signatures, watermarks, prices, or numbers in the image
- HDR halos, gradient filters, Instagram presets, or fake bokeh
- Plastic-looking surfaces, cartoon edges, or other AI tells`

const FOOD_BRIEF = `SUBJECT: PLATED FOOD.

GOAL — APPETITE APPEAL FIRST:
Every shot must feel alive, fresh out of the kitchen, styled at its peak moment. Think Bon Appétit Test Kitchen hero shots, Uber Eats premium thumbnails, and high-end menu photography — food rendered so persuasively it triggers hunger.

AESTHETIC — BRIGHT COMMERCIAL FOOD PHOTOGRAPHY:
Warm, inviting, high-contrast daylight. Bright but rich — crisp whites, deep shadows that shape the food, glowing highlights where light catches sauce, oil, or glass. Not clinical, not moody-dark-restaurant, not flat-Instagram. Polished, generous, crave-worthy.

APPETITE CUES — SHOW, DON'T HIDE (highest priority):
- Glisten and shine on sauces, oils, glazes, melted cheese, butter, syrup
- Fresh just-plated energy: rising steam on hot dishes, condensation on cold
- Textures that tell the story: crispy edges, grill marks, sear crust, caramelization, bubbling cheese, flaky pastry, juicy pink meat interior, runny yolks, crumb, char
- Garnish placed with intent — herbs vivid green and fresh, citrus juicy and faceted, seasoning visibly crystalline where it should be
- Sauces pouring, pooling, or spooned with movement frozen at its peak
- Colors at their best: meats rich and juicy, vegetables saturated and crisp, breads deeply golden, greens electric, fruits luminous

COMPOSITION:
- Default to OVERHEAD (top-down flat-lay) for plated dishes — bowls, pastas, curries, salads, boards, pizzas, fish, breakfast plates, rice dishes, tapas, stews. Close-crop so the dish is the hero, not a tiny object on a big table.
- Use a 30–45° three-quarter angle for vertical architecture: layered burgers, sandwich stacks, towering breakfast plates, waffle stacks — anything where the layers and height matter.
- Dish fills the frame confidently, tight enough that texture is readable. Slight overhang of sauce or garnish past the plate edge feels natural and premium.

SURFACES & PROPS:
One complementary surface that flatters the dish — dark slate, rich walnut, aged oak, matte black stone, linen, marble, pale ceramic. Darker, richer surfaces often make food pop more than pale ones. Props restrained but intentional: one sprig of fresh herb, linen napkin edge, a smear of sauce trailing off the plate, a single utensil, a wedge of lemon, a small dish of something complementary. Minimal but not empty.

LIGHTING:
Large soft key light from one side (mimicking a big window) plus a gentle fill. Shape the food with shadow, don't flatten it. Highlights glow on glossy surfaces. Drop shadows grounded but not heavy. Slightly warm color temperature. Never flash-lit. Never dim or moody.

AVOID:
- Dark moody restaurant lighting or flat fluorescent lighting
- Dull, muted, under-seasoned-looking food
- Greasy, unattractive, over-sauced messes
- Perfectly geometric "food pyramid" stacking that looks artificial`

const COCKTAIL_BRIEF = `SUBJECT: COCKTAIL / MIXED DRINK.

GOAL — LIQUID SEDUCTION:
Treat this as a magazine-cover hero shot for a craft cocktail menu. The drink should look luminous and intentional — the kind of image that makes someone close the menu and order it on sight. Think Punch, Imbibe, Difford's Guide editorial — confident, moody, expensive.

COMPOSITION & ANGLE:
- Front-on hero shot at eye-level, or a touch below eye-level for a heroic feel.
- Never overhead, never flat-lay — the glass profile is the architecture.
- Single glass dead-center or rule-of-thirds with intent. The glass occupies most of the vertical frame — generous headroom is wasted space.
- Choose glassware that fits the drink: coupe, martini, rocks, highball, Nick & Nora, copper mug, hurricane, snifter — and render it accurately with crisp specular highlights along the rim and edges.

ATMOSPHERE — BACKBAR MOOD:
Darker complementary background — deep charcoal, smoked walnut, dim-lit backbar, soft chiaroscuro. A subtle warm bokeh of bottles, hanging stemware, or amber backlight is welcome. Avoid pure white seamless. The drink should feel like it's sitting in a real bar at golden hour.

LIQUID & GARNISH — THE STORY:
- The liquid color glows from within — backlight or rim-light catching it so highballs look amber, negronis look ruby, gin sours look pearlescent, blue drinks look electric, espresso martinis show foam-and-bean architecture.
- Ice rendered convincingly: clear large cubes or spheres for spirit-forward, crushed for tropical, no cloudy fake ice.
- Garnish placed with intent: expressed citrus peel with visible oils, perfect olive on a pick, brandied cherry, mint sprig with crisp leaves, edible flower, dehydrated citrus wheel, cinnamon stick, salt or sugar rim sharp and even.
- For shaken drinks: a delicate foam crown on the surface. For carbonated builds: a fine column of bubbles rising.
- Cold glassware shows light condensation — a few droplets, not a downpour.

LIGHTING:
Dramatic side or rim lighting that backlights the liquid. A second small accent light shapes the glass edge. Strong specular highlights, deep shadow on the opposite side. The mood is intentional — moody but readable, never murky.

AVOID:
- Overhead angles, top-down shots, flat-lay
- Pure white seamless studio backgrounds
- Plastic-looking ice, cartoon bubbles, oversaturated cartoon colors
- Cluttered bar tops with multiple drinks, hands holding the glass, straws when not appropriate to the drink
- Daylight kitchen lighting — this is a bar, not a brunch table`

const BEER_WINE_BRIEF = `SUBJECT: BEER OR WINE.

GOAL — GLASSWARE AS ARCHITECTURE:
Hero the glass like a portrait. Beer should look freshly poured with retained head; wine should look swirled and alive. Editorial calm, never fussy.

COMPOSITION & ANGLE:
- Front-on at eye-level. Single glass, dead-center or rule-of-thirds.
- Beer: tall pint, stein, tulip, weizen, or snifter — choose to fit the style described.
- Wine: appropriate stemware (Bordeaux, Burgundy, flute, coupe). Slight tilt of the glass is fine if it lets the liquid show legs.

LIGHTING & MOOD:
- Beer: warm amber or honey backlight that makes the liquid glow from behind, with crisp specular highlights catching the foam and rim.
- Wine: gentler side-rim light, deeper moody background. Reds glow garnet at the edges, whites read pale gold, rosés shimmer pink, sparkling shows a fine vertical bead column.

THE STORY:
- Beer: head retention with believable foam texture (creamy for stout, bright white for pilsner, lacing on the inside of the glass), tiny rising bubbles in the body, light condensation on cold styles.
- Wine: surface meniscus catching light, faint legs descending the inside, crystal cleanness — no fingerprints, no smudges.
- A minimal companion if it helps: a single barley head or hop cone for beer; a small wedge of cheese, a few grapes, or a bare cork for wine. Restraint over abundance.

BACKGROUND & SURFACE:
Dark wood bar top, slate, or aged stone. Soft bokeh of taps, casks, or cellar shelving in the distance. Never bright kitchen daylight. Never seamless white.

AVOID:
- Multiple glasses, paired bottles in frame, hands or pourers
- Foam that looks like shaving cream, cartoon bubbles
- Wine glasses that are obviously empty or filled to the brim — proper service level
- Flat overhead angles`

const HOT_COFFEE_BRIEF = `SUBJECT: HOT COFFEE OR HOT SPECIALTY DRINK (latte, cappuccino, espresso, mocha, hot chocolate, chai, matcha latte, tea).

GOAL — CAFÉ MORNING:
A specialty-café hero shot. Warm, inviting, the visual equivalent of the first sip. Think Stumptown, Blue Bottle, La Marzocco editorial.

COMPOSITION & ANGLE:
- Three-quarter angle (about 30–40° down from horizontal) is the strongest — it shows both the surface of the drink AND the silhouette of the cup.
- A tight overhead is also acceptable when the surface IS the story (latte art, perfect crema, dusted cocoa pattern).
- Single ceramic cup with saucer — no paper to-go cups unless the description explicitly calls for one. Choose cup style for the drink: small espresso demitasse, cappuccino cup, latte bowl, glass mug for layered drinks.

THE STORY — SURFACE TEXTURE FIRST:
- Espresso: thick hazelnut-brown crema with fine bubbles, the dark liquid below just visible at the meniscus.
- Latte / cappuccino: crisp latte art (heart, rosetta, tulip) in clean contrasting micro-foam — never blurry, never blob-shaped.
- Mocha / hot chocolate: glossy chocolate sheen, optional cocoa dusting, possibly a small dollop of cream or marshmallow.
- Tea / matcha: surface clarity, color truthful (matcha = vibrant jade green, never army-green), gentle steam wisp.
- Steam: faint, curling, just visible against the darker background — never thick like fog.

LIGHTING & MOOD:
Warm window daylight from the side, soft and directional. A whisper of shadow on the opposite side of the cup. Color temperature warm but not orange. The drink reads inviting, never harsh.

SURFACES & PROPS:
Aged wood, marble, soft linen, or pale concrete countertop. Restrained companions: a single coffee bean or two, a teaspoon resting on the saucer, a small biscotti, a folded linen — never a cluttered breakfast spread.

BACKGROUND:
Soft warm bokeh suggesting a café — wood shelves, an espresso machine silhouette, hanging cups out of focus. Or a clean warm wall. Never moody-bar-dark, never sterile-white.

AVOID:
- To-go paper cups (unless explicitly described)
- Foam that looks like shaving cream or fake whipped topping
- Latte art that's blurry, asymmetric, or AI-melted
- Excessive steam that reads as fog
- Cold-bar moody darkness — this is a café, not a cocktail lounge`

const ICED_DRINK_BRIEF = `SUBJECT: COLD / ICED / BLENDED DRINK (iced coffee, cold brew, smoothie, milkshake, frappé, slush, lemonade, iced tea, frozen cocktail).

GOAL — REFRESHMENT MADE VISIBLE:
The viewer should feel thirsty. Cold, vivid, generous. Sweat on the glass, ice you can hear clinking, color that pops against a bright surface.

COMPOSITION & ANGLE:
- Front-on hero shot at eye-level. The tall glass IS the architecture — generous vertical framing.
- Single drink dead-center or rule-of-thirds. Tight crop so the glass dominates the frame.
- Glassware: tall highball, mason jar, hurricane, milkshake glass, footed sundae, or stemmed coupe for frozen cocktails — match the drink.

THE STORY — COLD AS A VERB:
- Heavy beaded condensation running down the glass with a few real droplets at the base.
- Ice rendered convincingly — large clear cubes, spheres, crushed, or pebble — depending on the drink. Never cloudy, never plastic.
- For layered drinks (iced lattes, ombré lemonades, sunrise cocktails): the layers read as distinct stripes of color, with a believable mixing zone where they meet.
- For smoothies / shakes: thick textured surface with the topping treated as a still-life — berries, granola, chia, mint, whipped cream swirl, drizzle, sprinkle, cookie shard, straw. Color of the drink glows.
- A natural straw or stirrer placed with intent — paper, glass, or metal — never sticking out at an awkward angle.
- For pouring or splash shots: motion frozen at its peak, droplets visible.

LIGHTING & MOOD:
Bright, summery side daylight. Crisp specular highlights on the glass and ice. Slight warm-cool contrast (warm light, cool drink) makes the cold read. Never moody-dark.

SURFACES & PROPS:
Pale wood, white marble, terrazzo, woven placemat, sun-bright counter. A wedge of citrus, a few berries, a sprig of mint, a folded straw wrapper — restrained.

BACKGROUND:
Soft bright bokeh of a bright kitchen, terrace, or counter. Optional accents like sliced fruit on a board behind, slightly out of focus.

AVOID:
- Plastic-looking ice, cartoon bubbles
- Overhead angles (the glass profile and ice are the story)
- Moody-bar darkness — this is daylight and refreshment
- Whipped cream that looks like shaving cream
- Multiple glasses or a cluttered table`

const DESSERT_BRIEF = `SUBJECT: DESSERT (cake, tart, ice cream, gelato, mousse, pudding, tiramisu, cheesecake, brownie, churro, crepe, waffle, pancake, flan).

GOAL — INDULGENCE MADE VISIBLE:
A dessert hero that reads decadent at a glance. Glossy, layered, generous — the kind of shot that makes someone order it for the table.

COMPOSITION & ANGLE:
- Plated round desserts (mousse, pudding, single scoop, tart): overhead works, but a 30° three-quarter often shows more.
- Layered or vertical desserts (cake slices, parfaits, tiramisu, sundaes, waffle stacks): 30–45° three-quarter angle so layers, drizzle, and toppings all read.
- One serving, one plate, dead-centered or rule-of-thirds.

THE STORY — RICHNESS AND TEXTURE:
- Glossy ganache or chocolate sheen catching highlights
- Sauce drizzle that pools at the base of the dessert with intentional movement
- Powdered sugar dusting visible as fine particles, not a heavy snow
- Berries or fruit garnish faceted and saturated, possibly with a bead of moisture
- Ice cream / gelato: visible texture, melt just beginning at the edges, a single drip earned not forced
- Cream / whipped cream as a confident swirl with peaks, never shaving-cream foam
- Crumb structure visible on cakes and brownies — moist, dense, real
- Steam off warm desserts (molten cakes, churros, waffles)

LIGHTING & MOOD:
Soft directional daylight from one side that shapes the dessert with gentle shadow. Slightly warm color temperature for warm desserts; cooler and crisper for frozen. The mood is intimate and inviting, never harsh, never dim.

SURFACES & PROPS:
Pale ceramic, slate, marble, dark walnut, linen. A single fork or spoon resting nearby, a few berries scattered with intent, a sprig of mint — restrained. The dessert is the protagonist.

AVOID:
- Multiple desserts in frame, busy bakery-case backgrounds
- Cartoon-perfect frosting that looks fake
- Geometric stacking that looks artificial
- Flat overhead shots of layered desserts that hide the layers
- Dim moody lighting — this should feel celebratory`

const PASTRY_BRIEF = `SUBJECT: PASTRY OR BAKERY ITEM (croissant, danish, muffin, scone, donut, bagel, brioche, focaccia, baguette, sourdough, empanada, concha).

GOAL — JUST OUT OF THE OVEN:
A bakery-window hero shot. Golden, flaky, warm. The viewer should smell butter.

COMPOSITION & ANGLE:
- 30–45° three-quarter angle for laminated and layered pastries (croissants, danishes, brioche) — the lamination layers and glossy crust are the story.
- Overhead works for round flat items (cookies, focaccia, conchas, donuts) and for arrangements where the surface pattern matters.
- Single piece, or a tight arrangement of two-three pieces if the description suggests sharing — never a sprawling tray.

THE STORY — TEXTURE AND CRUST:
- Lamination visible as crisp distinct flakes, especially on cross-sections
- Glossy egg-wash sheen on golden tops, catching warm highlights
- Sugar crystals or flaky-salt finish rendered as discrete particles, not blurred
- Crumb structure visible where the pastry breaks open — open, airy, alive
- Steam off freshly baked items — gentle, just visible
- Glaze that catches light: cinnamon roll glaze pooling in the spirals, donut glaze with a glossy meniscus
- Garnish with intent: a dusting of powdered sugar, a smear of jam, a curl of butter on the side, a few berries

LIGHTING & MOOD:
Warm bakery daylight from one side. Strong directional light with soft fill picks out the lamination and crust without harsh shadows. Color temperature warm-honey, never cool.

SURFACES & PROPS:
Linen napkin, parchment paper, wood cutting board, cooling rack, marble counter, brown butcher paper. A small pot of jam, a butter knife, a few coffee beans nearby — restrained, suggestive of a bakery counter.

AVOID:
- Cluttered pastry-case backgrounds
- Multiple varieties piled together
- Pastries that look uniform and machine-made — they should feel hand-laminated
- Cool blue light or sterile-white seamless
- Cartoon-perfect frosting`

const ARCHETYPE_BRIEFS: Record<Archetype, string> = {
  food: FOOD_BRIEF,
  cocktail: COCKTAIL_BRIEF,
  'beer-wine': BEER_WINE_BRIEF,
  'hot-coffee': HOT_COFFEE_BRIEF,
  'iced-drink': ICED_DRINK_BRIEF,
  dessert: DESSERT_BRIEF,
  pastry: PASTRY_BRIEF,
}

export const GENERATE_INSTRUCTIONS = `Create this exactly as described — accurate to its ingredients, components, and preparation. Do not invent garnishes, sides, or props that aren't supported by the description. One subject, one serving, one frame.`

export const ENHANCE_INSTRUCTIONS = `The provided image IS the subject. Re-photograph it in the aesthetic described above.

PRESERVE ABSOLUTELY (non-negotiable):
- The exact subject — same recipe, same ingredients, same components visible
- Plating / serving style and the arrangement of every element
- Number of items, garnishes, and their visible colors
- The subject's identity — same dish, same drink, same glass shape, same garnish count
- The subject's footprint on the surface

CHANGE ONLY THE PHOTOGRAPHY:
- Re-angle to the angle the brief above prescribes for this subject type
- Swap the background/surface for a clean complementary one matching the brief's mood
- Re-shape the lighting to match the brief
- Elevate colors subtly — appetizing, not oversaturated
- Sharpen focus on the hero element
- Remove distracting background objects, clutter, hands, faces, or other servings

If the source image is blurry, dark, or low-quality, recover the subject faithfully — don't invent what isn't there, but interpret what IS there with professional clarity.`

function buildDirectionLine(extra: string | undefined): string {
  const trimmed = extra?.trim()
  if (!trimmed) return ''
  // Mounted high in the prompt with an explicit weight statement so the model
  // treats it as creative direction, not as a polite footnote it can ignore.
  return `DIRECTION FROM THE MENU OWNER: ${trimmed}
Let this shape mood, props, garnish, and styling decisions. It must NOT override the technical photography rules below (sharpness, lighting craft, no text/logos, no AI artifacts), but it SHOULD steer the creative choices.`
}

function buildDishBlock(dish: DishContext): string {
  const lines: string[] = [
    `SUBJECT NAME: "${dish.name.trim()}"`,
    `MENU CATEGORY: ${dish.category.trim() || 'Other'}`,
  ]
  const desc = dish.description.trim()
  if (desc) lines.push(`DESCRIPTION: ${desc}`)
  return lines.join('\n')
}

function buildPrompt(dish: DishContext, mode: 'generate' | 'enhance'): string {
  const archetype = detectArchetype(dish.name, dish.category)
  const direction = buildDirectionLine(dish.extraContext)
  const instruction = mode === 'generate' ? GENERATE_INSTRUCTIONS : ENHANCE_INSTRUCTIONS
  return [
    BASE_HEADER,
    direction,
    ARCHETYPE_BRIEFS[archetype],
    BASE_FOOTER,
    buildDishBlock(dish),
    instruction,
  ]
    .filter((block) => block.length > 0)
    .join('\n\n')
}

export function buildGeneratePrompt(dish: DishContext): string {
  return buildPrompt(dish, 'generate')
}

export function buildEnhancePrompt(dish: DishContext): string {
  return buildPrompt(dish, 'enhance')
}

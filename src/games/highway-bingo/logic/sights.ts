/**
 * The things you can spot on the road, one list per pack and version.
 *
 * FROZEN ONCE SHIPPED. Every phone works out its card from the code, so changing a
 * shipped list (adding, removing, rewording or reordering a sight) changes every card
 * for the same code, and two phones on different versions of the site would disagree.
 * To change a pack, add a new version (HIGHWAY_V2 with its own code words in
 * `editions.ts`) and keep the old one working. A test pins each shipped list.
 */

/** How often you'd see it: every card gets the same number of each. */
export type Tier = "easy" | "medium" | "rare";

export const TIERS: readonly Tier[] = ["easy", "medium", "rare"];

export type Sight = {
  /** Stable name, for tests and saves. */
  id: string;
  emoji: string;
  /** 2–4 words, short enough for a square on a phone. */
  label: string;
  tier: Tier;
};

/** The longest label a square fits in big enough type. */
export const MAX_LABEL = 20;
/** The longest word: a longer one would break in the middle on a small phone. */
export const MAX_WORD = 9;

type Row = readonly [id: string, emoji: string, label: string];

function tier(name: Tier, rows: readonly Row[]): Sight[] {
  return rows.map(([id, emoji, label]) => ({ id, emoji, label, tier: name }));
}

/** Highway, version 1 (shipped 2026-11-21). Don't edit: add HIGHWAY_V2 instead. */
export const HIGHWAY_V1: readonly Sight[] = Object.freeze([
  ...tier("easy", [
    ["horn-ok-please", "🚚", "Horn OK Please"],
    ["nimbu-mirchi", "🍋", "Nimbu-mirchi"],
    ["triple-seat", "🏍️", "Triple seat bike"],
    ["cow-divider", "🐄", "Cow on the divider"],
    ["chai-tapri", "☕", "Chai tapri"],
    ["toll-booth", "🎫", "Toll booth"],
    ["auto-rickshaw", "🛺", "Auto-rickshaw"],
    ["packed-bus", "🚌", "Packed state bus"],
    ["sleeping-dog", "🐕", "Sleeping dog"],
    ["petrol-pump", "⛽", "Petrol pump"],
    ["punjab-dhaba", "🍛", "Dhaba named Punjab"],
    ["overloaded-truck", "🚛", "Truck piled high"],
    ["yellow-digger", "🏗️", "Yellow digger"],
    ["road-work", "🚧", "Road work ahead"],
    ["painted-truck", "🎨", "Painted truck art"],
    ["sugarcane-juice", "🥤", "Ganna juice"],
    ["coconut-stall", "🥥", "Coconut stall"],
    ["milestone", "📍", "Yellow milestone"],
    ["speed-breaker", "〰️", "Speed breaker"],
    ["river-bridge", "🌉", "River bridge"],
    ["roof-bags", "🧳", "Bags on the roof"],
    ["tempo-traveller", "🚐", "Tempo traveller"],
    ["banyan", "🌳", "Big banyan tree"],
    ["billboard", "🪧", "Giant hoarding"],
    ["family-restaurant", "🍽️", "Pure Veg sign"],
    ["puncture-repair", "🔧", "Puncture repair"],
    ["buffalo-herd", "🐃", "Buffalo herd"],
    ["tractor", "🚜", "Tractor on highway"],
    ["painted-wall", "🧱", "Painted wall ad"],
  ]),
  ...tier("medium", [
    ["tractor-music", "🔊", "Tractor with music"],
    ["goats", "🐐", "Goats crossing"],
    ["bullock-cart", "🐂", "Bullock cart"],
    ["monkey", "🐒", "Monkey by the road"],
    ["water-tanker", "🚰", "Water tanker"],
    ["auto-line", "😄", "Funny line on auto"],
    ["misspelled-sign", "🔤", "Sign with a typo"],
    ["charpai-nap", "🛏️", "Nap on a charpai"],
    ["use-dipper", "🔦", "Use Dipper at Night"],
    ["bhutta", "🌽", "Bhutta on coals"],
    ["watermelons", "🍉", "Melons by the road"],
    ["balloon-seller", "🎈", "Balloon seller"],
    ["kulfi-cart", "🍦", "Kulfi cart"],
    ["mango-stall", "🥭", "Mango stall"],
    ["pickup-ride", "🛻", "People in a pickup"],
    ["plane", "✈️", "Plane overhead"],
    ["railway-crossing", "🛤️", "Railway crossing"],
    ["train", "🚆", "Train racing us"],
    ["hens", "🐓", "Hens by the road"],
    ["kids-waving", "👋", "Kids waving at you"],
    ["loaded-bicycle", "🚲", "Loaded bicycle"],
    ["hay-truck", "🌾", "Truck full of hay"],
    ["brick-kiln", "🏭", "Brick kiln chimney"],
    ["hill-temple", "🛕", "Temple on a hill"],
    ["mustard-fields", "🌼", "Mustard fields"],
    ["three-scripts", "🔠", "Sign in 3 scripts"],
    ["clay-pots", "🏺", "Clay pot stall"],
    ["car-carrier", "🚗", "Truck carrying cars"],
    ["school-bus", "🚸", "Yellow school bus"],
    ["white-trees", "🌲", "White-painted trees"],
    ["sheep", "🐑", "Flock of sheep"],
    ["roadside-barber", "💈", "Roadside barber"],
  ]),
  ...tier("rare", [
    ["camel-cart", "🐪", "Camel cart"],
    ["elephant", "🐘", "Elephant on the road"],
    ["peacock", "🦚", "Peacock in a field"],
    ["wedding-band", "🎺", "Wedding band"],
    ["flower-car", "💐", "Flower-decked car"],
    ["rainbow", "🌈", "Rainbow in the sky"],
    ["kites", "🪁", "Kites in the sky"],
    ["village-fair", "🎡", "Village fair"],
    ["dhaba-statue", "🗽", "Giant dhaba statue"],
    ["ducks", "🦆", "Ducks in a pond"],
    ["wind-turbines", "🌬️", "Wind turbines"],
    ["solar-farm", "☀️", "Solar panel farm"],
    ["horse", "🐎", "Horse on the road"],
    ["hill-fort", "🏰", "Fort on a hill"],
    ["rain", "🌧️", "Rain on the glass"],
  ]),
]);

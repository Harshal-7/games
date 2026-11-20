/**
 * Questions mode: question pairs. Everyone's card asks one question of a pair, the
 * imposter's asks the other, and nobody is told which they got. Both questions of a pair
 * take the same kind of answer over a similar range, so the odd answer is believable
 * until the real question is shown. Either question can be the crew's. Every question is
 * unique across the list; a pair's first question doubles as its id.
 *
 * House rules: easy, desi-flavoured, family-safe. Nothing about weight, looks, money,
 * religion, politics or relationships, and only light roasting.
 */

/** How everyone answers: a number, 1 to 5 fingers, pointing at someone, or out of 10. */
export type AnswerKind = "number" | "scale" | "point" | "ten";

export type PackId = "daily" | "food" | "phone" | "people" | "travel" | "school" | "films" | "whatif";

/** [kind, one question, the other question] */
export type PairEntry = readonly [kind: AnswerKind, a: string, b: string];

export type Pack = { id: PackId; label: string; emoji: string; pairs: readonly PairEntry[] };

export const PACKS: readonly Pack[] = [
  {
    id: "daily",
    label: "Everyday life",
    emoji: "🏠",
    pairs: [
      ["number", "How many hours do you sleep?", "How many cousins do you have?"],
      ["number", "How many alarms do you set in the morning?", "How many times do you hit snooze?"],
      ["scale", "How much of a morning person are you?", "How tidy is your room?"],
      ["ten", "Rate your singing", "Rate your whistling"],
      ["point", "Who takes the longest to get ready?", "Who has the loudest laugh?"],
      ["number", "How many glasses of water do you drink a day?", "How many times a day do you check the time?"],
      ["scale", "How good are you at waking up early?", "How good are you at keeping secrets?"],
      ["ten", "Rate your cooking", "Rate your dancing"],
      ["number", "How many pairs of shoes do you own?", "How many caps and hats do you own?"],
      ["point", "Who's most likely to be late?", "Who's most likely to become famous?"],
      ["scale", "How patient are you in traffic?", "How patient are you in a queue?"],
    ],
  },
  {
    id: "food",
    label: "Food & chai",
    emoji: "🍛",
    pairs: [
      ["number", "How many cups of chai do you drink a day?", "How many times a day do you open Instagram?"],
      ["scale", "How spicy do you like your food?", "How much do you like horror films?"],
      ["number", "How many times did you eat out last month?", "How many movies did you watch last month?"],
      ["ten", "Rate Maggi as a full meal", "Rate pineapple on pizza"],
      ["point", "Who'd eat the last samosa without asking?", "Who'd order dessert first?"],
      ["scale", "How much do you like karela?", "How much do you like early mornings?"],
      ["number", "How many spoons of sugar go in your chai?", "How many pillows do you sleep with?"],
      ["ten", "Rate canteen food", "Rate airplane food"],
      ["point", "Who's the pickiest eater here?", "Who's the best cook here?"],
      ["scale", "How much do you love street food?", "How much do you love long drives?"],
      ["number", "How many kinds of pickle are in your kitchen?", "How many plants are in your home?"],
    ],
  },
  {
    id: "phone",
    label: "Phones & internet",
    emoji: "📱",
    pairs: [
      ["number", "How many unread messages do you have right now?", "How many apps are on your home screen?"],
      ["number", "How many WhatsApp groups are you in?", "How many photos did you take this week?"],
      ["scale", "How hooked are you on reels?", "How good are you at remembering birthdays?"],
      ["ten", "Rate your typing speed", "Rate your parking skills"],
      ["point", "Who replies to messages the slowest?", "Who sends the most voice notes?"],
      ["number", "How many hours of screen time did you have yesterday?", "How many hours did you sleep last night?"],
      ["scale", "How much do you trust Google Maps?", "How much do you trust weather apps?"],
      ["point", "Who's most likely to go viral?", "Who's most likely to lose their phone on a trip?"],
      ["ten", "Rate your phone's battery life", "Rate the Wi-Fi at home"],
      ["number", "How many tabs are open on your phone?", "How many songs are in your favourite playlist?"],
      ["scale", "How often do you post stories?", "How often do you watch cricket?"],
    ],
  },
  {
    id: "people",
    label: "Friends & family",
    emoji: "👨‍👩‍👧",
    pairs: [
      ["point", "Who's the funniest here?", "Who's the best at keeping secrets?"],
      ["point", "Who'd survive longest on a desert island?", "Who'd win a dance-off?"],
      ["point", "Who's most likely to cry at a movie?", "Who's most likely to laugh at the wrong moment?"],
      ["point", "Who gives the best advice?", "Who tells the best stories?"],
      ["point", "Who'd make the best teacher?", "Who'd make the best detective?"],
      ["number", "How many people are in your family WhatsApp group?", "How many people did you message today?"],
      ["scale", "How good are you at keeping surprises?", "How good are you at saying no?"],
      ["ten", "Rate this group's singing", "Rate this group's cooking"],
      ["number", "How many friends' birthdays do you know by heart?", "How many phone numbers do you know by heart?"],
      ["point", "Who'd plan the best trip?", "Who'd throw the best party?"],
      ["point", "Who argues the most during games?", "Who's the most competitive here?"],
    ],
  },
  {
    id: "travel",
    label: "Trips & travel",
    emoji: "🚗",
    pairs: [
      ["number", "How many states have you been to?", "How many beaches have you been to?"],
      ["number", "How many hours can you sit in a car without a break?", "How many hours can you go without chai?"],
      ["scale", "How much do you love road trips?", "How much do you love the mountains?"],
      ["ten", "Rate your packing skills", "Rate your sense of direction"],
      ["point", "Who'd get lost first on a trip?", "Who'd find the best food on a trip?"],
      ["number", "How many bags do you take on a weekend trip?", "How many outfits do you pack for a weekend?"],
      ["scale", "How scared are you of flying?", "How scared are you of dogs?"],
      ["point", "Who'd sleep through the whole journey?", "Who'd be the DJ in the car?"],
      ["ten", "Rate train journeys", "Rate dhaba food"],
      ["number", "How many times have you been on a plane?", "How many times have you seen the sea?"],
      ["scale", "How much do you enjoy camping?", "How much do you enjoy shopping?"],
    ],
  },
  {
    id: "school",
    label: "School & work",
    emoji: "🎒",
    pairs: [
      ["number", "How many teachers from school can you name?", "How many school friends are you still in touch with?"],
      ["scale", "How good were you at maths?", "How good were you at sports?"],
      ["ten", "Rate your handwriting", "Rate your drawing"],
      ["point", "Who was the class topper type?", "Who was the backbencher type?"],
      ["point", "Who'd fall asleep first in a meeting?", "Who'd volunteer first for anything?"],
      ["number", "How many languages can you speak?", "How many instruments can you play?"],
      ["scale", "How much do you like Mondays?", "How much did you like homework?"],
      ["ten", "Rate your school canteen", "Rate your school uniform"],
      ["number", "How many hours a day do you study or work?", "How many hours a day are you on your phone?"],
      ["point", "Who'd make the best principal?", "Who'd make the best class monitor?"],
      ["scale", "How good are you at public speaking?", "How good are you at remembering names?"],
    ],
  },
  {
    id: "films",
    label: "Films & games",
    emoji: "🎬",
    pairs: [
      ["number", "How many times have you watched your favourite movie?", "How many Shah Rukh Khan movies have you seen?"],
      ["scale", "How much do you love cricket?", "How much do you love Bollywood songs?"],
      ["ten", "Rate your antakshari skills", "Rate your carrom skills"],
      ["point", "Who'd win at Ludo?", "Who'd cheat at Ludo?"],
      ["number", "How many board games do you own?", "How many video games have you finished?"],
      ["scale", "How good are you at keeping a straight face?", "How good are you at remembering lyrics?"],
      ["point", "Who'd be the hero in a Bollywood film?", "Who'd be the villain in a Bollywood film?"],
      ["ten", "Rate the last movie you watched", "Rate the last song you listened to"],
      ["number", "How many songs can you sing all the way through?", "How many movies have you seen in a theatre this year?"],
      ["scale", "How competitive are you at games?", "How good a loser are you?"],
      ["point", "Who'd win a quiz?", "Who'd win a singing contest?"],
    ],
  },
  {
    id: "whatif",
    label: "What ifs",
    emoji: "🤔",
    pairs: [
      ["number", "How many days could you last without your phone?", "How many days could you last without chai?"],
      ["scale", "How brave are you with insects?", "How brave are you in the dark?"],
      ["ten", "Rate your chances in a zombie movie", "Rate your chances on a game show"],
      ["point", "Who'd become a superhero?", "Who'd become a famous chef?"],
      ["number", "How many hours could you go without talking?", "How many hours could you go without music?"],
      ["scale", "How likely are you to win a dance-off?", "How likely are you to win an arm-wrestle?"],
      ["point", "Who'd survive a horror movie?", "Who'd survive a reality show?"],
      ["ten", "Rate your poker face", "Rate your acting"],
      ["number", "How many times have you lost your keys?", "How many times have you missed a train or bus?"],
      ["scale", "How much would you like to go to space?", "How much would you like to live in the mountains?"],
      ["point", "Who could talk their way out of anything?", "Who'd get caught first in a prank?"],
    ],
  },
];

export const PACK_IDS: readonly PackId[] = PACKS.map((p) => p.id);

export function pack(id: PackId): Pack {
  return PACKS.find((p) => p.id === id)!;
}

export function isPackId(value: unknown): value is PackId {
  return typeof value === "string" && (PACK_IDS as readonly string[]).includes(value);
}

export const ANSWER_KINDS: readonly AnswerKind[] = ["number", "scale", "point", "ten"];

export function isAnswerKind(value: unknown): value is AnswerKind {
  return typeof value === "string" && (ANSWER_KINDS as readonly string[]).includes(value);
}

/**
 * What the screens say for each kind: the line under a question on a card, and the
 * Answer screen's "how to answer" (a short title and a line under it).
 */
export const KIND_TEXT: Record<AnswerKind, { note: string; how: string; detail: string }> = {
  number: {
    note: "Answer with a number",
    how: "Say your number",
    detail: "All together, out loud. No changing it after.",
  },
  scale: {
    note: "Answer from 1 to 5",
    how: "Show 1 to 5 fingers",
    detail: "Everyone holds up a hand at once.",
  },
  point: {
    note: "Answer by pointing at someone",
    how: "Point at someone",
    detail: "Everyone points at once, and keeps pointing.",
  },
  ten: {
    note: "Answer out of 10",
    how: "Show it on your fingers",
    detail: "Out of 10, all at once. Both hands if you need them.",
  },
};

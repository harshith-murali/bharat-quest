/**
 * A signature landmark for each of the 30 canonical Quest states, shown on the
 * arrival modal after the car finishes driving.
 *
 * Keys MUST match CANONICAL_QUEST_STATES in loaders/questLoader.ts exactly.
 *
 * `icon` is an emoji rather than an image path on purpose: only four monument
 * SVGs exist in public/assets/monuments, so referencing per-state artwork would
 * produce 26 broken images. Emoji keep this self-contained and offline-safe,
 * matching the app's existing emoji-forward visual language.
 */
export interface StateLandmark {
  /** The landmark / place the state is best known for. */
  monument: string;
  /** Emoji standing in for the monument artwork. */
  icon: string;
  /** One-sentence, kid-friendly description of the landmark. */
  description: string;
  /** Short "famous for" tags shown as chips. */
  knownFor: string[];
}

export const STATE_LANDMARKS: Record<string, StateLandmark> = {
  Ladakh: {
    monument: 'Pangong Tso',
    icon: '🏔️',
    description:
      'A stunning high-altitude lake that changes colour through the day, set among the cold desert mountains of the Himalayas.',
    knownFor: ['Himalayan lakes', 'Buddhist monasteries', 'Cold desert'],
  },
  'Jammu & Kashmir': {
    monument: 'Dal Lake',
    icon: '🛶',
    description:
      'Famous for its houseboats and shikara boats, this beautiful lake in Srinagar sits surrounded by snow-capped mountains.',
    knownFor: ['Houseboats', 'Mughal gardens', 'Saffron fields'],
  },
  'Himachal Pradesh': {
    monument: 'Shimla Ridge',
    icon: '🚂',
    description:
      'A breezy hill-station promenade reached by the famous toy train that winds through pine forests and mountain tunnels.',
    knownFor: ['Hill stations', 'Toy train', 'Apple orchards'],
  },
  Punjab: {
    monument: 'Golden Temple',
    icon: '🛕',
    description:
      'The shimmering golden shrine at Amritsar, surrounded by a sacred pool, where a free community kitchen feeds thousands every day.',
    knownFor: ['Golden Temple', 'Bhangra', 'Wheat fields'],
  },
  Uttarakhand: {
    monument: 'Valley of Flowers',
    icon: '🌸',
    description:
      'A Himalayan valley that bursts into a carpet of wild alpine flowers every monsoon, home to rare birds and snow leopards.',
    knownFor: ['Himalayan valleys', 'Ganga origin', 'Yoga capital'],
  },
  Haryana: {
    monument: 'Kurukshetra',
    icon: '🏺',
    description:
      'The ancient land described in the Mahabharata, dotted with sacred tanks and temples that draw pilgrims from across India.',
    knownFor: ['Mahabharata history', 'Farming', 'Folk dance'],
  },
  Rajasthan: {
    monument: 'Hawa Mahal',
    icon: '🏰',
    description:
      'The "Palace of Winds" in Jaipur, with 953 tiny windows built so royal ladies could watch street festivals unseen.',
    knownFor: ['Desert forts', 'Thar Desert', 'Folk music'],
  },
  'Uttar Pradesh': {
    monument: 'Taj Mahal',
    icon: '🕌',
    description:
      'A white marble wonder in Agra built by Emperor Shah Jahan, considered one of the most beautiful buildings on Earth.',
    knownFor: ['Taj Mahal', 'River Ganga', 'Varanasi ghats'],
  },
  'Arunachal Pradesh': {
    monument: 'Tawang Monastery',
    icon: '⛩️',
    description:
      'India’s largest Buddhist monastery, perched high in the mountains where the country sees its very first sunrise.',
    knownFor: ['First sunrise', 'Monasteries', 'Orchids'],
  },
  Sikkim: {
    monument: 'Kangchenjunga',
    icon: '🏔️',
    description:
      'The third-highest mountain in the world, watching over a tiny state famous for its clean villages and organic farms.',
    knownFor: ['Kangchenjunga', 'Organic farming', 'Yak trails'],
  },
  Assam: {
    monument: 'Kaziranga National Park',
    icon: '🦏',
    description:
      'Grasslands beside the Brahmaputra river that shelter two-thirds of the world’s one-horned rhinoceroses.',
    knownFor: ['One-horned rhino', 'Tea gardens', 'Brahmaputra'],
  },
  Nagaland: {
    monument: 'Hornbill Festival',
    icon: '🪶',
    description:
      'A grand December gathering where all the Naga tribes come together to share dance, music, food and colourful headgear.',
    knownFor: ['Hornbill Festival', 'Tribal culture', 'Bamboo crafts'],
  },
  Manipur: {
    monument: 'Loktak Lake',
    icon: '🌿',
    description:
      'The largest freshwater lake in the northeast, famous for its floating islands of matted plants called phumdis.',
    knownFor: ['Floating islands', 'Manipuri dance', 'Polo origins'],
  },
  Meghalaya: {
    monument: 'Living Root Bridges',
    icon: '🌉',
    description:
      'Bridges grown over decades from living rubber-tree roots, in the wettest place on Earth where rain almost never stops.',
    knownFor: ['Root bridges', 'Wettest place', 'Waterfalls'],
  },
  Tripura: {
    monument: 'Ujjayanta Palace',
    icon: '🏛️',
    description:
      'A grand white royal palace in Agartala with domed towers, tiled floors and beautiful Mughal-style gardens.',
    knownFor: ['Royal palaces', 'Bamboo handicraft', 'Rock carvings'],
  },
  Mizoram: {
    monument: 'Blue Mountain (Phawngpui)',
    icon: '⛰️',
    description:
      'The highest peak in Mizoram, wrapped in mist and rhododendrons, believed by locals to be the home of the spirits.',
    knownFor: ['Bamboo dance', 'Rolling hills', 'Handloom weaving'],
  },
  Bihar: {
    monument: 'Mahabodhi Temple',
    icon: '🌳',
    description:
      'At Bodh Gaya stands the descendant of the tree under which the Buddha gained enlightenment more than 2,500 years ago.',
    knownFor: ['Bodh Gaya', 'Nalanda University', 'Ancient Magadha'],
  },
  'West Bengal': {
    monument: 'Sundarbans',
    icon: '🐅',
    description:
      'The world’s largest mangrove forest, a maze of tidal rivers that is home to the famous Royal Bengal tiger.',
    knownFor: ['Sundarbans', 'Durga Puja', 'Howrah Bridge'],
  },
  Jharkhand: {
    monument: 'Hundru Falls',
    icon: '💧',
    description:
      'A dramatic waterfall where the Subarnarekha river drops almost 100 metres over rocky cliffs into a deep green pool.',
    knownFor: ['Waterfalls', 'Mineral mines', 'Tribal art'],
  },
  Gujarat: {
    monument: 'Statue of Unity',
    icon: '🗽',
    description:
      'The tallest statue in the world, honouring Sardar Vallabhbhai Patel, standing beside the Narmada river.',
    knownFor: ['Statue of Unity', 'Gir lions', 'Garba dance'],
  },
  'Madhya Pradesh': {
    monument: 'Khajuraho Temples',
    icon: '🛕',
    description:
      'A group of thousand-year-old temples covered in astonishingly detailed stone carvings, right in the heart of India.',
    knownFor: ['Khajuraho', 'Sanchi Stupa', 'Tiger reserves'],
  },
  Chhattisgarh: {
    monument: 'Chitrakote Falls',
    icon: '🌊',
    description:
      'Often called the "Niagara of India", this horseshoe-shaped waterfall grows into a thundering curtain during the monsoon.',
    knownFor: ['Chitrakote Falls', 'Dense forests', 'Tribal heritage'],
  },
  Maharashtra: {
    monument: 'Ajanta & Ellora Caves',
    icon: '🗿',
    description:
      'Entire temples and monasteries carved straight into solid rock cliffs, decorated with paintings almost 2,000 years old.',
    knownFor: ['Ajanta caves', 'Gateway of India', 'Western Ghats'],
  },
  Odisha: {
    monument: 'Konark Sun Temple',
    icon: '☀️',
    description:
      'A giant stone chariot for the Sun God, complete with 24 carved wheels and horses, built facing the rising sun.',
    knownFor: ['Konark temple', 'Odissi dance', 'Chilika Lake'],
  },
  Telangana: {
    monument: 'Charminar',
    icon: '🕌',
    description:
      'A four-arched monument with soaring minarets at the heart of Hyderabad’s bustling old-city bazaars.',
    knownFor: ['Charminar', 'Golconda Fort', 'Pearls & biryani'],
  },
  Goa: {
    monument: 'Basilica of Bom Jesus',
    icon: '⛪',
    description:
      'A 400-year-old church of red laterite stone, standing near golden beaches on India’s smallest state.',
    knownFor: ['Beaches', 'Portuguese churches', 'Carnival'],
  },
  'Andhra Pradesh': {
    monument: 'Tirupati Temple',
    icon: '🛕',
    description:
      'A hilltop temple visited by tens of thousands of pilgrims every single day, making it one of the busiest on Earth.',
    knownFor: ['Tirupati', 'Araku Valley', 'Kuchipudi dance'],
  },
  Karnataka: {
    monument: 'Hampi',
    icon: '🪨',
    description:
      'The boulder-strewn ruins of the mighty Vijayanagara Empire, with stone chariots and temples spread across a river valley.',
    knownFor: ['Hampi ruins', 'Mysore Palace', 'Coffee estates'],
  },
  'Tamil Nadu': {
    monument: 'Meenakshi Temple',
    icon: '🛕',
    description:
      'A vast temple in Madurai whose towering gateways are covered in thousands of brightly painted sculptures.',
    knownFor: ['Temple gopurams', 'Bharatanatyam', 'Marina Beach'],
  },
  Kerala: {
    monument: 'Backwaters of Alleppey',
    icon: '🛶',
    description:
      'A peaceful network of palm-lined canals and lagoons explored on traditional houseboats, in "God’s Own Country".',
    knownFor: ['Backwaters', 'Kathakali', 'Spice plantations'],
  },
};

/** Landmark for a state, or a sensible generic fallback. */
export function getStateLandmark(stateName: string): StateLandmark {
  return (
    STATE_LANDMARKS[stateName] ?? {
      monument: stateName,
      icon: '🗺️',
      description: `Explore the culture, history and geography of ${stateName}.`,
      knownFor: ['Culture', 'History', 'Geography'],
    }
  );
}

export const getCefrBadgeStyle = (level: string): string => {
  const lvl = level.toUpperCase();
  if (lvl.startsWith('A') || lvl.includes('PRE')) {
    return 'bg-[#d3e8d5] text-[#1b1c19] border border-[#b8ccba]/40';
  }
  if (lvl.startsWith('B')) {
    return 'bg-[#d2e3f0] text-[#1b1c19] border border-[#a2b8cc]/40';
  }
  return 'bg-[#ffdbcf] text-[#1b1c19] border border-[#f8b7a2]/40';
};

export const DEFAULT_MODEL_FOR_LANGUAGE: Record<string, string> = {
  en: 'deepseek/deepseek-v4-pro',
  es: 'deepseek/deepseek-v4-pro',
  fr: 'deepseek/deepseek-v4-pro',
  de: 'deepseek/deepseek-v4-pro',
  it: 'deepseek/deepseek-v4-pro',
  pt: 'deepseek/deepseek-v4-pro',
  ja: 'deepseek/deepseek-v4-pro',
  zh: 'deepseek/deepseek-v4-pro',
  th: 'deepseek/deepseek-v4-pro',
  ko: 'deepseek/deepseek-v4-pro',
};

export interface WritingTypeItem {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

export const WRITING_TYPES: WritingTypeItem[] = [
  {
    id: 'narrative',
    label: 'Narrative',
    emoji: '📖',
    desc: 'Storytelling, plot-driven, fictional or personal account.',
  },
  {
    id: 'expository',
    label: 'Expository',
    emoji: '💡',
    desc: 'Explaining, informing, or describing a specific topic with facts.',
  },
  {
    id: 'analytical',
    label: 'Analytical',
    emoji: '🔍',
    desc: 'Breaking down concepts, examining relationships or arguments.',
  },
  {
    id: 'descriptive',
    label: 'Descriptive',
    emoji: '🎨',
    desc: 'Focusing on vivid sensory details, imagery, and mood.',
  },
];

export const GENRE_INSPIRATIONS: Record<string, string[]> = {
  // Narrative genres
  adventure: [
    'Expedition to find a lost mountain temple',
    'Two sailors navigating an uncharted archipelago',
    'A treasure map hidden inside an antique compass',
    'Survival trek across a frozen volcanic valley',
  ],
  mystery: [
    'A priceless painting vanishes during a thunderstorm',
    'A detective investigates an impossible locked bookstore',
    'Cryptic coded postcards sent to an innocent postmaster',
    'The midnight disappearance of a famous botanist',
  ],
  scifi: [
    'A communications officer hears music from deep space',
    'First contact with an autonomous AI probe on Europa',
    'A malfunctioning terraforming station on Mars',
    'A time-travel tourist stranded in the 22nd century',
  ],
  fantasy: [
    'An apprentice herbalist accidentally summons a forest spirit',
    'A forgotten library where books whisper ancient spells',
    'The annual lantern migration of the cloud dragons',
    'A blacksmith asked to repair an enchanted blade',
  ],
  scifi_fantasy: [
    'Starships powered by celestial stardust and runes',
    'Cybernetic knights defending an orbital kingdom',
    'An alien crystal monolith awakening dormant magic',
    'A planetary alchemist mining asteroids for mana',
  ],
  sliceoflife: [
    'An autumn morning at a quiet neighborhood café',
    'A grandfather teaching his granddaughter to garden',
    'Moving into a small coastal apartment in spring',
    'Finding friendship at a community ceramics studio',
  ],
  romance: [
    'Two rival pastry chefs competing in a French village',
    'Chance encounter at a rain-soaked train platform',
    'A florist and an architect collaborating on a garden',
    'Letters exchanged between two neighboring bookshops',
  ],
  folklore: [
    'A village guarded by a shape-shifting river fox',
    'The legend of the weaver who wove the night sky',
    'An elder tells the tale of the talking cedar trees',
    'A trickster spirit challenging a traveler to three riddles',
  ],
  historical: [
    'A young printer’s apprentice in 15th-century Venice',
    'Codebreakers working late in wartime London',
    'A merchant journeying along the Silk Road',
    'Life in a bustling harbor town during the Age of Sail',
  ],
  horror: [
    'An isolated lighthouse with strange knocking from below',
    'A mirror that reflects a room that isn’t yours',
    'A foggy mountain path where footprints lead nowhere',
    'An antique music box that plays on its own at 3 AM',
  ],
  comedy: [
    'A gourmet chef forced to cook for an aristocratic cat',
    'An overly dramatic detective who suspects everyone',
    'A mistaken identity at a high-society costume gala',
    'An inventor whose gadgets always malfunction hilariously',
  ],
  fairy: [
    'A shoemaker assisted by tiny woodland creatures',
    'A prince turned into a hedgehog seeking a true friend',
    'The magical orchard where silver apples grant wishes',
    'A brave girl bargaining with the King of the North Wind',
  ],

  // Expository genres
  science_nature: [
    'How mycorrhizal fungal networks connect forest trees',
    'The extraordinary camouflage mechanics of the octopus',
    'How ocean currents regulate global climate systems',
    'The multi-generational migration of monarch butterflies',
  ],
  technology: [
    'How fiber-optic cables transmit light across ocean floors',
    'From punch cards to neural networks: computing history',
    'How GPS satellites triangulate positions with atomic clocks',
    'Engineering secrets of reusable orbital rockets',
  ],
  history_biography: [
    'The life of Ada Lovelace and the first algorithm',
    'How the Rosetta Stone unlocked ancient hieroglyphs',
    'Engineering and daily spectacle of the Roman Colosseum',
    'Navigation secrets of ancient Polynesian wayfinders',
  ],
  culture_society: [
    'Traditional tea ceremony rituals and etiquette in Japan',
    'Cultural symbolism and origins of the Day of the Dead',
    'Ancient communal water-sharing systems in desert oases',
    'How indigenous languages preserve ecological knowledge',
  ],
  health_wellness: [
    'How circadian rhythms and sleep cycles repair the brain',
    'The cellular mechanisms of the human immune memory',
    'The physiology of hydration and electrolyte balance',
    'Scientific benefits of mindful walking and forest bathing',
  ],
  geography_travel: [
    'Exploring the dramatic fjords and glaciers of Norway',
    'Daily life in the high-altitude Andes mountains of Peru',
    'Diverse microclimates and geothermal wonders of New Zealand',
    'How the ancient canal network of Amsterdam was engineered',
  ],
  howto_hobbies: [
    'Beginner guide to pruning and caring for a bonsai tree',
    'Step-by-step science of sourdough bread fermentation',
    'Essential traditional woodworking joinery techniques',
    'How to identify bird calls and track backyard wildlife',
  ],
  nonfiction: [
    'How public lending libraries transformed literacy',
    'The history of postal mail and international couriers',
    'How ancient spice trade routes shaped world cuisine',
    'The physics of flight across insects, birds, and planes',
  ],

  // Analytical genres
  science_tech_analysis: [
    'Comparing grid-scale battery chemistries for green power',
    'Computational trade-offs of quantum vs classical systems',
    'Evaluating agricultural benefits vs risks of gene editing',
    'How recommendation algorithms shape public opinion',
  ],
  historical_analysis: [
    'Social and economic catalysts of the Industrial Revolution',
    'Investigating causes behind the Late Bronze Age collapse',
    'How maritime dominance shaped early modern empires',
    'The ripple effects of the printing press on governance',
  ],
  social_cultural_issues: [
    'Urbanization challenges and modern affordable housing models',
    'The long-term impact of remote work on transit systems',
    'How mobile payments reshaped informal rural economies',
    'Generational shifts in civic participation and volunteerism',
  ],
  philosophy: [
    'The Ship of Theseus: identity, change, and continuity',
    'Utilitarianism vs Deontology in automated decision-making',
    'Applying Stoic principles to modern information overload',
    'The problem of other minds: consciousness and empathy',
  ],
  meditative: [
    'Reflections on impermanence through changing seasons',
    'The quiet art of listening without rushing to answer',
    'Finding mental clarity and stillness in a hurried world',
    'Cultivating intentional gratitude in everyday routines',
  ],
  environmental_systems: [
    'Restoring coastal mangrove forests against storm surges',
    'The keystone role of apex predators in rewilded ecosystems',
    'Cooling metropolitan heat islands with urban tree canopies',
    'Circular economy frameworks for plastic waste reduction',
  ],

  // Descriptive genres
  nature_wildlife: [
    'Morning mist rising over an ancient redwood canopy',
    'Vibrant marine life on a coral reef at low tide',
    'A herd of wild horses running across autumn grasslands',
    'Snow quietly blanketing an alpine pine forest at dusk',
  ],
  cities_architecture: [
    'Cobblestone alleys and terracotta rooftops of Old Florence',
    'The neon-lit skyline of Tokyo reflected in rain puddles',
    'Gothic cathedral spires soaring into evening twilight',
    'A vibrant Mediterranean fishing port at sunrise',
  ],
  food_culture: [
    'Sensory atmosphere of a wood-fired pizza kitchen in Naples',
    'Steaming bamboo baskets of dim sum in a morning teahouse',
    'An artisan chocolatier tempering velvet ganache by hand',
    'A countryside autumn harvest feast with figs and warm bread',
  ],
  art_music: [
    'Inside a sunlit oil painter’s studio with drying canvases',
    'The passionate rhythm of a flamenco guitar performance',
    'A glassblower shaping molten amber crystal at the furnace',
    'The resonant acoustics of an empty stone concert hall',
  ],
  daily_life_portraits: [
    'An elderly watchmaker repairing miniature gears by lamplight',
    'Schoolchildren laughing as they race the afternoon bell',
    'A quiet commuter lost in thought on a morning ferry ride',
    'A flower market vendor arranging the first morning bouquets',
  ],

  // Fallbacks by writing type
  narrative: [
    'A mysterious antique shop in Kyoto',
    'A baker preparing for the village festival',
    'A time traveler stranded in Paris in 1889',
    'An unexpected friendship on a sleeper train',
  ],
  expository: [
    'How traditional sourdough bread is baked',
    'Engineering marvel of ancient Roman aqueducts',
    'How coffee is harvested & roasted',
    'How nocturnal animals navigate at night',
  ],
  analytical: [
    'Trade-offs between high-speed rail and flights',
    'How renewable grids balance fluctuating demands',
    'Impact of remote work on small town economies',
    'Comparing immersion vs grammar-based learning',
  ],
  descriptive: [
    'A bustling street food night market in Taipei',
    'A secluded mountain tea house in autumn',
    'An artisan clockmaker’s workshop filled with gears',
    'Early sunrise over an alpine fishing village',
  ],
};

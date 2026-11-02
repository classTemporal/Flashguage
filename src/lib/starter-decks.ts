export interface StarterCardTemplate {
  front: string;
  back: string;
  tags: string[];
  example: string;
  imageUrl?: string;
}

export interface StarterDeckTemplate {
  id: string;
  name: string;
  description: string;
  targetLanguage: string;
  category: string;
  icon: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  cards: StarterCardTemplate[];
}

export const STARTER_DECKS: StarterDeckTemplate[] = [
  {
    id: "everyday-idioms-slang",
    name: "Everyday Idioms & Slang",
    description: "Master natural conversational expressions used daily by native English speakers.",
    targetLanguage: "en",
    category: "Conversational",
    icon: "💬",
    level: "Intermediate",
    cards: [
      {
        front: "Bite the bullet",
        back: "To force yourself to face a difficult situation with courage instead of avoiding it.",
        tags: ["idiom", "conversational", "courage"],
        example: "I really hate visiting the dentist, but I just need to bite the bullet and go.",
        imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
      },
      {
        front: "Under the weather",
        back: "Feeling slightly unwell, sick, or lacking energy.",
        tags: ["idiom", "health", "daily"],
        example: "I won't be able to make it to dinner tonight; I'm feeling a bit under the weather.",
        imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&q=80",
      },
      {
        front: "Burn the midnight oil",
        back: "To work or study late into the night.",
        tags: ["idiom", "study", "work"],
        example: "She has been burning the midnight oil all week to submit her research thesis.",
        imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80",
      },
      {
        front: "Hit the nail on the head",
        back: "To describe exactly what is causing a situation or give the precise answer.",
        tags: ["idiom", "precision", "communication"],
        example: "When you pointed out the team communication gap, you hit the nail on the head.",
        imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
      },
      {
        front: "Call it a day",
        back: "To stop working on something, especially when you have done enough for the moment.",
        tags: ["idiom", "work", "routine"],
        example: "We've made solid progress on the project today, so let's call it a day and grab dinner.",
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
      },
      {
        front: "Spill the beans",
        back: "To reveal secret information prematurely or unintentionally.",
        tags: ["idiom", "secrets", "slang"],
        example: "We wanted the surprise birthday party to remain quiet, but Mike spilled the beans.",
        imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80",
      },
      {
        front: "Cut corners",
        back: "To do something in the easiest, cheapest, or fastest way, often sacrificing quality or safety.",
        tags: ["idiom", "work", "quality"],
        example: "Don't cut corners when assembling electrical components; safety is essential.",
        imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
      },
      {
        front: "Once in a blue moon",
        back: "Happening very rarely or almost never.",
        tags: ["idiom", "frequency", "time"],
        example: "Living in the sunny south, we only get snowfall once in a blue moon.",
        imageUrl: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=600&q=80",
      },
    ],
  },
  {
    id: "tech-workplace-essentials",
    name: "Tech & Workplace Essentials",
    description: "Key professional expressions and business vocabulary for meetings, tech jobs, and interviews.",
    targetLanguage: "en",
    category: "Professional",
    icon: "💼",
    level: "Advanced",
    cards: [
      {
        front: "Bottleneck",
        back: "A point of congestion or blockage that slows down an entire system, process, or workflow.",
        tags: ["business", "engineering", "workflow"],
        example: "The manual review process became a bottleneck for our daily deployment cycle.",
        imageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&q=80",
      },
      {
        front: "Leverage",
        back: "To use an existing asset, technology, or advantage to achieve maximum results.",
        tags: ["business", "strategy", "tech"],
        example: "We can leverage our existing authentication pipeline to launch the new service faster.",
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
      },
      {
        front: "Bandwidth",
        back: "Mental or physical capacity and available time to take on additional tasks.",
        tags: ["workplace", "colloquial", "productivity"],
        example: "I would love to help audit the code, but I don't have the bandwidth this sprint.",
        imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
      },
      {
        front: "Pivot",
        back: "To shift fundamental business strategy or product direction based on user feedback or market changes.",
        tags: ["startups", "strategy", "tech"],
        example: "After recognizing user interest in flashcards, the startup decided to pivot completely.",
        imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80",
      },
      {
        front: "Trade-off",
        back: "A situational decision that involves losing one desirable quality in return for gaining another.",
        tags: ["engineering", "decision-making", "architecture"],
        example: "Caching reduces server latency, but the trade-off is higher memory consumption.",
        imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80",
      },
      {
        front: "Benchmark",
        back: "A standard or reference point against which performance, speed, or quality can be measured.",
        tags: ["metrics", "tech", "quality"],
        example: "Our load tests showed the updated database queries beat the baseline benchmark by 40%.",
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
      },
      {
        front: "Scalability",
        back: "The capability of a system or network to handle growing amounts of work without failing.",
        tags: ["architecture", "systems", "tech"],
        example: "Designing microservices with stateless containers ensures effortless scalability.",
        imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
      },
      {
        front: "Deliverable",
        back: "A tangible product, service, or feature that must be completed and handed over at the end of a milestone.",
        tags: ["project-management", "workplace"],
        example: "The interactive prototype is the primary deliverable scheduled for Friday's sprint review.",
        imageUrl: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&q=80",
      },
    ],
  },
  {
    id: "manga-anime-expressions",
    name: "Words Found in Manga & Fiction",
    description: "Vivid verbs, dramatic descriptors, and expressive vocabulary frequently encountered in manga and novels.",
    targetLanguage: "en",
    category: "Storytelling & Fiction",
    icon: "📖",
    level: "Intermediate",
    cards: [
      {
        front: "Fend",
        back: "To defend oneself against a physical attack, challenge, or difficulty; to push away.",
        tags: ["verb", "fiction", "action"],
        example: "Armed only with a wooden shield, the scout had to fend off three wolves in the forest.",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
      },
      {
        front: "Budge",
        back: "To move slightly, or to yield and change an opinion under pressure.",
        tags: ["verb", "action", "fiction"],
        example: "I pushed against the massive temple door with all my strength, but it wouldn't budge an inch.",
        imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
      },
      {
        front: "Perched",
        back: "Situated or balanced safely on an elevated or narrow edge.",
        tags: ["verb", "visual", "narrative"],
        example: "A solitary falcon perched silently on the castle parapet as the moon rose.",
        imageUrl: "https://images.unsplash.com/photo-1549608276-5786777e6587?w=600&q=80",
      },
      {
        front: "Rabble",
        back: "A disorderly crowd, unruly mob, or group viewed as chaotic.",
        tags: ["noun", "narrative", "fiction"],
        example: "The guards struggled to maintain the city gates against the surging rabble.",
        imageUrl: "https://images.unsplash.com/photo-1508873696983-2df5293cbdaf?w=600&q=80",
      },
      {
        front: "Biding",
        back: "Waiting patiently for a favorable opportunity or ideal moment to strike.",
        tags: ["verb", "strategy", "fiction"],
        example: "He remained silent in the shadows, biding his time until the guards changed shifts.",
        imageUrl: "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=600&q=80",
      },
      {
        front: "Brunt",
        back: "The main force, primary shock, or worst part of an attack, blow, or crisis.",
        tags: ["noun", "fiction", "impact"],
        example: "The vanguard soldiers bore the full brunt of the dragon's fiery blast.",
        imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&q=80",
      },
      {
        front: "Strides",
        back: "To walk with long, decisive, and confident paces.",
        tags: ["verb", "movement", "character"],
        example: "With long, purposeful strides, the warrior entered the grand hall without hesitation.",
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
      },
      {
        front: "Chieftain",
        back: "The leader or head of a clan, tribe, or group.",
        tags: ["noun", "fiction", "leadership"],
        example: "The clan chieftain summoned all warriors to the mountain summit before sunrise.",
        imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&q=80",
      },
    ],
  },
  {
    id: "essential-phrasal-verbs",
    name: "Top Phrasal Verbs in Context",
    description: "The most common multi-word verbs that sound natural in everyday spoken English.",
    targetLanguage: "en",
    category: "Grammar & Flow",
    icon: "⚡",
    level: "Beginner",
    cards: [
      {
        front: "Figure out",
        back: "To discover, understand, or solve a problem through thought and investigation.",
        tags: ["phrasal-verb", "daily", "problem-solving"],
        example: "We spent the entire afternoon trying to figure out why the program was crashing.",
        imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
      },
      {
        front: "Bring up",
        back: "To mention or introduce a topic into a conversation.",
        tags: ["phrasal-verb", "conversation", "communication"],
        example: "I didn't want to bring up the budget issues during lunch, but it was unavoidable.",
        imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
      },
      {
        front: "Call off",
        back: "To cancel an event or activity that was previously arranged.",
        tags: ["phrasal-verb", "plans", "daily"],
        example: "Due to heavy thunderstorms, the organizers had to call off the outdoor festival.",
        imageUrl: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&q=80",
      },
      {
        front: "Come across",
        back: "To meet or find someone or something by chance.",
        tags: ["phrasal-verb", "discovery", "daily"],
        example: "While reorganizing the attic, I came across an old photo album from my childhood.",
        imageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80",
      },
      {
        front: "Give in",
        back: "To finally surrender or agree to something after resisting.",
        tags: ["phrasal-verb", "negotiation", "conflict"],
        example: "After weeks of persistent requests from the kids, we gave in and got a puppy.",
        imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
      },
      {
        front: "Look forward to",
        back: "To feel happy and excited about something that is going to happen in the future.",
        tags: ["phrasal-verb", "future", "emotion"],
        example: "I am really looking forward to visiting Japan next spring to see the cherry blossoms.",
        imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80",
      },
      {
        front: "Turn down",
        back: "To refuse, decline, or reject an offer or request.",
        tags: ["phrasal-verb", "decisions", "business"],
        example: "He had to turn down the job offer because the daily commute was over two hours.",
        imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80",
      },
    ],
  },
];

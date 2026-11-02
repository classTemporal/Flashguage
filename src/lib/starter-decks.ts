export interface StarterCardTemplate {
  front: string;
  back: string;
  tags: string[];
  example: string;
  phonetic: string;
  partOfSpeech: string;
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
    "id": "everyday-idioms-slang",
    "name": "Everyday Idioms & Slang",
    "description": "Master natural conversational expressions used daily by native English speakers.",
    "targetLanguage": "en",
    "category": "Conversational",
    "icon": "💬",
    "level": "Intermediate",
    "cards": [
      {
        "front": "Bite the bullet",
        "back": "To force yourself to face a difficult situation with courage instead of avoiding it.",
        "phonetic": "/baɪt ðə ˈbʊl.ɪt/",
        "partOfSpeech": "idiom",
        "example": "I really hate visiting the dentist, but I just need to bite the bullet and go.",
        "imageUrl": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
        "tags": [
          "idiom",
          "courage",
          "conversational"
        ]
      },
      {
        "front": "Under the weather",
        "back": "Feeling slightly unwell, sick, tired, or lacking energy.",
        "phonetic": "/ˈʌn.dər ðə ˈweð.ər/",
        "partOfSpeech": "idiom",
        "example": "I won't be able to make it to dinner tonight; I'm feeling a bit under the weather.",
        "imageUrl": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&q=80",
        "tags": [
          "idiom",
          "health",
          "daily"
        ]
      },
      {
        "front": "Burn the midnight oil",
        "back": "To work or study late into the night.",
        "phonetic": "/bɜːn ðə ˈmɪd.naɪt ɔɪl/",
        "partOfSpeech": "idiom",
        "example": "She has been burning the midnight oil all week to submit her research thesis on time.",
        "imageUrl": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80",
        "tags": [
          "idiom",
          "study",
          "work"
        ]
      },
      {
        "front": "Hit the nail on the head",
        "back": "To describe exactly what is causing a situation or give the precise answer.",
        "phonetic": "/hɪt ðə neɪl ɒn ðə hed/",
        "partOfSpeech": "idiom",
        "example": "When you pointed out our lack of automated testing, you hit the nail on the head.",
        "imageUrl": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
        "tags": [
          "idiom",
          "accuracy",
          "communication"
        ]
      },
      {
        "front": "Call it a day",
        "back": "To stop working on something, especially when you have done enough for the moment.",
        "phonetic": "/kɔːl ɪt ə deɪ/",
        "partOfSpeech": "idiom",
        "example": "We've made solid progress on the project today, so let's call it a day and grab dinner.",
        "imageUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
        "tags": [
          "idiom",
          "work",
          "routine"
        ]
      },
      {
        "front": "Spill the beans",
        "back": "To reveal secret or confidential information prematurely or unintentionally.",
        "phonetic": "/spɪl ðə biːnz/",
        "partOfSpeech": "idiom",
        "example": "We wanted the surprise birthday party to remain secret, but Mike spilled the beans.",
        "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80",
        "tags": [
          "idiom",
          "secrets",
          "slang"
        ]
      },
      {
        "front": "Cut corners",
        "back": "To do something in the easiest, cheapest, or fastest way, often sacrificing quality or safety.",
        "phonetic": "/kʌt ˈkɔːnərz/",
        "partOfSpeech": "idiom",
        "example": "Don't cut corners when assembling electrical components; safety is essential.",
        "imageUrl": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
        "tags": [
          "idiom",
          "work",
          "quality"
        ]
      },
      {
        "front": "Once in a blue moon",
        "back": "Happening very rarely, infrequently, or almost never.",
        "phonetic": "/wʌns ɪn ə bluː muːn/",
        "partOfSpeech": "idiom",
        "example": "Living in the sunny south, we only experience snowfall once in a blue moon.",
        "imageUrl": "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=600&q=80",
        "tags": [
          "idiom",
          "frequency",
          "time"
        ]
      },
      {
        "front": "Break the ice",
        "back": "To make people feel more comfortable, relaxed, and willing to talk in an unfamiliar social setting.",
        "phonetic": "/breɪk ði aɪs/",
        "partOfSpeech": "idiom",
        "example": "The workshop facilitator played a fun trivia game to break the ice among new attendees.",
        "imageUrl": "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=600&q=80",
        "tags": [
          "idiom",
          "social",
          "communication"
        ]
      },
      {
        "front": "Piece of cake",
        "back": "Something that is very simple, easy, or effortless to accomplish.",
        "phonetic": "/piːs əv keɪk/",
        "partOfSpeech": "idiom",
        "example": "Don't worry about the driving exam; after all your practice, it will be a piece of cake.",
        "imageUrl": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80",
        "tags": [
          "idiom",
          "difficulty",
          "slang"
        ]
      },
      {
        "front": "Cost an arm and a leg",
        "back": "To be extremely expensive or require an excessive amount of money.",
        "phonetic": "/kɒst ən ɑːm ænd ə leɡ/",
        "partOfSpeech": "idiom",
        "example": "Replacing the cracked smartphone screen is going to cost an arm and a leg.",
        "imageUrl": "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80",
        "tags": [
          "idiom",
          "money",
          "price"
        ]
      },
      {
        "front": "See eye to eye",
        "back": "To agree fully with someone on a topic or have the same point of view.",
        "phonetic": "/siː aɪ tuː aɪ/",
        "partOfSpeech": "idiom",
        "example": "Though they are business partners, they rarely see eye to eye on marketing decisions.",
        "imageUrl": "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=600&q=80",
        "tags": [
          "idiom",
          "agreement",
          "opinions"
        ]
      },
      {
        "front": "Barking up the wrong tree",
        "back": "Pursuing a mistaken line of thought or accusing the wrong person.",
        "phonetic": "/ˈbɑː.kɪŋ ʌp ðə rɒŋ triː/",
        "partOfSpeech": "idiom",
        "example": "If you think I took your keys, you're barking up the wrong tree; I just got here.",
        "imageUrl": "https://images.unsplash.com/photo-1534361960057-19889db9621e?w=600&q=80",
        "tags": [
          "idiom",
          "mistake",
          "conversation"
        ]
      },
      {
        "front": "Beat around the bush",
        "back": "To avoid speaking directly about a crucial or uncomfortable topic.",
        "phonetic": "/biːt əˈraʊnd ðə bʊʃ/",
        "partOfSpeech": "idiom",
        "example": "Please stop beating around the bush and tell me directly what happened to the car.",
        "imageUrl": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80",
        "tags": [
          "idiom",
          "communication",
          "honesty"
        ]
      },
      {
        "front": "Add insult to injury",
        "back": "To make an already unfavorable situation even worse or more humiliating.",
        "phonetic": "/æd ˈɪn.sʌlt tuː ˈɪn.dʒər.i/",
        "partOfSpeech": "idiom",
        "example": "Our flight was delayed five hours, and to add insult to injury, the airline lost our bags.",
        "imageUrl": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&q=80",
        "tags": [
          "idiom",
          "conflict",
          "misfortune"
        ]
      },
      {
        "front": "Blow off steam",
        "back": "To do something active or relaxing to release accumulated anger, tension, or stress.",
        "phonetic": "/bləʊ ɒf stiːm/",
        "partOfSpeech": "idiom",
        "example": "After an exhausting week of deadlines, going for a long bike ride helps me blow off steam.",
        "imageUrl": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&q=80",
        "tags": [
          "idiom",
          "stress",
          "relaxation"
        ]
      },
      {
        "front": "Cry over spilled milk",
        "back": "To feel upset or regretful about an unfortunate event that has already happened and cannot be changed.",
        "phonetic": "/kraɪ ˈəʊ.vər spɪld mɪlk/",
        "partOfSpeech": "idiom",
        "example": "We lost the tournament, but there is no use crying over spilled milk; let's prepare for next season.",
        "imageUrl": "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=600&q=80",
        "tags": [
          "idiom",
          "regret",
          "mindset"
        ]
      },
      {
        "front": "Jump on the bandwagon",
        "back": "To join a popular activity, trend, or cause simply because many other people are doing it.",
        "phonetic": "/dʒʌmp ɒn ðə ˈbændˌwæɡ.ən/",
        "partOfSpeech": "idiom",
        "example": "Now that artificial intelligence is popular, every software company is jumping on the bandwagon.",
        "imageUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80",
        "tags": [
          "idiom",
          "trends",
          "social"
        ]
      },
      {
        "front": "Miss the boat",
        "back": "To miss out on an exciting opportunity because you acted too late or were unprepared.",
        "phonetic": "/mɪs ðə bəʊt/",
        "partOfSpeech": "idiom",
        "example": "If you wait any longer to buy tickets for the concert, you will completely miss the boat.",
        "imageUrl": "https://images.unsplash.com/photo-1505705694340-019e1e335916?w=600&q=80",
        "tags": [
          "idiom",
          "opportunity",
          "timing"
        ]
      },
      {
        "front": "Through thick and thin",
        "back": "Supporting someone continuously, through good times as well as very difficult times.",
        "phonetic": "/θruː θɪk ænd θɪn/",
        "partOfSpeech": "idiom",
        "example": "True friends stand beside you through thick and thin, no matter what obstacles arise.",
        "imageUrl": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80",
        "tags": [
          "idiom",
          "friendship",
          "loyalty"
        ]
      },
      {
        "front": "Pull someone's leg",
        "back": "To playfully deceive, tease, or joke with someone as a friendly prank.",
        "phonetic": "/pʊl ˈsʌm.wʌnz leɡ/",
        "partOfSpeech": "idiom",
        "example": "Relax, I didn't actually lose your car keys; I was just pulling your leg!",
        "imageUrl": "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&q=80",
        "tags": [
          "idiom",
          "humor",
          "prank"
        ]
      }
    ]
  },
  {
    "id": "tech-workplace-essentials",
    "name": "Tech & Workplace Essentials",
    "description": "Key professional expressions and business vocabulary for meetings, tech jobs, and interviews.",
    "targetLanguage": "en",
    "category": "Professional",
    "icon": "💼",
    "level": "Advanced",
    "cards": [
      {
        "front": "Bottleneck",
        "back": "A point of congestion or blockage that slows down an entire system, process, or workflow.",
        "phonetic": "/ˈbɒt.əl.nek/",
        "partOfSpeech": "noun",
        "example": "The manual review process became a bottleneck for our daily deployment cycle.",
        "imageUrl": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&q=80",
        "tags": [
          "workplace",
          "engineering",
          "efficiency"
        ]
      },
      {
        "front": "Leverage",
        "back": "To use an existing asset, technology, or advantage to achieve maximum results.",
        "phonetic": "/ˈliː.vər.ɪdʒ/",
        "partOfSpeech": "verb",
        "example": "We can leverage our existing authentication pipeline to launch the new service faster.",
        "imageUrl": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
        "tags": [
          "business",
          "strategy",
          "tech"
        ]
      },
      {
        "front": "Bandwidth",
        "back": "Mental or physical capacity and available time to take on additional tasks.",
        "phonetic": "/ˈbænd.wɪtθ/",
        "partOfSpeech": "noun",
        "example": "I would love to help audit the code, but I don't have the bandwidth this sprint.",
        "imageUrl": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
        "tags": [
          "workplace",
          "productivity",
          "time"
        ]
      },
      {
        "front": "Pivot",
        "back": "To shift fundamental business strategy or product direction based on user feedback or market changes.",
        "phonetic": "/ˈpɪv.ət/",
        "partOfSpeech": "verb",
        "example": "After recognizing user interest in flashcards, the startup decided to pivot completely.",
        "imageUrl": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80",
        "tags": [
          "startups",
          "strategy",
          "business"
        ]
      },
      {
        "front": "Trade-off",
        "back": "A situational decision that involves losing one desirable quality in return for gaining another.",
        "phonetic": "/ˈtreɪd.ɒf/",
        "partOfSpeech": "noun",
        "example": "Caching reduces server latency, but the trade-off is higher memory consumption.",
        "imageUrl": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80",
        "tags": [
          "engineering",
          "decision-making",
          "systems"
        ]
      },
      {
        "front": "Benchmark",
        "back": "A standard or reference point against which performance, speed, or quality can be measured.",
        "phonetic": "/ˈbentʃ.mɑːk/",
        "partOfSpeech": "noun",
        "example": "Our load tests showed the updated database queries beat the baseline benchmark by 40%.",
        "imageUrl": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
        "tags": [
          "metrics",
          "performance",
          "tech"
        ]
      },
      {
        "front": "Scalability",
        "back": "The capability of a system or network to handle growing amounts of work without failing.",
        "phonetic": "/ˌskeɪ.ləˈbɪl.ə.ti/",
        "partOfSpeech": "noun",
        "example": "Designing microservices with stateless containers ensures effortless scalability.",
        "imageUrl": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
        "tags": [
          "architecture",
          "systems",
          "tech"
        ]
      },
      {
        "front": "Deliverable",
        "back": "A tangible product, service, or feature that must be completed and handed over at the end of a milestone.",
        "phonetic": "/dɪˈlɪv.ər.ə.bəl/",
        "partOfSpeech": "noun",
        "example": "The interactive prototype is the primary deliverable scheduled for Friday's sprint review.",
        "imageUrl": "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&q=80",
        "tags": [
          "project-management",
          "workplace"
        ]
      },
      {
        "front": "Streamline",
        "back": "To make an organization, process, or system more efficient by simplifying or eliminating redundant steps.",
        "phonetic": "/ˈstriːm.laɪn/",
        "partOfSpeech": "verb",
        "example": "We redesigned the onboarding funnel to streamline new customer registrations.",
        "imageUrl": "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&q=80",
        "tags": [
          "process",
          "optimization",
          "business"
        ]
      },
      {
        "front": "Deprecate",
        "back": "To declare a software feature or API obsolete and warn users against using it in future development.",
        "phonetic": "/ˈdep.rə.keɪt/",
        "partOfSpeech": "verb",
        "example": "The legacy v1 REST endpoints will be deprecated next quarter in favor of GraphQL.",
        "imageUrl": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80",
        "tags": [
          "engineering",
          "api",
          "software"
        ]
      },
      {
        "front": "Onboard",
        "back": "To integrate and train a new employee or customer into an organization or platform.",
        "phonetic": "/ˌɒnˈbɔːd/",
        "partOfSpeech": "verb",
        "example": "The human resources team designed a week-long workshop to onboard junior software engineers.",
        "imageUrl": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80",
        "tags": [
          "workplace",
          "training",
          "hr"
        ]
      },
      {
        "front": "Roadmap",
        "back": "A strategic plan or visual timeline outlining the goals and evolution of a product or project.",
        "phonetic": "/ˈrəʊd.mæp/",
        "partOfSpeech": "noun",
        "example": "The product manager presented the Q4 product roadmap during the all-hands meeting.",
        "imageUrl": "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=600&q=80",
        "tags": [
          "planning",
          "product",
          "strategy"
        ]
      },
      {
        "front": "Stakeholder",
        "back": "A person, group, or organization with a vested interest in the outcome of a project or business.",
        "phonetic": "/ˈsteɪkˌhəʊl.dər/",
        "partOfSpeech": "noun",
        "example": "Before finalizing the contract terms, we gathered feedback from all key stakeholders.",
        "imageUrl": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
        "tags": [
          "business",
          "management",
          "corporate"
        ]
      },
      {
        "front": "Rollout",
        "back": "The staged introduction or release of a new product, system, or software update to users.",
        "phonetic": "/ˈrəʊl.aʊt/",
        "partOfSpeech": "noun",
        "example": "The gradual rollout to beta users uncovered two critical bugs before the global launch.",
        "imageUrl": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
        "tags": [
          "release",
          "devops",
          "tech"
        ]
      },
      {
        "front": "Latency",
        "back": "The time delay between a user request and the corresponding response from a computer or network.",
        "phonetic": "/ˈleɪ.tən.si/",
        "partOfSpeech": "noun",
        "example": "By deploying servers across edge locations worldwide, we reduced network latency to under 30ms.",
        "imageUrl": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
        "tags": [
          "networking",
          "performance",
          "engineering"
        ]
      },
      {
        "front": "Downtime",
        "back": "A period during which an application, machine, or system is unavailable or out of operation.",
        "phonetic": "/ˈdaʊn.taɪm/",
        "partOfSpeech": "noun",
        "example": "The database migration caused fifteen minutes of scheduled downtime in the middle of the night.",
        "imageUrl": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80",
        "tags": [
          "devops",
          "infrastructure",
          "systems"
        ]
      },
      {
        "front": "Redundancy",
        "back": "The inclusion of extra components or duplicate backups that ensure continuous functioning if one fails.",
        "phonetic": "/rɪˈdʌn.dən.si/",
        "partOfSpeech": "noun",
        "example": "Cloud architecture relies on server redundancy to prevent total outages when hardware fails.",
        "imageUrl": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80",
        "tags": [
          "reliability",
          "architecture",
          "hardware"
        ]
      },
      {
        "front": "Heuristic",
        "back": "A practical rule of thumb or shortcut used to solve problems or make decisions quickly.",
        "phonetic": "/hjʊəˈrɪs.tɪk/",
        "partOfSpeech": "noun",
        "example": "The algorithm uses a simple search heuristic to find an approximate path in real time.",
        "imageUrl": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&q=80",
        "tags": [
          "algorithms",
          "science",
          "math"
        ]
      },
      {
        "front": "Retrospective",
        "back": "A meeting held by a team after a sprint or project to evaluate what went well and what can improve.",
        "phonetic": "/ˌret.rəˈspek.tɪv/",
        "partOfSpeech": "noun",
        "example": "During our agile retrospective, the team decided to improve code review documentation.",
        "imageUrl": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&q=80",
        "tags": [
          "agile",
          "teamwork",
          "scrum"
        ]
      },
      {
        "front": "Milestone",
        "back": "A significant event or stage in the development or progress of a major endeavor.",
        "phonetic": "/ˈmaɪl.stəʊn/",
        "partOfSpeech": "noun",
        "example": "Reaching one million active daily users was a remarkable milestone for the development team.",
        "imageUrl": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80",
        "tags": [
          "goals",
          "achievement",
          "project"
        ]
      },
      {
        "front": "Throughput",
        "back": "The amount of data, transactions, or material processed through a system within a specific time.",
        "phonetic": "/ˈθruː.pʊt/",
        "partOfSpeech": "noun",
        "example": "Optimizing the payment gateway increased our transaction throughput by fifty percent.",
        "imageUrl": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80",
        "tags": [
          "performance",
          "data",
          "computing"
        ]
      }
    ]
  },
  {
    "id": "manga-anime-expressions",
    "name": "Words Found in Manga & Fiction",
    "description": "Vivid verbs, dramatic descriptors, and expressive vocabulary frequently encountered in manga and novels.",
    "targetLanguage": "en",
    "category": "Storytelling & Fiction",
    "icon": "📖",
    "level": "Intermediate",
    "cards": [
      {
        "front": "Fend",
        "back": "To defend oneself against a physical attack, challenge, or difficulty; to push away.",
        "phonetic": "/fend/",
        "partOfSpeech": "verb",
        "example": "Armed only with a wooden shield, the scout had to fend off three wolves in the dark forest.",
        "imageUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
        "tags": [
          "verb",
          "fiction",
          "combat"
        ]
      },
      {
        "front": "Budge",
        "back": "To move slightly, or to yield and change an opinion under pressure.",
        "phonetic": "/bʌdʒ/",
        "partOfSpeech": "verb",
        "example": "I pushed against the massive temple door with all my strength, but it wouldn't budge an inch.",
        "imageUrl": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
        "tags": [
          "verb",
          "action",
          "fiction"
        ]
      },
      {
        "front": "Perched",
        "back": "Situated or balanced safely on an elevated, precarious, or narrow edge.",
        "phonetic": "/pɜːtʃt/",
        "partOfSpeech": "adjective",
        "example": "A solitary black falcon perched silently on the castle parapet as the blood moon rose.",
        "imageUrl": "https://images.unsplash.com/photo-1549608276-5786777e6587?w=600&q=80",
        "tags": [
          "adjective",
          "scenery",
          "manga"
        ]
      },
      {
        "front": "Rabble",
        "back": "A disorderly crowd, unruly mob, or group viewed as chaotic and unrefined.",
        "phonetic": "/ˈræb.əl/",
        "partOfSpeech": "noun",
        "example": "The elite palace guards struggled to hold the courtyard against the surging rabble.",
        "imageUrl": "https://images.unsplash.com/photo-1508873696983-2df5293cbdaf?w=600&q=80",
        "tags": [
          "noun",
          "narrative",
          "fiction"
        ]
      },
      {
        "front": "Biding",
        "back": "Waiting patiently for a favorable opportunity or ideal moment to take action.",
        "phonetic": "/ˈbaɪ.dɪŋ/",
        "partOfSpeech": "verb",
        "example": "The masked assassin remained motionless in the rafters, biding his time until the banquet ended.",
        "imageUrl": "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=600&q=80",
        "tags": [
          "verb",
          "stealth",
          "fiction"
        ]
      },
      {
        "front": "Brunt",
        "back": "The main force, primary shock, or worst part of a violent impact or catastrophe.",
        "phonetic": "/brʌnt/",
        "partOfSpeech": "noun",
        "example": "The heavy armored vanguard bore the full brunt of the dragon's devastating blast.",
        "imageUrl": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&q=80",
        "tags": [
          "noun",
          "battle",
          "fiction"
        ]
      },
      {
        "front": "Strides",
        "back": "To walk with long, decisive, and confident paces.",
        "phonetic": "/straɪdz/",
        "partOfSpeech": "noun",
        "example": "With long, purposeful strides, the supreme commander walked into the throne room without fear.",
        "imageUrl": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
        "tags": [
          "noun",
          "movement",
          "character"
        ]
      },
      {
        "front": "Chieftain",
        "back": "The leader or supreme head of a clan, nomadic tribe, or warrior band.",
        "phonetic": "/ˈtʃiːf.tən/",
        "partOfSpeech": "noun",
        "example": "The mountain chieftain raised his glowing battleaxe and roared to rally his clan.",
        "imageUrl": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&q=80",
        "tags": [
          "noun",
          "leadership",
          "fantasy"
        ]
      },
      {
        "front": "Clench",
        "back": "To close or press tightly together, such as the hands into fists or the teeth in anger.",
        "phonetic": "/klentʃ/",
        "partOfSpeech": "verb",
        "example": "Hearing the villain mock his fallen companions, Hiro clenched his fists until his knuckles turned white.",
        "imageUrl": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
        "tags": [
          "verb",
          "emotion",
          "manga"
        ]
      },
      {
        "front": "Glower",
        "back": "To look or stare with sullen dislike, hostility, or intense silent anger.",
        "phonetic": "/ˈɡlaʊ.ər/",
        "partOfSpeech": "verb",
        "example": "The defeated rival glowered at the champion from the shadowy corner of the arena.",
        "imageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
        "tags": [
          "verb",
          "expression",
          "fiction"
        ]
      },
      {
        "front": "Looming",
        "back": "Appearing as a shadowy, threatening, or towering form in the near distance.",
        "phonetic": "/ˈluː.mɪŋ/",
        "partOfSpeech": "adjective",
        "example": "The shadowy colossus was looming over the destroyed citadel, blotting out the daylight.",
        "imageUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
        "tags": [
          "adjective",
          "atmosphere",
          "fiction"
        ]
      },
      {
        "front": "Tremor",
        "back": "An involuntary trembling motion, vibration, or slight earthquake shaking the ground.",
        "phonetic": "/ˈtrem.ər/",
        "partOfSpeech": "noun",
        "example": "A deep subterranean tremor shook the fortress foundations as the ancient beast awoke.",
        "imageUrl": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
        "tags": [
          "noun",
          "earthquake",
          "action"
        ]
      },
      {
        "front": "Vow",
        "back": "A solemn, binding promise or pledge made with deep conviction.",
        "phonetic": "/vaʊ/",
        "partOfSpeech": "noun",
        "example": "Drawing his sacred blade, the young swordsman swore a vow to protect his kingdom.",
        "imageUrl": "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
        "tags": [
          "noun",
          "honor",
          "oath"
        ]
      },
      {
        "front": "Relentless",
        "back": "Oppressively constant, unyielding, or refusing to stop or show mercy.",
        "phonetic": "/rɪˈlent.ləs/",
        "partOfSpeech": "adjective",
        "example": "Despite exhaustion and heavy snow, their relentless pursuit brought them to the enemy's encampment.",
        "imageUrl": "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&q=80",
        "tags": [
          "adjective",
          "determination",
          "fiction"
        ]
      },
      {
        "front": "Smirk",
        "back": "To smile in an irritating, conceited, or self-satisfied manner.",
        "phonetic": "/smɜːk/",
        "partOfSpeech": "verb",
        "example": "The sorcerer couldn't help but smirk as his opponent fell straight into his trap.",
        "imageUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
        "tags": [
          "verb",
          "attitude",
          "manga"
        ]
      },
      {
        "front": "Vanquish",
        "back": "To defeat completely, conquer, or overcome in battle or competition.",
        "phonetic": "/ˈvæŋ.kwɪʃ/",
        "partOfSpeech": "verb",
        "example": "Only the chosen warrior possessed enough spiritual strength to vanquish the dark lord.",
        "imageUrl": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&q=80",
        "tags": [
          "verb",
          "victory",
          "fantasy"
        ]
      },
      {
        "front": "Menacing",
        "back": "Suggesting the presence of imminent danger, evil, or harm.",
        "phonetic": "/ˈmen.ɪ.sɪŋ/",
        "partOfSpeech": "adjective",
        "example": "The dark knight let out a menacing laugh before unsheathing his cursed two-handed broadsword.",
        "imageUrl": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
        "tags": [
          "adjective",
          "danger",
          "villain"
        ]
      },
      {
        "front": "Skirmish",
        "back": "A brief, unplanned fight or minor conflict between small groups of fighters.",
        "phonetic": "/ˈskɜː.mɪʃ/",
        "partOfSpeech": "noun",
        "example": "A border skirmish broke out when reconnaissance patrols crossed paths in the canyon.",
        "imageUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
        "tags": [
          "noun",
          "combat",
          "warfare"
        ]
      },
      {
        "front": "Abyss",
        "back": "A deep, immeasurable chasm, void, or bottomless dark pit.",
        "phonetic": "/əˈbɪs/",
        "partOfSpeech": "noun",
        "example": "He stared down into the glowing abyss, unsure if anything could survive such a fall.",
        "imageUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80",
        "tags": [
          "noun",
          "mystery",
          "fantasy"
        ]
      },
      {
        "front": "Berserk",
        "back": "Out of control with wild frenzy, uncontrollable fury, or violent destructive energy.",
        "phonetic": "/bəˈzɜːk/",
        "partOfSpeech": "adjective",
        "example": "When his armor cracked, the warrior went berserk and shattered the stone pillars around him.",
        "imageUrl": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
        "tags": [
          "adjective",
          "rage",
          "manga"
        ]
      },
      {
        "front": "Pierce",
        "back": "To penetrate, puncture, or cut sharply into or through an object.",
        "phonetic": "/pɪəs/",
        "partOfSpeech": "verb",
        "example": "The silver arrow was sharp enough to pierce through enchanted dragon scales.",
        "imageUrl": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
        "tags": [
          "verb",
          "combat",
          "fantasy"
        ]
      }
    ]
  },
  {
    "id": "essential-phrasal-verbs",
    "name": "Top Phrasal Verbs in Context",
    "description": "The most common multi-word verbs that sound natural in everyday spoken English.",
    "targetLanguage": "en",
    "category": "Grammar & Flow",
    "icon": "⚡",
    "level": "Beginner",
    "cards": [
      {
        "front": "Figure out",
        "back": "To discover, understand, or solve a problem through thought and investigation.",
        "phonetic": "/ˈfɪɡ.ər aʊt/",
        "partOfSpeech": "phrasal verb",
        "example": "We spent the entire afternoon trying to figure out why the program was crashing.",
        "imageUrl": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "daily",
          "problem-solving"
        ]
      },
      {
        "front": "Bring up",
        "back": "To mention or introduce a topic into a conversation.",
        "phonetic": "/brɪŋ ʌp/",
        "partOfSpeech": "phrasal verb",
        "example": "I didn't want to bring up the budget issues during lunch, but it was unavoidable.",
        "imageUrl": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "conversation",
          "communication"
        ]
      },
      {
        "front": "Call off",
        "back": "To cancel an event or activity that was previously arranged.",
        "phonetic": "/kɔːl ɒf/",
        "partOfSpeech": "phrasal verb",
        "example": "Due to heavy thunderstorms, the organizers had to call off the outdoor festival.",
        "imageUrl": "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "plans",
          "daily"
        ]
      },
      {
        "front": "Come across",
        "back": "To meet or find someone or something by chance.",
        "phonetic": "/kʌm əˈkrɒs/",
        "partOfSpeech": "phrasal verb",
        "example": "While reorganizing the attic, I came across an old photo album from my childhood.",
        "imageUrl": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "discovery",
          "daily"
        ]
      },
      {
        "front": "Give in",
        "back": "To finally surrender or agree to something after resisting.",
        "phonetic": "/ɡɪv ɪn/",
        "partOfSpeech": "phrasal verb",
        "example": "After weeks of persistent requests from the kids, we gave in and got a puppy.",
        "imageUrl": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "negotiation",
          "conflict"
        ]
      },
      {
        "front": "Look forward to",
        "back": "To feel happy and excited about something that is going to happen in the future.",
        "phonetic": "/lʊk ˈfɔː.wəd tuː/",
        "partOfSpeech": "phrasal verb",
        "example": "I am really looking forward to visiting Japan next spring to see the cherry blossoms.",
        "imageUrl": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "future",
          "emotion"
        ]
      },
      {
        "front": "Turn down",
        "back": "To refuse, decline, or reject an offer, application, or request.",
        "phonetic": "/tɜːn daʊn/",
        "partOfSpeech": "phrasal verb",
        "example": "He had to turn down the job offer because the daily commute was over two hours.",
        "imageUrl": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "decisions",
          "business"
        ]
      },
      {
        "front": "Catch up",
        "back": "To reach the same standard or position as someone, or to exchange news with a friend after time apart.",
        "phonetic": "/kætʃ ʌp/",
        "partOfSpeech": "phrasal verb",
        "example": "Let's grab a coffee this weekend so we can catch up on everything that's happened.",
        "imageUrl": "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "friendship",
          "social"
        ]
      },
      {
        "front": "Run out of",
        "back": "To use up the available supply of something so that none remains.",
        "phonetic": "/rʌn aʊt əv/",
        "partOfSpeech": "phrasal verb",
        "example": "We had to pause the baking recipe because we ran out of butter and eggs.",
        "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "daily",
          "supplies"
        ]
      },
      {
        "front": "Look up to",
        "back": "To admire and respect someone as an inspiring role model.",
        "phonetic": "/lʊk ʌp tuː/",
        "partOfSpeech": "phrasal verb",
        "example": "Young soccer players around the world look up to their coaches and favorite champions.",
        "imageUrl": "https://images.unsplash.com/photo-1526676037777-05a232554f77?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "admiration",
          "respect"
        ]
      },
      {
        "front": "Back down",
        "back": "To yield or withdraw from a position, claim, or argument in the face of opposition.",
        "phonetic": "/bæk daʊn/",
        "partOfSpeech": "phrasal verb",
        "example": "Neither debater was willing to back down during the heated panel discussion.",
        "imageUrl": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "conflict",
          "debate"
        ]
      },
      {
        "front": "Break down",
        "back": "To stop functioning mechanically or to separate complex information into simpler components.",
        "phonetic": "/breɪk daʊn/",
        "partOfSpeech": "phrasal verb",
        "example": "Can you break down the financial calculations so everyone understands where the money went?",
        "imageUrl": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "analysis",
          "explanation"
        ]
      },
      {
        "front": "Put off",
        "back": "To delay, postpone, or procrastinate doing something until a later time.",
        "phonetic": "/pʊt ɒf/",
        "partOfSpeech": "phrasal verb",
        "example": "You shouldn't put off filing your taxes until the final deadline night.",
        "imageUrl": "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "time",
          "procrastination"
        ]
      },
      {
        "front": "Hold on",
        "back": "To wait for a short period of time, or to grip tightly.",
        "phonetic": "/həʊld ɒn/",
        "partOfSpeech": "phrasal verb",
        "example": "Hold on for a second while I grab a notepad to write down that address.",
        "imageUrl": "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "patience",
          "conversation"
        ]
      },
      {
        "front": "Carry out",
        "back": "To perform, execute, or complete a task, plan, or scientific experiment.",
        "phonetic": "/ˈkær.i aʊt/",
        "partOfSpeech": "phrasal verb",
        "example": "The research lab will carry out clinical trials to verify the vaccine's efficacy.",
        "imageUrl": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "action",
          "work"
        ]
      },
      {
        "front": "Drop by",
        "back": "To pay a brief, often casual and informal visit to someone or a place.",
        "phonetic": "/drɒp baɪ/",
        "partOfSpeech": "phrasal verb",
        "example": "Feel free to drop by my office this afternoon if you want to review the slides.",
        "imageUrl": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "visit",
          "casual"
        ]
      },
      {
        "front": "Settle down",
        "back": "To adopt a stable, calm lifestyle or to become quiet and peaceful after excitement.",
        "phonetic": "/ˈset.əl daʊn/",
        "partOfSpeech": "phrasal verb",
        "example": "The students quickly settled down once the teacher stood at the blackboard.",
        "imageUrl": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "calm",
          "lifestyle"
        ]
      },
      {
        "front": "Cheer up",
        "back": "To become happier or to help make someone feel happier when they are down.",
        "phonetic": "/tʃɪər ʌp/",
        "partOfSpeech": "phrasal verb",
        "example": "A warm cup of hot chocolate and a comedy film always cheered her up on rainy days.",
        "imageUrl": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "emotion",
          "happiness"
        ]
      },
      {
        "front": "Show off",
        "back": "To behave in a way intended to attract admiration, praise, or attention from others.",
        "phonetic": "/ʃəʊ ɒf/",
        "partOfSpeech": "phrasal verb",
        "example": "He loves to show off his vintage electric guitar whenever guests visit his studio.",
        "imageUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "pride",
          "behavior"
        ]
      },
      {
        "front": "Stand out",
        "back": "To be much better, distinct, or noticeably more prominent than others in a group.",
        "phonetic": "/stænd aʊt/",
        "partOfSpeech": "phrasal verb",
        "example": "Her innovative design made her portfolio stand out immediately among all applicants.",
        "imageUrl": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "excellence",
          "distinction"
        ]
      },
      {
        "front": "Count on",
        "back": "To rely on or trust someone or something to provide help or fulfill expectations.",
        "phonetic": "/kaʊnt ɒn/",
        "partOfSpeech": "phrasal verb",
        "example": "You can always count on Sarah to arrive on time and prepared for client presentations.",
        "imageUrl": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80",
        "tags": [
          "phrasal-verb",
          "trust",
          "reliability"
        ]
      }
    ]
  }
];

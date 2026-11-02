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
    "id": "travel-airport-essentials",
    "name": "Travel & Airport Essentials",
    "description": "Crucial vocabulary for navigating airports, flights, hotels, and international journeys with confidence.",
    "targetLanguage": "en",
    "category": "Travel & Daily Life",
    "icon": "✈️",
    "level": "Intermediate",
    "cards": [
      {
        "front": "Boarding pass",
        "back": "An official document or digital barcode showing your flight details and granting permission to board an airplane.",
        "phonetic": "/ˈbɔː.dɪŋ ˌpɑːs/",
        "partOfSpeech": "noun",
        "example": "Please keep your passport and boarding pass ready when approaching the gate.",
        "imageUrl": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80",
        "tags": [
          "travel",
          "airport",
          "transport"
        ]
      },
      {
        "front": "Layover",
        "back": "A temporary stop or period of waiting between connecting flights or travel legs.",
        "phonetic": "/ˈleɪˌəʊ.vər/",
        "partOfSpeech": "noun",
        "example": "We had a four-hour layover in Frankfurt before our onward flight to Tokyo.",
        "imageUrl": "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=600&q=80",
        "tags": [
          "travel",
          "flights",
          "transit"
        ]
      },
      {
        "front": "Customs",
        "back": "The official government checkpoint where travelers' baggage is inspected for duties or prohibited items.",
        "phonetic": "/ˈkʌs.təmz/",
        "partOfSpeech": "noun",
        "example": "After collecting our baggage, we proceeded through customs to declare the purchased electronics.",
        "imageUrl": "https://images.unsplash.com/photo-1517400508447-f8dd518b86db?w=600&q=80",
        "tags": [
          "travel",
          "security",
          "border"
        ]
      },
      {
        "front": "Itinerary",
        "back": "A detailed schedule, route, or planned list of activities for a trip or journey.",
        "phonetic": "/aɪˈtɪn.ər.ər.i/",
        "partOfSpeech": "noun",
        "example": "Our travel agency provided a comprehensive day-by-day itinerary for our trip through Italy.",
        "imageUrl": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80",
        "tags": [
          "travel",
          "planning",
          "organization"
        ]
      },
      {
        "front": "Baggage claim",
        "back": "The airport designated area with conveyor carousels where passengers collect their checked luggage after arrival.",
        "phonetic": "/ˈbæɡ.ɪdʒ kleɪm/",
        "partOfSpeech": "noun",
        "example": "Follow the arrival signs down to the lower level to reach baggage claim carousel number four.",
        "imageUrl": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80",
        "tags": [
          "airport",
          "luggage",
          "travel"
        ]
      },
      {
        "front": "Delay",
        "back": "A period of time by which a scheduled flight, train, or event is postponed or made late.",
        "phonetic": "/dɪˈleɪ/",
        "partOfSpeech": "noun",
        "example": "The heavy fog over London caused a two-hour flight delay across all outbound departures.",
        "imageUrl": "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&q=80",
        "tags": [
          "travel",
          "time",
          "schedules"
        ]
      },
      {
        "front": "Carry-on",
        "back": "A small suitcase or bag that a passenger is permitted to bring into the passenger cabin of an airplane.",
        "phonetic": "/ˈkær.i.ɒn/",
        "partOfSpeech": "noun",
        "example": "Ensure your carry-on luggage complies with the airline overhead bin size restrictions.",
        "imageUrl": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
        "tags": [
          "airport",
          "luggage",
          "packing"
        ]
      },
      {
        "front": "Departure",
        "back": "The act of leaving a place, especially the scheduled leaving of an airplane, bus, or train.",
        "phonetic": "/dɪˈpɑː.tʃər/",
        "partOfSpeech": "noun",
        "example": "All international departures are scheduled from Terminal 3 on the third concourse.",
        "imageUrl": "https://images.unsplash.com/photo-1508873696983-2df5293cbdaf?w=600&q=80",
        "tags": [
          "airport",
          "flights",
          "schedule"
        ]
      },
      {
        "front": "Jet lag",
        "back": "Tiredness and disorientation caused by traveling rapidly across multiple time zones by airplane.",
        "phonetic": "/ˈdʒet ˌlæɡ/",
        "partOfSpeech": "noun",
        "example": "Drinking plenty of water and walking in sunlight helps minimize the symptoms of jet lag.",
        "imageUrl": "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&q=80",
        "tags": [
          "travel",
          "health",
          "time"
        ]
      },
      {
        "front": "Shuttle",
        "back": "A bus, train, or van that travels regularly back and forth between two fixed points, like an airport and city center.",
        "phonetic": "/ˈʃʌt.əl/",
        "partOfSpeech": "noun",
        "example": "The hotel offers a complimentary 24-hour shuttle service connecting guests to the main terminal.",
        "imageUrl": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80",
        "tags": [
          "transport",
          "travel",
          "city"
        ]
      },
      {
        "front": "Reservation",
        "back": "An arrangement by which a hotel room, flight seat, or restaurant table is kept for a specific guest.",
        "phonetic": "/ˌrez.əˈveɪ.ʃən/",
        "partOfSpeech": "noun",
        "example": "I called the front desk to confirm our reservation for a quiet ocean-view suite.",
        "imageUrl": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
        "tags": [
          "hospitality",
          "hotel",
          "planning"
        ]
      },
      {
        "front": "Sightseeing",
        "back": "The activity of visiting famous landmarks, monuments, and places of interest as a tourist.",
        "phonetic": "/ˈsaɪtˌsiː.ɪŋ/",
        "partOfSpeech": "noun",
        "example": "We spent our first afternoon in Paris sightseeing around the historical Latin Quarter.",
        "imageUrl": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
        "tags": [
          "tourism",
          "vacation",
          "culture"
        ]
      },
      {
        "front": "Currency",
        "back": "The system of money in common use within a particular country or economic zone.",
        "phonetic": "/ˈkʌr.ən.si/",
        "partOfSpeech": "noun",
        "example": "You can exchange foreign currency at the bank counter near the airport arrivals hall.",
        "imageUrl": "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80",
        "tags": [
          "money",
          "travel",
          "finance"
        ]
      },
      {
        "front": "Duty-free",
        "back": "Exempt from national tax or customs import tariffs, typical of goods sold in international departure lounges.",
        "phonetic": "/ˌdʒuː.tiˈfriː/",
        "partOfSpeech": "adjective",
        "example": "She purchased perfume and confectionery at the duty-free boutique before boarding.",
        "imageUrl": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80",
        "tags": [
          "shopping",
          "airport",
          "goods"
        ]
      },
      {
        "front": "Terminal",
        "back": "A major airport building containing check-in desks, security, and gates for passenger arrivals and departures.",
        "phonetic": "/ˈtɜː.mɪ.nəl/",
        "partOfSpeech": "noun",
        "example": "Please check your boarding ticket carefully to ensure your taxi drops you off at the correct terminal.",
        "imageUrl": "https://images.unsplash.com/photo-1542296332-2e4473faf563?w=600&q=80",
        "tags": [
          "airport",
          "infrastructure",
          "travel"
        ]
      },
      {
        "front": "Accommodation",
        "back": "A temporary place to stay or sleep during a journey, such as a hotel, hostel, or rental apartment.",
        "phonetic": "/əˌkɒm.əˈdeɪ.ʃən/",
        "partOfSpeech": "noun",
        "example": "Budget travelers can find clean, comfortable accommodation near the central railway station.",
        "imageUrl": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
        "tags": [
          "hospitality",
          "lodging",
          "travel"
        ]
      },
      {
        "front": "Landmark",
        "back": "An iconic building, natural feature, or monument easily recognized and used for navigation or tourism.",
        "phonetic": "/ˈlænd.mɑːk/",
        "partOfSpeech": "noun",
        "example": "The ancient stone bridge is considered the city's most distinctive historical landmark.",
        "imageUrl": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
        "tags": [
          "geography",
          "tourism",
          "sightseeing"
        ]
      },
      {
        "front": "Overbooked",
        "back": "Having accepted more passenger reservations or ticket sales than there are seats or rooms available.",
        "phonetic": "/ˌəʊ.vəˈbʊkt/",
        "partOfSpeech": "adjective",
        "example": "Because the evening flight was overbooked, the airline offered travel vouchers to volunteers.",
        "imageUrl": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
        "tags": [
          "flights",
          "hospitality",
          "travel"
        ]
      },
      {
        "front": "Connection",
        "back": "A secondary train, bus, or airplane that allows a passenger to continue their journey after transferring.",
        "phonetic": "/kəˈnek.ʃən/",
        "partOfSpeech": "noun",
        "example": "With our incoming flight delayed forty minutes, we sprinted to make our tight connection.",
        "imageUrl": "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=600&q=80",
        "tags": [
          "transit",
          "flights",
          "travel"
        ]
      },
      {
        "front": "Passport control",
        "back": "The government area at international entry ports where immigration officers verify travelers' travel identities and visas.",
        "phonetic": "/ˈpɑːs.pɔːt kənˌtrəʊl/",
        "partOfSpeech": "noun",
        "example": "Citizens holding biometric e-passports can pass through automated gates at passport control.",
        "imageUrl": "https://images.unsplash.com/photo-1517400508447-f8dd518b86db?w=600&q=80",
        "tags": [
          "immigration",
          "airport",
          "security"
        ]
      },
      {
        "front": "Destination",
        "back": "The final place to which someone or something is going or traveling.",
        "phonetic": "/ˌdes.tɪˈneɪ.ʃən/",
        "partOfSpeech": "noun",
        "example": "After sixteen hours of flying and two layovers, we finally reached our tropical destination.",
        "imageUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
        "tags": [
          "travel",
          "geography",
          "vacation"
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
  },
  {
    "id": "es-everyday-essentials",
    "name": "Spanish Everyday Essentials",
    "description": "Essential high-frequency expressions and idioms to start speaking natural conversational Spanish.",
    "targetLanguage": "es",
    "category": "Conversational",
    "icon": "🇪🇸",
    "level": "Beginner",
    "cards": [
      {
        "front": "Estar en las nubes",
        "back": "To be daydreaming, distracted, or lost in thought.",
        "phonetic": "/esˈtaɾ en las ˈnubes/",
        "partOfSpeech": "idiom",
        "example": "Hoy Juan está en las nubes y no presta atención a la clase.",
        "imageUrl": "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&q=80",
        "tags": ["es", "idiom", "daily"]
      },
      {
        "front": "Tomar el pelo",
        "back": "To tease, joke with, or pull someone's leg.",
        "phonetic": "/toˈmaɾ el ˈpelo/",
        "partOfSpeech": "idiom",
        "example": "No te enfades, solo te estaba tomando el pelo.",
        "imageUrl": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
        "tags": ["es", "humor", "slang"]
      },
      {
        "front": "Dar en el clavo",
        "back": "To hit the nail on the head; to get something exactly right.",
        "phonetic": "/daɾ en el ˈklaβo/",
        "partOfSpeech": "idiom",
        "example": "Tu respuesta dio justo en el clavo.",
        "imageUrl": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
        "tags": ["es", "idiom", "success"]
      },
      {
        "front": "Cuesta un ojo de la cara",
        "back": "To be extremely expensive (costs an arm and a leg).",
        "phonetic": "/ˈkwesta un ˈoxo ðe la ˈkaɾa/",
        "partOfSpeech": "idiom",
        "example": "Ese coche nuevo cuesta un ojo de la cara.",
        "imageUrl": "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80",
        "tags": ["es", "daily", "money"]
      },
      {
        "front": "Poco a poco",
        "back": "Little by little; step by step; gradually.",
        "phonetic": "/ˈpoko a ˈpoko/",
        "partOfSpeech": "adverb phrase",
        "example": "Poco a poco iremos mejorando la pronunciación.",
        "imageUrl": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80",
        "tags": ["es", "progress", "mindset"]
      }
    ]
  },
  {
    "id": "fr-foundations",
    "name": "French Foundations & Daily Life",
    "description": "Essential French conversational vocabulary and idioms to communicate with confidence.",
    "targetLanguage": "fr",
    "category": "Conversational",
    "icon": "🇫🇷",
    "level": "Beginner",
    "cards": [
      {
        "front": "Poser un lapin",
        "back": "To stand someone up; to fail to show up for a scheduled meeting.",
        "phonetic": "/po.ze œ̃ la.pɛ̃/",
        "partOfSpeech": "idiom",
        "example": "J'ai attendu une heure au café, mais il m'a posé un lapin.",
        "imageUrl": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
        "tags": ["fr", "idiom", "relationships"]
      },
      {
        "front": "Coup de foudre",
        "back": "Love at first sight; sudden overwhelming infatuation or excitement.",
        "phonetic": "/ku də fudʁ/",
        "partOfSpeech": "idiom",
        "example": "Quand ils se sont rencontrés à Paris, ce fut le coup de foudre.",
        "imageUrl": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=80",
        "tags": ["fr", "romance", "daily"]
      },
      {
        "front": "Avoir le cafard",
        "back": "To feel down, melancholic, or blue.",
        "phonetic": "/a.vwaʁ lə ka.faʁ/",
        "partOfSpeech": "idiom",
        "example": "Avec cette pluie continue, tout le monde a un peu le cafard.",
        "imageUrl": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&q=80",
        "tags": ["fr", "emotions", "idiom"]
      },
      {
        "front": "Ça marche",
        "back": "That works; alright; sounds good (very common confirmation).",
        "phonetic": "/sa maʁʃ/",
        "partOfSpeech": "expression",
        "example": "On se retrouve à huit heures ? - Oui, ça marche !",
        "imageUrl": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80",
        "tags": ["fr", "slang", "daily"]
      }
    ]
  },
  {
    "id": "de-core-expressions",
    "name": "German Core Expressions",
    "description": "High-yield German conversational phrases and idioms for everyday fluency.",
    "targetLanguage": "de",
    "category": "Conversational",
    "icon": "🇩🇪",
    "level": "Beginner",
    "cards": [
      {
        "front": "Daumen drücken",
        "back": "To cross one's fingers for good luck.",
        "phonetic": "/ˈdaʊ̯mən ˈdʁʏkn̩/",
        "partOfSpeech": "idiom",
        "example": "Ich habe morgen eine Prüfung. Drück mir die Daumen!",
        "imageUrl": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
        "tags": ["de", "luck", "idiom"]
      },
      {
        "front": "Schwein haben",
        "back": "To have stroke of good fortune or pure luck.",
        "phonetic": "/ʃvaɪ̯n ˈhaːbn̩/",
        "partOfSpeech": "idiom",
        "example": "Der Zug hatte Verspätung, da haben wir echt Schwein gehabt.",
        "imageUrl": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
        "tags": ["de", "luck", "daily"]
      },
      {
        "front": "Alles in Butter",
        "back": "Everything is in order; everything is fine and under control.",
        "phonetic": "/ˈaləs ɪn ˈbʊtɐ/",
        "partOfSpeech": "idiom",
        "example": "Keine Sorge, bei unserem Projekt ist alles in Butter.",
        "imageUrl": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80",
        "tags": ["de", "daily", "workplace"]
      }
    ]
  },
  {
    "id": "ja-essential-phrases",
    "name": "Japanese Essential Expressions",
    "description": "Fundamental conversational phrases and nuances for beginning Japanese learners.",
    "targetLanguage": "ja",
    "category": "Conversational",
    "icon": "🇯🇵",
    "level": "Beginner",
    "cards": [
      {
        "front": "お疲れ様 (Otsukaresama)",
        "back": "Thank you for your hard work; great job today (used when finishing work or greeting colleagues).",
        "phonetic": "/o.tsɯ.ka.ɾe.sa.ma/",
        "partOfSpeech": "expression",
        "example": "今日も一日、お疲れ様でした！",
        "imageUrl": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80",
        "tags": ["ja", "courtesy", "daily"]
      },
      {
        "front": "いただきます (Itadakimasu)",
        "back": "Humble gratitude spoken before eating a meal ('I gratefully receive').",
        "phonetic": "/i.ta.da.ki.ma.sɯ/",
        "partOfSpeech": "expression",
        "example": "料理が美味しそうですね。いただきます！",
        "imageUrl": "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80",
        "tags": ["ja", "culture", "food"]
      },
      {
        "front": "一期一会 (Ichigo Ichie)",
        "back": "Once-in-a-lifetime encounter; treasuring the unrepeatable nature of a moment.",
        "phonetic": "/i.tɕi.ɡo i.tɕi.e/",
        "partOfSpeech": "idiom",
        "example": "旅先での出会いは一期一会だから大切にしたい。",
        "imageUrl": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80",
        "tags": ["ja", "philosophy", "culture"]
      }
    ]
  }
];

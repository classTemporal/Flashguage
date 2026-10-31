// Supported Languages Registry & Speech Configuration for Flashguage

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  speechVoice: string;
  deckPresets: { name: string; desc: string }[];
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    speechVoice: "en-US",
    deckPresets: [
      { name: "🌟 Oxford 3000 Core Vocabulary", desc: "Top 3,000 foundational words for daily fluency" },
      { name: "💼 Business & Workplace English", desc: "Professional terms for meetings and corporate emails" },
      { name: "🎓 Academic & TOEFL Vocabulary", desc: "Advanced lexicon for university and exam preparation" },
      { name: "📚 Must-know Phrasal Verbs", desc: "Most common multi-word verbs in conversational English" },
    ],
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    speechVoice: "es-ES",
    deckPresets: [
      { name: "🇪🇸 1000 Palabras Más Frecuentes", desc: "Vocabulario esencial para conversar en español" },
      { name: "⚡ Verbos Irregulares y Tiempos Clave", desc: "Dominio de conjugaciones y tiempos verbales" },
      { name: "💬 Frases y Expresiones Cotidianas", desc: "Dichos y modismos de uso diario" },
      { name: "💼 Español Profesional y de Negocios", desc: "Términos formales para el trabajo y negocios" },
    ],
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    speechVoice: "fr-FR",
    deckPresets: [
      { name: "🇫🇷 Les 1000 Mots Essentiels", desc: "Vocabulaire de base indispensable pour débuter en français" },
      { name: "🍷 Expressions Idiomatiques Courantes", desc: "Expressions imagées pour parler comme un natif" },
      { name: "🥐 Voyage & Vie Quotidienne", desc: "Vocabulaire pratique pour se déplacer et commander" },
      { name: "🎓 Vocabulaire DELF B1-B2", desc: "Termes avancés pour réussir les certifications de français" },
    ],
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    speechVoice: "de-DE",
    deckPresets: [
      { name: "🇩🇪 Goethe-Zertifikat A1-B1 Grundwortschatz", desc: "Grundlegende Wörter für den Alltag" },
      { name: "⚙️ Deutsch im Beruf & Wirtschaft", desc: "Fachbegriffe für Meetings, Technik und Büro" },
      { name: "🧩 Zusammengesetzte Nomen & Redewendungen", desc: "Kompakte Wörter und typische Redensarten" },
    ],
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    speechVoice: "it-IT",
    deckPresets: [
      { name: "🇮🇹 Vocabolario Fondamentale", desc: "Le prime 1000 parole per comunicare in italiano" },
      { name: "☕ Modi di Dire & Espressioni Familiari", desc: "Frasi tipiche della conversazione quotidiana" },
      { name: "🍕 Viaggiare in Italia & Gastronomia", desc: "Termini utili per ristoranti, viaggi e arte" },
    ],
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    flag: "🇧🇷",
    speechVoice: "pt-BR",
    deckPresets: [
      { name: "🇧🇷 Vocabulário Essencial", desc: "Palavras mais usadas no português do dia a dia" },
      { name: "🌴 Expressões e Gírias Brasileiras", desc: "Modismos populares e gírias descontraídas" },
      { name: "💼 Português Corporativo & Formal", desc: "Comunicação profissional e redação" },
    ],
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    flag: "🇯🇵",
    speechVoice: "ja-JP",
    deckPresets: [
      { name: "🇯🇵 JLPT N5-N4 Vocabulario Inicial", desc: "Palabras fundamentales con kanji y kana" },
      { name: "🍜 Conversación y Viajes en Japón", desc: "Frases esenciales para comida, trenes y compras" },
      { name: "⛩️ JLPT N3 Vocabulario Intermedio", desc: "Vocabulario enriquecido para lectura fluida" },
    ],
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文 (Mandarin)",
    flag: "🇨🇳",
    speechVoice: "zh-CN",
    deckPresets: [
      { name: "🇨🇳 HSK 1-3 Vocabulario Básico", desc: "Caracteres simplificados y pinyin esencial" },
      { name: "🥢 Chino Práctico para Conversación", desc: "Diálogos del día a día y supervivencia" },
      { name: "📈 HSK 4-5 Vocabulario Intermedio-Avanzado", desc: "Palabras formales y noticias" },
    ],
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    flag: "🇰🇷",
    speechVoice: "ko-KR",
    deckPresets: [
      { name: "🇰🇷 Palabras Básicas en Hangul", desc: "Vocabulario fundamental para principiantes" },
      { name: "🎬 K-Drama & Frases Coloquiales", desc: "Expresiones que escuchas en series y música" },
      { name: "🏆 TOPIK I-II Vocabulario de Examen", desc: "Palabras indispensables para certificar tu nivel" },
    ],
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    flag: "🇷🇺",
    speechVoice: "ru-RU",
    deckPresets: [
      { name: "🇷🇺 Базовый словарь (Top 1000)", desc: "1000 palabras más frecuentes en ruso con cirílico" },
      { name: "❄️ Conversación Cotidiana y Turismo", desc: "Frases útiles para transporte y vida diaria" },
    ],
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    flag: "🇸🇦",
    speechVoice: "ar-SA",
    deckPresets: [
      { name: "🇸🇦 Vocabulario Árabe Estándar Moderno", desc: "Palabras clave para comunicación y lectura" },
      { name: "🕌 Frases Cotidianas y Saludos", desc: "Fórmulas de cortesía y expresiones comunes" },
    ],
  },
];

export function getLanguage(code?: string | null): LanguageInfo {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const normalized = code.toLowerCase().trim();
  const match = SUPPORTED_LANGUAGES.find(
    (l) => l.code === normalized || l.name.toLowerCase() === normalized
  );
  return match || SUPPORTED_LANGUAGES[0];
}

export function getSpeechVoice(code?: string | null): string {
  const lang = getLanguage(code);
  return lang.speechVoice;
}

/**
 * Universal browser text-to-speech for any supported language.
 */
export function speakInLanguage(text: string, languageCode: string = "en"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = getLanguage(languageCode);
    utterance.lang = lang.speechVoice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Speech synthesis error:", err);
  }
}

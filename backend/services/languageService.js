const axios = require('axios');

/**
 * Language Service for multilingual support
 * Handles language detection and translation for Indian languages
 */
class LanguageService {
  constructor() {
    // Supported languages with their codes
    this.supportedLanguages = {
      'english': 'en',
      'hindi': 'hi',
      'marathi': 'mr',
      'gujarati': 'gu',
      'bengali': 'bn',
      'tamil': 'ta',
      'telugu': 'te',
      'kannada': 'kn',
      'malayalam': 'ml',
      'punjabi': 'pa',
      'urdu': 'ur'
    };
    
    // Language detection patterns for common Indian languages
    this.languagePatterns = {
      // Hindi patterns
      'hi': [
        /[\u0900-\u097F]{3,}/,  // Hindi Unicode range
        /(कैसे|क्या|कौन|कहाँ|क्यों|मैं|हम|तुम|आप|वह|यह|मेरा|हमारा|मुझे|हमें)/i
      ],
      // Marathi patterns
      'mr': [
        /[\u0900-\u097F]{3,}.*?(आहे|नाही|काय|कसे|कोण|कुठे|का|मी|आम्ही|तू|तुम्ही|तो|ती|ते|माझा|आमचा|मला|आम्हाला)/i
      ],
      // Gujarati patterns
      'gu': [
        /[\u0A80-\u0AFF]{3,}/  // Gujarati Unicode range
      ],
      // Bengali patterns
      'bn': [
        /[\u0980-\u09FF]{3,}/  // Bengali Unicode range
      ],
      // Tamil patterns
      'ta': [
        /[\u0B80-\u0BFF]{3,}/  // Tamil Unicode range
      ],
      // Telugu patterns
      'te': [
        /[\u0C00-\u0C7F]{3,}/  // Telugu Unicode range
      ],
      // Kannada patterns
      'kn': [
        /[\u0C80-\u0CFF]{3,}/  // Kannada Unicode range
      ],
      // Malayalam patterns
      'ml': [
        /[\u0D00-\u0D7F]{3,}/  // Malayalam Unicode range
      ],
      // Punjabi patterns
      'pa': [
        /[\u0A00-\u0A7F]{3,}/  // Punjabi Unicode range
      ],
      // Urdu patterns
      'ur': [
        /[\u0600-\u06FF]{3,}/  // Urdu Unicode range
      ]
    };
    
    console.log('Language Service initialized with support for multiple Indian languages');
  }

  /**
   * Detect the language of a text
   * @param {string} text - The text to detect language from
   * @returns {string} - The detected language code
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return 'en'; // Default to English for empty text
    }
    
    // Check for language patterns
    for (const [langCode, patterns] of Object.entries(this.languagePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          console.log(`Detected language: ${langCode} for text starting with: ${text.substring(0, 20)}...`);
          return langCode;
        }
      }
    }
    
    // Default to English if no patterns match
    return 'en';
  }

  /**
   * Get language name from code
   * @param {string} langCode - The language code
   * @returns {string} - The language name
   */
  getLanguageName(langCode) {
    const languageNames = {
      'en': 'English',
      'hi': 'Hindi',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi',
      'ur': 'Urdu'
    };
    
    return languageNames[langCode] || 'Unknown';
  }

  /**
   * Create system message with language-specific instructions
   * @param {string} langCode - The language code
   * @param {Object} context - Additional context for the message
   * @returns {string} - The system message in the specified language
   */
  createSystemMessageForLanguage(langCode, context = {}) {
    // Base system messages for different languages
    const systemMessages = {
      'en': `You are a helpful real estate assistant. Provide accurate information about properties, market trends, and buying/selling advice. Be concise and factual.`,
      'hi': `आप एक सहायक रियल एस्टेट सहायक हैं। संपत्तियों, बाजार रुझानों और खरीदने/बेचने की सलाह के बारे में सटीक जानकारी प्रदान करें। संक्षिप्त और तथ्यात्मक रहें।`,
      'mr': `तुम्ही एक मदतगार रिअल इस्टेट सहाय्यक आहात. मालमत्ता, बाजारातील कल आणि खरेदी/विक्री सल्ला याबद्दल अचूक माहिती द्या. संक्षिप्त आणि वस्तुनिष्ठ रहा.`,
      'gu': `તમે એક મદદગાર રીયલ એસ્ટેટ સહાયક છો. પ્રોપર્ટી, માર્કેટ ટ્રેન્ડ્સ અને ખરીદી/વેચાણની સલાહ વિશે સચોટ માહિતી આપો. સંક્ષિપ્ત અને તથ્યાત્મક રહો.`,
      'bn': `আপনি একজন সহায়ক রিয়েল এস্টেট সহকারী। সম্পত্তি, বাজারের প্রবণতা এবং কেনা/বিক্রয় সম্পর্কে সঠিক তথ্য প্রদান করুন। সংক্ষিপ্ত এবং তথ্যপূর্ণ থাকুন।`,
      'ta': `நீங்கள் உதவிகரமான ரியல் எஸ்டேட் உதவியாளர். சொத்துக்கள், சந்தை போக்குகள் மற்றும் வாங்குதல்/விற்பனை ஆலோசனை பற்றிய துல்லியமான தகவல்களை வழங்கவும். சுருக்கமாகவும் உண்மையாகவும் இருங்கள்.`,
      'te': `మీరు సహాయకరమైన రియల్ ఎస్టేట్ సహాయకులు. ఆస్తుల గురించి, మార్కెట్ ధోరణుల గురించి మరియు కొనుగోలు/అమ్మకం సలహాల గురించి ఖచ్చితమైన సమాచారాన్ని అందించండి. సంక్షిప్తంగా మరియు వాస్తవికంగా ఉండండి.`,
      'kn': `ನೀವು ಸಹಾಯಕ ರಿಯಲ್ ಎಸ್ಟೇಟ್ ಸಹಾಯಕರಾಗಿದ್ದೀರಿ. ಆಸ್ತಿಗಳು, ಮಾರುಕಟ್ಟೆ ಪ್ರವೃತ್ತಿಗಳು ಮತ್ತು ಖರೀದಿ/ಮಾರಾಟ ಸಲಹೆಗಳ ಬಗ್ಗೆ ನಿಖರವಾದ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಿ. ಸಂಕ್ಷಿಪ್ತ ಮತ್ತು ವಾಸ್ತವಿಕವಾಗಿರಿ.`,
      'ml': `നിങ്ങൾ ഒരു സഹായകരമായ റിയൽ എസ്റ്റേറ്റ് അസിസ്റ്റന്റാണ്. വസ്തുക്കൾ, വിപണി പ്രവണതകൾ, വാങ്ങൽ/വിൽക്കൽ ഉപദേശം എന്നിവയെക്കുറിച്ച് കൃത്യമായ വിവരങ്ങൾ നൽകുക. ചുരുക്കവും വസ്തുനിഷ്ഠവുമായിരിക്കുക.`,
      'pa': `ਤੁਸੀਂ ਇੱਕ ਮਦਦਗਾਰ ਰੀਅਲ ਅਸਟੇਟ ਸਹਾਇਕ ਹੋ। ਜਾਇਦਾਦਾਂ, ਮਾਰਕੀਟ ਰੁਝਾਨਾਂ, ਅਤੇ ਖਰੀਦਣ/ਵੇਚਣ ਦੀ ਸਲਾਹ ਬਾਰੇ ਸਹੀ ਜਾਣਕਾਰੀ ਪ੍ਰਦਾਨ ਕਰੋ। ਸੰਖੇਪ ਅਤੇ ਤੱਥਾਤਮਕ ਰਹੋ।`,
      'ur': `آپ ایک مددگار ریل اسٹیٹ اسسٹنٹ ہیں۔ پراپرٹیز، مارکیٹ رجحانات، اور خریدنے/بیچنے کے مشورے کے بارے میں درست معلومات فراہم کریں۔ مختصر اور حقیقی رہیں۔`
    };
    
    // Get base message for the language or default to English
    let message = systemMessages[langCode] || systemMessages['en'];
    
    // Add language-specific instructions for responses
    if (langCode !== 'en') {
      const languageName = this.getLanguageName(langCode);
      message += `\n\nIMPORTANT: Always respond in ${languageName} language.`;
    }
    
    return message;
  }

  /**
   * Format search results in the specified language
   * @param {Array} searchResults - The search results
   * @param {string} langCode - The language code
   * @returns {string} - Formatted response with search results in the specified language
   */
  formatSearchResultsInLanguage(searchResults, langCode) {
    if (!searchResults || searchResults.length === 0) {
      const noResultsMessages = {
        'en': "I couldn't find any relevant real estate information for your query.",
        'hi': "मुझे आपके प्रश्न के लिए कोई प्रासंगिक रियल एस्टेट जानकारी नहीं मिली।",
        'mr': "मला तुमच्या प्रश्नासाठी कोणतीही संबंधित रिअल इस्टेट माहिती सापडली नाही.",
        'gu': "મને તમારી ક્વેરી માટે કોઈ સંબંધિત રીયલ એસ્ટેટ માહિતી મળી નથી.",
        'bn': "আমি আপনার প্রশ্নের জন্য কোনও প্রাসঙ্গিক রিয়েল এস্টেট তথ্য খুঁজে পাইনি।",
        'ta': "உங்கள் கேள்விக்கு தொடர்புடைய ரியல் எஸ்டேட் தகவல்களை என்னால் கண்டுபிடிக்க முடியவில்லை.",
        'te': "మీ ప్రశ్నకు సంబంధించిన రియల్ ఎస్టేట్ సమాచారాన్ని నేను కనుగొనలేకపోయాను.",
        'kn': "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಸಂಬಂಧಿಸಿದ ಯಾವುದೇ ರಿಯಲ್ ಎಸ್ಟೇಟ್ ಮಾಹಿತಿಯನ್ನು ನಾನು ಕಂಡುಕೊಳ್ಳಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
        'ml': "നിങ്ങളുടെ ചോദ്യത്തിന് പ്രസക്തമായ റിയൽ എസ്റ്റേറ്റ് വിവരങ്ങളൊന്നും എനിക്ക് കണ്ടെത്താൻ കഴിഞ്ഞില്ല.",
        'pa': "ਮੈਨੂੰ ਤੁਹਾਡੇ ਸਵਾਲ ਲਈ ਕੋਈ ਢੁਕਵੀਂ ਰੀਅਲ ਅਸਟੇਟ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲੀ।",
        'ur': "مجھے آپ کے سوال کے لیے کوئی متعلقہ ریل اسٹیٹ معلومات نہیں مل سکیں۔"
      };
      
      return noResultsMessages[langCode] || noResultsMessages['en'];
    }

    const introMessages = {
      'en': "Here's what I found online about your real estate query:",
      'hi': "आपके रियल एस्टेट प्रश्न के बारे में मुझे ऑनलाइन यह जानकारी मिली:",
      'mr': "तुमच्या रिअल इस्टेट प्रश्नाबद्दल मला ऑनलाईन हे सापडले:",
      'gu': "તમારી રીયલ એસ્ટેટ ક્વેરી વિશે મને ઓનલાઇન આ માહિતી મળી:",
      'bn': "আপনার রিয়েল এস্টেট প্রশ্ন সম্পর্কে আমি অনলাইনে যা খুঁজে পেয়েছি:",
      'ta': "உங்கள் ரியல் எஸ்டேட் கேள்வி பற்றி நான் ஆன்லைனில் கண்டுபிடித்தது இதோ:",
      'te': "మీ రియల్ ఎస్టేట్ ప్రశ్న గురించి నేను ఆన్‌లైన్‌లో కనుగొన్నది ఇదే:",
      'kn': "ನಿಮ್ಮ ರಿಯಲ್ ಎಸ್ಟೇಟ್ ಪ್ರಶ್ನೆಯ ಬಗ್ಗೆ ನಾನು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಕಂಡುಕೊಂಡದ್ದು ಇಲ್ಲಿದೆ:",
      'ml': "നിങ്ങളുടെ റിയൽ എസ്റ്റേറ്റ് ചോദ്യത്തെക്കുറിച്ച് ഞാൻ ഓൺലൈനിൽ കണ്ടെത്തിയത് ഇതാണ്:",
      'pa': "ਤੁਹਾਡੇ ਰੀਅਲ ਅਸਟੇਟ ਸਵਾਲ ਬਾਰੇ ਮੈਨੂੰ ਔਨਲਾਈਨ ਜੋ ਮਿਲਿਆ:",
      'ur': "آپ کے ریل اسٹیٹ سوال کے بارے میں مجھے آن لائن یہ معلومات ملیں:"
    };

    const moreInfoMessages = {
      'en': "\nIs there anything specific from these results you'd like to know more about?",
      'hi': "\nक्या इन परिणामों से आप किसी विशेष जानकारी के बारे में और अधिक जानना चाहते हैं?",
      'mr': "\nया निकालांमधून तुम्हाला काही विशिष्ट माहिती अधिक जाणून घ्यायची आहे का?",
      'gu': "\nશું આ પરિણામોમાંથી કોઈ ચોક્કસ માહિતી વિશે તમે વધુ જાણવા માંગો છો?",
      'bn': "\nএই ফলাফলগুলি থেকে আপনি কি কোনও নির্দিষ্ট বিষয় সম্পর্কে আরও জানতে চান?",
      'ta': "\nஇந்த முடிவுகளிலிருந்து குறிப்பிட்ட ஏதாவது பற்றி மேலும் அறிய விரும்புகிறீர்களா?",
      'te': "\nఈ ఫలితాల నుండి మీరు ఏదైనా నిర్దిష్ట విషయం గురించి మరింత తెలుసుకోవాలనుకుంటున్నారా?",
      'kn': "\nಈ ಫಲಿತಾಂಶಗಳಿಂದ ನೀವು ಯಾವುದಾದರೂ ನಿರ್ದಿಷ್ಟ ವಿಷಯದ ಬಗ್ಗೆ ಹೆಚ್ಚು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?",
      'ml': "\nഈ ഫലങ്ങളിൽ നിന്ന് എന്തെങ്കിലും പ്രത്യേകമായി കൂടുതൽ അറിയാൻ നിങ്ങൾ ആഗ്രഹിക്കുന്നുണ്ടോ?",
      'pa': "\nਕੀ ਇਹਨਾਂ ਨਤੀਜਿਆਂ ਵਿੱਚੋਂ ਕੋਈ ਖਾਸ ਜਾਣਕਾਰੀ ਹੈ ਜਿਸ ਬਾਰੇ ਤੁਸੀਂ ਹੋਰ ਜਾਣਨਾ ਚਾਹੋਗੇ?",
      'ur': "\nکیا ان نتائج میں سے کوئی خاص چیز ہے جس کے بارے میں آپ مزید جاننا چاہیں گے؟"
    };
    
    let formattedResponse = introMessages[langCode] || introMessages['en'];
    formattedResponse += "\n\n";

    searchResults.forEach((result, index) => {
      formattedResponse += `${index + 1}. **${result.title}**\n`;
      formattedResponse += `${result.snippet}\n`;
      formattedResponse += `[Learn more](${result.link})\n\n`;
    });

    formattedResponse += moreInfoMessages[langCode] || moreInfoMessages['en'];

    return formattedResponse;
  }
}

module.exports = new LanguageService();
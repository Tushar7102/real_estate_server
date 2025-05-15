const axios = require('axios');
const webSearchService = require('./webSearchService');
const languageService = require('./languageService');

/**
 * Mistral AI Service with multilingual support
 */
class MistralService {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.baseURL = 'https://api.mistral.ai/v1/chat/completions';
  }

  async generateResponse(userMessage, leadInfo = {}, messageHistory = []) {
    // Detect language of the user message
    const detectedLangCode = languageService.detectLanguage(userMessage);
    console.log(`User message language detected: ${languageService.getLanguageName(detectedLangCode)}`);
    
    if (!this.apiKey) throw new Error('Mistral API key not set');

    try {
      // Validate and clean user message
      if (!userMessage || typeof userMessage !== 'string') {
        console.error('Invalid user message:', userMessage);
        return 'Please ask a valid question.';
      }

      // Trim and normalize user message
      const cleanedUserMessage = userMessage.trim();
      if (cleanedUserMessage.length === 0) {
        return 'Please provide your question in detail so I can assist you better.';
      }

      // Search real estate info to enrich context
      console.log('Searching for real estate information related to:', cleanedUserMessage);
      let searchResults = [];
      try {
        searchResults = await webSearchService.searchRealEstateInfo(cleanedUserMessage);
        console.log(`Found ${searchResults.length} search results`);
        
        // Verify search results structure
        if (searchResults && Array.isArray(searchResults)) {
          console.log('Search results structure is valid');
          // Log first result for debugging if available
          if (searchResults.length > 0) {
            console.log('First search result:', JSON.stringify(searchResults[0], null, 2));
          }
        } else {
          console.error('Invalid search results structure:', searchResults);
          searchResults = [];
        }
      } catch (searchError) {
        console.error('Error during web search in mistralService:', searchError.message);
        searchResults = [];
      }
      
      // Ensure we're working with a copy of leadInfo to avoid modifying the original
      const enhancedLeadInfo = { ...leadInfo };
      enhancedLeadInfo.searchResults = searchResults;
      
      // Add current message to leadInfo for conversation ending detection
      enhancedLeadInfo.currentMessage = cleanedUserMessage;
      
      // Log the lead information to ensure we're using the database data
      console.log('Using lead information from database:', JSON.stringify(enhancedLeadInfo, null, 2));
      
      // Ensure oneQuestionAtATime flag is set if present in context
      if (enhancedLeadInfo.oneQuestionAtATime === undefined) {
        enhancedLeadInfo.oneQuestionAtATime = true; // Default to true for better user experience
      }

      // Check if this is a conversation ending message
      const isEndingConversation = this.isConversationEnding(cleanedUserMessage);
      if (isEndingConversation) {
        console.log('Detected conversation ending message:', cleanedUserMessage);
        // Set a flag to ensure no questions are asked in the response
        enhancedLeadInfo.isEndingConversation = true;
      }

      // Format message history for context and extract information
      const formattedHistory = this.formatMessageHistory(messageHistory);
      
      // Extract conversation history information to prevent repeated questions
      const historyInfo = this.extractInfoFromHistory(formattedHistory);
      enhancedLeadInfo.conversationHistory = historyInfo;
      
      // Merge any information from conversation history into leadInfo if not already present
      if (historyInfo.providedInfo.name && !enhancedLeadInfo.name) {
        enhancedLeadInfo.name = historyInfo.providedInfo.name;
        console.log('Using name from conversation history:', enhancedLeadInfo.name);
      }
      
      if (historyInfo.providedInfo.budget && !enhancedLeadInfo.budget) {
        enhancedLeadInfo.budget = historyInfo.providedInfo.budget;
        console.log('Using budget from conversation history:', enhancedLeadInfo.budget);
      }
      
      if (historyInfo.providedInfo.preferredLocation && !enhancedLeadInfo.preferredLocation) {
        enhancedLeadInfo.preferredLocation = historyInfo.providedInfo.preferredLocation;
        console.log('Using location from conversation history:', enhancedLeadInfo.preferredLocation);
      }
      
      if (historyInfo.providedInfo.propertyType && !enhancedLeadInfo.propertyType) {
        enhancedLeadInfo.propertyType = historyInfo.providedInfo.propertyType;
        console.log('Using property type from conversation history:', enhancedLeadInfo.propertyType);
      }
      
      // Create system message with enhanced context and conversation history
      const systemMessage = this.createSystemMessage(enhancedLeadInfo);
      
      // Enhance user message with additional context and instructions
      const enhancedUserMessage = this.enhanceUserMessage(cleanedUserMessage, enhancedLeadInfo);

      // Add the enhanced user message to the conversation history
      formattedHistory.push({ role: 'user', content: enhancedUserMessage });

      // Log the complete prompt being sent to Mistral
      console.log('Sending prompt to Mistral with system message and', formattedHistory.length, 'messages');

      // Make API request to Mistral with optimized parameters
      const response = await axios.post(
        this.baseURL,
        {
          model: 'mistral-medium',
          messages: [systemMessage, ...formattedHistory],
          temperature: 0.3, // Further lowered temperature for more factual responses
          max_tokens: 1200, // Increased token limit for more comprehensive responses
          top_p: 0.92, // Adjusted top_p for better quality responses
          presence_penalty: 0.1, // Added presence penalty to avoid repetition
          frequency_penalty: 0.2 // Added frequency penalty to encourage diversity
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000 // Increased timeout for more reliable responses
        }
      );

      // Extract and validate AI response
      const aiContent = response?.data?.choices?.[0]?.message?.content || 'AI response unavailable.';
      console.log('Received response from Mistral, length:', aiContent.length);
      
      // Process and clean the response
      const finalResponse = this.appendSearchResults(aiContent, searchResults, cleanedUserMessage);
      return finalResponse;
    } catch (err) {
      console.error('MistralService Error:', err.message);
      if (err.response) {
        console.error('API Error Details:', err.response.data);
      }
      return 'AI response is temporarily unavailable. Please try again later.';
    }
  }

  formatMessageHistory(messageHistory) {
    // Log the message history to ensure we're using it correctly
    console.log(`Processing ${messageHistory?.length || 0} previous messages from history`);
    
    // Extract more context from message history
    const formattedHistory = (messageHistory || []).slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message
    }));
    
    // Analyze message history to avoid duplicate questions
    if (formattedHistory.length > 0) {
      console.log('Using conversation history to avoid duplicate questions');
      
      // Extract key information from history to prevent repeated questions
      const extractedInfo = this.extractInfoFromHistory(formattedHistory);
      console.log('Extracted information from history:', JSON.stringify(extractedInfo, null, 2));
    }
    
    return formattedHistory;
  }
  
  // Extract key information from conversation history to prevent repeated questions
  extractInfoFromHistory(formattedHistory) {
    const extractedInfo = {
      askedAboutName: false,
      askedAboutBudget: false,
      askedAboutLocation: false,
      askedAboutPropertyType: false,
      providedInfo: {}
    };
    
    // Patterns to detect if certain questions were already asked
    const nameQuestionPatterns = [
      /what(?:'s| is) your name/i,
      /may I know your name/i,
      /could you tell me your name/i,
      /who am I speaking with/i,
      /आपका नाम क्या है/i,
      /आपका नाम बताएं/i,
      /तुमचे नाव काय आहे/i,
      /તમારું નામ શું છે/i
    ];
    
    const budgetQuestionPatterns = [
      /what(?:'s| is) your budget/i,
      /budget.*range/i,
      /how much.*spend/i,
      /price range/i,
      /आपका बजट क्या है/i,
      /कितना खर्च कर सकते हैं/i,
      /तुमचे बजेट किती आहे/i,
      /તમારું બજેટ શું છે/i
    ];
    
    const locationQuestionPatterns = [
      /preferred location/i,
      /which area/i,
      /where.*looking/i,
      /location preference/i,
      /कौन सा इलाका/i,
      /कहां पर चाहते हैं/i,
      /कोणत्या भागात/i,
      /ક્યાં શોધી રહ્યા છો/i
    ];
    
    const propertyTypeQuestionPatterns = [
      /what type of property/i,
      /looking for a (house|apartment|flat|condo)/i,
      /property type/i,
      /किस प्रकार की संपत्ति/i,
      /कौन सा प्रॉपर्टी टाइप/i,
      /कोणत्या प्रकारची मालमत्ता/i,
      /કયા પ્રકારની સંપત્તિ/i
    ];
    
    // Patterns to extract provided information
    const nameResponsePatterns = [
      /my name is ([\w\s]+)/i,
      /I am ([\w\s]+)/i,
      /I'm ([\w\s]+)/i,
      /मेरा नाम ([\w\s]+) है/i,
      /माझे नाव ([\w\s]+) आहे/i,
      /મારું નામ ([\w\s]+) છે/i
    ];
    
    const budgetResponsePatterns = [
      /budget is ([\d,]+)/i,
      /looking.*around ([\d,]+)/i,
      /([\d,]+).*budget/i,
      /मेरा बजट ([\d,]+)/i,
      /माझे बजेट ([\d,]+)/i,
      /મારું બજેટ ([\d,]+)/i
    ];
    
    // Check each message in the history
    formattedHistory.forEach(msg => {
      // Check if assistant asked about these topics
      if (msg.role === 'assistant') {
        nameQuestionPatterns.forEach(pattern => {
          if (pattern.test(msg.content)) extractedInfo.askedAboutName = true;
        });
        
        budgetQuestionPatterns.forEach(pattern => {
          if (pattern.test(msg.content)) extractedInfo.askedAboutBudget = true;
        });
        
        locationQuestionPatterns.forEach(pattern => {
          if (pattern.test(msg.content)) extractedInfo.askedAboutLocation = true;
        });
        
        propertyTypeQuestionPatterns.forEach(pattern => {
          if (pattern.test(msg.content)) extractedInfo.askedAboutPropertyType = true;
        });
      }
      
      // Check if user provided information
      if (msg.role === 'user') {
        // Extract name if provided
        nameResponsePatterns.forEach(pattern => {
          const match = msg.content.match(pattern);
          if (match && match[1]) extractedInfo.providedInfo.name = match[1].trim();
        });
        
        // Extract budget if provided
        budgetResponsePatterns.forEach(pattern => {
          const match = msg.content.match(pattern);
          if (match && match[1]) extractedInfo.providedInfo.budget = match[1].trim();
        });
        
        // Check for property types mentioned
        const propertyTypes = ['apartment', 'house', 'condo', 'villa', 'flat', 'studio', 'penthouse', 'duplex'];
        propertyTypes.forEach(type => {
          if (msg.content.toLowerCase().includes(type)) {
            extractedInfo.providedInfo.propertyType = type;
          }
        });
        
        // Check for locations (simplified approach)
        const locationMatch = msg.content.match(/(?:location|area|place|interested in) ([a-z\s,]+)/i);
        if (locationMatch && locationMatch[1]) {
          extractedInfo.providedInfo.preferredLocation = locationMatch[1].trim();
        }
      }
    });
    
    return extractedInfo;
  }

  // Check if the message indicates conversation ending (like thank you) in multiple languages
  isConversationEnding(message) {
    // If message is empty or not a string, it's not an ending
    if (!message || typeof message !== 'string') return false;
    
    // Normalize message for better matching
    const normalizedMessage = message.trim().toLowerCase();
    
    // If message is very short (1-2 words), check if it's a common ending phrase
    if (normalizedMessage.split(/\s+/).length <= 2) {
      const shortEndingPhrases = [
        'thanks', 'thank you', 'ok', 'okay', 'bye', 'goodbye', 'got it',
        'धन्यवाद', 'शुक्रिया', 'ठीक है', 'अच्छा', 'बाय',
        'धन्यवाद', 'आभार', 'ठीक आहे', 'बरं',
        'આભાર', 'ધન્યવાદ', 'ઠીક છે', 'સારું'
      ];
      
      for (const phrase of shortEndingPhrases) {
        if (normalizedMessage === phrase || normalizedMessage.includes(phrase)) {
          console.log(`Detected short ending phrase: "${phrase}" in message: "${normalizedMessage}"`);
          return true;
        }
      }
    }
    
    // More comprehensive patterns for longer messages
    const endingPhrases = [
      // English phrases
      /thank you|thanks|thank u/i,
      /goodbye|bye|see you|farewell/i,
      /that's all|that is all|no more|finished/i,
      /no more questions/i,
      /got it|understood|i understand/i,
      /ok|okay|fine|great/i,
      /that's helpful|that helps|clear now/i,
      /appreciate|appreciate it|appreciate your/i,
      
      // Hindi phrases
      /धन्यवाद|शुक्रिया|थैंक्स|आभार/i,
      /अलविदा|बाय|गुड बाय|फिर मिलेंगे/i,
      /बस इतना ही|यही सब है|हो गया/i,
      /कोई और सवाल नहीं|और कुछ नहीं/i,
      /समझ गया|ठीक है|समझ में आया/i,
      /ओके|अच्छा|ठीक|बहुत अच्छा/i,
      /मदद मिली|स्पष्ट है|समझ में आ गया/i,
      
      // Marathi phrases
      /धन्यवाद|आभार|थँक्यू/i,
      /निरोप|बाय|पुन्हा भेटू/i,
      /बस एवढेच|इतकेच|झाले/i,
      /आणखी प्रश्न नाहीत/i,
      /समजले|बरोबर|ठीक आहे/i,
      /ओके|छान|बरं/i,
      /मदत झाली|स्पष्ट आहे/i,
      
      // Gujarati phrases
      /આભાર|ધન્યવાદ|થેંક્યુ/i,
      /આવજો|બાય|ફરી મળીશું/i,
      /બસ આટલું જ|પૂરું થયું/i,
      /વધુ પ્રશ્નો નથી/i,
      /સમજાયું|બરાબર|ઠીક છે/i,
      /ઓકે|સારું|ઠીક/i,
      /મદદ મળી|સ્પષ્ટ છે/i,
      
      // Bengali phrases
      /ধন্যবাদ|আপনাকে ধন্যবাদ/i,
      /বিদায়|ফিরে দেখা হবে/i,
      /এটাই সব|শেষ/i,
      /আর কোন প্রশ্ন নেই/i,
      /বুঝেছি|ঠিক আছে/i,
      /ওকে|ভালো/i,
      /সাহায্য পেয়েছি|পরিষ্কার/i
    ];
    
    // Check if message matches any ending phrase pattern
    const isEnding = endingPhrases.some(phrase => normalizedMessage.match(phrase));
    
    // Also check if message is very short and doesn't contain a question
    const isShortNonQuestion = normalizedMessage.length < 15 && !normalizedMessage.includes('?');
    
    // Log the detection result
    if (isEnding || isShortNonQuestion) {
      console.log(`Detected conversation ending in message: "${normalizedMessage}"`);
      console.log(`Detection method: ${isEnding ? 'phrase pattern' : 'short non-question'}`);
    }
    
    return isEnding || isShortNonQuestion;
  }

  enhanceUserMessage(userMessage, leadInfo) {
    // Log the user message and lead info to ensure we're using the correct data
    console.log('Enhancing user message with lead info:', {
      messageLength: userMessage.length,
      hasName: !!leadInfo.name,
      hasBudget: !!leadInfo.budget,
      hasLocation: !!leadInfo.preferredLocation,
      hasPropertyType: !!leadInfo.propertyType,
      searchResultsCount: leadInfo.searchResults?.length || 0,
      hasConversationHistory: !!leadInfo.conversationHistory
    });
    
    // Start with a clear instruction for the AI with professional real estate agent persona
    let message = `${userMessage}\n\n### Response Instructions ###\nRespond as a professional real estate agent with expertise in the property market. Provide accurate, factual, and clear answers based on the search results and your knowledge. Maintain a consultative, helpful tone throughout.`;

    // Add instruction for one question at a time approach if enabled
    if (leadInfo.oneQuestionAtATime) {
      message += '\n\n### Conversation Instructions ###';
      message += '\n1. Ask only one question at a time to maintain a natural conversation flow.';
      message += '\n2. Do not provide a list of multiple questions at once.';
      message += '\n3. Do not ask again about information that already exists in the conversation history.';
      message += '\n4. Adapt your language to match the user\'s preferred language (Hindi, English, Gujarati, Marathi, or Hinglish).';
      
      // Add conversation history information to prevent repeated questions
      if (leadInfo.conversationHistory) {
        message += '\n\n### Conversation History Information ###';
        
        // Add information about questions already asked
        if (leadInfo.conversationHistory.askedAboutName) {
          message += '\n• You have already asked for the user\'s name. Do not ask for it again.';
        }
        
        if (leadInfo.conversationHistory.askedAboutBudget) {
          message += '\n• You have already asked about the user\'s budget. Do not ask about it again.';
        }
        
        if (leadInfo.conversationHistory.askedAboutLocation) {
          message += '\n• You have already asked about the user\'s preferred location. Do not ask about it again.';
        }
        
        if (leadInfo.conversationHistory.askedAboutPropertyType) {
          message += '\n• You have already asked about the property type. Do not ask about it again.';
        }
        
        // Add information that user has already provided
        if (Object.keys(leadInfo.conversationHistory.providedInfo).length > 0) {
          message += '\n\n### User-Provided Information ###';
          
          if (leadInfo.conversationHistory.providedInfo.name) {
            message += `\n• User has provided their name: ${leadInfo.conversationHistory.providedInfo.name}`;
          }
          
          if (leadInfo.conversationHistory.providedInfo.budget) {
            message += `\n• User has provided their budget: ₹${leadInfo.conversationHistory.providedInfo.budget}`;
          }
          
          if (leadInfo.conversationHistory.providedInfo.preferredLocation) {
            message += `\n• User has provided their preferred location: ${leadInfo.conversationHistory.providedInfo.preferredLocation}`;
          }
          
          if (leadInfo.conversationHistory.providedInfo.propertyType) {
            message += `\n• User has provided their preferred property type: ${leadInfo.conversationHistory.providedInfo.propertyType}`;
          }
        }
      }
      
      // Add explicit instruction to never repeat questions
      message += '\n\n### IMPORTANT: Question Control ###';
      message += '\n• NEVER ask the same question twice in a conversation.';
      message += '\n• NEVER ask multiple questions at once.';
      message += '\n• NEVER ask for information that the user has already provided.';
      message += '\n• If you\'re unsure whether to ask a question, DO NOT ask it.';
    }

    // Create more specific topic-based instructions with enhanced real estate expertise
    const enhancements = [
      { match: /price|budget|कीमत|मूल्य|cost|rate|रेट/i, note: '### Price Related Instructions ###\nProvide accurate information based on real property valuation, budget analysis, current market trends, and price per square foot comparisons. Explain how location, amenities, and property age affect pricing.' },
      { match: /location|स्थान|area|neighborhood|इलाका|क्षेत्र/i, note: '### Location Related Instructions ###\nProvide detailed information about location amenities, connectivity, surrounding development, quality of living, proximity to schools/hospitals/markets, future development plans, and property appreciation potential.' },
      { match: /invest|निवेश|roi|return|profit|लाभ/i, note: '### Investment Related Instructions ###\nProvide comprehensive information about investment returns, risk analysis, future appreciation prospects, rental yield potential, tax benefits, and comparison with other investment options.' },
      { match: /loan|finance|ऋण|EMI|mortgage|बंधक/i, note: '### Finance Related Instructions ###\nProvide accurate information about current home loan options, interest rates, EMI calculations, down payment requirements, processing fees, pre-payment options, and tax benefits on home loans.' },
      { match: /feature|amenity|सुविधा|facility|फैसिलिटी/i, note: '### Amenity Related Instructions ###\nProvide detailed information about property features, amenities, construction quality, specifications, smart home features, security systems, and their impact on lifestyle and property value.' },
      { match: /legal|document|कानूनी|दस्तावेज़/i, note: '### Legal Documentation Instructions ###\nProvide accurate information about required legal documents, verification processes, registration procedures, stamp duty, and other legal aspects of property transactions.' },
      { match: /rent|किराया|lease|पट्टा/i, note: '### Rental Property Instructions ###\nProvide detailed information about rental yields, tenant profiles, lease terms, maintenance responsibilities, and rental market trends in the specified location.' }
    ];

    // Add relevant topic-based instructions with enhanced expertise
    enhancements.forEach(e => {
      if (userMessage.match(e.match)) message += `\n\n${e.note}`;
    });

    // Add user context information in a structured format
    message += '\n\n### User Information ###';
    if (leadInfo.name) message += `\n• Name: ${leadInfo.name}`;
    if (leadInfo.budget) message += `\n• Budget: ₹${leadInfo.budget}`;
    if (leadInfo.preferredLocation) message += `\n• Preferred Location: ${leadInfo.preferredLocation}`;
    if (leadInfo.propertyType) message += `\n• Property Type: ${leadInfo.propertyType}`;

    // Add search results if available with better formatting and stronger emphasis
    if (leadInfo.searchResults?.length) {
      message += '\n\n### Latest Real Estate Information ###';
      message += '\nAnswer using the following information. This information is factual and up-to-date:';
      
      leadInfo.searchResults.slice(0, 5).forEach((res, i) => {
        // Clean and format the title and snippet
        const cleanTitle = res.title.replace(/\s+/g, ' ').trim();
        const cleanSnippet = res.snippet.replace(/\s+/g, ' ').trim();
        
        message += `\n${i + 1}. ${cleanTitle}`;
        message += `\n   ${cleanSnippet}`;
        message += `\n   Source: ${res.link}`;
      });
      
      // Add explicit instruction to use this information
      message += '\n\nAnswer using the above information. If the information is insufficient, clearly state that you do not have complete information.';
    }

    // Add final reminder for quality response
    message += '\n\n### Final Instructions ###\nProvide a direct and clear answer to the user\'s question. Avoid unnecessary information.';

    return message;
  }

  appendSearchResults(aiResponse, searchResults = [], userMessage = '') {
    // Check if search results exist and are in correct format
    if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
      console.log('No search results to append, returning original AI response');
      return aiResponse;
    }

    // Detect language of the user message
    const detectedLangCode = languageService.detectLanguage(userMessage);
    
    // Create a well-formatted search results section with better formatting in the detected language
    let summary;
    
    // Always use English for consistency
    summary = '\n\n### 📊 Latest Real Estate Information ###\n';
    
    // Check if we have enough search results
    if (searchResults.length >= 3) {
      // Use top 3 results with better formatting
      searchResults.slice(0, 3).forEach((r, i) => {
        // Clean and format the title and snippet
        const cleanTitle = r.title.replace(/\s+/g, ' ').trim();
        const cleanSnippet = r.snippet.replace(/\s+/g, ' ').trim();
        
        summary += `\n**${i + 1}. ${cleanTitle}**\n${cleanSnippet}\n`;
        // Add source link for verification
        summary += `[View Source](${r.link})\n`;
      });
    } else {
      // If we have fewer results, use what we have
      searchResults.forEach((r, i) => {
        const cleanTitle = r.title.replace(/\s+/g, ' ').trim();
        const cleanSnippet = r.snippet.replace(/\s+/g, ' ').trim();
        
        summary += `\n**${i + 1}. ${cleanTitle}**\n${cleanSnippet}\n`;
        summary += `[स्रोत देखें](${r.link})\n`;
      });
    }

    // Check if this is a conversation ending message
    const isEndingConversation = this.isConversationEnding(userMessage);

    // Clean the AI response to ensure quality
    let cleanedResponse = aiResponse;
    
    // Enhanced question removal - more aggressive pattern matching
    // First, remove any questions at the end of the response
    cleanedResponse = cleanedResponse.replace(/\s*([^.!?]\s*\?\s*)+$/, '.');
    
    // Remove lists of questions that might be present in the response (numbered, bulleted, etc.)
    cleanedResponse = cleanedResponse.replace(/([0-9]\.|•|\*|-)\s*([^\n.]+\?)\s*/g, '');
    
    // Remove any standalone questions in the middle of the text
    cleanedResponse = cleanedResponse.replace(/\s+([A-Z][^.!?]+\?)\s+/g, '. ');
    
    // Enhanced pattern to remove "Would you like to..." type questions in multiple languages
    const questionPatterns = [
      // English patterns
      /would you like (to|me to) [^.?!]+\??/gi,
      /do you want (to|me to) [^.?!]+\??/gi,
      /can I help you [^.?!]+\??/gi,
      /are you interested in [^.?!]+\??/gi,
      /shall we [^.?!]+\??/gi,
      /how about [^.?!]+\??/gi,
      /what (else|other|more) [^.?!]+\??/gi,
      /is there anything else [^.?!]+\??/gi,
      
      // Hindi patterns
      /क्या आप .+ बताना चाहेंगे\??/g,
      /आप .+ के बारे में क्या सोचते हैं\??/g,
      /क्या आपको .+ चाहिए\??/g,
      /क्या मैं आपकी और सहायता कर सकता हूँ\??/g,
      /क्या आप .+ जानना चाहते हैं\??/g,
      /क्या आपके पास .+ है\??/g,
      /मैं आपकी कैसे सहायता कर सकता हूँ\??/g,
      /आपको और क्या जानकारी चाहिए\??/g,
      /क्या आप .+ खोज रहे हैं\??/g,
      /क्या आप .+ पसंद करेंगे\??/g,
      
      // Marathi patterns
      /तुम्हाला .+ आवडेल का\??/g,
      /मी तुम्हाला .+ मदत करू शकतो का\??/g,
      /तुम्हाला .+ हवे आहे का\??/g,
      
      // Gujarati patterns
      /શું તમે .+ કરવા માંગો છો\??/g,
      /હું તમને .+ મદદ કરી શકું\??/g,
      /તમને .+ જોઈએ છે\??/g
    ];
    
    // Apply all question pattern removals - convert to statements or remove entirely
    questionPatterns.forEach(pattern => {
      // Replace with empty string to completely remove these patterns
      cleanedResponse = cleanedResponse.replace(pattern, '');
    });
    
    // Convert any remaining questions to statements by replacing ? with .
    cleanedResponse = cleanedResponse.replace(/\?/g, '.');
    
    // For conversation ending messages, add a polite closing
    if (isEndingConversation) {
      // Remove any follow-up questions or prompts that might have been converted to statements
      questionPatterns.forEach(pattern => {
        cleanedResponse = cleanedResponse.replace(pattern, '');
      });
      
      // Add a polite closing if not already present
      if (!cleanedResponse.match(/thank you|thanks|pleasure|happy to help|see you/i)) {
        cleanedResponse += '\n\nI am pleased to assist you. If you have any other questions in the future, please feel free to ask.';
      }
    }
    
    // Remove any empty lines or redundant spaces
    cleanedResponse = cleanedResponse.replace(/\n{3,}/g, '\n\n');
    cleanedResponse = cleanedResponse.replace(/\s{2,}/g, ' ');
    cleanedResponse = cleanedResponse.trim();
    
    // Remove any sentences that are too short (likely fragments from removed questions)
    cleanedResponse = cleanedResponse.replace(/\s*\.[^.]{1,20}\./g, '.');
    
    // Log the final response to verify no duplicate questions
    console.log('Final response prepared with search results and no duplicate questions');
    console.log('Is conversation ending:', isEndingConversation);
    
    return cleanedResponse + summary;
  }

  createSystemMessage(leadInfo) {
    // Detect language from the current message if available
    let detectedLangCode = 'en'; // Default to English
    if (leadInfo && leadInfo.currentMessage) {
      detectedLangCode = languageService.detectLanguage(leadInfo.currentMessage);
      console.log(`Creating system message in detected language: ${languageService.getLanguageName(detectedLangCode)}`);
    }
    
    // Get base context based on detected language
    let context = languageService.createSystemMessageForLanguage(detectedLangCode);
    
    // Log the lead information being used to create the system message
    console.log('Creating system message with lead info:', JSON.stringify(leadInfo, null, 2));

    // Define the professional real estate agent persona based on PRD
    context += '\n\n### Professional Real Estate Agent Persona ###';
    context += '\nYou are an experienced, professional real estate agent with deep knowledge of the property market. You simulate a real agent with:';
    context += '\n- Extensive expertise in buying, selling, and renting properties across diverse markets';
    context += '\n- Deep understanding of property valuation, market trends, and investment opportunities';
    context += '\n- Ability to handle multi-intent conversations and adapt to changing client needs';
    context += '\n- Strong consultative approach that prioritizes understanding client requirements';
    context += '\n- Expertise in property financing, legal processes, and documentation requirements';
    context += '\n- Skill in providing personalized recommendations based on client preferences';
    context += '\n- Professional yet warm communication style that builds trust and rapport';
    
    // Add multilingual capabilities based on PRD
    context += '\n\n### Multilingual Capabilities ###';
    context += '\nYou can communicate fluently in multiple languages including:';
    context += '\n- Hindi';
    context += '\n- English';
    context += '\n- Gujarati';
    context += '\n- Marathi';
    context += '\n- Hinglish (Hindi-English mixed)';
    context += '\nYou can detect the user\'s preferred language and respond accordingly with real-time language switching.';

    // Add conversation flow instructions based on PRD
    context += '\n\n### Conversational Flow Instructions ###';
    context += '\n1. Follow a structured approach to gather user information:';
    context += '\n   - Name';
    context += '\n   - Location preferences';
    context += '\n   - Budget constraints';
    context += '\n   - Buy/Rent preference';
    context += '\n   - Property type requirements';
    context += '\n   - Number of bedrooms needed';
    context += '\n2. Maintain a step-by-step flow with memory of user responses to avoid repetitive questions.';
    context += '\n3. Apply intelligent branching based on user answers:';
    context += '\n   - If budget is too low for desired location, explain options and suggest alternatives';
    context += '\n   - If property type is unavailable in preferred location, suggest similar areas';
    context += '\n   - If user requirements are unclear, ask clarifying questions before proceeding';
    context += '\n4. Maintain a human-like, conversational tone that simulates a real estate agent.';
    context += '\n5. Ask only one question at a time to keep the conversation focused and natural.';
    context += '\n6. Adapt your language context based on user responses and detected language.';

    // Add property recommendation instructions based on PRD
    context += '\n\n### Property Recommendation Instructions ###';
    context += '\n1. Query user filters (location, price, type, etc.) to provide relevant property recommendations.';
    context += '\n2. Use the provided search results from MongoDB or Google Custom Search API to recommend properties.';
    context += '\n3. Present property listings with complete details including:';
    context += '\n   - Property title and description';
    context += '\n   - Location details and neighborhood information';
    context += '\n   - Price and payment options';
    context += '\n   - Property features and amenities';
    context += '\n   - Available images (reference links when available)';
    context += '\n4. Offer persuasive upsell suggestions when appropriate (e.g., slightly higher budget for better options).';
    context += '\n5. Provide alternative suggestions when exact matches arent available.';
    context += '\n6. Format information in a clear, structured way that highlights property benefits.';

    // Add lead capture instructions based on PRD
    context += '\n\n### Lead Capture Instructions ###';
    context += '\n1. Collect and store user information including:';
    context += '\n   - Name (required)';
    context += '\n   - Phone number (important for follow-up)';
    context += '\n   - Email address (alternative contact method)';
    context += '\n   - Property preferences (location, type, budget, etc.)';
    context += '\n2. Ask for explicit permission to follow up with additional property options.';
    context += '\n3. Ensure all interactions comply with data protection regulations (GDPR-compliant).';
    context += '\n4. Act as a lead generation and qualification assistant to help convert inquiries.';

    // Add user context information in the detected language
    if (detectedLangCode === 'hi' || detectedLangCode === 'mr' || detectedLangCode === 'gu') {
      context += '\n\n### उपयोगकर्ता की जानकारी ###';
      if (leadInfo.name) context += `\nग्राहक का नाम: ${leadInfo.name}`;
      if (leadInfo.budget) context += `\nबजट: ₹${leadInfo.budget}`;
      if (leadInfo.preferredLocation) context += `\nपसंदीदा स्थान: ${leadInfo.preferredLocation}`;
      if (leadInfo.propertyType) context += `\nसंपत्ति प्रकार: ${leadInfo.propertyType}`;
    } else {
      context += '\n\n### User Information ###';
      if (leadInfo.name) context += `\nClient Name: ${leadInfo.name}`;
      if (leadInfo.budget) context += `\nBudget: ₹${leadInfo.budget}`;
      if (leadInfo.preferredLocation) context += `\nPreferred Location: ${leadInfo.preferredLocation}`;
      if (leadInfo.propertyType) context += `\nProperty Type: ${leadInfo.propertyType}`;
    }

    // Add search results with better formatting and emphasis on factual information
    if (leadInfo.searchResults?.length) {
      if (detectedLangCode === 'hi' || detectedLangCode === 'mr' || detectedLangCode === 'gu') {
        context += '\n\n### ताज़ा रियल एस्टेट जानकारी ###';
      } else {
        context += '\n\n### Latest Real Estate Information ###';
      }
      
      leadInfo.searchResults.slice(0, 5).forEach((r, i) => {
        // Clean and format the title and snippet
        const cleanTitle = r.title.replace(/\s+/g, ' ').trim();
        const cleanSnippet = r.snippet.replace(/\s+/g, ' ').trim();
        
        context += `\n${i + 1}. ${cleanTitle}`;
        context += `\n   ${cleanSnippet.slice(0, 200)}...`;
        context += `\n   Source: ${r.link}`;
      });
      
      // Add explicit instruction to use this information
      context += '\n\nUse the above information to provide accurate and relevant property recommendations.';
    }

    // Determine which question to ask based on missing information
    if (leadInfo.oneQuestionAtATime) {
      // Check if we already have all the information
      const hasAllBasicInfo = leadInfo.name && leadInfo.propertyType && leadInfo.budget && leadInfo.preferredLocation;
      
      // Check if the current message indicates conversation ending
      const isEnding = leadInfo.isEndingConversation || (leadInfo.currentMessage && this.isConversationEnding(leadInfo.currentMessage));
      
      // Check conversation history to avoid asking questions that were already asked
      const historyInfo = leadInfo.conversationHistory || { askedAboutName: false, askedAboutBudget: false, askedAboutLocation: false, askedAboutPropertyType: false };
      
      if (detectedLangCode === 'hi' || detectedLangCode === 'mr' || detectedLangCode === 'gu') {
        context += '\n\n### वर्तमान संवाद निर्देश ###';
        if (isEnding) {
          // If user is ending the conversation, don't ask any more questions
          context += '\nउपयोगकर्ता संवाद समाप्त करना चाहता है। केवल उनके संदेश का उत्तर दें और कोई अतिरिक्त प्रश्न न पूछें।';
        } else if (hasAllBasicInfo) {
          // If we have all basic information, focus on property details or preferences
          context += '\nउपयोगकर्ता के सभी बुनियादी विवरण पहले से ही एकत्र किए गए हैं। अब उनकी वर्तमान प्रश्न का सटीक उत्तर दें।';
          context += '\nकोई अतिरिक्त प्रश्न न पूछें जो पहले पूछे जा चुके हैं। केवल उनके वर्तमान प्रश्न का उत्तर दें।';
        } else if (!leadInfo.name && !historyInfo.askedAboutName) {
          context += '\nसबसे पहले, उपयोगकर्ता का नाम पूछें। अन्य विवरण अभी न पूछें।';
        } else if (!leadInfo.propertyType && !historyInfo.askedAboutPropertyType && (leadInfo.name || historyInfo.askedAboutName)) {
          context += '\nअब केवल संपत्ति के प्रकार के बारे में पूछें (जैसे अपार्टमेंट, मकान, विला, आदि)। अन्य विवरण अभी न पूछें।';
        } else if (!leadInfo.budget && !historyInfo.askedAboutBudget && (leadInfo.propertyType || historyInfo.askedAboutPropertyType)) {
          context += '\nअब केवल उनके बजट के बारे में पूछें। अन्य विवरण अभी न पूछें।';
        } else if (!leadInfo.preferredLocation && !historyInfo.askedAboutLocation && (leadInfo.budget || historyInfo.askedAboutBudget)) {
          context += '\nअब केवल उनके पसंदीदा स्थान के बारे में पूछें। अन्य विवरण अभी न पूछें।';
        } else {
          // If we've already asked about all basic info but don't have answers yet, just respond to their current question
          context += '\nउपयोगकर्ता के वर्तमान प्रश्न का उत्तर दें। पहले पूछे गए प्रश्नों को दोहराएं नहीं।';
        }
      } else {
        context += '\n\n### Current Conversation Instructions ###';
        if (isEnding) {
          // If user is ending the conversation, don't ask any more questions
          context += '\nThe user is ending the conversation. Only respond to their message and do not ask additional questions.';
        } else if (hasAllBasicInfo) {
          // If we have all basic information, focus on property details or preferences
          context += '\nAll basic user details have already been collected. Now provide an accurate answer to their current question.';
          context += '\nDo not ask any additional questions that have already been asked. Only respond to their current query.';
        } else if (!leadInfo.name && !historyInfo.askedAboutName) {
          context += '\nFirst, ask for the user\'s name. Do not ask for other details yet.';
        } else if (!leadInfo.propertyType && !historyInfo.askedAboutPropertyType && (leadInfo.name || historyInfo.askedAboutName)) {
          context += '\nNow only ask about the property type (such as apartment, house, villa, etc.). Do not ask for other details yet.';
        } else if (!leadInfo.budget && !historyInfo.askedAboutBudget && (leadInfo.propertyType || historyInfo.askedAboutPropertyType)) {
          context += '\nNow only ask about their budget. Do not ask for other details yet.';
        } else if (!leadInfo.preferredLocation && !historyInfo.askedAboutLocation && (leadInfo.budget || historyInfo.askedAboutBudget)) {
          context += '\nNow only ask about their preferred location. Do not ask for other details yet.';
        } else {
          // If we've already asked about all basic info but don't have answers yet, just respond to their current question
          context += '\nRespond to the user\'s current question. Do not repeat questions that have already been asked.';
        }
      }
      
      // Add explicit instruction to never ask the same question twice
      context += '\n\n### IMPORTANT: Question Control ###';
      context += '\nNEVER ask the same question twice in a conversation.';
      context += '\nNEVER ask multiple questions at once.';
      context += '\nNEVER ask for information that the user has already provided.';
      context += '\nIf you\'re unsure whether to ask a question, DO NOT ask it.';
    }

    // Add fallback and escalation instructions based on PRD
    context += '\n\n### Fallback & Escalation Instructions ###';
    context += '\n1. Use NLP fallback when intent is unclear to maintain conversation flow.';
    context += '\n2. When no property data is available in MongoDB, use Google Search fallback to fetch relevant listings.';
    context += '\n3. Filter search results to focus on known real estate portals (e.g., 99acres, MagicBricks).';
    context += '\n4. If the user requests to speak with a human agent, acknowledge the request and inform them that a human agent will contact them soon.';
    context += '\n5. Provide clear escalation paths for complex queries beyond the chatbots capabilities.';

    // Final reminder for response quality
    if (detectedLangCode === 'hi' || detectedLangCode === 'mr' || detectedLangCode === 'gu') {
      context += '\n\n### अंतिम निर्देश ###';
      context += '\nहमेशा सटीक, स्पष्ट और उपयोगी उत्तर दें। कभी भी बेतुकी या अप्रासंगिक जानकारी न दें।';
      context += '\nउपयोगकर्ता के प्रश्न का सीधा उत्तर दें और अनावश्यक जानकारी से बचें।';
    } else {
      context += '\n\n### Final Instructions ###';
      context += '\nAlways provide accurate, clear, and helpful responses. Never provide nonsensical or irrelevant information.';
      context += '\nAnswer the user\'s question directly and avoid unnecessary information.';
      context += '\nMaintain a professional, knowledgeable, and helpful tone throughout the conversation.';
    }

    return {
      role: 'system',
      content: context
    };
  }
}


module.exports = new MistralService();

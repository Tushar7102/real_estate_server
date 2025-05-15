const axios = require('axios');
const languageService = require('./languageService');

/**
 * Web Search Service for real estate data with multilingual support
 * Enhanced to provide more relevant property information as per PRD requirements
 */
class WebSearchService {
  constructor() {
    // Get API key and Search Engine ID from environment variables
    this.googleApiKey = process.env.GOOGLE_API_KEY;
    
    // Extract the search engine ID from the URL if needed
    let searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    if (searchEngineId && searchEngineId.includes('cx=')) {
      // Extract the cx parameter from the URL
      const match = searchEngineId.match(/cx=([^&]+)/);
      if (match && match[1]) {
        searchEngineId = match[1];
      }
    }
    
    this.googleSearchEngineId = searchEngineId;
    this.baseURL = 'https://www.googleapis.com/customsearch/v1';
    
    // Define premium real estate portals for better search results
    this.premiumPortals = [
      '99acres.com', 'magicbricks.com', 'housing.com', 'nobroker.in',
      'commonfloor.com', 'squareyards.com', 'makaan.com', 'proptiger.com'
    ];
    
    console.log('Web Search Service initialized with Google API for professional real estate information');
  }

  /**
   * Perform a web search for real estate information
   * @param {string} query - The search query
   * @returns {Promise<Array>} - Array of search results
   */
  /**
   * Perform a web search for real estate information with enhanced relevance
   * @param {string} query - The search query
   * @param {Object} leadInfo - Optional lead information to enhance the search
   * @returns {Promise<Array>} - Array of search results
   */
  async searchRealEstateInfo(query, leadInfo = {}) {
    // Detect language of the query
    const detectedLangCode = languageService.detectLanguage(query);
    console.log(`Detected query language: ${languageService.getLanguageName(detectedLangCode)}`);
    
    try {
      // Verify API key and search engine ID are available
      if (!this.googleApiKey || !this.googleSearchEngineId) {
        console.error('Google Search API key or Search Engine ID is missing');
        console.error('GOOGLE_API_KEY:', this.googleApiKey ? 'Set' : 'Not Set');
        console.error('GOOGLE_SEARCH_ENGINE_ID:', this.googleSearchEngineId ? 'Set' : 'Not Set');
        throw new Error('API configuration error');
      }

      // Extract location information from query with improved pattern matching
      const locationPatterns = [
        /(?:in|at|near|around|within)\s+([\w\s,]+)/i,
        /([\w\s,]+)\s+(?:area|locality|region|district|neighborhood)/i,
        /properties?\s+(?:in|at|near|around|within)\s+([\w\s,]+)/i,
        // Add more patterns for Indian cities and regions
        /(mumbai|delhi|bangalore|hyderabad|chennai|kolkata|pune|ahmedabad|jaipur|surat|lucknow|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|varanasi|srinagar|aurangabad|dhanbad|amritsar|navi mumbai|allahabad|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|guwahati|chandigarh|solapur|hubli|dharwad|bareilly|moradabad|mysore|gurgaon|aligarh|jalandhar|tiruchirappalli|bhubaneswar|salem|mira-bhayandar|warangal|guntur|bhiwandi|saharanpur|gorakhpur|bikaner|amravati|noida|jamshedpur|bhilai|cuttack|firozabad|kochi|nellore|bhavnagar|dehradun|durgapur|asansol|rourkela|nanded|kolhapur|ajmer|akola|gulbarga|jamnagar|ujjain|loni|siliguri|jhansi|ulhasnagar|jammu|sangli-miraj|mangalore|erode|belgaum|ambattur|tirunelveli|malegaon|gaya|jalgaon|udaipur|maheshtala|tirupur|davanagere|kozhikode|akbarpur|korba|bhilwara|berhampur|muzaffarpur|ahmednagar|mathura|kollam|avadi|kadapa|kamarhati|sambalpur|bilaspur|shahjahanpur|satara|bijapur|rampur|shimoga|chandrapur|tumkur|muzaffarnagar|bhagalpur|bally|panihati|rohtak|sagar|bidar|brahmapur|baranagar|darbhanga|sonipat|srinagar|pondicherry|durg|imphal|ratlam|hapur|anantapur|arrah|karimnagar|etawah|ambarnath|north|dumdum|bharatpur|begusarai|new|delhi|gandhidham|barasat|guwahati|rae|bareli|khammam|bhilai|nagar|bhiwani|cuddalore|rajpur|sonarpur|rajahmundry|bokaro|south|dumdum|bellary|patiala|gopalpur|agartala|bhagalpur|bhatpara|hazaribagh|dhule|panvel|nellore|mango|malegaon|gaya|haldia|kurnool|ajmer|tiruppur|ambala|panipat|kottayam|gandhidham|tirupati|karnal|bathinda|rampur|shivamogga|raebareli|khammam|bhilai|nagar|bhiwani|cuddalore|rajpur|sonarpur|rajahmundry|bokaro|south|dumdum|bellary|patiala|gopalpur|agartala|bhagalpur|bhatpara|hazaribagh|dhule|panvel|nellore|mango|malegaon|gaya|haldia|kurnool|ajmer|tiruppur|ambala|panipat|kottayam|gandhidham|tirupati|karnal|bathinda|rampur|shivamogga|raebareli|khammam|bhilai|nagar|bhiwani|cuddalore|rajpur|sonarpur|rajahmundry|bokaro|south|dumdum|bellary|patiala|gopalpur|agartala|bhagalpur|bhatpara|hazaribagh|dhule|panvel|nellore|mango|malegaon|gaya|haldia|kurnool|ajmer|tiruppur|ambala|panipat|kottayam|gandhidham|tirupati|karnal|bathinda|rampur|shivamogga|raebareli)/i
      ];
      
      // First check if location is already in leadInfo
      let location = leadInfo.preferredLocation || '';
      
      // If not in leadInfo, extract from query
      if (!location) {
        for (const pattern of locationPatterns) {
          const match = query.match(pattern);
          if (match && match[1]) {
            location = match[1].trim();
            break;
          }
        }
      }
      
      // Extract budget information with improved pattern matching for Indian currency
      const budgetPatterns = [
        /(?:budget|price|cost|value|worth|range)\s+(?:of|is|around|about)?\s*(?:rs\.?|inr|₹)?\s*(\d[\d,.]*)/i,
        /(\d[\d,.]*)\s*(?:rs\.?|inr|₹|lakh|crore|k|l|cr)/i,
        /(?:budget|price|cost|value|worth|range)\s+(?:between|from)\s*(?:rs\.?|inr|₹)?\s*(\d[\d,.]*)\s*(?:to|-|and)\s*(?:rs\.?|inr|₹)?\s*(\d[\d,.]*)/i,
        /(?:under|below|less than|maximum|max)\s*(?:rs\.?|inr|₹)?\s*(\d[\d,.]*)/i,
        /(?:above|over|more than|minimum|min)\s*(?:rs\.?|inr|₹)?\s*(\d[\d,.]*)/i
      ];
      
      // First check if budget is already in leadInfo
      let budget = leadInfo.budget || '';
      
      // If not in leadInfo, extract from query
      if (!budget) {
        for (const pattern of budgetPatterns) {
          const match = query.match(pattern);
          if (match && match[1]) {
            budget = match[1].replace(/[,.]/g, '');
            break;
          }
        }
      }
      
      // Extract property type information with expanded list for Indian real estate market
      const propertyTypes = [
        'apartment', 'house', 'villa', 'flat', 'plot', 'land', 'penthouse', 'studio',
        'duplex', 'bungalow', 'cottage', 'farmhouse', 'rowhouse', 'townhouse',
        '1bhk', '2bhk', '3bhk', '4bhk', '5bhk', 'rk', 'single room', 'commercial',
        'office', 'shop', 'retail', 'warehouse', 'industrial', 'pg', 'paying guest',
        'independent house', 'independent floor', 'builder floor', 'kothi', 'haveli',
        'residential apartment', 'residential plot', 'residential land', 'residential house',
        'commercial property', 'commercial space', 'commercial plot', 'commercial land',
        'agricultural land', 'farm land', 'farm house', 'resort', 'service apartment'
      ];
      
      // First check if propertyType is already in leadInfo
      let propertyType = leadInfo.propertyType || '';
      
      // If not in leadInfo, extract from query
      if (!propertyType) {
        for (const type of propertyTypes) {
          if (query.toLowerCase().includes(type)) {
            propertyType = type;
            break;
          }
        }
      }
      
      // Extract buy/rent preference with expanded terms for Indian context
      const buyTerms = ['buy', 'purchase', 'buying', 'purchasing', 'own', 'owning', 'investment', 'investing', 'kharidna', 'kharid', 'खरीदना', 'खरीद', 'विकय', 'खरेदी', 'ખરીદવું'];
      const rentTerms = ['rent', 'renting', 'lease', 'leasing', 'temporary', 'short term', 'kiraya', 'किराया', 'भाड़े', 'भाडे', 'ભાડે'];
      
      let transactionType = '';
      for (const term of buyTerms) {
        if (query.toLowerCase().includes(term)) {
          transactionType = 'buy';
          break;
        }
      }
      
      if (!transactionType) {
        for (const term of rentTerms) {
          if (query.toLowerCase().includes(term)) {
            transactionType = 'rent';
            break;
          }
        }
      }
      
      // Extract number of bedrooms with expanded patterns
      const bedroomPatterns = [
        /(\d+)\s*bhk/i,
        /(\d+)\s*bedroom/i,
        /(\d+)\s*bed/i,
        /(one|two|three|four|five|1|2|3|4|5)\s*(?:bedroom|bhk|bed)/i,
        /(?:single|double|triple)\s*(?:bedroom|bhk|bed)/i
      ];
      
      let bedrooms = '';
      for (const pattern of bedroomPatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          // Convert text numbers to digits
          if (match[1].toLowerCase() === 'one') bedrooms = '1';
          else if (match[1].toLowerCase() === 'two') bedrooms = '2';
          else if (match[1].toLowerCase() === 'three') bedrooms = '3';
          else if (match[1].toLowerCase() === 'four') bedrooms = '4';
          else if (match[1].toLowerCase() === 'five') bedrooms = '5';
          else if (match[1].toLowerCase() === 'single') bedrooms = '1';
          else if (match[1].toLowerCase() === 'double') bedrooms = '2';
          else if (match[1].toLowerCase() === 'triple') bedrooms = '3';
          else bedrooms = match[1];
          break;
        }
      }
      
      // Create a more specific and relevant query with all extracted information
      let enhancedQuery = query;
      
      // Add real estate context if not present
      if (!query.toLowerCase().includes('real estate') && 
          !query.toLowerCase().includes('property') && 
          !query.toLowerCase().includes('flat') && 
          !query.toLowerCase().includes('house') && 
          !query.toLowerCase().includes('apartment')) {
        enhancedQuery += ' real estate property';
      }
      
      // Add location context if extracted
      if (location && !enhancedQuery.toLowerCase().includes(location.toLowerCase())) {
        enhancedQuery += ` in ${location}`;
      }
      
      // Add property type context if extracted
      if (propertyType && !enhancedQuery.toLowerCase().includes(propertyType.toLowerCase())) {
        enhancedQuery += ` ${propertyType}`;
      }
      
      // Add transaction type context if extracted
      if (transactionType && !enhancedQuery.toLowerCase().includes(transactionType)) {
        enhancedQuery += ` for ${transactionType}`;
      }
      
      // Add budget context if extracted
      if (budget && !enhancedQuery.includes(budget)) {
        enhancedQuery += ` ${budget}`;
      }
      
      // Add bedroom context if extracted
      if (bedrooms && !enhancedQuery.toLowerCase().includes(`${bedrooms} bhk`) && 
          !enhancedQuery.toLowerCase().includes(`${bedrooms} bedroom`)) {
        enhancedQuery += ` ${bedrooms} bhk`;
      }
      
      // Add known real estate portals to focus search results using the premium portals list
      const portalQueryPart = this.premiumPortals.join(' OR ');
      enhancedQuery += ` (${portalQueryPart})`;
      
      console.log('Enhanced search query for professional real estate results:', enhancedQuery);
      
      // Log the search parameters for debugging
      console.log('Google Search API Request Parameters:', {
        apiKeyLength: this.googleApiKey ? this.googleApiKey.length : 0,
        searchEngineId: this.googleSearchEngineId,
        query: enhancedQuery
      });
      
      // Configure request with improved parameters for real estate specific results
      const response = await axios.get(this.baseURL, {
        params: {
          key: this.googleApiKey,
          cx: this.googleSearchEngineId,
          q: enhancedQuery,
          num: 10, // Increased number of results to return
          cr: 'countryIN', // Country restriction to India
          gl: 'in', // Geolocation parameter for India
          safe: 'active', // Safe search setting
          sort: 'date', // Prioritize recent listings
          filter: '1', // Filter duplicate content
          dateRestrict: 'y1' // Restrict to results from the past year for fresh listings
        },
        timeout: 15000 // Increased timeout for better results
      });
      
      // Log successful API response
      console.log('Google Search API response received successfully');

      // Validate response structure
      if (!response.data) {
        console.error('Empty response from Google Search API');
        return [];
      }
      
      // Check if items array exists
      if (!response.data.items || !Array.isArray(response.data.items) || response.data.items.length === 0) {
        console.error('No search results found in Google API response:', JSON.stringify(response.data, null, 2));
        return [];
      }
      
      console.log(`Found ${response.data.items.length} search results from Google API`);

      // Process and filter search results for relevance with enhanced scoring
      let results = response.data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        pagemap: item.pagemap, // Include pagemap for additional structured data
        relevanceScore: this.calculateRelevanceScore(item, query, location, propertyType, transactionType, bedrooms)
      }));
      
      // Sort by relevance score (highest first)
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Extract additional property details from pagemap when available
      results = results.map(item => {
        const enhancedItem = {
          title: item.title,
          link: item.link,
          snippet: item.snippet
        };
        
        // Try to extract property details from pagemap if available
        if (item.pagemap) {
          if (item.pagemap.metatags) {
            const metatags = item.pagemap.metatags[0];
            if (metatags['og:description']) {
              enhancedItem.description = metatags['og:description'];
            }
            if (metatags['og:image']) {
              enhancedItem.image = metatags['og:image'];
            }
          }
          
          // Extract property details from structured data
          if (item.pagemap.product) {
            const product = item.pagemap.product[0];
            if (product.price) enhancedItem.price = product.price;
            if (product.name) enhancedItem.name = product.name;
          }
        }
        
        return enhancedItem;
      });
      
      // Take top results for the most relevant property information
      return results.slice(0, 5);
    } catch (error) {
      console.error('Error performing web search for real estate information:', error.message);
      
      // Log detailed error information for debugging
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx range
        console.error('Google API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Google API No Response Error:', {
          request: error.request._currentUrl || error.request.path,
          method: error.request.method
        });
      }
      
      // Try a simplified query as fallback
      try {
        console.log('Attempting fallback search with simplified query...');
        const simplifiedQuery = query.split(' ').slice(0, 3).join(' ') + ' real estate';
        
        const fallbackResponse = await axios.get(this.baseURL, {
          params: {
            key: this.googleApiKey,
            cx: this.googleSearchEngineId,
            q: simplifiedQuery,
            num: 5
          },
          timeout: 10000
        });
        
        if (fallbackResponse.data && fallbackResponse.data.items && fallbackResponse.data.items.length > 0) {
          console.log(`Fallback search successful, found ${fallbackResponse.data.items.length} results`);
          return fallbackResponse.data.items.map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
          }));
        }
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError.message);
      }
      
      return [];
    }
  }

  /**
   * Format search results into a readable response
   * @param {Array} searchResults - The search results
   * @param {string} query - The original user query
   * @returns {string} - Formatted response with search results
   */
  formatSearchResults(searchResults, query = '') {
    // Detect language from the query
    const detectedLangCode = languageService.detectLanguage(query);
    console.log(`Formatting search results in detected language: ${languageService.getLanguageName(detectedLangCode)}`);
    
    // Use language service to format results in the detected language
    return languageService.formatSearchResultsInLanguage(searchResults, detectedLangCode);
  }

  /**
   * Determine if a query requires web search
   * @param {string} query - The user query
   * @returns {boolean} - Whether the query needs web search
   */
  needsWebSearch(query) {
    // Keywords that suggest the need for real-time or specific real estate data
    const webSearchKeywords = [
      // English keywords
      'market', 'price', 'trend', 'current', 'latest', 'recent',
      'statistics', 'data', 'report', 'news', 'development',
      'investment', 'return', 'appreciation', 'depreciation',
      'mortgage', 'interest rate', 'loan', 'financing',
      'neighborhood', 'school', 'crime', 'safety', 'amenities',
      'tax', 'property tax', 'insurance', 'regulation', 'law',
      'forecast', 'prediction', 'future', 'growth',
      
      // Hindi keywords
      'बाजार', 'कीमत', 'मूल्य', 'वर्तमान', 'नवीनतम', 'हालिया',
      'आंकड़े', 'डेटा', 'रिपोर्ट', 'समाचार', 'विकास',
      'निवेश', 'रिटर्न', 'मूल्यवृद्धि', 'मूल्यह्रास',
      'बंधक', 'ब्याज दर', 'ऋण', 'वित्तपोषण',
      'पड़ोस', 'स्कूल', 'अपराध', 'सुरक्षा', 'सुविधाएं',
      'कर', 'संपत्ति कर', 'बीमा', 'नियमन', 'कानून',
      'पूर्वानुमान', 'भविष्यवाणी', 'भविष्य', 'विकास',
      
      // Marathi keywords
      'बाजारपेठ', 'किंमत', 'ट्रेंड', 'सध्याचे', 'नवीनतम', 'अलीकडील',
      'आकडेवारी', 'डेटा', 'अहवाल', 'बातम्या', 'विकास',
      'गुंतवणूक', 'परतावा', 'मूल्यवाढ', 'मूल्यघट',
      'गहाण', 'व्याजदर', 'कर्ज', 'वित्तपुरवठा',
      'परिसर', 'शाळा', 'गुन्हेगारी', 'सुरक्षा', 'सुविधा',
      'कर', 'मालमत्ता कर', 'विमा', 'नियमन', 'कायदा',
      'भाकीत', 'अंदाज', 'भविष्य', 'वाढ',
      
      // Gujarati keywords
      'બજાર', 'કિંમત', 'વલણ', 'વર્તમાન', 'નવીનતમ', 'તાજેતરની',
      'આંકડા', 'ડેટા', 'અહેવાલ', 'સમાચાર', 'વિકાસ',
      'રોકાણ', 'વળતર', 'મૂલ્ય વૃદ્ધિ', 'મૂલ્ય ઘટાડો',
      'ગીરો', 'વ્યાજ દર', 'લોન', 'ફાઇનાન્સિંગ',
      'પડોશ', 'શાળા', 'ગુના', 'સલામતી', 'સુવિધાઓ',
      'કર', 'મિલકત કર', 'વીમો', 'નિયમન', 'કાયદો',
      'આગાહી', 'અનુમાન', 'ભવિષ્ય', 'વૃદ્ધિ'
    ];

    // Check if any of the keywords are in the query
    return webSearchKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase()));
  }
  
  /**
   * Calculate relevance score for a search result with enhanced accuracy for real estate
   * @param {Object} item - The search result item
   * @param {string} query - The original search query
   * @param {string} location - The extracted location
   * @param {string} propertyType - The extracted property type
   * @param {string} transactionType - The extracted transaction type (buy/rent)
   * @param {string} bedrooms - The extracted number of bedrooms
   * @returns {number} - The relevance score
   */
  calculateRelevanceScore(item, query, location, propertyType, transactionType, bedrooms) {
    let score = 0;
    const title = item.title.toLowerCase();
    const snippet = item.snippet.toLowerCase();
    const link = item.link.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Check if the result is from a known real estate website with tiered scoring
    // Use the premium portals list from constructor for consistency
    const realEstateWebsites = {
      premium: this.premiumPortals.map(portal => portal.replace('.com', '').replace('.in', '')),
      standard: ['commonfloor', 'squareyards', 'makaan', 'proptiger', 'propertywala', 'indiaproperty'],
      other: ['olx', 'quikr', 'nestaway', 'zolo', 'stanza', 'colive', 'facebook', 'instagram', 'linkedin']
    };
    
    // Premium real estate portals get highest score
    for (const site of realEstateWebsites.premium) {
      if (link.includes(site)) {
        score += 20; // Increased score for premium sites
        break;
      }
    }
    
    // Standard real estate portals get medium score
    if (score === 0) { // Only check if not already matched with premium
      for (const site of realEstateWebsites.standard) {
        if (link.includes(site)) {
          score += 15; // Increased score for standard sites
          break;
        }
      }
    }
    
    // Other real estate related sites get lower score
    if (score === 0) { // Only check if not already matched
      for (const site of realEstateWebsites.other) {
        if (link.includes(site)) {
          score += 5;
          break;
        }
      }
    }
    
    // Check for property type match with exact and partial matching
    if (propertyType) {
      // Exact property type match in title (highest value)
      if (title.includes(propertyType)) {
        score += 12; // Increased score for exact property type match
      }
      // Exact property type match in snippet
      else if (snippet.includes(propertyType)) {
        score += 8; // Increased score for property type in snippet
      }
      // Related property types (e.g., apartment/flat, house/villa)
      else {
        const relatedTypes = {
          'apartment': ['flat', 'condo', 'condominium', 'residential apartment'],
          'flat': ['apartment', 'condo', 'condominium', 'residential flat'],
          'house': ['villa', 'bungalow', 'independent', 'kothi', 'residential house'],
          'villa': ['house', 'bungalow', 'independent', 'kothi'],
          'plot': ['land', 'residential plot', 'residential land'],
          'land': ['plot', 'residential land', 'residential plot'],
          '1bhk': ['1 bhk', 'one bedroom', '1 bedroom', 'single bedroom'],
          '2bhk': ['2 bhk', 'two bedroom', '2 bedroom', 'double bedroom'],
          '3bhk': ['3 bhk', 'three bedroom', '3 bedroom', 'triple bedroom'],
          '4bhk': ['4 bhk', 'four bedroom', '4 bedroom', 'quadruple bedroom'],
          'commercial': ['office', 'shop', 'retail', 'commercial property', 'commercial space']
        };
        
        if (relatedTypes[propertyType]) {
          for (const related of relatedTypes[propertyType]) {
            if (title.includes(related) || snippet.includes(related)) {
              score += 6; // Increased score for related property types
              break;
            }
          }
        }
      }
    }
    
    // Check for location match with exact and partial matching
    if (location) {
      const locationLower = location.toLowerCase();
      // Exact location match in title (highest value)
      if (title.includes(locationLower)) {
        score += 15; // Increased score for exact location match
      }
      // Exact location match in snippet
      else if (snippet.includes(locationLower)) {
        score += 10; // Increased score for location in snippet
      }
      // Check for partial location matches (e.g., "Mumbai" in "South Mumbai")
      else {
        const locationParts = locationLower.split(/\s+/);
        for (const part of locationParts) {
          if (part.length > 3 && (title.includes(part) || snippet.includes(part))) {
            score += 5; // Increased score for partial location match
            break;
          }
        }
      }
    }
    
    // Check for price/budget information with detailed pattern matching
    const pricePatterns = [
      /₹\s*\d[\d,.]*\s*(lakh|crore|k|l|cr)?/i,
      /rs\.?\s*\d[\d,.]*\s*(lakh|crore|k|l|cr)?/i,
      /inr\s*\d[\d,.]*\s*(lakh|crore|k|l|cr)?/i,
      /\d[\d,.]*\s*(lakh|crore|k|l|cr)/i,
      /price\s*:\s*\d[\d,.]*/i,
      /cost\s*:\s*\d[\d,.]*/i,
      /budget\s*:\s*\d[\d,.]*/i,
      /\d+(\.\d+)?\s*cr/i,
      /\d+(\.\d+)?\s*l/i,
      /\d+(\.\d+)?\s*lacs/i,
      /\d+(\.\d+)?\s*lakhs/i
    ];
    
    for (const pattern of pricePatterns) {
      if (title.match(pattern) || snippet.match(pattern)) {
        score += 8; // Increased score for price information
        break;
      }
    }
    
    // Check for bedroom match if specified
    if (bedrooms) {
      // Check for exact bedroom match in title or snippet
      const bedroomPatterns = [
        new RegExp(`${bedrooms}\\s*bhk`, 'i'),
        new RegExp(`${bedrooms}\\s*bedroom`, 'i'),
        new RegExp(`${bedrooms}\\s*bed`, 'i'),
        new RegExp(`${bedrooms}\\s*rk`, 'i')
      ];
      
      let hasBedroomMatch = false;
      for (const pattern of bedroomPatterns) {
        if (title.match(pattern) || snippet.match(pattern)) {
          score += 15; // High score for matching bedrooms
          hasBedroomMatch = true;
          break;
        }
      }
      
      // If no exact match, check for related bedroom terms
      if (!hasBedroomMatch) {
        // Check for terms like "spacious", "large", etc. for larger bedroom counts
        if (parseInt(bedrooms) >= 3 && (title.includes('spacious') || title.includes('large') || 
            snippet.includes('spacious') || snippet.includes('large'))) {
          score += 3;
        }
      }
    }
    
    // Check for detailed property specifications
    const propertyDetailPatterns = [
      /\d+\s*bhk/i,
      /\d+\s*bedroom/i,
      /\d+\s*bath/i,
      /\d+\s*sq\.?\s*ft/i,
      /\d+\s*square\s*feet/i,
      /\d+\s*sq\.?\s*m/i,
      /\d+\s*acre/i,
      /\d+\s*yard/i,
      /amenities/i,
      /furnished/i,
      /semi-furnished/i,
      /unfurnished/i,
      /carpet\s*area/i,
      /built\s*up\s*area/i,
      /super\s*built\s*up/i,
      /floor\s*plan/i,
      /master\s*bedroom/i,
      /attached\s*bath/i,
      /modular\s*kitchen/i,
      /power\s*backup/i,
      /24x7\s*water/i,
      /security/i,
      /gym|swimming\s*pool|club\s*house|garden|park/i
    ];
    
    let detailMatchCount = 0;
    for (const pattern of propertyDetailPatterns) {
      if (title.match(pattern) || snippet.match(pattern)) {
        detailMatchCount++;
      }
    }
    
    // Graduated scoring based on number of details matched
    if (detailMatchCount >= 5) {
      score += 12; // Excellent detail level
    } else if (detailMatchCount >= 3) {
      score += 8; // Good detail level
    } else if (detailMatchCount >= 1) {
      score += 4; // Basic detail level
    }
    
    // Check for recency indicators with expanded patterns
    const recencyPatterns = [
      /new\s*launch/i,
      /just\s*launch/i,
      /recent/i,
      /latest/i,
      /new\s*project/i,
      /under\s*construction/i,
      /ready\s*to\s*move/i,
      /immediate\s*possession/i,
      /\d{1,2}\s*days?\s*ago/i,
      /\d{1,2}\s*hours?\s*ago/i,
      /possession\s*in\s*\d{4}/i,
      /completion\s*in\s*\d{4}/i,
      /ready\s*to\s*move\s*in/i,
      /newly\s*built/i,
      /fresh\s*listing/i
    ];
    
    for (const pattern of recencyPatterns) {
      if (title.match(pattern) || snippet.match(pattern)) {
        score += 5; // Increased score for recency
        break;
      }
    }
    
    // Check for transaction type match (buy/rent)
    if (transactionType) {
      const buyPatterns = [/buy/i, /sale/i, /selling/i, /purchase/i, /invest/i, /ownership/i, /खरीदना/i, /खरीद/i, /विकय/i, /खरेदी/i, /ખરીદવું/i];
      const rentPatterns = [/rent/i, /lease/i, /renting/i, /leasing/i, /to let/i, /for let/i, /किराया/i, /भाड़े/i, /भाडे/i, /ભાડે/i];
      
      if (transactionType === 'buy') {
        for (const pattern of buyPatterns) {
          if (title.match(pattern) || snippet.match(pattern)) {
            score += 10; // Increased score for matching buy intent
            break;
          }
        }
        // Penalize rent listings when looking to buy
        for (const pattern of rentPatterns) {
          if (title.match(pattern) || snippet.match(pattern)) {
            score -= 15; // Strong penalty for mismatched transaction type
            break;
          }
        }
      } else if (transactionType === 'rent') {
        for (const pattern of rentPatterns) {
          if (title.match(pattern) || snippet.match(pattern)) {
            score += 10; // Increased score for matching rent intent
            break;
          }
        }
        // Penalize buy listings when looking to rent
        for (const pattern of buyPatterns) {
          if (title.match(pattern) || snippet.match(pattern)) {
            score -= 15; // Strong penalty for mismatched transaction type
            break;
          }
        }
      }
    }
    
    // Penalize results that seem unrelated to real estate with expanded patterns
    if (!title.match(/property|estate|home|house|apartment|flat|villa|plot|land|bhk|residential|commercial|rent|sale|broker|agent|realty|builder|construction|project|township|society|floor|bedroom|bathroom|kitchen|hall|balcony|terrace|parking|amenities|possession|ownership|lease/i) && 
        !snippet.match(/property|estate|home|house|apartment|flat|villa|plot|land|bhk|residential|commercial|rent|sale|broker|agent|realty|builder|construction|project|township|society|floor|bedroom|bathroom|kitchen|hall|balcony|terrace|parking|amenities|possession|ownership|lease/i)) {
      score -= 20; // Increased penalty for unrelated results
    }
    
    // Bonus for results that contain multiple property details
    let detailCount = 0;
    const detailTerms = [
      'bhk', 'bedroom', 'bathroom', 'sq ft', 'square feet', 'carpet area', 'built up', 'super built up', 
      'floor', 'storey', 'parking', 'garden', 'balcony', 'terrace', 'kitchen', 'hall', 'living room', 
      'dining room', 'study room', 'servant room', 'pooja room', 'store room', 'lobby', 'entrance', 
      'lift', 'elevator', 'power backup', 'water supply', 'security', 'gym', 'swimming pool', 'club house', 
      'park', 'playground', 'jogging track', 'tennis court', 'basketball court', 'badminton court', 
      'squash court', 'amphitheatre', 'banquet hall', 'party hall', 'community hall', 'shopping center', 
      'school', 'hospital', 'market', 'mall', 'metro', 'bus stop', 'railway station', 'airport'
    ];
    
    for (const term of detailTerms) {
      if (title.includes(term) || snippet.includes(term)) {
        detailCount++;
      }
    }
    
    if (detailCount >= 5) {
      score += 10; // Increased bonus for comprehensive property details
    } else if (detailCount >= 3) {
      score += 6; // Medium bonus for good property details
    } else if (detailCount >= 1) {
      score += 3; // Small bonus for some property details
    }
    
    // Check for structured data in pagemap which indicates high-quality listings
    if (item.pagemap) {
      if (item.pagemap.metatags) {
        score += 5; // Bonus for having structured metadata
      }
      if (item.pagemap.product) {
        score += 8; // Bonus for having product structured data
      }
      if (item.pagemap.offer) {
        score += 5; // Bonus for having offer structured data
      }
      if (item.pagemap.image || item.pagemap.cse_image) {
        score += 5; // Bonus for having images
      }
    }
    
    // Bonus for results with complete information (title, snippet, and link all present and substantial)
    if (title.length > 20 && snippet.length > 50 && link.length > 15) {
      score += 5; // Bonus for complete information
    }
    
    return score;
  }
}

module.exports = new WebSearchService();
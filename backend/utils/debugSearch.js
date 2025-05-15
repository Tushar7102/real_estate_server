/**
 * Google Search API डीबगिंग स्क्रिप्ट
 * इस स्क्रिप्ट का उपयोग Google वेब सर्च API कनेक्शन की जांच के लिए करें
 */

require('dotenv').config();
const axios = require('axios');

// पर्यावरण चर की जांच करें
console.log('\n=== पर्यावरण चर की स्थिति ===');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'सेट है' : 'सेट नहीं है');
console.log('GOOGLE_SEARCH_ENGINE_ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? 'सेट है' : 'सेट नहीं है');

if (!process.env.GOOGLE_API_KEY) {
  console.error('\nत्रुटि: GOOGLE_API_KEY सेट नहीं है');
  console.log('कृपया .env फ़ाइल में GOOGLE_API_KEY सेट करें');
  process.exit(1);
}

if (!process.env.GOOGLE_SEARCH_ENGINE_ID) {
  console.error('\nत्रुटि: GOOGLE_SEARCH_ENGINE_ID सेट नहीं है');
  console.log('कृपया .env फ़ाइल में GOOGLE_SEARCH_ENGINE_ID सेट करें');
  process.exit(1);
}

// Google सर्च API का परीक्षण करें
async function testGoogleSearch() {
  console.log('\n=== Google सर्च API परीक्षण ===');
  console.log('परीक्षण क्वेरी भेज रहा है...');
  
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        q: 'real estate property test',
        num: 3
      },
      timeout: 10000
    });
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      console.log('\n✅ सफलता! Google सर्च API काम कर रहा है');
      console.log(`${response.data.items.length} परिणाम मिले`);
      console.log('\nपहला परिणाम:');
      console.log('शीर्षक:', response.data.items[0].title);
      console.log('लिंक:', response.data.items[0].link);
    } else {
      console.error('\n⚠️ चेतावनी: API प्रतिक्रिया मिली, लेकिन कोई परिणाम नहीं मिला');
      console.log('API प्रतिक्रिया:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ त्रुटि: Google सर्च API कॉल विफल');
    
    if (error.response) {
      console.error('स्थिति कोड:', error.response.status);
      console.error('त्रुटि संदेश:', error.response.data.error?.message || JSON.stringify(error.response.data));
      
      // सामान्य त्रुटियों के लिए सुझाव
      if (error.response.status === 403) {
        console.log('\nसुझाव: आपकी API कुंजी अमान्य है या इसके पास अनुमति नहीं है');
        console.log('1. सुनिश्चित करें कि आपकी API कुंजी सही है');
        console.log('2. Google Cloud Console में Custom Search API सक्षम करें');
        console.log('3. सुनिश्चित करें कि आपके खाते में बिलिंग सक्षम है');
      } else if (error.response.status === 400) {
        console.log('\nसुझाव: अमान्य अनुरोध पैरामीटर');
        console.log('सुनिश्चित करें कि आपका GOOGLE_SEARCH_ENGINE_ID (cx) सही है');
      } else if (error.response.status === 429) {
        console.log('\nसुझाव: आपने API कॉल की दैनिक सीमा पार कर ली है');
        console.log('मुफ्त टियर में प्रति दिन 100 क्वेरी तक सीमित है');
      }
    } else if (error.request) {
      console.error('कोई प्रतिक्रिया नहीं मिली - नेटवर्क समस्या हो सकती है');
    } else {
      console.error('त्रुटि संदेश:', error.message);
    }
  }
}

// परीक्षण चलाएं
testGoogleSearch();

console.log('\n=== समस्या निवारण सुझाव ===');
console.log('1. .env फ़ाइल में अपनी API कुंजी और सर्च इंजन ID की जांच करें');
console.log('2. सुनिश्चित करें कि Google Cloud Console में Custom Search API सक्षम है');
console.log('3. सुनिश्चित करें कि आपके खाते में बिलिंग सक्षम है');
console.log('4. अधिक जानकारी के लिए .env.instructions.md फ़ाइल देखें');
/**
 * سیستم جستجوی هوشمند با پشتیبانی از زبان فارسی
 */

// تبدیل حروف فارسی/عربی به معادل ساده
const normalizeArabicPersian = (text) => {
  const charMap = {
    'ی': 'ي',
    'ک': 'ك',
    'ھ': 'ه',
    'ہ': 'ه',
    'ة': 'ه',
    'أ': 'ا',
    'إ': 'ا',
    'آ': 'ا',
    'ئ': 'ی',
    'ؤ': 'و',
    'ٶ': 'و',
    'ي': 'ی',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '٠': '0'
  };
  
  return text.replace(/[یکھہةأإآئؤٶي١٢٣٤٥٦٧٨٩٠]/g, char => charMap[char] || char);
};

// حذف اعراب و تشدید
const removeDiacritics = (text) => {
  return text.replace(/[\u064B-\u065F]/g, '');
};

// تبدیل فاصله‌های نیم به فاصله معمولی
const normalizeSpaces = (text) => {
  return text.replace(/\u200C/g, ' ').replace(/\s+/g, ' ').trim();
};

export class SmartSearch {
  static normalize(text) {
    if (!text) return '';
    text = text.toLowerCase();
    text = normalizeArabicPersian(text);
    text = removeDiacritics(text);
    text = normalizeSpaces(text);
    return text;
  }

  static match(text, query) {
    text = this.normalize(text);
    query = this.normalize(query);
    
    // اگر کوئری خالی باشد
    if (!query) return true;
    
    // تقسیم کوئری به کلمات
    const queryWords = query.split(' ').filter(word => word.length > 0);
    
    // بررسی تطابق هر کلمه
    return queryWords.every(word => {
      // اگر کلمه با "!" شروع شود، به معنی نفی است
      if (word.startsWith('!')) {
        const negatedWord = word.slice(1);
        return !text.includes(negatedWord);
      }
      return text.includes(word);
    });
  }

  /**
   * جستجو در لیست با پشتیبانی از عملگرهای منطقی
   * @param {Array<{text: string, [key: string]: any}>} items - آیتم‌های قابل جستجو
   * @param {string} query - عبارت جستجو
   * @param {Array<string>} searchFields - فیلدهای قابل جستجو در هر آیتم
   * @returns {Array} - نتایج جستجو
   */
  static search(items, query, searchFields = ['text']) {
    return items.filter(item => {
      // ترکیب تمام فیلدهای قابل جستجو
      const searchText = searchFields
        .map(field => item[field])
        .filter(Boolean)
        .join(' ');
      
      return this.match(searchText, query);
    });
  }

  /**
   * اولویت‌بندی نتایج جستجو
   * @param {Array} results - نتایج جستجو
   * @param {string} query - عبارت جستجو
   * @param {string} textField - فیلد متنی برای محاسبه اولویت
   * @returns {Array} - نتایج مرتب شده
   */
  static rankResults(results, query, textField = 'text') {
    const normalizedQuery = this.normalize(query);
    
    return results.sort((a, b) => {
      const textA = this.normalize(a[textField]);
      const textB = this.normalize(b[textField]);
      
      // محاسبه امتیاز بر اساس موقعیت کلمه در متن
      const scoreA = this.calculateScore(textA, normalizedQuery);
      const scoreB = this.calculateScore(textB, normalizedQuery);
      
      return scoreB - scoreA;
    });
  }

  /**
   * محاسبه امتیاز تطابق
   * @private
   */
  static calculateScore(text, query) {
    if (!query) return 0;
    
    const words = query.split(' ').filter(Boolean);
    let score = 0;
    
    words.forEach(word => {
      const index = text.indexOf(word);
      if (index !== -1) {
        // هر چه کلمه در ابتدای متن باشد، امتیاز بیشتری دارد
        score += (1000 - index);
        // تطابق کامل کلمه امتیاز بیشتری دارد
        if (text === word) score += 500;
        // تطابق در ابتدای کلمه امتیاز بیشتری دارد
        if (index === 0) score += 200;
      }
    });
    
    return score;
  }
}
const axios = require('axios');
const config = require('../../config');

class InternationalTools {
  constructor() {
    this.apiUrl = 'https://api.example.com'; // Replace with actual API
  }

  async translate(text, targetLang = 'en', sourceLang = 'auto') {
    try {
      // Using free translation API
      const response = await axios.get(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
      );

      return {
        success: true,
        original: text,
        translated: response.data.responseData.translatedText,
        sourceLang: response.data.responseData.matchedTranslation ? sourceLang : 'auto',
        targetLang
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        success: false,
        error: 'Translation failed'
      };
    }
  }

  async getWeather(city) {
    try {
      // Using OpenWeatherMap API (free tier)
      const apiKey = process.env.WEATHER_API_KEY || 'demo';
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
      );

      const data = response.data;
      
      return {
        success: true,
        city: data.name,
        country: data.sys.country,
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        windSpeed: data.wind.speed
      };
    } catch (error) {
      console.error('Weather error:', error);
      return {
        success: false,
        error: 'Weather data not available'
      };
    }
  }

  async getCurrencyRates(base = 'USD') {
    try {
      const response = await axios.get(
        `https://api.exchangerate-api.com/v4/latest/${base.toUpperCase()}`
      );

      return {
        success: true,
        base,
        rates: response.data.rates,
        date: response.data.date
      };
    } catch (error) {
      console.error('Currency error:', error);
      return {
        success: false,
        error: 'Currency rates not available'
      };
    }
  }

  async convertCurrency(amount, from, to) {
    try {
      const ratesData = await this.getCurrencyRates(from);
      
      if (!ratesData.success) {
        return ratesData;
      }

      const rate = ratesData.rates[to.toUpperCase()];
      
      if (!rate) {
        return {
          success: false,
          error: 'Currency not supported'
        };
      }

      const converted = amount * rate;

      return {
        success: true,
        amount,
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate,
        converted,
        formatted: `${converted.toFixed(2)} ${to.toUpperCase()}`
      };
    } catch (error) {
      console.error('Currency conversion error:', error);
      return {
        success: false,
        error: 'Conversion failed'
      };
    }
  }

  async getTimezone(timezone) {
    try {
      const response = await axios.get(
        `https://worldtimeapi.org/api/timezone/${timezone}.json`
      );

      const data = response.data;

      return {
        success: true,
        timezone: data.timezone,
        datetime: data.datetime,
        date: data.date,
        time: data.datetime.split('T')[1].split('.')[0],
        dayOfWeek: data.day_of_week,
        utcOffset: data.utc_offset
      };
    } catch (error) {
      console.error('Timezone error:', error);
      return {
        success: false,
        error: 'Timezone data not available'
      };
    }
  }

  async getNews(country = 'us', category = 'general') {
    try {
      const apiKey = process.env.NEWS_API_KEY || 'demo';
      const response = await axios.get(
        `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${apiKey}`
      );

      return {
        success: true,
        articles: response.data.articles.slice(0, 5).map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          imageUrl: article.urlToImage
        }))
      };
    } catch (error) {
      console.error('News error:', error);
      return {
        success: false,
        error: 'News not available'
      };
    }
  }

  async getCountryInfo(countryCode) {
    try {
      const response = await axios.get(
        `https://restcountries.com/v3.1/alpha/${countryCode}`
      );

      const data = response.data[0];

      return {
        success: true,
        name: data.name.common,
        officialName: data.name.official,
        capital: data.capital?.[0] || 'N/A',
        region: data.region,
        subregion: data.subregion,
        population: data.population,
        languages: Object.values(data.languages || {}),
        currencies: Object.values(data.currencies || {}).map(c => c.name),
        flag: data.flags.svg,
        timezone: data.timezones[0]
      };
    } catch (error) {
      console.error('Country info error:', error);
      return {
        success: false,
        error: 'Country information not found'
      };
    }
  }
}

module.exports = new InternationalTools();


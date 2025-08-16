const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const logger = require('../utils/logger');

class CrawlerService {
  constructor() {
    this.userAgent = 'Monowave-Crawler/1.0';
    this.timeout = 30000;
  }

  async crawlUrl(url, format = 'raw') {
    try {
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL format');
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: this.timeout,
        maxRedirects: 5
      });

      const content = response.data;
      const contentLength = Buffer.byteLength(content, 'utf8');

      let processedContent;
      switch (format) {
        case 'raw':
          processedContent = content;
          break;
        case 'summary':
          processedContent = this.extractSummary(content);
          break;
        case 'structured':
          processedContent = this.extractStructured(content);
          break;
        default:
          processedContent = content;
      }

      return {
        url,
        content: processedContent,
        contentLength,
        format,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Crawling failed for URL ${url}:`, error);
      throw new Error(`Failed to crawl URL: ${error.message}`);
    }
  }

  async crawlMultipleUrls(urls, format = 'raw') {
    const results = {};
    const errors = {};

    const promises = urls.map(async (url) => {
      try {
        const result = await this.crawlUrl(url, format);
        results[url] = result;
      } catch (error) {
        errors[url] = error.message;
      }
    });

    await Promise.allSettled(promises);

    return { results, errors };
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  extractSummary(html) {
    const $ = cheerio.load(html);
    
    // Remove script and style tags
    $('script, style').remove();
    
    // Extract title
    const title = $('title').text().trim();
    
    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Extract first paragraph or main content
    const mainContent = $('p').first().text().trim() || 
                       $('.content, .main, .article').first().text().trim().substring(0, 500);
    
    return {
      title,
      metaDescription,
      summary: mainContent,
      wordCount: mainContent.split(/\s+/).length
    };
  }

  extractStructured(html) {
    const $ = cheerio.load(html);
    
    // Remove script and style tags
    $('script, style').remove();
    
    const structured = {
      title: $('title').text().trim(),
      meta: {
        description: $('meta[name="description"]').attr('content') || '',
        keywords: $('meta[name="keywords"]').attr('content') || '',
        author: $('meta[name="author"]').attr('content') || ''
      },
      headings: {
        h1: $('h1').map((i, el) => $(el).text().trim()).get(),
        h2: $('h2').map((i, el) => $(el).text().trim()).get(),
        h3: $('h3').map((i, el) => $(el).text().trim()).get()
      },
      paragraphs: $('p').map((i, el) => $(el).text().trim()).get().filter(p => p.length > 0),
      links: $('a[href]').map((i, el) => ({
        text: $(el).text().trim(),
        href: $(el).attr('href')
      })).get(),
      images: $('img[src]').map((i, el) => ({
        src: $(el).attr('src'),
        alt: $(el).attr('alt') || ''
      })).get()
    };
    
    return structured;
  }
}

module.exports = CrawlerService;
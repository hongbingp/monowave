const CrawlerService = require('../../src/services/crawler');
const axios = require('axios');

jest.mock('axios');

describe('CrawlerService', () => {
  let crawlerService;

  beforeEach(() => {
    crawlerService = new CrawlerService();
    jest.clearAllMocks();
  });

  describe('isValidUrl', () => {
    it('should validate HTTP URLs', () => {
      expect(crawlerService.isValidUrl('http://example.com')).toBe(true);
      expect(crawlerService.isValidUrl('https://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(crawlerService.isValidUrl('ftp://example.com')).toBe(false);
      expect(crawlerService.isValidUrl('invalid-url')).toBe(false);
      expect(crawlerService.isValidUrl('')).toBe(false);
      expect(crawlerService.isValidUrl(null)).toBe(false);
    });

    it('should validate complex URLs', () => {
      expect(crawlerService.isValidUrl('https://example.com/path?query=value')).toBe(true);
      expect(crawlerService.isValidUrl('http://subdomain.example.com:8080/path')).toBe(true);
    });
  });

  describe('crawlUrl', () => {
    const mockHtmlContent = `
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Test description">
          <meta name="keywords" content="test, keywords">
        </head>
        <body>
          <h1>Main Title</h1>
          <h2>Subtitle</h2>
          <p>First paragraph content</p>
          <p>Second paragraph content</p>
          <a href="/link1">Link 1</a>
          <a href="/link2">Link 2</a>
          <img src="/image1.jpg" alt="Image 1">
          <img src="/image2.jpg" alt="Image 2">
        </body>
      </html>
    `;

    it('should crawl URL and return raw content', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      const result = await crawlerService.crawlUrl('https://example.com', 'raw');

      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com');
      expect(result.content).toBe(mockHtmlContent);
      expect(result.format).toBe('raw');
      expect(result.contentLength).toBe(Buffer.byteLength(mockHtmlContent, 'utf8'));
      expect(result.timestamp).toBeDefined();
    });

    it('should crawl URL and return summary', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      const result = await crawlerService.crawlUrl('https://example.com', 'summary');

      expect(result).toBeDefined();
      expect(result.content).toHaveProperty('title', 'Test Page');
      expect(result.content).toHaveProperty('metaDescription', 'Test description');
      expect(result.content).toHaveProperty('summary');
      expect(result.content).toHaveProperty('wordCount');
      expect(result.format).toBe('summary');
    });

    it('should crawl URL and return structured data', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      const result = await crawlerService.crawlUrl('https://example.com', 'structured');

      expect(result).toBeDefined();
      expect(result.content).toHaveProperty('title', 'Test Page');
      expect(result.content).toHaveProperty('meta');
      expect(result.content.meta).toHaveProperty('description', 'Test description');
      expect(result.content.meta).toHaveProperty('keywords', 'test, keywords');
      expect(result.content).toHaveProperty('headings');
      expect(result.content.headings).toHaveProperty('h1');
      expect(result.content.headings).toHaveProperty('h2');
      expect(result.content).toHaveProperty('paragraphs');
      expect(result.content).toHaveProperty('links');
      expect(result.content).toHaveProperty('images');
      expect(result.format).toBe('structured');
    });

    it('should handle network errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(crawlerService.crawlUrl('https://example.com')).rejects.toThrow('Failed to crawl URL: Network error');
    });

    it('should handle invalid URLs', async () => {
      await expect(crawlerService.crawlUrl('invalid-url')).rejects.toThrow('Invalid URL format');
    });

    it('should handle timeout errors', async () => {
      axios.get.mockRejectedValue(new Error('timeout of 30000ms exceeded'));

      await expect(crawlerService.crawlUrl('https://example.com')).rejects.toThrow('Failed to crawl URL: timeout of 30000ms exceeded');
    });

    it('should use correct headers', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      await crawlerService.crawlUrl('https://example.com');

      expect(axios.get).toHaveBeenCalledWith('https://example.com', {
        headers: {
          'User-Agent': 'AdChain-Crawler/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 30000,
        maxRedirects: 5
      });
    });
  });

  describe('crawlMultipleUrls', () => {
    const mockHtmlContent = '<html><body>Test content</body></html>';

    it('should crawl multiple URLs successfully', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      const urls = ['https://example1.com', 'https://example2.com'];
      const result = await crawlerService.crawlMultipleUrls(urls, 'raw');

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('errors');
      expect(Object.keys(result.results)).toHaveLength(2);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(result.results['https://example1.com']).toBeDefined();
      expect(result.results['https://example2.com']).toBeDefined();
    });

    it('should handle mixed success and failure', async () => {
      axios.get
        .mockResolvedValueOnce({ data: mockHtmlContent })
        .mockRejectedValueOnce(new Error('Network error'));

      const urls = ['https://example1.com', 'https://example2.com'];
      const result = await crawlerService.crawlMultipleUrls(urls, 'raw');

      expect(Object.keys(result.results)).toHaveLength(1);
      expect(Object.keys(result.errors)).toHaveLength(1);
      expect(result.results['https://example1.com']).toBeDefined();
      expect(result.errors['https://example2.com']).toBe('Failed to crawl URL: Network error');
    });

    it('should handle all failures', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const urls = ['https://example1.com', 'https://example2.com'];
      const result = await crawlerService.crawlMultipleUrls(urls, 'raw');

      expect(Object.keys(result.results)).toHaveLength(0);
      expect(Object.keys(result.errors)).toHaveLength(2);
    });
  });

  describe('extractSummary', () => {
    it('should extract summary from HTML', () => {
      const html = `
        <html>
          <head>
            <title>Test Title</title>
            <meta name="description" content="Test description">
          </head>
          <body>
            <p>This is the first paragraph with some content.</p>
            <p>This is the second paragraph.</p>
            <script>alert('test');</script>
            <style>body { color: red; }</style>
          </body>
        </html>
      `;

      const summary = crawlerService.extractSummary(html);

      expect(summary).toHaveProperty('title', 'Test Title');
      expect(summary).toHaveProperty('metaDescription', 'Test description');
      expect(summary).toHaveProperty('summary');
      expect(summary).toHaveProperty('wordCount');
      expect(summary.summary).toContain('This is the first paragraph');
      expect(summary.summary).not.toContain('alert');
      expect(summary.summary).not.toContain('color: red');
    });

    it('should handle empty HTML', () => {
      const summary = crawlerService.extractSummary('');

      expect(summary).toHaveProperty('title', '');
      expect(summary).toHaveProperty('metaDescription', '');
      expect(summary).toHaveProperty('summary');
      expect(summary).toHaveProperty('wordCount');
    });
  });

  describe('extractStructured', () => {
    it('should extract structured data from HTML', () => {
      const html = `
        <html>
          <head>
            <title>Test Title</title>
            <meta name="description" content="Test description">
            <meta name="keywords" content="test, keywords">
            <meta name="author" content="Test Author">
          </head>
          <body>
            <h1>Main Title</h1>
            <h2>Subtitle 1</h2>
            <h2>Subtitle 2</h2>
            <h3>Sub-subtitle</h3>
            <p>First paragraph</p>
            <p>Second paragraph</p>
            <a href="/link1">Link 1</a>
            <a href="/link2">Link 2</a>
            <img src="/image1.jpg" alt="Image 1">
            <img src="/image2.jpg" alt="Image 2">
            <script>alert('test');</script>
            <style>body { color: red; }</style>
          </body>
        </html>
      `;

      const structured = crawlerService.extractStructured(html);

      expect(structured).toHaveProperty('title', 'Test Title');
      expect(structured).toHaveProperty('meta');
      expect(structured.meta).toHaveProperty('description', 'Test description');
      expect(structured.meta).toHaveProperty('keywords', 'test, keywords');
      expect(structured.meta).toHaveProperty('author', 'Test Author');
      
      expect(structured).toHaveProperty('headings');
      expect(structured.headings.h1).toEqual(['Main Title']);
      expect(structured.headings.h2).toEqual(['Subtitle 1', 'Subtitle 2']);
      expect(structured.headings.h3).toEqual(['Sub-subtitle']);
      
      expect(structured).toHaveProperty('paragraphs');
      expect(structured.paragraphs).toEqual(['First paragraph', 'Second paragraph']);
      
      expect(structured).toHaveProperty('links');
      expect(structured.links).toHaveLength(2);
      expect(structured.links[0]).toEqual({ text: 'Link 1', href: '/link1' });
      
      expect(structured).toHaveProperty('images');
      expect(structured.images).toHaveLength(2);
      expect(structured.images[0]).toEqual({ src: '/image1.jpg', alt: 'Image 1' });
    });

    it('should handle malformed HTML', () => {
      const html = '<html><body><p>Unclosed paragraph</body></html>';

      const structured = crawlerService.extractStructured(html);

      expect(structured).toHaveProperty('title');
      expect(structured).toHaveProperty('meta');
      expect(structured).toHaveProperty('headings');
      expect(structured).toHaveProperty('paragraphs');
      expect(structured).toHaveProperty('links');
      expect(structured).toHaveProperty('images');
    });
  });
});
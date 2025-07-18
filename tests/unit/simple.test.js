describe('Simple Test', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test string operations', () => {
    const str = 'AdChain';
    expect(str).toBe('AdChain');
    expect(str.length).toBe(7);
  });

  it('should test async operations', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('success'), 10);
    });
    
    const result = await promise;
    expect(result).toBe('success');
  });
});
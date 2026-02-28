describe('Basic Tests', () => {
  test('should pass basic math', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle strings', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });
});

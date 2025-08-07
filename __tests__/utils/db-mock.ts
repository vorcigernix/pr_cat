// Test utilities for mocking database operations
export const mockQuery = jest.fn();
export const mockExecute = jest.fn();
export const mockTransaction = jest.fn();
export const mockGetDbClient = jest.fn();
export const mockCheckDbHealth = jest.fn();

// Helper to reset all mocks
export function resetDbMocks() {
  mockQuery.mockReset();
  mockExecute.mockReset();
  mockTransaction.mockReset();
  mockGetDbClient.mockReset();
  mockCheckDbHealth.mockReset();
}

// Export mockExecute separately for convenience
export { mockExecute };

// Helper to setup common mock responses
export function setupDbMocks() {
  mockQuery.mockResolvedValue([]);
  mockExecute.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
  mockTransaction.mockImplementation(async (callback) => {
    const txClient = {
      query: mockQuery,
      execute: mockExecute,
    };
    return callback(txClient);
  });
  mockGetDbClient.mockReturnValue({
    execute: jest.fn(),
  });
  mockCheckDbHealth.mockResolvedValue(true);
}
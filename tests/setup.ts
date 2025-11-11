import { afterEach, beforeEach, vi } from 'vitest'

// Mock the CruziDao module
vi.mock('../src/daos/CruziDao', () => ({
  default: vi.fn().mockImplementation(() => ({
    addClueToCollection: vi.fn(),
    removeClueFromCollection: vi.fn(),
    addOrUpdateEntries: vi.fn(),
    addOrUpdateSense: vi.fn(),
    selectCollectionBatch: vi.fn(),
    populateCollectionBatch: vi.fn(),
    initializeUserCollectionProgress: vi.fn(),
    getCollectionList: vi.fn(),
    getCrosswordList: vi.fn(),
    reopenCollection: vi.fn(),
    submitUserResponse: vi.fn(),
  }))
}))

// Mock the postgres module
vi.mock('../src/daos/postgres', () => ({
  sqlQuery: vi.fn()
}))

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalConsoleError
})

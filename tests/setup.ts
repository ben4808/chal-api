import { afterEach, beforeEach, vi } from 'vitest'

vi.mock('cruzi-db', () => ({
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
  })),
  sqlQuery: vi.fn(),
}))

const originalConsoleError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalConsoleError
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// Mock the CruziDao module
vi.mock('../src/daos/CruziDao', () => {
  const mockInstance = {
    addOrUpdateEntries: vi.fn(),
    addOrUpdateSense: vi.fn(),
    addClueToCollection: vi.fn()
  }
  return {
    default: vi.fn(() => mockInstance)
  }
})

// Mock the utils functions
vi.mock('../src/lib/utils', () => ({
  convertObjectToMap: vi.fn((obj) => new Map(Object.entries(obj || {}))),
  displayTextToEntry: vi.fn((text) => ({ entry: text, lang: 'en', displayText: text })),
  generateId: vi.fn(() => 'generated-id-123'),
  mapKeys: vi.fn((map) => Array.from(map.keys()))
}))

// Import after mocking
import { addCluesToCollection } from '../src/handlers/addCluesToCollection'
import CruziDao from '../src/daos/CruziDao'

describe('addCluesToCollection', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockJson: any
  let mockStatus: any

  beforeEach(() => {
    mockJson = vi.fn()
    mockStatus = vi.fn().mockReturnValue({ json: mockJson })
    mockRes = {
      status: mockStatus,
      json: mockJson
    }
    // Reset all mocks to ensure clean state between tests
    vi.clearAllMocks()
  })

  // Helper function to create fresh mock instances
  const createMockDao = () => {
    const mockDao = new CruziDao()
    vi.mocked(mockDao.addOrUpdateEntries).mockResolvedValue(undefined)
    vi.mocked(mockDao.addOrUpdateSense).mockResolvedValue(undefined)
    vi.mocked(mockDao.addClueToCollection).mockResolvedValue(undefined)
    return mockDao
  }

  it('should add clues to collection successfully with basic clue data', async () => {
    const mockDao = createMockDao()
    
    const clues = [
      {
        entry: {
          entry: 'test',
          lang: 'en',
          rootEntry: 'test',
          displayText: 'test',
          entryType: 'word'
        }
      }
    ]
    
    mockReq = {
      query: { id: 'collection-123' },
      body: clues
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockDao.addOrUpdateEntries).toHaveBeenCalledWith([{
      entry: 'test',
      lang: 'en',
      rootEntry: 'test',
      displayText: 'test',
      entryType: 'word'
    }])
    expect(mockDao.addClueToCollection).toHaveBeenCalledWith('collection-123', {})
  })

  it('should add clues with senses successfully', async () => {
    const mockDao = createMockDao()
    
    const clues = [
      {
        entry: {
          entry: 'test',
          lang: 'en',
          rootEntry: 'test',
          displayText: 'test',
          entryType: 'word'
        },
        senses: [
          {
            partOfSpeech: 'noun',
            commonness: 5,
            summary: { en: 'A test item' },
            definition: { en: 'Something used for testing' },
            exampleSentences: [
              { en: 'This is a test sentence' }
            ],
            translations: {
              es: {
                naturalTranslations: ['prueba'],
                colloquialTranslations: ['test'],
                alternatives: ['ensayo']
              }
            },
            sourceAi: 'test-ai'
          }
        ]
      }
    ]
    
    mockReq = {
      query: { id: 'collection-123' },
      body: clues
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockDao.addOrUpdateEntries).toHaveBeenCalled()
    expect(mockDao.addOrUpdateSense).toHaveBeenCalled()
    expect(mockDao.addClueToCollection).toHaveBeenCalledWith('collection-123', {})
  })

  it('should add clues with custom clue data successfully', async () => {
    const mockDao = createMockDao()
    
    const clues = [
      {
        entry: {
          entry: 'test',
          lang: 'en',
          rootEntry: 'test',
          displayText: 'test',
          entryType: 'word'
        },
        clue: {
          senseId: 'sense-123',
          customClue: 'A custom clue text',
          customDisplayText: 'Custom Display',
          source: 'custom-source',
          translatedClues: { es: 'pista personalizada' }
        }
      }
    ]
    
    mockReq = {
      query: { id: 'collection-123' },
      body: clues
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockDao.addOrUpdateEntries).toHaveBeenCalled()
    expect(mockDao.addClueToCollection).toHaveBeenCalledWith('collection-123', {
      id: 'generated-id-123',
      entry: {
        entry: 'test',
        lang: 'en'
      },
      customClue: {
        customClue: 'A custom clue text',
        customDisplayText: 'Custom Display',
        senseId: 'sense-123',
        source: 'custom-source',
        translatedClues: { es: 'pista personalizada' }
      },
      customDisplayText: 'Custom Display',
      senseId: 'sense-123',
      source: 'custom-source',
      translatedClues: { es: 'pista personalizada' }
    })
  })

  it('should return 400 when collectionId is missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      query: {}, // Empty query object, no id
      body: [
        {
          entry: {
            entry: 'test',
            lang: 'en',
            rootEntry: 'test',
            displayText: 'test',
            entryType: 'word'
          }
        }
      ]
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and clue data are required." 
    })
    // The DAO methods should not be called because validation fails before reaching them
    expect(mockDao.addOrUpdateEntries).not.toHaveBeenCalled()
  })

  it('should return 400 when clues are missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      query: { id: 'collection-123' }
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and clue data are required." 
    })
    expect(mockDao.addOrUpdateEntries).not.toHaveBeenCalled()
  })

  it('should return 400 when clues is not an array', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      query: { id: 'collection-123' },
      body: { entry: 'test' } // Not an array
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and clue data are required." 
    })
    expect(mockDao.addOrUpdateEntries).not.toHaveBeenCalled()
  })

  it('should return 400 when clues array is empty', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      query: { id: 'collection-123' },
      body: []
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and clue data are required." 
    })
    expect(mockDao.addOrUpdateEntries).not.toHaveBeenCalled()
  })

  it('should handle multiple clues successfully', async () => {
    const mockDao = createMockDao()
    
    const clues = [
      {
        entry: {
          entry: 'test1',
          lang: 'en',
          rootEntry: 'test1',
          displayText: 'test1',
          entryType: 'word'
        }
      },
      {
        entry: {
          entry: 'test2',
          lang: 'en',
          rootEntry: 'test2',
          displayText: 'test2',
          entryType: 'word'
        }
      }
    ]
    
    mockReq = {
      query: { id: 'collection-123' },
      body: clues
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockDao.addOrUpdateEntries).toHaveBeenCalledTimes(2)
    expect(mockDao.addClueToCollection).toHaveBeenCalledTimes(2)
  })

  it('should handle DAO errors gracefully', async () => {
    const error = new Error('Database connection failed')
    const mockDao = createMockDao()
    vi.mocked(mockDao.addOrUpdateEntries).mockRejectedValue(error)
    
    const clues = [
      {
        entry: {
          entry: 'test',
          lang: 'en',
          rootEntry: 'test',
          displayText: 'test',
          entryType: 'word'
        }
      }
    ]
    
    mockReq = {
      query: { id: 'collection-123' },
      body: clues
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "An error occurred while adding/updating the clue." 
    })
  })

  it('should handle sense processing errors gracefully', async () => {
    const error = new Error('Sense processing failed')
    const mockDao = createMockDao()
    vi.mocked(mockDao.addOrUpdateSense).mockRejectedValue(error)
    
    const clues = [
      {
        entry: {
          entry: 'test',
          lang: 'en',
          rootEntry: 'test',
          displayText: 'test',
          entryType: 'word'
        },
        senses: [
          {
            partOfSpeech: 'noun',
            commonness: 5,
            summary: { en: 'A test item' },
            definition: { en: 'Something used for testing' },
            exampleSentences: [],
            translations: {},
            sourceAi: 'test-ai'
          }
        ]
      }
    ]
    
    mockReq = {
      query: { id: 'collection-123' },
      body: clues
    }

    await addCluesToCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "An error occurred while adding/updating the clue." 
    })
  })
})

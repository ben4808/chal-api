import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// Mock the CruziDao module
vi.mock('../src/daos/CruziDao', () => {
  const mockInstance = {
    getCollectionList: vi.fn()
  }
  return {
    default: vi.fn(() => mockInstance)
  }
})

// Import after mocking
import { getCollectionList } from '../src/handlers/getCollectionList'
import CruziDao from '../src/daos/CruziDao'

describe('getCollectionList', () => {
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
    vi.clearAllMocks()
  })

  it('should return collection list successfully for authenticated user', async () => {
    const mockCollections = [
      { 
        id: '1', 
        name: 'Test Collection', 
        puzzle: { id: 'puzzle-1' },
        clues: [{ id: 'clue-1' }],
        creator: { id: 'user-1' },
        progressData: { completed: 5, total: 10 }
      },
      { 
        id: '2', 
        name: 'Another Collection', 
        puzzle: { id: 'puzzle-2' },
        clues: [{ id: 'clue-2' }],
        creator: { id: 'user-2' },
        progressData: { completed: 3, total: 8 }
      }
    ]
    const mockDao = new CruziDao()
    vi.mocked(mockDao.getCollectionList).mockResolvedValue(mockCollections as any)
    
    mockReq = {
      userId: 'user-123'
    } as any

    await getCollectionList(mockReq as Request, mockRes as Response)

    expect(mockDao.getCollectionList).toHaveBeenCalledWith('user-123')
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    
    // Check that puzzle and clues are set to null
    const expectedResponse = mockCollections.map(c => ({
      ...c,
      puzzle: null,
      clues: null,
    }))
    expect(mockJson).toHaveBeenCalledWith(expectedResponse)
  })

  it('should return collection list for unauthenticated user', async () => {
    const mockCollections = [
      { 
        id: '1', 
        name: 'Public Collection', 
        puzzle: null,
        clues: null,
        creator: { id: 'user-1' },
        progressData: null
      }
    ]
    const mockDao = new CruziDao()
    vi.mocked(mockDao.getCollectionList).mockResolvedValue(mockCollections as any)
    
    mockReq = {}

    await getCollectionList(mockReq as Request, mockRes as Response)

    expect(mockDao.getCollectionList).toHaveBeenCalledWith(undefined)
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith(mockCollections)
  })

  it('should handle empty collection list', async () => {
    const mockDao = new CruziDao()
    vi.mocked(mockDao.getCollectionList).mockResolvedValue([])
    
    mockReq = {
      userId: 'user-123'
    } as any

    await getCollectionList(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith([])
  })

  it('should handle DAO errors gracefully', async () => {
    const error = new Error('Database connection failed')
    const mockDao = new CruziDao()
    vi.mocked(mockDao.getCollectionList).mockRejectedValue(error)
    
    mockReq = {
      userId: 'user-123'
    } as any

    await getCollectionList(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "An error occurred while retrieving the crossword list." 
    })
  })
})

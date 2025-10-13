import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// Mock the CruziDao module
vi.mock('../src/daos/CruziDao', () => {
  const mockInstance = {
    removeClueFromCollection: vi.fn()
  }
  return {
    default: vi.fn(() => mockInstance)
  }
})

// Import after mocking
import { removeClueFromCollection } from '../src/handlers/removeClueFromCollection'
import CruziDao from '../src/daos/CruziDao'

describe('removeClueFromCollection', () => {
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

  // Helper function to create fresh mock instances
  const createMockDao = () => {
    const mockDao = new CruziDao()
    vi.mocked(mockDao.removeClueFromCollection).mockResolvedValue(undefined)
    return mockDao
  }

  it('should remove clue from collection successfully', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {
        collectionId: 'collection-123',
        clueId: 'clue-456'
      }
    }

    await removeClueFromCollection(mockReq as Request, mockRes as Response)

    expect(mockDao.removeClueFromCollection).toHaveBeenCalledWith('collection-123', 'clue-456')
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Clue removed from collection successfully." 
    })
  })

  it('should return 400 when collectionId is missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {
        clueId: 'clue-456'
      }
    }

    await removeClueFromCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and Clue ID are required." 
    })
    expect(mockDao.removeClueFromCollection).not.toHaveBeenCalled()
  })

  it('should return 400 when clueId is missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {
        collectionId: 'collection-123'
      }
    }

    await removeClueFromCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and Clue ID are required." 
    })
    expect(mockDao.removeClueFromCollection).not.toHaveBeenCalled()
  })

  it('should return 400 when both collectionId and clueId are missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {}
    }

    await removeClueFromCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and Clue ID are required." 
    })
    expect(mockDao.removeClueFromCollection).not.toHaveBeenCalled()
  })

  it('should return 400 when collectionId is empty string', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {
        collectionId: '',
        clueId: 'clue-456'
      }
    }

    await removeClueFromCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and Clue ID are required." 
    })
    expect(mockDao.removeClueFromCollection).not.toHaveBeenCalled()
  })

  it('should return 400 when clueId is empty string', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {
        collectionId: 'collection-123',
        clueId: ''
      }
    }

    await removeClueFromCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "Collection ID and Clue ID are required." 
    })
    expect(mockDao.removeClueFromCollection).not.toHaveBeenCalled()
  })

  it('should handle DAO errors gracefully', async () => {
    const error = new Error('Database connection failed')
    const mockDao = createMockDao()
    vi.mocked(mockDao.removeClueFromCollection).mockRejectedValue(error)
    
    mockReq = {
      body: {
        collectionId: 'collection-123',
        clueId: 'clue-456'
      }
    }

    await removeClueFromCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "An error occurred while removing the clue from the collection." 
    })
  })
})

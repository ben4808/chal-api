import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// Mock the CruziDao module
vi.mock('../src/daos/CruziDao', () => {
  const mockInstance = {
    reopenCollection: vi.fn()
  }
  return {
    default: vi.fn(() => mockInstance)
  }
})

// Import after mocking
import { reopenCollection } from '../src/handlers/reopenCollection'
import CruziDao from '../src/daos/CruziDao'

describe('reopenCollection', () => {
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
    vi.mocked(mockDao.reopenCollection).mockResolvedValue(undefined)
    return mockDao
  }

  it('should reopen collection successfully', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      user: { id: 'user-123' },
      body: {
        collectionId: 'collection-456'
      }
    } as any

    await reopenCollection(mockReq as Request, mockRes as Response)

    expect(mockDao.reopenCollection).toHaveBeenCalledWith('user-123', 'collection-456')
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: 'Collection reopened successfully' 
    })
  })

  it('should return 401 when user is not authenticated', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {
        collectionId: 'collection-456'
      }
    }

    await reopenCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'User not authenticated' 
    })
    expect(mockDao.reopenCollection).not.toHaveBeenCalled()
  })

  it('should return 401 when user object is missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {
        collectionId: 'collection-456'
      }
    }

    await reopenCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'User not authenticated' 
    })
    expect(mockDao.reopenCollection).not.toHaveBeenCalled()
  })

  it('should return 401 when user.id is missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      user: {},
      body: {
        collectionId: 'collection-456'
      }
    } as any

    await reopenCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'User not authenticated' 
    })
    expect(mockDao.reopenCollection).not.toHaveBeenCalled()
  })

  it('should return 400 when collectionId is missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      user: { id: 'user-123' },
      body: {}
    } as any

    await reopenCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'Collection ID is required' 
    })
    expect(mockDao.reopenCollection).not.toHaveBeenCalled()
  })

  it('should return 400 when collectionId is null', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      user: { id: 'user-123' },
      body: {
        collectionId: null
      }
    } as any

    await reopenCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'Collection ID is required' 
    })
    expect(mockDao.reopenCollection).not.toHaveBeenCalled()
  })

  it('should return 400 when collectionId is empty string', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      user: { id: 'user-123' },
      body: {
        collectionId: ''
      }
    } as any

    await reopenCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'Collection ID is required' 
    })
    expect(mockDao.reopenCollection).not.toHaveBeenCalled()
  })

  it('should handle DAO errors gracefully', async () => {
    const error = new Error('Database connection failed')
    const mockDao = createMockDao()
    vi.mocked(mockDao.reopenCollection).mockRejectedValue(error)
    
    mockReq = {
      user: { id: 'user-123' },
      body: {
        collectionId: 'collection-456'
      }
    } as any

    await reopenCollection(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'Failed to reopen collection' 
    })
  })
})

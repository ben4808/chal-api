import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { UserResponse } from '../src/models/UserResponse'

// Mock the CruziDao module
vi.mock('../src/daos/CruziDao', () => {
  const mockInstance = {
    submitUserResponse: vi.fn()
  }
  return {
    default: vi.fn(() => mockInstance)
  }
})

// Import after mocking
import { submitUserResponse } from '../src/handlers/submitUserResponse'
import CruziDao from '../src/daos/CruziDao'

describe('submitUserResponse', () => {
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
    vi.mocked(mockDao.submitUserResponse).mockResolvedValue(undefined)
    return mockDao
  }

  it('should submit user response successfully', async () => {
    const mockDao = createMockDao()
    
    const userResponse: UserResponse = {
      userId: '', // Will be set by the handler
      clueId: 'clue-123',
      collectionId: 'collection-123',
      isCorrect: true
    }
    
    mockReq = {
      userId: 'user-123',
      body: userResponse
    } as any

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockDao.submitUserResponse).toHaveBeenCalledWith('user-123', {
      userId: 'user-123',
      clueId: 'clue-123',
      collectionId: 'collection-123',
      isCorrect: true
    })
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: 'User response submitted successfully' 
    })
  })

  it('should submit incorrect user response successfully', async () => {
    const mockDao = createMockDao()
    
    const userResponse: UserResponse = {
      userId: '',
      clueId: 'clue-456',
      collectionId: 'collection-456',
      isCorrect: false
    }
    
    mockReq = {
      userId: 'user-123',
      body: userResponse
    } as any

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockDao.submitUserResponse).toHaveBeenCalledWith('user-123', {
      userId: 'user-123',
      clueId: 'clue-456',
      collectionId: 'collection-456',
      isCorrect: false
    })
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: 'User response submitted successfully' 
    })
  })

  it('should return 401 when user is not authenticated', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      body: {
        clueId: 'clue-123',
        isCorrect: true
      }
    }

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'User not authenticated' 
    })
    expect(mockDao.submitUserResponse).not.toHaveBeenCalled()
  })

  it('should return 401 when userId is undefined', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      userId: undefined,
      body: {
        clueId: 'clue-123',
        isCorrect: true
      }
    } as any

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'User not authenticated' 
    })
    expect(mockDao.submitUserResponse).not.toHaveBeenCalled()
  })

  it('should return 400 when clueId is missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      userId: 'user-123',
      body: {
        isCorrect: true
      }
    } as any

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Invalid request body. Required fields: clueId (string), collectionId (string), isCorrect (boolean)'
    })
    expect(mockDao.submitUserResponse).not.toHaveBeenCalled()
  })

  it('should return 400 when isCorrect is missing', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      userId: 'user-123',
      body: {
        clueId: 'clue-123'
      }
    } as any

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Invalid request body. Required fields: clueId (string), collectionId (string), isCorrect (boolean)'
    })
    expect(mockDao.submitUserResponse).not.toHaveBeenCalled()
  })

  it('should return 400 when isCorrect is not a boolean', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      userId: 'user-123',
      body: {
        clueId: 'clue-123',
        isCorrect: 'true' // string instead of boolean
      }
    } as any

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Invalid request body. Required fields: clueId (string), collectionId (string), isCorrect (boolean)'
    })
    expect(mockDao.submitUserResponse).not.toHaveBeenCalled()
  })

  it('should return 400 when clueId is empty string', async () => {
    const mockDao = createMockDao()
    
    mockReq = {
      userId: 'user-123',
      body: {
        clueId: '',
        isCorrect: true
      }
    } as any

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Invalid request body. Required fields: clueId (string), collectionId (string), isCorrect (boolean)'
    })
    expect(mockDao.submitUserResponse).not.toHaveBeenCalled()
  })

  it('should handle DAO errors gracefully', async () => {
    const error = new Error('Database connection failed')
    const mockDao = createMockDao()
    vi.mocked(mockDao.submitUserResponse).mockRejectedValue(error)
    
    const userResponse: UserResponse = {
      userId: '',
      clueId: 'clue-123',
      collectionId: 'collection-123',
      isCorrect: true
    }
    
    mockReq = {
      userId: 'user-123',
      body: userResponse
    } as any

    await submitUserResponse(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(mockJson).toHaveBeenCalledWith({ 
      error: 'Internal server error' 
    })
  })
})

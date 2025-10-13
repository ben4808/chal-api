import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// Mock the CruziDao module
vi.mock('../src/daos/CruziDao', () => {
  const mockInstance = {
    getCollectionBatch: vi.fn()
  }
  return {
    default: vi.fn(() => mockInstance)
  }
})

// Import after mocking
import { getCollectionBatch } from '../src/handlers/getCollectionBatch'
import CruziDao from '../src/daos/CruziDao'

describe('getCollectionBatch', () => {
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

  it('should return collection batch successfully', async () => {
    const mockBatch = [
      { id: '1', entry: { entry: 'test', lang: 'en' } },
      { id: '2', entry: { entry: 'example', lang: 'en' } }
    ]
    const mockDao = new CruziDao()
    vi.mocked(mockDao.getCollectionBatch).mockResolvedValue(mockBatch)
    
    mockReq = {
      query: { id: 'collection-123' },
      userId: 'user-123'
    } as any

    await getCollectionBatch(mockReq as Request, mockRes as Response)

    expect(mockDao.getCollectionBatch).toHaveBeenCalledWith('user-123', 'collection-123')
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith(mockBatch)
  })

  it('should handle request without userId', async () => {
    const mockBatch = [{ id: '1', entry: { entry: 'test', lang: 'en' } }]
    const mockDao = new CruziDao()
    vi.mocked(mockDao.getCollectionBatch).mockResolvedValue(mockBatch)
    
    mockReq = {
      query: { id: 'collection-123' }
    }

    await getCollectionBatch(mockReq as Request, mockRes as Response)

    expect(mockDao.getCollectionBatch).toHaveBeenCalledWith(undefined, 'collection-123')
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith(mockBatch)
  })

  it('should handle DAO errors gracefully', async () => {
    const error = new Error('Database connection failed')
    const mockDao = new CruziDao()
    vi.mocked(mockDao.getCollectionBatch).mockRejectedValue(error)
    
    mockReq = {
      query: { id: 'collection-123' },
      userId: 'user-123'
    } as any

    await getCollectionBatch(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(mockJson).toHaveBeenCalledWith({ 
      message: "An error occurred while retrieving the collection batch." 
    })
  })
})

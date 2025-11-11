import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// Mock the CruziDao module
vi.mock('../src/daos/CruziDao', () => {
  const mockInstance = {
    selectCollectionBatch: vi.fn(),
    populateCollectionBatch: vi.fn(),
    initializeUserCollectionProgress: vi.fn()
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
    const mockClueIds = ['clue-1', 'clue-2']
    const mockBatch = [
      { id: 'clue-1', entry: { entry: 'test', lang: 'en' } },
      { id: 'clue-2', entry: { entry: 'example', lang: 'en' } }
    ]
    const mockDao = new CruziDao()
    vi.mocked(mockDao.selectCollectionBatch).mockResolvedValue(mockClueIds)
    vi.mocked(mockDao.populateCollectionBatch).mockResolvedValue(mockBatch)
    vi.mocked(mockDao.initializeUserCollectionProgress).mockResolvedValue()

    mockReq = {
      query: { collection_id: 'collection-123' },
      userId: 'user-123'
    } as any

    await getCollectionBatch(mockReq as Request, mockRes as Response)

    expect(mockDao.initializeUserCollectionProgress).toHaveBeenCalledWith('user-123', 'collection-123')
    expect(mockDao.selectCollectionBatch).toHaveBeenCalledWith('user-123', 'collection-123')
    expect(mockDao.populateCollectionBatch).toHaveBeenCalledWith(mockClueIds, 'user-123')
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith(mockBatch)
  })

  it('should handle request without userId', async () => {
    const mockClueIds = ['clue-1']
    const mockBatch = [{ id: 'clue-1', entry: { entry: 'test', lang: 'en' } }]
    const mockDao = new CruziDao()
    vi.mocked(mockDao.selectCollectionBatch).mockResolvedValue(mockClueIds)
    vi.mocked(mockDao.populateCollectionBatch).mockResolvedValue(mockBatch)

    mockReq = {
      query: { collection_id: 'collection-123' }
    }

    await getCollectionBatch(mockReq as Request, mockRes as Response)

    expect(mockDao.selectCollectionBatch).toHaveBeenCalledWith(undefined, 'collection-123')
    expect(mockDao.populateCollectionBatch).toHaveBeenCalledWith(mockClueIds, undefined)
    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockJson).toHaveBeenCalledWith(mockBatch)
  })

  it('should handle DAO errors gracefully', async () => {
    const error = new Error('Database connection failed')
    const mockDao = new CruziDao()
    vi.mocked(mockDao.selectCollectionBatch).mockRejectedValue(error)

    mockReq = {
      query: { collection_id: 'collection-123' },
      userId: 'user-123'
    } as any

    await getCollectionBatch(mockReq as Request, mockRes as Response)

    expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(mockJson).toHaveBeenCalledWith({
      message: "An error occurred while retrieving the collection batch."
    })
  })
})

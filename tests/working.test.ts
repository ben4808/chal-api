import { describe, it, expect, vi } from 'vitest'

// Mock the CruziDao module with a simple approach
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
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import CruziDao from '../src/daos/CruziDao'

describe('Working Test', () => {
  it('should work', () => {
    expect(true).toBe(true)
  })

  it('should test getCollectionBatch', async () => {
    const mockBatch = [{ id: '1', entry: { entry: 'test', lang: 'en' } }]
    
    // Create a new instance to get the mock
    const mockDao = new CruziDao()
    vi.mocked(mockDao.getCollectionBatch).mockResolvedValue(mockBatch)
    
    const mockReq = {
      query: { id: 'collection-123' },
      userId: 'user-123'
    } as any

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any

    await getCollectionBatch(mockReq, mockRes)

    expect(mockDao.getCollectionBatch).toHaveBeenCalledWith('user-123', 'collection-123')
    expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockRes.json).toHaveBeenCalledWith(mockBatch)
  })
})

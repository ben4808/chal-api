import { Router } from 'express';
import { getCrosswordList } from '../handlers/getCrosswordList';
import { getCrossword } from '../handlers/getCrossword';
import { getCollectionList } from '../handlers/getCollectionList';
import { authenticateOptional, requireAuth } from '../middleware/auth';
import { getCollectionBatch } from '../handlers/getCollectionBatch';
import { getCollectionClues } from '../handlers/getCollectionClues';
import { submitUserResponse } from '../handlers/submitUserResponse';
import { removeClueFromCollection } from '../handlers/removeClueFromCollection';
import { addCluesToCollection } from '../handlers/addCluesToCollection';
import { reopenCollection } from '../handlers/reopenCollection';
import { handleGoogleAuth } from '../handlers/handleGoogleAuth';
import { verifyAuth } from '../handlers/verifyAuth';

const apiRouter = Router();

// Authentication routes
apiRouter.post('/auth/google', handleGoogleAuth);
apiRouter.get('/auth/verify', verifyAuth);

//apiRouter.get('/getCrosswordList', getCrosswordList);
apiRouter.get('/getCollectionList', authenticateOptional, getCollectionList);
//apiRouter.get('/getCrossword', getCrossword);
apiRouter.get('/getCollectionBatch', authenticateOptional, getCollectionBatch);
apiRouter.get('/getCollectionClues', authenticateOptional, getCollectionClues);
apiRouter.post('/submitUserResponse', requireAuth, submitUserResponse);
apiRouter.post('/reopenCollection', requireAuth, reopenCollection);
//apiRouter.get('/getClue', getClue);
//apiRouter.get('/getEntry', getEntry);
//apiRouter.get('/generateEntryInfo', generateEntryInfo);
//apiRouter.get('/queryEntries', queryEntries);
//apiRouter.post('/createClue', createClue);
apiRouter.post('/addCluesToCollection', addCluesToCollection);
apiRouter.post('/removeClueFromCollection', removeClueFromCollection);

export default apiRouter;

import { Router } from 'express';
import { getCrosswordList } from '../handlers/getCrosswordList';
import { getCrossword } from '../handlers/getCrossword';
import { getCollectionList } from '../handlers/getCollectionList';
import { getCollectionById } from '../handlers/getCollectionById';
import { authenticateOptional, requireAuth } from '../middleware/auth';
import { getCollectionBatch } from '../handlers/getCollectionBatch';
import { getCollectionClues } from '../handlers/getCollectionClues';
import { submitUserResponse } from '../handlers/submitUserResponse';
import { removeClueFromCollection } from '../handlers/removeClueFromCollection';
import { addCluesToCollection } from '../handlers/addCluesToCollection';
import { reopenCollection } from '../handlers/reopenCollection';
import { handleGoogleAuth } from '../handlers/handleGoogleAuth';
import { verifyAuth } from '../handlers/verifyAuth';
import { upsertEntryInformation } from '../handlers/upsertEntryInformation';
import { updateClueSense } from '../handlers/updateClueSense';
import { makeAICall } from '../handlers/makeAICall';
import { getCrosswordCalendar } from '../handlers/getCrosswordCalendar';
import { submitCrosswordResponse } from '../handlers/submitCrosswordResponse';
import { vpcOnly } from '../middleware/vpcOnly';

const apiRouter = Router();

// Authentication routes
apiRouter.post('/auth/google', handleGoogleAuth);
apiRouter.get('/auth/verify', verifyAuth);

apiRouter.get('/getCrosswordList', authenticateOptional, getCrosswordList);
apiRouter.get('/getCrosswordCalendar', authenticateOptional, getCrosswordCalendar);
apiRouter.get('/getCrossword', authenticateOptional, getCrossword);
apiRouter.post('/submitCrosswordResponse', requireAuth, submitCrosswordResponse);

apiRouter.get('/getCollectionList', authenticateOptional, getCollectionList);
apiRouter.get('/getCollectionById/:id', authenticateOptional, getCollectionById);
apiRouter.get('/getCollectionBatch', authenticateOptional, getCollectionBatch);
apiRouter.get('/getCollectionClues', authenticateOptional, getCollectionClues);
apiRouter.post('/reopenCollection', requireAuth, reopenCollection);
apiRouter.post('/submitUserResponse', requireAuth, submitUserResponse);
//apiRouter.get('/getClue', getClue);
//apiRouter.get('/getEntry', getEntry);
//apiRouter.get('/generateEntryInfo', generateEntryInfo);
//apiRouter.get('/queryEntries', queryEntries);
//apiRouter.post('/createClue', createClue);
apiRouter.post('/addCluesToCollection', addCluesToCollection);
apiRouter.post('/removeClueFromCollection', removeClueFromCollection);
apiRouter.post('/upsertEntryInformation', upsertEntryInformation);
apiRouter.post('/updateClueSense', updateClueSense);

// AI call endpoint - restricted to VPC/localhost only with 2-minute timeout
apiRouter.post('/makeAICall', async (req, res) => {
    // Set timeout to 2 minutes (120 seconds)
    req.setTimeout(120000);
    res.setTimeout(120000);
    await makeAICall(req, res);
});

export default apiRouter;

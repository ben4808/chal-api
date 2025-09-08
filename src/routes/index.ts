import { Router } from 'express';
import { getCrosswordList } from '../handlers/getCrosswordList';
import { getCrossword } from '../handlers/getCrossword';
import { getCollectionList } from '../handlers/getCollectionList';
import { getCollectionBatch } from '../handlers/getCollectionBatch';
import { submitUserResponse } from '../handlers/submitUserResponse';
import { addClueToCollection } from '../handlers/addClueToCollection';
import { removeClueFromCollection } from '../handlers/removeClueFromCollection';

const apiRouter = Router();

//apiRouter.get('/getCrosswordList', getCrosswordList);
apiRouter.get('/getCollectionList', getCollectionList);
//apiRouter.get('/getCrossword', getCrossword);
apiRouter.get('/getCollectionBatch', getCollectionBatch);
apiRouter.post('/submitUserResponse', submitUserResponse);
//apiRouter.get('/getClue', getClue);
//apiRouter.get('/getEntry', getEntry);
//apiRouter.get('/generateEntryInfo', generateEntryInfo);
//apiRouter.get('/queryEntries', queryEntries);
//apiRouter.post('/createClue', createClue);
apiRouter.post('/addClueToCollection', addClueToCollection);
apiRouter.post('/removeClueFromCollection', removeClueFromCollection);

export default apiRouter;

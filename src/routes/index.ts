import { Router } from 'express';
import { getCrosswordList } from '../handlers/getCrosswordList';
import { getCrossword } from '../handlers/getCrossword';
import { getCollectionList } from '../handlers/getCollectionList';

const apiRouter = Router();

apiRouter.get('/getCrosswordList', getCrosswordList);
apiRouter.get('/getCollectionList', getCollectionList);
apiRouter.get('/getCrossword', getCrossword);
//apiRouter.get('/getCollection', getCollection);
//apiRouter.get('/getClue', getClue);
//apiRouter.get('/getEntry', getEntry);
//apiRouter.get('/generateEntryInfo', generateEntryInfo);
//apiRouter.get('/queryEntries', queryEntries);
//apiRouter.post('/createClue', createClue);

export default apiRouter;

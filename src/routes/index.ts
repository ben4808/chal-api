import { Router } from 'express';
import { createChal, createSolve, getChal } from './Handlers';

const apiRouter = Router();

apiRouter.post('/createChal', createChal);
apiRouter.get('/getChal', getChal);
apiRouter.post('/createSolve', createSolve);

export default apiRouter;

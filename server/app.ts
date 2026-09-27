import express from 'express';
import { tradersRouter } from './routes';

export const apiApp = express();

apiApp.use(express.json());
apiApp.use('/api/traders', tradersRouter);

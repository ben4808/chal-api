import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import BaseRouter from './routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:3000", "https://blockquarry.net", "http://localhost:5002", "http://localhost:5173"],
    credentials: true,
}));

// Add APIs
app.use('/api', BaseRouter);

export default app;

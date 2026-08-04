import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import BaseRouter from './routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || origin === "https://blockquarry.net") {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
}));

// Add APIs
app.use('/api', BaseRouter);

export default app;

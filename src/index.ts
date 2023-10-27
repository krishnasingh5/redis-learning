import cors from 'cors';
import Redis from 'redis';
import axios from 'axios';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 6000;
const redisClient = Redis.createClient();
redisClient.connect();
const DEFAULT_TIMER = process.env.DEFAULT_TIMER || 3600;
const corsOpts = {
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'Delete'],
  allowedHeaders: ['*'],
};

app.use(
  bodyParser.urlencoded({
    limit: '50mb',
    parameterLimit: 50000,
    extended: true,
  })
);

app.use(bodyParser.json());
app.use(cors(corsOpts));

app.get('/photos', async (req: Request, res: Response) => {
  const albumId = req.query.albumId;
  const ALBUM_URL = process.env.ALBUM_URL || '';
  const response = await getOrSetCache(
    `photos?albumId=${albumId}`,
    async () => {
      const { data } = await axios.get(ALBUM_URL, { params: { albumId } });
      return data;
    }
  );
  return res.json(response);
});

app.get('/photos/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const ALBUM_URL = process.env.ALBUM_URL || '';
  const response = await getOrSetCache(`photos?id=${id}`, async () => {
    const { data } = await axios.get(ALBUM_URL, { params: { id } });
    return data;
  });
  return res.json(response);
});

function getOrSetCache(key: string, callback: any) {
  return new Promise(async (resolve, reject) => {
    try {
      const dataFromRedis = await redisClient.get(key);
      if (dataFromRedis !== null) {
        return resolve(JSON.parse(dataFromRedis));
      } else {
        const freshData = await callback();
        await redisClient.setEx(
          key,
          parseInt(DEFAULT_TIMER.toString()),
          JSON.stringify(freshData)
        );
        return resolve(freshData);
      }
    } catch (error) {
      return reject(error);
    }
  });
}

app.get('/', (req: Request, res: Response) => {
  return res.json('Welcome to the Redis_Learning Server');
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});

import {format} from "util"
import express from "express"
import Multer from "multer"
import dotenv from "dotenv"
import { encryptFile, decryptFile } from "./encrypt"

dotenv.config()

const {Storage} = require('@google-cloud/storage');

const storage = new Storage()

const app = express();
app.set('view engine', 'pug');

app.use(express.json());

const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
});

const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

app.get('/', (req, res) => {
  res.render('form.pug');
});

app.get('/read/:filename', async(req, res) => {
    const { filename } = req.params;
    
    const file = bucket.file(filename);
    const content = await file.download();
    const decryptedFile = decryptFile(content);

    res.json(decryptedFile)
})

app.post('/upload', multer.single('file'), (req: any, res: any, next) => {
    console.log(req.file)
  if (!req.file) {
    res.status(400).send('No file uploaded.');
    return;
  }

  const encryptedFile = encryptFile(req.file.buffer);

  const blob = bucket.file(req.file.originalname.trim().toLocaleLowerCase().replace(' ', ''));
  const blobStream = blob.createWriteStream();

  blobStream.on('error', (err: any) => {
    next(err);
  });

  blobStream.on('finish', () => {
    const publicUrl = format(
      `https://storage.googleapis.com/${bucket.name}/${blob.name}`
    );
    res.status(200).send(publicUrl);
  });

  blobStream.end(encryptedFile);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadRecording,
  getRecordings,
  getRecordingById,
  deleteRecording,
} from '../controllers/recording.controller';
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware';

const uploadDir = path.join(__dirname, '../../uploads/recordings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    const uniqueName = `recording-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit
});

const router = Router();

router.post('/upload', optionalAuth, upload.single('video'), uploadRecording);
router.get('/', optionalAuth, getRecordings);
router.get('/:id', getRecordingById);
router.delete('/:id', requireAuth, deleteRecording);

export default router;

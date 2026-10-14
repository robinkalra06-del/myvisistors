"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const recording_controller_1 = require("../controllers/recording.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const uploadDir = path_1.default.join(__dirname, '../../uploads/recordings');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '.webm';
        const uniqueName = `recording-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        cb(null, uniqueName);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit
});
const router = (0, express_1.Router)();
router.post('/upload', auth_middleware_1.optionalAuth, upload.single('video'), recording_controller_1.uploadRecording);
router.get('/', auth_middleware_1.optionalAuth, recording_controller_1.getRecordings);
router.get('/:id', recording_controller_1.getRecordingById);
router.delete('/:id', auth_middleware_1.requireAuth, recording_controller_1.deleteRecording);
exports.default = router;

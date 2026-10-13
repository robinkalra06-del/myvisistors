import { Router } from 'express';
import {
  createInstantMeeting,
  scheduleMeeting,
  getMeetingByCode,
  verifyPasscode,
  getMyMeetings,
  updateMeetingSettings,
  endMeeting,
  deleteScheduledMeeting,
  getLiveKitTokenForMeeting,
} from '../controllers/meeting.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/instant', optionalAuth, createInstantMeeting);
router.post('/schedule', requireAuth, scheduleMeeting);
router.get('/my-meetings', requireAuth, getMyMeetings);
router.get('/:code', getMeetingByCode);
router.post('/:code/verify-passcode', verifyPasscode);
router.put('/:code/settings', requireAuth, updateMeetingSettings);
router.post('/:code/end', requireAuth, endMeeting);
router.delete('/:id', requireAuth, deleteScheduledMeeting);
router.get('/:code/livekit-token', optionalAuth, getLiveKitTokenForMeeting);

export default router;

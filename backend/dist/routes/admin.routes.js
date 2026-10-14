"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Protect all admin routes
router.use(auth_middleware_1.requireAuth);
router.use((0, auth_middleware_1.requireRole)(client_1.UserRole.ADMIN));
router.get('/stats', admin_controller_1.getAdminStats);
router.get('/users', admin_controller_1.getAdminUsers);
router.put('/users/:id', admin_controller_1.updateUserStatus);
router.delete('/users/:id', admin_controller_1.deleteUser);
router.get('/meetings/live', admin_controller_1.getLiveMeetings);
router.post('/meetings/:id/terminate', admin_controller_1.terminateMeeting);
router.put('/plans/:id', admin_controller_1.updateSubscriptionPlan);
router.get('/audit-logs', admin_controller_1.getAuditLogs);
exports.default = router;

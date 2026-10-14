"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradePlan = exports.getCurrentSubscription = exports.getPublicPlans = void 0;
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
const getPublicPlans = async (req, res) => {
    try {
        const plans = await prisma_1.prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { priceMonthly: 'asc' },
        });
        const parsed = plans.map((p) => ({
            ...p,
            features: JSON.parse(p.featuresJson || '[]'),
        }));
        res.status(200).json({ plans: parsed });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving plans', error: error.message });
    }
};
exports.getPublicPlans = getPublicPlans;
const getCurrentSubscription = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const sub = await prisma_1.prisma.userSubscription.findFirst({
            where: {
                userId: req.user.userId,
                status: client_1.SubscriptionStatus.ACTIVE,
            },
            include: { plan: true },
        });
        res.status(200).json({
            subscription: sub
                ? {
                    ...sub,
                    plan: {
                        ...sub.plan,
                        features: JSON.parse(sub.plan.featuresJson || '[]'),
                    },
                }
                : null,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving subscription', error: error.message });
    }
};
exports.getCurrentSubscription = getCurrentSubscription;
const upgradePlan = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { planCode } = req.body;
        const targetPlan = await prisma_1.prisma.subscriptionPlan.findUnique({
            where: { code: planCode },
        });
        if (!targetPlan) {
            res.status(404).json({ message: 'Selected plan not found' });
            return;
        }
        // Cancel old subscription
        await prisma_1.prisma.userSubscription.updateMany({
            where: { userId: req.user.userId, status: client_1.SubscriptionStatus.ACTIVE },
            data: { status: client_1.SubscriptionStatus.CANCELED },
        });
        // Create new active subscription
        const newSub = await prisma_1.prisma.userSubscription.create({
            data: {
                userId: req.user.userId,
                planId: targetPlan.id,
                status: client_1.SubscriptionStatus.ACTIVE,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            include: { plan: true },
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'UPGRADE_SUBSCRIPTION',
                resourceType: 'SUBSCRIPTION',
                detailsJson: JSON.stringify({ plan: targetPlan.code }),
            },
        });
        res.status(200).json({
            message: `Successfully upgraded to ${targetPlan.name}!`,
            subscription: {
                ...newSub,
                plan: {
                    ...newSub.plan,
                    features: JSON.parse(newSub.plan.featuresJson || '[]'),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error changing plan', error: error.message });
    }
};
exports.upgradePlan = upgradePlan;

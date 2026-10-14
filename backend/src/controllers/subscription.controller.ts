import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { SubscriptionStatus } from '@prisma/client';

export const getPublicPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    const parsed = plans.map((p) => ({
      ...p,
      features: JSON.parse(p.featuresJson || '[]'),
    }));

    res.status(200).json({ plans: parsed });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving plans', error: error.message });
  }
};

export const getCurrentSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const sub = await prisma.userSubscription.findFirst({
      where: {
        userId: req.user.userId,
        status: SubscriptionStatus.ACTIVE,
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
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving subscription', error: error.message });
  }
};

export const upgradePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { planCode } = req.body;
    const targetPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });

    if (!targetPlan) {
      res.status(404).json({ message: 'Selected plan not found' });
      return;
    }

    // Cancel old subscription
    await prisma.userSubscription.updateMany({
      where: { userId: req.user.userId, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.CANCELED },
    });

    // Create new active subscription
    const newSub = await prisma.userSubscription.create({
      data: {
        userId: req.user.userId,
        planId: targetPlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });

    await prisma.auditLog.create({
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
  } catch (error: any) {
    res.status(500).json({ message: 'Error changing plan', error: error.message });
  }
};

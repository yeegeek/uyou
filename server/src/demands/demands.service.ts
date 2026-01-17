import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDemandDto } from './dto/create-demand.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DemandsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // 需求发布
  // ============================================

  async createDemand(userId: string, createDemandDto: CreateDemandDto) {
    const {
      categoryId,
      serviceMode,
      serviceTime,
      duration,
      location,
      locationLat,
      locationLng,
      budget,
      genderPreference,
      ageMin,
      ageMax,
      description,
    } = createDemandDto;

    // Validate category exists
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException({
        code: 'INVALID_PARAM',
        message: 'Invalid category ID',
      });
    }

    // Calculate expiration time (24 hours from now)
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create demand
    const demand = await this.prisma.demand.create({
      data: {
        userId,
        categoryId,
        serviceMode,
        serviceTime: new Date(serviceTime),
        duration,
        location,
        locationLat: locationLat ? new Decimal(locationLat) : null,
        locationLng: locationLng ? new Decimal(locationLng) : null,
        budget: new Decimal(budget),
        genderPreference: genderPreference || 0,
        ageMin,
        ageMax,
        description,
        status: 0, // pending
        expiredAt,
      },
    });

    // Trigger matching algorithm asynchronously
    // TODO: Use message queue (Bull) to process matching
    this.matchConsultants(demand.id).catch((err) => {
      console.error('Matching error:', err);
    });

    return {
      demandId: demand.id,
      status: demand.status,
      message: '需求已发布，正在为您匹配顾问',
    };
  }

  // ============================================
  // 智能匹配算法
  // ============================================

  async matchConsultants(demandId: string) {
    const demand = await this.prisma.demand.findUnique({
      where: { id: demandId },
      include: {
        user: {
          select: {
            id: true,
            cityId: true,
          },
        },
      },
    });

    if (!demand || demand.status !== 0) {
      return; // Only match pending demands
    }

    // Update status to matching
    await this.prisma.demand.update({
      where: { id: demandId },
      data: { status: 1 }, // matching
    });

    // Find matching consultants
    const consultants = await this.findMatchingConsultants(demand);

    if (consultants.length === 0) {
      // No matching consultants, set back to pending
      await this.prisma.demand.update({
        where: { id: demandId },
        data: { status: 0 }, // pending
      });
      return;
    }

    // Calculate matching scores
    const scoredConsultants = consultants.map((consultant) => {
      const score = this.calculateMatchingScore(consultant, demand);
      return { consultant, score };
    });

    // Sort by score and take top 10
    scoredConsultants.sort((a, b) => b.score.totalScore - a.score.totalScore);
    const top10 = scoredConsultants.slice(0, 10);

    // Lock demand for 60 seconds
    const lockedUntil = new Date(Date.now() + 60 * 1000);
    await this.prisma.demand.update({
      where: { id: demandId },
      data: {
        status: 2, // locked
      },
    });

    // Create demand locks for top 10 consultants
    for (const item of top10) {
      await this.prisma.demandLock.create({
        data: {
          demandId,
          consultantId: item.consultant.id,
          status: 0, // locked
          expiredAt: lockedUntil,
        },
      });
    }

    // TODO: Push notifications to top 10 consultants

    // Schedule lock timeout check
    setTimeout(() => {
      this.checkLockTimeout(demandId).catch(console.error);
    }, 60000);

    return top10;
  }

  private async findMatchingConsultants(demand: any) {
    // Find consultants in the same city with matching service
    const consultants = await this.prisma.consultant.findMany({
      where: {
        status: 1, // Approved
        creditScore: { gte: 60 },
        user: {
          status: 1,
          cityId: demand.user.cityId,
        },
        services: {
          some: {
            categoryId: demand.categoryId,
            serviceMode: demand.serviceMode,
            isActive: true,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            gender: true,
            birthday: true,
            cityId: true,
          },
        },
        services: {
          where: {
            categoryId: demand.categoryId,
            serviceMode: demand.serviceMode,
            isActive: true,
          },
        },
      },
    });

    // Filter out blocked users
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { userId: demand.userId },
          { blockedId: demand.userId },
        ],
      },
    });
    const blockedIds = new Set([
      ...blocks.map((b) => b.blockedId),
      ...blocks.map((b) => b.userId),
    ]);

    // Filter consultants
    return consultants.filter((consultant) => {
      // Not blocked
      if (blockedIds.has(consultant.userId)) return false;

      // Gender preference
      if (demand.genderPreference && demand.genderPreference !== consultant.user.gender) {
        return false;
      }

      // Age preference
      if (consultant.user.birthday) {
        const age = this.calculateAge(consultant.user.birthday);
        if (demand.ageMin && age < demand.ageMin) return false;
        if (demand.ageMax && age > demand.ageMax) return false;
      }

      // Check if consultant has conflicting orders at the same time
      // TODO: Implement time conflict check

      return true;
    });
  }

  /**
   * Calculate matching score
   * Formula: Total = Distance×40% + Rating×30% + Preference×20% + Activity×10%
   */
  private calculateMatchingScore(consultant: any, demand: any) {
    // Distance score (0-100)
    let distanceScore = 50; // Default
    if (demand.locationLat && demand.locationLng) {
      // TODO: Calculate actual distance using PostGIS
      const distance = Math.random() * 10; // Placeholder
      distanceScore = Math.max(0, 100 - distance * 10);
    }

    // Rating score (0-100)
    const rating = parseFloat(consultant.rating.toString());
    const ratingScore = (rating / 5.0) * 100;

    // Preference score (0-100)
    let preferenceScore = 60; // Base score for category match
    if (demand.genderPreference && demand.genderPreference === consultant.user.gender) {
      preferenceScore += 20;
    }
    if (consultant.user.birthday) {
      const age = this.calculateAge(consultant.user.birthday);
      if ((!demand.ageMin || age >= demand.ageMin) && (!demand.ageMax || age <= demand.ageMax)) {
        preferenceScore += 20;
      }
    }
    preferenceScore = Math.min(100, preferenceScore);

    // Activity score (0-100)
    let activityScore = 0;
    if (consultant.onlineStatus === 1) {
      activityScore += 50; // Online
    }
    if (consultant.lastOnlineAt) {
      const daysSinceOnline = Math.floor(
        (Date.now() - new Date(consultant.lastOnlineAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceOnline === 0) {
        activityScore += 20; // Active today
      }
      if (daysSinceOnline <= 7) {
        activityScore += 30; // Active in last 7 days
      }
    }
    activityScore = Math.min(100, activityScore);

    // Calculate total score
    const totalScore =
      distanceScore * 0.4 + ratingScore * 0.3 + preferenceScore * 0.2 + activityScore * 0.1;

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      distanceScore: Math.round(distanceScore * 100) / 100,
      ratingScore: Math.round(ratingScore * 100) / 100,
      preferenceScore: Math.round(preferenceScore * 100) / 100,
      activityScore: Math.round(activityScore * 100) / 100,
    };
  }

  private async checkLockTimeout(demandId: string) {
    const demand = await this.prisma.demand.findUnique({
      where: { id: demandId },
    });

    if (!demand || demand.status !== 2) {
      return; // Not locked anymore
    }

    // Check if any consultant has applied
    const applications = await this.prisma.demandApplication.findMany({
      where: { demandId },
    });

    if (applications.length === 0) {
      // No applications, release to hall
      await this.prisma.demand.update({
        where: { id: demandId },
        data: { status: 0 }, // pending
      });

      // Update lock status to timeout
      await this.prisma.demandLock.updateMany({
        where: { demandId, status: 0 },
        data: { status: 2 }, // timeout
      });
    }
  }

  // ============================================
  // 需求管理
  // ============================================

  async getMyDemands(userId: string, status?: number, nextPage?: string, pageSize: number = 20) {
    const where: any = { userId };
    if (status !== undefined) {
      where.status = status;
    }
    if (nextPage) {
      where.id = { lt: nextPage };
    }

    const demands = await this.prisma.demand.findMany({
      where,
      take: pageSize + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        selectedConsultant: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const hasMore = demands.length > pageSize;
    const items = hasMore ? demands.slice(0, pageSize) : demands;
    const nextPageCursor = hasMore ? items[items.length - 1].id : null;

    return {
      demands: items.map((demand) => ({
        id: demand.id,
        categoryId: demand.categoryId,
        categoryName: demand.category.name,
        serviceMode: demand.serviceMode,
        serviceTime: demand.serviceTime,
        duration: demand.duration,
        location: demand.location,
        budget: parseFloat(demand.budget.toString()),
        status: demand.status,
        selectedConsultant: demand.selectedConsultant
          ? {
              id: demand.selectedConsultant.id,
              userId: demand.selectedConsultant.userId,
              nickname: demand.selectedConsultant.user.nickname,
              avatar: demand.selectedConsultant.user.avatar,
            }
          : null,
        createdAt: demand.createdAt,
      })),
      pagination: {
        nextPage: nextPageCursor,
        hasMore,
      },
    };
  }

  async getDemandDetail(demandId: string, userId: string) {
    const demand = await this.prisma.demand.findUnique({
      where: { id: demandId },
      include: {
        category: true,
        selectedConsultant: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!demand) {
      throw new NotFoundException({
        code: 'DEMAND_NOT_FOUND',
        message: 'Demand not found',
      });
    }

    // Only owner can view
    if (demand.userId !== userId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    return {
      id: demand.id,
      categoryId: demand.categoryId,
      categoryName: demand.category.name,
      serviceMode: demand.serviceMode,
      serviceTime: demand.serviceTime,
      duration: demand.duration,
      location: demand.location,
      locationLat: demand.locationLat ? parseFloat(demand.locationLat.toString()) : null,
      locationLng: demand.locationLng ? parseFloat(demand.locationLng.toString()) : null,
      budget: parseFloat(demand.budget.toString()),
      genderPreference: demand.genderPreference,
      ageMin: demand.ageMin,
      ageMax: demand.ageMax,
      description: demand.description,
      status: demand.status,
      selectedConsultant: demand.selectedConsultant
        ? {
            id: demand.selectedConsultant.id,
            userId: demand.selectedConsultant.userId,
            nickname: demand.selectedConsultant.user.nickname,
            avatar: demand.selectedConsultant.user.avatar,
          }
        : null,
      expiredAt: demand.expiredAt,
      createdAt: demand.createdAt,
    };
  }

  async getDemandApplications(demandId: string, userId: string) {
    const demand = await this.prisma.demand.findUnique({
      where: { id: demandId },
    });

    if (!demand) {
      throw new NotFoundException({
        code: 'DEMAND_NOT_FOUND',
        message: 'Demand not found',
      });
    }

    if (demand.userId !== userId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    const applications = await this.prisma.demandApplication.findMany({
      where: { demandId },
      orderBy: { createdAt: 'desc' },
      include: {
        consultant: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return {
      applications: applications.map((app) => ({
        id: app.id,
        consultant: {
          id: app.consultant.id,
          userId: app.consultant.userId,
          nickname: app.consultant.user.nickname,
          avatar: app.consultant.user.avatar,
          rating: parseFloat(app.consultant.rating.toString()),
          orderCount: app.consultant.orderCount,
        },
        quotedPrice: parseFloat(app.quotedPrice.toString()),
        message: app.message,
        status: app.status,
        createdAt: app.createdAt,
      })),
    };
  }

  async selectConsultant(demandId: string, userId: string, applicationId: string) {
    const demand = await this.prisma.demand.findUnique({
      where: { id: demandId },
    });

    if (!demand) {
      throw new NotFoundException({
        code: 'DEMAND_NOT_FOUND',
        message: 'Demand not found',
      });
    }

    if (demand.userId !== userId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    if (demand.status === 5) {
      throw new BadRequestException({
        code: 'DEMAND_STATUS_ERROR',
        message: 'Demand already confirmed',
      });
    }

    const application = await this.prisma.demandApplication.findUnique({
      where: { id: applicationId },
      include: { consultant: true },
    });

    if (!application || application.demandId !== demandId) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    }

    // Update demand status and selected consultant
    await this.prisma.demand.update({
      where: { id: demandId },
      data: {
        status: 5, // confirmed
        selectedConsultantId: application.consultantId,
      },
    });

    // Update application status
    await this.prisma.demandApplication.update({
      where: { id: applicationId },
      data: { status: 1 }, // selected
    });

    // Reject other applications
    await this.prisma.demandApplication.updateMany({
      where: {
        demandId,
        id: { not: applicationId },
      },
      data: { status: 2 }, // rejected
    });

    // TODO: Create order from demand

    return {
      message: '已选择顾问，正在生成订单',
      demandId,
      consultantId: application.consultantId,
    };
  }

  async cancelDemand(demandId: string, userId: string, reason?: string) {
    const demand = await this.prisma.demand.findUnique({
      where: { id: demandId },
    });

    if (!demand) {
      throw new NotFoundException({
        code: 'DEMAND_NOT_FOUND',
        message: 'Demand not found',
      });
    }

    if (demand.userId !== userId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    if (demand.status >= 5) {
      throw new BadRequestException({
        code: 'DEMAND_STATUS_ERROR',
        message: 'Cannot cancel confirmed or completed demand',
      });
    }

    await this.prisma.demand.update({
      where: { id: demandId },
      data: {
        status: 7, // cancelled
        cancelReason: reason,
      },
    });

    return { message: '需求已取消' };
  }

  async getLockStatus(demandId: string) {
    const demand = await this.prisma.demand.findUnique({
      where: { id: demandId },
    });

    if (!demand) {
      throw new NotFoundException({
        code: 'DEMAND_NOT_FOUND',
        message: 'Demand not found',
      });
    }

    if (demand.status !== 2) {
      return {
        demandId,
        status: demand.status,
        isLocked: false,
      };
    }

    const locks = await this.prisma.demandLock.findMany({
      where: { demandId, status: 0 },
      include: {
        demand: true,
      },
    });

    if (locks.length === 0) {
      return {
        demandId,
        status: demand.status,
        isLocked: false,
      };
    }

    const lock = locks[0];
    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(lock.expiredAt).getTime() - Date.now()) / 1000),
    );

    return {
      demandId,
      status: demand.status,
      isLocked: true,
      lockedUntil: lock.expiredAt,
      remainingSeconds,
    };
  }

  // ============================================
  // Helper methods
  // ============================================

  private calculateAge(birthday: Date): number {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}

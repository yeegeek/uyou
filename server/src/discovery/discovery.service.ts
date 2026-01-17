import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class DiscoveryService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ============================================
  // 城市管理
  // ============================================

  async getCities() {
    const cities = await this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        province: true,
        code: true,
        isActive: true,
      },
    });

    return { cities };
  }

  // ============================================
  // 服务类目管理
  // ============================================

  async getCategories() {
    const categories = await this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        sortOrder: true,
      },
    });

    return { categories };
  }

  async getCategoryDetail(categoryId: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
      },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    return category;
  }

  // ============================================
  // 顾问推荐算法
  // ============================================

  async getRecommendedConsultants(
    cityId: string,
    categoryId?: string,
    page: number = 1,
    pageSize: number = 20,
    userLocation?: { lat: number; lng: number },
  ) {
    // Check cache for first 3 pages
    if (page <= 3) {
      const cacheKey = `consultant:recommended:${cityId}:${categoryId || 'all'}:${page}:${pageSize}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build where clause
    const where: any = {
      status: 1, // Approved consultants only
      creditScore: { gte: 60 }, // Credit score >= 60
      user: {
        status: 1, // Active users only
        cityId: cityId,
      },
    };

    // Filter by category if provided
    if (categoryId) {
      where.services = {
        some: {
          categoryId: categoryId,
          isActive: true,
        },
      };
    }

    // Get consultants with services
    const consultants = await this.prisma.consultant.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            gender: true,
            birthday: true,
            bio: true,
            city: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        services: {
          where: {
            isActive: true,
            ...(categoryId && { categoryId }),
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      take: 100, // Get more for scoring
    });

    // Calculate recommendation scores
    const scoredConsultants = consultants.map((consultant) => {
      const scores = this.calculateRecommendationScore(consultant, userLocation);
      return {
        consultant,
        totalScore: scores.totalScore,
        scores,
      };
    });

    // Sort by total score
    scoredConsultants.sort((a, b) => b.totalScore - a.totalScore);

    // Paginate
    const skip = (page - 1) * pageSize;
    const paginatedConsultants = scoredConsultants.slice(skip, skip + pageSize);

    // Format response
    const result = {
      consultants: paginatedConsultants.map((item) => {
        const consultant = item.consultant;
        const user = consultant.user;

        // Calculate age from birthday
        let age = null;
        if (user.birthday) {
          const today = new Date();
          const birthDate = new Date(user.birthday);
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        return {
          id: consultant.id,
          userId: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          gender: user.gender,
          age,
          introText: consultant.selfIntro,
          avgRating: parseFloat(consultant.rating.toString()),
          totalOrders: consultant.orderCount,
          totalReviews: consultant.reviewCount,
          distance: item.scores.distance,
          onlineStatus: consultant.onlineStatus,
          services: consultant.services.map((service) => ({
            categoryId: service.categoryId,
            categoryName: service.category.name,
            serviceMode: service.serviceMode,
            pricePerHour: parseFloat(service.pricePerHour.toString()),
            minDuration: service.minDuration,
            maxDuration: service.maxDuration,
          })),
          recommendScore: item.totalScore,
        };
      }),
      pagination: {
        page,
        pageSize,
        hasMore: scoredConsultants.length > skip + pageSize,
      },
    };

    // Cache result for first 3 pages (5 minutes)
    if (page <= 3) {
      const cacheKey = `consultant:recommended:${cityId}:${categoryId || 'all'}:${page}:${pageSize}`;
      await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes
    }

    return result;
  }

  /**
   * Calculate recommendation score
   * Formula: Total = Distance×40% + Rating×30% + Preference×20% + Activity×10%
   */
  private calculateRecommendationScore(
    consultant: any,
    userLocation?: { lat: number; lng: number },
  ) {
    // Distance score (0-100)
    let distanceScore = 50; // Default if no location
    let distance = null;
    if (userLocation && consultant.user.city) {
      // TODO: Calculate actual distance using PostGIS
      // For now, use a placeholder
      distance = Math.random() * 10; // 0-10 km
      distanceScore = Math.max(0, 100 - distance * 10);
    }

    // Rating score (0-100)
    const rating = parseFloat(consultant.rating.toString());
    const ratingScore = (rating / 5.0) * 100;

    // Preference score (0-100) - Not applicable for general recommendation
    const preferenceScore = 50; // Default neutral score

    // Activity score (0-100)
    const daysSinceLastOnline = consultant.lastOnlineAt
      ? Math.floor((Date.now() - new Date(consultant.lastOnlineAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const activityScore = Math.max(0, 100 - daysSinceLastOnline * 5);

    // Calculate total score
    const totalScore =
      distanceScore * 0.4 +
      ratingScore * 0.3 +
      preferenceScore * 0.2 +
      activityScore * 0.1;

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      distanceScore: Math.round(distanceScore * 100) / 100,
      ratingScore: Math.round(ratingScore * 100) / 100,
      preferenceScore: Math.round(preferenceScore * 100) / 100,
      activityScore: Math.round(activityScore * 100) / 100,
      distance,
    };
  }

  // ============================================
  // 顾问搜索
  // ============================================

  async searchConsultants(params: {
    cityId: string;
    categoryId?: string;
    gender?: number;
    ageMin?: number;
    ageMax?: number;
    priceMin?: number;
    priceMax?: number;
    sortBy?: string;
    nextPage?: string;
    pageSize?: number;
    userLocation?: { lat: number; lng: number };
  }) {
    const {
      cityId,
      categoryId,
      gender,
      ageMin,
      ageMax,
      priceMin,
      priceMax,
      sortBy = 'rating',
      nextPage,
      pageSize = 20,
      userLocation,
    } = params;

    // Build where clause
    const where: any = {
      status: 1,
      creditScore: { gte: 60 },
      user: {
        status: 1,
        cityId: cityId,
        ...(gender && { gender }),
      },
    };

    // Category filter
    if (categoryId) {
      where.services = {
        some: {
          categoryId: categoryId,
          isActive: true,
          ...(priceMin && { pricePerHour: { gte: priceMin } }),
          ...(priceMax && { pricePerHour: { lte: priceMax } }),
        },
      };
    }

    // Cursor pagination
    if (nextPage) {
      where.id = { lt: nextPage };
    }

    // Get consultants
    let consultants = await this.prisma.consultant.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            gender: true,
            birthday: true,
            bio: true,
          },
        },
        services: {
          where: {
            isActive: true,
            ...(categoryId && { categoryId }),
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      take: pageSize + 1,
      orderBy: { createdAt: 'desc' },
    });

    // Filter by age if specified
    if (ageMin || ageMax) {
      consultants = consultants.filter((c) => {
        if (!c.user.birthday) return false;
        const age = this.calculateAge(c.user.birthday);
        if (ageMin && age < ageMin) return false;
        if (ageMax && age > ageMax) return false;
        return true;
      });
    }

    // Sort by specified field
    if (sortBy === 'rating') {
      consultants.sort((a, b) => parseFloat(b.rating.toString()) - parseFloat(a.rating.toString()));
    } else if (sortBy === 'orders') {
      consultants.sort((a, b) => b.orderCount - a.orderCount);
    } else if (sortBy === 'distance' && userLocation) {
      // TODO: Sort by actual distance using PostGIS
    }

    // Pagination
    const hasMore = consultants.length > pageSize;
    const items = hasMore ? consultants.slice(0, pageSize) : consultants;
    const nextPageCursor = hasMore ? items[items.length - 1].id : null;

    // Format response
    return {
      consultants: items.map((consultant) => {
        const user = consultant.user;
        const age = user.birthday ? this.calculateAge(user.birthday) : null;

        return {
          id: consultant.id,
          userId: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          gender: user.gender,
          age,
          introText: consultant.selfIntro,
          avgRating: parseFloat(consultant.rating.toString()),
          totalOrders: consultant.orderCount,
          totalReviews: consultant.reviewCount,
          onlineStatus: consultant.onlineStatus,
          services: consultant.services.map((service) => ({
            categoryId: service.categoryId,
            categoryName: service.category.name,
            serviceMode: service.serviceMode,
            pricePerHour: parseFloat(service.pricePerHour.toString()),
          })),
        };
      }),
      pagination: {
        nextPage: nextPageCursor,
        hasMore,
      },
    };
  }

  // ============================================
  // 顾问详情
  // ============================================

  async getConsultantDetail(consultantId: string, userId?: string) {
    const consultant = await this.prisma.consultant.findUnique({
      where: { id: consultantId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            gender: true,
            birthday: true,
            bio: true,
          },
        },
        services: {
          where: { isActive: true },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!consultant) {
      throw new NotFoundException({
        code: 'CONSULTANT_NOT_FOUND',
        message: 'Consultant not found',
      });
    }

    const user = consultant.user;
    const age = user.birthday ? this.calculateAge(user.birthday) : null;

    // Check if favorited or blocked by current user
    let isFavorited = false;
    let isBlocked = false;
    if (userId) {
      const favorite = await this.prisma.userFavorite.findUnique({
        where: {
          userId_targetId: {
            userId,
            targetId: user.id,
          },
        },
      });
      isFavorited = !!favorite;

      const block = await this.prisma.userBlock.findUnique({
        where: {
          userId_blockedId: {
            userId,
            blockedId: user.id,
          },
        },
      });
      isBlocked = !!block;
    }

    // Get recent reviews
    const reviews = await this.prisma.review.findMany({
      where: {
        revieweeId: user.id,
        status: 1, // Approved reviews only
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    // Calculate completion rate
    const totalOrders = consultant.orderCount;
    const completedOrders = await this.prisma.order.count({
      where: {
        consultantId: consultant.id,
        status: 5, // Completed
      },
    });
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
      id: consultant.id,
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      age,
      bio: user.bio,
      photos: consultant.photos,
      videoIntro: consultant.videoIntro,
      selfIntro: consultant.selfIntro,
      experience: consultant.experience,
      tags: consultant.tags,
      avgRating: parseFloat(consultant.rating.toString()),
      totalOrders: consultant.orderCount,
      totalReviews: consultant.reviewCount,
      completionRate: Math.round(completionRate * 100) / 100,
      creditScore: consultant.creditScore,
      onlineStatus: consultant.onlineStatus,
      lastOnlineAt: consultant.lastOnlineAt,
      services: consultant.services.map((service) => ({
        id: service.id,
        categoryId: service.categoryId,
        categoryName: service.category.name,
        serviceMode: service.serviceMode,
        pricePerHour: parseFloat(service.pricePerHour.toString()),
        minDuration: service.minDuration,
        maxDuration: service.maxDuration,
      })),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        tags: review.tags,
        content: review.content,
        tipAmount: review.tipAmount ? parseFloat(review.tipAmount.toString()) : null,
        createdAt: review.createdAt,
        reviewer: {
          id: review.reviewer.id,
          nickname: review.reviewer.nickname,
          avatar: review.reviewer.avatar,
        },
      })),
      isFavorited,
      isBlocked,
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

  /**
   * Clear recommendation cache for a city and category
   */
  async clearRecommendationCache(cityId: string, categoryId?: string) {
    const pattern = `consultant:recommended:${cityId}:${categoryId || '*'}:*`;
    // TODO: Implement cache pattern deletion
    // For now, this is a placeholder
    console.log(`Clearing cache with pattern: ${pattern}`);
  }
}

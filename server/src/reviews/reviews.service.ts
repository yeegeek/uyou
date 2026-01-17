import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // 创建评价
  // ============================================

  async createReview(userId: string, createReviewDto: CreateReviewDto, reviewType: number) {
    const { orderId, rating, content, tags, isAnonymous } = createReviewDto;

    // Validate order exists and is completed
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        consultant: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.status !== 5) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_ERROR',
        message: 'Order must be completed before review',
      });
    }

    // Determine reviewer and reviewee
    let reviewerId: string;
    let revieweeId: string;

    if (reviewType === 1) {
      // User reviews consultant
      if (order.userId !== userId) {
        throw new ForbiddenException({
          code: 'AUTH_PERMISSION_DENIED',
          message: 'Permission denied',
        });
      }
      reviewerId = userId;
      revieweeId = order.consultant.userId;
    } else {
      // Consultant reviews user
      if (order.consultant.userId !== userId) {
        throw new ForbiddenException({
          code: 'AUTH_PERMISSION_DENIED',
          message: 'Permission denied',
        });
      }
      reviewerId = userId;
      revieweeId = order.userId;
    }

    // Check if already reviewed
    const existingReview = await this.prisma.review.findFirst({
      where: {
        orderId,
        reviewerId,
        reviewType,
      },
    });

    if (existingReview) {
      throw new BadRequestException({
        code: 'REVIEW_ALREADY_EXISTS',
        message: 'You have already reviewed this order',
      });
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        orderId,
        reviewerId,
        revieweeId,
        reviewType,
        rating,
        content,
        tags: tags || [],
        isAnonymous: isAnonymous || false,
        status: 0, // pending review
      },
    });

    // Update consultant rating if reviewing consultant
    if (reviewType === 1) {
      await this.updateConsultantRating(order.consultantId);
    }

    return {
      reviewId: review.id,
      message: '评价已提交，等待审核',
    };
  }

  // ============================================
  // 查询评价列表
  // ============================================

  async getReviews(
    targetId: string,
    targetType: 'user' | 'consultant',
    nextPage?: string,
    pageSize: number = 20,
  ) {
    // Find target user
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const where: any = {
      revieweeId: targetId,
      status: 1, // Only show approved reviews
      deletedAt: null,
    };

    if (targetType === 'consultant') {
      where.reviewType = 1; // User reviews consultant
    } else {
      where.reviewType = 2; // Consultant reviews user
    }

    if (nextPage) {
      where.id = { lt: nextPage };
    }

    const reviews = await this.prisma.review.findMany({
      where,
      take: pageSize + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        order: {
          select: {
            id: true,
            categoryId: true,
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

    const hasMore = reviews.length > pageSize;
    const items = hasMore ? reviews.slice(0, pageSize) : reviews;
    const nextPageCursor = hasMore ? items[items.length - 1].id : null;

    return {
      reviews: items.map((review) => ({
        id: review.id,
        orderId: review.orderId,
        reviewer: review.isAnonymous
          ? {
              id: 'anonymous',
              nickname: '匿名用户',
              avatar: '',
            }
          : {
              id: review.reviewer.id,
              nickname: review.reviewer.nickname,
              avatar: review.reviewer.avatar,
            },
        rating: review.rating,
        content: review.content,
        tags: review.tags,
        images: review.images,
        reply: review.reply,
        repliedAt: review.repliedAt,
        category: review.order.category
          ? {
              id: review.order.category.id,
              name: review.order.category.name,
            }
          : null,
        createdAt: review.createdAt,
      })),
      pagination: {
        nextPage: nextPageCursor,
        hasMore,
      },
    };
  }

  // ============================================
  // 删除评价
  // ============================================

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        order: {
          include: {
            consultant: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Review not found',
      });
    }

    if (review.reviewerId !== userId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    // Soft delete
    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Update consultant rating if it was a consultant review
    if (review.reviewType === 1) {
      await this.updateConsultantRating(review.order.consultantId);
    }

    return {
      message: '评价已删除',
    };
  }

  // ============================================
  // 审核评价（管理员）
  // ============================================

  async auditReview(reviewId: string, action: 'approve' | 'reject', reason?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        order: {
          include: {
            consultant: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Review not found',
      });
    }

    if (review.status !== 0) {
      throw new BadRequestException({
        code: 'REVIEW_STATUS_ERROR',
        message: 'Review has already been audited',
      });
    }

    const status = action === 'approve' ? 1 : 2;

    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewReason: reason,
      },
    });

    // Update consultant rating if approved and reviewing consultant
    if (action === 'approve' && review.reviewType === 1) {
      await this.updateConsultantRating(review.order.consultantId);
    }

    return {
      reviewId,
      status,
      message: action === 'approve' ? '评价已通过' : '评价已拒绝',
    };
  }

  // ============================================
  // 打赏
  // ============================================

  async createTip(userId: string, orderId: string, amount: number, message?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        consultant: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.userId !== userId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    if (order.status !== 5) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_ERROR',
        message: 'Order must be completed before tipping',
      });
    }

    // Check if review exists and is 5 stars
    const review = await this.prisma.review.findFirst({
      where: {
        orderId,
        reviewerId: userId,
        reviewType: 1,
      },
    });

    if (!review || review.rating < 5) {
      throw new BadRequestException({
        code: 'TIP_REQUIREMENT_NOT_MET',
        message: 'Tip requires 5-star review',
      });
    }

    // Update review with tip
    await this.prisma.review.update({
      where: { id: review.id },
      data: {
        tipAmount: new Decimal(amount),
        tipMessage: message,
      },
    });

    // TODO: Process payment for tip
    // TODO: Add tip to consultant wallet

    return {
      message: '打赏成功',
      amount,
    };
  }

  // ============================================
  // 获取评价标签
  // ============================================

  async getReviewTags(type?: number) {
    const where: any = {};
    if (type) {
      where.type = type;
    }

    const tags = await this.prisma.reviewTag.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return {
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        type: tag.type,
      })),
    };
  }

  // ============================================
  // Helper methods
  // ============================================

  private async updateConsultantRating(consultantId: string) {
    // Calculate average rating from approved reviews
    const result = await this.prisma.review.aggregate({
      where: {
        order: {
          consultantId,
        },
        reviewType: 1, // User reviews consultant
        status: 1, // Approved
        deletedAt: null,
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    const avgRating = result._avg.rating || 0;
    const reviewCount = result._count.id;

    await this.prisma.consultant.update({
      where: { id: consultantId },
      data: {
        rating: new Decimal(avgRating),
        reviewCount,
      },
    });
  }
}

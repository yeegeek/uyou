import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // 订单列表和详情
  // ============================================

  async getOrders(
    userId: string,
    role: 'user' | 'consultant',
    status?: number,
    nextPage?: string,
    pageSize: number = 20,
  ) {
    const where: any = {};

    if (role === 'user') {
      where.userId = userId;
    } else {
      // Find consultant by userId
      const consultant = await this.prisma.consultant.findUnique({
        where: { userId },
      });
      if (!consultant) {
        throw new NotFoundException({
          code: 'CONSULTANT_NOT_FOUND',
          message: 'Consultant profile not found',
        });
      }
      where.consultantId = consultant.id;
    }

    if (status !== undefined) {
      where.status = status;
    }

    if (nextPage) {
      where.id = { lt: nextPage };
    }

    const orders = await this.prisma.order.findMany({
      where,
      take: pageSize + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
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
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const hasMore = orders.length > pageSize;
    const items = hasMore ? orders.slice(0, pageSize) : orders;
    const nextPageCursor = hasMore ? items[items.length - 1].id : null;

    return {
      orders: items.map((order) => this.formatOrder(order)),
      pagination: {
        nextPage: nextPageCursor,
        hasMore,
      },
    };
  }

  async getOrderDetail(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            phone: true,
          },
        },
        consultant: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                phone: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        payments: {
          where: { type: 2 }, // Refund records
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    // Check permission
    if (order.userId !== userId && order.consultant.userId !== userId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    const result: any = this.formatOrder(order);

    // Add refund info if exists
    if (order.status === 6 && order.payments.length > 0) {
      const refund = order.payments[0];
      result.refundInfo = {
        refundAmount: parseFloat(refund.amount.toString()),
        refundStatus: refund.status,
        refundAt: refund.updatedAt,
        refundReason: order.cancelReason,
      };
    }

    return result;
  }

  // ============================================
  // 顾问接单/拒单
  // ============================================

  async acceptOrder(orderId: string, consultantUserId: string) {
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

    if (order.consultant.userId !== consultantUserId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    if (order.status !== 0) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_ERROR',
        message: 'Order cannot be accepted',
      });
    }

    // Set payment expiration (30 minutes)
    const paymentExpireAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 1, // pending_payment
        acceptedAt: new Date(),
        paymentExpireAt,
      },
    });

    // TODO: Send notification to user

    return {
      orderId,
      status: 1,
      paymentExpireAt,
      message: '已接单，等待用户支付',
    };
  }

  async rejectOrder(orderId: string, consultantUserId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        consultant: true,
        demand: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.consultant.userId !== consultantUserId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    if (order.status !== 0) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_ERROR',
        message: 'Order cannot be rejected',
      });
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 8, // expired
        cancelReason: reason || '顾问拒单',
        cancelledAt: new Date(),
      },
    });

    // Reset demand status if exists
    if (order.demandId && order.demand) {
      await this.prisma.demand.update({
        where: { id: order.demandId },
        data: { status: 0 }, // pending
      });
    }

    // TODO: Send notification to user

    return {
      orderId,
      status: 8,
      message: '已拒单',
    };
  }

  // ============================================
  // 取消订单
  // ============================================

  async cancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        consultant: true,
        demand: true,
        payments: {
          where: { type: 1, status: 1 }, // Paid payment
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    // Check permission
    const isUser = order.userId === userId;
    const isConsultant = order.consultant.userId === userId;

    if (!isUser && !isConsultant) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    // Check if order can be cancelled
    if (order.status === 5 || order.status === 6) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_ERROR',
        message: 'Order cannot be cancelled',
      });
    }

    // Calculate refund amount
    const refundResult = this.calculateRefund(order, isUser);

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 6, // cancelled
        cancelReason: reason,
        cancelledAt: new Date(),
        cancelledBy: isUser ? 'user' : 'consultant',
      },
    });

    // Create refund record if payment exists
    let refundStatus = 0;
    if (order.payments.length > 0 && refundResult.refundAmount > 0) {
      const payment = order.payments[0];
      await this.prisma.payment.create({
        data: {
          orderId,
          userId: order.userId,
          type: 2, // refund
          amount: new Decimal(refundResult.refundAmount),
          status: 0, // processing
          paymentMethod: payment.paymentMethod,
          transactionId: `REFUND_${Date.now()}`,
        },
      });

      // TODO: Call WeChat refund API
      // For now, just mark as processing
    }

    // Reset demand status if in early stage
    if (order.demandId && order.demand && (order.status === 0 || order.status === 1)) {
      await this.prisma.demand.update({
        where: { id: order.demandId },
        data: { status: 0 }, // pending
      });
    }

    // Deduct credit score if consultant cancels
    if (isConsultant && refundResult.creditDeduction > 0) {
      await this.prisma.consultant.update({
        where: { id: order.consultantId },
        data: {
          creditScore: {
            decrement: refundResult.creditDeduction,
          },
        },
      });
    }

    return {
      orderId,
      status: 6,
      refundAmount: refundResult.refundAmount,
      refundStatus,
      refundReason: refundResult.refundReason,
      refundPolicy: refundResult.policy,
      message: refundResult.refundAmount > 0 ? '退款申请已提交，正在处理中' : '订单已取消',
    };
  }

  private calculateRefund(order: any, isUser: boolean) {
    const now = new Date();
    const serviceStart = new Date(order.serviceTime);
    const hoursUntilService = (serviceStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundRate = 0;
    let refundReason = '';
    let creditDeduction = 0;
    let timeRange = '';

    // Get paid amount
    const paidAmount =
      order.payments.length > 0 ? parseFloat(order.payments[0].amount.toString()) : 0;

    if (order.status < 3) {
      // Before service starts
      if (isUser) {
        if (hoursUntilService >= 24) {
          refundRate = 1.0;
          timeRange = '24小时以上';
          refundReason = '服务开始前24小时以上取消，全额退款';
        } else if (hoursUntilService >= 12) {
          refundRate = 0.5;
          timeRange = '12-24小时';
          refundReason = '服务开始前12-24小时取消，退款50%';
        } else {
          refundRate = 0;
          timeRange = '12小时内';
          refundReason = '服务开始前12小时内取消，不退款';
        }
      } else {
        // Consultant cancels - always full refund but with credit deduction
        refundRate = 1.0;
        if (hoursUntilService >= 24) {
          creditDeduction = 5;
          timeRange = '24小时以上';
          refundReason = '顾问取消订单，全额退款，扣除信用分5分';
        } else if (hoursUntilService >= 12) {
          creditDeduction = 10;
          timeRange = '12-24小时';
          refundReason = '顾问取消订单，全额退款，扣除信用分10分';
        } else {
          creditDeduction = 20;
          timeRange = '12小时内';
          refundReason = '顾问取消订单，全额退款，扣除信用分20分';
        }
      }
    } else {
      // Service in progress
      const serviceEnd = new Date(order.serviceTime.getTime() + order.duration * 60 * 1000);
      const totalDuration = order.duration;
      const elapsedMinutes = Math.max(0, (now.getTime() - serviceStart.getTime()) / (1000 * 60));
      const serviceRate = Math.min(1, elapsedMinutes / totalDuration);

      if (isUser) {
        refundRate = Math.max(0, 1 - serviceRate);
        timeRange = '服务进行中';
        refundReason = `服务进行中取消，已服务${Math.round(serviceRate * 100)}%，退款${Math.round(refundRate * 100)}%`;
      } else {
        refundRate = 1.0;
        creditDeduction = 30;
        timeRange = '服务进行中';
        refundReason = '顾问在服务进行中取消，用户全额退款，扣除信用分30分';
      }
    }

    const refundAmount = paidAmount * refundRate;

    return {
      refundAmount: Math.round(refundAmount * 100) / 100,
      refundReason,
      creditDeduction,
      policy: {
        timeRange,
        refundRate,
        description: refundReason,
      },
    };
  }

  // ============================================
  // 服务流程
  // ============================================

  async startService(orderId: string, consultantUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { consultant: true },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.consultant.userId !== consultantUserId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    if (order.status !== 2) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_ERROR',
        message: 'Order cannot be started',
      });
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 3, // in_progress
        actualStart: new Date(),
      },
    });

    return {
      orderId,
      status: 3,
      message: '服务已开始',
    };
  }

  async completeService(orderId: string, consultantUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { consultant: true },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.consultant.userId !== consultantUserId) {
      throw new ForbiddenException({
        code: 'AUTH_PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }

    if (order.status !== 3) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_ERROR',
        message: 'Order cannot be completed',
      });
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 4, // pending_confirm
        actualEnd: new Date(),
      },
    });

    // TODO: Send notification to user for confirmation

    return {
      orderId,
      status: 4,
      message: '服务已结束，等待用户确认',
    };
  }

  async confirmCompletion(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    if (order.status !== 4) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_ERROR',
        message: 'Order cannot be confirmed',
      });
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 5, // completed
        completedAt: new Date(),
      },
    });

    // TODO: Trigger settlement to consultant wallet

    return {
      orderId,
      status: 5,
      message: '订单已完成',
    };
  }

  // ============================================
  // Helper methods
  // ============================================

  private formatOrder(order: any) {
    return {
      id: order.id,
      userId: order.userId,
      consultantId: order.consultantId,
      demandId: order.demandId,
      categoryId: order.categoryId,
      categoryName: order.category.name,
      serviceMode: order.serviceMode,
      serviceTime: order.serviceTime,
      duration: order.duration,
      location: order.location,
      totalAmount: parseFloat(order.totalAmount.toString()),
      platformFee: parseFloat(order.platformFee.toString()),
      consultantIncome: parseFloat(order.consultantIncome.toString()),
      status: order.status,
      user: {
        id: order.user.id,
        nickname: order.user.nickname,
        avatar: order.user.avatar,
      },
      consultant: {
        id: order.consultant.id,
        userId: order.consultant.userId,
        nickname: order.consultant.user.nickname,
        avatar: order.consultant.user.avatar,
      },
      acceptedAt: order.acceptedAt,
      paymentExpireAt: order.paymentExpireAt,
      actualStart: order.actualStart,
      actualEnd: order.actualEnd,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      cancelledBy: order.cancelledBy,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
    };
  }
}

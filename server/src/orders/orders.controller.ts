import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('订单模块')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ============================================
  // 订单列表和详情
  // ============================================

  @Get()
  @ApiOperation({ summary: '获取订单列表' })
  @ApiQuery({ name: 'status', required: false, description: '订单状态', type: Number })
  @ApiQuery({ name: 'role', required: false, description: '角色：user/consultant' })
  @ApiQuery({ name: 'nextPage', required: false, description: '下一页游标' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  async getOrders(
    @User('userId') userId: string,
    @Query('role') role: 'user' | 'consultant' = 'user',
    @Query('status') status?: number,
    @Query() pagination?: PaginationDto,
  ) {
    return this.ordersService.getOrders(
      userId,
      role,
      status,
      pagination?.nextPage,
      pagination?.pageSize,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  async getOrderDetail(@Param('id') orderId: string, @User('userId') userId: string) {
    return this.ordersService.getOrderDetail(orderId, userId);
  }

  // ============================================
  // 顾问接单/拒单
  // ============================================

  @Post(':id/accept')
  @ApiOperation({ summary: '顾问接单' })
  async acceptOrder(@Param('id') orderId: string, @User('userId') userId: string) {
    return this.ordersService.acceptOrder(orderId, userId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '顾问拒单' })
  async rejectOrder(
    @Param('id') orderId: string,
    @User('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.rejectOrder(orderId, userId, reason);
  }

  // ============================================
  // 取消订单
  // ============================================

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  async cancelOrder(
    @Param('id') orderId: string,
    @User('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancelOrder(orderId, userId, reason);
  }

  // ============================================
  // 服务流程
  // ============================================

  @Post(':id/start')
  @ApiOperation({ summary: '开始服务（顾问打卡）' })
  async startService(@Param('id') orderId: string, @User('userId') userId: string) {
    return this.ordersService.startService(orderId, userId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '结束服务（顾问打卡）' })
  async completeService(@Param('id') orderId: string, @User('userId') userId: string) {
    return this.ordersService.completeService(orderId, userId);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '确认完成（用户确认）' })
  async confirmCompletion(@Param('id') orderId: string, @User('userId') userId: string) {
    return this.ordersService.confirmCompletion(orderId, userId);
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        // 如果数据已经是格式化的响应（如分页数据），直接返回
        if (data && typeof data === 'object') {
          // 检查是否需要添加 debug 信息
          if (request.headers['x-debug'] === 'true') {
            return {
              ...data,
              _debug: {
                responseTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString(),
                memoryUsage: process.memoryUsage(),
              },
            };
          }
          return data;
        }
        return data;
      }),
    );
  }
}

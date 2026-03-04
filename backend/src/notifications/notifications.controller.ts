import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Sse,
  Body,
} from '@nestjs/common';
import { Observable, map, finalize } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../permissions/permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @Permissions('notifications:view') // Everyone with basic access can see their notifications
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.findAll(user.id, {
      unread: unread === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('unread-count')
  @Permissions('notifications:view')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @Permissions('notifications:view')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Post('mark-all-read')
  @Permissions('notifications:view')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Get('preferences')
  @Permissions('notifications:view')
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  @Permissions('notifications:view')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }

  @Sse('stream')
  @Permissions('notifications:view')
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    const subject = this.notificationsService.getSubjectForUser(user.id);
    return subject.pipe(
      map(
        (notification) =>
          ({ data: JSON.stringify(notification) }) as MessageEvent,
      ),
      finalize(() => {
        this.notificationsService.removeSubjectForUser(user.id);
      }),
    );
  }
}

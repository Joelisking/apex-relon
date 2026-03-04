import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../permissions/permissions.decorator';

interface AuthRequest {
  user: { id: string; role: string; email: string };
}

interface StreamError {
  code?: number | string;
  message?: string;
}

@Controller('leads/:leadId/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @Permissions('leads:edit')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadFile(
    @Param('leadId') leadId: string,
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.filesService.uploadFile(
      leadId,
      req.user.id,
      file,
      category || 'other',
    );
  }

  @Get()
  @Permissions('leads:view')
  async getFiles(@Param('leadId') leadId: string) {
    return this.filesService.getFilesByLead(leadId);
  }

  @Get(':fileId')
  @Permissions('leads:view')
  async getFile(@Param('fileId') fileId: string) {
    return this.filesService.getFileById(fileId);
  }

  @Get(':fileId/download')
  @Permissions('leads:view')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, originalName } =
      await this.filesService.getFileStream(fileId);

    // Set response headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${originalName}"`,
    );

    // Handle stream errors
    stream.on('error', (err: StreamError) => {
      if (err.code === 404) {
        return res.status(404).send('File not found in storage');
      }
      console.error('Stream error:', err);
      return res.status(500).send('Error streaming file');
    });

    // Pipe the GCS stream to the response
    stream.pipe(res);
  }

  @Delete(':fileId')
  @Permissions('leads:edit')
  async deleteFile(@Param('fileId') fileId: string, @Request() req: AuthRequest) {
    return this.filesService.deleteFile(fileId, req.user.id);
  }
}

@Controller('clients/:clientId/files')
@UseGuards(JwtAuthGuard)
export class ClientFilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @Permissions('clients:edit')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadFile(
    @Param('clientId') clientId: string,
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.filesService.uploadFileForClient(
      clientId,
      req.user.id,
      file,
      category || 'other',
    );
  }

  @Get()
  @Permissions('clients:view')
  async getFiles(@Param('clientId') clientId: string) {
    return this.filesService.getFilesByClient(clientId);
  }

  @Get(':fileId')
  @Permissions('clients:view')
  async getFile(@Param('fileId') fileId: string) {
    return this.filesService.getFileById(fileId);
  }

  @Get(':fileId/download')
  @Permissions('clients:view')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, originalName } =
      await this.filesService.getFileStream(fileId);

    // Set response headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${originalName}"`,
    );

    // Handle stream errors
    stream.on('error', (err: StreamError) => {
      if (err.code === 404) {
        return res.status(404).send('File not found in storage');
      }
      console.error('Stream error:', err);
      return res.status(500).send('Error streaming file');
    });

    // Pipe the GCS stream to the response
    stream.pipe(res);
  }

  @Delete(':fileId')
  @Permissions('clients:edit')
  async deleteFile(@Param('fileId') fileId: string, @Request() req: AuthRequest) {
    return this.filesService.deleteFile(fileId, req.user.id);
  }
}

@Controller('projects/:projectId/files')
@UseGuards(JwtAuthGuard)
export class ProjectFilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @Permissions('projects:edit')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadFile(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.filesService.uploadFileForProject(
      projectId,
      req.user.id,
      file,
      category || 'other',
    );
  }

  @Get()
  @Permissions('projects:view')
  async getFiles(@Param('projectId') projectId: string) {
    return this.filesService.getFilesByProject(projectId);
  }

  @Get(':fileId')
  @Permissions('projects:view')
  async getFile(@Param('fileId') fileId: string) {
    return this.filesService.getFileById(fileId);
  }

  @Get(':fileId/download')
  @Permissions('projects:view')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, originalName } =
      await this.filesService.getFileStream(fileId);

    // Set response headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${originalName}"`,
    );

    // Handle stream errors
    stream.on('error', (err: StreamError) => {
      if (err.code === 404) {
        return res.status(404).send('File not found in storage');
      }
      console.error('Stream error:', err);
      return res.status(500).send('Error streaming file');
    });

    // Pipe the GCS stream to the response
    stream.pipe(res);
  }

  @Delete(':fileId')
  @Permissions('projects:edit')
  async deleteFile(@Param('fileId') fileId: string, @Request() req: AuthRequest) {
    return this.filesService.deleteFile(fileId, req.user.id);
  }
}

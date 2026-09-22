import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { validationError } from '@sofo/shared';
import { FileService } from './file.service';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

@Controller('workspaces/:workspaceId/files')
@RequireSession()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post()
  @RequirePermission('file.upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw validationError(['file is required']);
    }
    return this.fileService.upload(userId, workspaceId, file);
  }

  @Get()
  @RequirePermission('file.download')
  async list(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.fileService.listFiles(userId, workspaceId);
  }

  @Get(':fileId')
  @RequirePermission('file.download')
  async download(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Res() response: Response,
  ) {
    const download = await this.fileService.download(userId, workspaceId, fileId);
    response.setHeader('Content-Type', download.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${download.fileName}"`);
    download.stream.pipe(response);
  }

  @Delete(':fileId')
  @RequirePermission('file.delete')
  async remove(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.fileService.softDelete(userId, workspaceId, fileId);
  }
}

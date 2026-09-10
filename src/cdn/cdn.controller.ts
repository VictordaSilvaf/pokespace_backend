import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Readable } from 'node:stream';
import {
  S3_CLIENT,
  type S3ClientPort,
} from '../shared/infrastructure/aws/s3/s3.client.port.js';
import { getS3Bucket } from '../shared/infrastructure/aws/s3/s3.config.js';

const ALLOWED = /^sprites\/(creature|item)\/[0-9]+\.png$/i;

/**
 * Public CDN front for R2 sprites when r2.dev / custom domain is not ready.
 * Mounted at `/cdn/*` (excluded from `api/v1` prefix).
 */
@SkipThrottle()
@Controller('cdn')
export class CdnController {
  constructor(
    @Inject(S3_CLIENT)
    private readonly s3: S3ClientPort,
  ) {}

  @Get('*path')
  async get(
    @Param('path') path: string | string[],
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.s3) {
      throw new ServiceUnavailableException('S3 client not configured');
    }

    const key = (Array.isArray(path) ? path.join('/') : path)
      .replace(/^\/+/, '')
      .replace(/\?.*$/, '');

    if (!ALLOWED.test(key)) {
      throw new NotFoundException();
    }

    try {
      const obj = await this.s3.send(
        new GetObjectCommand({
          Bucket: getS3Bucket(),
          Key: key,
        }),
      );

      res.setHeader('Content-Type', obj.ContentType || 'image/png');
      res.setHeader(
        'Cache-Control',
        obj.CacheControl || 'public, max-age=31536000, immutable',
      );
      if (obj.ContentLength != null) {
        res.setHeader('Content-Length', String(obj.ContentLength));
      }

      if (req.method === 'HEAD' || !obj.Body) {
        res.status(200).end();
        return;
      }

      const body = obj.Body as Readable;
      res.status(200);
      body.pipe(res);
    } catch (err: unknown) {
      const status =
        typeof err === 'object' &&
        err &&
        '$metadata' in err &&
        typeof (err as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 'number'
          ? (err as { $metadata: { httpStatusCode: number } }).$metadata
              .httpStatusCode
          : 500;
      if (status === 404) {
        throw new NotFoundException();
      }
      throw err;
    }
  }
}

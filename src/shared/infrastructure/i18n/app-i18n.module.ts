import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';

const i18nDir = join(dirname(fileURLToPath(import.meta.url)), '../../../i18n/');

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'en-*': 'en',
        pt: 'pt-BR',
        'pt-*': 'pt-BR',
        'es-*': 'es',
      },
      loaderOptions: {
        path: i18nDir,
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
    }),
  ],
})
export class AppI18nModule {}

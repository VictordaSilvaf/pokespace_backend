import { Injectable, Logger } from '@nestjs/common';
import type {
  Mailer,
  PasswordResetMail,
} from '../../application/ports/mailer.port.js';

@Injectable()
export class ConsoleMailerAdapter implements Mailer {
  private readonly logger = new Logger(ConsoleMailerAdapter.name);

  async sendPasswordReset(mail: PasswordResetMail): Promise<void> {
    this.logger.log(
      `password reset for ${mail.username} <${mail.email}> token=${mail.token}`,
    );
  }
}

import type { Context } from 'hono';

import type { AuditLog } from '@entities/audit-log.entity';
import { AuditEventSeverity, AuditEventType } from '@entities/audit-log.entity';
import type { Database } from '@database/database';
import type { AuditLogRepository } from '@repositories/audit-log.repository';
import { getRealClientIp } from '@utils/proxy.util';

export class AuditLogService {
  private repository: AuditLogRepository;

  constructor(db: Database) {
    this.repository = db.getAuditLogRepository();
  }

  private filterSensitiveHeaders(headers: Headers): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-reverse-proxy-secret'];
    const filteredHeaders: Record<string, string> = {};
    headers.forEach((value, key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        filteredHeaders[key] = 'REDACTED';
      } else {
        filteredHeaders[key] = value;
      }
    });
    return filteredHeaders;
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(params: {
    eventType: AuditEventType;
    severity?: AuditEventSeverity;
    description?: string;
    context?: Context;
    userEmail?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { eventType, severity, description, context, userEmail, metadata } = params;
    const ipAddress = getRealClientIp(context);
    const userAgent = context?.req.header('user-agent') || undefined;

    const logData = {
      eventType,
      severity,
      description,
      userEmail,
      metadata: {
        ...(context && {
          method: context.req.method,
          query: Object.fromEntries(new URL(context.req.url).searchParams),
          headers: this.filterSensitiveHeaders(context.req.raw.headers),
        }),
        ...metadata,
      },
      ipAddress,
      userAgent,
    };

    await this.repository.create(logData);
  }

  /**
   * Log a login attempt
   */
  async logLoginAttempt(params: {
    success: boolean;
    userEmail: string;
    context?: Context;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { success, ...rest } = params;

    await this.logSecurityEvent({
      ...rest,
      eventType: success ? AuditEventType.LOGIN : AuditEventType.LOGIN_FAILURE,
      severity: success ? AuditEventSeverity.INFO : AuditEventSeverity.WARNING,
      description: success ? 'Successful login' : 'Failed login attempt',
    });
  }

  /**
   * Log a logout event
   */
  async logLogout(params: {
    userEmail: string;
    context?: Context;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: AuditEventType.LOGOUT,
      severity: AuditEventSeverity.INFO,
      description: 'User logged out',
      ...params,
    });
  }

  /**
   * Log a token refresh event
   */
  async logTokenRefresh(params: {
    userEmail: string;
    context?: Context;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: AuditEventType.TOKEN_REFRESH,
      severity: AuditEventSeverity.INFO,
      description: 'Access token refreshed',
      ...params,
    });
  }

  /**
   * Log a token invalidation event
   */
  async logTokenInvalidation(params: {
    userEmail: string;
    context?: Context;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { reason, ...rest } = params;

    await this.logSecurityEvent({
      eventType: AuditEventType.TOKEN_INVALIDATION,
      severity: AuditEventSeverity.WARNING,
      description: `Token invalidated: ${reason}`,
      ...rest,
    });
  }

  /**
   * Log a suspicious activity event
   */
  async logSuspiciousActivity(params: {
    userEmail?: string;
    context?: Context;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: AuditEventSeverity.WARNING,
      ...params,
    });
  }

  /**
   * Log a rate limit exceeded event
   */
  async logRateLimitExceeded(params: {
    userEmail?: string;
    context?: Context;
    limit: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { limit, ...rest } = params;

    await this.logSecurityEvent({
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      severity: AuditEventSeverity.WARNING,
      description: `Rate limit of ${limit} exceeded`,
      ...rest,
    });
  }

  /**
   * Log an unauthorized access attempt
   */
  async logUnauthorizedAccess(params: {
    userEmail?: string;
    context?: Context;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { reason, ...rest } = params;

    await this.logSecurityEvent({
      eventType: AuditEventType.UNAUTHORIZED_ACCESS,
      severity: AuditEventSeverity.WARNING,
      description: reason || 'Unauthorized access attempt',
      ...rest,
    });
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit: number = 100): Promise<AuditLog[]> {
    return this.repository.findRecent(limit);
  }

  async getUserLogs(userEmail: string): Promise<AuditLog[]> {
    return this.repository.findByUserId(userEmail);
  }

  async getLogsByEventType(eventType: AuditEventType): Promise<AuditLog[]> {
    return this.repository.findByEventType(eventType);
  }

  async getLogsBySeverity(severity: AuditEventSeverity): Promise<AuditLog[]> {
    return this.repository.findBySeverity(severity);
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    return this.repository.deleteOldLogs(cutoffDate);
  }
}

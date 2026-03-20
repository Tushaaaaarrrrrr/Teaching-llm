import { logActivity, ACTION, MODULE } from './activity-log';

type AlertLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface AlertParams {
  userId: string;
  userName: string;
  userRole: string;
  actionType: string;
  description: string;
  moduleName: string;
  level?: AlertLevel;
  metadata?: Record<string, any>;
}

/**
 * Modular Alert Service
 * In development: Logs to console + Activity Log
 * In production: Can be easily extended to hit Telegram/Slack webhook
 */
export async function triggerAlert(params: AlertParams) {
  try {
    const priority = params.level === 'HIGH' ? 2 : params.level === 'MEDIUM' ? 1 : 0;
    
    // 1. Console Log (Safe for all environments)
    console.warn(`[ALERT][${params.level || 'LOW'}] ${params.description}`, {
      user: params.userName,
      module: params.moduleName,
      type: params.actionType
    });

    // 2. Activity Log (Persistent Failure/Alert Log)
    // We pass isFailure: true and the priority level
    logActivity({
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: params.actionType,
      actionDescription: `ALERT: ${params.description}`,
      moduleName: params.moduleName,
      priority: priority,
      isFailure: true,
      metadata: params.metadata
    });

    // 3. Future Production Hooks (e.g., Telegram)
    if (process.env.NODE_ENV === 'production') {
      // Integration with Telegram/Slack can be added here without changing logic elsewhere
      // Example: await notifyTelegram(`🚨 *${params.level} ALERT*: ${params.description}`);
    }

  } catch (error) {
    // Critical: Alert service MUST NOT crash the main flow
    console.error('Failure in alertService:', error);
  }
}

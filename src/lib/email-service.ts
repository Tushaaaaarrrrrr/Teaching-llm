/**
 * Utility to trigger Google App Script webhooks for email notifications.
 */
export async function sendEmailNotification(type: 'mentorship_confirmed' | 'meet_invite' | 'purchase' | 'upgrade', data: any) {
  const url = process.env.APP_SCRIPT_URL;
  
  if (!url) {
    console.warn('[EmailService] APP_SCRIPT_URL not found in environment variables. Email will not be sent.');
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: type,
        timestamp: new Date().toISOString(),
        ...data
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EmailService] Failed to trigger App Script: ${response.status} ${errorText}`);
    } else {
      console.log(`[EmailService] Successfully triggered ${type} email for ${data.userEmail || data.email}`);
    }
  } catch (error) {
    console.error('[EmailService] Error calling App Script webhook:', error);
  }
}

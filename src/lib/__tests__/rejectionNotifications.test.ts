/**
 * Rejection Notification Service Tests
 * 
 * TDD tests for user notification preferences and rejection alerting system.
 * Tests define expected behavior for notification management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RejectionNotificationService } from '../rejectionNotifications';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Mock Notification API
const mockNotification = vi.fn();
const mockNotificationPermission = vi.fn();
vi.stubGlobal('Notification', mockNotification);
Object.defineProperty(mockNotification, 'permission', {
  get: mockNotificationPermission,
  configurable: true
});
mockNotification.requestPermission = vi.fn();

describe('RejectionNotificationService', () => {
  let notificationService: RejectionNotificationService;
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationPermission.mockReturnValue('granted');
    notificationService = new RejectionNotificationService(mockUserId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Notification Preferences Management', () => {
    it('should load user notification preferences from server', async () => {
      const mockPreferences = {
        enabled: true,
        frequency: 'immediate',
        channels: ['browser', 'email'],
        quietHours: { start: '22:00', end: '08:00' },
        errorTypes: ['InvalidOwner', 'InsufficientFunds']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPreferences
      });

      const preferences = await notificationService.getNotificationPreferences();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/notification-preferences'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
      
      expect(preferences.enabled).toBe(true);
      expect(preferences.frequency).toBe('immediate');
      expect(preferences.channels).toEqual(['browser', 'email']);
    });

    it('should save notification preferences to server', async () => {
      const newPreferences = {
        enabled: false,
        frequency: 'daily',
        channels: ['email'],
        quietHours: { start: '23:00', end: '07:00' },
        errorTypes: ['NotFound']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await notificationService.updateNotificationPreferences(newPreferences);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/notification-preferences'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(newPreferences)
        })
      );
    });

    it('should validate notification preference values', async () => {
      const invalidPreferences = {
        enabled: 'yes', // Should be boolean
        frequency: 'never', // Invalid frequency
        channels: ['smoke-signals'], // Invalid channel
        quietHours: { start: '25:00', end: '08:00' }, // Invalid time
        errorTypes: [] // Empty array
      };

      await expect(
        notificationService.updateNotificationPreferences(invalidPreferences as any)
      ).rejects.toThrow('Invalid notification preferences');
    });

    it('should use default preferences when server fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      const preferences = await notificationService.getNotificationPreferences();

      // Should return sensible defaults
      expect(preferences.enabled).toBe(true);
      expect(preferences.frequency).toBe('immediate');
      expect(preferences.channels).toEqual(['browser']);
      expect(preferences.errorTypes).toEqual(['all']);
    });
  });

  describe('Notification Delivery', () => {
    it('should send browser notification for new rejection', async () => {
      const mockRejection = {
        id: 123,
        fiberId: 'fiber-uuid-123',
        updateType: 'CreateStateMachine',
        errors: [
          { code: 'InvalidOwner', message: 'Owner signature failed' }
        ],
        timestamp: '2026-02-18T15:30:00Z'
      };

      await notificationService.notifyRejection(mockRejection);

      expect(mockNotification).toHaveBeenCalledWith(
        'Transaction Rejected',
        expect.objectContaining({
          body: expect.stringContaining('CreateStateMachine'),
          icon: expect.any(String),
          tag: 'rejection-123',
          data: expect.objectContaining({
            rejectionId: 123,
            fiberId: 'fiber-uuid-123'
          })
        })
      );
    });

    it('should respect quiet hours setting', async () => {
      // Set quiet hours preference
      await notificationService.updateNotificationPreferences({
        enabled: true,
        frequency: 'immediate',
        channels: ['browser'],
        quietHours: { start: '22:00', end: '08:00' },
        errorTypes: ['all']
      });

      // Mock current time to be during quiet hours (11 PM)
      const mockDate = new Date('2026-02-18T23:00:00Z');
      vi.setSystemTime(mockDate);

      const mockRejection = {
        id: 124,
        fiberId: 'fiber-uuid-124',
        updateType: 'TransitionStateMachine',
        errors: [{ code: 'NotFound', message: 'Fiber not found' }],
        timestamp: '2026-02-18T23:00:00Z'
      };

      await notificationService.notifyRejection(mockRejection);

      // Should not send notification during quiet hours
      expect(mockNotification).not.toHaveBeenCalled();
      
      // Should queue for later delivery
      const queuedNotifications = await notificationService.getQueuedNotifications();
      expect(queuedNotifications).toHaveLength(1);
      expect(queuedNotifications[0].id).toBe(124);
    });

    it('should filter notifications by error type preferences', async () => {
      await notificationService.updateNotificationPreferences({
        enabled: true,
        frequency: 'immediate',
        channels: ['browser'],
        quietHours: { start: '22:00', end: '08:00' },
        errorTypes: ['InvalidOwner'] // Only notify for this error type
      });

      const rejectionWithFilteredError = {
        id: 125,
        fiberId: 'fiber-uuid-125',
        updateType: 'CreateStateMachine',
        errors: [{ code: 'NotFound', message: 'Not found error' }],
        timestamp: '2026-02-18T15:30:00Z'
      };

      const rejectionWithAllowedError = {
        id: 126,
        fiberId: 'fiber-uuid-126',
        updateType: 'CreateStateMachine',
        errors: [{ code: 'InvalidOwner', message: 'Owner error' }],
        timestamp: '2026-02-18T15:30:00Z'
      };

      await notificationService.notifyRejection(rejectionWithFilteredError);
      expect(mockNotification).not.toHaveBeenCalled();

      await notificationService.notifyRejection(rejectionWithAllowedError);
      expect(mockNotification).toHaveBeenCalledWith(
        'Transaction Rejected',
        expect.objectContaining({
          tag: 'rejection-126'
        })
      );
    });

    it('should handle multiple notification channels', async () => {
      await notificationService.updateNotificationPreferences({
        enabled: true,
        frequency: 'immediate',
        channels: ['browser', 'email', 'webhook'],
        quietHours: { start: '22:00', end: '08:00' },
        errorTypes: ['all']
      });

      const mockRejection = {
        id: 127,
        fiberId: 'fiber-uuid-127',
        updateType: 'CreateStateMachine',
        errors: [{ code: 'InvalidOwner', message: 'Error' }],
        timestamp: '2026-02-18T15:30:00Z'
      };

      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ sent: true }) });

      await notificationService.notifyRejection(mockRejection);

      // Should send browser notification
      expect(mockNotification).toHaveBeenCalled();

      // Should send email notification
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/email'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('rejection-127')
        })
      );

      // Should send webhook notification
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/webhook'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('rejection-127')
        })
      );
    });
  });

  describe('Notification Frequency Management', () => {
    it('should batch notifications when frequency is set to hourly', async () => {
      await notificationService.updateNotificationPreferences({
        enabled: true,
        frequency: 'hourly',
        channels: ['browser'],
        quietHours: { start: '22:00', end: '08:00' },
        errorTypes: ['all']
      });

      const mockRejections = Array.from({ length: 5 }, (_, i) => ({
        id: 200 + i,
        fiberId: `fiber-uuid-${200 + i}`,
        updateType: 'CreateStateMachine',
        errors: [{ code: 'InvalidOwner', message: 'Error' }],
        timestamp: new Date().toISOString()
      }));

      // Send multiple rejections quickly
      for (const rejection of mockRejections) {
        await notificationService.notifyRejection(rejection);
      }

      // Should not send individual notifications immediately
      expect(mockNotification).not.toHaveBeenCalled();

      // Should batch them for later delivery
      const batchedNotifications = await notificationService.getBatchedNotifications();
      expect(batchedNotifications).toHaveLength(1);
      expect(batchedNotifications[0].count).toBe(5);
    });

    it('should send daily summary when frequency is set to daily', async () => {
      await notificationService.updateNotificationPreferences({
        enabled: true,
        frequency: 'daily',
        channels: ['email'],
        quietHours: { start: '22:00', end: '08:00' },
        errorTypes: ['all']
      });

      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ sent: true }) });

      await notificationService.sendDailySummary();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/daily-summary'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('daily_summary')
        })
      );
    });

    it('should not exceed rate limits for notifications', async () => {
      await notificationService.updateNotificationPreferences({
        enabled: true,
        frequency: 'immediate',
        channels: ['browser'],
        quietHours: { start: '22:00', end: '08:00' },
        errorTypes: ['all']
      });

      // Send many rejections rapidly
      const manyRejections = Array.from({ length: 50 }, (_, i) => ({
        id: 300 + i,
        fiberId: `fiber-uuid-${300 + i}`,
        updateType: 'CreateStateMachine',
        errors: [{ code: 'InvalidOwner', message: 'Error' }],
        timestamp: new Date().toISOString()
      }));

      for (const rejection of manyRejections) {
        await notificationService.notifyRejection(rejection);
      }

      // Should respect rate limits (e.g., max 10 per minute)
      expect(mockNotification).toHaveBeenCalledTimes(10);
    });
  });

  describe('Notification History and Analytics', () => {
    it('should track notification delivery status', async () => {
      const mockRejection = {
        id: 400,
        fiberId: 'fiber-uuid-400',
        updateType: 'CreateStateMachine',
        errors: [{ code: 'InvalidOwner', message: 'Error' }],
        timestamp: '2026-02-18T15:30:00Z'
      };

      await notificationService.notifyRejection(mockRejection);

      const deliveryStatus = await notificationService.getNotificationStatus(400);
      
      expect(deliveryStatus.sent).toBe(true);
      expect(deliveryStatus.channels).toEqual(['browser']);
      expect(deliveryStatus.timestamp).toBeDefined();
      expect(deliveryStatus.acknowledged).toBe(false);
    });

    it('should provide notification analytics', async () => {
      const analytics = await notificationService.getNotificationAnalytics();

      expect(analytics.totalSent).toBeGreaterThanOrEqual(0);
      expect(analytics.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(analytics.acknowledgmentRate).toBeGreaterThanOrEqual(0);
      expect(analytics.channelBreakdown).toBeDefined();
      expect(analytics.errorTypeBreakdown).toBeDefined();
    });

    it('should allow users to mark notifications as read', async () => {
      await notificationService.markAsRead(400);

      const status = await notificationService.getNotificationStatus(400);
      expect(status.acknowledged).toBe(true);
      expect(status.acknowledgedAt).toBeDefined();
    });

    it('should support bulk operations on notifications', async () => {
      const notificationIds = [401, 402, 403, 404, 405];

      await notificationService.markMultipleAsRead(notificationIds);

      for (const id of notificationIds) {
        const status = await notificationService.getNotificationStatus(id);
        expect(status.acknowledged).toBe(true);
      }
    });
  });

  describe('Browser Notification Permissions', () => {
    it('should request notification permissions on first use', async () => {
      mockNotificationPermission.mockReturnValue('default');
      mockNotification.requestPermission.mockResolvedValue('granted');

      await notificationService.ensureNotificationPermissions();

      expect(mockNotification.requestPermission).toHaveBeenCalled();
    });

    it('should handle denied notification permissions gracefully', async () => {
      mockNotificationPermission.mockReturnValue('denied');

      await notificationService.ensureNotificationPermissions();

      // Should fall back to other channels and not crash
      const preferences = await notificationService.getNotificationPreferences();
      expect(preferences.channels).not.toContain('browser');
    });

    it('should show permission status in preferences UI', async () => {
      mockNotificationPermission.mockReturnValue('denied');

      const permissionStatus = await notificationService.getBrowserNotificationStatus();

      expect(permissionStatus.permission).toBe('denied');
      expect(permissionStatus.supported).toBe(true);
      expect(permissionStatus.canRequest).toBe(false);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network failures when sending notifications', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const mockRejection = {
        id: 500,
        fiberId: 'fiber-uuid-500',
        updateType: 'CreateStateMachine',
        errors: [{ code: 'InvalidOwner', message: 'Error' }],
        timestamp: '2026-02-18T15:30:00Z'
      };

      // Should not throw error, but handle gracefully
      await expect(notificationService.notifyRejection(mockRejection))
        .resolves
        .not.toThrow();

      // Should queue for retry
      const failedNotifications = await notificationService.getFailedNotifications();
      expect(failedNotifications).toHaveLength(1);
      expect(failedNotifications[0].id).toBe(500);
    });

    it('should retry failed notifications', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ sent: true }) });

      await notificationService.retryFailedNotifications();

      // Should retry and succeed
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      const failedNotifications = await notificationService.getFailedNotifications();
      expect(failedNotifications).toHaveLength(0);
    });

    it('should implement exponential backoff for retries', async () => {
      const retryDelays: number[] = [];
      
      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback: Function, delay: number) => {
        retryDelays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      mockFetch.mockRejectedValue(new Error('Persistent error'));

      await notificationService.retryWithBackoff(500, 3);

      // Should use exponential backoff: 1s, 2s, 4s
      expect(retryDelays).toEqual([1000, 2000, 4000]);

      global.setTimeout = originalSetTimeout;
    });
  });
});
package com.ai.taskboard.service;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.notification.NotificationVO;

public interface NotificationService {
    void sendNotification(Long userId, String type, String title, String content, Long relatedId, String relatedType);
    PageResult<NotificationVO> listNotifications(Long userId, Integer page, Integer size);
    Long getUnreadCount(Long userId);
    void markAsRead(Long userId, Long notificationId);
    void markAllAsRead(Long userId);
}

package com.ai.taskboard.service.impl;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.notification.NotificationVO;
import com.ai.taskboard.entity.Notification;
import com.ai.taskboard.entity.UserPreference;
import com.ai.taskboard.mapper.NotificationMapper;
import com.ai.taskboard.mapper.UserPreferenceMapper;
import com.ai.taskboard.service.NotificationService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationMapper notificationMapper;
    private final UserPreferenceMapper userPreferenceMapper;
    private final JavaMailSender mailSender;

    @Override
    public void sendNotification(Long userId, String type, String title, String content, Long relatedId, String relatedType) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setRelatedId(relatedId);
        notification.setRelatedType(relatedType);
        notification.setIsRead(0);
        notificationMapper.insert(notification);

        UserPreference preference = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>().eq(UserPreference::getUserId, userId));
        if (preference != null && preference.getEmailNotification() == 1) {
            boolean shouldSend = switch (type) {
                case "DEADLINE_REMINDER" -> preference.getDeadlineReminder() == 1;
                case "OVERDUE_WARNING" -> preference.getOverdueWarning() == 1;
                case "STATUS_CHANGE" -> preference.getStatusChangeNotify() == 1;
                case "MENTION" -> preference.getMentionNotify() == 1;
                case "MEMBER_CHANGE" -> preference.getMemberChangeNotify() == 1;
                default -> false;
            };
            if (shouldSend) {
                try {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setTo("user@example.com");
                    message.setSubject(title);
                    message.setText(content);
                    mailSender.send(message);
                } catch (Exception ignored) {}
            }
        }
    }

    @Override
    public PageResult<NotificationVO> listNotifications(Long userId, Integer page, Integer size) {
        Page<Notification> notifPage = notificationMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .orderByDesc(Notification::getCreatedAt));

        List<NotificationVO> vos = notifPage.getRecords().stream().map(n -> NotificationVO.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .content(n.getContent())
                .relatedId(n.getRelatedId())
                .relatedType(n.getRelatedType())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build()).toList();

        return new PageResult<>(vos, notifPage.getTotal(), (int) notifPage.getPages());
    }

    @Override
    public Long getUnreadCount(Long userId) {
        return notificationMapper.selectCount(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .eq(Notification::getIsRead, 0));
    }

    @Override
    public void markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationMapper.selectById(notificationId);
        if (notification != null && notification.getUserId().equals(userId)) {
            notification.setIsRead(1);
            notificationMapper.updateById(notification);
        }
    }

    @Override
    public void markAllAsRead(Long userId) {
        List<Notification> unreadList = notificationMapper.selectList(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .eq(Notification::getIsRead, 0));
        for (Notification n : unreadList) {
            n.setIsRead(1);
            notificationMapper.updateById(n);
        }
    }
}

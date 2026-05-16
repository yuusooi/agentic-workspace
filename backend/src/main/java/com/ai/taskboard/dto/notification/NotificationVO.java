package com.ai.taskboard.dto.notification;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationVO {
    private Long id;
    private String type;
    private String title;
    private String content;
    private Long relatedId;
    private String relatedType;
    private Integer isRead;
    private LocalDateTime createdAt;
}

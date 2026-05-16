package com.ai.taskboard.dto.task;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TaskVO {
    private Long id;
    private Long projectId;
    private Long columnId;
    private String columnName;
    private String title;
    private String description;
    private String priority;
    private String status;
    private Integer sortOrder;
    private LocalDate dueDate;
    private Long creatorId;
    private String creatorName;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<AssigneeInfo> assignees;
    private List<TagInfo> tags;

    @Data
    @Builder
    public static class AssigneeInfo {
        private Long userId;
        private String nickname;
        private String avatar;
    }

    @Data
    @Builder
    public static class TagInfo {
        private Long id;
        private String name;
        private String color;
    }
}

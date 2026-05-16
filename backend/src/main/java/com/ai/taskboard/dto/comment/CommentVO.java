package com.ai.taskboard.dto.comment;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CommentVO {
    private Long id;
    private Long taskId;
    private String content;
    private Long authorId;
    private String authorName;
    private String authorAvatar;
    private Long parentId;
    private LocalDateTime createdAt;
    private List<CommentVO> replies;
}

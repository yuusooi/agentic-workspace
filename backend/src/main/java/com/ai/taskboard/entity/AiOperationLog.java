package com.ai.taskboard.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("ai_operation_log")
public class AiOperationLog implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long projectId;
    private String prompt;
    private String aiThinking;
    private String toolCalls;
    private String aiOutput;
    private String diffPreview;
    private String userAction;
    private String executedAction;
    private String source;
    private LocalDateTime createdAt;
}

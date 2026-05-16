package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("task_status_history")
public class TaskStatusHistory extends BaseEntity {

    private Long taskId;
    private String oldStatus;
    private String newStatus;
    private Long changedBy;
    private LocalDateTime changedAt;
}

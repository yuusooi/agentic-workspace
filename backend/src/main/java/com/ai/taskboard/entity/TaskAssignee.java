package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("task_assignee")
public class TaskAssignee extends BaseEntity {

    private Long taskId;
    private Long userId;
    private LocalDateTime assignedAt;
}

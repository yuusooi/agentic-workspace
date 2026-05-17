package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("task_metrics")
public class TaskMetrics extends BaseEntity {
    private Long projectId;
    private String tag;
    private BigDecimal avgEstimatedHours;
    private BigDecimal avgActualHours;
    private BigDecimal completionRate;
    private Integer sampleCount;
}

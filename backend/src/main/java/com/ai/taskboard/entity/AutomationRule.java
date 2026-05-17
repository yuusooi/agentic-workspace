package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("automation_rule")
public class AutomationRule extends BaseEntity {
    private Long projectId;
    private String name;
    private String triggerType;
    private String triggerConfig;
    private String conditions;
    private String actions;
    private Integer enabled;
    private Integer consecutiveFailures;
    private Long createdBy;
}

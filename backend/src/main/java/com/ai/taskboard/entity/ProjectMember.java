package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("project_member")
public class ProjectMember extends BaseEntity {

    private Long projectId;
    private Long userId;
    private String role;
    private LocalDateTime joinedAt;
}

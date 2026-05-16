package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("user")
public class User extends BaseEntity {

    private String email;
    private String password;
    private String nickname;
    private String avatar;
    private String role;
    private Integer status;
    private Integer canCreateProject;
    private Integer loginFailCount;
    private LocalDateTime lockTime;
}

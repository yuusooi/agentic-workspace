package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("user_preference")
public class UserPreference extends BaseEntity {

    private Long userId;
    private Integer emailNotification;
    private Integer deadlineReminder;
    private Integer overdueWarning;
    private Integer statusChangeNotify;
    private Integer mentionNotify;
    private Integer memberChangeNotify;
}

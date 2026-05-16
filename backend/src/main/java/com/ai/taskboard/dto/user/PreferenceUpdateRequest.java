package com.ai.taskboard.dto.user;

import lombok.Data;

@Data
public class PreferenceUpdateRequest {
    private Integer emailNotification;
    private Integer deadlineReminder;
    private Integer overdueWarning;
    private Integer statusChangeNotify;
    private Integer mentionNotify;
    private Integer memberChangeNotify;
}

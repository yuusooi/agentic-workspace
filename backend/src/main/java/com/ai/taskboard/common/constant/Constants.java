package com.ai.taskboard.common.constant;

public class Constants {

    private Constants() {}

    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String AUTH_HEADER = "Authorization";
    public static final String REDIS_ACCESS_TOKEN_PREFIX = "token:access:";
    public static final String REDIS_REFRESH_TOKEN_PREFIX = "token:refresh:";
    public static final String REDIS_VERIFY_CODE_PREFIX = "verify:code:";
    public static final String REDIS_LOGIN_FAIL_PREFIX = "login:fail:";
    public static final String REDIS_LOCK_PREFIX = "login:lock:";

    public static final int MAX_LOGIN_FAIL_COUNT = 5;
    public static final long LOCK_DURATION_MINUTES = 15;

    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_USER = "USER";
    public static final String PROJECT_ROLE_OWNER = "OWNER";
    public static final String PROJECT_ROLE_MEMBER = "MEMBER";

    public static final String VISIBILITY_PUBLIC = "PUBLIC";
    public static final String VISIBILITY_PRIVATE = "PRIVATE";

    public static final String STATUS_TODO = "TODO";
    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_DONE = "DONE";

    public static final String PRIORITY_LOW = "LOW";
    public static final String PRIORITY_MEDIUM = "MEDIUM";
    public static final String PRIORITY_HIGH = "HIGH";
    public static final String PRIORITY_URGENT = "URGENT";

    public static final String NOTIFY_DEADLINE_REMINDER = "DEADLINE_REMINDER";
    public static final String NOTIFY_OVERDUE_WARNING = "OVERDUE_WARNING";
    public static final String NOTIFY_STATUS_CHANGE = "STATUS_CHANGE";
    public static final String NOTIFY_MENTION = "MENTION";
    public static final String NOTIFY_MEMBER_CHANGE = "MEMBER_CHANGE";
}

package com.ai.taskboard.common.result;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ResultCode {

    SUCCESS(200, "操作成功"),
    FAIL(500, "操作失败"),
    PARAM_ERROR(400, "参数校验失败"),
    UNAUTHORIZED(401, "未授权"),
    FORBIDDEN(403, "禁止访问"),
    NOT_FOUND(404, "资源不存在"),
    INTERNAL_ERROR(500, "系统内部错误"),
    ACCOUNT_LOCKED(4001, "账号已被锁定"),
    LOGIN_FAIL(4002, "登录失败"),
    TOKEN_EXPIRED(4003, "Token已过期"),
    TOKEN_INVALID(4004, "Token无效"),
    EMAIL_EXISTS(4005, "邮箱已存在"),
    VERIFY_CODE_ERROR(4006, "验证码错误"),
    NOT_PROJECT_MEMBER(4007, "非项目成员"),
    PROJECT_CREATE_DENIED(4008, "无项目创建权限");

    private final int code;
    private final String message;
}

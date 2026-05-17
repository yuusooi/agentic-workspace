package com.ai.taskboard.service;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.admin.AdminUserUpdateRequest;
import com.ai.taskboard.dto.admin.AdminUserVO;
import com.ai.taskboard.dto.project.ProjectVO;

public interface AdminService {
    PageResult<AdminUserVO> listUsers(Integer page, Integer size, String keyword);
    AdminUserVO updateUser(Long userId, AdminUserUpdateRequest request);
    PageResult<ProjectVO> listAllProjects(Integer page, Integer size);
}

package com.ai.taskboard.service;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.project.*;

import java.util.List;

public interface ProjectService {
    ProjectVO createProject(Long userId, ProjectCreateRequest request);
    ProjectVO updateProject(Long userId, Long projectId, ProjectUpdateRequest request);
    void deleteProject(Long userId, Long projectId);
    ProjectVO getProject(Long userId, Long projectId);
    PageResult<ProjectVO> listMyProjects(Long userId, Integer page, Integer size);
    PageResult<ProjectVO> listPublicProjects(Integer page, Integer size);
    void inviteMember(Long userId, Long projectId, MemberInviteRequest request);
    void removeMember(Long userId, Long projectId, Long memberUserId);
    void updateMemberRole(Long userId, Long projectId, Long memberUserId, String role);
    PageResult<ProjectMemberVO> listMembers(Long userId, Long projectId, Integer page, Integer size);
    List<ProjectMemberVO> searchMembers(Long userId, Long projectId, String keyword);
}

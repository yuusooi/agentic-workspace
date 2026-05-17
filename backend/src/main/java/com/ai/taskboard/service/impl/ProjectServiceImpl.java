package com.ai.taskboard.service.impl;

import com.ai.taskboard.common.constant.Constants;
import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.project.*;
import com.ai.taskboard.entity.BoardColumn;
import com.ai.taskboard.entity.Project;
import com.ai.taskboard.entity.ProjectMember;
import com.ai.taskboard.entity.User;
import com.ai.taskboard.mapper.BoardColumnMapper;
import com.ai.taskboard.mapper.ProjectMapper;
import com.ai.taskboard.mapper.ProjectMemberMapper;
import com.ai.taskboard.mapper.UserMapper;
import com.ai.taskboard.service.OperationLogService;
import com.ai.taskboard.service.ProjectService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectMapper projectMapper;
    private final ProjectMemberMapper projectMemberMapper;
    private final UserMapper userMapper;
    private final BoardColumnMapper boardColumnMapper;
    private final OperationLogService operationLogService;

    private void checkProjectOwner(Long userId, Long projectId) {
        String role = UserContext.getUserRole();
        if (Constants.ROLE_ADMIN.equals(role)) return;
        ProjectMember member = projectMemberMapper.selectOne(
                new LambdaQueryWrapper<ProjectMember>()
                        .eq(ProjectMember::getProjectId, projectId)
                        .eq(ProjectMember::getUserId, userId));
        if (member == null || !Constants.PROJECT_ROLE_OWNER.equals(member.getRole())) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }
    }

    private void checkProjectMember(Long userId, Long projectId) {
        String role = UserContext.getUserRole();
        if (Constants.ROLE_ADMIN.equals(role)) return;
        ProjectMember member = projectMemberMapper.selectOne(
                new LambdaQueryWrapper<ProjectMember>()
                        .eq(ProjectMember::getProjectId, projectId)
                        .eq(ProjectMember::getUserId, userId));
        if (member == null) {
            throw new BusinessException(ResultCode.NOT_PROJECT_MEMBER);
        }
    }

    private ProjectVO convertToVO(Project project, Long currentUserId) {
        String myRole = null;
        if (currentUserId != null) {
            String role = UserContext.getUserRole();
            if (Constants.ROLE_ADMIN.equals(role)) {
                myRole = Constants.PROJECT_ROLE_OWNER;
            } else {
                ProjectMember member = projectMemberMapper.selectOne(
                        new LambdaQueryWrapper<ProjectMember>()
                                .eq(ProjectMember::getProjectId, project.getId())
                                .eq(ProjectMember::getUserId, currentUserId));
                myRole = member != null ? member.getRole() : null;
            }
        }

        User owner = userMapper.selectById(project.getOwnerId());
        return ProjectVO.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .visibility(project.getVisibility())
                .ownerId(project.getOwnerId())
                .ownerName(owner != null ? owner.getNickname() : null)
                .myRole(myRole)
                .createdAt(project.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public ProjectVO createProject(Long userId, ProjectCreateRequest request) {
        User user = userMapper.selectById(userId);
        if (!Constants.ROLE_ADMIN.equals(user.getRole()) && user.getCanCreateProject() != 1) {
            throw new BusinessException(ResultCode.PROJECT_CREATE_DENIED);
        }

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setVisibility(request.getVisibility());
        project.setOwnerId(userId);
        projectMapper.insert(project);

        ProjectMember ownerMember = new ProjectMember();
        ownerMember.setProjectId(project.getId());
        ownerMember.setUserId(userId);
        ownerMember.setRole(Constants.PROJECT_ROLE_OWNER);
        ownerMember.setJoinedAt(LocalDateTime.now());
        projectMemberMapper.insert(ownerMember);

        BoardColumn todoCol = new BoardColumn();
        todoCol.setProjectId(project.getId());
        todoCol.setName("待办");
        todoCol.setSortOrder(0);
        todoCol.setStatusMapping(Constants.STATUS_TODO);
        boardColumnMapper.insert(todoCol);

        BoardColumn inProgressCol = new BoardColumn();
        inProgressCol.setProjectId(project.getId());
        inProgressCol.setName("进行中");
        inProgressCol.setSortOrder(1);
        inProgressCol.setStatusMapping(Constants.STATUS_IN_PROGRESS);
        boardColumnMapper.insert(inProgressCol);

        BoardColumn doneCol = new BoardColumn();
        doneCol.setProjectId(project.getId());
        doneCol.setName("已完成");
        doneCol.setSortOrder(2);
        doneCol.setStatusMapping(Constants.STATUS_DONE);
        boardColumnMapper.insert(doneCol);
        operationLogService.log(userId, "PROJECT", "CREATE", project.getId(), "创建项目：" + project.getName(), null);

        return convertToVO(project, userId);
    }

    @Override
    public ProjectVO updateProject(Long userId, Long projectId, ProjectUpdateRequest request) {
        checkProjectOwner(userId, projectId);
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getVisibility() != null) project.setVisibility(request.getVisibility());
        projectMapper.updateById(project);

        return convertToVO(project, userId);
    }

    @Override
    @Transactional
    public void deleteProject(Long userId, Long projectId) {
        checkProjectOwner(userId, projectId);
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        operationLogService.log(userId, "PROJECT", "DELETE", projectId, "删除项目：" + project.getName(), null);
        projectMapper.deleteById(projectId);
    }

    @Override
    public ProjectVO getProject(Long userId, Long projectId) {
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        if (Constants.VISIBILITY_PRIVATE.equals(project.getVisibility())) {
            if (userId != null) {
                checkProjectMember(userId, projectId);
            } else {
                throw new BusinessException(ResultCode.NOT_PROJECT_MEMBER);
            }
        }

        return convertToVO(project, userId);
    }

    @Override
    public PageResult<ProjectVO> listMyProjects(Long userId, Integer page, Integer size) {
        Page<ProjectMember> memberPage = projectMemberMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<ProjectMember>().eq(ProjectMember::getUserId, userId));

        List<ProjectVO> vos = memberPage.getRecords().stream().map(member -> {
            Project project = projectMapper.selectById(member.getProjectId());
            return project != null ? convertToVO(project, userId) : null;
        }).filter(vo -> vo != null).toList();

        return new PageResult<>(vos, memberPage.getTotal(), (int) memberPage.getPages());
    }

    @Override
    public PageResult<ProjectVO> listPublicProjects(Integer page, Integer size) {
        Page<Project> projectPage = projectMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<Project>().eq(Project::getVisibility, Constants.VISIBILITY_PUBLIC));

        List<ProjectVO> vos = projectPage.getRecords().stream()
                .map(p -> convertToVO(p, null))
                .toList();

        return new PageResult<>(vos, projectPage.getTotal(), (int) projectPage.getPages());
    }

    @Override
    @Transactional
    public void inviteMember(Long userId, Long projectId, MemberInviteRequest request) {
        checkProjectOwner(userId, projectId);

        User inviteUser = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, request.getUsername()));
        if (inviteUser == null) {
            throw new BusinessException("用户不存在");
        }

        Long count = projectMemberMapper.selectCount(
                new LambdaQueryWrapper<ProjectMember>()
                        .eq(ProjectMember::getProjectId, projectId)
                        .eq(ProjectMember::getUserId, inviteUser.getId()));
        if (count > 0) {
            throw new BusinessException("用户已是项目成员");
        }

        ProjectMember member = new ProjectMember();
        member.setProjectId(projectId);
        member.setUserId(inviteUser.getId());
        member.setRole(request.getRole());
        member.setJoinedAt(LocalDateTime.now());
        projectMemberMapper.insert(member);
        operationLogService.log(userId, "MEMBER", "INVITE", projectId, "邀请" + inviteUser.getNickname() + "加入项目", null);
    }

    @Override
    @Transactional
    public void removeMember(Long userId, Long projectId, Long memberUserId) {
        checkProjectOwner(userId, projectId);

        if (userId.equals(memberUserId)) {
            throw new BusinessException("不能移除自己");
        }

        User removedUser = userMapper.selectById(memberUserId);
        operationLogService.log(userId, "MEMBER", "REMOVE", projectId, "移除成员" + (removedUser != null ? removedUser.getNickname() : ""), null);
        projectMemberMapper.delete(
                new LambdaQueryWrapper<ProjectMember>()
                        .eq(ProjectMember::getProjectId, projectId)
                        .eq(ProjectMember::getUserId, memberUserId));
    }

    @Override
    @Transactional
    public void updateMemberRole(Long userId, Long projectId, Long memberUserId, String role) {
        checkProjectOwner(userId, projectId);

        ProjectMember member = projectMemberMapper.selectOne(
                new LambdaQueryWrapper<ProjectMember>()
                        .eq(ProjectMember::getProjectId, projectId)
                        .eq(ProjectMember::getUserId, memberUserId));
        if (member == null) {
            throw new BusinessException(ResultCode.NOT_PROJECT_MEMBER);
        }

        member.setRole(role);
        projectMemberMapper.updateById(member);
        operationLogService.log(userId, "MEMBER", "ROLE_CHANGE", projectId, "修改成员角色为" + role, null);
    }

    @Override
    public PageResult<ProjectMemberVO> listMembers(Long userId, Long projectId, Integer page, Integer size) {
        checkProjectMember(userId, projectId);

        Page<ProjectMember> memberPage = projectMemberMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<ProjectMember>().eq(ProjectMember::getProjectId, projectId));

        List<ProjectMemberVO> vos = memberPage.getRecords().stream().map(member -> {
            User user = userMapper.selectById(member.getUserId());
            return ProjectMemberVO.builder()
                    .id(member.getId())
                    .userId(member.getUserId())
                    .username(user != null ? user.getUsername() : null)
                    .email(user != null ? user.getEmail() : null)
                    .nickname(user != null ? user.getNickname() : null)
                    .avatar(user != null ? user.getAvatar() : null)
                    .role(member.getRole())
                    .joinedAt(member.getJoinedAt())
                    .build();
        }).toList();

        return new PageResult<>(vos, memberPage.getTotal(), (int) memberPage.getPages());
    }

    @Override
    public List<ProjectMemberVO> searchMembers(Long userId, Long projectId, String keyword) {
        checkProjectMember(userId, projectId);

        List<ProjectMember> members = projectMemberMapper.selectList(
                new LambdaQueryWrapper<ProjectMember>().eq(ProjectMember::getProjectId, projectId));

        return members.stream().map(member -> {
            User user = userMapper.selectById(member.getUserId());
            if (user == null) return null;
            if (keyword != null && !keyword.isEmpty()) {
                if (!user.getEmail().contains(keyword) && !user.getNickname().contains(keyword)) {
                    return null;
                }
            }
            return ProjectMemberVO.builder()
                    .id(member.getId())
                    .userId(member.getUserId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .nickname(user.getNickname())
                    .avatar(user.getAvatar())
                    .role(member.getRole())
                    .joinedAt(member.getJoinedAt())
                    .build();
        }).filter(vo -> vo != null).toList();
    }
}

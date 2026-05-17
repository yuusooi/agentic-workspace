package com.ai.taskboard.service.impl;

import com.ai.taskboard.common.constant.Constants;
import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.dto.admin.AdminUserUpdateRequest;
import com.ai.taskboard.dto.admin.AdminUserVO;
import com.ai.taskboard.dto.project.ProjectVO;
import com.ai.taskboard.entity.Project;
import com.ai.taskboard.entity.User;
import com.ai.taskboard.mapper.ProjectMapper;
import com.ai.taskboard.mapper.UserMapper;
import com.ai.taskboard.service.AdminService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserMapper userMapper;
    private final ProjectMapper projectMapper;

    @Override
    public PageResult<AdminUserVO> listUsers(Integer page, Integer size, String keyword) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like(User::getEmail, keyword).or().like(User::getNickname, keyword);
        }
        wrapper.orderByDesc(User::getCreatedAt);

        Page<User> userPage = userMapper.selectPage(new Page<>(page, size), wrapper);
        List<AdminUserVO> vos = userPage.getRecords().stream().map(user -> AdminUserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .status(user.getStatus())
                .canCreateProject(user.getCanCreateProject())
                .loginFailCount(user.getLoginFailCount())
                .lockTime(user.getLockTime())
                .createdAt(user.getCreatedAt())
                .build()).toList();

        return new PageResult<>(vos, userPage.getTotal(), (int) userPage.getPages());
    }

    @Override
    public AdminUserVO updateUser(Long userId, AdminUserUpdateRequest request) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        if (request.getRole() != null) user.setRole(request.getRole());
        if (request.getStatus() != null) user.setStatus(request.getStatus());
        if (request.getCanCreateProject() != null) user.setCanCreateProject(request.getCanCreateProject());
        userMapper.updateById(user);

        return AdminUserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .status(user.getStatus())
                .canCreateProject(user.getCanCreateProject())
                .loginFailCount(user.getLoginFailCount())
                .lockTime(user.getLockTime())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Override
    public PageResult<ProjectVO> listAllProjects(Integer page, Integer size) {
        Page<Project> projectPage = projectMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<Project>().orderByDesc(Project::getCreatedAt));
        List<ProjectVO> vos = projectPage.getRecords().stream().map(p -> {
            User owner = userMapper.selectById(p.getOwnerId());
            return ProjectVO.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .description(p.getDescription())
                    .visibility(p.getVisibility())
                    .ownerId(p.getOwnerId())
                    .ownerName(owner != null ? owner.getNickname() : null)
                    .myRole(Constants.ROLE_ADMIN)
                    .createdAt(p.getCreatedAt())
                    .build();
        }).toList();
        return new PageResult<>(vos, projectPage.getTotal(), (int) projectPage.getPages());
    }
}

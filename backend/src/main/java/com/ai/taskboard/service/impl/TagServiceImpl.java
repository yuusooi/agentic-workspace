package com.ai.taskboard.service.impl;

import com.ai.taskboard.common.constant.Constants;
import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.tag.TagCreateRequest;
import com.ai.taskboard.dto.tag.TagVO;
import com.ai.taskboard.entity.ProjectMember;
import com.ai.taskboard.entity.Tag;
import com.ai.taskboard.entity.TaskTag;
import com.ai.taskboard.mapper.ProjectMemberMapper;
import com.ai.taskboard.mapper.TagMapper;
import com.ai.taskboard.mapper.TaskTagMapper;
import com.ai.taskboard.service.TagService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {

    private final TagMapper tagMapper;
    private final TaskTagMapper taskTagMapper;
    private final ProjectMemberMapper projectMemberMapper;

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

    private void checkProjectOwnerOrAdmin(Long userId, Long projectId) {
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

    @Override
    public List<TagVO> listTags(Long userId, Long projectId) {
        checkProjectMember(userId, projectId);
        List<Tag> tags = tagMapper.selectList(
                new LambdaQueryWrapper<Tag>().eq(Tag::getProjectId, projectId));
        return tags.stream().map(tag -> TagVO.builder()
                .id(tag.getId())
                .name(tag.getName())
                .color(tag.getColor())
                .build()).toList();
    }

    @Override
    public TagVO createTag(Long userId, Long projectId, TagCreateRequest request) {
        checkProjectMember(userId, projectId);
        Tag tag = new Tag();
        tag.setProjectId(projectId);
        tag.setName(request.getName());
        tag.setColor(request.getColor());
        tagMapper.insert(tag);
        return TagVO.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build();
    }

    @Override
    public void deleteTag(Long userId, Long tagId) {
        Tag tag = tagMapper.selectById(tagId);
        if (tag == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectOwnerOrAdmin(userId, tag.getProjectId());
        taskTagMapper.delete(new LambdaQueryWrapper<TaskTag>().eq(TaskTag::getTagId, tagId));
        tagMapper.deleteById(tagId);
    }
}

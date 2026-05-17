package com.ai.taskboard.service.impl;

import com.ai.taskboard.common.constant.Constants;
import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.column.*;
import com.ai.taskboard.entity.BoardColumn;
import com.ai.taskboard.entity.Project;
import com.ai.taskboard.entity.ProjectMember;
import com.ai.taskboard.entity.Task;
import com.ai.taskboard.mapper.BoardColumnMapper;
import com.ai.taskboard.mapper.ProjectMapper;
import com.ai.taskboard.mapper.ProjectMemberMapper;
import com.ai.taskboard.mapper.TaskMapper;
import com.ai.taskboard.service.BoardColumnService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BoardColumnServiceImpl implements BoardColumnService {

    private final BoardColumnMapper boardColumnMapper;
    private final ProjectMemberMapper projectMemberMapper;
    private final ProjectMapper projectMapper;
    private final TaskMapper taskMapper;

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

    @Override
    public List<BoardColumnVO> getBoard(Long userId, Long projectId) {
        if (userId != null) {
            String role = UserContext.getUserRole();
            if (!Constants.ROLE_ADMIN.equals(role)) {
                ProjectMember member = projectMemberMapper.selectOne(
                        new LambdaQueryWrapper<ProjectMember>()
                                .eq(ProjectMember::getProjectId, projectId)
                                .eq(ProjectMember::getUserId, userId));
                if (member == null) {
                    Project project = projectMapper.selectById(projectId);
                    if (project == null || !Constants.VISIBILITY_PUBLIC.equals(project.getVisibility())) {
                        throw new BusinessException(ResultCode.NOT_PROJECT_MEMBER);
                    }
                }
            }
        } else {
            Project project = projectMapper.selectById(projectId);
            if (project == null || !Constants.VISIBILITY_PUBLIC.equals(project.getVisibility())) {
                throw new BusinessException(ResultCode.NOT_PROJECT_MEMBER);
            }
        }

        List<BoardColumn> columns = boardColumnMapper.selectList(
                new LambdaQueryWrapper<BoardColumn>()
                        .eq(BoardColumn::getProjectId, projectId)
                        .orderByAsc(BoardColumn::getSortOrder));

        return columns.stream().map(col -> BoardColumnVO.builder()
                .id(col.getId())
                .name(col.getName())
                .sortOrder(col.getSortOrder())
                .statusMapping(col.getStatusMapping())
                .createdAt(col.getCreatedAt())
                .build()).toList();
    }

    @Override
    public BoardColumnVO createColumn(Long userId, Long projectId, ColumnCreateRequest request) {
        checkProjectOwnerOrAdmin(userId, projectId);

        Long maxSort = boardColumnMapper.selectCount(
                new LambdaQueryWrapper<BoardColumn>().eq(BoardColumn::getProjectId, projectId));

        BoardColumn column = new BoardColumn();
        column.setProjectId(projectId);
        column.setName(request.getName());
        column.setSortOrder(maxSort.intValue());
        column.setStatusMapping(request.getStatusMapping());
        boardColumnMapper.insert(column);

        return BoardColumnVO.builder()
                .id(column.getId())
                .name(column.getName())
                .sortOrder(column.getSortOrder())
                .statusMapping(column.getStatusMapping())
                .createdAt(column.getCreatedAt())
                .build();
    }

    @Override
    public BoardColumnVO updateColumn(Long userId, Long columnId, ColumnUpdateRequest request) {
        BoardColumn column = boardColumnMapper.selectById(columnId);
        if (column == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectOwnerOrAdmin(userId, column.getProjectId());

        if (request.getName() != null) column.setName(request.getName());
        if (request.getStatusMapping() != null) column.setStatusMapping(request.getStatusMapping());
        boardColumnMapper.updateById(column);

        return BoardColumnVO.builder()
                .id(column.getId())
                .name(column.getName())
                .sortOrder(column.getSortOrder())
                .statusMapping(column.getStatusMapping())
                .createdAt(column.getCreatedAt())
                .build();
    }

    @Override
    public void deleteColumn(Long userId, Long columnId) {
        BoardColumn column = boardColumnMapper.selectById(columnId);
        if (column == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectOwnerOrAdmin(userId, column.getProjectId());

        Long taskCount = taskMapper.selectCount(
                new LambdaQueryWrapper<Task>().eq(Task::getColumnId, columnId));
        if (taskCount > 0) {
            throw new BusinessException("该列下还有任务，无法删除");
        }

        boardColumnMapper.deleteById(columnId);
    }

    @Override
    @Transactional
    public void sortColumns(Long userId, Long projectId, ColumnSortRequest request) {
        checkProjectOwnerOrAdmin(userId, projectId);

        for (ColumnSortRequest.SortItem item : request.getColumns()) {
            BoardColumn column = boardColumnMapper.selectById(item.getColumnId());
            if (column != null && column.getProjectId().equals(projectId)) {
                column.setSortOrder(item.getSortOrder());
                boardColumnMapper.updateById(column);
            }
        }
    }

    @Override
    @Transactional
    public void sortTasksInColumn(Long userId, Long columnId, List<Long> taskIds) {
        BoardColumn column = boardColumnMapper.selectById(columnId);
        if (column == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectMember(userId, column.getProjectId());

        for (int i = 0; i < taskIds.size(); i++) {
            Task task = taskMapper.selectById(taskIds.get(i));
            if (task != null) {
                task.setSortOrder(i);
                taskMapper.updateById(task);
            }
        }
    }
}

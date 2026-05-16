package com.ai.taskboard.service.impl;

import cn.hutool.core.io.FileUtil;
import com.ai.taskboard.common.constant.Constants;
import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.comment.CommentCreateRequest;
import com.ai.taskboard.dto.comment.CommentVO;
import com.ai.taskboard.dto.task.*;
import com.ai.taskboard.dto.task.TaskVO.AssigneeInfo;
import com.ai.taskboard.dto.task.TaskVO.TagInfo;
import com.ai.taskboard.entity.*;
import com.ai.taskboard.mapper.*;
import com.ai.taskboard.service.NotificationService;
import com.ai.taskboard.service.TaskService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskMapper taskMapper;
    private final TaskAssigneeMapper taskAssigneeMapper;
    private final TaskTagMapper taskTagMapper;
    private final TagMapper tagMapper;
    private final AttachmentMapper attachmentMapper;
    private final CommentMapper commentMapper;
    private final TaskStatusHistoryMapper taskStatusHistoryMapper;
    private final ProjectMemberMapper projectMemberMapper;
    private final UserMapper userMapper;
    private final BoardColumnMapper boardColumnMapper;
    private final NotificationService notificationService;

    @Value("${file.upload-path:./uploads}")
    private String uploadPath;

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

    private boolean isProjectOwnerOrAdmin(Long userId, Long projectId) {
        String role = UserContext.getUserRole();
        if (Constants.ROLE_ADMIN.equals(role)) return true;
        ProjectMember member = projectMemberMapper.selectOne(
                new LambdaQueryWrapper<ProjectMember>()
                        .eq(ProjectMember::getProjectId, projectId)
                        .eq(ProjectMember::getUserId, userId));
        return member != null && Constants.PROJECT_ROLE_OWNER.equals(member.getRole());
    }

    private boolean canEditTask(Long userId, Task task) {
        if (isProjectOwnerOrAdmin(userId, task.getProjectId())) return true;
        if (task.getCreatorId().equals(userId)) return true;
        Long assigneeCount = taskAssigneeMapper.selectCount(
                new LambdaQueryWrapper<TaskAssignee>()
                        .eq(TaskAssignee::getTaskId, task.getId())
                        .eq(TaskAssignee::getUserId, userId));
        return assigneeCount > 0;
    }

    private TaskVO convertToVO(Task task) {
        BoardColumn column = boardColumnMapper.selectById(task.getColumnId());
        User creator = userMapper.selectById(task.getCreatorId());

        List<TaskAssignee> assignees = taskAssigneeMapper.selectList(
                new LambdaQueryWrapper<TaskAssignee>().eq(TaskAssignee::getTaskId, task.getId()));
        List<AssigneeInfo> assigneeInfos = assignees.stream().map(a -> {
            User u = userMapper.selectById(a.getUserId());
            return AssigneeInfo.builder()
                    .userId(a.getUserId())
                    .nickname(u != null ? u.getNickname() : null)
                    .avatar(u != null ? u.getAvatar() : null)
                    .build();
        }).toList();

        List<TaskTag> taskTags = taskTagMapper.selectList(
                new LambdaQueryWrapper<TaskTag>().eq(TaskTag::getTaskId, task.getId()));
        List<TagInfo> tagInfos = taskTags.stream().map(tt -> {
            Tag t = tagMapper.selectById(tt.getTagId());
            return t != null ? TagInfo.builder().id(t.getId()).name(t.getName()).color(t.getColor()).build() : null;
        }).filter(ti -> ti != null).toList();

        return TaskVO.builder()
                .id(task.getId())
                .projectId(task.getProjectId())
                .columnId(task.getColumnId())
                .columnName(column != null ? column.getName() : null)
                .title(task.getTitle())
                .description(task.getDescription())
                .priority(task.getPriority())
                .status(task.getStatus())
                .sortOrder(task.getSortOrder())
                .dueDate(task.getDueDate())
                .creatorId(task.getCreatorId())
                .creatorName(creator != null ? creator.getNickname() : null)
                .version(task.getVersion())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .assignees(assigneeInfos)
                .tags(tagInfos)
                .build();
    }

    @Override
    @Transactional
    public TaskVO createTask(Long userId, TaskCreateRequest request) {
        checkProjectMember(userId, request.getProjectId());

        BoardColumn column = boardColumnMapper.selectById(request.getColumnId());
        String status = column != null ? column.getStatusMapping() : Constants.STATUS_TODO;

        Task task = new Task();
        task.setProjectId(request.getProjectId());
        task.setColumnId(request.getColumnId());
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPriority(request.getPriority());
        task.setStatus(status);
        task.setSortOrder(0);
        task.setDueDate(request.getDueDate());
        task.setCreatorId(userId);
        taskMapper.insert(task);

        if (request.getAssigneeIds() != null) {
            for (Long assigneeId : request.getAssigneeIds()) {
                TaskAssignee assignee = new TaskAssignee();
                assignee.setTaskId(task.getId());
                assignee.setUserId(assigneeId);
                assignee.setAssignedAt(LocalDateTime.now());
                taskAssigneeMapper.insert(assignee);
            }
        }

        if (request.getTagIds() != null) {
            for (Long tagId : request.getTagIds()) {
                TaskTag taskTag = new TaskTag();
                taskTag.setTaskId(task.getId());
                taskTag.setTagId(tagId);
                taskTagMapper.insert(taskTag);
            }
        }

        return convertToVO(task);
    }

    @Override
    @Transactional
    public TaskVO updateTask(Long userId, Long taskId, TaskUpdateRequest request) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (!canEditTask(userId, task)) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getSortOrder() != null) task.setSortOrder(request.getSortOrder());

        if (request.getColumnId() != null) {
            task.setColumnId(request.getColumnId());
            BoardColumn column = boardColumnMapper.selectById(request.getColumnId());
            if (column != null) {
                task.setStatus(column.getStatusMapping());
            }
        }

        taskMapper.updateById(task);
        return convertToVO(task);
    }

    @Override
    @Transactional
    public void deleteTask(Long userId, Long taskId) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (!isProjectOwnerOrAdmin(userId, task.getProjectId())) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }
        taskMapper.deleteById(taskId);
    }

    @Override
    public TaskVO getTask(Long userId, Long taskId) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectMember(userId, task.getProjectId());
        return convertToVO(task);
    }

    @Override
    public PageResult<TaskVO> listTasks(Long userId, TaskQueryRequest request) {
        checkProjectMember(userId, request.getProjectId());

        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<Task>()
                .eq(Task::getProjectId, request.getProjectId());

        if (request.getColumnId() != null) {
            wrapper.eq(Task::getColumnId, request.getColumnId());
        }
        if (request.getStatus() != null) {
            wrapper.eq(Task::getStatus, request.getStatus());
        }
        if (request.getPriority() != null) {
            wrapper.eq(Task::getPriority, request.getPriority());
        }
        if (request.getKeyword() != null && !request.getKeyword().isEmpty()) {
            wrapper.like(Task::getTitle, request.getKeyword());
        }
        if (request.getAssigneeId() != null) {
            List<TaskAssignee> assignees = taskAssigneeMapper.selectList(
                    new LambdaQueryWrapper<TaskAssignee>().eq(TaskAssignee::getUserId, request.getAssigneeId()));
            List<Long> taskIds = assignees.stream().map(TaskAssignee::getTaskId).toList();
            if (taskIds.isEmpty()) {
                return new PageResult<>(List.of(), 0L, 0);
            }
            wrapper.in(Task::getId, taskIds);
        }

        wrapper.orderByAsc(Task::getSortOrder).orderByDesc(Task::getCreatedAt);

        Page<Task> taskPage = taskMapper.selectPage(new Page<>(request.getPage(), request.getSize()), wrapper);
        List<TaskVO> vos = taskPage.getRecords().stream().map(this::convertToVO).toList();

        return new PageResult<>(vos, taskPage.getTotal(), (int) taskPage.getPages());
    }

    @Override
    @Transactional
    public TaskVO updateStatus(Long userId, Long taskId, StatusUpdateRequest request) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (!canEditTask(userId, task)) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }

        String oldStatus = task.getStatus();
        task.setColumnId(request.getColumnId());
        task.setStatus(request.getStatus());
        taskMapper.updateById(task);

        TaskStatusHistory history = new TaskStatusHistory();
        history.setTaskId(taskId);
        history.setOldStatus(oldStatus);
        history.setNewStatus(request.getStatus());
        history.setChangedBy(userId);
        history.setChangedAt(LocalDateTime.now());
        taskStatusHistoryMapper.insert(history);

        List<TaskAssignee> assignees = taskAssigneeMapper.selectList(
                new LambdaQueryWrapper<TaskAssignee>().eq(TaskAssignee::getTaskId, taskId));
        for (TaskAssignee assignee : assignees) {
            if (!assignee.getUserId().equals(userId)) {
                notificationService.sendNotification(
                        assignee.getUserId(),
                        Constants.NOTIFY_STATUS_CHANGE,
                        "任务状态变更",
                        "任务「" + task.getTitle() + "」状态从 " + oldStatus + " 变更为 " + request.getStatus(),
                        taskId,
                        "TASK"
                );
            }
        }

        return convertToVO(task);
    }

    @Override
    @Transactional
    public void assignUsers(Long userId, Long taskId, List<Long> userIds) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (!canEditTask(userId, task)) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }

        for (Long assigneeUserId : userIds) {
            Long count = taskAssigneeMapper.selectCount(
                    new LambdaQueryWrapper<TaskAssignee>()
                            .eq(TaskAssignee::getTaskId, taskId)
                            .eq(TaskAssignee::getUserId, assigneeUserId));
            if (count == 0) {
                TaskAssignee assignee = new TaskAssignee();
                assignee.setTaskId(taskId);
                assignee.setUserId(assigneeUserId);
                assignee.setAssignedAt(LocalDateTime.now());
                taskAssigneeMapper.insert(assignee);

                notificationService.sendNotification(
                        assigneeUserId,
                        Constants.NOTIFY_MEMBER_CHANGE,
                        "任务分配",
                        "你被分配了任务「" + task.getTitle() + "」",
                        taskId,
                        "TASK"
                );
            }
        }
    }

    @Override
    @Transactional
    public void removeAssignee(Long userId, Long taskId, Long assigneeUserId) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (!canEditTask(userId, task)) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }

        taskAssigneeMapper.delete(
                new LambdaQueryWrapper<TaskAssignee>()
                        .eq(TaskAssignee::getTaskId, taskId)
                        .eq(TaskAssignee::getUserId, assigneeUserId));
    }

    @Override
    public String uploadAttachment(Long userId, Long taskId, MultipartFile file) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectMember(userId, task.getProjectId());

        if (file.isEmpty()) {
            throw new BusinessException("文件不能为空");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String fileName = UUID.randomUUID().toString().replace("-", "") + ext;

        String attachDir = uploadPath + "/attachments";
        FileUtil.mkdir(attachDir);
        File dest = new File(attachDir, fileName);

        try {
            file.transferTo(dest);
        } catch (IOException e) {
            throw new BusinessException("文件上传失败");
        }

        Attachment attachment = new Attachment();
        attachment.setTaskId(taskId);
        attachment.setFileName(originalFilename);
        attachment.setFilePath("/uploads/attachments/" + fileName);
        attachment.setFileSize(file.getSize());
        attachment.setFileType(file.getContentType());
        attachment.setUploaderId(userId);
        attachmentMapper.insert(attachment);

        return attachment.getFilePath();
    }

    @Override
    @Transactional
    public void deleteAttachment(Long userId, Long attachmentId) {
        Attachment attachment = attachmentMapper.selectById(attachmentId);
        if (attachment == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        Task task = taskMapper.selectById(attachment.getTaskId());
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        if (!isProjectOwnerOrAdmin(userId, task.getProjectId()) && !attachment.getUploaderId().equals(userId)) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }

        attachmentMapper.deleteById(attachmentId);
    }

    @Override
    @Transactional
    public CommentVO addComment(Long userId, Long taskId, CommentCreateRequest request) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectMember(userId, task.getProjectId());

        Comment comment = new Comment();
        comment.setTaskId(taskId);
        comment.setContent(request.getContent());
        comment.setAuthorId(userId);
        comment.setParentId(request.getParentId());
        commentMapper.insert(comment);

        Pattern pattern = Pattern.compile("@(\\S+)");
        Matcher matcher = pattern.matcher(request.getContent());
        while (matcher.find()) {
            String mentionName = matcher.group(1);
            User mentionedUser = userMapper.selectOne(
                    new LambdaQueryWrapper<User>().eq(User::getNickname, mentionName));
            if (mentionedUser != null) {
                notificationService.sendNotification(
                        mentionedUser.getId(),
                        Constants.NOTIFY_MENTION,
                        "有人@了你",
                        userId + " 在任务「" + task.getTitle() + "」中@了你",
                        taskId,
                        "TASK"
                );
            }
        }

        User author = userMapper.selectById(userId);
        return CommentVO.builder()
                .id(comment.getId())
                .taskId(comment.getTaskId())
                .content(comment.getContent())
                .authorId(comment.getAuthorId())
                .authorName(author != null ? author.getNickname() : null)
                .authorAvatar(author != null ? author.getAvatar() : null)
                .parentId(comment.getParentId())
                .createdAt(comment.getCreatedAt())
                .replies(List.of())
                .build();
    }

    @Override
    public PageResult<CommentVO> listComments(Long userId, Long taskId, Integer page, Integer size) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectMember(userId, task.getProjectId());

        Page<Comment> commentPage = commentMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<Comment>()
                        .eq(Comment::getTaskId, taskId)
                        .isNull(Comment::getParentId)
                        .orderByDesc(Comment::getCreatedAt));

        List<CommentVO> vos = commentPage.getRecords().stream().map(comment -> {
            User author = userMapper.selectById(comment.getAuthorId());
            List<Comment> replies = commentMapper.selectList(
                    new LambdaQueryWrapper<Comment>()
                            .eq(Comment::getParentId, comment.getId())
                            .orderByAsc(Comment::getCreatedAt));
            List<CommentVO> replyVOs = replies.stream().map(reply -> {
                User replyAuthor = userMapper.selectById(reply.getAuthorId());
                return CommentVO.builder()
                        .id(reply.getId())
                        .taskId(reply.getTaskId())
                        .content(reply.getContent())
                        .authorId(reply.getAuthorId())
                        .authorName(replyAuthor != null ? replyAuthor.getNickname() : null)
                        .authorAvatar(replyAuthor != null ? replyAuthor.getAvatar() : null)
                        .parentId(reply.getParentId())
                        .createdAt(reply.getCreatedAt())
                        .replies(List.of())
                        .build();
            }).toList();

            return CommentVO.builder()
                    .id(comment.getId())
                    .taskId(comment.getTaskId())
                    .content(comment.getContent())
                    .authorId(comment.getAuthorId())
                    .authorName(author != null ? author.getNickname() : null)
                    .authorAvatar(author != null ? author.getAvatar() : null)
                    .parentId(comment.getParentId())
                    .createdAt(comment.getCreatedAt())
                    .replies(replyVOs)
                    .build();
        }).toList();

        return new PageResult<>(vos, commentPage.getTotal(), (int) commentPage.getPages());
    }

    @Override
    @Transactional
    public void setTags(Long userId, Long taskId, List<Long> tagIds) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (!canEditTask(userId, task)) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }

        taskTagMapper.delete(new LambdaQueryWrapper<TaskTag>().eq(TaskTag::getTaskId, taskId));

        if (tagIds != null) {
            for (Long tagId : tagIds) {
                TaskTag taskTag = new TaskTag();
                taskTag.setTaskId(taskId);
                taskTag.setTagId(tagId);
                taskTagMapper.insert(taskTag);
            }
        }
    }

    @Override
    public PageResult<TaskStatusHistory> getStatusHistory(Long userId, Long taskId, Integer page, Integer size) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        checkProjectMember(userId, task.getProjectId());

        Page<TaskStatusHistory> historyPage = taskStatusHistoryMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<TaskStatusHistory>()
                        .eq(TaskStatusHistory::getTaskId, taskId)
                        .orderByDesc(TaskStatusHistory::getChangedAt));

        return new PageResult<>(historyPage.getRecords(), historyPage.getTotal(), (int) historyPage.getPages());
    }
}

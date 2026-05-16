package com.ai.taskboard.service;

import com.ai.taskboard.dto.tag.TagCreateRequest;
import com.ai.taskboard.dto.tag.TagVO;

import java.util.List;

public interface TagService {
    List<TagVO> listTags(Long userId, Long projectId);
    TagVO createTag(Long userId, Long projectId, TagCreateRequest request);
    void deleteTag(Long userId, Long tagId);
}

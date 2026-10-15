package com.somlits.taginventory.domain.repository;

import com.somlits.taginventory.domain.entity.TagCustodyEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TagCustodyEventRepository extends JpaRepository<TagCustodyEvent, UUID> {

    List<TagCustodyEvent> findByTagSerialOrBagCodeOrderByPerformedAtAsc(String tagSerialOrBagCode);
}

package com.somlits.taginventory.domain.repository;

import com.somlits.taginventory.domain.entity.TagTransferBag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface TagTransferBagRepository extends JpaRepository<TagTransferBag, TagTransferBag.TagTransferBagId> {

    @Query("SELECT ttb FROM TagTransferBag ttb WHERE ttb.id.transferId = :transferId")
    List<TagTransferBag> findByTransferId(UUID transferId);
}

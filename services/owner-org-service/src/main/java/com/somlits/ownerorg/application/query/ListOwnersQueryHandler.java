package com.somlits.ownerorg.application.query;

import com.somlits.ownerorg.domain.entity.Owner;
import com.somlits.ownerorg.domain.repository.OwnerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ListOwnersQueryHandler {

    private final OwnerRepository ownerRepo;

    public ListOwnersQueryHandler(OwnerRepository ownerRepo) {
        this.ownerRepo = ownerRepo;
    }

    @Transactional(readOnly = true)
    public Page<Owner> handle(ListOwnersQuery query) {
        PageRequest pageable = PageRequest.of(
                query.page(),
                query.size(),
                Sort.by("createdAt").descending()
        );
        return ownerRepo.search(query.status(), query.ownerType(), query.regionCode(), query.districtCode(), pageable);
    }
}

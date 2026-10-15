package com.somlits.ownerorg.application.query;

import com.somlits.ownerorg.domain.entity.Owner;
import com.somlits.ownerorg.domain.exception.DomainNotFoundException;
import com.somlits.ownerorg.domain.repository.OwnerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GetOwnerByIdQueryHandler {

    private final OwnerRepository ownerRepo;

    public GetOwnerByIdQueryHandler(OwnerRepository ownerRepo) {
        this.ownerRepo = ownerRepo;
    }

    @Transactional(readOnly = true)
    public Owner handle(GetOwnerByIdQuery query) {
        return ownerRepo.findById(query.ownerId())
                .orElseThrow(() -> new DomainNotFoundException("Owner not found: " + query.ownerId()));
    }
}

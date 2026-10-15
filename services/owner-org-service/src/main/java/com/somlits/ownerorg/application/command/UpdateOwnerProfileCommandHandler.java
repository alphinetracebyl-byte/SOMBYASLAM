package com.somlits.ownerorg.application.command;

import com.somlits.ownerorg.domain.entity.Owner;
import com.somlits.ownerorg.domain.exception.DomainNotFoundException;
import com.somlits.ownerorg.domain.repository.OwnerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UpdateOwnerProfileCommandHandler {

    private static final Logger log = LoggerFactory.getLogger(UpdateOwnerProfileCommandHandler.class);

    private final OwnerRepository ownerRepo;

    public UpdateOwnerProfileCommandHandler(OwnerRepository ownerRepo) {
        this.ownerRepo = ownerRepo;
    }

    @Transactional
    public Owner handle(UpdateOwnerProfileCommand cmd) {
        Owner owner = ownerRepo.findById(cmd.ownerId())
                .orElseThrow(() -> new DomainNotFoundException("Owner not found: " + cmd.ownerId()));

        owner.updateProfile(
                cmd.fullName(),
                cmd.tradingName(),
                cmd.primaryPhone(),
                cmd.alternativePhone(),
                cmd.emailAddress(),
                cmd.regionCode(),
                cmd.districtCode(),
                cmd.villageOrSettlement(),
                cmd.gpsLatitude(),
                cmd.gpsLongitude()
        );
        ownerRepo.save(owner);

        log.info("Owner profile updated: code={}", owner.getOwnerCode());
        return owner;
    }
}

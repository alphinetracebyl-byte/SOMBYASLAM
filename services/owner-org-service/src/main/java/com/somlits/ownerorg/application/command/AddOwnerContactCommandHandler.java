package com.somlits.ownerorg.application.command;

import com.somlits.ownerorg.domain.entity.Owner;
import com.somlits.ownerorg.domain.entity.OwnerContact;
import com.somlits.ownerorg.domain.exception.DomainNotFoundException;
import com.somlits.ownerorg.domain.repository.OwnerContactRepository;
import com.somlits.ownerorg.domain.repository.OwnerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AddOwnerContactCommandHandler {

    private static final Logger log = LoggerFactory.getLogger(AddOwnerContactCommandHandler.class);

    private final OwnerRepository ownerRepo;
    private final OwnerContactRepository contactRepo;

    public AddOwnerContactCommandHandler(OwnerRepository ownerRepo,
                                         OwnerContactRepository contactRepo) {
        this.ownerRepo = ownerRepo;
        this.contactRepo = contactRepo;
    }

    @Transactional
    public OwnerContact handle(AddOwnerContactCommand cmd) {
        Owner owner = ownerRepo.findById(cmd.ownerId())
                .orElseThrow(() -> new DomainNotFoundException("Owner not found: " + cmd.ownerId()));

        OwnerContact contact = OwnerContact.create(
                owner.getId(),
                cmd.contactName(),
                cmd.contactPhone(),
                cmd.contactRole(),
                cmd.callerUserId()
        );
        contactRepo.save(contact);

        log.info("Contact added to owner: ownerCode={} contactName={}", owner.getOwnerCode(), cmd.contactName());
        return contact;
    }
}

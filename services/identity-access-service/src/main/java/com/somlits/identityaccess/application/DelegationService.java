package com.somlits.identityaccess.application;

import com.somlits.identityaccess.domain.exception.BusinessRuleViolationException;
import com.somlits.identityaccess.domain.exception.DomainNotFoundException;
import com.somlits.identityaccess.domain.enums.DelegateScope;
import com.somlits.identityaccess.domain.model.DelegateGrant;
import com.somlits.identityaccess.domain.repository.DelegateGrantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class DelegationService {

    private static final Logger log = LoggerFactory.getLogger(DelegationService.class);
    private static final long MAX_DELEGATION_DAYS = 365;

    private final DelegateGrantRepository grantRepo;
    private final OutboxService outboxService;

    public DelegationService(DelegateGrantRepository grantRepo, OutboxService outboxService) {
        this.grantRepo = grantRepo;
        this.outboxService = outboxService;
    }

    @Transactional
    public DelegateGrant grant(UUID grantorUserId, UUID granteeUserId, UUID ownerId,
            DelegateScope scope, Instant validUntil, UUID grantedByUserId) {

        if (validUntil.isAfter(Instant.now().plus(MAX_DELEGATION_DAYS, ChronoUnit.DAYS))) {
            throw new BusinessRuleViolationException("BR-IAM-020",
                    "Delegation may not exceed " + MAX_DELEGATION_DAYS + " days");
        }

        var grant = DelegateGrant.create(grantorUserId, granteeUserId, ownerId, scope, validUntil, grantedByUserId);
        grantRepo.save(grant);

        log.info("Delegation granted grantId={} scope={} to userId={}", grant.getId(), scope, granteeUserId);

        outboxService.publish("DelegationGranted", "DelegateGrant", grant.getId(),
                """
                {"grantId":"%s","grantorUserId":"%s","granteeUserId":"%s","ownerId":"%s","scope":"%s"}
                """.formatted(grant.getId(), grantorUserId, granteeUserId, ownerId, scope));

        return grant;
    }

    @Transactional
    public void revoke(UUID grantId, UUID revokedByUserId) {
        var grant = grantRepo.findById(grantId)
                .orElseThrow(() -> new DomainNotFoundException("DelegateGrant", grantId));

        if (!"ACTIVE".equals(grant.getStatus())) {
            throw new BusinessRuleViolationException("BR-IAM-020", "Grant is not active");
        }

        grant.revoke(revokedByUserId);
        grantRepo.save(grant);

        log.info("Delegation revoked grantId={} by userId={}", grantId, revokedByUserId);

        outboxService.publish("DelegationRevoked", "DelegateGrant", grant.getId(),
                """
                {"grantId":"%s","revokedByUserId":"%s"}
                """.formatted(grantId, revokedByUserId));
    }

    @Transactional(readOnly = true)
    public List<DelegateGrant> getActiveGrantsForGrantee(UUID granteeUserId, UUID ownerId) {
        return grantRepo.findActiveByGranteeAndOwner(granteeUserId, ownerId);
    }

    @Transactional(readOnly = true)
    public List<DelegateGrant> getGrantsByGrantor(UUID grantorUserId) {
        return grantRepo.findByGrantorUserIdAndStatus(grantorUserId, "ACTIVE");
    }
}

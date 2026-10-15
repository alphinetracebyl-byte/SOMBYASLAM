package com.somlits.premises.domain.repository;

import com.somlits.premises.domain.entity.Premises;
import com.somlits.premises.domain.enums.PremisesStatus;
import com.somlits.premises.domain.enums.PremisesType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PremisesRepository extends JpaRepository<Premises, UUID> {

    Optional<Premises> findByPremisesCode(String premisesCode);

    List<Premises> findByOwnerId(UUID ownerId);

    Page<Premises> findByRegionCodeAndStatus(String regionCode, PremisesStatus status, Pageable pageable);

    Page<Premises> findByStatus(PremisesStatus status, Pageable pageable);

    boolean existsByPremisesCode(String premisesCode);

    @Query("SELECT p FROM Premises p WHERE " +
           "(:ownerId IS NULL OR p.ownerId = :ownerId) AND " +
           "(:regionCode IS NULL OR p.regionCode = :regionCode) AND " +
           "(:districtCode IS NULL OR p.districtCode = :districtCode) AND " +
           "(:premisesType IS NULL OR p.premisesType = :premisesType) AND " +
           "(:status IS NULL OR p.status = :status)")
    Page<Premises> search(UUID ownerId, String regionCode, String districtCode,
                           PremisesType premisesType, PremisesStatus status,
                           Pageable pageable);
}

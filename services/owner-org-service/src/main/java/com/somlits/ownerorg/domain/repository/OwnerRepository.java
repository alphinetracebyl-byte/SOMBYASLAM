package com.somlits.ownerorg.domain.repository;

import com.somlits.ownerorg.domain.entity.Owner;
import com.somlits.ownerorg.domain.enums.OwnerStatus;
import com.somlits.ownerorg.domain.enums.OwnerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface OwnerRepository extends JpaRepository<Owner, UUID> {

    Optional<Owner> findByOwnerCode(String ownerCode);

    Optional<Owner> findByNationalIdNumber(String nationalIdNumber);

    boolean existsByNationalIdNumber(String nationalIdNumber);

    Page<Owner> findByRegionCode(String regionCode, Pageable pageable);

    Page<Owner> findByStatus(OwnerStatus status, Pageable pageable);

    @Query("SELECT o FROM Owner o WHERE " +
           "(:status IS NULL OR o.status = :status) AND " +
           "(:ownerType IS NULL OR o.ownerType = :ownerType) AND " +
           "(:regionCode IS NULL OR o.regionCode = :regionCode) AND " +
           "(:districtCode IS NULL OR o.districtCode = :districtCode)")
    Page<Owner> search(OwnerStatus status, OwnerType ownerType,
                       String regionCode, String districtCode, Pageable pageable);
}

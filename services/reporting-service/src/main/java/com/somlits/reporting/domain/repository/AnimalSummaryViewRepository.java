package com.somlits.reporting.domain.repository;

import com.somlits.reporting.domain.model.AnimalSummaryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AnimalSummaryViewRepository extends JpaRepository<AnimalSummaryView, UUID> {

    long countBySpecies(String species);

    long countByStatus(String status);

    long countByRegionCode(String regionCode);

    @Query("SELECT a.species, COUNT(a) FROM AnimalSummaryView a GROUP BY a.species")
    List<Object[]> countGroupBySpecies();

    @Query("SELECT a.status, COUNT(a) FROM AnimalSummaryView a GROUP BY a.status")
    List<Object[]> countGroupByStatus();

    @Query("SELECT a.regionCode, COUNT(a) FROM AnimalSummaryView a GROUP BY a.regionCode")
    List<Object[]> countGroupByRegionCode();
}

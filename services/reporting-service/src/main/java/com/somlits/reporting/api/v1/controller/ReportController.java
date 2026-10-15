package com.somlits.reporting.api.v1.controller;

import com.somlits.reporting.api.v1.dto.response.AnimalsSummaryResponse;
import com.somlits.reporting.api.v1.dto.response.ExportSummaryResponse;
import com.somlits.reporting.api.v1.dto.response.MinistryDashboardResponse;
import com.somlits.reporting.api.v1.dto.response.MovementsSummaryResponse;
import com.somlits.reporting.api.v1.dto.response.SlaughterSummaryResponse;
import com.somlits.reporting.api.v1.dto.response.TagInventorySummaryResponse;
import com.somlits.reporting.api.v1.dto.response.VaccinationCoverageResponse;
import com.somlits.reporting.domain.repository.AnimalSummaryViewRepository;
import com.somlits.reporting.domain.repository.DiseaseCaseSummaryViewRepository;
import com.somlits.reporting.domain.repository.ExportSummaryViewRepository;
import com.somlits.reporting.domain.repository.HealthSummaryViewRepository;
import com.somlits.reporting.domain.repository.MovementSummaryViewRepository;
import com.somlits.reporting.domain.repository.SlaughterSummaryViewRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/v1/reports")
@Tag(name = "Reports", description = "Aggregated reporting and dashboard endpoints")
public class ReportController {

    private static final Logger log = LoggerFactory.getLogger(ReportController.class);

    private final AnimalSummaryViewRepository animalRepo;
    private final MovementSummaryViewRepository movementRepo;
    private final HealthSummaryViewRepository healthRepo;
    private final DiseaseCaseSummaryViewRepository diseaseCaseRepo;
    private final ExportSummaryViewRepository exportRepo;
    private final SlaughterSummaryViewRepository slaughterRepo;

    public ReportController(AnimalSummaryViewRepository animalRepo,
                            MovementSummaryViewRepository movementRepo,
                            HealthSummaryViewRepository healthRepo,
                            DiseaseCaseSummaryViewRepository diseaseCaseRepo,
                            ExportSummaryViewRepository exportRepo,
                            SlaughterSummaryViewRepository slaughterRepo) {
        this.animalRepo = animalRepo;
        this.movementRepo = movementRepo;
        this.healthRepo = healthRepo;
        this.diseaseCaseRepo = diseaseCaseRepo;
        this.exportRepo = exportRepo;
        this.slaughterRepo = slaughterRepo;
    }

    @GetMapping("/animals/summary")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN','AUDITOR')")
    @Operation(summary = "Get animals summary", description = "Returns aggregated animal counts by species, status and region")
    public AnimalsSummaryResponse getAnimalsSummary() {
        log.debug("Generating animals summary report");

        long total = animalRepo.count();
        long active = animalRepo.countByStatus("ACTIVE");

        Map<String, Long> bySpecies = toMap(animalRepo.countGroupBySpecies());
        Map<String, Long> byStatus = toMap(animalRepo.countGroupByStatus());
        Map<String, Long> byRegion = toMap(animalRepo.countGroupByRegionCode());

        return new AnimalsSummaryResponse(total, active, bySpecies, byStatus, byRegion);
    }

    @GetMapping("/movements/summary")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN','AUDITOR')")
    @Operation(summary = "Get movements summary", description = "Returns aggregated movement counts by status and route")
    public MovementsSummaryResponse getMovementsSummary() {
        log.debug("Generating movements summary report");

        long total = movementRepo.count();
        Map<String, Long> byStatus = toMap(movementRepo.countGroupByStatus());

        List<MovementsSummaryResponse.RouteCount> byRoute = movementRepo.countGroupByRoute()
                .stream()
                .map(row -> new MovementsSummaryResponse.RouteCount(
                        (String) row[0],
                        (String) row[1],
                        ((Number) row[2]).longValue()
                ))
                .toList();

        return new MovementsSummaryResponse(total, byStatus, byRoute);
    }

    @GetMapping("/health/vaccination-coverage")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN','VETERINARY_OFFICER')")
    @Operation(summary = "Get vaccination coverage", description = "Returns health event counts grouped by region and event type")
    public VaccinationCoverageResponse getVaccinationCoverage() {
        log.debug("Generating vaccination coverage report");

        List<VaccinationCoverageResponse.RegionEventCount> coverage = healthRepo.countByRegionCodeGroupByEventType()
                .stream()
                .map(row -> new VaccinationCoverageResponse.RegionEventCount(
                        (String) row[0],
                        (String) row[1],
                        ((Number) row[2]).longValue()
                ))
                .toList();

        return new VaccinationCoverageResponse(coverage);
    }

    @GetMapping("/tags/inventory")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN')")
    @Operation(summary = "Get tag inventory summary", description = "Returns tag inventory placeholder (pending tag management service integration)")
    public TagInventorySummaryResponse getTagInventory() {
        return new TagInventorySummaryResponse();
    }

    @GetMapping("/exports/summary")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN')")
    @Operation(summary = "Get exports summary", description = "Returns aggregated export counts by destination country and status")
    public ExportSummaryResponse getExportSummary() {
        log.debug("Generating export summary report");

        Map<String, Long> byDestination = toMap(exportRepo.countGroupByDestinationCountry());
        Map<String, Long> byStatus = toMap(exportRepo.countGroupByStatus());

        return new ExportSummaryResponse(byDestination, byStatus);
    }

    @GetMapping("/slaughter/summary")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN')")
    @Operation(summary = "Get slaughter summary", description = "Returns aggregated slaughter counts by outcome and region")
    public SlaughterSummaryResponse getSlaughterSummary() {
        log.debug("Generating slaughter summary report");

        Map<String, Long> byOutcome = toMap(slaughterRepo.countGroupByOutcome());
        Map<String, Long> byRegion = toMap(slaughterRepo.countGroupByRegionCode());

        return new SlaughterSummaryResponse(byOutcome, byRegion);
    }

    @GetMapping("/dashboard/ministry")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN','MINISTRY_OFFICER')")
    @Operation(summary = "Ministry dashboard KPIs", description = "Returns high-level KPIs for the Ministry-level dashboard")
    public MinistryDashboardResponse getMinistryDashboard() {
        log.debug("Generating ministry dashboard");
        return buildDashboard();
    }

    @GetMapping("/dashboard/field")
    @PreAuthorize("hasAnyRole('FIELD_INSPECTOR','VETERINARY_OFFICER','DISTRICT_ADMIN')")
    @Operation(summary = "Field dashboard KPIs", description = "Returns operational KPIs for field-level users")
    public MinistryDashboardResponse getFieldDashboard() {
        log.debug("Generating field dashboard");
        return buildDashboard();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private MinistryDashboardResponse buildDashboard() {
        long totalAnimals = animalRepo.count();
        long activeAnimals = animalRepo.countByStatus("ACTIVE");
        long activeMovements = movementRepo.countByStatus("IN_TRANSIT");
        long openDiseaseCases = diseaseCaseRepo.countByStatus("OPEN");

        List<MinistryDashboardResponse.SpeciesCount> animalsBySpecies =
                animalRepo.countGroupBySpecies().stream()
                        .map(row -> new MinistryDashboardResponse.SpeciesCount(
                                (String) row[0],
                                ((Number) row[1]).longValue()
                        ))
                        .toList();

        List<MinistryDashboardResponse.StatusCount> movementsByStatus =
                movementRepo.countGroupByStatus().stream()
                        .map(row -> new MinistryDashboardResponse.StatusCount(
                                (String) row[0],
                                ((Number) row[1]).longValue()
                        ))
                        .toList();

        return new MinistryDashboardResponse(
                totalAnimals,
                activeAnimals,
                0L,   // todayRegistrations — requires time-windowed query, deferred
                0L,   // pendingSubmissions — requires cross-service aggregation, deferred
                activeMovements,
                openDiseaseCases,
                0L,   // vaccinationsDueThisWeek — requires scheduling data, deferred
                0L,   // pendingCertifications — requires certification service, deferred
                animalsBySpecies,
                movementsByStatus,
                List.of()
        );
    }

    private Map<String, Long> toMap(List<Object[]> rows) {
        Map<String, Long> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String key = row[0] != null ? row[0].toString() : "UNKNOWN";
            long value = ((Number) row[1]).longValue();
            result.put(key, value);
        }
        return result;
    }
}

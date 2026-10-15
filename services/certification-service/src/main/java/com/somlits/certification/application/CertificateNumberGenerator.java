package com.somlits.certification.application;

import com.somlits.certification.domain.enums.CertificateType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class CertificateNumberGenerator {

    private final JdbcTemplate jdbc;

    public CertificateNumberGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next(CertificateType type) {
        String sequenceName = sequenceFor(type);
        Long seq = jdbc.queryForObject("SELECT nextval('" + sequenceName + "')", Long.class);
        int year = Year.now().getValue();
        return String.format("%s-%d-%05d", prefixFor(type), year, seq);
    }

    private String prefixFor(CertificateType type) {
        return switch (type) {
            case MOVEMENT_PERMIT        -> "MP";
            case ANIMAL_HEALTH_CERT     -> "AHC";
            case VACCINATION_CERT       -> "VC";
            case QUARANTINE_CLEARANCE   -> "QC";
            case EXPORT_HEALTH_CERT     -> "EHC";
            case SLAUGHTER_FITNESS_CERT -> "SFC";
            case OWNERSHIP_CERT         -> "OC";
        };
    }

    private String sequenceFor(CertificateType type) {
        return switch (type) {
            case MOVEMENT_PERMIT        -> "movement_permit_seq";
            case ANIMAL_HEALTH_CERT     -> "animal_health_cert_seq";
            case VACCINATION_CERT       -> "vaccination_cert_seq";
            case QUARANTINE_CLEARANCE   -> "quarantine_clearance_seq";
            case EXPORT_HEALTH_CERT     -> "export_health_cert_seq";
            case SLAUGHTER_FITNESS_CERT -> "slaughter_fitness_seq";
            case OWNERSHIP_CERT         -> "ownership_cert_seq";
        };
    }
}

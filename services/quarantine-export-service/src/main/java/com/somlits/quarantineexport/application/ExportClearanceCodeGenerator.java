package com.somlits.quarantineexport.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class ExportClearanceCodeGenerator {

    private final JdbcTemplate jdbc;

    public ExportClearanceCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next() {
        Long seq = jdbc.queryForObject("SELECT nextval('export_clearance_code_seq')", Long.class);
        int year = Year.now().getValue();
        return String.format("ECLR-%d-%05d", year, seq);
    }
}

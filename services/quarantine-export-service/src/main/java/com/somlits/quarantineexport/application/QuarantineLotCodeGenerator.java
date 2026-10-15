package com.somlits.quarantineexport.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class QuarantineLotCodeGenerator {

    private final JdbcTemplate jdbc;

    public QuarantineLotCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next() {
        Long seq = jdbc.queryForObject("SELECT nextval('quarantine_lot_code_seq')", Long.class);
        int year = Year.now().getValue();
        return String.format("QLOT-%d-%05d", year, seq);
    }
}

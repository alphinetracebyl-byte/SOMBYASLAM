package com.somlits.ownerorg.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class OwnerCodeGenerator {

    private final JdbcTemplate jdbc;

    public OwnerCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next() {
        Long seq = jdbc.queryForObject("SELECT nextval('owner_code_seq')", Long.class);
        int year = Year.now().getValue();
        return String.format("OWN-%d-%06d", year, seq);
    }
}

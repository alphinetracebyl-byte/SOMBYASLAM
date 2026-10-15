package com.somlits.premises.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class PremisesCodeGenerator {

    private final JdbcTemplate jdbc;

    public PremisesCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next() {
        Long seq = jdbc.queryForObject("SELECT nextval('premises_code_seq')", Long.class);
        int year = Year.now().getValue();
        return String.format("PRM-%d-%06d", year, seq);
    }
}

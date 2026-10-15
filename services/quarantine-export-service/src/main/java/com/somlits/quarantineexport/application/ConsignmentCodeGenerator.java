package com.somlits.quarantineexport.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class ConsignmentCodeGenerator {

    private final JdbcTemplate jdbc;

    public ConsignmentCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next() {
        Long seq = jdbc.queryForObject("SELECT nextval('consignment_code_seq')", Long.class);
        int year = Year.now().getValue();
        return String.format("CONS-%d-%06d", year, seq);
    }
}

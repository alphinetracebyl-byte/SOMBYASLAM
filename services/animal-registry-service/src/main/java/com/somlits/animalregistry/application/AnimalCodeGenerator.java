package com.somlits.animalregistry.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class AnimalCodeGenerator {

    private final JdbcTemplate jdbc;

    public AnimalCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next() {
        Long seq = jdbc.queryForObject("SELECT nextval('animal_code_seq')", Long.class);
        int year = Year.now().getValue();
        return String.format("SOM-%d-%06d", year, seq);
    }
}

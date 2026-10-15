package com.somlits.markettrade.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class CodeGenerator {

    private final JdbcTemplate jdbc;

    public CodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String nextSessionCode() {
        Long seq = jdbc.queryForObject("SELECT nextval('market_session_code_seq')", Long.class);
        return String.format("MKT-%d-%06d", Year.now().getValue(), seq);
    }

    public String nextEntryCode() {
        Long seq = jdbc.queryForObject("SELECT nextval('market_entry_code_seq')", Long.class);
        return String.format("MENTRY-%d-%06d", Year.now().getValue(), seq);
    }

    public String nextSaleCode() {
        Long seq = jdbc.queryForObject("SELECT nextval('sale_record_code_seq')", Long.class);
        return String.format("SALE-%d-%06d", Year.now().getValue(), seq);
    }
}

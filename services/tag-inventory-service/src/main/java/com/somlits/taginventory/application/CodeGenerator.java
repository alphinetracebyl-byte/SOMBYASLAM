package com.somlits.taginventory.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class CodeGenerator {

    private final JdbcTemplate jdbc;

    public CodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String nextBatchCode() {
        Long seq = jdbc.queryForObject("SELECT nextval('tag_batch_code_seq')", Long.class);
        return String.format("BATCH-%d-%06d", Year.now().getValue(), seq);
    }

    public String nextBagCode(String batchCode, int bagIndex) {
        return String.format("BAG-%s-%03d", batchCode, bagIndex);
    }

    public String nextRequestCode() {
        Long seq = jdbc.queryForObject("SELECT nextval('tag_request_code_seq')", Long.class);
        return String.format("TREQ-%d-%06d", Year.now().getValue(), seq);
    }

    public String nextTransferCode() {
        Long seq = jdbc.queryForObject("SELECT nextval('tag_transfer_code_seq')", Long.class);
        return String.format("TTRN-%d-%06d", Year.now().getValue(), seq);
    }
}

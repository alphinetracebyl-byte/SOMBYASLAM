package com.somlits.certification.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class CertificateTemplateCodeGenerator {

    private final JdbcTemplate jdbc;

    public CertificateTemplateCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next() {
        Long seq = jdbc.queryForObject("SELECT nextval('cert_template_code_seq')", Long.class);
        return String.format("TMPL-%05d", seq);
    }
}

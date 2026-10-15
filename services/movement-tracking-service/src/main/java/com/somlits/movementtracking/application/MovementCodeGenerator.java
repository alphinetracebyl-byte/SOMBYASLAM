package com.somlits.movementtracking.application;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Component
public class MovementCodeGenerator {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyMMdd");
    private final EntityManager em;

    public MovementCodeGenerator(EntityManager em) {
        this.em = em;
    }

    @Transactional
    public String next() {
        Long seq = (Long) em.createNativeQuery("SELECT nextval('movement_code_seq')").getSingleResult();
        String date = LocalDate.now().format(FMT);
        return "MV-" + date + "-" + String.format("%06d", seq);
    }

    @Transactional
    public String nextPermitNumber() {
        Long seq = (Long) em.createNativeQuery("SELECT nextval('permit_number_seq')").getSingleResult();
        String date = LocalDate.now().format(FMT);
        return "PRM-" + date + "-" + String.format("%06d", seq);
    }
}

package com.somlits.certification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CertificationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CertificationServiceApplication.class, args);
    }
}

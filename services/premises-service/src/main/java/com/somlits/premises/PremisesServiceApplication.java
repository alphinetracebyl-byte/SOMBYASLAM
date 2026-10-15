package com.somlits.premises;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PremisesServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PremisesServiceApplication.class, args);
    }
}

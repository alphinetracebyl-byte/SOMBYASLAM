package com.somlits.abattoir;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AbattoirServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AbattoirServiceApplication.class, args);
    }
}

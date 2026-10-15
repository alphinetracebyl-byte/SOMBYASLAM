package com.somlits.ownerorg;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OwnerOrgServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(OwnerOrgServiceApplication.class, args);
    }
}

package com.somlits.taginventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TagInventoryServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TagInventoryServiceApplication.class, args);
    }
}

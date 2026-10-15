package com.somlits.animalregistry;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AnimalRegistryApplication {

    public static void main(String[] args) {
        SpringApplication.run(AnimalRegistryApplication.class, args);
    }
}

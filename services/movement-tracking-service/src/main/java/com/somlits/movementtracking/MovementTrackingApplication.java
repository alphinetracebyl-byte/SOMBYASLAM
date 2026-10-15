package com.somlits.movementtracking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MovementTrackingApplication {
    public static void main(String[] args) {
        SpringApplication.run(MovementTrackingApplication.class, args);
    }
}

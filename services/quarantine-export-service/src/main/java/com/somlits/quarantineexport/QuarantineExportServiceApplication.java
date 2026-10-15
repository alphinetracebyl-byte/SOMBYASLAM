package com.somlits.quarantineexport;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class QuarantineExportServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(QuarantineExportServiceApplication.class, args);
    }
}

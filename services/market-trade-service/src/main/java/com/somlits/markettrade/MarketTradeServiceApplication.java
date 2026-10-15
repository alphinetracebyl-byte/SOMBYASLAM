package com.somlits.markettrade;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MarketTradeServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MarketTradeServiceApplication.class, args);
    }
}

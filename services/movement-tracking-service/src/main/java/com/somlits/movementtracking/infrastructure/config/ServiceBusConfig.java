package com.somlits.movementtracking.infrastructure.config;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ServiceBusConfig {

    @Bean
    public ServiceBusSenderClient serviceBusSenderClient(
            @Value("${somlits.servicebus.connection-string}") String connectionString,
            @Value("${somlits.servicebus.topic}") String topicName) {
        return new ServiceBusClientBuilder()
                .connectionString(connectionString)
                .sender()
                .topicName(topicName)
                .buildClient();
    }
}

package com.somlits.traceability.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "somlits.services")
public class ServiceUrlProperties {

    private String animalRegistry;
    private String movementTracking;
    private String vetHealth;
    private String marketTrade;
    private String quarantineExport;
    private String abattoir;

    public String getAnimalRegistry() { return animalRegistry; }
    public void setAnimalRegistry(String animalRegistry) { this.animalRegistry = animalRegistry; }

    public String getMovementTracking() { return movementTracking; }
    public void setMovementTracking(String movementTracking) { this.movementTracking = movementTracking; }

    public String getVetHealth() { return vetHealth; }
    public void setVetHealth(String vetHealth) { this.vetHealth = vetHealth; }

    public String getMarketTrade() { return marketTrade; }
    public void setMarketTrade(String marketTrade) { this.marketTrade = marketTrade; }

    public String getQuarantineExport() { return quarantineExport; }
    public void setQuarantineExport(String quarantineExport) { this.quarantineExport = quarantineExport; }

    public String getAbattoir() { return abattoir; }
    public void setAbattoir(String abattoir) { this.abattoir = abattoir; }
}

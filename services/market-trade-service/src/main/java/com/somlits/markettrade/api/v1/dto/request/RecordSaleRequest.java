package com.somlits.markettrade.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public class RecordSaleRequest {

    @NotNull
    private UUID marketEntryId;

    @NotNull
    private UUID buyerOwnerId;

    @NotNull
    private String buyerOwnerCode;

    private BigDecimal salePrice;
    private String currency;
    private String paymentReference;

    public UUID getMarketEntryId() { return marketEntryId; }
    public UUID getBuyerOwnerId() { return buyerOwnerId; }
    public String getBuyerOwnerCode() { return buyerOwnerCode; }
    public BigDecimal getSalePrice() { return salePrice; }
    public String getCurrency() { return currency; }
    public String getPaymentReference() { return paymentReference; }
}

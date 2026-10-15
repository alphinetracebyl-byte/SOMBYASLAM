package com.somlits.markettrade.api.v1.dto.response;

import com.somlits.markettrade.domain.enums.OwnershipTransferStatus;
import com.somlits.markettrade.domain.model.SaleRecord;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SaleRecordResponse(
        UUID id,
        String saleCode,
        UUID sessionId,
        UUID marketEntryId,
        UUID animalId,
        String animalCode,
        UUID sellerOwnerId,
        String sellerOwnerCode,
        UUID buyerOwnerId,
        String buyerOwnerCode,
        BigDecimal salePrice,
        String currency,
        String paymentReference,
        Instant saleConfirmedAt,
        UUID saleConfirmedBy,
        OwnershipTransferStatus ownershipTransferStatus,
        Instant ownershipTransferredAt,
        Long version
) {
    public static SaleRecordResponse from(SaleRecord sr) {
        return new SaleRecordResponse(
                sr.getId(),
                sr.getSaleCode(),
                sr.getSessionId(),
                sr.getMarketEntryId(),
                sr.getAnimalId(),
                sr.getAnimalCode(),
                sr.getSellerOwnerId(),
                sr.getSellerOwnerCode(),
                sr.getBuyerOwnerId(),
                sr.getBuyerOwnerCode(),
                sr.getSalePrice(),
                sr.getCurrency(),
                sr.getPaymentReference(),
                sr.getSaleConfirmedAt(),
                sr.getSaleConfirmedBy(),
                sr.getOwnershipTransferStatus(),
                sr.getOwnershipTransferredAt(),
                sr.getVersion()
        );
    }
}

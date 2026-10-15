package com.somlits.markettrade.domain.model;

import com.somlits.markettrade.domain.enums.OwnershipTransferStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sale_record")
public class SaleRecord {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "sale_code", nullable = false, unique = true, length = 25, updatable = false)
    private String saleCode;

    @Column(name = "session_id", nullable = false, updatable = false)
    private UUID sessionId;

    @Column(name = "market_entry_id", nullable = false, updatable = false)
    private UUID marketEntryId;

    @Column(name = "animal_id", nullable = false, updatable = false)
    private UUID animalId;

    @Column(name = "animal_code", nullable = false, length = 25, updatable = false)
    private String animalCode;

    @Column(name = "seller_owner_id", nullable = false, updatable = false)
    private UUID sellerOwnerId;

    @Column(name = "seller_owner_code", nullable = false, length = 30, updatable = false)
    private String sellerOwnerCode;

    @Column(name = "buyer_owner_id", nullable = false, updatable = false)
    private UUID buyerOwnerId;

    @Column(name = "buyer_owner_code", nullable = false, length = 30, updatable = false)
    private String buyerOwnerCode;

    @Column(name = "sale_price", precision = 15, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "USD";

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "sale_confirmed_at", nullable = false, updatable = false)
    private Instant saleConfirmedAt;

    @Column(name = "sale_confirmed_by", nullable = false, updatable = false)
    private UUID saleConfirmedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "ownership_transfer_status", nullable = false, length = 20)
    private OwnershipTransferStatus ownershipTransferStatus = OwnershipTransferStatus.PENDING;

    @Column(name = "ownership_transferred_at")
    private Instant ownershipTransferredAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public static SaleRecord create(String saleCode, UUID sessionId, UUID marketEntryId, UUID animalId,
                                    String animalCode, UUID sellerOwnerId, String sellerOwnerCode,
                                    UUID buyerOwnerId, String buyerOwnerCode, BigDecimal salePrice,
                                    String currency, String paymentReference, UUID confirmedBy) {
        var s = new SaleRecord();
        s.id = UUID.randomUUID();
        s.saleCode = saleCode;
        s.sessionId = sessionId;
        s.marketEntryId = marketEntryId;
        s.animalId = animalId;
        s.animalCode = animalCode;
        s.sellerOwnerId = sellerOwnerId;
        s.sellerOwnerCode = sellerOwnerCode;
        s.buyerOwnerId = buyerOwnerId;
        s.buyerOwnerCode = buyerOwnerCode;
        s.salePrice = salePrice;
        s.currency = currency != null ? currency : "USD";
        s.paymentReference = paymentReference;
        s.saleConfirmedAt = Instant.now();
        s.saleConfirmedBy = confirmedBy;
        s.ownershipTransferStatus = OwnershipTransferStatus.PENDING;
        return s;
    }

    public void markTransferred() {
        this.ownershipTransferStatus = OwnershipTransferStatus.TRANSFERRED;
        this.ownershipTransferredAt = Instant.now();
    }

    public void markTransferFailed() {
        this.ownershipTransferStatus = OwnershipTransferStatus.FAILED;
    }

    public UUID getId() { return id; }
    public String getSaleCode() { return saleCode; }
    public UUID getSessionId() { return sessionId; }
    public UUID getMarketEntryId() { return marketEntryId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public UUID getSellerOwnerId() { return sellerOwnerId; }
    public String getSellerOwnerCode() { return sellerOwnerCode; }
    public UUID getBuyerOwnerId() { return buyerOwnerId; }
    public String getBuyerOwnerCode() { return buyerOwnerCode; }
    public BigDecimal getSalePrice() { return salePrice; }
    public String getCurrency() { return currency; }
    public String getPaymentReference() { return paymentReference; }
    public Instant getSaleConfirmedAt() { return saleConfirmedAt; }
    public UUID getSaleConfirmedBy() { return saleConfirmedBy; }
    public OwnershipTransferStatus getOwnershipTransferStatus() { return ownershipTransferStatus; }
    public Instant getOwnershipTransferredAt() { return ownershipTransferredAt; }
    public Long getVersion() { return version; }
}

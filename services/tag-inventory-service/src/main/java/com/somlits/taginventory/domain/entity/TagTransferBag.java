package com.somlits.taginventory.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "tag_transfer_bag")
public class TagTransferBag {

    @EmbeddedId
    private TagTransferBagId id;

    public static TagTransferBag of(UUID transferId, UUID bagId) {
        var t = new TagTransferBag();
        t.id = new TagTransferBagId(transferId, bagId);
        return t;
    }

    public UUID getTransferId() { return id.transferId; }
    public UUID getBagId() { return id.bagId; }

    @Embeddable
    public static class TagTransferBagId implements Serializable {
        @Column(name = "transfer_id", nullable = false)
        private UUID transferId;

        @Column(name = "bag_id", nullable = false)
        private UUID bagId;

        public TagTransferBagId() {}

        public TagTransferBagId(UUID transferId, UUID bagId) {
            this.transferId = transferId;
            this.bagId = bagId;
        }

        public UUID getTransferId() { return transferId; }
        public UUID getBagId() { return bagId; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof TagTransferBagId)) return false;
            TagTransferBagId that = (TagTransferBagId) o;
            return java.util.Objects.equals(transferId, that.transferId) &&
                   java.util.Objects.equals(bagId, that.bagId);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(transferId, bagId);
        }
    }
}

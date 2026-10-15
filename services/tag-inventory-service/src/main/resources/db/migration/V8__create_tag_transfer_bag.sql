CREATE TABLE tag_transfer_bag (
    transfer_id UUID NOT NULL REFERENCES tag_transfer(id),
    bag_id UUID NOT NULL REFERENCES tag_bag(id),
    PRIMARY KEY (transfer_id, bag_id)
);

CREATE INDEX idx_tag_transfer_bag_bag ON tag_transfer_bag (bag_id);

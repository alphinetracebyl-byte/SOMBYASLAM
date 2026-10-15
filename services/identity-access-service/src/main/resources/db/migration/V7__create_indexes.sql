-- user_account indexes
CREATE INDEX idx_user_account_status ON user_account (account_status);
CREATE INDEX idx_user_account_owner_id ON user_account (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_user_account_phone_last4 ON user_account (phone_last4);

-- user_role_assignment indexes
CREATE INDEX idx_ura_user_id ON user_role_assignment (user_id);
CREATE INDEX idx_ura_role_active ON user_role_assignment (role_code, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ura_territory ON user_role_assignment (territory_type, region_code, district_code) WHERE is_active = TRUE;

-- invitation indexes
CREATE INDEX idx_invitation_status ON invitation (status);
CREATE INDEX idx_invitation_expires_at ON invitation (expires_at) WHERE status = 'PENDING';

-- delegate_grant indexes
CREATE INDEX idx_dg_grantee_owner ON delegate_grant (grantee_user_id, owner_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_dg_grantor ON delegate_grant (grantor_user_id) WHERE status = 'ACTIVE';

-- login_event index
CREATE INDEX idx_login_event_user_occurred ON login_event (user_id, occurred_at DESC);

-- otp_verification index
CREATE INDEX idx_otp_user_type ON otp_verification (user_id, otp_type) WHERE used_at IS NULL;

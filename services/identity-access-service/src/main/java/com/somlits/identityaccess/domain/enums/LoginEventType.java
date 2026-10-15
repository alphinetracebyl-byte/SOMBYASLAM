package com.somlits.identityaccess.domain.enums;

public enum LoginEventType {
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    LOGOUT,
    PASSWORD_RESET_REQUESTED,
    PASSWORD_RESET_COMPLETED,
    ACCOUNT_LOCKED,
    ACCOUNT_UNLOCKED,
    OTP_SENT,
    OTP_VERIFIED,
    OTP_FAILED
}

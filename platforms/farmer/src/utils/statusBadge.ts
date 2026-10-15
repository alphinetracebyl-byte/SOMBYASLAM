export interface BadgeStyle { bg: string; color: string; label: string }

export const STATUS_BADGE: Record<string, BadgeStyle> = {
  // Batch / registration
  DRAFT:        { bg: '#f1f5f9', color: '#475569', label: 'Draft'        },
  SUBMITTED:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Submitted'    },
  UNDER_REVIEW: { bg: '#dbeafe', color: '#1e40af', label: 'Under Review' },
  APPROVED:     { bg: '#dcfce7', color: '#166534', label: 'Approved'     },
  REJECTED:     { bg: '#fee2e2', color: '#991b1b', label: 'Rejected'     },
  TAGGED:            { bg: '#d1fae5', color: '#065f46', label: 'Tagged'              },
  PENDING_QUARANTINE:{ bg: '#fef3c7', color: '#b45309', label: 'Awaiting Inspection' },
  QUARANTINE:        { bg: '#ffedd5', color: '#d97706', label: 'In Quarantine'        },
  // Animal
  ACTIVE:       { bg: '#dcfce7', color: '#166534', label: 'Active'       },
  RESTRICTED:   { bg: '#fef3c7', color: '#92400e', label: 'Restricted'   },
  QUARANTINED:  { bg: '#fee2e2', color: '#991b1b', label: 'Quarantined'  },
  DEAD:         { bg: '#f1f5f9', color: '#6b7280', label: 'Dead'         },
  SLAUGHTERED:  { bg: '#f1f5f9', color: '#6b7280', label: 'Slaughtered'  },
  EXPORTED:     { bg: '#ede9fe', color: '#5b21b6', label: 'Exported'     },
  MISSING:      { bg: '#fef3c7', color: '#92400e', label: 'Missing'      },
  // Movement
  PENDING:              { bg: '#fef3c7', color: '#92400e', label: 'Pending'             },
  INSPECTION_ASSIGNED:  { bg: '#ecfeff', color: '#0e7490', label: 'Inspection Assigned'  },
  INSPECTION_FAILED:    { bg: '#fee2e2', color: '#991b1b', label: 'Inspection Failed'    },
  PERMIT_ISSUED:        { bg: '#dbeafe', color: '#1e40af', label: 'Permit Issued'        },
  IN_TRANSIT:           { bg: '#f0fdf4', color: '#15803d', label: 'In Transit'           },
  COMPLETED:            { bg: '#f1f5f9', color: '#475569', label: 'Completed'            },
  CANCELLED:            { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled'            },
  // Certificate
  ISSUED:       { bg: '#dcfce7', color: '#166534', label: 'Issued'       },
  PENDING_REVIEW:{ bg: '#fef3c7', color: '#92400e', label: 'Pending Review'},
  EXPIRED:      { bg: '#f1f5f9', color: '#9ca3af', label: 'Expired'      },
  REVOKED:      { bg: '#f5f3ff', color: '#5b21b6', label: 'Revoked'      },
  // Health
  VACCINATED:   { bg: '#d1fae5', color: '#065f46', label: 'Vaccinated'   },
  TREATED:      { bg: '#dbeafe', color: '#1e40af', label: 'Treated'      },
  // Tag request
  ALLOCATED:    { bg: '#dbeafe', color: '#1e40af', label: 'Allocated'    },
  WITH_FARMER:  { bg: '#dcfce7', color: '#166534', label: 'With Farmer'  },
  IN_TRANSIT_TAG:{ bg: '#f0fdf4', color: '#15803d', label: 'In Transit'  },
  APPLIED:      { bg: '#d1fae5', color: '#065f46', label: 'Applied'      },
  FAILED:       { bg: '#fee2e2', color: '#991b1b', label: 'Failed'       },
};

export function getBadge(status: string): BadgeStyle {
  return STATUS_BADGE[status] ?? { bg: '#f1f5f9', color: '#6b7280', label: status };
}

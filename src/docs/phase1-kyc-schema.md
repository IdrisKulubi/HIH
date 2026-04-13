# Phase 1 KYC Schema Notes

Phase 1 introduces the persistence layer needed for the KYC gateway.

## What was added

### New enums

- `kyc_status`
- `profile_lock_status`
- `kyc_document_type`
- `kyc_change_request_status`

### Existing domain fields extended

`applications`

- `kycStatus`
- `kycRequired`
- `selectedAt`
- `kycSubmittedAt`
- `kycVerifiedAt`
- `kycVerifiedBy`

`businesses`

- `verificationStatus`

### New tables

`kyc_profiles`

- the main KYC record per selected enterprise
- links one application, one business, and one user
- stores KYC status, lock state, baseline fields, KYC review notes, snapshots, and review metadata

`kyc_documents`

- stores required and supporting KYC files
- supports per-document verification and rejection notes

`kyc_field_changes`

- records delta changes between original application data and KYC-updated values

`kyc_change_requests`

- supports controlled post-verification change requests for locked fields

## Why this shape was chosen

- KYC remains a separate workflow from application review
- existing application and business records are still the source application data
- KYC-specific compliance and verification state lives in dedicated tables
- downstream modules can rely on `kyc_profiles.status = verified` or `applications.kycStatus = verified`
- profile locking is modeled explicitly instead of being implied

## What Phase 1 does not include yet

- no KYC server actions yet
- no KYC enterprise routes yet
- no KYC admin review UI yet
- no migration file generated yet
- no automatic backfill from existing selected applications yet

## Phase 2 implementation dependency

The next code step should build:

- KYC action helpers
- KYC draft/save/submit flows
- admin verify/request-info actions
- route guards based on KYC state

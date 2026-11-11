# Data Processing Agreement (DPA): hospital partnerships

> **INTERNAL · DRAFT TEMPLATE · REQUIRES LEGAL REVIEW.**
> Outline for an agreement between a healthcare organisation (controller) and VitalCheer (processor)
> covering personal data processed during prototype testing. Clause wording must be prepared or approved
> by a qualified lawyer. Version 0.1 · prepared 11 November 2026.

## Parties

- **Controller:** [HOSPITAL / HEALTHCARE ORGANISATION LEGAL NAME], [ADDRESS]
- **Processor:** [LEGAL ENTITY NAME], [REGISTERED BUSINESS ADDRESS]
- Linked agreement: Prototype Testing Agreement dated [DATE]

## 1. Definitions and interpretation

Personal data, special categories / sensitive personal data (including data concerning health), processing,
controller, processor, sub-processor and personal data breach, aligned with the
**Personal Data Protection Act, No. 9 of 2022 (Sri Lanka)**, as amended by the **Personal Data Protection
(Amendment) Act, No. 22 of 2025**, and, where it applies, the GDPR. [LEGAL REVIEW: CONFIRM DEFINITIONS AND WHICH PROVISIONS ARE IN FORCE]

## 2. Subject matter, duration, nature and purpose

- **Subject matter:** operation of the VitalCheer prototype IV monitoring system during the testing period.
- **Duration:** the testing period in the linked agreement, plus the return/deletion period in clause 11.
- **Nature:** collection, storage, display, transmission (including over Bluetooth and to cloud infrastructure), alerting, deletion.
- **Purpose:** monitoring infusions for evaluation of the prototype, alongside, not replacing, standard clinical monitoring.

## 3. Categories of data subjects and data (Annex A)

| Data subjects | Data categories | Notes |
| --- | --- | --- |
| Patients | Identifier or name [CONFIRM], bed, ward; infusion parameters; alerts | Health data, special category |
| Nurses / healthcare professionals | Name, role, ward, work email, sign-in details, audit trail | |
| Devices (linked to the above) | Flow, volume, sensor readings, battery, connection, timestamps | Personal data once linked to a bed/patient |

Prefer pseudonymous identifiers (bed/episode numbers) over patient names: [DECISION REQUIRED].

## 4. Processor obligations

- Process only on the controller's documented instructions (Annex B), including for transfers.
- Confidentiality commitments from all personnel with access.
- Implement the technical and organisational measures in Annex C.
- Assist the controller with data subject requests, impact assessments and consultations with authorities.
- Make available information needed to demonstrate compliance; allow audits on [AUDIT TERMS].
- Inform the controller if an instruction appears to breach applicable law.

## 5. Controller obligations

Lawful basis and conditions for processing health data; transparency notices to patients and staff;
accuracy of data entered; ensuring the prototype is used under clinical supervision.

## 6. Sub-processors (Annex D)

Prior written authorisation, flow-down of equivalent obligations, notice of changes. Current candidates:
[CLOUD PROVIDER AND HOSTING REGION], [OTHER SUB-PROCESSORS]. Note: the public website's form provider
(FormSubmit) and Gmail are **not** to be used for patient data.

## 7. International transfers

Location of processing: [HOSTING REGION]. Transfer mechanism and safeguards: [LEGAL REVIEW: CROSS-BORDER TRANSFER REQUIREMENTS UNDER THE PDPA AND, WHERE RELEVANT, GDPR].

## 8. Security

Reference Annex C; minimum measures to be confirmed against what is actually implemented. Do not list measures that are not in place.

## 9. Personal data breaches

Notify the controller without undue delay and within [HOURS] of becoming aware; content of notice; cooperation;
see `data-breach-incident-response-policy.md`.

## 10. Data subject rights

Forward requests to the controller within [DAYS]; assist with access, rectification, erasure, objection and review requests.

## 11. Return and deletion

At the end of testing: return or delete personal data within [DAYS], as the controller chooses; certify deletion;
retention only where required by law.

## 12. Liability, term and termination

[LEGAL REVIEW: LIABILITY ALLOCATION, INSURANCE AND INDEMNITIES]

## 13. Governing law

[APPLICABLE GOVERNING JURISDICTION]

### Annexes

- **A:** Data subjects and categories (above, to be finalised)
- **B:** Controller's documented instructions
- **C:** Technical and organisational security measures (implemented only)
- **D:** Approved sub-processors
- **E (if US covered entity):** HIPAA business associate terms, only if VitalCheer acts as a business associate. [LEGAL REVIEW]

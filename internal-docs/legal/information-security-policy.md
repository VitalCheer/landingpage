# Information Security Policy

> **INTERNAL · DRAFT · REQUIRES TECHNICAL AND LEGAL REVIEW.**
> This policy describes the controls the team **intends** to apply. Each control is marked
> **Implemented**, **Planned** or **Decision required**. Only *Implemented* controls may be described to
> partners or in public documents. Version 0.1 · 11 November 2026.

## 1. Purpose and scope

Protect the confidentiality, integrity and availability of VitalCheer systems and of personal data,
especially health data, across: the public website, the enquiries inbox, source code repositories,
IoT devices and firmware, Bluetooth communication, the web dashboard, the backend and cloud infrastructure.

## 2. Roles and responsibilities

- Security owner: [NAME / ROLE]
- Privacy contact / data protection officer: [NAME / ROLE]
- All team members: follow this policy, report incidents immediately.

## 3. Data classification

| Class | Examples | Handling |
| --- | --- | --- |
| Restricted | Patient-related information, health data | Never in email, chat, personal devices or test fixtures; encrypted; least access |
| Confidential | Staff account data, credentials, keys, partner agreements | Access on need-to-know; secrets never in source code |
| Internal | Designs, unreleased code, these drafts | Team only |
| Public | Website content | |

## 4. Controls

| Area | Control | Status |
| --- | --- | --- |
| Accounts | MFA on GitHub, email and cloud accounts | [DECISION REQUIRED] |
| Accounts | Unique accounts; no shared logins; removal when people leave | Planned |
| Access | Role-based access in the dashboard; least privilege | Planned |
| Transport | HTTPS/TLS for website, dashboard and APIs | Website: [CONFIRM WITH HOST]; backend: Planned |
| Storage | Encryption at rest for databases and backups | Planned |
| Bluetooth | Authenticated pairing; encrypted BLE link | Planned [CONFIRM CAPABILITY OF HARDWARE] |
| Firmware | Signed updates; disable debug interfaces in field units | Planned |
| Logging | Audit log of access and changes to patient-related data | Planned |
| Secrets | Secrets in a secrets manager / environment, not in the repository | [CHECK REPOSITORY] |
| Dependencies | Track and update third-party packages (`npm audit`, Dependabot) | [DECISION REQUIRED] |
| Test data | Use simulated or anonymised data; no real patient data in development | Planned |
| Backups | Encrypted backups; tested restore | Planned |

## 5. Secure development

Code review before merge; no real patient data in tests; threat modelling for Bluetooth and alerting paths;
security testing before any site testing. [DECISION REQUIRED: SCOPE OF PENETRATION TESTING]

## 6. Devices and media

Lost or stolen devices reported immediately; disk encryption on team laptops [CONFIRM]; prototype devices
wiped before leaving a test site.

## 7. Suppliers

Assess providers (cloud, form handling, email) before they process personal data; maintain the sub-processor list (DPA Annex D).

## 8. Incidents

Follow `data-breach-incident-response-policy.md`.

## 9. Review

Reviewed at least every [PERIOD], and before each new test site.

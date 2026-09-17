# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# SOFO (SOULOFFICE)
## ALL-IN-ONE DIGITAL OFFICE & COMMUNITY ECOSYSTEM

Version: 2.0.0
Status: Master Product & Engineering Specification
Product: SOFO (SOULOFFICE)
Tagline: Your All-in-One Digital Office & Community Ecosystem

---

# 1. PRODUCT IDENTITY

## 1.1 Product Name

SOFO

Full Name:

SOULOFFICE

## 1.2 Tagline

Your All-in-One Digital Office & Community Ecosystem

## 1.3 Product Category

Digital Workplace
Collaboration Platform
Community Platform
Project Management
Communication Platform
Virtual Office

## 1.4 Core Concept

SOFO adalah sebuah Digital Office yang menyatukan:

- Identity
- Authentication
- Workspace
- Organization
- Roles
- Permissions
- Communication
- Channels
- Messaging
- File Sharing
- Meeting
- Live Notes
- Project
- Task
- Calendar
- Attendance
- Request
- Approval
- Notification
- Search
- Audit
- Administration
- Community
- Client Access

ke dalam satu ecosystem.

---

# 2. PRODUCT VISION

SOFO dibangun untuk mengurangi fragmentasi aplikasi dalam aktivitas kerja.

Konsep utama:

ONE ACCOUNT
↓
ONE WORKSPACE
↓
ONE DIGITAL OFFICE
↓
COMMUNICATION
+
MEETING
+
PROJECT
+
TASK
+
CALENDAR
+
ATTENDANCE
+
APPROVAL
+
FILE
+
COMMUNITY
+
ORGANIZATION

SOFO bukan sekadar aplikasi chat.

SOFO adalah lingkungan kerja digital.

---

# 3. PRODUCT MISSION

SOFO memiliki misi:

1. Menyatukan komunikasi.
2. Menyatukan kolaborasi.
3. Menyatukan pekerjaan.
4. Menyatukan administrasi.
5. Menyatukan meeting.
6. Menyatukan project management.
7. Menyediakan digital organization.
8. Mengurangi ketergantungan terhadap banyak aplikasi.
9. Menyediakan platform yang fleksibel untuk perusahaan maupun komunitas.
10. Menyediakan codebase yang mudah dipahami, dikembangkan, diuji, dan dirawat.

---

# 4. PROBLEM STATEMENT

Saat ini satu organisasi dapat menggunakan:

WhatsApp
→ Chat

Discord
→ Community

Zoom / Google Meet
→ Meeting

Google Drive
→ File

Trello / Jira
→ Project

Google Calendar
→ Schedule

Spreadsheet
→ Attendance

Email
→ Approval

Hal tersebut menyebabkan:

- informasi tersebar
- file tersebar
- histori sulit dicari
- workflow terputus
- meeting tidak terhubung dengan task
- approval terpisah
- administrasi manual
- user harus berpindah aplikasi

SOFO menyatukan workflow tersebut.

---

# 5. TARGET USER

## 5.1 Enterprise

- PT
- perusahaan
- corporate
- startup

## 5.2 UMKM

- bisnis kecil
- toko
- agency
- operational team

## 5.3 Agency

- creative agency
- software agency
- marketing agency

## 5.4 Freelancer

- individual freelancer
- freelancer team
- remote worker

## 5.5 Community

- komunitas
- organisasi independen
- creative community
- developer community

## 5.6 Client

External user yang hanya membutuhkan akses terhadap bagian tertentu dari workspace.

---

# 6. FUNDAMENTAL PRODUCT PRINCIPLE

SOFO harus mengikuti prinsip:

SIMPLICITY
SECURITY
MODULARITY
READABILITY
MAINTAINABILITY
SCALABILITY
TESTABILITY

Prioritas:

CORRECTNESS
↓
SECURITY
↓
READABILITY
↓
MAINTAINABILITY
↓
TESTABILITY
↓
PERFORMANCE
↓
SCALABILITY

---

# 7. MASTER SYSTEM TREE

SOFO dibangun dari akar.

ROOT:

SOFO PLATFORM

├── 01 IDENTITY
│
├── 02 AUTHENTICATION
│
├── 03 USER
│
├── 04 WORKSPACE
│
├── 05 TENANT
│
├── 06 ORGANIZATION
│
├── 07 ROLE
│
├── 08 PERMISSION
│
├── 09 COMMUNICATION
│
├── 10 CHANNEL
│
├── 11 MESSAGE
│
├── 12 FILE
│
├── 13 MEETING
│
├── 14 LIVE NOTES
│
├── 15 PROJECT
│
├── 16 TASK
│
├── 17 CALENDAR
│
├── 18 ATTENDANCE
│
├── 19 REQUEST
│
├── 20 APPROVAL
│
├── 21 NOTIFICATION
│
├── 22 SEARCH
│
├── 23 AUDIT
│
├── 24 ADMINISTRATION
│
├── 25 COMMUNITY
│
├── 26 CLIENT ACCESS
│
└── 27 PLATFORM INFRASTRUCTURE

Semua cabang harus memiliki dependency yang jelas.

Tidak boleh mengerjakan cabang anak sebelum akar yang menjadi dependency-nya siap.

---

# 8. DEVELOPMENT TREE

Urutan pembangunan:

ROOT
↓
FOUNDATION
↓
IDENTITY
↓
AUTHENTICATION
↓
USER
↓
TENANT
↓
WORKSPACE
↓
ORGANIZATION
↓
ROLE
↓
PERMISSION
↓
CORE COMMUNICATION
↓
CHANNEL
↓
MESSAGE
↓
FILE
↓
REALTIME
↓
MEETING
↓
LIVE NOTES
↓
PROJECT
↓
TASK
↓
CALENDAR
↓
ATTENDANCE
↓
REQUEST
↓
APPROVAL
↓
NOTIFICATION
↓
SEARCH
↓
AUDIT
↓
ADMIN
↓
COMMUNITY
↓
CLIENT
↓
ADVANCED FEATURES

---

# 9. DEVELOPMENT RULE

Tidak boleh langsung membuat seluruh fitur sekaligus.

Development harus dilakukan:

ROOT
→ FOUNDATION
→ FIRST BRANCH
→ VALIDATE
→ CONNECT
→ TEST
→ NEXT BRANCH

Setiap branch harus benar-benar terhubung dengan branch sebelumnya sebelum lanjut.

---

# 10. FOUNDATION

Foundation mencakup:

- project initialization
- repository
- architecture
- environment
- configuration
- dependency management
- coding convention
- linting
- formatting
- testing
- CI/CD
- documentation
- error handling
- logging

Foundation harus selesai terlebih dahulu.

---

# 11. ARCHITECTURE FOUNDATION

Architecture harus memiliki separation of concerns.

Minimal:

Presentation
↓
Application
↓
Domain
↓
Infrastructure

Business logic tidak boleh bergantung langsung kepada UI.

---

# 12. MODULAR ARCHITECTURE

Module harus memiliki boundary.

Contoh:

modules/

identity/
authentication/
user/
workspace/
organization/
authorization/
communication/
meeting/
project/
calendar/
attendance/
request/
notification/
file/
audit/

Tidak boleh semua logic dimasukkan ke satu folder besar.

---

# 13. DOMAIN OWNERSHIP

Setiap business logic memiliki owner.

Authentication
→ Authentication Domain

Workspace
→ Workspace Domain

Permission
→ Authorization Domain

Messaging
→ Communication Domain

Meeting
→ Meeting Domain

Task
→ Project Domain

Attendance
→ Attendance Domain

Approval
→ Request Domain

Audit
→ Audit Domain

---

# 14. IDENTITY ROOT

Identity merupakan akar user.

Identity menangani:

- unique identifier
- account identity
- profile identity
- identity lifecycle

Semua entity user harus menggunakan identity yang konsisten.

---

# 15. AUTHENTICATION

Authentication menangani:

- registration
- login
- logout
- password
- session
- token
- account verification
- account recovery

Authentication tidak bertanggung jawab terhadap authorization.

---

# 16. AUTHORIZATION

Authorization menentukan:

"User boleh melakukan apa?"

Authentication menentukan:

"Siapa user?"

Keduanya tidak boleh dicampur.

---

# 17. USER

User dapat memiliki:

- profile
- status
- workspace membership
- roles
- preferences
- notification settings

User dapat berada pada beberapa workspace.

---

# 18. TENANT

Workspace harus memiliki tenant boundary.

Tenant A
≠
Tenant B

Data tenant harus terisolasi.

---

# 19. TENANT ISOLATION

Setiap request yang berhubungan dengan workspace harus melakukan tenant validation.

Flow:

REQUEST
↓
AUTHENTICATION
↓
IDENTITY
↓
TENANT CONTEXT
↓
MEMBERSHIP
↓
AUTHORIZATION
↓
RESOURCE
↓
ACTION

Tidak boleh bypass.

---

# 20. WORKSPACE

Workspace adalah root container aktivitas organisasi.

Workspace memiliki:

- name
- logo
- description
- type
- owner
- settings
- members
- channels
- projects
- meetings
- files
- calendar

---

# 21. WORKSPACE MODE

Workspace memiliki:

ENTERPRISE MODE

atau

COMMUNITY / FREELANCE MODE

Core platform tetap sama.

Feature configuration berbeda.

---

# 22. ENTERPRISE MODE

Enterprise menyediakan:

- organization
- department
- division
- team
- employee
- attendance
- leave
- approval
- reimbursement
- company calendar
- audit
- administration

---

# 23. COMMUNITY MODE

Community menyediakan:

- channels
- roles
- members
- discussion
- voice
- events
- moderation
- custom permissions

---

# 24. ORGANIZATION

Enterprise dapat memiliki:

Organization
↓
Department
↓
Division
↓
Team
↓
Member

---

# 25. ROLE SYSTEM

Default roles:

OWNER
ADMIN
MANAGER
STAFF
MEMBER
GUEST
CLIENT
MODERATOR

Role tidak boleh menjadi satu-satunya security mechanism.

Permission tetap harus diperiksa.

---

# 26. CUSTOM ROLE

Owner/Admin dapat membuat role custom.

Contoh:

HR
Finance
Developer
Designer
Client
Reviewer

---

# 27. PERMISSION

Permission harus granular.

Contoh:

workspace.view
workspace.update

member.view
member.invite
member.remove

channel.view
channel.create
channel.update
channel.delete

message.send
message.edit
message.delete
message.pin

meeting.create
meeting.join
meeting.manage

project.create
project.update
project.delete

task.create
task.update
task.assign

file.upload
file.download
file.delete

request.create
request.approve
request.reject

---

# 28. COMMUNICATION ROOT

Communication adalah branch utama setelah identity/workspace/authorization.

Communication terdiri dari:

Channel
↓
Message
↓
Thread
↓
Reaction
↓
Attachment
↓
Notification
↓
Realtime

---

# 29. CHANNEL

Channel dapat berupa:

TEXT
VOICE
ANNOUNCEMENT
PROJECT
PRIVATE
PUBLIC

---

# 30. MESSAGE

Message mendukung:

- create
- edit
- delete
- reply
- mention
- reaction
- pin
- attachment

---

# 31. THREAD

Thread menjaga diskusi tetap terorganisasi.

---

# 32. FILE

File dapat dikaitkan dengan:

- message
- channel
- project
- task
- meeting
- workspace

Access harus mengikuti permission.

---

# 33. REALTIME FOUNDATION

Realtime digunakan untuk:

- messages
- presence
- typing state
- meeting state
- notifications
- events

Realtime harus menangani:

- reconnect
- duplicate event
- ordering
- network failure
- race condition

---

# 34. SOFO MEETING

Meeting menyediakan:

- audio
- video
- microphone
- camera
- screen sharing
- participants
- invitation
- meeting notes

---

# 35. MEETING LIFECYCLE

Create
↓
Schedule
↓
Invite
↓
Join
↓
Active
↓
End
↓
Archive

---

# 36. LIVE NOTES

Meeting memiliki live notes.

Notes dapat berisi:

- key points
- decisions
- action items
- important information

---

# 37. MEETING ARCHIVE

Meeting selesai:

Meeting
↓
Notes
↓
Archive
↓
Project / Channel
↓
Notification

---

# 38. PROJECT

Project memiliki:

- owner
- members
- status
- priority
- deadline
- description
- tasks

---

# 39. TASK

Task memiliki:

- title
- description
- assignee
- priority
- status
- deadline
- checklist
- comments
- attachments

Default status:

TO DO
IN PROGRESS
REVIEW
DONE

---

# 40. TASK RELATION

Task dapat terhubung dengan:

Project
↓
Channel
↓
Meeting
↓
Notes
↓
Files

---

# 41. CALENDAR

Calendar menangani:

- meeting
- event
- project deadline
- task deadline
- company event
- reminder

---

# 42. ATTENDANCE

Enterprise Mode:

Clock In
Clock Out
History
Working Hours
Late Status
Correction Request

---

# 43. LEAVE

Leave:

Create
↓
Review
↓
Approve / Reject
↓
Record
↓
Notification

---

# 44. REQUEST

Request dapat berupa:

- leave
- reimbursement
- operational
- document
- permission

---

# 45. APPROVAL

Approval workflow:

Requester
↓
Approver
↓
Review
↓
Approve / Reject
↓
Notification
↓
Audit

---

# 46. NOTIFICATION

Notification berasal dari event.

Contoh:

TaskAssigned
MeetingStarted
MeetingInvitation
RequestApproved
RequestRejected
MemberInvited

---

# 47. EVENT SYSTEM

Event:

ACTION
↓
EVENT
↓
HANDLER
↓
SIDE EFFECT

Contoh:

RequestApproved
↓
Notification
↓
Audit

Business logic tidak boleh di-copy ke setiap event handler.

---

# 48. SEARCH

Global search:

User
Channel
Message
File
Project
Task
Meeting
Notes

Search wajib mengikuti authorization.

---

# 49. AUDIT

Audit log mencatat:

WHO
WHAT
WHEN
TARGET
RESULT

Critical action wajib dapat ditelusuri.

---

# 50. ADMINISTRATION

Admin panel mengelola:

- users
- members
- roles
- permissions
- departments
- channels
- projects
- requests
- attendance
- security
- audit

---

# 51. CLIENT ACCESS

Client mendapatkan access terbatas.

Client hanya dapat melihat resource yang diberikan.

Tidak boleh melihat:

- internal channel
- internal employee information
- confidential files
- internal discussions

---

# 52. DASHBOARD

Dashboard menyesuaikan role.

Member:

- tasks
- meetings
- calendar
- messages

Manager:

- team
- projects
- requests
- attendance

Owner:

- workspace
- organization
- members
- projects
- analytics
- administration

---

# 53. DATA RELATIONSHIP

Core relationship:

User
↓
Membership
↓
Workspace
↓
Role
↓
Permission

Workspace
↓
Channel
↓
Message

Workspace
↓
Project
↓
Task

Workspace
↓
Meeting
↓
Notes

Workspace
↓
Request
↓
Approval

Workspace
↓
Calendar

Workspace
↓
Files

Workspace
↓
Audit

---

# 54. API DESIGN

API harus konsisten.

Contoh:

/api/v1/auth
/api/v1/users
/api/v1/workspaces
/api/v1/members
/api/v1/roles
/api/v1/permissions
/api/v1/channels
/api/v1/messages
/api/v1/files
/api/v1/meetings
/api/v1/projects
/api/v1/tasks
/api/v1/calendar
/api/v1/attendance
/api/v1/requests
/api/v1/notifications
/api/v1/search
/api/v1/audit

---

# 55. API RULE

Setiap API:

1. Validate input.
2. Authenticate.
3. Resolve tenant.
4. Authorize.
5. Execute business logic.
6. Return standardized response.
7. Log jika diperlukan.

---

# 56. ERROR SYSTEM

Standard error:

VALIDATION_ERROR
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
INTERNAL_ERROR

Tidak boleh expose:

- stack trace
- database information
- secret
- internal implementation

---

# 57. DATABASE

Database harus memiliki:

- primary key
- foreign key
- indexes
- constraints
- migrations
- timestamps
- soft delete jika diperlukan

---

# 58. DATABASE RULE

Database tidak boleh menjadi tempat business logic yang tidak terdokumentasi.

Business rule utama harus berada pada application/domain layer.

---

# 59. TRANSACTION

Gunakan transaction untuk operation yang harus atomic.

Contoh:

Create Member
+
Assign Role
+
Create Audit

Harus berhasil seluruhnya atau rollback sesuai kebutuhan.

---

# 60. CODE ORGANIZATION

Source code harus mudah dicari.

Contoh:

src/

├── modules/
│
├── shared/
│
├── infrastructure/
│
├── configuration/
│
└── tests/

---

# 61. MODULE STRUCTURE

Setiap module dapat memiliki:

module/
├── controllers/
├── services/
├── domain/
├── repositories/
├── dto/
├── entities/
├── tests/
└── module configuration

Struktur dapat disesuaikan framework.

---

# 62. CLEAN CODE

Code harus:

- readable
- predictable
- simple
- testable
- maintainable

---

# 63. NAMING

Gunakan nama yang jelas.

Buruk:

x
data
obj
tmp
result2

Baik:

workspaceMember
meetingParticipant
approvalRequest
notificationEvent

---

# 64. SINGLE RESPONSIBILITY

Satu class/function tidak boleh menangani terlalu banyak responsibility.

Hindari:

EverythingService
GlobalManager
SystemHelper

---

# 65. NO DUPLICATION

Sebelum membuat code:

SEARCH
↓
UNDERSTAND
↓
REUSE
↓
EXTEND
↓
REFACTOR
↓
CREATE ONLY IF NECESSARY

---

# 66. SHARED CODE

Shared module hanya berisi code yang benar-benar reusable.

Jangan menjadikan:

shared/

sebagai tempat membuang code yang tidak memiliki architecture yang jelas.

---

# 67. DEPENDENCY RULE

Dependency harus mengalir secara terkontrol.

UI
↓
Application
↓
Domain

Infrastructure tidak boleh mengambil alih business logic.

---

# 68. TESTING

Testing:

Unit
↓
Integration
↓
E2E

Critical feature harus memiliki test.

---

# 69. SECURITY TEST

Minimal test:

- unauthorized access
- forbidden access
- tenant isolation
- role escalation
- permission bypass
- file access
- API abuse

---

# 70. QUALITY CHECK

Sebelum feature dianggap selesai:

[ ] Requirement selesai
[ ] UI selesai
[ ] API selesai
[ ] Database selesai
[ ] Validation selesai
[ ] Authorization selesai
[ ] Error handling selesai
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Tests
[ ] Security
[ ] Documentation
[ ] Lint
[ ] Format
[ ] Type check
[ ] Build
[ ] Regression test

---

# 71. DEVELOPMENT PHASE

## PHASE 00 — DISCOVERY

Tujuan:

Memahami requirement.

Output:

- product scope
- architecture direction
- feature map
- dependency map

Tidak coding sebelum requirement cukup jelas.

---

# 72. PHASE 01 — FOUNDATION

Kerjakan:

- repository
- project
- environment
- architecture
- lint
- formatter
- testing
- CI
- documentation

Acceptance:

Project dapat build dan test.

---

# 73. PHASE 02 — IDENTITY

Kerjakan:

- identity
- user model
- account lifecycle

Acceptance:

Identity dapat dibuat dan dikelola.

---

# 74. PHASE 03 — AUTHENTICATION

Kerjakan:

- registration
- login
- logout
- session
- recovery

Acceptance:

User dapat login dengan aman.

---

# 75. PHASE 04 — TENANT

Kerjakan:

- tenant model
- isolation
- tenant context

Acceptance:

Tenant A tidak dapat mengakses Tenant B.

---

# 76. PHASE 05 — WORKSPACE

Kerjakan:

- create workspace
- update workspace
- workspace membership
- workspace settings

Acceptance:

User dapat membuat dan menggunakan workspace.

---

# 77. PHASE 06 — AUTHORIZATION

Kerjakan:

- roles
- permissions
- authorization engine

Acceptance:

Setiap protected operation memiliki permission check.

---

# 78. PHASE 07 — ORGANIZATION

Kerjakan:

- department
- division
- team
- position
- manager

Acceptance:

Enterprise organization dapat dibuat.

---

# 79. PHASE 08 — COMMUNICATION

Kerjakan:

- channels
- messages
- threads
- reactions
- attachments

Acceptance:

User dapat berkomunikasi.

---

# 80. PHASE 09 — REALTIME

Kerjakan:

- realtime messages
- presence
- typing
- notifications

Acceptance:

Realtime stable dan memiliki reconnect handling.

---

# 81. PHASE 10 — FILE

Kerjakan:

- upload
- download
- access
- metadata
- deletion

Acceptance:

File hanya dapat diakses oleh authorized user.

---

# 82. PHASE 11 — MEETING

Kerjakan:

- meeting room
- audio
- video
- screen share
- participants

Acceptance:

User dapat melakukan meeting.

---

# 83. PHASE 12 — LIVE NOTES

Kerjakan:

- notes
- real-time editing jika diperlukan
- meeting relation
- archive

Acceptance:

Meeting notes tersimpan dan dapat ditemukan.

---

# 84. PHASE 13 — PROJECT

Kerjakan:

- project
- members
- status
- priority
- deadline

---

# 85. PHASE 14 — TASK

Kerjakan:

- create task
- assign
- status
- deadline
- checklist
- comments

---

# 86. PHASE 15 — CALENDAR

Kerjakan:

- events
- meetings
- deadlines
- reminders

---

# 87. PHASE 16 — ATTENDANCE

Kerjakan:

- clock in
- clock out
- history
- working hours
- correction

---

# 88. PHASE 17 — REQUEST & APPROVAL

Kerjakan:

- request
- approval
- rejection
- workflow
- audit

---

# 89. PHASE 18 — NOTIFICATION

Kerjakan centralized notification system.

Semua notification harus berasal dari defined event/source.

---

# 90. PHASE 19 — SEARCH

Kerjakan global search dengan authorization-aware filtering.

---

# 91. PHASE 20 — AUDIT

Kerjakan:

- audit events
- audit viewer
- filtering
- security audit

---

# 92. PHASE 21 — ADMIN

Kerjakan admin dashboard dan management tools.

---

# 93. PHASE 22 — COMMUNITY

Kerjakan:

- public/community workspace
- moderation
- community roles
- events

---

# 94. PHASE 23 — CLIENT

Kerjakan:

- guest
- client
- restricted workspace access
- project-specific access

---

# 95. PHASE 24 — HARDENING

Fokus:

- security
- performance
- database
- API
- realtime
- file
- authorization
- tenant isolation

---

# 96. PHASE 25 — PRODUCTION READINESS

Kerjakan:

- monitoring
- backup
- recovery
- deployment
- CI/CD
- documentation
- incident procedure

---

# 97. PHASE 26 — BETA

SOFO diberikan kepada tester terbatas.

Target:

- employee
- freelancer
- agency
- community
- selected users

---

# 98. PHASE 27 — FEEDBACK LOOP

Flow:

USER
↓
FEEDBACK
↓
BUG / UX / FEATURE REQUEST
↓
TRIAGE
↓
PRIORITY
↓
IMPLEMENTATION
↓
TEST
↓
RELEASE

---

# 99. HUMAN-IN-THE-LOOP PRINCIPLE

SOFO menggunakan prinsip:

AI membantu.
Human memegang keputusan akhir.

AI tidak memiliki authority untuk mengambil keputusan berisiko tinggi tanpa approval human.

---

# 100. AI WORK SCOPE

AI boleh:

- membaca code
- menganalisis architecture
- mencari bug
- membuat implementation
- membuat test
- melakukan refactor
- membuat documentation
- menjalankan test
- melakukan static analysis
- membuat migration draft

selama sesuai scope.

---

# 101. HUMAN-ONLY DECISION

AI wajib meminta Human Review untuk:

- perubahan security architecture
- perubahan authentication architecture
- perubahan authorization model
- perubahan tenant isolation
- destructive database migration
- production database operation
- deletion data besar
- perubahan billing/payment
- credential/secret handling
- production deployment berisiko
- legal/privacy decision
- perubahan core architecture
- keputusan yang tidak dapat diverifikasi secara otomatis

---

# 102. AI STOP CONDITION

AI HARUS BERHENTI jika:

1. Requirement ambigu.
2. Architecture conflict.
3. Tidak dapat memastikan behavior.
4. Test gagal dan penyebab belum jelas.
5. Security boundary tidak dapat diverifikasi.
6. Migration berpotensi merusak data.
7. Ada kemungkinan kehilangan data.
8. Existing implementation bertentangan dengan requirement.
9. Tidak tahu business rule yang benar.
10. Membutuhkan keputusan product owner.
11. Membutuhkan credential.
12. Membutuhkan akses production yang berisiko.
13. Ada dua solusi yang memiliki trade-off besar dan tidak dapat dipilih secara objektif.

AI tidak boleh menebak.

---

# 103. HUMAN HANDOFF

Jika AI tidak dapat melanjutkan:

AI harus memberikan:

PROBLEM
↓
CURRENT STATE
↓
WHAT WAS ATTEMPTED
↓
ERROR
↓
ROOT CAUSE IF KNOWN
↓
WHAT IS BLOCKING
↓
OPTIONS
↓
RECOMMENDED OPTION
↓
DECISION REQUIRED FROM HUMAN

---

# 104. NO FAKE COMPLETION

AI dilarang menyatakan:

"Completed"

jika:

- test gagal
- build gagal
- feature belum terhubung
- dependency belum selesai
- migration belum tervalidasi
- security belum diverifikasi
- requirement belum terpenuhi

---

# 105. NO ASSUMPTION RULE

Jika informasi tidak tersedia:

JANGAN MENEBak.

Gunakan:

NEED HUMAN DECISION

---

# 106. AI IMPLEMENTATION LOOP

AI harus bekerja:

UNDERSTAND
↓
INSPECT
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
VERIFY
↓
REVIEW
↓
INTEGRATE
↓
REPORT

---

# 107. BEFORE CODING

AI wajib:

1. Membaca architecture.
2. Membaca relevant module.
3. Mencari existing implementation.
4. Memeriksa dependency.
5. Memeriksa test.
6. Menentukan impact.

---

# 108. BEFORE CREATING FILE

AI harus memastikan:

- file belum ada
- responsibility belum tersedia
- reusable component tidak tersedia
- existing service tidak dapat digunakan

---

# 109. AFTER CODING

AI wajib:

- run formatter
- run linter
- run type check
- run tests
- run build
- review changed files

Jika salah satu gagal:

Jangan menyatakan selesai.

---

# 110. NO DUPLICATE IMPLEMENTATION

Tidak boleh membuat:

AuthService2
AuthHelperNew
MessageServiceNew
WorkspaceManager2

hanya karena implementation sebelumnya tidak langsung dipahami.

Cari dan refactor terlebih dahulu.

---

# 111. NO DEAD CODE

Jangan meninggalkan:

- unused imports
- unused functions
- unused classes
- abandoned components
- temporary files
- backup code

---

# 112. NO SECRET

Tidak boleh memasukkan:

- password
- API key
- token
- private key
- production credential

ke source code.

---

# 113. SECURITY-FIRST RULE

Frontend bukan security boundary.

Semua permission harus diverifikasi backend.

---

# 114. MAINTAINABILITY RULE

Developer baru harus dapat memahami module tanpa harus bertanya kepada developer sebelumnya.

---

# 115. DOCUMENTATION RULE

Architecture decision penting harus didokumentasikan.

Jika AI membuat keputusan teknis penting, decision harus dicatat.

---

# 116. ARCHITECTURE DECISION RECORD

Gunakan ADR:

docs/adr/

Contoh:

ADR-001-authentication.md
ADR-002-multitenancy.md
ADR-003-realtime.md

---

# 117. CHANGE IMPACT ANALYSIS

Sebelum perubahan besar:

FEATURE
↓
DEPENDENCY
↓
AFFECTED MODULE
↓
DATABASE
↓
API
↓
SECURITY
↓
TEST
↓
MIGRATION
↓
ROLLBACK

---

# 118. BACKWARD COMPATIBILITY

Breaking change harus:

- diidentifikasi
- didokumentasikan
- diuji
- memiliki migration strategy

---

# 119. DATABASE SAFETY

Sebelum migration berisiko:

BACKUP
↓
MIGRATION PLAN
↓
TEST
↓
VERIFY
↓
HUMAN APPROVAL
↓
PRODUCTION

---

# 120. PRODUCTION SAFETY

AI tidak boleh menjalankan destructive production operation tanpa human approval.

---

# 121. OBSERVABILITY

System harus menyediakan:

- logs
- metrics
- request ID
- error tracking
- health checks

---

# 122. LOGGING

Tidak boleh mencatat:

- password
- token
- secret
- private credential
- sensitive personal information tanpa kebutuhan

---

# 123. PERFORMANCE

Gunakan:

- pagination
- indexing
- caching bila diperlukan
- lazy loading
- efficient query
- connection management

Jangan melakukan premature optimization.

---

# 124. SCALABILITY

Architecture harus dapat berkembang dari:

Small Workspace
↓
Multiple Workspace
↓
Thousands of Users
↓
Large Organization

tanpa perlu membongkar seluruh core architecture.

---

# 125. RELIABILITY

System harus menangani:

- timeout
- network failure
- database failure
- realtime disconnect
- duplicate request
- retry
- recovery

---

# 126. DATA CONSISTENCY

Data antara:

Frontend
Backend
Database
Realtime
Cache

harus memiliki synchronization strategy.

---

# 127. ACCESSIBILITY

UI harus mempertimbangkan:

- keyboard navigation
- readable contrast
- semantic structure
- screen reader compatibility

---

# 128. RESPONSIVE

UI harus mendukung:

Desktop
Tablet
Mobile

---

# 129. INTERNATIONALIZATION

Architecture dapat mendukung:

Bahasa Indonesia
English

---

# 130. TIMEZONE

Timestamp harus konsisten.

Workspace dan user dapat memiliki timezone.

---

# 131. BACKUP

Production harus memiliki:

- database backup
- storage backup jika diperlukan
- restore procedure

---

# 132. DISASTER RECOVERY

Harus tersedia:

- recovery procedure
- backup verification
- incident procedure

---

# 133. RELEASE

Setiap release harus memiliki:

Version
Changelog
Migration
Testing status
Known issue
Rollback strategy

---

# 134. CI/CD

Pipeline:

CHECKOUT
↓
INSTALL
↓
FORMAT CHECK
↓
LINT
↓
TYPE CHECK
↓
UNIT TEST
↓
INTEGRATION TEST
↓
SECURITY SCAN
↓
BUILD
↓
DEPLOY

---

# 135. ENVIRONMENT

Minimal:

Development
Staging
Production

Tidak boleh menggunakan production secret di development.

---

# 136. FEATURE FLAG

Feature flag digunakan untuk:

- beta
- gradual release
- experimental feature
- emergency disable

Feature flag yang sudah tidak diperlukan harus dihapus.

---

# 137. TEST PYRAMID

Unit test
→ banyak

Integration test
→ cukup

E2E
→ critical flow

---

# 138. CRITICAL E2E

Minimal:

Register
↓
Login
↓
Create Workspace
↓
Invite
↓
Accept
↓
Role
↓
Permission
↓
Channel
↓
Message
↓
File
↓
Meeting
↓
Project
↓
Task
↓
Request
↓
Approval
↓
Notification
↓
Logout

---

# 139. SECURITY ACCEPTANCE

MVP tidak boleh release jika terdapat:

- tenant isolation bypass
- privilege escalation
- authentication bypass
- authorization bypass
- sensitive data exposure
- critical injection vulnerability
- insecure file access

---

# 140. PRODUCT ACCEPTANCE

MVP harus dapat:

1. Register.
2. Login.
3. Membuat workspace.
4. Memilih mode.
5. Mengundang user.
6. Memberikan role.
7. Membuat channel.
8. Mengirim message.
9. Mengirim file.
10. Membuat meeting.
11. Membuat notes.
12. Membuat project.
13. Membuat task.
14. Menggunakan calendar.
15. Melakukan attendance.
16. Membuat request.
17. Melakukan approval.
18. Menerima notification.
19. Melihat audit.
20. Mengakses data sesuai permission.

---

# 141. MVP P0

Paling fundamental:

Identity
Authentication
User
Tenant
Workspace
Membership
Role
Permission
Channel
Message
Realtime
File
Basic Meeting
Project
Task

---

# 142. MVP P1

Setelah P0 stabil:

Live Notes
Calendar
Attendance
Request
Approval
Notification
Search
Audit
Admin
Client Access

---

# 143. P2

Setelah core stabil:

Community features
Advanced analytics
Advanced reporting
Mobile
Desktop
AI
Automation
Integrations

---

# 144. DEVELOPMENT ORDER RULE

Tidak boleh:

P0 belum stabil
↓
langsung mengerjakan P2

Urutan:

CORE
↓
STABLE
↓
INTEGRATED
↓
TESTED
↓
HARDENED
↓
NEXT FEATURE

---

# 145. FEATURE DEPENDENCY RULE

Contoh:

Task
bergantung pada:

Workspace
+
Authorization
+
Project

Meeting Notes
bergantung pada:

Meeting
+
Storage
+
Authorization

Approval
bergantung pada:

User
+
Workspace
+
Role
+
Permission

Search
bergantung pada:

Authorization
+
Data Sources

---

# 146. ROOT-FIRST RULE

Setiap development branch harus dimulai dari dependency paling rendah.

Tidak boleh membuat child feature dengan membuat mock architecture permanen hanya untuk "mengejar selesai".

---

# 147. INTEGRATION-FIRST RULE

Feature tidak dianggap selesai hanya karena module-nya berhasil dibuat.

Feature harus:

IMPLEMENTED
+
CONNECTED
+
TESTED
+
AUTHORIZED
+
OBSERVABLE

---

# 148. NO ISOLATED FEATURE

Contoh:

Meeting module selesai dibuat tetapi tidak terhubung dengan:

- workspace
- permission
- user
- notification
- notes

maka:

NOT COMPLETE.

---

# 149. DEFINITION OF COMPLETE

COMPLETE berarti:

Code exists
+
Feature works
+
Feature connected
+
Database works
+
API works
+
Authorization works
+
Tests pass
+
Build passes
+
Documentation updated
+
No critical regression

---

# 150. DEFINITION OF BLOCKED

BLOCKED jika:

- human decision dibutuhkan
- requirement tidak jelas
- architecture conflict
- security uncertainty
- production risk
- destructive operation
- unresolved critical bug

Status:

BLOCKED — HUMAN REVIEW REQUIRED

---

# 151. HUMAN REVIEW PROTOCOL

AI harus menyampaikan:

1. Apa yang sedang dikerjakan.
2. Apa yang sudah selesai.
3. Apa yang gagal.
4. Error.
5. Analisis.
6. Risiko.
7. Pilihan solusi.
8. Rekomendasi.
9. Keputusan yang diperlukan dari Owner.

Owner SOFO adalah human final authority.

---

# 152. OWNER AUTHORITY

Owner memiliki keputusan final terhadap:

- product direction
- business rule
- security exception
- architecture change
- production action
- destructive migration
- privacy
- legal requirement
- release decision

---

# 153. AI AUTHORITY LIMIT

AI tidak boleh menganggap:

"Jika bisa dilakukan secara teknis maka boleh dilakukan."

Technical possibility
≠
Product authorization.

---

# 154. HUMAN OVERRIDE

Jika keputusan AI bertentangan dengan keputusan Owner:

Owner decision wins.

---

# 155. AUDIT OF AI CHANGES

Perubahan yang dibuat AI harus dapat ditelusuri melalui:

- commit
- changed files
- test result
- reasoning/decision record bila diperlukan

---

# 156. DEVELOPMENT STATUS

Setiap module memiliki status:

NOT STARTED
↓
PLANNED
↓
IN DEVELOPMENT
↓
IMPLEMENTED
↓
INTEGRATION
↓
TESTING
↓
SECURITY REVIEW
↓
READY FOR REVIEW
↓
APPROVED
↓
DONE

Jika gagal:

BLOCKED

---

# 157. NO SKIPPING STATUS

AI tidak boleh melompati:

IMPLEMENTED
→ DONE

tanpa:

Integration
Testing
Security validation
Build validation

jika requirement tersebut relevan.

---

# 158. MASTER FEATURE MATRIX

Identity
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Authentication
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Tenant
[ ] Planned
[ ] Implemented
[ ] Security Tested
[ ] Integrated
[ ] Approved

Workspace
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Authorization
[ ] Planned
[ ] Implemented
[ ] Security Tested
[ ] Integrated
[ ] Approved

Communication
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Meeting
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Project
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Attendance
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Approval
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Notification
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Search
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Audit
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

Admin
[ ] Planned
[ ] Implemented
[ ] Tested
[ ] Integrated
[ ] Approved

---

# 159. FINAL ARCHITECTURE FLOW

SOFO PLATFORM
↓
IDENTITY
↓
AUTHENTICATION
↓
USER
↓
TENANT
↓
WORKSPACE
↓
MEMBERSHIP
↓
ORGANIZATION
↓
ROLE
↓
PERMISSION
↓
COMMUNICATION
↓
CHANNEL
↓
MESSAGE
↓
REALTIME
↓
FILE
↓
MEETING
↓
LIVE NOTES
↓
PROJECT
↓
TASK
↓
CALENDAR
↓
ATTENDANCE
↓
REQUEST
↓
APPROVAL
↓
NOTIFICATION
↓
SEARCH
↓
AUDIT
↓
ADMIN
↓
COMMUNITY
↓
CLIENT
↓
AI / AUTOMATION / INTEGRATION

---

# 160. FINAL DEVELOPMENT PHILOSOPHY

SOFO tidak dibangun dengan prinsip:

"Yang penting jadi."

SOFO dibangun dengan prinsip:

"Yang dibuat harus benar, terhubung, aman, dapat diuji, dapat dibaca, dan dapat dipelihara."

---

# 161. GOLDEN RULE

CODE YANG BEKERJA
≠
CODE YANG SELESAI

CODE YANG SELESAI:

WORKING
+
READABLE
+
SECURE
+
TESTED
+
INTEGRATED
+
MAINTAINABLE

---

# 162. FINAL AI RULE

AI harus selalu:

READ BEFORE WRITE
SEARCH BEFORE CREATE
REUSE BEFORE DUPLICATE
TEST BEFORE CLAIM
VERIFY BEFORE COMPLETE
ASK BEFORE ASSUME
STOP BEFORE RISK

---

# 163. FINAL HUMAN RULE

Jika AI tidak dapat memastikan sesuatu:

JANGAN MENEBak.

JANGAN MEMAKSA.

JANGAN MEMBUAT WORKAROUND PERMANEN.

JANGAN MENYATAKAN SELESAI.

Berhenti dan serahkan kepada Human Owner.

---

# 164. FINAL PRODUCT STANDARD

SOFO harus menjadi:

SECURE
MODULAR
READABLE
MAINTAINABLE
TESTABLE
SCALABLE
OBSERVABLE
RELIABLE

dengan pengalaman pengguna yang sederhana dan terintegrasi.

---

# 165. FINAL STATEMENT

SOFO (SOULOFFICE) adalah Digital Office & Community Ecosystem yang dibangun dari fondasi paling dasar sampai fitur tingkat tinggi secara bertahap.

Setiap cabang harus berasal dari akar yang benar.

Setiap module harus memiliki dependency yang jelas.

Setiap feature harus terintegrasi.

Setiap perubahan harus dapat diuji.

Setiap security boundary harus diverifikasi.

Setiap code harus mudah dibaca dan dirawat.

Dan ketika AI tidak dapat menentukan keputusan dengan aman atau benar, proses harus berhenti dan keputusan dikembalikan kepada Human Owner.

SOFO tidak mengejar sekadar banyak fitur.

SOFO mengejar sistem yang:

BERFUNGSI
AMAN
TERINTEGRASI
MUDAH DIPAHAMI
MUDAH DIPERBAIKI
MUDAH DIKEMBANGKAN
DAN SIAP BERTUMBUH.

# END OF PRD
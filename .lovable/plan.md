# Plan: Central de Demandas (Demand Center)

Build a complete marketing and material production management module for mentors and their teams (excluding mentees).

## Backend Implementation

1. **Entities & Database**:
    * Create `demand.entity.ts`: Fields for title, type, description, priority, status, dates, briefing, and assignment.
    * Create `demand-version.entity.ts`: For file versioning and agency deliveries.
    * Create `demand-comment.entity.ts`: For timeline communication.
    * Update `kanban-board.entity.ts`: Add `DEMANDS` to `BoardType` enum.

2. **Module & API**:
    * Create `DemandsModule`, `DemandsService`, and `DemandsController`.
    * Implement CRUD for demands.
    * Implement specialized endpoints: `/briefing/generate` (AI), `/approve`, `/request-adjustments`, `/versions`.
    * Implement `DemandStatus` workflow (New -> Analysis -> Production -> Approval -> etc.).

3. **Agency Access**:
    * Create a new `AGENCY` role if not existing, or handle it via a specific `teamRole` flag.
    * Add logic to ensure mentees (`mentorado`) cannot access demand routes.

## Frontend Implementation

1. **Pages**:
    * Create `src/pages/app/DemandsPage.tsx`: Main dashboard with Kanban (Monday/ClickUp style).
    * Create `src/pages/app/DemandDetailPage.tsx`: Deep view with briefing, timeline, files, and versions.

2. **Components**:
    * `DemandKanban`: Modern drag-and-drop board for status tracking.
    * `DemandBriefingForm`: Multi-step or grouped form with AI generation button.
    * `DemandTimeline`: Comment system with file upload support.
    * `VersionHistory`: List of deliverables with approval buttons.

3. **Navigation**:
    * Add "Central de Demandas" to `AppLayout.tsx` sidebar (visible for mentor, team, and agency).

## AI Integration

* Implement AI briefing generator using existing `AiService`.
* Add "Improve Description" and "Suggest Checklist" features within the demand detail.

## Technical Details

* **Status Flow**: `new` | `analysis` | `planned` | `production` | `waiting_feedback` | `review` | `adjustments` | `approved` | `finished` | `canceled`.
* **Roles**:
    * Mentor: Full access.
    * Team: Creation and follow-up.
    * Agency: Operational updates and deliveries.
    * Mentee: No access (enforced via `ProtectedRoute` and `RolesGuard`).

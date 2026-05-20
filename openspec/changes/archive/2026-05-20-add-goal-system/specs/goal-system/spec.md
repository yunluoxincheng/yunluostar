## ADDED Requirements

### Requirement: Layered goal persistence
The system SHALL persist goals with enough structure to distinguish core, long-term, medium-term, short-term, and operational goals.

#### Scenario: Goal has required classification fields
- **WHEN** a goal is created
- **THEN** it stores a type, status, priority, mutability flag, approval requirement flag, evidence, rationale, and timestamps

#### Scenario: Existing goal inspection remains available
- **WHEN** a user inspects goals through the CLI
- **THEN** the system displays persisted goals grouped or ordered by their goal system fields

### Requirement: Core goal initialization
The system SHALL initialize immutable core goals that constrain learned and user-suggested goals.

#### Scenario: Core goals are initialized idempotently
- **WHEN** the goal system starts with an empty goals table
- **THEN** it creates core goals for safety, honesty, controllability, and user alignment

#### Scenario: Core goals are not duplicated
- **WHEN** core goal initialization runs multiple times
- **THEN** the system keeps one active entry per core goal identity

#### Scenario: Core goals cannot be mutated by learned updates
- **WHEN** a reflection or consolidation output suggests changing an immutable core goal
- **THEN** the system rejects or records the suggestion without modifying the core goal

### Requirement: Suggested goal creation
The system SHALL derive suggested goals from completed interactions without silently activating durable non-core goals.

#### Scenario: Long-term user direction creates suggested goal
- **WHEN** an interaction reveals a durable user research or project direction
- **THEN** the system records a suggested long-term or medium-term goal with evidence linked to the source episode

#### Scenario: Suggested durable goal requires approval
- **WHEN** the system creates a suggested long-term, medium-term, or short-term goal
- **THEN** the goal remains inactive until explicitly approved

#### Scenario: Low-risk operational goal can guide current loop
- **WHEN** the system derives a local operational goal that only affects the current cognitive loop
- **THEN** it may use the goal for Working Memory without creating an approved durable user goal

### Requirement: Goal approval transitions
The system SHALL support explicit user-controlled transitions for suggested goals.

#### Scenario: Approving suggested goal activates it
- **WHEN** a user approves a suggested goal
- **THEN** the goal status becomes active and the approval timestamp is recorded

#### Scenario: Rejecting suggested goal prevents use
- **WHEN** a user rejects a suggested goal
- **THEN** the goal status becomes rejected and it is not selected as an active current goal

#### Scenario: Completing active goal removes it from active ranking
- **WHEN** a user marks an active goal as completed
- **THEN** the goal is excluded from future active-goal selection

### Requirement: Goal priority and selection
The system SHALL rank active goals and select a current goal for the agent loop.

#### Scenario: Highest-priority active goal is selected
- **WHEN** multiple non-conflicting active goals exist
- **THEN** the system selects the highest-priority relevant goal as the current goal

#### Scenario: Selected goal is injected into Working Memory
- **WHEN** the system selects a current goal for a session
- **THEN** Working Memory stores that goal in `currentGoal` before response generation

#### Scenario: Suggested and rejected goals are not selected
- **WHEN** a goal has suggested or rejected status
- **THEN** the system does not select it as the current goal

### Requirement: Goal conflict detection
The system SHALL detect conflicts between goals before activating or selecting them.

#### Scenario: Unsafe goal conflicts with core safety
- **WHEN** a suggested or active mutable goal conflicts with a core safety or honesty goal
- **THEN** the system records conflict metadata and prevents that goal from overriding the core goal

#### Scenario: Duplicate goal is not added as noisy state
- **WHEN** a new suggested goal duplicates an existing active or suggested goal
- **THEN** the system reuses, merges, or supersedes the existing goal instead of creating an unrelated duplicate

#### Scenario: Conflicting mutable goals are withheld from automatic selection
- **WHEN** two mutable goals conflict and no approved resolution exists
- **THEN** the system does not select the conflicting lower-priority goal as the current goal

### Requirement: Goal audit trail
The system SHALL record auditable events for goal creation, approval, rejection, completion, pausing, supersession, and conflict handling.

#### Scenario: Goal creation writes audit log
- **WHEN** the system creates a goal
- **THEN** it writes an audit log entry describing the created goal and reason

#### Scenario: Goal transition writes audit log
- **WHEN** a goal changes status or priority
- **THEN** it writes an audit log entry with before and after state

#### Scenario: Conflict handling writes audit log
- **WHEN** the system detects and records a goal conflict
- **THEN** it writes an audit log entry explaining the conflict resolution

### Requirement: Goal system remains bounded
The system SHALL avoid presenting inferred goals as autonomous intent or subjective desire.

#### Scenario: Goal display uses system-state language
- **WHEN** the CLI displays goals
- **THEN** it presents them as tracked system goals or suggested goals rather than subjective wants

#### Scenario: Goal system does not execute external actions
- **WHEN** a goal is selected
- **THEN** the system may influence response context but MUST NOT execute external tools or background actions as part of this capability

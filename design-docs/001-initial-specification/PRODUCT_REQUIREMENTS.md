**Core Concepts**:

1. **Runtime**:

   1. A business unit or sub-organization that holds authority and responsibility. Each runtime has its own goals, policies, and can delegate or negotiate with other runtimes (like microservices or operating systems or other runtimes).
   2. Runtimes will be handled by Orgata, a framework and "business IDE". If BUSY is equivalent to c# or Ruby, then Orgata is equivalent to .NET or Ruby on Rails.
   3. We will follow Team Topologies terminologies for Runtimes: Stream-aligned, Enabling, Complicated-subsystem, and Platform. Platform team is just another Runtime within the bounds of your organization.
   4. Real life teams may not map 1:1 with the Runtimes. For instance, an engineer may be embedded part time with a Stream-aligned team and part-time with a Platform team. The important part is that Runtimes have clear responsibility definitions. Real people will be assigned those responsibilities at runtime, much like memory is assigned to a service at runtime in software.

1.1. **External Dependencies & Package Management**:
   - External dependencies (vendors, tools, regulations) are handled like libraries/packages in traditional software
   - A package manager (similar to npm) pulls down external dependencies and validates interface compatibility
   - External tools may compile to: actual code libraries, MCP servers, or "edge" UIs (browser links, copy/paste workflows)
   - Customer input becomes "new UI" entry points - whether email/Slack/GUI, bots, phone systems, or traditional SaaS apps
   - .busy files define value streams starting from customer contact points and shepherd service delivery
   - Regulations integrate as existing SOPs converted to .busy format, or via tagging system (@audit) for process steps
   - Long-term vision: 3rd party regulatory tools plug in via package management with aspect-oriented programming/middleware

2. **Resource Model**: Think of resources as memory, compute, or I/O in an OS—but applied to business: time, people, capital, attention, etc. The runtime is responsible for requesting these resources from the operating system (OSTEAOS, to be defined later) or if run outside of the OS, the runtime owner will plug these in.

3. **Governance Layering**: Runtimes can be nested, inherited, peer-to-peer, or layered in non-hierarchical ways. These relationships express accountability, resource negotiation, and autonomy constraints.

3.1. **Dynamic vs Static: Multi-Level Architecture (L0/L1/L2)**:
   - **L0 (Core Value Stream)**: The operational layer that delivers customer value through people, process, and software
   - **L1 (Management Layer)**: Works ON the process rather than IN it. Handles cross-process optimizations, product management, agile processes, and project execution. Individuals may split time (e.g., 80% L0 IC work, 20% L1 process improvement)
   - **L2 (Strategic Layer)**: Leadership layer for OKRs, budgets, and resource allocation. Sets direction, prioritizes projects, and manages strategic initiatives like hiring/scaling
   - Changes flow downward: L2 budget decisions → L1 project execution → L0 process updates and redeployment
   - This architecture handles organizational dynamics by providing structured channels for evolution while maintaining operational stability

3.2. **Exception Handling for Unexpected Situations**:
   - When processes encounter situations not accounted for at design time, they raise an "issue" (like a code exception)
   - Execution freezes/pauses, logging state, parameters, and issue details for later review
   - Governance-based resolution: person can manually override, escalate to manager/advisor, or consult AI assistance
   - "Backend access" allows temporary data manipulation, validation overrides, or routing changes as needed
   - All exceptions and resolutions are logged for retrospective analysis (typically in L1 layer)
   - Like debugging software: identify root cause, update relevant .busy files, and redeploy the improved process
   - Prevents rigid processes from forcing workarounds while maintaining governance and learning loops

4. **Complexity Management: File Organization & Scaling**:
   - Standard software engineering practices apply: organized file structure beats typical org SharePoint/Google Drive chaos
   - Small companies: single repo with L0/L1/L2 layers plus cross-org/OS configuration
   - Namespace structure: `Org->Team->Role` mirrors file structure for clarity
   - Each team folder contains: team definition, SOPs, roles, tests, and integration config (unless org-level)
   - Secrets injected via environment variables at runtime (like normal applications)
   - Large organizations: choose between mono-repo vs separate repos per business unit
   - Support/enabling teams become "library" or "utility" repos that compile to hosted services
   - Example: enabling team creates processes/interfaces → compiles to "call service" → other teams integrate as "chat with expert" widget
   - Teams can integrate enabling team libraries for real-time expert consultation during process execution

4.1. **Human Factors: Ambiguity, Politics, and Judgment Calls**:
   - LLMs enable bidirectional translation: high-dimensional human judgment ↔ low-dimensional algorithmic execution
   - Framework designed to maximize human time on creativity/nuanced decisions, minimize paper-pushing drudgery
   - High-dimensional human problems get different interface generation approaches:
     * AI-facilitated meetings with context gathering and decision assistance
     * "Writing sessions" with AI as muse and reviewer for creative work
     * Strategy sessions with AI pre-reads synthesizing market research and trends
   - Process steps can be dynamically elevated when complexity is discovered:
     * Simple algorithmic → AI agent decision-making → Full human-in-the-loop
   - Context gathering: AI assembles all necessary background, research, and insights before human engagement
   - Goal: Business-as-code becomes creativity amplifier, not creativity constraint
   - Humans focus on high-value judgment while automation handles structured execution

5. **Responsibilities**: Declarative statements of what a runtime is accountable for (e.g., "manage inventory", "optimize margin"). These responsibilities will breakdown into one of two types of functional structures: Roles (Classes/Objects) with Job Functions (Functions/Methods) or Playbooks (Process/Procedure) with Steps (Control flow). Both compile the same way but have similar differences to object oriented vs functional programming.

6. **Interfaces**: BUSY includes interfaces for input/output between runtimes, describing what information flows are expected and when. Inputs and outputs between Roles and Playbooks are generally considered deliverables, an organization of information into a formal document, report, or spec. For instance a Warehouse Manager role may be invoked by a weekly "Manage Inventory" playbook. The Manager may have a job function of "Reconcile Inventory" that is the first step of the playbook. The input to this job function is either a link, query, or spreadsheet of the known inventory. The output of this job is an updated version of this. The important features of that spreadsheet should ideally be defined to catch inconsistencies at compile time rather than runtime.

7. **Execution Model**:  A system is valid when responsibilities and constraints align across runtimes with no unresolved contention or conflict. This will generate an application that, for each function, is either executed by code, an agent, or a human. In the case of generating an agent, a prompt and infrastructure to call out to an LLM will be generated. In the case of a human, a UI will be generated to capture the steps and flow needed. A runtime UI will be generated as well to visualize all of it. At runtime if issues arise, they will stop and delegate to a human. Eventually BUSY programs won't "run" like imperative programs. They will negotiate, optimize and stabilize in simulated environments and then be deployed to real world production environments.

8. **Versioning and Change**: Runtimes evolve. BUSY includes constructs to express versioning, migration strategies, and change propagation rules. As issues are fixed discovered, optimizations explored and ideas had, the humans will return generate updates to the BUSY files that will follow the deployment cycle and deploy, following a traditional CI/CD and infrastructure-as-code paradigm.

**Example Input (Pseudo-BUSY)**:

```busy
Team: GrowthOps
Role:
- SDR: responsible for qualifying leads and booking meetings
Advisors:
- AE: responsible for closing deals and maintaining relationships
Manager:
- Sales Manager: Trains and manages the SDRs day to day operations.

Process: Review Leads in Pipeline
Tools:
- MQL criteria
- Salesforce

Cadence:  Monday mornings
Input: Leads - Will have a name, email, and source and time received.
Steps:
When a lead comes in it will be put into the Leads category in Salesforce:
- The SDR should review the source and intent.
- If the lead meets our MQL criteria, we move it to the "Opportunity" step.
- If not, we move it to Archived and take no further action.

If there's disagreement about lead quality:
- The AE and SDR will meet to resolve it (Issue Resolution). The AE should be "on call" during this meeting time and be ready to answer questions should they come up.

Salesforce should be updated with notes and status for every lead worked.
```

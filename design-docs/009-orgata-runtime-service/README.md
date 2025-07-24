# Orgata Runtime Service Design

**Created**: July 2025  
**Status**: Design Phase  
**Scope**: Complete design specification for team-based runtime services

## Overview

This design specification defines the Orgata Runtime Service - a comprehensive platform that serves as the central source of truth for each team's business processes. The service exposes data through three distinct interfaces:

- **Human → UI**: Web interfaces for direct user interaction
- **AI/Agent → MCP**: Model Context Protocol for intelligent assistance  
- **Code → API**: RESTful APIs for programmatic integration

## Design Documents

### 1. [Data Models Specification](./RUNTIME_SERVICE_DATA_MODELS.md)

Comprehensive specification of all data models that the service manages:

- **164 distinct data models** across 8 major categories
- **Business Definition Models**: Organizations, teams, roles, playbooks, documents, BUSY files, business rules
- **Instance & Runtime Data**: Process instances, tasks, issues, audit logs, performance metrics
- **Collaboration Models**: Branches, change proposals, reviews, approvals
- **Analytics Models**: Dashboards, reports, business intelligence
- **Interface Models**: UI views, MCP context, API responses
- **Supporting Models**: Common types, permissions, metadata

### 2. [Service Architecture](./RUNTIME_SERVICE_ARCHITECTURE.md)

Complete architecture specification for the multi-interface service:

- **Layered Architecture**: Interface, service, business logic, data, and infrastructure layers
- **UI Interface**: React-based web application with real-time collaboration
- **MCP Interface**: Context assembly and AI agent integration
- **API Interface**: REST and GraphQL endpoints with comprehensive documentation
- **Security Framework**: Authentication, authorization, compliance, and audit
- **Performance Strategy**: Caching, scaling, monitoring, and optimization

### 3. [Implementation Plan](./IMPLEMENTATION_PLAN.md)

12-month implementation roadmap with detailed deliverables:

- **Phase 1** (Months 1-3): Foundation with core functionality
- **Phase 2** (Months 4-6): Advanced features and collaboration
- **Phase 3** (Months 7-9): Enterprise capabilities and scaling
- **Phase 4** (Months 10-12): AI intelligence and automation
- **Technology Stack**: Complete specification of tools and frameworks
- **Quality Assurance**: Testing strategy and code quality standards
- **Risk Management**: Technical and business risk mitigation

## Key Architectural Decisions

### Team-Based Isolation
Each team operates their own service instance with complete data isolation while sharing the same underlying platform.

### Git-Like Workflows
Business process development follows software development patterns with branching, proposals, reviews, and merging.

### Multi-Interface Design
Same data exposed through three interface types, each optimized for its specific use case while maintaining functional parity.

### AI-First Architecture
Designed from the ground up to support intelligent assistance through the MCP interface while maintaining human control.

### Enterprise-Ready Foundation
Built with security, compliance, scalability, and observability as core requirements rather than afterthoughts.

## Implementation Status

- [x] **Design Phase**: Complete architecture and data model specification
- [ ] **Phase 1**: Foundation development (Months 1-3)
- [ ] **Phase 2**: Advanced features (Months 4-6)  
- [ ] **Phase 3**: Enterprise capabilities (Months 7-9)
- [ ] **Phase 4**: Intelligence & automation (Months 10-12)

## Dependencies

- **Orgata Framework**: ✅ Complete - TypeScript framework for business processes
- **BUSY Compiler**: ✅ Complete - Transforms BUSY files to TypeScript code
- **Design System**: ⏳ Required for UI implementation
- **MCP Specification**: ⏳ Required for AI integration

## Related Documentation

- [Orgata Framework Architecture](../008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md)
- [BUSY Language Specification](../001-initial-specification/)
- [System Architecture Overview](../ARCHITECTURE_OVERVIEW.md)

## Next Steps

1. **Technical Review**: Architecture and implementation plan review
2. **Resource Planning**: Development team allocation and timeline
3. **Infrastructure Setup**: Development environment and CI/CD pipeline
4. **Phase 1 Kickoff**: Begin foundation development

---

*This design represents a significant evolution in how business processes are managed, bringing software engineering best practices to business operations while maintaining the human-centered approach that makes BUSY unique.*
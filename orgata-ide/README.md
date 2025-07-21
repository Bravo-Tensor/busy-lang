# Orgata IDE - Conversational Business Operating System

Orgata IDE is a revolutionary conversational interface for managing business processes using the BUSY language. It allows business owners to create, modify, and optimize their operations through natural language conversations with an AI assistant.

## 🌟 Features

- **Conversational Business Design**: Interview-driven process creation through natural language
- **Live Process Modification**: Real-time changes to running business processes
- **BUSY Language Integration**: Native support for BUSY process files
- **Knit Dependency Management**: Intelligent dependency reconciliation for process coherence
- **Business Intelligence**: Real-time analytics and performance insights
- **Hot-Swappable Components**: Modify processes without interrupting execution

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd busy-lang/orgata-ide
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   AI_PROVIDER=openai  # or 'anthropic'
   AI_API_KEY=your_api_key_here
   AI_MODEL=gpt-4
   DATABASE_URL=file:./orgata-ide.db
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3001](http://localhost:3001)

## 🏗️ Architecture

Orgata IDE is built on four core pillars:

### 1. Conversational AI Engine
- Natural language understanding for business domain
- Intent classification and entity extraction
- Context-aware conversation management
- Multi-turn dialogue support

### 2. BUSY Language Integration
- Native BUSY file generation from conversations
- Process template system for common business types
- Industry-specific process libraries
- Validation and syntax checking

### 3. Business Runtime Environment
- Live process execution engine
- Hot-swappable component system
- Task management and assignment
- Performance monitoring and analytics

### 4. Knit Dependency Reconciliation
- Automatic dependency tracking
- Impact analysis for process changes
- Conflict resolution and validation
- Change approval workflows

## 💬 Usage Examples

### Setting Up Your Business

1. **Start a conversation**: "I want to set up my photography business"
2. **Answer questions**: The AI will interview you about your business
3. **Review generated processes**: See your BUSY files created automatically
4. **Modify as needed**: "Make the client onboarding faster"

### Optimizing Processes

- "The client approval step is taking too long"
- "Add a quality check before we send deliverables"
- "Show me my process performance analytics"
- "Can we automate the invoice generation?"

## 🔧 Development

### Project Structure

```
orgata-ide/
├── src/
│   ├── components/          # React components
│   ├── pages/              # Next.js pages and API routes
│   ├── services/           # Business logic services
│   ├── types/              # TypeScript type definitions
│   ├── lib/                # Utility libraries
│   └── styles/             # CSS styles
├── public/                 # Static assets
└── docs/                   # Documentation
```

### Key Services

- **ConversationEngine**: Handles AI interactions and intent processing
- **BusyGeneratorService**: Generates BUSY files from conversations
- **KnitIntegrationService**: Manages dependency reconciliation
- **ProcessAnalysisService**: Provides business intelligence and analytics

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm test             # Run test suite
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📚 API Reference

### Conversation API

**POST** `/api/conversation/process`
```json
{
  "message": "I want to optimize my client onboarding",
  "sessionId": "session-123",
  "businessContext": { ... }
}
```

### Business Setup API

**POST** `/api/business/setup`
```json
{
  "businessName": "My Photography Business",
  "industry": "Photography",
  "businessSize": "small",
  "mainProcesses": ["Client Onboarding", "Photo Production"],
  "goals": ["Reduce process time", "Improve quality"]
}
```

## 🔌 Integration

### BUSY Language Compiler

Orgata IDE integrates directly with the BUSY language compiler for:
- File validation and syntax checking
- Runtime code generation
- Process execution orchestration

### Knit Dependency System

Uses the knit system for:
- Dependency tracking between BUSY files
- Change impact analysis
- Automatic reconciliation workflows

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm run start
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_PROVIDER` | AI service provider | `openai` |
| `AI_API_KEY` | API key for AI service | Required |
| `AI_MODEL` | AI model to use | `gpt-4` |
| `DATABASE_URL` | Database connection string | `file:./orgata-ide.db` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3001` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on the BUSY Language foundation
- Powered by advanced AI language models
- Integrated with the knit dependency reconciliation system

---

**Orgata IDE** - Revolutionizing business process management through conversation.
# Generated Business Application

This application was generated from BUSY language specifications using the BUSY Runtime Generator.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma db push
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Process Dashboard**: Overview of all active business processes
- **Playbook Execution**: Step-by-step process execution with forms
- **Client Folders**: Human-readable artifact storage
- **Database Integration**: Persistent state management
- **Type Safety**: Full TypeScript integration

## Generated Structure

- `src/pages/` - Next.js pages (dashboard, playbook execution)
- `src/components/` - React components (forms, cards, interfaces)
- `src/lib/` - Database and utility libraries
- `src/types/` - TypeScript type definitions
- `clients/` - Client folder storage
- `prisma/` - Database schema and migrations

## Customization

This application is generated from BUSY files. To modify:

1. **UI Changes**: Edit components in `src/components/` (preserved across regenerations)
2. **Business Logic**: Modify BUSY files and regenerate
3. **Styling**: Edit `src/styles/globals.css` and `tailwind.config.js`
4. **Database**: Update BUSY files and run `npx prisma db push`

## Database Management

- **View Data**: `npm run db:studio`
- **Reset Database**: Delete `prisma/dev.db` and run `npx prisma db push`
- **Migrations**: Handled automatically during regeneration

## Client Folders

Each process instance creates a folder in `clients/` containing:
- `process-log.md` - Human-readable process history
- `documents/` - Generated documents and files
- `communications/` - Email and communication records
- `metadata.json` - Machine-readable process state

## Development

This is a generated application. The source BUSY files are the source of truth for business logic. UI customizations are preserved across regenerations.

For questions about the BUSY language or runtime generation, see the compiler documentation.

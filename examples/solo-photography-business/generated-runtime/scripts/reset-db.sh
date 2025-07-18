#!/bin/bash
echo "🔄 Resetting database..."

# Remove database file
rm -f prisma/dev.db

# Push schema
npx prisma db push

# Seed database
npx prisma db seed

echo "✅ Database reset complete!"

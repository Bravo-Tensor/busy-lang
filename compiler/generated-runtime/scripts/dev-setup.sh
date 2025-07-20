#!/bin/bash
echo "🚀 Setting up BUSY runtime development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup database
echo "💾 Setting up database..."
npx prisma db push

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed

# Start development server
echo "🎉 Starting development server..."
npm run dev

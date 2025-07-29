# 🎯 BUSY File Visualization - Usage Guide

## Quick Start

### Option 1: Interactive Demo (Recommended)
```bash
cd compiler
npm run viz:demo
# Open http://localhost:3000 in your browser
```

### Option 2: Visualize Your BUSY Files
```bash
cd compiler
npm run viz -- visualize /path/to/your/busy/files
```

### Option 3: Direct CLI Demo
```bash
cd compiler
npm run viz demo
```

## 📁 Visualizing Any Set of BUSY Files

The BUSY Visualization CLI can analyze and visualize any directory containing `.busy` files:

### Basic Usage
```bash
# Visualize files in a directory
npm run viz -- visualize ../examples/solo-photography-business

# Specify visualization type
npm run viz -- visualize ../examples/solo-photography-business --type org
npm run viz -- visualize ../examples/solo-photography-business --type dependency
npm run viz -- visualize ../examples/solo-photography-business --type playbook
npm run viz -- visualize ../examples/solo-photography-business --type role

# Custom output file
npm run viz -- visualize ../examples/solo-photography-business --output my-visualization.html

# Start demo server with your files
npm run viz -- visualize ../examples/solo-photography-business --demo
```

### Available Commands

#### `npm run viz -- visualize <directory>`
Analyzes BUSY files in the specified directory and creates a visualization.

**Options:**
- `-t, --type <type>` - Visualization type: `org`, `playbook`, `role`, `dependency` (default: `org`)
- `-o, --output <file>` - Output HTML file (default: `busy-visualization.html`)
- `-d, --demo` - Start interactive demo server
- `-p, --port <port>` - Demo server port (default: 3000)

**Examples:**
```bash
# Basic organizational overview
npm run viz -- visualize ./my-business-files

# Dependency visualization with custom output
npm run viz -- visualize ./my-business-files --type dependency --output deps.html

# Start interactive demo
npm run viz -- visualize ./my-business-files --demo --port 8080
```

#### `npm run viz demo`
Starts the interactive demo server with mock data.

**Options:**
- `-p, --port <port>` - Server port (default: 3000)

## 🗂️ Supported File Structures

The visualizer works with any directory structure containing `.busy` files:

### Example Structures

#### Flat Structure
```
my-business/
├── team-sales.busy
├── team-engineering.busy
├── playbook-onboarding.busy
└── role-manager.busy
```

#### BUSY Standard Structure
```
my-business/
├── L0/
│   ├── sales/
│   │   ├── team.busy
│   │   ├── roles/
│   │   │   ├── sales-rep.busy
│   │   │   └── sales-manager.busy
│   │   └── playbooks/
│   │       └── lead-qualification.busy
│   └── engineering/
│       ├── team.busy
│       └── roles/
│           └── developer.busy
└── L1/
    └── management/
        └── team.busy
```

#### Custom Structure
```
company/
├── departments/
│   ├── marketing.busy
│   └── finance.busy
├── processes/
│   ├── hiring.busy
│   └── budgeting.busy
└── roles/
    ├── ceo.busy
    └── cfo.busy
```

## 📊 What Gets Visualized

### File Discovery
The CLI automatically:
- 🔍 **Scans recursively** for all `.busy` files in the directory
- 📋 **Lists found files** with their relative paths
- ⚡ **Analyzes structure** using the existing BUSY compiler
- 📊 **Counts entities** (organizations, teams, playbooks, roles)

### Visualization Types

#### 1. Organizational Overview (`--type org`)
- **Hierarchical view** of organizations → teams → roles
- **Clear structure** showing business organization
- **Visual hierarchy** with proper spacing and grouping

#### 2. Dependency Graph (`--type dependency`)
- **Workflow dependencies** between playbooks
- **Process flows** showing how work moves through the organization
- **Critical path** identification

#### 3. Playbook View (`--type playbook`)
- **Process-focused** visualization
- **Playbook relationships** and dependencies
- **Workflow analysis**

#### 4. Role Interaction (`--type role`)
- **People-focused** view
- **Role relationships** across teams
- **Collaboration patterns**

## 🎨 Interactive Demo Features

When you run the interactive demo (via `npm run viz:demo` or `--demo` flag), you get:

### Visual Features
- **🔵 Organizations** - Blue circles (central nodes)
- **🟣 Teams** - Purple circles (primary groups)
- **🟢 Roles** - Green circles (people/positions)
- **🔴 Playbooks** - Red circles (processes/workflows)

### Interactive Controls
- **🖱️ Click & Drag** - Pan around the visualization
- **🔍 Mouse Wheel** - Zoom in/out
- **👆 Click Nodes** - Select and highlight connected elements
- **🎛️ View Buttons** - Switch between visualization types
- **🎯 Zoom to Fit** - Auto-fit the entire visualization
- **🔄 Reset View** - Return to default zoom/position

### View Modes
- **Organizational Overview** - See the complete business structure
- **Dependencies** - Focus on workflow and process relationships
- **Team Details** - Comprehensive view with all entities

## 💡 Tips for Best Results

### File Organization
- **Use consistent naming** - Clear, descriptive file names
- **Organize logically** - Group related files in directories
- **Follow BUSY conventions** - Use standard layer structure when possible

### Directory Selection
- **Point to root** - Select the top-level directory containing all BUSY files
- **Include all files** - Ensure all related `.busy` files are in the selected directory
- **Check permissions** - Make sure the directory is readable

### Troubleshooting
- **No files found?** - Check that `.busy` files exist in the directory
- **Analysis errors?** - Ensure BUSY files have valid syntax
- **Demo not starting?** - Check that port 3000 (or specified port) is available
- **Browser not opening?** - Manually open the generated HTML file

## 🔧 Advanced Usage

### Custom Port for Demo
```bash
npm run viz -- visualize ./my-files --demo --port 8080
# Opens demo at http://localhost:8080
```

### Batch Processing
```bash
# Create multiple visualizations
npm run viz -- visualize ./my-files --type org --output org-view.html
npm run viz -- visualize ./my-files --type dependency --output deps-view.html
npm run viz -- visualize ./my-files --type role --output roles-view.html
```

### Integration with Other Tools
The generated HTML files are:
- **Self-contained** - Include all necessary CSS and JavaScript
- **Portable** - Can be shared, emailed, or hosted anywhere
- **Standards-compliant** - Work in all modern browsers
- **Responsive** - Adapt to different screen sizes

## 🚀 Examples with Real Data

### Solo Photography Business (Included Example)
```bash
npm run viz -- visualize ../examples/solo-photography-business --demo
```
**Result:** Interactive visualization of a complete photography business with:
- 3 teams (Client Operations, Creative Production, Business Operations)
- 7 roles (Inquiry Manager, Photographer, Financial Manager, etc.)
- 5 playbooks (Client Onboarding, Photo Production, etc.)
- 18 total BUSY files

### Your Own Business
```bash
npm run viz -- visualize /path/to/your/busy/files --demo
```
**Result:** Interactive visualization of your specific business structure

---

## 🎉 You're Ready to Visualize!

The BUSY Visualization system makes it easy to understand and explore any business organization defined in BUSY files. Whether you're analyzing an existing business or designing a new one, the visual representation helps you see the big picture and understand the relationships between teams, roles, and processes.

**Start exploring:** `npm run viz -- visualize <your-busy-directory> --demo` 🚀
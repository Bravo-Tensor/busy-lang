# Kitchen Game UI Design Specification

## Visual Design Language

### Color Palette
- **Primary**: Kitchen whites (#F8F9FA, #E9ECEF)
- **Heat Zones**: 
  - Cold: #3B82F6 (Blue)
  - Warm: #F59E0B (Amber) 
  - Hot: #EF4444 (Red)
  - Perfect: #10B981 (Green)
- **Status Colors**:
  - Active: #6366F1 (Indigo)
  - Warning: #F59E0B (Amber)
  - Error: #EF4444 (Red)
  - Success: #10B981 (Green)

### Typography
- **Headers**: Inter/SF Pro Display (Bold)
- **Body**: Inter/SF Pro Text (Regular)
- **Timers**: SF Mono/JetBrains Mono (Monospace)
- **Alerts**: Inter (Medium)

## Screen Layouts

### 1. Expeditor Command Center (Main Game Board)

```
┌─────────────────────────────────────────────────────────────┐
│ Orders Queue          Kitchen Floor Plan        Active Orders│
│ ┌─────────────┐      ┌──────┬──────┬──────┐   ┌──────────┐│
│ │ Table 12    │      │GRILL │SAUTE │SALAD │   │ T12: 5:32││
│ │ • Steak Med │      │  ●●  │  ●   │  ●●● │   │ T08: 2:15││
│ │ • Salmon    │      ├──────┼──────┼──────┤   │ T23: 8:47││
│ │ • Caesar    │      │ PREP │ EXPO │DESSRT│   │ T15: 1:03││
│ └─────────────┘      │  ●   │ YOU  │      │   └──────────┘│
│ ┌─────────────┐      └──────┴──────┴──────┘                │
│ │ Table 8     │      [Drag orders to stations]             │
│ │ • Pasta     │                                            │
│ └─────────────┘      Station Load: ████░░░░ 60%           │
└─────────────────────────────────────────────────────────────┘
```

**Interactive Elements**:
- Drag order tickets from queue to stations
- Click stations to see detailed view
- Double-tap orders for special instructions
- Pinch to zoom kitchen layout

### 2. Cooking Station Interface (Cook's View)

```
┌─────────────────────────────────────────────────────────────┐
│ GRILL STATION                                    Chef: Maria │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │   Steak T12 │ │  Burger T15 │ │  Chicken T8 │           │
│ │   ┌─────┐   │ │   ┌─────┐   │ │   ┌─────┐   │           │
│ │   │ 2:30│   │ │   │ 0:45│   │ │   │ 4:15│   │           │
│ │   └─────┘   │ │   └─────┘   │ │   └─────┘   │           │
│ │   🌡️ 135°F  │ │   🌡️ 165°F  │ │   🌡️ 155°F  │           │
│ │   [====│==] │ │   [=======│]│ │   [==│=====]│           │
│ │   Med Rare  │ │   Well Done │ │   Internal  │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│ Next Up: Ribeye T23 (prep in 1:30)                        │
│ ┌─────────────────────────────────────────────┐           │
│ │ 🔥 Grill Zones:  1:[HOT] 2:[MED] 3:[MED] 4:[LOW]       │
│ └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Interactive Elements**:
- Tap dishes to flip/rotate
- Slide temperature controls
- Press and hold for recipe overlay
- Swipe to mark complete

### 3. Order Assembly & Plating Station

```
┌─────────────────────────────────────────────────────────────┐
│ PLATING STATION - Table 12 (3 items)           Heat Lamps ON│
│                                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐   Order Checklist:    │
│ │ STEAK   │ │ SALMON  │ │ CAESAR  │   ☑️ Steak Medium      │
│ │   ✅    │ │   🔄    │ │   ✅    │   ⏳ Salmon (0:30)     │
│ │ Plated  │ │Arriving │ │ Ready   │   ☑️ Caesar Salad      │
│ └─────────┘ └─────────┘ └─────────┘   ☐ Table bread       │
│                                        ☐ Side sauces       │
│ ┌─────────────────────────────────┐                        │
│ │     Garnish Station             │   Quality Score: 94/100│
│ │ [🌿][🍋][🧈][🧂][🌶️][🥒]      │   Time Elapsed: 12:45  │
│ └─────────────────────────────────┘                        │
│                                                             │
│ [────────────────] 85% Complete    [✓ SEND TO SERVICE]    │
└─────────────────────────────────────────────────────────────┘
```

### 4. Real-Time Analytics Dashboard (Manager View)

```
┌─────────────────────────────────────────────────────────────┐
│ KITCHEN PERFORMANCE DASHBOARD              Thursday 7:32 PM │
│                                                             │
│ Ticket Times          │ Station Efficiency   │ Quality      │
│ ┌──────────────┐     │ Grill:  ████░ 87%   │ ████░ 4.2/5 │
│ │    15 min    │     │ Saute:  ███░░ 72%   │             │
│ │ ███████████  │     │ Salad:  █████ 95%   │ Remakes: 2  │
│ └──────────────┘     │ Dessert:████░ 83%   │             │
│ Target: <12 min      │                      │             │
│                                                             │
│ Active Orders: 14    Staff: 8/8    Covers: 126    Rev: $4.2K│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Predictive Alert: Grill bottleneck expected in 15 min   ││
│ │ Suggested Action: Start prep for late reservations       ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Interaction Patterns

### Drag & Drop
- **Visual Feedback**: Item scales up 10% when grabbed
- **Drop Zones**: Highlight valid targets in green
- **Invalid Drop**: Shake animation + haptic feedback
- **Multi-Select**: Hold shift to select multiple items

### Touch Gestures (Tablet)
- **Single Tap**: Select/activate
- **Double Tap**: Quick action (varies by context)
- **Press & Hold**: Show context menu or recipe
- **Pinch**: Zoom in/out on kitchen layout
- **Swipe**: Navigate between orders or mark complete

### Animations
- **State Changes**: 300ms ease-in-out transitions
- **Timers**: Smooth countdown with color changes
- **Alerts**: Pulse animation for urgent items
- **Success**: Confetti burst on perfect timing

### Sound Design
- **Order Received**: Soft bell chime
- **Timer Warning**: Escalating beeps at 1min, 30s, 10s
- **Task Complete**: Satisfying "ding"
- **Alert**: Urgent double-beep
- **Perfect Timing**: Triumphant chord

## Responsive Design

### Desktop (1920x1080)
- Full kitchen overview with all stations visible
- Side panels for detailed information
- Keyboard shortcuts for power users

### Tablet (iPad Pro)
- Optimized for touch with larger hit targets
- Station-focused view with swipe navigation
- Portrait mode for order lists

### Mobile (iPhone)
- Single station or task focus
- Simplified controls
- Push notifications for urgent items

## Gamification Elements

### Achievement Badges
- 🏃 **Rush Hour Hero**: Complete 20 orders in 30 minutes
- 🎯 **Perfect Timing**: All items ready within 30 seconds
- 🌟 **Quality Star**: 5 perfect quality scores in a row
- 🔥 **Grill Master**: 50 perfect steaks
- 👥 **Team Player**: Help other stations 10 times

### Daily Challenges
- "No remakes during dinner rush"
- "Average ticket time under 10 minutes"
- "Help every station at least once"

### Leaderboards
- Fastest average ticket time
- Highest quality scores
- Most orders completed
- Best team coordination score

## Accessibility Features

- **High Contrast Mode**: For better visibility
- **Color Blind Modes**: Alternative color schemes
- **Screen Reader Support**: Full ARIA labels
- **Keyboard Navigation**: Complete keyboard control
- **Text Size Options**: Scalable interface
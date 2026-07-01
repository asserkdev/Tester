# L.A.I. Web Inspector - Specification Document

## 1. Project Overview

**Project Name:** L.A.I. Web Inspector  
**Type:** Full-Stack Web Application  
**Core Functionality:** A professional website analysis platform that performs automated engineering analysis on any website URL, producing comprehensive reports with AI-generated explanations for issues found.  
**Target Users:** Software developers, QA engineers, DevOps teams, security researchers, and web professionals.

---

## 2. Architecture Design

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐           │
│  │ Dashboard │  │ Analyzer  │  │ Reports   │  │ Settings    │          │
│  │  Views   │  │  Results  │  │   View    │  │   Panel     │           │
│  └─────────┘  └──────────┘  └──────────┘  └────────────┘           │
│                           │                                          │
│                    ┌──────┴──────┐                                   │
│                    │  State Mgmt  │ (Zustand)                        │
│                    └──────┬──────┘                                   │
│                           │                                          │
│                    ┌──────┴──────┐                                   │
│                    │   API Layer │                                   │
│                    └──────┬──────┘                                   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────┼─────────────────────────────────────────┐
│                         BACKEND (Express)                            │
│                    ┌──────┴──────┐                                   │
│                    │   API Layer │                                   │
│                    │  /api/v1/*  │                                   │
│                    └──────┬──────┘                                   │
│         ┌─────────────────┼─────────────────┐                       │
│         │                 │                 │                       │
│  ┌──────┴──────┐  ┌───────┴───────┐  ┌──────┴──────┐               │
│  │   Scanner   │  │   Analyzer    │  │  Reporter   │               │
│  │   Queue     │  │   Registry    │  │   Module    │               │
│  └─────────────┘  └───────────────┘  └─────────────┘               │
│                           │                                          │
│                    ┌──────┴──────┐                                   │
│                    │  Analyzer    │                                   │
│                    │  Plugins    │ (100+ Analyzers)                  │
│                    └─────────────┘                                   │
│                           │                                          │
│                    ┌──────┴──────┐                                   │
│                    │   Storage    │                                   │
│                    │   Layer      │ (SQLite/PostgreSQL)              │
│                    └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ANALYZER REGISTRY                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Analyzer Interface                         │   │
│  │  - name: string                                             │   │
│  │  - category: AnalyzerCategory                                │   │
│  │  - severity: Severity                                       │   │
│  │  - run(context): Promise<Result[]>                          │   │
│  │  - validate(context): Promise<ValidationResult>             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│         ┌─────────────────────┼─────────────────────┐              │
│         │                     │                     │              │
│  ┌──────┴──────┐  ┌───────────┴───────────┐  ┌──────┴──────┐       │
│  │   HTML      │  │     CSS                │  │   JS        │       │
│  │  Analyzer   │  │   Analyzer             │  │  Analyzer   │       │
│  └─────────────┘  └───────────────────────┘  └─────────────┘       │
│         │                     │                     │              │
│  ┌──────┴──────┐  ┌───────────┴───────────┐  ┌──────┴──────┐       │
│  │ Performance │  │    Security            │  │   SEO       │       │
│  │  Analyzer   │  │   Analyzer             │  │  Analyzer   │       │
│  └─────────────┘  └───────────────────────┘  └─────────────┘       │
│         │                     │                     │              │
│  ┌──────┴──────┐  ┌───────────┴───────────┐  ┌──────┴──────┐       │
│  │Accessibility│  │    Network            │  │   DOM       │       │
│  │  Analyzer   │  │   Analyzer             │  │  Analyzer   │       │
│  └─────────────┘  └───────────────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Plugin Architecture

```typescript
// Every analyzer implements this interface
interface Analyzer {
  readonly id: string;
  readonly name: string;
  readonly category: AnalyzerCategory;
  readonly defaultSeverity: Severity;
  
  // Main execution method
  run(context: AnalysisContext): Promise<AnalyzerResult[]>;
  
  // Optional validation before running
  validate?(context: AnalysisContext): Promise<ValidationResult>;
}

// Analyzers auto-register via decorators
@AnalyzerPlugin({
  id: 'html-validator',
  name: 'HTML Validator',
  category: 'html',
  severity: 'high'
})
class HTMLAnalyzer implements Analyzer {
  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    // Implementation
  }
}
```

---

## 3. Technology Stack

### 3.1 Frontend
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Icons:** Lucide React
- **PDF Export:** jsPDF + html2canvas
- **Code Highlighting:** Prism.js

### 3.2 Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** better-sqlite3 (with Prisma ORM)
- **Task Queue:** Bull with Redis (or in-memory fallback)
- **Browser Automation:** Playwright
- **Validation:** Zod
- **Logging:** Winston

### 3.3 Infrastructure
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Web Server:** Nginx (for production)

---

## 4. Frontend Specification

### 4.1 Page Structure

#### Landing/Dashboard Page
- URL input with validation
- Recent scans list
- Quick stats (total scans, issues found, average score)
- Theme toggle (dark/light mode)

#### Scan Configuration Page
- URL input
- Category toggles (which analyzers to run)
- Viewport presets (mobile/tablet/desktop)
- Scan options (depth, timeout, etc.)

#### Scan Progress Page
- Real-time progress indicator
- Active analyzer status
- Estimated time remaining
- Cancel button
- Live result preview

#### Results Dashboard
- Overall score card
- Severity breakdown chart
- Category distribution chart
- Issue list with filters and search
- Issue detail panel
- Export options

#### History Page
- Past scans list
- Scan comparison view
- Timeline visualization
- Pagination/infinite scroll

### 4.2 Visual Design

#### Color Palette
```
Light Mode:
- Primary: #3B82F6 (Blue)
- Secondary: #6366F1 (Indigo)
- Accent: #10B981 (Emerald)
- Background: #FFFFFF
- Surface: #F8FAFC
- Text Primary: #1E293B
- Text Secondary: #64748B
- Error: #EF4444
- Warning: #F59E0B
- Success: #22C55E

Dark Mode:
- Primary: #60A5FA (Light Blue)
- Secondary: #818CF8 (Light Indigo)
- Accent: #34D399 (Light Emerald)
- Background: #0F172A
- Surface: #1E293B
- Text Primary: #F1F5F9
- Text Secondary: #94A3B8
```

#### Typography
- Font Family: Inter (primary), JetBrains Mono (code)
- Headings: Bold, sizes 2xl-5xl
- Body: Regular, size base
- Code: JetBrains Mono, size sm

#### Spacing System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px

#### Components
- Buttons: Primary, Secondary, Ghost, Danger variants
- Cards: Elevated with subtle shadows
- Inputs: Rounded with focus rings
- Tables: Striped rows, sticky headers
- Modals: Centered, backdrop blur
- Tooltips: Dark background, white text
- Badges: Colored by severity
- Progress bars: Animated, gradient fills
- Charts: Animated on mount, interactive tooltips

### 4.3 Animations
- Page transitions: Fade + slide (300ms)
- Button hover: Scale 1.02 (150ms)
- Card hover: Lift effect (200ms)
- Chart animations: Draw in (500ms)
- Loading states: Skeleton pulse
- Toast notifications: Slide in from top

---

## 5. Backend Specification

### 5.1 API Endpoints

#### Scan Management
```
POST   /api/v1/scans              - Create new scan
GET    /api/v1/scans              - List scans (paginated)
GET    /api/v1/scans/:id          - Get scan details
DELETE /api/v1/scans/:id          - Cancel/delete scan
GET    /api/v1/scans/:id/status  - Get scan status
```

#### Results
```
GET    /api/v1/scans/:id/results         - Get all results
GET    /api/v1/scans/:id/results/:rid   - Get specific result
GET    /api/v1/scans/:id/export/:format - Export results (json/pdf/csv)
```

#### Analyzers
```
GET    /api/v1/analyzers                 - List all analyzers
GET    /api/v1/analyzers/:id             - Get analyzer details
POST   /api/v1/analyzers/validate        - Validate URL without full scan
```

#### Settings
```
GET    /api/v1/settings                  - Get settings
PUT    /api/v1/settings                  - Update settings
```

### 5.2 Request/Response Formats

#### Create Scan Request
```json
{
  "url": "https://example.com",
  "options": {
    "viewport": "desktop",
    "categories": ["html", "css", "js", "performance", "security", "seo", "accessibility"],
    "maxDepth": 3,
    "timeout": 300
  }
}
```

#### Scan Response
```json
{
  "id": "scan_123",
  "url": "https://example.com",
  "status": "running",
  "createdAt": "2024-01-15T10:00:00Z",
  "startedAt": "2024-01-15T10:00:05Z",
  "progress": {
    "total": 50,
    "completed": 25,
    "active": "performance"
  },
  "results": []
}
```

#### Analyzer Result
```json
{
  "id": "result_456",
  "analyzerId": "html-validator",
  "category": "html",
  "severity": "high",
  "title": "Missing alt attribute",
  "description": "Image element lacks alt text for accessibility",
  "location": {
    "url": "https://example.com/page",
    "line": 42,
    "column": 15,
    "selector": "img.hero"
  },
  "evidence": "<img src=\"hero.jpg\" class=\"hero\" />",
  "whyItMatters": "Screen readers cannot describe this image...",
  "possibleCause": "Developer forgot to add alt attribute...",
  "recommendedFix": "Add descriptive alt text: <img src=\"hero.jpg\" alt=\"Company hero image showing team collaboration\" />",
  "estimatedImpact": "Medium - Affects accessibility compliance",
  "confidenceScore": 0.95,
  "relatedIssues": ["result_789"],
  "documentation": ["WCAG 2.1 Success Criterion 1.1.1"],
  "explanation": "AI-generated human-readable explanation..."
}
```

### 5.3 Data Model

#### Scan
```typescript
interface Scan {
  id: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  options: ScanOptions;
  statistics?: ScanStatistics;
}
```

#### AnalyzerResult
```typescript
interface AnalyzerResult {
  id: string;
  scanId: string;
  analyzerId: string;
  category: AnalyzerCategory;
  severity: Severity;
  title: string;
  description: string;
  location?: ResultLocation;
  evidence?: string;
  explanation?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

### 5.4 Storage Layer

#### SQLite Schema (Initial)
```sql
CREATE TABLE scans (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  options TEXT,
  statistics TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME
);

CREATE TABLE results (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  analyzer_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  evidence TEXT,
  explanation TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES scans(id)
);

CREATE TABLE analyzers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE
);
```

---

## 6. Analysis Modules Specification

### 6.1 Category Structure

```typescript
enum AnalyzerCategory {
  ARCHITECTURE = 'architecture',
  HTML = 'html',
  CSS = 'css',
  JAVASCRIPT = 'javascript',
  LINKS = 'links',
  IMAGES = 'images',
  RESOURCES = 'resources',
  CONSOLE = 'console',
  PERFORMANCE = 'performance',
  SEO = 'seo',
  ACCESSIBILITY = 'accessibility',
  SECURITY = 'security',
  NETWORK = 'network',
  PWA = 'pwa',
  STORAGE = 'storage',
  API = 'api',
  RESPONSIVE = 'responsive',
  CROSS_BROWSER = 'cross-browser',
  FORMS = 'forms',
  NAVIGATION = 'navigation',
  METADATA = 'metadata',
  SOCIAL = 'social',
  TECHNOLOGY = 'technology',
  PRIVACY = 'privacy'
}

enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}
```

### 6.2 Core Analyzers

#### HTML Analyzer Module
- HTMLValidator - Validate HTML syntax
- SemanticHTMLAnalyzer - Check semantic element usage
- DuplicateIDEvaluator - Find duplicate ID attributes
- OrphanPagesDetector - Find unreachable pages

#### CSS Analyzer Module
- CSSValidator - Validate CSS syntax
- UnusedCSSDetector - Find unused CSS rules
- DuplicateCSSDetector - Find duplicate stylesheets
- LargeCSSDetector - Flag oversized CSS files

#### JavaScript Analyzer Module
- JSValidator - Analyze JavaScript syntax
- UnusedJSDetector - Find unused JavaScript
- LargeJSDetector - Flag large JS bundles
- MemoryLeakDetector - Detect potential memory leaks

#### Performance Analyzer Module
- CoreWebVitalsAnalyzer - LCP, FID, CLS metrics
- PageWeightAnalyzer - Total page size
- BundleSizeAnalyzer - JS/CSS bundle sizes
- LazyLoadingAnalyzer - Check lazy loading implementation

#### Security Analyzer Module
- SecurityHeadersAnalyzer - Check security headers
- MixedContentAnalyzer - Find HTTP/HTTPS mix
- CSPAnalyzer - Validate CSP headers
- XSSRiskAnalyzer - Detect XSS vulnerabilities

#### Accessibility Analyzer Module
- WCAGAnalyzer - WCAG compliance checks
- ARIAAnalyzer - Validate ARIA attributes
- ContrastAnalyzer - Color contrast ratios
- KeyboardNavAnalyzer - Keyboard navigation

#### SEO Analyzer Module
- MetaTagsAnalyzer - Check meta tags
- SitemapAnalyzer - Validate sitemap.xml
- RobotsTxtAnalyzer - Check robots.txt
- OpenGraphAnalyzer - Validate OG tags

#### Network Analyzer Module
- RequestTimingAnalyzer - Analyze request performance
- ResourceSizeAnalyzer - Find large resources
- CompressionAnalyzer - Check compression
- HTTP2HTTP3Analyzer - Detect HTTP/2 and HTTP/3

---

## 7. Dashboard Specification

### 7.1 Score Calculation

```typescript
function calculateOverallScore(results: AnalyzerResult[]): number {
  const weights = {
    critical: 0,
    high: 25,
    medium: 50,
    low: 75,
    info: 100
  };
  
  const totalWeight = results.reduce((sum, r) => sum + weights[r.severity], 0);
  return Math.round(totalWeight / results.length);
}
```

### 7.2 Chart Types
- Donut chart: Severity distribution
- Bar chart: Category issue count
- Line chart: Historical score trends
- Radar chart: Category health overview

### 7.3 Filtering Options
- By severity (critical, high, medium, low, info)
- By category (all 23 categories)
- By analyzer (all 100+ analyzers)
- Search by title/description
- Sort by severity/date/category

---

## 8. Export Formats

### 8.1 JSON Export
```json
{
  "scan": { ... },
  "results": [ ... ],
  "statistics": { ... },
  "generatedAt": "2024-01-15T12:00:00Z"
}
```

### 8.2 PDF Export
- Cover page with scan summary
- Table of contents
- Executive summary
- Detailed findings by category
- Charts and visualizations
- Recommendations
- Appendix with raw data

### 8.3 CSV Export
- All results flattened to rows
- Columns: id, severity, category, title, description, location, etc.

---

## 9. Folder Structure

```
lai-web-inspector/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   └── ...
│   │   │   ├── dashboard/
│   │   │   │   ├── ScoreCard.tsx
│   │   │   │   ├── SeverityChart.tsx
│   │   │   │   ├── CategoryChart.tsx
│   │   │   │   └── ...
│   │   │   ├── results/
│   │   │   │   ├── IssueList.tsx
│   │   │   │   ├── IssueDetail.tsx
│   │   │   │   └── ...
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Footer.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── ScanConfig.tsx
│   │   │   ├── ScanProgress.tsx
│   │   │   ├── Results.tsx
│   │   │   └── History.tsx
│   │   ├── hooks/
│   │   │   ├── useScan.ts
│   │   │   ├── useResults.ts
│   │   │   └── useTheme.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── stores/
│   │   │   ├── scanStore.ts
│   │   │   └── settingsStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── index.ts
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── scans.ts
│   │   │   │   ├── analyzers.ts
│   │   │   │   └── settings.ts
│   │   │   ├── middleware/
│   │   │   │   ├── errorHandler.ts
│   │   │   │   ├── validator.ts
│   │   │   │   └── logger.ts
│   │   │   └── index.ts
│   │   ├── analyzers/
│   │   │   ├── base/
│   │   │   │   ├── Analyzer.ts
│   │   │   │   ├── AnalyzerRegistry.ts
│   │   │   │   └── types.ts
│   │   │   ├── html/
│   │   │   │   ├── HTMLValidator.ts
│   │   │   │   ├── SemanticAnalyzer.ts
│   │   │   │   └── ...
│   │   │   ├── css/
│   │   │   │   ├── CSSValidator.ts
│   │   │   │   ├── UnusedCSSDetector.ts
│   │   │   │   └── ...
│   │   │   ├── javascript/
│   │   │   │   ├── JSAnalyzer.ts
│   │   │   │   └── ...
│   │   │   ├── performance/
│   │   │   │   ├── CoreWebVitals.ts
│   │   │   │   ├── PageWeight.ts
│   │   │   │   └── ...
│   │   │   ├── security/
│   │   │   │   ├── SecurityHeaders.ts
│   │   │   │   ├── CSPAnalyzer.ts
│   │   │   │   └── ...
│   │   │   ├── accessibility/
│   │   │   │   ├── WCAGChecker.ts
│   │   │   │   ├── ContrastAnalyzer.ts
│   │   │   │   └── ...
│   │   │   ├── seo/
│   │   │   │   ├── MetaTags.ts
│   │   │   │   ├── SitemapAnalyzer.ts
│   │   │   │   └── ...
│   │   │   └── ... (all other categories)
│   │   ├── scanner/
│   │   │   ├── Scanner.ts
│   │   │   ├── PageCollector.ts
│   │   │   └── PlaywrightManager.ts
│   │   ├── services/
│   │   │   ├── scanService.ts
│   │   │   ├── exportService.ts
│   │   │   └── queueService.ts
│   │   ├── storage/
│   │   │   ├── database.ts
│   │   │   ├── repositories/
│   │   │   │   ├── scanRepository.ts
│   │   │   │   └── resultRepository.ts
│   │   │   └── prisma.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── helpers.ts
│   │   ├── workers/
│   │   │   └── scanWorker.ts
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── nginx.conf
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── test.yml
│       └── deploy.yml
│
├── SPEC.md
├── README.md
└── package.json (workspace root)
```

---

## 10. Implementation Phases

### Phase 1: Foundation
- [x] Project setup (Vite + Express)
- [ ] TypeScript configuration
- [ ] Base API endpoints
- [ ] SQLite database setup
- [ ] Basic analyzer interface

### Phase 2: Core Analyzers
- [ ] HTML analyzer
- [ ] CSS analyzer
- [ ] JavaScript analyzer
- [ ] Performance analyzer

### Phase 3: Security & SEO
- [ ] Security headers analyzer
- [ ] SEO analyzer
- [ ] Accessibility analyzer

### Phase 4: Frontend Dashboard
- [ ] Dashboard UI
- [ ] Results visualization
- [ ] Export functionality

### Phase 5: Advanced Features
- [ ] Plugin system
- [ ] Historical scans
- [ ] Scan comparison
- [ ] AI explanations

### Phase 6: Infrastructure
- [ ] Docker configuration
- [ ] GitHub Actions
- [ ] Nginx setup

---

## 11. Quality Standards

### Code Quality
- Strict TypeScript with no `any`
- ESLint + Prettier
- Unit tests for all analyzers
- Integration tests for API
- E2E tests for critical flows

### Performance
- Lazy loading for code splitting
- Virtual scrolling for large result lists
- Caching for repeated requests
- Pagination for API responses

### Security
- Input validation with Zod
- Rate limiting
- CORS configuration
- Helmet.js for security headers
- XSS protection

---

## 12. Success Metrics

- All 100+ analyzers implemented and working
- Full test coverage (>80%)
- Lighthouse score > 90 for dashboard
- Scan time < 2 minutes for average websites
- No critical security vulnerabilities

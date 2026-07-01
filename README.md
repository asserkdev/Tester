# L.A.I. Web Inspector

A comprehensive automated website analysis platform for identifying bugs, security issues, performance problems, accessibility violations, and opportunities for improvement.

## Features

- **100+ Analyzers** covering every aspect of web development
- **Real-time Scanning** with live progress updates
- **Professional Reports** with actionable insights
- **Dark/Light Mode** for comfortable viewing
- **Export Options** - JSON, CSV formats
- **Historical Tracking** - Compare scans over time
- **Modern Dashboard** with interactive charts

## Tech Stack

### Frontend
- React 18+ with TypeScript
- Vite build tool
- Tailwind CSS
- Zustand state management
- Recharts for visualization

### Backend
- Node.js with Express
- TypeScript
- SQLite database
- Playwright for browser automation

### Infrastructure
- Docker containerization
- GitHub Actions CI/CD
- Nginx web server

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker (optional, for containerized deployment)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/asserkdev/Tester.git
cd Tester
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers (for backend):
```bash
cd backend && npx playwright install chromium
```

4. Start the development servers:
```bash
npm run dev
```

This starts:
- Frontend at http://localhost:5173
- Backend at http://localhost:3000

### Docker Deployment

1. Build and start containers:
```bash
docker-compose -f docker/docker-compose.yml up -d
```

2. Access the application at http://localhost

## Project Structure

```
lai-web-inspector/
├── frontend/           # React frontend application
├── backend/            # Express backend API
├── docker/             # Docker configuration
└── .github/           # GitHub Actions workflows
```

## License

MIT License
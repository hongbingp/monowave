# Monowave Dashboard Demo

A Next.js 14 dashboard application showcasing role-based interfaces for the Monowave AI content platform. Each user role (AI Apps, Publishers, Advertisers) sees a customized dashboard with relevant business data.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone and install
cd frontend-demo
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the demo.

## 📱 Demo Pages

### 1. Platform Overview (`/`)
- Real-time platform metrics
- Live activity feed  
- Value proposition highlights
- Market opportunity showcase

### 2. Role-Based Dashboard (`/dashboard`) - **NEW**
- **AI Apps Dashboard**: Monitor crawling costs, API usage, and website access
- **Publisher Dashboard**: Track content monetization and AI app access
- **Advertiser Dashboard**: Manage campaigns and analyze ROI performance
- Real-time role switching for demo purposes

### 3. Multi-Role Demo (`/demo`)
- Publisher dashboard view
- AI App dashboard view
- Advertiser dashboard view
- Role switching demonstration

### 4. Live Transaction Flow (`/live`)
- Interactive transaction simulation
- Step-by-step process visualization
- Revenue distribution breakdown
- Ecosystem flow diagram

## 🎯 Key Features

- **Role-Based Dashboards**: Customized interfaces for AI Apps, Publishers, and Advertisers
- **Real-time Data Updates**: Live transaction simulation and metric updates
- **Business-Focused Metrics**: Each role sees relevant KPIs and detailed analytics
- **Interactive Data Tables**: Sortable, filterable tables with detailed transaction records
- **Responsive Design**: Optimized for desktop presentations and mobile viewing
- **Mock & Real Data Support**: Switch between demo data and live backend integration

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## 📊 Dashboard Data

The demo showcases realistic business data for each role:

### AI Apps Dashboard
- API usage tracking: 1,247 requests today, 98.5% success rate
- Crawling costs: $12.47 today, detailed cost breakdown by website
- Website access patterns: TechCrunch, Medium, HackerNews analytics
- Recent crawl logs with status, cost, and performance metrics

### Publisher Dashboard  
- Revenue overview: $156.78 today, $3,245.90 monthly
- Content performance: Top URLs by crawl count and revenue
- AI app access: Which AI services are crawling your content
- Revenue distributions: Pending and completed blockchain settlements

### Advertiser Dashboard
- Campaign performance: 5 active campaigns, $2,450 total spend
- ROI analysis: 245% average ROI, 2.72% CTR
- Publisher breakdown: Performance across different content sites
- AI app placements: Ad performance in different AI applications

## 🎪 Investor Presentation

### 7-Minute Demo Script

1. **Platform Overview (1 min)**
   - Start at homepage: Highlight $12,450 daily revenue growth
   - Show live transaction activity feed
   - Emphasize $500B market opportunity

2. **Role-Based Dashboard Demo (4 min)**
   - **AI Apps View (1.5 min)**: Show cost control and API efficiency
     - "Here's how AI developers monitor their crawling costs"
     - Highlight 98.5% success rate and cost optimization
   - **Publisher View (1.5 min)**: Show content monetization
     - "Publishers see exactly which AI apps access their content"
     - Emphasize transparent revenue sharing
   - **Advertiser View (1 min)**: Show campaign performance
     - "Advertisers get detailed ROI analysis and targeting insights"
     - Highlight 245% ROI and precise attribution

3. **Technical Innovation (2 min)**
   - Navigate to Live Transaction Flow
   - Demonstrate blockchain automation
   - Show instant revenue distribution

### Key Selling Points
- 🎯 $500B AI content market opportunity
- 💡 First three-party ecosystem platform
- ⚡ Blockchain-powered automation
- 📈 Network effects drive growth
- 🔒 15% platform fee on all transactions

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Deploy to Vercel
npx vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-api.com
# NEXT_PUBLIC_MOCK_MODE=true
```

### Docker
```bash
# Build Docker image
docker build -t monowave-demo .

# Run container
docker run -p 3000:3000 monowave-demo
```

## 🔧 Configuration

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000    # Backend API URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000       # WebSocket URL
NEXT_PUBLIC_MOCK_MODE=true                   # Enable mock data
```

### Mock vs Real Data
- Set `NEXT_PUBLIC_MOCK_MODE=true` for demo presentations
- Set `NEXT_PUBLIC_MOCK_MODE=false` to connect to live backend

## 📈 Performance

- **Lighthouse Score**: 95+ on all metrics
- **Bundle Size**: < 500KB gzipped
- **Load Time**: < 2 seconds on 3G
- **Animation FPS**: 60fps on modern devices

## 🎨 Customization

### Branding
- Update colors in `tailwind.config.ts`
- Replace logo in header components
- Modify gradient backgrounds

### Data
- Edit mock data in `src/lib/demo-data.ts`
- Adjust refresh intervals in components
- Customize transaction scenarios

## 📝 License

Private demo application for Monowave investor presentations.

---

Built with ❤️ for the future of AI content monetization.

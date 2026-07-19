# Aurelinx Frontend - Next.js

Modern React frontend built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

## Tech Stack

- **Framework**: Next.js 15.x
- **UI Library**: React 19.x
- **Styling**: Tailwind CSS 4.x + PostCSS
- **Animations**: Framer Motion
- **PDF Generation**: jsPDF + jsPDF AutoTable
- **Markdown Rendering**: react-markdown with GFM support
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` from the example:
```bash
cp .env.local.example .env.local
```

4. Update environment variables in `.env.local` as needed

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
client/
├── app/                      # Next.js App Router
│   ├── layout.jsx           # Root layout with metadata
│   └── page.jsx             # Home page
├── src/                      # Source files
│   ├── components/          # Reusable React components
│   ├── services/            # API services
│   ├── contexts/            # React contexts
│   ├── utils/               # Utility functions
│   ├── styles/              # Global & component styles
│   ├── assets/              # Images, fonts, etc.
│   ├── App.jsx              # Main App component
│   ├── index.css            # Global styles
│   └── App.css              # App-specific styles
├── public/                   # Static files
├── next.config.js           # Next.js configuration
├── jsconfig.json            # JavaScript path aliases
├── tailwind.config.js       # Tailwind CSS configuration
└── postcss.config.js        # PostCSS configuration
```

## Key Features

- Server-side rendering (SSR) with Next.js
- Static generation for optimized performance
- Responsive design with Tailwind CSS
- Smooth animations and transitions
- PDF export functionality
- Markdown content rendering
- Environment-based configuration

## Environment Variables

See `.env.local.example` for available configuration options:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

## Deployment

The application is configured for deployment on Vercel. See `vercel.json` for Vercel-specific configuration.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion)


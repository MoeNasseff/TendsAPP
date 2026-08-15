# InvoiceAI: High-End PWA Invoice Scanner

## Project Overview
InvoiceAI is a premium Progressive Web App (PWA) designed to simplify financial management through advanced AI-driven invoice scanning and automated item linking.

### Core Functionality
1.  **AI Scanning**: Uses computer vision to extract line items from invoices.
2.  **Smart Linking**: Automatically matches extracted items with product images and real-time market prices via web scraping.
3.  **No-Timeout Processing**: Architected to handle complex AI tasks (using ChatGPT Free Tier APIs) asynchronously to ensure a smooth, non-blocking UI experience.
4.  **Financial Dashboard**: Provides high-level metrics, trend reports, and detailed expense breakdowns.

### User Experience (UX) Strategy
- **Simplicity**: Minimalistic interface that hides complexity behind intelligent defaults.
- **Captivating UI**: High-end aesthetic with glassmorphism, subtle gradients, and smooth transitions.
- **Ease of Use**: A focus on "one-tap" actions—scan, approve, and track.

### AI Agent Implementation Guide
To develop the frontend using this design:
1.  **Framework**: Use a modern framework like React or Next.js for PWA capabilities.
2.  **Styling**: Implement the design system tokens (colors, spacing, typography) using Tailwind CSS.
3.  **State Management**: Use a robust state manager to handle the asynchronous "Scanning -> Linking -> Priced" pipeline.
4.  **Components**: Follow the shared component architecture (Header, Sidebar, Metric Cards) for consistency.
5.  **API Integration**: Implement optimistic UI updates while the AI agent processes invoices in the background to avoid timeout perception.

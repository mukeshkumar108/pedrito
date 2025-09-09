# Pedrito 🤖

<div align="center">
  <img alt="Pedrito - Your witty AI assistant" src="app/(chat)/opengraph-image.png" width="200">
  <h1 align="center">Your Witty, Intelligent AI Assistant</h1>
</div>

<p align="center">
  Pedrito is a sophisticated AI chat assistant that combines advanced AI capabilities with a charming personality. Built with modern web technologies, it offers seamless conversations, document creation, and personalized experiences.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#architecture"><strong>Architecture</strong></a> ·
  <a href="#getting-started"><strong>Getting Started</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a>
</p>
<br/>

## ✨ Key Features

- **🧠 Advanced Memory System** - Remembers context across conversations for true continuity
- **🌐 Multi-Language Support** - Fluent in English and Spanish with intelligent switching
- **📄 Smart Document Creation** - Generates professional documents, code snippets, and spreadsheets
- **🎨 Personalized Experience** - Adapts to user preferences and conversation style
- **🔒 Privacy-First Design** - No reasoning display, input sanitization, secure data handling
- **⚡ Modern UX** - Beautiful interface with smooth interactions and accessibility
- **🎭 Witty Personality** - Pedrito's charming, supportive Gen Z personality makes interactions enjoyable
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile devices

## 🏗️ Architecture

Pedrito combines several sophisticated systems to create an intelligent, personality-driven AI assistant:

### **Core Systems**
- **🧠 Memory Engine** - Advanced conversation continuity with structured summarization
- **🎭 Personality Layer** - Adaptive responses based on user preferences and context
- **📄 Artifact System** - Professional document and content generation
- **🌐 Language Handler** - Intelligent English/Spanish switching and translation
- **🔒 Privacy System** - Input sanitization and reasoning control

### **Technical Architecture**
- **Frontend Framework:** Next.js 14 with App Router
- **UI Framework:** React with TypeScript and Tailwind CSS
- **Component Library:** shadcn/ui with Radix UI primitives
- **AI Integration:** Vercel AI SDK with multiple LLM providers
- **Database:** Neon Postgres with Drizzle ORM
- **Authentication:** NextAuth.js v5
- **State Management:** React hooks with SWR for data fetching
- **Real-time Features:** Server-Sent Events for streaming responses

### **Key Technologies**
- **Styling:** Tailwind CSS for modern, responsive design
- **Icons:** Lucide React for consistent iconography
- **Forms:** React Hook Form with validation
- **Notifications:** Custom toast system
- **File Storage:** Vercel Blob for efficient file handling
- **Deployment:** Vercel platform with edge functions

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+
- pnpm package manager
- Git

### **Quick Setup**

1. **Clone the repository**
   ```bash
   git clone https://github.com/mukeshkumar108/pedrito.git
   cd pedrito
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Configure required environment variables:**
   ```env
   # AI Provider (choose one)
   XAI_API_KEY=your_xai_key_here
   # or
   OPENAI_API_KEY=your_openai_key_here

   # Database
   DATABASE_URL=your_neon_postgres_url

   # Authentication
   AUTH_SECRET=your_auth_secret
   AUTH_TRUST_HOST=true

   # Optional: File storage
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   ```

5. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

7. **Open your browser**
   ```
   http://localhost:3000
   ```

### **First Time Setup**
- Create an account or sign in
- Customize your profile settings
- Start chatting with Pedrito!
- Try creating documents or switching languages

## 📦 Deployment

### **Vercel (Recommended)**

1. **Connect your repository to Vercel**
2. **Add environment variables in Vercel dashboard**
3. **Deploy automatically on push**

### **Manual Deployment**

Pedrito can be deployed to any platform supporting Node.js:

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### **Environment Variables for Production**
- `NODE_ENV=production`
- `AUTH_TRUST_HOST=true`
- All AI provider keys and database URLs

---

## 🎯 What Makes Pedrito Special

Unlike generic AI chatbots, Pedrito offers:

- **Personality-Driven Interactions** - Witty, supportive conversations that feel natural
- **True Conversation Continuity** - Remembers context across sessions
- **Professional Document Creation** - Generates business-ready content
- **Intelligent Language Switching** - Seamless English/Spanish conversations
- **Privacy-Conscious Design** - No reasoning leaks, input sanitization
- **Adaptive Learning** - Gets better at understanding your preferences

---

## 📚 Documentation

- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and data flow
- **[Features Guide](docs/FEATURES.md)** - Complete feature documentation
- **[API Reference](docs/FLOWS.md)** - Chat and memory system details
- **[Memory System](docs/MEMORY_SYSTEM.md)** - Advanced conversation memory

---

**Ready to experience the future of AI assistance? Start chatting with Pedrito today!** 🚀✨

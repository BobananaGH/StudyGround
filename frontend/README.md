# StudyGround Frontend

Frontend cho ứng dụng StudyGround - RAG-powered study companion.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3
- **HTTP Client**: Axios
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod
- **Icons**: Heroicons

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Copy file môi trường
cp .env.example .env

# Chạy development server
npm run dev

# Build cho production
npm run build
```

## Biến môi trường

Tạo file `.env` từ `.env.example`:

```env
VITE_API_URL=http://localhost:8000/api/
```

- `VITE_API_URL`: URL của Backend API (phải kết thúc bằng dấu `/`)

## Cấu trúc thư mục

```
src/
├── api/              # Axios client & API endpoints
├── components/       # Shared components
│   ├── ui/           # Basic UI components (Button, Input, Modal, etc.)
│   └── layout/       # Layout components (Header, Sidebar, MainLayout)
├── contexts/         # React Context providers (AuthContext)
├── hooks/            # Custom hooks
├── pages/            # Page components
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── App.tsx           # Main App component
├── main.tsx          # Entry point
└── index.css         # Global styles with Tailwind imports
```

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## API Endpoints (Backend)

Backend API được định nghĩa trong `src/api/` và khớp với contract từ `summary.md`:

- **Auth**: `/auth/login/`, `/auth/register/`, `/auth/me/`, `/auth/token/refresh/`
- **Courses**: `/courses/`, `/courses/:id/`, `/courses/:id/documents/`
- **Documents**: `/documents/`, `/documents/:id/`
- **Conversations**: `/conversations/`, `/conversations/:id/`, `/conversations/:id/messages/`
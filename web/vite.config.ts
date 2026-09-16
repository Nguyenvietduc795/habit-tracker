import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // .env dung chung o goc repo. Vite CHI dua bien co tien to VITE_ vao
  // trinh duyet, nen DATABASE_URL va JWT_SECRET khong bao gio lot ra frontend.
  envDir: '..',
})

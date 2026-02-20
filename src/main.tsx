import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'  // 引入 i18n 配置
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

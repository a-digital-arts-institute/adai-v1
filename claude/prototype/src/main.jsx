import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Transcriber from './Transcriber.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Transcriber />
  </StrictMode>,
)

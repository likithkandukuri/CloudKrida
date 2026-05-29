import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Chess from './pages/chess/Chess'
import Tennis from './pages/Tennis'
import Darts from './pages/Darts'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"       element={<Home />}   />
            <Route path="/login"  element={<Login />}  />
            <Route path="/chess"  element={<Chess />}  />
            <Route path="/tennis" element={<Tennis />} />
            <Route path="/darts"  element={<Darts />}  />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

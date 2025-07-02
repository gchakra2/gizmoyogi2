import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AdminProvider } from './contexts/AdminContext'
import { RoleProvider } from './contexts/RoleContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Header } from './components/Layout/Header'
import { Footer } from './components/Layout/Footer'
import { ProtectedAdminRoute } from './components/Admin/ProtectedAdminRoute'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Services } from './pages/Services'
import { Testimonials } from './pages/Testimonials'
import { BookClass } from './pages/BookClass'
import { Contact } from './pages/Contact'
import { Learning } from './pages/Learning'
import { ArticleView } from './pages/ArticleView'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'
import { AdminLogin } from './pages/AdminLogin'
import { AdminDashboard } from './pages/AdminDashboard'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RoleProvider>
          <AdminProvider>
            <Router>
              <Routes>
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route 
                  path="/admin/dashboard" 
                  element={
                    <ProtectedAdminRoute>
                      <AdminDashboard />
                    </ProtectedAdminRoute>
                  } 
                />
                
                {/* Public Routes */}
                <Route path="/*" element={
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-grow">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/testimonials" element={<Testimonials />} />
                        <Route path="/book-class" element={<BookClass />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/learning" element={<Learning />} />
                        <Route path="/learning/:id" element={<ArticleView />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                    <Footer />
                  </div>
                } />
              </Routes>
            </Router>
          </AdminProvider>
        </RoleProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
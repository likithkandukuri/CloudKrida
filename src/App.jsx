import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './shared/context/ThemeContext'
import { AuthProvider } from './auth/AuthContext'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import Account from './pages/Account/Account'
import About from './pages/About/About'
import Contact from './pages/Contact/Contact'
import Privacy from './pages/Privacy/Privacy'
import NotFound from './pages/NotFound/NotFound'
import TournamentsHub from './tournament/pages/TournamentsHub'
import CompletedTournaments from './tournament/pages/CompletedTournaments'
import Chess from './tournament/chess/Chess'
import ChessGalleryPage from './tournament/chess/ChessGalleryPage'
import Pickleball from './tournament/pickleball/Pickleball'
import PickleballGalleryPage from './tournament/pickleball/PickleballGalleryPage'
import Tennis from './tournament/tennis/Tennis'
import Darts from './tournament/darts/Darts'
import SummerClassesHome from './summerClasses/pages/SummerClassesHome'
import Instructor from './summerClasses/pages/Instructor'
import Mathematics from './summerClasses/pages/Mathematics'
import Enroll from './summerClasses/pages/Enroll'
import SchedulePricing from './summerClasses/pages/SchedulePricing'
import Tools from './summerClasses/pages/Tools'
import Materials from './summerClasses/pages/Materials'
import Testimonials from './summerClasses/pages/Testimonials'
import Registration from './summerClasses/pages/Registration'
import Students from './summerClasses/pages/Students'
import Schedule from './summerClasses/pages/Schedule'
import SummerClassesAdmin from './summerClasses/pages/admin/SummerClassesAdmin'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"        element={<Home />}    />
            <Route path="/login"   element={<Login />}   />
            <Route path="/account" element={<Account />} />
            <Route path="/about"   element={<About />}   />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route path="/tournaments"            element={<TournamentsHub />} />
            <Route path="/tournaments/completed"  element={<CompletedTournaments />} />
            <Route path="/tournaments/chess"      element={<Chess />}          />
            <Route path="/tournaments/chess/gallery/:tournamentId"      element={<ChessGalleryPage />}      />
            <Route path="/tournaments/pickleball" element={<Pickleball />}     />
            <Route path="/tournaments/pickleball/gallery/:tournamentId" element={<PickleballGalleryPage />} />
            <Route path="/tournaments/tennis"     element={<Tennis />}         />
            <Route path="/tournaments/darts"      element={<Darts />}          />

            <Route path="/summerclasses"              element={<SummerClassesHome />} />
            <Route path="/summerclasses/instructor"    element={<Instructor />}        />
            <Route path="/summerclasses/mathematics"   element={<Mathematics />}       />
            <Route path="/summerclasses/enroll"        element={<Enroll />}             />
            <Route path="/summerclasses/schedule-pricing" element={<SchedulePricing />} />
            <Route path="/summerclasses/tools"         element={<Tools />}              />
            <Route path="/summerclasses/materials"     element={<Materials />}          />
            <Route path="/summerclasses/testimonials"  element={<Testimonials />}       />
            <Route path="/summerclasses/registration"  element={<Registration />}      />
            <Route path="/summerclasses/students"      element={<Students />}          />
            <Route path="/summerclasses/schedule"      element={<Schedule />}          />

            <Route path="/admin/summer-classes" element={<SummerClassesAdmin />} />

            {/* Legacy redirects — keep old bookmarks/QR codes working */}
            <Route path="/chess"          element={<Navigate to="/tournaments/chess"  replace />} />
            <Route path="/tennis"         element={<Navigate to="/tournaments/tennis" replace />} />
            <Route path="/darts"          element={<Navigate to="/tournaments/darts"  replace />} />
            <Route path="/summer-classes" element={<Navigate to="/summerclasses"      replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

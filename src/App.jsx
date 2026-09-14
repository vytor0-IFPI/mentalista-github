import { useEffect } from "react";
import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar.jsx";
import { Footer } from "./components/Footer.jsx";
import { Protected } from "./components/Protected.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { CoursesPage } from "./pages/CoursesPage.jsx";
import { CoursePage } from "./pages/CoursePage.jsx";
import { LessonPage } from "./pages/LessonPage.jsx";
import { ReviewPage } from "./pages/ReviewPage.jsx";
import { LibraryPage } from "./pages/LibraryPage.jsx";
import { AchievementsPage } from "./pages/AchievementsPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/cursos" element={<CoursesPage />} />
        <Route path="/curso/:slug" element={<CoursePage />} />
        <Route path="/curso/:slug/:lessonSlug" element={<Protected><LessonPage /></Protected>} />
        <Route path="/revisao" element={<Protected><ReviewPage /></Protected>} />
        <Route path="/biblioteca" element={<LibraryPage />} />
        <Route path="/conquistas" element={<AchievementsPage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/criar-conta" element={<RegisterPage />} />
        <Route path="/painel" element={<Protected><DashboardPage /></Protected>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
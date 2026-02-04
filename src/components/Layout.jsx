import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1 min-h-0 overflow-x-hidden">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;

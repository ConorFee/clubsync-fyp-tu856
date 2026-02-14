import { Outlet } from 'react-router-dom';
import HeaderBar from './HeaderBar';
import SideNav from './SideNav';
import './AuthenticatedLayout.css';

export default function AuthenticatedLayout() {
  return (
    <div className="app-layout">
      <HeaderBar />
      <div className="app-body">
        <SideNav />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

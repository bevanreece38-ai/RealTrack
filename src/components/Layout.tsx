import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="flex min-h-screen bg-[#041814] text-white">
      <Sidebar collapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />
      <div className="flex flex-1 flex-col bg-gradient-to-b from-[#051f1b] via-[#051713] to-[#040f0d] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-1 flex-col p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;

import "./Sidebar.css";

interface SidebarProps {
  onRefresh?: () => void;   // optional callback
}

export default function Sidebar({ onRefresh }: SidebarProps) {
  return (
    <div className="sidebar-container">
      <h2 className="sidebar-title">Facilities</h2>

      <button className="sidebar-refresh-btn" onClick={onRefresh}>
        Refresh Events
      </button>

      <ul className="sidebar-list">
        <li>Main Pitch</li>
        <li>Training Pitch</li>
        <li>Hall</li>
        <li>Gym</li>
      </ul>
    </div>
  );
}

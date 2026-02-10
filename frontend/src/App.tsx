import { useEffect, useState } from "react";
import type { EventType } from "./types/types";

import { fetchEvents } from "./api/events";
import { runSolverCheck } from "./api/solver";

import CalendarView from "./components/CalendarView";
import Sidebar from "./components/sidebar/Sidebar";

import "./styles/App.css"; // <-- Make sure App.css contains layout styles

function App() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [solverStatus, setSolverStatus] = useState("");

  const [selectedFacility, setSelectedFacility] = useState<string>("All");

  const filteredEvents = events.filter(e =>
    selectedFacility === "All" ? true : e.facility.name === selectedFacility
  );
  
  useEffect(() => {
    fetchEvents()
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error loading events:", err));  
  }, []);

  const handleRefreshEvents = () => {
    fetchEvents()
      .then((data) => setEvents(data))
      .catch((err) => console.error("Refresh error:", err));
  };

  const handleSolverRun = () => {
    runSolverCheck()
      .then((message) => setSolverStatus(message))
      .catch(() => setSolverStatus("Solver error"));
  };

  return (
    <div className="app-container">
      {/* --- HEADER --- */}
      <header className="app-header">
        <h1>ClubSync – An Tóchar GAA</h1>
        
        <button className="solver-btn" onClick={handleSolverRun}>
          Run Solver Check
        </button>
        
                {solverStatus && (
          <h2 className={`solver-status ${solverStatus.includes("feasible") ? "ok" : "error"}`}>
            {solverStatus}
          </h2>
        )}
      </header>

      {/* --- MAIN LAYOUT (Sidebar + Calendar) --- */}
      <div className="main-layout">
        <Sidebar 
          onRefresh={handleRefreshEvents} 
          events={filteredEvents}
          selectedFacility={selectedFacility}
          onSelectFacility={setSelectedFacility}
        />
        
        <div className="calendar-wrapper">
          <CalendarView events={events} />
        </div>
      </div>
    </div>
  );
}

export default App;

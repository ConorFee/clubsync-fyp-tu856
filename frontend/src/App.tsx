import { useEffect, useState } from "react";
import type { EventType } from "./types/types";

import { fetchEvents } from "./api/events";
import { runSolverCheck } from "./api/solver";

import CalendarView from "./components/CalendarView";

function App() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [solverStatus, setSolverStatus] = useState("");

  useEffect(() => {
    fetchEvents()
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error loading events:", err));
  }, []);

  const handleSolverRun = () => {
    runSolverCheck()
      .then((message) => setSolverStatus(message))
      .catch(() => setSolverStatus("Solver error"));
  };

  return (
    <div style={{ padding: "40px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "white" }}>ClubSync – An Tóchar GAA</h1>

      <button
        onClick={handleSolverRun}
        style={{
          padding: "12px 24px",
          fontSize: "18px",
          background: "#1a5fb4",
          color: "white",
          borderRadius: "8px",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        Run Solver Check
      </button>

      {solverStatus && (
        <h2
          style={{
            color: solverStatus.includes("feasible") ? "#2ecc71" : "#e74c3c",
            marginBottom: "20px",
          }}
        >
          {solverStatus}
        </h2>
      )}

      <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
        <CalendarView events={events} />
      </div>
    </div>
  );
}

export default App;

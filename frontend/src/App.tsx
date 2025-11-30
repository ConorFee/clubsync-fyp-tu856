import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';

interface ApiEvent {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  facility: { name: string };
  is_fixed: boolean;
}

function App() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [solverStatus, setSolverStatus] = useState('');

  useEffect(() => {
    axios.get('/api/events/')
      .then(res => {
        console.log('Events loaded:', res.data); // ← check console!
        setEvents(res.data);
      })
      .catch(err => console.error('API error:', err));
  }, []);

  const runSolver = () => {
    axios.post('/api/schedule/solve/')
      .then(res => setSolverStatus(res.data.message))
      .catch(() => setSolverStatus('Solver error'));
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: 'white', marginBottom: '20px' }}>
        ClubSync – An Tóchar GAA
      </h1>
      <button 
        onClick={runSolver}
        style={{ 
          padding: '12px 24px', 
          fontSize: '18px', 
          background: '#1a5fb4', 
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Run Solver Check
      </button>
      {solverStatus && (
        <h2 style={{ 
          color: solverStatus.includes('feasible') ? '#2ecc71' : '#e74c3c',
          margin: '20px 0'
        }}>
          {solverStatus}
        </h2>
      )}

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          height="auto"
          events={events.map(e => ({
            title: `${e.title} – ${e.facility.name}`,
            start: e.start_time,
            end: e.end_time,
            backgroundColor: e.is_fixed ? '#dc3545' : '#28a745',
            textColor: 'white'
          }))}
        />
      </div>
    </div>
  );
}

export default App;
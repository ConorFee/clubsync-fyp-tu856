import { useState, useEffect } from 'react';
import { fetchFacilities } from '../api/facilities';
import type { FacilityType } from '../types/types';
import { EVENT_TYPE_LABELS } from '../types/types';
import type { EventTypeChoice } from '../types/types';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { Building2, MapPin, Warehouse, Dumbbell } from 'lucide-react';
import './FacilitiesPage.css';

const TYPE_LABELS: Record<string, string> = {
  pitch: 'Pitch',
  hall: 'Hall',
  gym: 'Gym',
  clubhouse: 'Clubhouse',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  pitch:     { bg: 'var(--cs-green-100)', text: 'var(--cs-green-600)' },
  hall:      { bg: 'var(--cs-blue-100)',  text: 'var(--cs-blue-700)' },
  gym:       { bg: 'var(--cs-orange-100)', text: 'var(--cs-orange-600)' },
  clubhouse: { bg: 'var(--cs-gray-100)',  text: 'var(--cs-gray-700)' },
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<FacilityType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacilities()
      .then((data) => setFacilities(data))
      .catch((err) => console.error('Error loading facilities:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = facilities.length;
  const pitchCount = facilities.filter((f) => f.type === 'pitch').length;
  const indoorCount = facilities.filter((f) => f.type === 'hall' || f.type === 'gym').length;
  const otherCount = facilities.filter((f) => f.type !== 'pitch' && f.type !== 'hall' && f.type !== 'gym').length;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fac-page">
      <PageHeader
        title="Facilities"
        subtitle="Manage club facilities and availability"
      />

      {/* Stat cards */}
      <div className="fac-stats">
        <StatCard
          title="Total Facilities"
          value={totalCount}
          icon={<Building2 size={20} />}
        />
        <StatCard
          title="Pitches"
          value={pitchCount}
          icon={<MapPin size={20} />}
          valueColor="var(--cs-green-600)"
        />
        <StatCard
          title="Indoor"
          value={indoorCount}
          subtitle="Halls & Gyms"
          icon={<Warehouse size={20} />}
          valueColor="var(--cs-blue-600)"
        />
        <StatCard
          title="Other"
          value={otherCount}
          icon={<Dumbbell size={20} />}
        />
      </div>

      {/* Facilities table */}
      <div className="fac-table-card">
        <div className="fac-table-header">
          <h2 className="fac-table-title">All Facilities</h2>
        </div>

        {facilities.length === 0 ? (
          <div className="fac-empty">No facilities found.</div>
        ) : (
          <div className="fac-table-wrap">
            <table className="fac-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Suitable For</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((fac) => (
                  <tr key={fac.id}>
                    <td>
                      <span className="fac-cell-name">{fac.name}</span>
                    </td>
                    <td>
                      <StatusBadge
                        status={TYPE_LABELS[fac.type] ?? fac.type}
                        colorMap={{
                          [TYPE_LABELS[fac.type] ?? fac.type]: TYPE_COLORS[fac.type] ?? { bg: 'var(--cs-gray-100)', text: 'var(--cs-gray-700)' },
                        }}
                      />
                    </td>
                    <td>
                      <div className="fac-suitable-list">
                        {fac.suitable_for.length === 0 ? (
                          <span className="fac-cell-muted">All types</span>
                        ) : (
                          fac.suitable_for.map((et) => (
                            <StatusBadge
                              key={et}
                              status={EVENT_TYPE_LABELS[et as EventTypeChoice] ?? et}
                              colorMap={{
                                [EVENT_TYPE_LABELS[et as EventTypeChoice] ?? et]: { bg: 'var(--cs-gray-100)', text: 'var(--cs-gray-600)' },
                              }}
                            />
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

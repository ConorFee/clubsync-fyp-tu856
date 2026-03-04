import { useState } from 'react';
import type { ScheduleDiffEntry } from '../api/solver';
import { EVENT_TYPE_LABELS } from '../types/types';
import type { EventTypeChoice } from '../types/types';
import './SolverReviewPanel.css';

interface Props {
  diff: ScheduleDiffEntry[];
  onDiscard: () => void;
  discarding: boolean;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export default function SolverReviewPanel({ diff, onDiscard, discarding }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fullySatisfied = diff.filter(d => !d.facility_changed && !d.time_changed).length;
  const facilityChanges = diff.filter(d => d.facility_changed).length;
  const timeChanges = diff.filter(d => d.time_changed).length;

  const toggleRow = (requestId: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  return (
    <div className="srp-panel">
      <div className="srp-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="srp-header-left">
          <span className={`srp-chevron ${collapsed ? '' : 'srp-chevron--open'}`}>&#9654;</span>
          <h3 className="srp-title">Schedule Review</h3>
        </div>
        <div className="srp-summary">
          <span className="srp-summary-item srp-summary--ok">
            {fullySatisfied} fully satisfied
          </span>
          {facilityChanges > 0 && (
            <span className="srp-summary-item srp-summary--facility">
              {facilityChanges} facility change{facilityChanges > 1 ? 's' : ''}
            </span>
          )}
          {timeChanges > 0 && (
            <span className="srp-summary-item srp-summary--time">
              {timeChanges} time change{timeChanges > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="srp-table-wrap">
            <table className="srp-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Team</th>
                  <th>Type</th>
                  <th>Requested Facility</th>
                  <th>Assigned Facility</th>
                  <th>Requested Time</th>
                  <th>Assigned Time</th>
                  <th>Events</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((d) => {
                  const isExpanded = expandedRows.has(d.request_id);
                  const hasBreakdown = d.weekly_breakdown && d.weekly_breakdown.length > 1;

                  return (
                    <>
                      <tr
                        key={d.request_id}
                        className={[
                          d.facility_changed && d.time_changed
                            ? 'srp-row--both'
                            : d.facility_changed
                            ? 'srp-row--facility'
                            : d.time_changed
                            ? 'srp-row--time'
                            : '',
                          hasBreakdown ? 'srp-row--expandable' : '',
                        ].join(' ')}
                        onClick={hasBreakdown ? () => toggleRow(d.request_id) : undefined}
                      >
                        <td className="srp-cell-expand">
                          {hasBreakdown && (
                            <span className={`srp-row-chevron ${isExpanded ? 'srp-row-chevron--open' : ''}`}>
                              &#9654;
                            </span>
                          )}
                        </td>
                        <td className="srp-cell-team">{d.team_name}</td>
                        <td>{EVENT_TYPE_LABELS[d.event_type as EventTypeChoice] ?? d.event_type}</td>
                        <td>{d.requested_facility}</td>
                        <td className={d.facility_changed ? 'srp-cell--changed' : ''}>
                          {d.assigned_facility}
                        </td>
                        <td>{d.requested_time}</td>
                        <td className={d.time_changed ? 'srp-cell--changed' : ''}>
                          {d.assigned_time}
                        </td>
                        <td className="srp-cell-count">{d.events_count}</td>
                        <td>{PRIORITY_LABELS[d.priority] ?? d.priority}</td>
                      </tr>
                      {isExpanded && d.weekly_breakdown.map((week, i) => {
                        const facDiffers = d.requested_facility !== 'Any' && week.facility !== d.requested_facility;
                        return (
                          <tr key={`${d.request_id}-week-${i}`} className="srp-row--breakdown">
                            <td></td>
                            <td></td>
                            <td className="srp-breakdown-date">{week.date}</td>
                            <td></td>
                            <td className={facDiffers ? 'srp-cell--changed' : ''}>
                              {week.facility}
                            </td>
                            <td></td>
                            <td>{week.time}</td>
                            <td className="srp-cell-count">{week.duration}m</td>
                            <td></td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="srp-actions">
            <button
              className="srp-btn-discard"
              onClick={onDiscard}
              disabled={discarding}
            >
              {discarding ? 'Discarding...' : 'Discard Schedule'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Finding, FindingCategory, FindingSeverity } from '../types/index.js';
import { FindingCard } from './FindingCard.js';
import { Search, Filter } from 'lucide-react';

interface FindingsExplorerProps {
  findings: Finding[];
  onSelectFix: (findingId: string) => void;
}

export const FindingsExplorer: React.FC<FindingsExplorerProps> = ({
  findings,
  onSelectFix,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: `All (${findings.length})` },
    {
      id: 'security_secrets',
      label: `Secrets (${findings.filter((f) => f.category === 'security_secrets').length})`,
    },
    {
      id: 'supply_chain',
      label: `Supply Chain (${findings.filter((f) => f.category === 'supply_chain').length})`,
    },
    {
      id: 'accessibility',
      label: `Accessibility (${findings.filter((f) => f.category === 'accessibility').length})`,
    },
    {
      id: 'documentation',
      label: `Docs (${findings.filter((f) => f.category === 'documentation').length})`,
    },
    {
      id: 'community',
      label: `Community (${findings.filter((f) => f.category === 'community').length})`,
    },
    {
      id: 'build_ci',
      label: `Build & CI (${findings.filter((f) => f.category === 'build_ci').length})`,
    },
  ];

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (selectedCategory !== 'all' && f.category !== selectedCategory) {
        return false;
      }
      if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          f.ruleTitle.toLowerCase().includes(query) ||
          f.filePath.toLowerCase().includes(query) ||
          f.ruleId.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [findings, selectedCategory, selectedSeverity, searchQuery]);

  return (
    <div className="findings-section">
      <div className="findings-filter-bar">
        {/* Category tabs */}
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Severity filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={14}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: 10 }}
            />
            <input
              type="text"
              placeholder="Filter by file or rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px 6px 30px',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
                minWidth: 180,
              }}
            />
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {filteredFindings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <p>No findings match the selected filters.</p>
        </div>
      ) : (
        <div className="findings-list">
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onSelectFix={onSelectFix}
            />
          ))}
        </div>
      )}
    </div>
  );
};

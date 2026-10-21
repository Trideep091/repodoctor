import React from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, size = 180 }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let strokeColor = '#ef4444'; // critical red
  let grade = 'F';
  let gradeBg = 'rgba(239, 68, 68, 0.15)';
  let gradeColor = '#ef4444';

  if (score >= 90) {
    strokeColor = '#10b981'; // green
    grade = 'A+';
    gradeBg = 'rgba(16, 185, 129, 0.15)';
    gradeColor = '#10b981';
  } else if (score >= 80) {
    strokeColor = '#38bdf8'; // cyan
    grade = 'A';
    gradeBg = 'rgba(56, 189, 248, 0.15)';
    gradeColor = '#38bdf8';
  } else if (score >= 70) {
    strokeColor = '#818cf8'; // violet
    grade = 'B';
    gradeBg = 'rgba(129, 140, 248, 0.15)';
    gradeColor = '#818cf8';
  } else if (score >= 50) {
    strokeColor = '#eab308'; // yellow
    grade = 'C';
    gradeBg = 'rgba(234, 179, 8, 0.15)';
    gradeColor = '#eab308';
  } else {
    grade = 'D';
    if (score < 30) grade = 'F';
  }

  return (
    <div className="radial-score-card">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          className="score-gauge-svg"
          viewBox="0 0 180 180"
          style={{ width: size, height: size }}
        >
          {/* Background circle */}
          <circle
            className="gauge-bg-circle"
            cx="90"
            cy="90"
            r={radius}
          />
          {/* Animated Progress circle */}
          <circle
            className="gauge-progress-circle"
            cx="90"
            cy="90"
            r={radius}
            stroke={strokeColor}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        <div className="score-inner-text">
          <span className="score-number" style={{ color: strokeColor }}>
            {score}
          </span>
          <span className="score-max">/ 100</span>
        </div>
      </div>

      <div
        className="score-grade-badge"
        style={{
          backgroundColor: gradeBg,
          color: gradeColor,
          border: `1px solid ${strokeColor}`,
        }}
      >
        Grade: {grade} • {score >= 80 ? 'Healthy' : score >= 50 ? 'Needs Attention' : 'Critical Risks'}
      </div>
    </div>
  );
};

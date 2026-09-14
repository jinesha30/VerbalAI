import React from 'react';
import './LoadingSkeleton.css';

export const LoadingSkeleton = ({ type = 'default' }) => {
  if (type === 'card') {
    return (
      <div className="skeleton-card">
        <div className="skeleton skeleton-image"></div>
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="skeleton-table">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton skeleton-cell"></div>
            <div className="skeleton skeleton-cell"></div>
            <div className="skeleton skeleton-cell"></div>
            <div className="skeleton skeleton-cell"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="skeleton-list">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-list-item">
            <div className="skeleton skeleton-circle"></div>
            <div className="skeleton skeleton-text-block">
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text short"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-default">
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
    </div>
  );
};
